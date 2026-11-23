// Deep-dive text, one Markdown file per chapter and language: src/deep/<slug>.<en|zh>.md,
// one "## " section per step, in step order. Compiled at build time (KaTeX included), passed to the viz as HTML.
const files = import.meta.glob<{ compiledContent: () => string | Promise<string> }>('./deep/*.md', { eager: true });

async function sections(path: string): Promise<string[]> {
  const html = await files[path]?.compiledContent();
  return html ? html.split(/(?=<h2[\s>])/).filter((s) => s.startsWith('<h2')) : [];
}

export type Deep = { en: string[]; zh: string[] };
export async function deepFor(slug: string): Promise<Deep> {
  return { en: await sections(`./deep/${slug}.en.md`), zh: await sections(`./deep/${slug}.zh.md`) };
}
