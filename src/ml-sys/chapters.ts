import type { Chapter, NavLink, Part } from '../chapters';

export const mlSysParts: Part[] = [
  { id: 'inference', title: 'Measure and serve', blurb: 'Measure a request, account for memory, then scale the service.', titleZh: '测量与服务', blurbZh: '先量请求、算显存，再扩展服务。' },
  { id: 'rl', title: 'RL systems', blurb: 'Follow data and weights through rollout and training.', titleZh: 'RL 系统', blurbZh: '跟着数据和权重走完 rollout 与训练。' },
  { id: 'practice', title: 'Engineering practice', blurb: 'Profile real waits, inspect memory and make a reviewable change.', titleZh: '工程实践', blurbZh: '测量等待、检查显存，再做可复核的修改。' },
];

export const mlSysChapters: Chapter[] = [
  { part: 'inference', slug: '01-measure-inference', title: 'Measure one inference request', hook: 'Put first-token waits, token gaps, percentiles and throughput on one timeline.', titleZh: '测量一次推理', hookZh: '把首 token 等待、token 间隔、延迟百分位和吞吐量画出来。', ready: true },
  { part: 'inference', slug: '02-inference-memory-budget', title: 'Memory for startup and runtime', hook: 'Follow model loading, KV sizing, graph buffers and activations through one card’s budget.', titleZh: '启动与运行时显存账', hookZh: '跟着模型装入、KV 尺寸、graph 缓冲和激活走完一张卡的预算。', ready: true },
  { part: 'inference', slug: '03-hybrid-state-cache', title: 'Prefix state in hybrid models', hook: 'Compare per-token KV with recurrent-state snapshots and recomputation.', titleZh: 'Hybrid 模型的前缀状态', hookZh: '对照逐 token KV 与 recurrent state 的快照和重算。', ready: true },
  { part: 'inference', slug: '04-gpu-communication', title: 'The tensor road between GPUs', hook: 'Follow one tensor through processes, communication libraries, links and all-reduce.', titleZh: 'GPU 之间的张量路', hookZh: '沿着一份张量看进程、通信库、链路和 all-reduce。', ready: true },
  { part: 'inference', slug: '05-distributed-serving', title: 'A distributed serving experiment', hook: 'Start workers from a public config and follow one request home.', titleZh: '多节点推理服务实验', hookZh: '按公开配置启动 worker，跟着一个请求走完计算和返回。', ready: true },
  { part: 'rl', slug: '06-slime-rollout-loop', title: 'One RL round in slime', hook: 'Connect prompts, rollout, rewards, training and the next weights.', titleZh: 'slime 的一轮 RL', hookZh: '把 prompt、rollout、reward、训练和下一版权重画成闭环。', ready: true },
  { part: 'rl', slug: '07-weight-updates', title: 'The weight-update path', hook: 'Map three routes for new weights and mark safe replacement times.', titleZh: '权重更新通道', hookZh: '画清三条新权重通道，标出安全替换权重的时刻。', ready: true },
  { part: 'rl', slug: '08-fsdp2-training-backend', title: 'The FSDP2 training backend', hook: 'Shard training state, then gather weights before rollout.', titleZh: 'FSDP2 训练后端', hookZh: '分片保存训练状态，再在 rollout 前收齐权重。', ready: true },
  { part: 'rl', slug: '09-fp8-rollout-training', title: 'FP8 rollout and training', hook: 'Put FP8 tensors on both paths and mark every precision conversion.', titleZh: 'FP8 采样与训练', hookZh: '把 FP8 张量放到两条路上，标出每次精度转换。', ready: true },
  { part: 'rl', slug: '10-int4-qat-rollout', title: 'INT4 QAT and rollout', hook: 'Put quantization-aware training, INT4 weights and rollout memory in one RL round.', titleZh: 'INT4 QAT 与 rollout', hookZh: '把量化感知训练、INT4 权重和 rollout 显存放进同一轮 RL。', ready: true },
  { part: 'rl', slug: '11-train-inference-mismatch', title: 'Training–inference numerical mismatch', hook: 'Compare two compute paths for the same weights and token sequence.', titleZh: '训练与推理的数值差', hookZh: '给同一权重和 token 序列画上两条计算路。', ready: false },
  { part: 'rl', slug: '12-rl-speculative-decoding', title: 'Speculative decoding in RL', hook: 'Update the draft during RL and compare reported rollout throughput with added training seconds.', titleZh: 'RL 中的投机解码', hookZh: '让 draft 随训练更新，对照 rollout 吞吐与新增训练秒数。', ready: true },
  { part: 'practice', slug: '13-multi-turn-agent-rl', title: 'Multi-turn agent RL', hook: 'Follow model calls and tool results through one training rollout.', titleZh: '多轮智能体 RL', hookZh: '跟着模型调用和工具结果走完一条训练 rollout。', ready: true },
  { part: 'practice', slug: '14-profile-rl-systems', title: 'Profile a multi-turn training run', hook: 'Put queues, generation, tools, training and communication on one timeline.', titleZh: '测量多轮训练链路', hookZh: '把排队、生成、工具、训练和通信画到同一条时间线。', ready: false },
  { part: 'practice', slug: '15-memory-snapshot-debugging', title: 'Find a memory leak with snapshots', hook: 'Compare tensors, stack traces and live references at two times.', titleZh: '用快照寻找显存泄漏', hookZh: '对比两个时间点的张量、调用栈和仍在持有的引用。', ready: false },
  { part: 'practice', slug: '16-engineering-practice', title: 'From source reading to public contribution', hook: 'Turn one public engineering case into a reproducible, reviewable change.', titleZh: '从源码阅读到公开贡献', hookZh: '用一个公开案例串起复现、定位、修改、测试和评审。', ready: false },
];

export const mlSysHrefOf = (slug: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/ml-sys/ch/${slug}/`;

export function mlSysNeighbors(slug: string): { prev?: NavLink; next?: NavLink } {
  const i = mlSysChapters.findIndex((c) => c.slug === slug);
  const link = (c?: Chapter) => (c ? { title: c.title, titleZh: c.titleZh, href: mlSysHrefOf(c.slug), ready: c.ready } : undefined);
  const prev = mlSysChapters.slice(0, i).reverse().find((c) => c.ready);
  const next = mlSysChapters.slice(i + 1).find((c) => c.ready);
  return { prev: link(prev), next: link(next) };
}
