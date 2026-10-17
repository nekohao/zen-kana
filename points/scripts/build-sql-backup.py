"""Render the exported application schema and reviewed function overlays; no DB access."""
import json
import re
import sys
import subprocess
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKUP = ROOT / 'sql-backup'
def write_batches(path, text):
    lines = text.splitlines(keepends=True)
    with path.open('w', encoding='utf-8', newline='\n') as stream:
        for i in range(0, len(lines), 200):
            stream.writelines(lines[i:i + 200])

def q(value):
    return '"' + value.replace('"', '""') + '"'

def lit(value):
    return "'" + value.replace("'", "''") + "'"

def qualified(obj):
    return q(obj['schema']) + '.' + q(obj['name'])

def normalized(text):
    return text.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')

def increment_base(data):
    config = data.get('increment', {})
    commit = config.get('base_commit', '')
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('increment.base_commit must name the reviewed pre-change Git commit.')
    try:
        raw = subprocess.check_output(['git', 'show', commit + ':points/sql-backup/current-schema.json'], cwd=ROOT.parent)
    except subprocess.CalledProcessError as error:
        raise ValueError('Increment base unavailable; fetch Git history, never fall back to the oldest export.') from error
    return json.loads(raw)

def function_key(fn):
    return (fn['schema'], fn['name'], fn['identity_arguments'])

def render_increment(data):
    base = increment_base(data)
    # Refuse unsupported changes rather than silently ship an incomplete/cumulative upgrade.
    for key in set(base) | set(data):
        if key not in ('functions', 'increment') and base.get(key) != data.get(key):
            raise ValueError('Review and extend the increment renderer for changed section: ' + key)
    previous = {function_key(fn): fn for fn in base['functions']}
    current = {function_key(fn): fn for fn in data['functions']}
    if previous.keys() != current.keys():
        raise ValueError('Review and extend the increment renderer for added/removed function signatures.')
    changed = [fn for key, fn in current.items() if fn != previous[key]]
    for fn in changed:
        old = previous[function_key(fn)]
        unsupported = [key for key in set(fn) | set(old) if key not in ('definition', 'owner', 'acl', 'comment') and fn.get(key) != old.get(key)]
        if unsupported:
            raise ValueError('Review function metadata changes for ' + fn['name'] + ': ' + ', '.join(unsupported))
    statements = data['increment'].get('data_sql')
    if not isinstance(statements, list) or not all(isinstance(sql, str) and sql.strip() for sql in statements):
        raise ValueError('increment.data_sql must explicitly list this change\'s data operations (or []).')
    out = ['-- CURRENT CHANGE ONLY; previous increments are replaced, never appended.',
           '-- BASE_COMMIT: ' + data['increment']['base_commit'],
           '-- Requires the maintained database at that commit (or this increment already applied).',
           '-- Historical upgrades belong in Git history, not in this execution file.', 'BEGIN;']
    guards = []
    for fn in changed:
        old = previous[function_key(fn)]
        if normalized(fn['definition']) != normalized(old['definition']):
            hashes = []
            for version in (old, fn):
                parts = normalized(version['definition']).split('$function$')
                if len(parts) != 3:
                    raise ValueError('Review increment guard for function body delimiter: ' + fn['name'])
                hashes.append(hashlib.md5(parts[1].encode('utf-8')).hexdigest())
            guards += [" IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace",
                       "  WHERE n.nspname=" + lit(fn['schema']) + " AND p.proname=" + lit(fn['name']),
                       "  AND pg_get_function_identity_arguments(p.oid)=" + lit(fn['identity_arguments']),
                       "  AND md5(replace(replace(prosrc,E'\\r\\n',E'\\n'),E'\\r',E'\\n')) IN (" + ','.join(map(lit, hashes)) + ")) THEN",
                       '  RAISE EXCEPTION ' + lit('Database baseline differs for ' + fn['name'] + '; apply/verify preceding changes first') + ';', ' END IF;']
    if guards:
        out += ['DO $baseline$\nBEGIN\n' + '\n'.join(guards) + '\nEND\n$baseline$;']
    for fn in changed:
        old = previous[function_key(fn)]
        target = qualified(fn) + '(' + fn['identity_arguments'] + ')'
        if normalized(fn['definition']) != normalized(old['definition']):
            out.append(normalized(fn['definition']).strip().rstrip(';') + ';')
        if fn['owner'] != old['owner']:
            out.append(f'ALTER FUNCTION {target} OWNER TO {q(fn["owner"])};')
        if fn['acl'] != old['acl']:
            if fn['acl'] is None:
                raise ValueError('Review explicit ACL reset for ' + fn['name'])
            out += acl_sql('f', target, fn['acl'], fn['owner'])
        if fn['comment'] != old['comment']:
            out.append(f'COMMENT ON FUNCTION {target} IS ' + ('NULL' if fn['comment'] is None else lit(fn['comment'])) + ';')
    out += [sql.strip().rstrip(';') + ';' for sql in statements]
    out += ["NOTIFY pgrst,'reload schema';", 'COMMIT;']
    return '\n\n'.join(out) + '\n'

