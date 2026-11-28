import type { Chapter, NavLink, Part } from '../chapters';

export const omniParts: Part[] = [
  { id: 'runtime', title: 'From config to a running request', blurb: 'Follow configuration, requests and data through the runtime.', titleZh: '从配置到运行中的请求', blurbZh: '跟着配置、请求和数据走完运行时。' },
  { id: 'performance', title: 'Waiting and memory', blurb: 'Measure the wait, then change the work or the budget.', titleZh: '等待与显存', blurbZh: '先量等待，再改变工作或预算。' },
  { id: 'models', title: 'Real model pipelines', blurb: 'Apply the same maps to Fish S2 Pro, full duplex and Qwen3-Omni.', titleZh: '真实模型流水线', blurbZh: '把同一套图用到 Fish S2 Pro、全双工和 Qwen3-Omni。' },
  { id: 'serving', title: 'Serve and route', blurb: 'Bound delivery, then choose a worker.', titleZh: '服务与路由', blurbZh: '限制交付积压，再选择 worker。' },
];

export const omniChapters: Chapter[] = [
  { part: 'runtime', slug: '01-config-to-runtime', title: 'From config to a runtime graph', hook: 'Turn a list of choices into a running request route.', titleZh: '从配置到运行图', hookZh: '把一张选择清单变成运行中的请求路线。', ready: true },
  { part: 'runtime', slug: '02-spg-topology', title: 'Stage–Process–GPU layout', hook: 'Group stages, copy processes, and split one stage across GPUs.', titleZh: 'Stage–Process–GPU 怎么摆', hookZh: '把 stage 分组、复制进程，再让一个 stage 用上多张 GPU。', ready: true },
  { part: 'runtime', slug: '03-request-binding', title: 'Request binding and exit', hook: 'Choose a replica, finish or abort, then release ownership.', titleZh: '请求绑定与退出', hookZh: '选定副本，完成或取消，再释放所有权。', ready: true },
  { part: 'runtime', slug: '04-readiness-contracts', title: 'Three waiting rules', hook: 'When can the next stage start, and when must it wait?', titleZh: '三种等待规则', hookZh: '下一个 stage 何时开始，什么时候必须等？', ready: true },
  { part: 'runtime', slug: '05-data-lifetime', title: 'Data references and reclamation', hook: 'Publish, read, acknowledge and release.', titleZh: '数据引用与回收', hookZh: '发布、读取、确认和释放。', ready: true },
  { part: 'performance', slug: '06-batching-backpressure', title: 'Queues, batches and backpressure', hook: 'When a batch fills the GPU, and when it only adds a wait.', titleZh: '排队、batch 与背压', hookZh: 'batch 何时填满 GPU，何时只增加等待。', ready: true },
  { part: 'performance', slug: '07-shared-gpu-budgets', title: 'A shared GPU budget', hook: 'Fit weights, KV and replicas into one card.', titleZh: '同卡显存预算', hookZh: '把权重、KV 和副本装进一张卡。', ready: true },
  { part: 'performance', slug: '08-measure-streaming', title: 'Measure first sound and stalls', hook: 'Put every wait on one timeline.', titleZh: '测量首音与卡顿', hookZh: '把每段等待放到同一条时间线上。', ready: true },
  { part: 'performance', slug: '09-ar-stage-optimization', title: 'Optimize AR and encoders', hook: 'See how caching, single-flight, async decode and CUDA graphs change the wait.', titleZh: 'AR 与编码器优化', hookZh: '看 cache、single-flight、异步 decode 和 CUDA Graph 怎样改变等待。', ready: true },
  { part: 'performance', slug: '10-vocoder-optimization', title: 'Optimize the streaming vocoder', hook: 'Batching, codec state and CUDA graphs beside one playback line.', titleZh: '流式 vocoder 优化', hookZh: '把 batch、codec 状态和 CUDA Graph 放到一条播放线旁。', ready: true },
  { part: 'models', slug: '11-fish-s2-pro', title: 'Fish S2 Pro: Dual-AR in practice', hook: 'Two nested loops inside one speech request.', titleZh: 'Fish S2 Pro：Dual-AR 落地', hookZh: '一次语音请求里的两层循环。', ready: true },
  { part: 'models', slug: '12-full-duplex-strategies', title: 'Full-duplex strategies and measurement', hook: 'Compare three designs with the same interruption.', titleZh: '全双工策略与测量', hookZh: '用同一次打断比较三种设计。', ready: true },
  { part: 'models', slug: '13-qwen3-omni-deployment', title: 'Deploy and tune Qwen3-Omni', hook: 'Choose text or speech, cards, precision and concurrency together.', titleZh: 'Qwen3-Omni 部署调优', hookZh: '一起选择文本或语音、卡数、精度和并发。', ready: true },
  { part: 'serving', slug: '14-slow-reader-backpressure', title: 'When the client reads too slowly', hook: 'Finished generation can leave audio queued; one shared byte cap chooses which streams fail.', titleZh: '客户端读得太慢', hookZh: '生成结束后，声音仍可能排队；共享字节上限决定哪些流失败。', ready: true },
  { part: 'serving', slug: '15-router-worker-selection', title: 'Choose a compatible worker', hook: 'Filter capabilities and health, then choose a worker for the next request.', titleZh: '给请求选 worker', hookZh: '先看能力和健康，再为下一个请求选择 worker。', ready: true },
];

export const omniHrefOf = (slug: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/omni/ch/${slug}/`;

export function omniNeighbors(slug: string): { prev?: NavLink; next?: NavLink } {
  const i = omniChapters.findIndex((c) => c.slug === slug);
  const link = (c?: Chapter) => (c ? { title: c.title, titleZh: c.titleZh, href: omniHrefOf(c.slug), ready: c.ready } : undefined);
  return { prev: link(omniChapters[i - 1]), next: link(omniChapters[i + 1]) };
}
