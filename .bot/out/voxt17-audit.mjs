// Voxt 17 (rewrite-and-translate) animation matrix audit.
// Needs the dev server on 4321. Run: node .bot/out/voxt17-audit.mjs
// Matrix: 6 steps x {en-desktop, zh-desktop, zh-390} x direct entry, plus
// zh-desktop previous-step entry; two mechanism states per combo (mid-lap and
// final phase). Checks identity (counter, data-animation-step/phase), phase
// progression, >=10 CSS px desktop fonts, no text overlap, no SVG text overflow.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4321/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/voxt17-audit';
const chapter = `${base}/voxt/ch/rewrite-and-translate/`;
const STEPS = [1, 2, 3, 4, 5, 6];
const T1 = 2000; // mid-lap: phase >= 1
const T2 = 6200; // final phase of lap 1 (counts 5-6: final from 3.6-4.5 s, rest until 6.7-7.6 s)
const views = [
  { name: 'en-desktop', lang: 'en', width: 1440, height: 900, mobile: false, gateFont: true },
  { name: 'zh-desktop', lang: 'zh', width: 1440, height: 900, mobile: false, gateFont: true },
  { name: 'zh-390', lang: 'zh', width: 390, height: 844, mobile: true, gateFont: false },
];
const failures = [];
const rows = [];
mkdirSync(out, { recursive: true });

const readState = `(() => {
  const root = document.querySelector('.viz');
  const svg = root?.querySelector('svg');
  if (!root || !svg) return { missing: true };
  const texts = [...svg.querySelectorAll('text')].filter((el) => {
    if (!el.textContent.trim()) return false;
    for (let node = el; node && node !== svg; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  });
  const sizes = texts.filter((el) => !/^(loops|循环)$/.test(el.textContent.trim())).map((el) => {
    const ctm = el.getScreenCTM();
    return ctm ? parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d) : 0;
  });
  const boxes = texts.map((el) => ({ el, rect: el.getBoundingClientRect() }));
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i].rect, b = boxes[j].rect;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
      overlaps.push([boxes[i].el.textContent.trim().slice(0, 30), boxes[j].el.textContent.trim().slice(0, 30)]);
  }
  const svgRect = svg.getBoundingClientRect();
  const overflow = boxes.filter(({ rect }) => rect.left < svgRect.left - 1 || rect.right > svgRect.right + 1)
    .map(({ el }) => el.textContent.trim().slice(0, 40));
  return {
    step: root.getAttribute('data-animation-step'),
    phase: root.getAttribute('data-animation-phase'),
    finalPhase: root.getAttribute('data-animation-final-phase'),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    lang: document.documentElement.dataset.lang,
    minFont: sizes.length ? Math.round(Math.min(...sizes) * 1000) / 1000 : null,
    overlaps, overflow,
  };
})()`;

const browser = await launch({ width: 1440, height: 900 });
const keepAlive = setInterval(() => {}, 1000);
try {
  for (const s of STEPS) {
    for (const view of views) {
      for (const entry of view.name === 'zh-desktop' && s > 1 ? ['direct', 'previous'] : ['direct']) {
        const name = `${view.name}-${entry}-s${s}`;
        const page = await browser.tab({ width: view.width, height: view.height, mobile: view.mobile });
        await page.goto(chapter);
        await page.evaluate(`localStorage.setItem('lang', '${view.lang}')`);
        if (entry === 'direct') {
          await page.goto(`${chapter}?step=${s}`);
        } else {
          await page.goto(`${chapter}?step=${s - 1}`);
          await sleep(1200);
          await page.press('ArrowRight');
        }
        const states = [];
        for (const [idx, wait] of [T1, T2 - T1].entries()) {
          await sleep(wait);
          const st = await page.evaluate(readState);
          st.clock = idx === 0 ? T1 : T2;
          states.push(st);
          const png = join(out, `${name}-p${idx + 1}.png`);
          writeFileSync(png, await page.screenshot());
        }
        await page.close();
        for (const st of states) {
          const tag = `${name}@${st.clock}`;
          if (st.missing) { failures.push(`${tag}: viz missing`); continue; }
          if (Number(st.step) !== s - 1) failures.push(`${tag}: step attr ${st.step} != ${s - 1}`);
          if (!st.counter?.startsWith(`0${s} /`)) failures.push(`${tag}: counter "${st.counter}"`);
          if (st.lang !== view.lang) failures.push(`${tag}: lang ${st.lang}`);
          if (view.gateFont && st.minFont !== null && st.minFont < 10) failures.push(`${tag}: minFont ${st.minFont}`);
          if (st.overlaps.length) failures.push(`${tag}: overlaps ${JSON.stringify(st.overlaps.slice(0, 3))}`);
          if (st.overflow.length) failures.push(`${tag}: overflow ${JSON.stringify(st.overflow.slice(0, 3))}`);
        }
        const [a, b] = states;
        if (!a.missing && !b.missing) {
          if (Number(a.phase) < 1) failures.push(`${name}: phase not started at ${T1}ms (${a.phase})`);
          if (b.phase !== b.finalPhase) failures.push(`${name}: not final phase at ${T2}ms (${b.phase}/${b.finalPhase})`);
          rows.push({ name, phase1: a.phase, phase2: b.phase, minFont: Math.min(a.minFont ?? 99, b.minFont ?? 99) });
        }
      }
    }
  }
} finally {
  clearInterval(keepAlive);
  await browser.close();
}
writeFileSync(join(out, 'report.json'), JSON.stringify({ rows, failures }, null, 2));
console.log(`states: ${rows.length * 2}, failures: ${failures.length}`);
for (const f of failures) console.log(`FAIL ${f}`);
console.log(`min desktop font: ${Math.min(...rows.filter((r) => !r.name.includes('390')).map((r) => r.minFont))}`);