def acl_sql(kind, target, acl, owner, column=None):
    # The export retains ACLs verbatim as well as rendering grants. NULL means PG defaults.
    names = {'r': {'a':'INSERT','r':'SELECT','w':'UPDATE','d':'DELETE','D':'TRUNCATE','x':'REFERENCES','t':'TRIGGER','m':'MAINTAIN'},
             'S': {'r':'SELECT','w':'UPDATE','U':'USAGE'}, 'f': {'X':'EXECUTE'}, 'n': {'U':'USAGE','C':'CREATE'}}[kind]
    object_kind = {'r':'TABLE','S':'SEQUENCE','f':'FUNCTION','n':'SCHEMA'}[kind]
    if acl is None:
        return []
    entries = re.findall(r'(?:^|,)([^=]*)=([^/]*)/([^,]+)', acl.strip('{}'))
    if not entries and acl != '{}':
        raise ValueError('Unsupported ACL: ' + target)
    roles = {'PUBLIC', owner} | {role.strip('"') or 'PUBLIC' for role, _, _ in entries}
    result = []
    if not column:
        result.append(f'REVOKE ALL ON {object_kind} {target} FROM ' + ', '.join('PUBLIC' if r == 'PUBLIC' else q(r) for r in sorted(roles)) + ';')
    for role, privileges, grantor in entries:
        role = role.strip('"') or 'PUBLIC'
        grants = {False: [], True: []}
        for char, option in re.findall(r'([A-Za-z])(\*?)', privileges):
            if char not in names:
                raise ValueError('Unsupported privilege ' + char)
            grants[bool(option)].append(names[char] + (f' ({q(column)})' if column else ''))
        for option, values in grants.items():
            if values:
                result.append('GRANT ' + ', '.join(values) + f' ON {object_kind} {target} TO ' + ('PUBLIC' if role == 'PUBLIC' else q(role)) + (' WITH GRANT OPTION' if option else '') + ';')
    return result

