import { chapters, parts, type Chapter, type Part } from './chapters';
import { omniChapters, omniParts } from './omni/chapters';
import { mlSysChapters, mlSysParts } from './ml-sys/chapters';
import { voxtChapters, voxtParts } from './voxt/chapters';
import { site } from './site';

export type BookId = 'sglang' | 'omni' | 'ml-sys' | 'voxt';

export interface Book {
  id: BookId;
  name: string;
  navName: string;
  tagline: string;
  taglineZh: string;
  homeHook: string;
  homeHookZh: string;
  route: string;
  chapters: Chapter[];
  parts: Part[];
}

export const books: Book[] = [
  {
    id: 'sglang', name: site.name, navName: 'Learning SGLang', tagline: site.tagline, taglineZh: site.taglineZh,
    homeHook: 'The inference engine, from one token to many GPUs.', homeHookZh: '从一个 token 到多块 GPU 的推理引擎。',
    route: '', chapters, parts,
  },
  {
    id: 'omni', name: 'Learning SGLang Omni', navName: 'SGLang Omni',
    tagline: 'How configuration becomes a running multimodal request.', taglineZh: '配置怎样变成运行中的多模态请求。',
    homeHook: 'How multimodal requests run.', homeHookZh: '多模态请求怎样运行。',
    route: 'omni/', chapters: omniChapters, parts: omniParts,
  },
  {
    id: 'ml-sys', name: 'Learning ML Systems', navName: 'ML Systems',
    tagline: 'Measure the waits, memory and weight paths in ML systems.', taglineZh: '测量 ML 系统里的等待、显存和权重路径。',
    homeHook: 'Measure waits, memory and weight paths.', homeHookZh: '测量等待、显存和权重路径。',
    route: 'ml-sys/', chapters: mlSysChapters, parts: mlSysParts,
  },
  {
    id: 'voxt', name: 'Inside Voxt', navName: 'Inside Voxt',
    tagline: 'Follow spoken sentences through a Mac dictation app.', taglineZh: '跟着语音走完 Mac 听写 app。',
    homeHook: 'Follow one spoken sentence through the app.', homeHookZh: '跟一句话走完整个 app。',
    route: 'voxt/', chapters: voxtChapters, parts: voxtParts,
  },
];

export function bookFor(id: unknown): Book {
  if (id === 'omni') return books[1];
  if (id === 'ml-sys') return books[2];
  if (id === 'voxt') return books[3];
  return books[0];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const chapterHref = (book: Book, slug: string) => `${base}/${book.route}ch/${slug}/`;
export const bookHref = (book: Book) => chapterHref(book, book.chapters[0].slug);

interface ChapterRef { book: BookId; slug: string }
interface RelatedPair { from: ChapterRef; to: ChapterRef; label: string; labelZh: string }
const ref = (book: BookId, slug: string): ChapterRef => ({ book, slug });

// Undirected pairs: relatedFor exposes both ends. Only link current, ready chapters with a shared mechanism.
const relatedPairs: RelatedPair[] = [
  { from: ref('sglang', '04-prefill-decode'), to: ref('ml-sys', '01-measure-inference'), label: 'First-token and token-gap timing', labelZh: '首 token 与 token 间隔' },
  { from: ref('sglang', '05-batching'), to: ref('ml-sys', '01-measure-inference'), label: 'Latency and throughput', labelZh: '延迟与吞吐量' },
  { from: ref('sglang', '06-scheduler'), to: ref('ml-sys', '01-measure-inference'), label: 'Scheduling, TTFT and token gaps', labelZh: '调度、TTFT 与 token 间隔' },
  { from: ref('sglang', '20-streaming-audio'), to: ref('ml-sys', '01-measure-inference'), label: 'Latency percentiles and throughput', labelZh: '延迟百分位与吞吐量' },
  { from: ref('sglang', '07-kv-memory'), to: ref('ml-sys', '02-inference-memory-budget'), label: 'KV memory', labelZh: 'KV 显存' },
  { from: ref('sglang', '11-cuda-graphs'), to: ref('ml-sys', '02-inference-memory-budget'), label: 'CUDA Graph buffers', labelZh: 'CUDA Graph 缓冲' },
  { from: ref('sglang', '19-sharing-gpus'), to: ref('ml-sys', '02-inference-memory-budget'), label: 'One-card memory budgets', labelZh: '同卡显存账' },
  { from: ref('sglang', '16-omni-models'), to: ref('omni', '01-config-to-runtime'), label: 'The Qwen3-Omni request route', labelZh: 'Qwen3-Omni 请求路线' },
  { from: ref('sglang', '17-stages-and-schedulers'), to: ref('omni', '01-config-to-runtime'), label: 'Stages and processes', labelZh: 'stage 与进程' },
  { from: ref('sglang', '18-between-stages'), to: ref('omni', '01-config-to-runtime'), label: 'The 11 stage hand-offs', labelZh: '11 次 stage 交接' },
  { from: ref('sglang', '19-sharing-gpus'), to: ref('omni', '01-config-to-runtime'), label: 'The one-card GPU budget', labelZh: '同卡显存预算' },
  { from: ref('sglang', '17-stages-and-schedulers'), to: ref('omni', '02-spg-topology'), label: 'Stage–Process–GPU topology', labelZh: 'Stage–Process–GPU 布局' },
  { from: ref('sglang', '18-between-stages'), to: ref('omni', '02-spg-topology'), label: 'Hand-offs inside a shared process', labelZh: '同进程内的交接' },
  { from: ref('sglang', '18-between-stages'), to: ref('omni', '03-request-binding'), label: 'Abort and stale-work protection', labelZh: '取消与过期工作隔离' },
  { from: ref('sglang', '21-full-duplex'), to: ref('omni', '03-request-binding'), label: 'Binding stateful work to a replica', labelZh: '把有状态工作绑定到副本' },
  { from: ref('voxt', 'one-dictation'), to: ref('omni', '03-request-binding'), label: 'Late results and cancellation', labelZh: '迟到结果与取消' },
  { from: ref('sglang', '17-stages-and-schedulers'), to: ref('omni', '04-readiness-contracts'), label: 'Streaming readiness and buffering', labelZh: '流式就绪与缓冲' },
  { from: ref('sglang', '20-streaming-audio'), to: ref('omni', '04-readiness-contracts'), label: 'Buffering before stream readiness', labelZh: '流式就绪前的缓冲' },
  { from: ref('omni', '01-config-to-runtime'), to: ref('ml-sys', '02-inference-memory-budget'), label: 'GPU memory fractions', labelZh: 'GPU 显存份额' },
];

export function relatedFor(bookId: BookId, slug: string) {
  return relatedPairs.flatMap((pair) => {
    const same = (r: ChapterRef) => r.book === bookId && r.slug === slug;
    const target = same(pair.from) ? pair.to : same(pair.to) ? pair.from : undefined;
    if (!target) return [];
    const book = bookFor(target.book);
    const index = book.chapters.findIndex((chapter) => chapter.slug === target.slug);
    const chapter = book.chapters[index];
    if (!chapter?.ready) throw new Error(`related chapter is missing or not ready: ${target.book}/${target.slug}`);
    return [{ ...pair, book, chapter, number: index + 1, href: chapterHref(book, chapter.slug) }];
  });
}
