// Single source of truth for the sidebar and home page. Add a chapter here and an .mdx file in src/pages/ch/.
// Numbering is continuous across parts. Each chapter should end on a question that the next one answers.
// *Zh fields are the Chinese layer; the English fields are the original and stay untouched.
export interface Part { id: string; title: string; blurb: string; titleZh: string; blurbZh: string }
export const parts: Part[] = [
  { id: 'loop', title: 'The loop', blurb: 'Why every piece of the engine exists.', titleZh: '循环', blurbZh: '引擎的每个部件为什么存在。' },
  { id: 'fast', title: 'Making one GPU fast', blurb: 'The loop is correct; now the step is slow for reasons that have nothing to do with the model.', titleZh: '让一块 GPU 快起来', blurbZh: '循环是对的；但每一步慢得与模型本身无关。' },
  { id: 'omni', title: 'Beyond text · SGLang Omni', blurb: 'Speech and vision break the assumptions of Part I, one at a time.', titleZh: '超越文本 · SGLang Omni', blurbZh: '语音和视觉一个接一个地打破第一部分的假设。' },
  { id: 'faster', title: 'More from one GPU', blurb: 'Every pass still reads all of the weights: make that read smaller, and keep the GPU busy while it waits.', titleZh: '榨干一块 GPU', blurbZh: '每次前向仍要读全部权重：让这次读变小，并在等待时让 GPU 忙着。' },
  { id: 'scale', title: 'More than one GPU', blurb: 'The model, the cache, or the traffic no longer fits on one card.', titleZh: '不止一块 GPU', blurbZh: '模型、缓存或流量，一块卡装不下了。' },
];

