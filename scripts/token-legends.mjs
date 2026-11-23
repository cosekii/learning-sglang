// Check the Chinese token diagrams in chapter 1 for matching swatches and adjacent labels.
// This covers EVAL.md #5's mechanical part only; cold-reads still check one meaning per colour.
// usage: STEP=5 npm run token-legends
//        STEP=5 WIDTHS=1440,390,360 npm run token-legends
import { launch, sleep } from './lib/browser.mjs';

const step = Number(process.env.STEP);
if (!Number.isInteger(step) || step < 1 || step > 12) {
  console.error('usage: STEP=1..12 npm run token-legends');
  process.exit(1);
}
const widths = (process.env.WIDTHS ?? '1440,390,360').split(',').map(Number);
const waitMs = Number(process.env.WAIT) || 1400;
const base = 'http://localhost:4321/learning-sglang/ch/01-inference/';
const browser = await launch({ port: 9337 });
let flagged = 0;

const CHECK = `(() => {
  const svg = document.querySelector('.viz svg');
  if (!svg) return { out: ['missing visualization SVG'], categories: [] };
  const actualStep = Number(document.querySelector('.counter')?.textContent.match(/(\\d+)\\s*\\/\\s*12/)?.[1]);
  const chineseCaption = /[\\u3400-\\u9fff]/.test(document.querySelector('.caption')?.textContent ?? '');
  if (actualStep !== ${step} || !chineseCaption) {
    return { out: ['wrong page state: expected Chinese step ${step}, got step ' + actualStep], categories: [] };
  }
  const svgRect = svg.getBoundingClientRect();
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.left < svgRect.left - 1 || r.right > svgRect.right + 1 || r.top < svgRect.top - 1 || r.bottom > svgRect.bottom + 1) return false;
    for (let node = el; node instanceof SVGElement; node = node.parentElement) {
      const s = getComputedStyle(node);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  const palette = new Set(['var(--accent-soft)', 'var(--gen-soft)', 'var(--eos-soft)']);
  const boxes = (el) => ({ box: el.getBBox(), fill: getComputedStyle(el).fill, stroke: getComputedStyle(el).stroke });
  const rects = [...svg.querySelectorAll('rect')].filter(visible).map((el) => ({ el, ...boxes(el) }));
  const texts = [...svg.querySelectorAll('text')].filter(visible).map((el) => ({ el, box: el.getBBox() }));
  const tokens = rects.filter((r) => palette.has(r.el.getAttribute('fill')) && r.box.width >= 20 && r.box.height >= 20);
  const swatches = rects.filter((r) => r.box.width >= 6 && r.box.width <= 20 && r.box.height >= 6 && r.box.height <= 20);
  const kinds = [...new Set(tokens.map((r) => r.el.getAttribute('fill')))];
  const categories = [];
  const out = [];
  if (kinds.length < 2) return { out, categories };
  for (const kind of kinds) {
    const samples = tokens.filter((r) => r.el.getAttribute('fill') === kind);
    const sample = samples[0];
    const swatch = swatches.find((r) => r.el.getAttribute('fill') === kind && r.fill === sample.fill && r.stroke === sample.stroke);
    const label = swatch && texts.find((t) => {
      const text = t.el.textContent.trim();
      const gap = t.box.x - (swatch.box.x + swatch.box.width);
      const dy = Math.abs((t.box.y + t.box.height / 2) - (swatch.box.y + swatch.box.height / 2));
      return text && gap >= -1 && gap <= 24 && dy <= 12;
    });
    const name = ({ 'var(--accent-soft)': 'input', 'var(--gen-soft)': 'generated', 'var(--eos-soft)': 'EOS' })[kind] ?? kind;
    categories.push({ name, count: samples.length, label: label?.el.textContent.trim() ?? null });
    if (!swatch) out.push(name + ': missing matching colour swatch');
    else if (!label) out.push(name + ': swatch has no adjacent non-empty label');
  }
  return { out, categories };
})()`;

for (const width of widths) {
  const mobile = width < 900;
  const page = await browser.tab({ width, height: mobile ? 844 : 900, mobile });
  await page.goto(`${base}?step=${step}`);
  await page.evaluate(`localStorage.setItem('lang', 'zh')`);
  await page.goto(`${base}?step=${step}`);
  await sleep(waitMs);
  const result = await page.evaluate(CHECK);
  for (const problem of result.out) {
    console.log(`FAIL ${width}px · 01-inference step ${step} · ${problem}`);
    flagged++;
  }
  if (!result.out.length) {
    const summary = result.categories.length
      ? result.categories.map((c) => `${c.name}=${c.label}`).join(', ')
      : 'fewer than two token colours';
    console.log(`ok   ${width}px · 01-inference step ${step} · ${summary}`);
  }
  await page.close();
}
browser.close();
console.log(flagged ? `${flagged} token legend problem(s)` : 'token legends clear');
process.exit(flagged ? 1 : 0);
