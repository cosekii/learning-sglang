// Checks the Chinese layer: every ready chapter, every step, in zh mode.
// Flags captions with no Chinese (missing captionZh) and captions taller than the 3-line box (clipped),
// stage text that runs past the SVG edge or overlaps other stage text, a missing/hidden prose pair,
// and a toggle that does not switch back to English.
// usage: node scripts/zh-check.mjs [screenshotDir]   ONLY=1,2 limits chapters; BOOK=omni checks Omni; WAIT=ms settles phases (default 3500); needs the dev server.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from './lib/browser.mjs';
import { roster } from './lib/roster.mjs';

const base = process.env.BASE || 'http://localhost:4321/learning-sglang';
const book = process.env.BOOK || 'sglang';
const bookPrefix = book === 'sglang' ? '' : `/${book}`;
const only = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const stepWait = Number(process.env.WAIT) || 3500;   // let within-step phases settle so all stage text is present
const shotDir = process.argv[2];
if (shotDir) mkdirSync(shotDir, { recursive: true });

// The roster, read from the built site's sidebar so this script does not duplicate chapters.ts.
const browser = await launch({ port: 9300 + Math.floor(Math.random() * 500) });
const page = await browser.tab();
const firstChapter = roster.find((chapter) => chapter.book === book && chapter.ready);
if (!firstChapter) throw new Error(`no ready ${book} chapter`);
await page.goto(`${base}${bookPrefix}/ch/${firstChapter.slug}/`);
const slugs = await page.evaluate(`[...document.querySelectorAll('.sidebar li a')].map(a => a.getAttribute('href').split('/ch/')[1].replace(/\\/$/, ''))`);
const targets = slugs.filter((slug) => {
  const n = roster.find((chapter) => chapter.book === book && chapter.slug === slug)?.n;
  return !only.length || only.includes(String(n)) || only.includes(String(n).padStart(2, '0'));
});

let failures = 0;
for (const slug of targets) {
  const url = `${base}${bookPrefix}/ch/${slug}/`;
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', 'zh')`);
  await page.goto(url);
  await sleep(900);   // hydration + syncLang

  const total = await page.evaluate(`document.querySelectorAll('.seg').length`);
  const problems = [];
  for (let i = 0; i < total; i++) {
    if (i > 0) await page.press('ArrowRight');
    await sleep(stepWait);
    const r = await page.evaluate(`(() => {
      const box = document.querySelector('.caption');
      const span = box?.querySelector('span');
      if (!span) return { text: '(no caption)', cjk: false, clipped: true };
      const text = span.innerText;
      return { text, cjk: /[\\u4e00-\\u9fff]/.test(text), clipped: span.getBoundingClientRect().height > box.clientHeight + 1 };
    })()`);
    if (!r.cjk) problems.push(`step ${i + 1}: no Chinese caption: ${r.text.slice(0, 60)}`);
    if (r.clipped) problems.push(`step ${i + 1}: caption clipped (>3 lines): ${r.text.slice(0, 60)}`);
    // stage text layout, same measurement as transcript.mjs: text past the SVG edge or covering other text
    const stage = await page.evaluate(`(() => {
      const norm = (s) => s.replace(/\\s+/g, ' ').trim();
      const root = document.querySelector('.canvas') ?? document.querySelector('.viz');
      const svg = root?.querySelector('svg');
      const vb = svg?.viewBox?.baseVal;
      if (!vb?.width) return { clipped: [], overlaps: [] };
      const shown = (el) => {
        for (let e = el, o = 1; e && e !== svg; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          o *= Number(cs.opacity); if (o < 0.05) return false;
        }
        return true;
      };
      const texts = [...svg.querySelectorAll('text')].filter((t) => !t.closest('foreignObject') && norm(t.textContent) && shown(t));
      const ctm = svg.getScreenCTM();
      const left = ctm.e + vb.x * ctm.a, right = ctm.e + (vb.x + vb.width) * ctm.a;
      const clipped = [], overlaps = [];
      const boxes = texts.map((t) => ({ t, r: t.getBoundingClientRect() }));
      for (const { t, r } of boxes) if (r.width && (r.right > right - 2 * ctm.a || r.left < left)) clipped.push(norm(t.textContent));
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r, b = boxes[j].r;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1 && h > 1) overlaps.push(norm(boxes[i].t.textContent).slice(0, 40) + ' × ' + norm(boxes[j].t.textContent).slice(0, 40));
      }
      return { clipped, overlaps };
    })()`);
    for (const c of stage.clipped) problems.push(`step ${i + 1}: stage text clipped: ${c.slice(0, 50)}`);
    for (const o of stage.overlaps) problems.push(`step ${i + 1}: stage text overlap: ${o}`);
  }
  const prose = await page.evaluate(`(() => {
    const en = document.querySelector('details.i18n-en'), zh = document.querySelector('details.i18n-zh');
    const hidden = (el) => !el || getComputedStyle(el).display === 'none';
    return { enHidden: hidden(en), zhShown: !hidden(zh), zhHasText: (zh?.textContent.length ?? 0) > 50 };
  })()`);
  if (!prose.enHidden) problems.push('English prose not hidden in zh mode');
  if (!prose.zhShown || !prose.zhHasText) problems.push('Chinese prose missing or empty');

  // toggle back to English: the caption must lose its Chinese and the prose pair must flip
  await page.evaluate(`document.querySelector('.lang-toggle').click()`);
  await sleep(200);
  const back = await page.evaluate(`(() => {
    const span = document.querySelector('.caption span');
    const en = document.querySelector('details.i18n-en');
    return { lang: document.documentElement.dataset.lang, cjk: /[\\u4e00-\\u9fff]/.test(span?.innerText ?? ''),
      enShown: !!en && getComputedStyle(en).display !== 'none' };
  })()`);
  if (back.lang !== 'en' || back.cjk || !back.enShown) problems.push('toggle back to English failed');
  await page.evaluate(`document.querySelector('.lang-toggle').click()`);   // leave it zh for the screenshot
  await sleep(200);

  if (problems.length) { failures += problems.length; console.log(`FAIL ${slug}\n  ${problems.join('\n  ')}`); }
  else console.log(`ok   ${slug} (${total} steps)`);
  if (shotDir) writeFileSync(join(shotDir, `${slug}-zh.png`), await page.screenshot());
}
if (shotDir) {
  await page.goto(`${base}/`);
  await sleep(900);
  writeFileSync(join(shotDir, 'home-zh.png'), await page.screenshot());
}
browser.close();
console.log(failures ? `${failures} problem(s)` : 'all clear');
process.exit(failures ? 1 : 0);
