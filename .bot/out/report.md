# k1 本轮报告

日期：2026-11-26。范围只含 Learning SGLang Omni 第 14、15 章的协调返工、评分卡和生成 transcript；未动其他 lane 的书、第 1 本受保护英文原文或 `.bot/memory/`。本轮类型：**修旧**，未开第 16 章。

## Omni 14 · slow-reader-backpressure

### 已修复的 review 项

- 给全部八步加入 held phases、`requestAnimationFrame` 和 `LoopProgress`，分别演示交付积压、共享消息计数、读取空闲钟、最久没读淘汰、重复淘汰、整流失败、协议错误出口和关闭清理。每步循环并停留在完成场景，切换步骤会取消旧动画，reduced motion 直接显示完成场景。
- 独立源码冷读首轮给 R6 **14/16**，指出第 1 步初始卡片与条形图数字不一致、标签早于条形图到位。已让卡片和条形图使用同一相位，并把标签移到缩放完成后、算式移到下一相位。
- 评分卡保留协调对 `5e92976…6e190ef` 的基线：R1–R5 **80/80**、原十个非视觉项 **160/160**、静态原 #4/#5 **32/32**、原十二项 **192/192**、机制 R6 **0/16**。没有把静态场景分当成动画分。
- 当前源码和 DOM 证据支持 R6 **16/16**，这是 lane 的待协调复审结果，不是新的协调 verdict。

### 验证

- `npx astro --config .astro/local.config.mjs build`：60 页，通过。
- `WAIT=6000 BOOK=omni ONLY=14 npm run transcript -- http://localhost:4325/learning-sglang`：8 步，无布局问题；`readability` 8 步零机械问题。
- 英文全章 `mobile`、中文第 1–8 步各自三种宽度 `mobile`、`zh-check`、`deep-check 14`、`git diff --check` 全部通过；第 1 步相位修正后复跑目标门。
- `node .astro/check-omni14-motion.mjs`：八步检测到 **4/4/4/3/4/5/3/5** 个 held states，最终机制文字、LoopProgress、循环重启、caption／ARIA 均通过。第 1 步另检初始 10 秒排队、0 秒读取和标签延迟。结果在 `.bot/out/omni14-motion/dom-check.json`。
- 截图共 40 张，位于 `.bot/out/omni14-motion/` 的 `early-en/`、`mid-en/`、`final-en/`、`final-zh/`、`phone-zh/`。代表图：`.bot/out/omni14-motion/final-en/s5.png`。当前模型返回 `Cannot read image`，不给新增 PNG 视觉分。

提交：`6b2e42a`、`d1a9278`、`bf806e5`、`b5dbc7f`、`107382f`、`8d30c24`、`7078a9b`、`cbdb0f5`（八步动画），`58c960c`（第 1 步相位修正），`03f9b8d`（生成 transcript），`955e518`（评分卡和进度），均已推送。

## Omni 15 · router-worker-selection

### 已修复的 review 项

- 第 4 步：舞台和双语深入讲解写明 `2xx = HTTP status 200–299`，timeout 是超过探测期限仍无回应。独立冷读随后指出英文舞台漏 `HTTP`，已补齐并重生成 transcript。
- 第 6 步：在同一初始顺序 `[A,B,C]` 和负载 `[2,0,0]` 下，明确 round robin 选 A、least requests 选 B；手机拆成两行，没有新增面板。
- 第 7 步：RequestLease 改为「持有活跃数 +1 的凭证，响应结束、出错或取消时收回」；舞台解释 `dispatch` 和 `EOF`，speech batch 的 credit 加权只留在正文和深入讲解。
- 第 8 步：舞台标明 `New example · constructed loads`，MDX 和双语深入讲解明确不接第 6 步的 2、2、2，也不接第 7 步的新单个请求。
- 第 8 步：英文退出措辞改为 `worker failure and graceful exit`，深入讲解说明 worker 完成现有工作后退出，不再出现未解释的 `drain`。

协调基线为 R1–R5 **76/80**、原非视觉项 **138/144**。独立冷读确认五组修复后支持 **80/80、144/144**，均为 lane 的待协调复审结果。组件仍没有机制动画，按 EVAL §6 记 R6 **0/16**；本轮没有把文本返工记成整章完成。

### 验证

- `npx astro --config .astro/local.config.mjs build`：60 页，通过。
- `BOOK=omni ONLY=15 npm run transcript -- http://localhost:4325/learning-sglang`：8 步，无布局问题；`readability` 8 步零机械问题。
- 英文全章 `mobile`、中文第 4、6、7、8 步各自三种宽度 `mobile`、`zh-check`、`deep-check 15`、`git diff --check` 全部通过；第 4 步补 `HTTP` 后复跑目标门。
- 截图共 32 张，位于 `.bot/out/omni15/`：中英舞台和手机各 8 张，双语深入讲解各 4 张。代表图：`.bot/out/omni15/final-en/s4.png`。当前模型返回 `Cannot read image`，不给新增 PNG 视觉分。

提交：`6fb3c27`（第 4 步）、`53fc3ca`（第 6 步）、`6222556`（第 7 步）、`6e37970`（第 8 步）、`189e02b`（第 4 步补 `HTTP` 和生成 transcript），均已推送。

## 剩余与边界

- 两章的协调复审和主人视觉验收仍待。Omni 15 的八步机制动画仍未做，不能记 `complete-under-EVAL`；按 direction，复审通过前不开下一章。
- 未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、router、模型、GPU benchmark 或故障注入。源码出处仍分别固定到 Omni 14 的 `9725235249df851281d4dc62a04b2d34b02ac0fe` 和 Omni 15 的 `3a31bd72e034db37ce5115a03dd4827b449683be`。
- 本地章节地址：`http://localhost:4325/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=5` 和 `http://localhost:4325/learning-sglang/omni/ch/15-router-worker-selection/?step=7`。本轮 dev server 与 Chrome 已在收尾关闭；需要再看时运行 `npx astro --config .astro/local.config.mjs dev --background --port 4323`，若端口占用可使用 Astro 报出的端口。
- 本报告和两章评分卡、进度记录随最后一条 `[k1]` 提交推送。
