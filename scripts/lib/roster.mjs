import { existsSync, readFileSync } from 'node:fs';

function readBook(file, book, prefix) {
  if (!existsSync(file)) return [];
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/\{\s*part:\s*'(\w+)',\s*slug:\s*'([^']+)',\s*title:\s*(?:'([^']*)'|"([^"]*)"),\s*hook:\s*'([^']*)',[^}]*?\s*ready:\s*(true|false)\s*\}/g)]
    .map((m, i) => ({ book, prefix, n: i + 1, part: m[1], slug: m[2], title: m[3] ?? m[4], hook: m[5], ready: m[6] === 'true' }));
}

export const roster = [
  ...readBook('src/chapters.ts', 'sglang', ''),
  ...readBook('src/omni/chapters.ts', 'omni', '/omni'),
  ...readBook('src/ml-sys/chapters.ts', 'ml-sys', '/ml-sys'),
  ...readBook('src/voxt/chapters.ts', 'voxt', '/voxt'),
];

export const chapterUrl = (chapter) => `${chapter.prefix}/ch/${chapter.slug}/`;
export const pagePath = (chapter) => `src/pages${chapter.prefix}/ch/${chapter.slug}.mdx`;
export const transcriptPath = (chapter) => chapter.prefix ? `${chapter.prefix.slice(1)}/${chapter.slug}.md` : `${chapter.slug}.md`;

export function selectedChapters() {
  const only = process.env.ONLY ? Number(process.env.ONLY) : null;
  const book = process.env.BOOK || (only === null ? 'all' : 'sglang');
  const chapters = roster.filter((c) => c.ready && (book === 'all' || c.book === book) && (only === null || c.n === only));
  if (!chapters.length) throw new Error('no ready chapters matched');
  return chapters;
}