def render(data):
    out = ['-- COMPLETE EXPORTED APPLICATION SCHEMA; structure and logic only, no business/config rows.',
           '-- Reference baseline, NOT the incremental upgrade script. Requires Supabase platform schemas/roles/extensions.',
           '-- Includes every object in the supplied export, including unrelated public application objects.',
           '-- Platform auth helper definitions are retained below; review before restoring into a fresh project.',
           '-- Sequence current values, extension setup, platform schemas and cron jobs were not exported.',
           '-- Maintained latest application schema, independent of deployment status.',
           '-- Source PostgreSQL: ' + data['postgres_version'],
           'SET check_function_bodies = false;', '']
    if data.get('increment'):
        out.insert(7, '-- Current change baseline (see schema-increment.sql): ' + data['increment']['base_commit'])
        out.insert(8, '-- Current increment SHA-256: ' + hashlib.sha256(render_increment(data).encode('utf-8')).hexdigest())
    for schema in data['schemas']:
        target = q(schema['name'])
        out += [f'CREATE SCHEMA IF NOT EXISTS {target};', f'ALTER SCHEMA {target} OWNER TO {q(schema["owner"])};']
    for seq in data['sequences']:
        # Identity sequences are created by their column declaration.
        if any(o['kind'] == 'i' for o in seq.get('ownership') or []):
            continue
        out += [f'CREATE SEQUENCE {qualified(seq)} AS {seq["type"]} START WITH {seq["start"]} INCREMENT BY {seq["increment"]} MINVALUE {seq["min"]} MAXVALUE {seq["max"]} CACHE {seq["cache"]} ' + ('CYCLE;' if seq['cycle'] else 'NO CYCLE;')]
    for typ in data['types']:
        if typ['kind'] == 'e':
            out += [f'CREATE TYPE {qualified(typ)} AS ENUM (' + ', '.join(map(lit, typ['enum_labels'])) + ');']
        elif typ['kind'] == 'd':
            out += [f'CREATE DOMAIN {qualified(typ)} AS {typ["base_type"]}' + (f' DEFAULT {typ["default"]}' if typ['default'] else '') + (' NOT NULL' if typ['not_null'] else '') + ''.join(' ' + c for c in typ.get('domain_constraints') or []) + ';']
    for rel in data['relations']:
        if rel['kind'] == 'S':
            continue
        if rel['kind'] not in ('r', 'p'):
            raise ValueError('Add an explicit renderer for relation kind ' + rel['kind'])
        columns = []
        for c in rel['columns']:
            clause = q(c['name']) + ' ' + c['type']
            if c['identity']:
                clause += ' GENERATED ' + ('ALWAYS' if c['identity'] == 'a' else 'BY DEFAULT') + ' AS IDENTITY'
            elif c['generated']:
                clause += f' GENERATED ALWAYS AS ({c["default"]}) STORED'
            elif c['default'] is not None:
                clause += ' DEFAULT ' + c['default']
            if c['not_null']:
                clause += ' NOT NULL'
            columns.append(clause)
        out += [f'CREATE TABLE {qualified(rel)} (\n  ' + ',\n  '.join(columns) + '\n);']
    # Bodies are preserved in full; checks are deferred because definitions reference one another.
    for fn in data['functions']:
        out += [normalized(fn['definition']).strip().rstrip(';') + ';', f'ALTER FUNCTION {qualified(fn)}({fn["identity_arguments"]}) OWNER TO {q(fn["owner"])};']
    foreign_keys = []
    for rel in data['relations']:
        target = qualified(rel)
        if rel['kind'] != 'S':
            for constraint in rel.get('constraints') or []:
                statement = f'ALTER TABLE {target} ADD CONSTRAINT {q(constraint["name"])} {constraint["definition"]};'
                if constraint['type'] == 'f':
                    foreign_keys.append(statement)
                else:
                    out.append(statement)
            backing = {c['name'] for c in rel.get('constraints') or [] if c['type'] in ('p','u','x')}
            for index in rel.get('indexes') or []:
                if index['name'] not in backing:
                    out += [index['definition'].rstrip(';') + ';']
            for trigger in rel.get('triggers') or []:
                out += [trigger['definition'].rstrip(';') + ';']
                if trigger['enabled'] != 'O':
                    action = {'D':'DISABLE','R':'ENABLE REPLICA','A':'ENABLE ALWAYS'}[trigger['enabled']]
                    out += [f'ALTER TABLE {target} {action} TRIGGER {q(trigger["name"])};']
            for policy in rel.get('policies') or []:
                commands = {'*':'ALL','r':'SELECT','a':'INSERT','w':'UPDATE','d':'DELETE'}
                text = f'CREATE POLICY {q(policy["name"])} ON {target} AS ' + ('PERMISSIVE' if policy['permissive'] else 'RESTRICTIVE') + ' FOR ' + commands[policy['command']]
                text += ' TO ' + ', '.join('PUBLIC' if r == 'PUBLIC' else q(r) for r in policy['roles'])
                if policy['using']:
                    text += ' USING (' + policy['using'] + ')'
                if policy['with_check']:
                    text += ' WITH CHECK (' + policy['with_check'] + ')'
                out += [text + ';']
            for rule in rel.get('rules') or []:
                out += [rule.rstrip(';') + ';']
            out += [f'ALTER TABLE {target} ' + ('ENABLE' if rel['row_security'] else 'DISABLE') + ' ROW LEVEL SECURITY;']
            if rel['force_row_security']:
                out += [f'ALTER TABLE {target} FORCE ROW LEVEL SECURITY;']
        out += [f'ALTER ' + ('SEQUENCE' if rel['kind'] == 'S' else 'TABLE') + f' {target} OWNER TO {q(rel["owner"])};']
        if rel['comment'] is not None:
            out += [f'COMMENT ON ' + ('SEQUENCE' if rel['kind'] == 'S' else 'TABLE') + f' {target} IS {lit(rel["comment"])};']
        out += acl_sql('S' if rel['kind'] == 'S' else 'r', target, rel['acl'], rel['owner'])
        for c in rel.get('columns') or []:
            if c['acl']:
                out += acl_sql('r', target, c['acl'], rel['owner'], c['name'])
    out += foreign_keys
    for seq in data['sequences']:
        for ownership in seq.get('ownership') or []:
            if ownership['kind'] == 'a':
                table = next(r for r in data['relations'] if r['name'] == ownership['table'].split('.')[-1].strip('"') and ('.' not in ownership['table'] or r['schema'] == ownership['table'].split('.')[0].strip('"')))
                column = next(c for c in table['columns'] if c['position'] == ownership['column_position'])
                out += [f'ALTER SEQUENCE {qualified(seq)} OWNED BY {qualified(table)}.{q(column["name"])};']
    for fn in data['functions']:
        target = qualified(fn) + '(' + fn['identity_arguments'] + ')'
        out += acl_sql('f', target, fn['acl'], fn['owner'])
        if fn['comment'] is not None:
            out += [f'COMMENT ON FUNCTION {target} IS {lit(fn["comment"])};']
    for schema in data['schemas']:
        out += acl_sql('n', q(schema['name']), schema['acl'], schema['owner'])
    for default in data['default_privileges']:
        prefix = 'ALTER DEFAULT PRIVILEGES FOR ROLE ' + q(default['owner']) + (' IN SCHEMA ' + q(default['schema']) if default['schema'] else '') + ' '
        statements = acl_sql(default['object_type'], '__DEFAULT__', default['acl'], default['owner'])
        plural = {'r':'TABLES','S':'SEQUENCES','f':'FUNCTIONS'}[default['object_type']]
        out += [prefix + s.replace('ON ' + {'r':'TABLE','S':'SEQUENCE','f':'FUNCTION'}[default['object_type']] + ' __DEFAULT__', 'ON ' + plural) for s in statements]
    out += data.get('initialization_sql', [])
    out += ['SET check_function_bodies = true;', '']
    return '\n\n'.join(out).rstrip() + '\n'

