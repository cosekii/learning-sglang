# 第 2 章评分卡 · Hotkeys and permissions

日期：2026-11-24。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
第 1 步材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch02-s01-20261124-1613/final/`。
第 2 步最新材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch02-s02-wording-20261124-1821/final/`。
第 3 步材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch02-s03-20261124-1941/final/`；检查日志在相邻的 `checks/`。冷读者没有编程前置知识，只读主图、累计 transcript 和前章 transcript。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | 我按一下右边的 Option，辅助程序认出后告诉主程序「按键了」，主程序开始听写，然后请辅助程序采集麦克风的声音。 | 24 | 0 | — | 2026-11-24 |
| 2 | 12 | 同样按右 Option，没开 Accessibility 时 helper 看不见按键，Go app 不动；开了以后 helper 看见按键、发出一条消息，Go app 开始听写。 | 24 | 0 | — | 2026-11-24 |
| 3 | 12 | 麦克风权限只管声音，不管按键；没权限就录不了，有权限也还要麦克风能收音才行。 | 24 | 0 | — | 2026-11-24 |

**当前平均：24 / 24；最低：24；总洞数：0；3/3 个步骤易读满分。** 本章完成。

## 第 1 步冷读与检查

- 初次独立冷读为易读 **9 / 12**、原项 **15 / 20**、**8 洞**：JSON 字段没有白话意思，声音时机和手机首屏结果不清。第一次修订后为 **11 / 12**、**18 / 20**、**5 洞**，还剩 JSON 的名字与值、`/0`、`trigger`、手机 Option 键名和下一步导航问题。
- 最终把三个字段写成 `名字=值` 并配中文意思，补出 `/0` 从 0 编号、`trigger` 表示按一下已发生；手机写出 `Right ⌥ Option`，首屏能看到完整路线。权限明确设为本步已通过，不再指向不存在的下一页。最终独立冷读为易读 **12 / 12**、原项 **20 / 20**、**0 洞**，R1–R6 均为 2。主线程核对原 #10、#12 各 **2 / 2**，合计 **24 / 24**。
- 主图限定默认右 Option、一次点击和空闲状态。Swift helper 把按键变成一条 JSON 通知，Go app 路由为开始 Transcribe；开始后才请 helper 采集麦克风。权限检查、备用快捷键和其他按键状态不在本步范围内。
- 源码基线为 `sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`。默认快捷键见 `Voxt/internal/settings/settings.go:357,379`；helper 发送见 `Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:240-250,269-274`；协议见 `Voxt/docs/helper-protocol.md:9-24,88-97`；Go 路由见 `Voxt/internal/hotkey/route.go:114-121`；开始后的采集见 `Voxt/internal/session/run.go:192-202` 和 `Voxt/internal/session/helperio.go:20-35`。
- 深入讲解具备一句话、图上内容、公式与符号来源、代入数量、消息补充、接下来和源码出处；中英顶部、底部截图均已打开核对。
- 最终 `build`、本章 `transcript`、本步 `readability`、中文手机字号硬门、Voxt 三种宽度手机布局、`deep-check 02`、本章 `zh-check` 和 `git diff --check` 均通过。中英桌面、390 px 中文手机及深入讲解截图均已打开检查；本地目标页返回 HTTP 200。
- 未运行 Voxt 产品测试；行为依据公开源码与测试代码核对，网页硬门检查的是教程成品。独立冷读为模拟读者，未做真人儿童试读。

## 第 2 步冷读与检查

- 首次独立冷读为易读 **9 / 12**、**5 洞**，指出章名比喻和「其他权限／监听失败」带出的岔路。章名改为直述，删去这些前向词，写清两幅图的相同输入和初始空闲状态后，新冷读者按完整 R1–R6 定义复读为 **12 / 12**、**0 洞**，R1–R6 均为 2。物理按键位置和系统设置点击路径不属于本步机制，没有扩成操作教程。
- 中间复读指出中文脚注主语不顺，已改成两行白话。最终独立冷读的 #2–#8、#11 合计 **15 / 16**：其余各项 2 分，#11 因「没允许／未允许／已允许」略显翻译腔得 1 分；主线程核对 #1、#9、#10、#12 各 **2 / 2**，总计 **23 / 24**。已达到原分不低于 20 的完成线，保留这条措辞欠自然记录，不再为小改重跑整轮。
- 两幅同布局图只改变 Accessibility：OFF 时 helper 看不见按键，0 条消息，Go app 仍空闲；ON 且接收成功时为 1 条消息，Go app 开始。红色只表示阻断，蓝色只表示消息接通；0／1 来自 `src/voxt/numbers.ts` 的构造对照，不是成功率或性能测量。
- 源码基线为 `sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`。权限状态见 `Voxt/helper/Sources/VoxtNewHelper/Permissions.swift:7-9,40-46`；监听安装、事件核对和重试见 `Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:6-19,76-89,113-169`；消息发送见同文件 `240-250,269-274`；Go 路由见 `Voxt/internal/hotkey/route.go:114-121`。
- 深入讲解写明公式符号来源、0／1 代入、监听成功的边界，以及未画的 Input Monitoring、其他权限和故障；没有宣称 Accessibility 单独保证成功。双语深入讲解顶部和底部截图均已打开核对。
- 最终 `build`、本章 `transcript`、本步 `readability`、中文手机字号硬门、全站及 Voxt 三种宽度手机布局、`deep-check 02`、本章 `zh-check` 和 `git diff --check` 均通过；全站另有 **576** 个既有小字视图仅作审计。中英桌面、360／390／430 px 中文手机截图均已打开检查。
- 未运行 Voxt 产品测试；行为依据公开源码核对。独立冷读为模拟读者，未做真人儿童试读。

## 第 2 步中文措辞修旧（18:21 轮）

- 改前易读 **12 / 12**、原分 **23 / 24**、**0 洞**；唯一扣分是 #11 的「没允许／未允许／已允许」略显翻译腔。中文 caption、图内状态和中文深入讲解改用「未开启／已开启」，英文内容、机制、数字和布局均未改。
- 新的独立冷读为易读 **12 / 12**、可判原项 #2–#8 与 #11 合计 **16 / 16**、**0 洞**；#11 恢复 2 分。主评审沿用已核对的 #1、#9、#10、#12 各 2 分，总分 **23→24**，章均分 **23.50→24.00**。
- 中英桌面、360／390／430 px 中文手机和中文深入讲解截图均已打开检查。英文截图改前后 SHA-256 均为 `b875a9570d563b6ae396f331c7e94986025304818efd7e56b438094bc639ad74`；浏览器断言确认 caption、图和深入讲解使用新措辞，旧措辞已消失。
- `build`、本章 `transcript`、本步 `readability`、本章三种宽度的中英手机布局、本步中文手机字号、全站 `WAIT=100 mobile`、`deep-check 02`、`zh-check` 和 `git diff --check` 均通过；全站另有 **576** 个既有小字视图仅作审计。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch02-s02-wording-20261124-1821/final/` 和 `checks/`。未运行 Voxt 产品测试或真人儿童试读。

