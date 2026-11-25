# 第 2 章评分卡 · Hotkeys and permissions

日期：2026-11-24。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
第 1 步材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch02-s01-20261124-1613/final/`。
第 2 步材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch02-s02-20261124-1751/final/`；检查日志在相邻的 `checks/`。冷读者没有编程前置知识，只读主图、累计 transcript 和前章 transcript。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | 我按一下右边的 Option，辅助程序认出后告诉主程序「按键了」，主程序开始听写，然后请辅助程序采集麦克风的声音。 | 24 | 0 | — | 2026-11-24 |
| 2 | 12 | 同样按一下右 Option，Accessibility 关闭时，helper 看不见按键，发 0 条消息，Go app 仍空闲；开启时，helper 发 1 条消息，Go app 开始听写。 | 23 | 0 | #11 中文自然 | 2026-11-24 |

**当前平均：23.50 / 24；最低：23；总洞数：0；2/2 个已制作步骤易读满分。** 本章在做第 3 步。

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