def main():
    # The maintained current schema is authoritative. Never revert it to an old online export.
    data = json.loads((BACKUP / 'current-schema.json').read_text(encoding='utf-8'))
    expected = render(data)
    increment = render_increment(data)
    sql_files = {str(p.relative_to(ROOT)).replace('\\', '/') for p in ROOT.rglob('*.sql')}
    if sql_files != {'schema-full.sql', 'schema-increment.sql'}:
        raise ValueError('Only schema-full.sql and schema-increment.sql may remain: ' + ', '.join(sorted(sql_files)))
    if sys.argv[1:] == ['--check']:
        if (ROOT / 'schema-full.sql').read_text(encoding='utf-8') != expected:
            raise ValueError('Full SQL is stale; update maintained metadata and regenerate.')
        if (ROOT / 'schema-increment.sql').read_text(encoding='utf-8') != increment:
            raise ValueError('Increment SQL differs from this change; regenerate, do not append historical upgrades.')
        print('Full SQL and current-change-only increment synchronized; Git baseline verified.')
        return
    if sys.argv[1:]:
        raise ValueError('Usage: python points/scripts/build-sql-backup.py [--check]')
    write_batches(ROOT / 'schema-full.sql', expected)
    write_batches(ROOT / 'schema-increment.sql', increment)
    print(f'Latest full SQL: {len(data["relations"])} relations, {len(data["functions"])} functions; current increment: {len(increment.splitlines())} lines.')

if __name__ == '__main__':
    main()