## 第 3 步冷读与检查

- 首次独立冷读为易读 **10 / 12**、可评原项 **18 / 20**、**2 洞**：`permission_denied` 没有中文意思；右图为何还要假设设备正常没有说清。只在错误下补「权限被拒绝，录音没有开始」，并把脚注改为「权限只取消阻拦；麦克风还要能收音」。同一冷读者复读为易读 **12 / 12**、可评原项 **20 / 20**、**0 洞**，R1–R6 均为 2，无新增洞。
- 主线程核对原 #10、#12 各 **2 / 2**，合计 **24 / 24**。#10 的每个结论都有公开源码行号；#12 的一句话、图上内容、公式与符号来源、两种情况代入、省略边界、接下来和源码出处均完整。
- 两幅同布局图保持 Accessibility 开启并发送同一个 `capture.start`，只改变麦克风权限。左图拒绝时返回 `permission_denied`，录音不开始；右图允许且输入设备正常时，声音经 helper 送到 Go app。主图没有声称权限单独保证录音成功。
- 源码基线为 `sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`。权限状态与首次请求见 `Voxt/helper/Sources/VoxtNewHelper/Permissions.swift:11-18,53-58`；采集前权限检查见 `Voxt/helper/Sources/VoxtNewHelper/Capture.swift:53-79`；请求与错误见 `Voxt/docs/helper-protocol.md:32-37,63,107`；启动失败不发送 `capture.started` 见 `Voxt/internal/helper/proto/capture.go:20-25`；Go 错误归类见 `Voxt/internal/session/session.go:464-483`。
- 双语深入讲解的公式、符号表、两种权限代入、未决定的权限状态、设备与其他失败边界均已核对；中英顶部和底部截图均已打开检查。
- 最终 `build`、Voxt `transcript`、本步 `readability`、本步中文手机字号、本章中英及全站三种宽度手机布局、`deep-check 02`、本章 `zh-check` 和 `git diff --check` 均通过；全站另有 **570** 个既有小字视图仅作审计。中英桌面、360／390／430 px 中文手机、手机底部及双语深入讲解截图均已打开检查；本地目标页返回 HTTP 200。浏览器实测本步无 SVG 动画，两个面板与 caption 在 0、100、300、1200 ms 均完整可见。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch02-s03-20261124-1941/final/` 和 `checks/`。未运行 Voxt 产品测试或真人儿童试读；独立冷读为模拟读者。