export interface Chapter { slug: string; title: string; hook: string; ready: boolean; part: string; titleZh: string; hookZh: string }
export const chapters: Chapter[] = [
  { part: 'loop', slug: '01-inference', title: 'Bare-minimum inference', hook: 'One function, called in a loop.', titleZh: '最简推理', hookZh: '一个函数，循环调用。', ready: true },
  { part: 'loop', slug: '02-attention', title: 'Attention, per decode step', hook: 'What a new token needs from the past.', titleZh: '每生成一个新 token 时的 attention', hookZh: '新 token 需要从过去拿到什么。', ready: true },
  { part: 'loop', slug: '03-kv-cache', title: 'KV cache', hook: 'Keep k and v. Drop q.', titleZh: 'KV cache', hookZh: '留下 k 和 v，丢掉 q。', ready: true },
  { part: 'loop', slug: '04-prefill-decode', title: 'Prefill vs decode', hook: 'Two very different workloads.', titleZh: 'Prefill 与 decode', hookZh: '两种截然不同的负载。', ready: true },
  { part: 'loop', slug: '05-batching', title: 'Batching & continuous batching', hook: 'Sharing a GPU between users.', titleZh: '批处理与连续批处理', hookZh: '多个用户共享一块 GPU。', ready: true },
  { part: 'loop', slug: '06-scheduler', title: 'The scheduler', hook: 'Two lists, one GPU, one choice per step.', titleZh: '调度器', hookZh: '两个列表，一块 GPU，每步一个选择。', ready: true },
  { part: 'loop', slug: '07-kv-memory', title: 'KV memory', hook: 'Pages, and the memory cap.', titleZh: 'KV 内存', hookZh: '页，以及内存上限。', ready: true },
  { part: 'loop', slug: '08-prefix-caching', title: 'Prefix caching', hook: 'Same beginning, one copy.', titleZh: '前缀缓存', hookZh: '相同的开头，只存一份。', ready: true },
  { part: 'loop', slug: '09-one-request', title: 'One request, end to end', hook: 'From an HTTP POST to the GPU and back.', titleZh: '一个请求的完整旅程', hookZh: '从 HTTP POST 到 GPU 再回来。', ready: true },
  { part: 'loop', slug: '10-engine', title: 'Scheduler deep dive', hook: 'One Req through one step.', titleZh: '调度器深入', hookZh: '一个 Req 走完一步。', ready: true },

  { part: 'fast', slug: '11-cuda-graphs', title: 'CUDA graphs', hook: 'Launching a thousand kernels as one.', titleZh: 'CUDA graphs', hookZh: '把上千次 kernel 启动合成一次。', ready: true },
  { part: 'fast', slug: '12-piecewise-cuda-graph', title: 'Piecewise CUDA graphs', hook: 'When the graph has to break.', titleZh: '分段 CUDA graphs', hookZh: '图不得不切开的时候。', ready: true },
  { part: 'fast', slug: '13-torch-compile', title: 'torch.compile', hook: 'Fusing the kernels you were about to launch.', titleZh: 'torch.compile', hookZh: '把正要启动的 kernel 融合起来。', ready: true },
  { part: 'fast', slug: '14-attention-backends', title: 'Attention backends', hook: 'Why there are five kernels for one equation.', titleZh: 'Attention 后端', hookZh: '一个方程为什么有五个 kernel。', ready: true },
  { part: 'fast', slug: '15-speculative-decoding', title: 'Speculative decoding', hook: 'Guess several tokens, verify in one step.', titleZh: '投机解码', hookZh: '猜几个 token，一步验证。', ready: true },

  { part: 'omni', slug: '16-omni-models', title: 'Omni models', hook: 'Pixels and speech in, speech out.', titleZh: 'Omni 模型', hookZh: '像素和语音进，语音出。', ready: true },
  { part: 'omni', slug: '17-stages-and-schedulers', title: 'Stages and schedulers', hook: 'Seven stages, three kinds of scheduler.', titleZh: '阶段与调度器', hookZh: '七个阶段，三种调度器。', ready: true },
  { part: 'omni', slug: '18-between-stages', title: 'Between stages', hook: 'Eight edges, four ways to cross them.', titleZh: '阶段之间', hookZh: '八条边，四种跨越方式。', ready: true },
  { part: 'omni', slug: '19-sharing-gpus', title: 'Sharing GPUs', hook: 'Several models, one card.', titleZh: '共享 GPU', hookZh: '几个模型，一块卡。', ready: true },
  { part: 'omni', slug: '20-streaming-audio', title: 'Streaming audio decode', hook: 'Output with a real-time deadline.', titleZh: '流式音频解码', hookZh: '带着实时期限的输出。', ready: true },
  { part: 'omni', slug: '21-full-duplex', title: 'Full duplex', hook: 'Listening while speaking.', titleZh: '全双工', hookZh: '一边说一边听。', ready: true },

  { part: 'faster', slug: '22-quantization', title: 'Quantization', hook: 'Shrinking the read every step pays for.', titleZh: '量化', hookZh: '缩小每步都要付的读取成本。', ready: false },
  { part: 'faster', slug: '23-two-batch-overlap', title: 'Two-batch overlap', hook: 'Hiding communication behind compute.', titleZh: '双批重叠', hookZh: '把通信藏在计算后面。', ready: false },

  { part: 'scale', slug: '24-tensor-parallel', title: 'Tensor parallelism', hook: 'A model bigger than one GPU.', titleZh: '张量并行', hookZh: '一块 GPU 装不下的模型。', ready: false },
  { part: 'scale', slug: '25-pipeline-expert-parallel', title: 'Pipeline & expert parallelism', hook: 'Splitting by layer, and by expert.', titleZh: '流水线与专家并行', hookZh: '按层切，按专家切。', ready: false },
  { part: 'scale', slug: '26-dp-attention', title: 'Data-parallel attention', hook: 'Replicate the attention side, share the rest.', titleZh: '数据并行 attention', hookZh: 'attention 一侧复制，其余共享。', ready: false },
  { part: 'scale', slug: '27-hierarchical-kv', title: 'Hierarchical KV cache', hook: 'When 64 GB is not enough.', titleZh: '分层 KV cache', hookZh: '64 GB 不够的时候。', ready: false },
  { part: 'scale', slug: '28-disaggregation', title: 'Prefill-decode disaggregation', hook: 'Two clocks, two machines.', titleZh: 'Prefill-decode 分离', hookZh: '两个时钟，两台机器。', ready: false },
  { part: 'scale', slug: '29-router', title: 'The router', hook: 'Many engines, one front door.', titleZh: '路由器', hookZh: '多个引擎，一个前门。', ready: false },
];

export interface NavLink { title: string; titleZh?: string; href: string; ready: boolean }
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const hrefOf = (slug: string) => `${base}/ch/${slug}/`;
export const chapterNumber = (slug: string) => chapters.findIndex((c) => c.slug === slug) + 1;

// Previous and next chapter for a slug; used by the header and by the step controls at the first/last step.
export function neighbors(slug: string): { prev?: NavLink; next?: NavLink } {
  const i = chapters.findIndex((c) => c.slug === slug);
  const link = (c?: Chapter) => (c ? { title: c.title, titleZh: c.titleZh, href: hrefOf(c.slug), ready: c.ready } : undefined);
  return { prev: link(chapters[i - 1]), next: link(chapters[i + 1]) };
}
