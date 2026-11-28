import type { Chapter, NavLink, Part } from '../chapters';

export const voxtParts: Part[] = [
  { id: 'dictation', title: 'One dictation', blurb: 'Follow one spoken sentence from a hotkey to finished text.', titleZh: '一次听写', blurbZh: '跟一句话从快捷键走到整理好的文字。' },
  { id: 'desktop', title: 'The desktop around it', blurb: 'Deliver text, then track dictionaries, history, files and models.', titleZh: '桌面上的文字', blurbZh: '交付文字，再跟踪词典、历史、文件和模型。' },
  { id: 'meetings', title: 'Meetings and evidence', blurb: 'Extend one audio track to two, then check what the evidence proves.', titleZh: '会议与证据', blurbZh: '把一条音轨扩成两条，再核对证据边界。' },
];

export const voxtChapters: Chapter[] = [
  { part: 'dictation', slug: 'one-dictation', title: 'The journey of one sentence', hook: 'Follow one dictation through its route and its session tag.', titleZh: '一句话的完整旅程', hookZh: '跟着一次听写走过整条路线，认清它的 session 标签。', ready: true },
  { part: 'dictation', slug: 'helper-permissions-hotkeys', title: 'Hotkeys and permissions', hook: 'Trace hotkeys and permissions through the helper.', titleZh: '快捷键和权限', hookZh: '看快捷键和权限怎样经过 helper。', ready: true },
  { part: 'dictation', slug: 'microphone-to-voice-frames', title: 'From microphone to audio frames', hook: 'Cut sound into frames, then filter, detect and level the model copy.', titleZh: '从麦克风到音频帧', hookZh: '把声音切成帧，再滤波、检测并调整模型副本的音量。', ready: true },
  { part: 'dictation', slug: 'speech-recognition-routes', title: 'Routes from sound to text', hook: 'Compare local, API and system speech recognition.', titleZh: '声音变文字的几条路', hookZh: '对照本机、API 和系统语音识别。', ready: true },
  { part: 'dictation', slug: 'language-model-connection', title: 'The language-model connection', hook: 'Separate model settings, text and the API key.', titleZh: '语言模型服务与钥匙串', hookZh: '分清模型设置、文本和 API key。', ready: true },
  { part: 'dictation', slug: 'compose-and-cleanup', title: 'The text workshop', hook: 'Assemble a cleanup request and follow its failure exits.', titleZh: '文字加工厂', hookZh: '组装整理请求，再看失败时走哪个出口。', ready: true },
  { part: 'desktop', slug: 'deliver-text-safely', title: 'Checks before text lands', hook: 'Check the destination before inserting, replacing or copying.', titleZh: '文字落地前的检查', hookZh: '插入、替换或复制之前先检查目的地。', ready: true },
  { part: 'desktop', slug: 'personal-dictionary', title: 'Your small dictionary', hook: 'Follow dictionary entries into recognition and cleanup.', titleZh: '你的小词典', hookZh: '看词条怎样帮助识别和整理。', ready: true },
  { part: 'desktop', slug: 'history-retry-retention', title: 'History and retry expiration', hook: 'Put history and retry recordings on two retention clocks.', titleZh: '历史和重试的保质期', hookZh: '给历史和重试录音各画一个保留时钟。', ready: true },
  { part: 'desktop', slug: 'file-transcription', title: 'A separate file-transcription route', hook: 'Turn an audio file you already have into text, not text at a cursor.', titleZh: '文件转写的另一条传送带', hookZh: '把现成的音频文件变成文字，而不是光标处的文字。', ready: true },
  { part: 'desktop', slug: 'models-and-app-updates', title: 'Model storage and app updates', hook: 'Separate model downloads, runtime unloading and app updates.', titleZh: '模型仓库与应用更新站', hookZh: '分清模型下载、运行时卸载和应用更新。', ready: true },
  { part: 'meetings', slug: 'meeting-capture-modes', title: 'Three meeting capture modes', hook: 'Compare meeting, subtitles and recording.', titleZh: '会议的三种采集模式', hookZh: '对照 meeting、subtitles 和 recording。', ready: true },
  { part: 'meetings', slug: 'meeting-live-and-final', title: 'Live first, final later', hook: 'Separate live captions from the post-meeting transcript.', titleZh: '先看直播，再做终稿', hookZh: '分清实时字幕和会后终稿。', ready: false },
  { part: 'meetings', slug: 'meeting-speaker-labels', title: 'Name tags for voices', hook: 'Attach speaker labels to the finished transcript.', titleZh: '给声音贴姓名牌', hookZh: '把说话人标签接到终稿上。', ready: false },
  { part: 'meetings', slug: 'meeting-summary-and-export', title: 'Work on the final transcript', hook: 'Correct, summarize, ask and export in order.', titleZh: '会议终稿再加工', hookZh: '依次纠正、总结、追问和导出。', ready: false },
  { part: 'meetings', slug: 'logs-tests-and-evaluation', title: 'A magnifying glass for the book', hook: 'Mark code tests, sample evaluations and unchecked ground.', titleZh: '给整本书装上放大镜', hookZh: '标出代码测试、样本评测和未验证范围。', ready: false },
];

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const voxtHrefOf = (slug: string) => `${base}/voxt/ch/${slug}/`;

export function voxtNeighbors(slug: string): { prev?: NavLink; next?: NavLink } {
  const i = voxtChapters.findIndex((c) => c.slug === slug);
  const link = (c?: Chapter) => (c ? { title: c.title, titleZh: c.titleZh, href: voxtHrefOf(c.slug), ready: c.ready } : undefined);
  return { prev: link(voxtChapters[i - 1]), next: link(voxtChapters[i + 1]) };
}
