// Check every page at phone widths: the home page and every step of every ready chapter, each at 360, 390 and 430 px wide.
// It flags, on stdout:
//   overflow   the page scrolls sideways (document wider than the viewport), with the widest elements that cause it
//   caption    the caption's text is cut off (taller than its box)
//   controls   a step-control button or link runs past the viewport's edge
//   font       visible SVG text renders below MIN_FONT CSS px
// Layout breaks always gate a commit. Small fonts are an audit in full runs and gate only a selected step.
//
// usage: node scripts/mobile.mjs [baseUrl]        (default http://localhost:4321/learning-sglang)
//   WIDTHS=360,390,430   phone widths to check (CSS px, 844 tall)
//   ONLY=13              one chapter by number
//   ONLY=13 STEP=5       gate one step's layout and rendered SVG font sizes
//   LANG=zh              check the Chinese layer (default: en)
//   MIN_FONT=10          rendered font-size floor in CSS px
//   WAIT=ms              settle time per step (default 900; layout does not wait on the within-step animations)
// Needs a dev or preview server on baseUrl and Node 22+; finds Chrome itself (see lib/browser.mjs).
import { readFileSync } from 'node:fs';
import { launch, sleep } from './lib/browser.mjs';

const base = (process.argv[2] ?? 'http://localhost:4321/learning-sglang').replace(/\/$/, '');
const widths = (process.env.WIDTHS ?? '360,390,430').split(',').map(Number);
const only = process.env.ONLY ? Number(process.env.ONLY) : null;
const onlyStep = process.env.STEP ? Number(process.env.STEP) : null;
const minFont = Number(process.env.MIN_FONT ?? 10);
const lang = process.env.LANG === 'zh' ? 'zh' : 'en';
const waitMs = Number(process.env.WAIT) || 900;
if (onlyStep !== null && (only === null || !Number.isInteger(onlyStep) || onlyStep < 1)) {
  console.error('STEP must be a positive integer and requires ONLY');
  process.exit(1);
}

const roster = readFileSync('src/chapters.ts', 'utf8');
const chapters = [...roster.matchAll(/slug:\s*'([^']+)',[\s\S]*?ready:\s*(true|false)/g)]
  .map((m, i) => ({ n: i + 1, slug: m[1], ready: m[2] === 'true' }))
  .filter((c) => c.ready && (only === null || c.n === only));

// Runs in the page. Returns the step counter and every layout break it can see.
const CHECK = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
  if (document.documentElement.scrollWidth > vw + 1) {
    // the outermost elements that stick out past the right edge (SVG internals are clipped by their <svg>, so skip them)
    const wide = [...document.querySelectorAll('body *')].filter((el) => !el.closest('svg') || el.tagName === 'svg')
      .filter((el) => el.getBoundingClientRect().right > vw + 1)
      .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= vw + 1);
    out.push('overflow: page is ' + document.documentElement.scrollWidth + 'px wide in a ' + vw + 'px viewport · ' + wide.slice(0, 4).map(name).join(', '));
  }
  const cap = document.querySelector('.caption'); const span = cap?.querySelector('span');
  if (cap && span && span.getBoundingClientRect().height > cap.getBoundingClientRect().height + 1) out.push('caption: text is clipped by its box');
  for (const el of document.querySelectorAll('.controls button, .controls a')) {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > vw + 1 || r.left < -1)) out.push('controls: ' + name(el) + ' runs past the edge');
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let node = el; node instanceof SVGElement; node = node.parentElement) {
      const s = getComputedStyle(node);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  const small = [];
  for (const el of document.querySelectorAll('.viz svg text, .canvas svg text')) {
    if (!visible(el) || !el.textContent.trim()) continue;
    const ctm = el.getScreenCTM();
    if (!ctm) continue;
    const size = parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d);
    if (size + 0.05 < ${minFont}) small.push({ size: Math.round(size * 100) / 100, text: el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60) });
  }
  const m = (document.querySelector('.counter')?.textContent ?? '').match(/(\\d+)\\s*\\/\\s*(\\d+)/);
  return { step: m ? +m[1] : 0, total: m ? +m[2] : 0, out, small };
})()`;

const browser = await launch({ port: 9335 });
let flagged = 0;
let fontAudits = 0;
for (const w of widths) {
  const page = await browser.tab({ width: w, height: 844, mobile: true });
  const open = async (url) => {
    await page.goto(url);
    if (lang === 'zh') {
      await page.evaluate(`localStorage.setItem('lang', 'zh')`);
      await page.goto(url);
    }
    await sleep(waitMs);
  };
  if (only === null) {
    await open(`${base}/`);
    const r = await page.evaluate(CHECK);
    for (const o of r.out) { console.log(`${w}px · home · ${o}`); flagged++; }
  }
  for (const ch of chapters) {
    const hits = [];
    const fontNotes = [];
    for (let n = onlyStep ?? 1, total = onlyStep ?? 1; n <= total; n++) {
      await open(`${base}/ch/${ch.slug}/?step=${n}`);
      const r = await page.evaluate(CHECK);
      if (onlyStep === null) total = r.total || 1;
      for (const o of r.out) hits.push(`step ${n} · ${o}`);
      if (r.small.length) {
        fontAudits++;
        r.small.sort((a, b) => a.size - b.size);
        const examples = r.small.slice(0, 3).map((t) => `${t.size}px “${t.text}”`).join(', ');
        const note = `step ${n} · font: ${r.small.length} text(s) below ${minFont}px · ${examples}`;
        if (onlyStep === null) fontNotes.push(note);
        else hits.push(note);
      }
    }
    for (const h of hits) console.log(`${w}px · ${ch.slug} · ${h}`);
    if (only !== null) for (const note of fontNotes) console.log(`${w}px · ${ch.slug} · FONT AUDIT · ${note}`);
    flagged += hits.length;
  }
  await page.close();
}
const audit = onlyStep === null && fontAudits ? ` · ${fontAudits} step view(s) with SVG text below ${minFont}px (audit only)` : '';
console.log((flagged ? `${flagged} phone check failure(s)` : `no layout breaks at ${widths.join(', ')} px`) + audit);
browser.close();
process.exit(flagged ? 1 : 0);
