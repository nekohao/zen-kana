# 已升级过，但邮箱登录没有邀请码

在地中海 Supabase 的 SQL Editor 中执行一次 [supabase-email-admin.sql](supabase-email-admin.sql)，再上传新版网站文件即可。库存与已授权设备保留，无需重新创建家庭。

邮箱密码登录即为管理员，在「设置 → 生成邀请码」使用。邀请码设备是普通成员。

---

# 尚未升级：只做这三步

打开地中海的 Supabase 项目：ycgiooxdlabmyzbmpdfk。

## 1. 打开两个开关

进入 Authentication 的登录设置，开启：

- Allow anonymous sign-ins
- Allow new users to sign up

保留原来的邮箱密码登录。

## 2. 执行一次升级文件

进入 SQL Editor → New query。

打开本目录的 [supabase-upgrade-v2.sql](supabase-upgrade-v2.sql)，复制全部内容，粘贴进去，点击 Run。

已有项目只执行这个升级文件。现有库存会保留，不用重新创建家庭。

## 3. 更新网站文件

将新版 mediterranean 文件更新到原网站，再打开应用。

邮箱密码登录 → 设置 → 生成邀请码，发给家人即可。

邀请码 10 分钟有效；已授权设备以后直接进入主页。

---

如果某一步报错，把报错内容发给我，我来处理，不需要你自行修改数据库参数。

<details>
<summary>只有首次安装时才看</summary>

如果这个 Supabase 项目从未配置过库存表，先创建并确认管理员邮箱账号，再依次执行 supabase-setup.sql 和 supabase-upgrade-v2.sql。已有项目不需要这一步。

</details>
