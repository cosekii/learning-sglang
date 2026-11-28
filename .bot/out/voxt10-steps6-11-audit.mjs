// Voxt 10 Steps 6–11 (1-based) phase build-up audit.
// Start the dev server, then run `node .bot/out/voxt10-steps6-11-audit.mjs`.
// Optional: BASE=http://localhost:4321/learning-sglang OUT=.bot/out/voxt10-steps6-11-audit
// Checks per view: identity (counter, lang, viewBox, data-animation-*), phase advances
// 0→final within one lap, visible text grows monotonically with the phase, loops label,
// >=10 CSS px desktop fonts, no text overlap, no SVG text overflow, no page overflow.
// Saves a final-phase PNG per view and step.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4321/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/voxt10-steps6-11-audit';
const chapter = `${base}/voxt/ch/file-transcription/`;
const steps = [
  { n: 6, phases: 4 },
  { n: 7, phases: 5 },
  { n: 8, phases: 5 },
  { n: 9, phases: 3 },
  { n: 10, phases: 3 },
  { n: 11, phases: 4 },
];
const views = [
  { name: 'en-desktop', lang: 'en', width: 1440, height: 900, mobile: false, vb: '0 0 720' },
  { name: 'zh-desktop', lang: 'zh', width: 1440, height: 900, mobile: false, vb: '0 0 720' },
  { name: 'zh-390', lang: 'zh', width: 390, height: 844, mobile: true, vb: '0 0 300' },
];
const failures = [];
const states = [];
mkdirSync(out, { recursive: true });

const browser = await launch({ width: 1440, height: 900 });
const keepAlive = setInterval(() => {}, 1000);
const readState = `(() => {
  const root = document.querySelector('.viz');
  const svg = root?.querySelector('svg');
  if (!root || !svg) return { missing: true };
  const opacity = (el) => {
    let value = 1;
    for (let node = el; node && node !== svg; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return 0;
      value *= Number(style.opacity);
    }
    return value;
  };
  const texts = [...svg.querySelectorAll('text')].filter((el) => el.textContent.trim() && opacity(el) >= 0.05);
  const sizes = texts.map((el) => {
    const ctm = el.getScreenCTM();
    return ctm ? { size: parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d), text: el.textContent.trim().replace(/\\s+/g, ' ') } : null;
  }).filter(Boolean);
  const smallest = sizes.sort((a, b) => a.size - b.size)[0];
  const boxes = texts.map((el) => ({ el, rect: el.getBoundingClientRect() }));
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i].rect, b = boxes[j].rect;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
      overlaps.push([boxes[i].el.textContent.trim(), boxes[j].el.textContent.trim()]);
  }
  const svgRect = svg.getBoundingClientRect();
  const overflow = boxes.filter(({ rect }) => rect.left < svgRect.left - 1 || rect.right > svgRect.right + 1)
    .map(({ el }) => el.textContent.trim());
  return {
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    lang: document.documentElement.dataset.lang,
    viewBox: svg.getAttribute('viewBox'),
    animStep: root.dataset.animationStep ?? null,
    phase: root.dataset.animationPhase ?? null,
    finalPhase: root.dataset.animationFinalPhase ?? null,
    textCount: texts.length,
    loops: texts.some((el) => /loops|循环/.test(el.textContent)),
    minFont: smallest ? Math.round(smallest.size * 1000) / 1000 : null,
    minFontText: smallest?.text,
    overlaps, overflow,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

try {
  for (const view of views) {
    const page = await browser.tab({ width: view.width, height: view.height, mobile: view.mobile });
    await page.goto(chapter);
    await page.evaluate(`localStorage.setItem('lang', '${view.lang}')`);
    for (const { n, phases } of steps) {
      const tag = `${view.name}-s${n}`;
      await page.goto(`${chapter}?step=${n}`);
      await sleep(350);
      const early = await page.evaluate(readState);
      if (early.missing) { failures.push(`${tag}: no .viz`); continue; }
      if (early.counter !== `${String(n).padStart(2, '0')} / 11`) failures.push(`${tag}: counter ${early.counter}`);
      if (early.lang !== view.lang) failures.push(`${tag}: html lang ${early.lang}`);
      if (!early.viewBox?.startsWith(view.vb)) failures.push(`${tag}: viewBox ${early.viewBox}`);
      if (early.animStep !== String(n - 1)) failures.push(`${tag}: data-animation-step ${early.animStep}`);
      if (early.finalPhase !== String(phases - 1)) failures.push(`${tag}: data-animation-final-phase ${early.finalPhase}`);
      if (!early.loops) failures.push(`${tag}: no loops label`);

      // Mid-lap: phase must have advanced but text must not be complete yet.
      await sleep(900);
      const mid = await page.evaluate(readState);
      if (mid.phase === null || Number(mid.phase) < 1) failures.push(`${tag}: phase did not advance (${mid.phase})`);
      if (mid.textCount < early.textCount) failures.push(`${tag}: text shrank ${early.textCount}→${mid.textCount}`);

      // End of the lap: final phase reached, every gated object visible.
      await sleep(phases * 900 + 800);
      const late = await page.evaluate(readState);
      if (late.phase !== String(phases - 1)) failures.push(`${tag}: final phase ${late.phase}, want ${phases - 1}`);
      if (late.textCount <= early.textCount) failures.push(`${tag}: no build-up ${early.textCount}→${late.textCount}`);
      for (const [label, s] of [['early', early], ['mid', mid], ['late', late]]) {
        if (!view.mobile && s.minFont !== null && s.minFont < 10) failures.push(`${tag} ${label}: minFont ${s.minFont} (${s.minFontText})`);
        if (s.overlaps.length) failures.push(`${tag} ${label}: overlaps ${JSON.stringify(s.overlaps)}`);
        if (s.overflow.length) failures.push(`${tag} ${label}: svg overflow ${JSON.stringify(s.overflow)}`);
        if (s.pageOverflow > 0) failures.push(`${tag} ${label}: page overflow ${s.pageOverflow}`);
      }
      const dir = join(out, view.name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `s${n}-final.png`), await page.screenshot(await page.evaluate(`(() => { const r = document.querySelector('.viz').getBoundingClientRect(); return { x: Math.max(r.left, 0), y: Math.max(r.top, 0), width: r.width, height: r.height, scale: 2 }; })()`)));
      states.push({ view: view.name, step: n, early: early.textCount, mid: mid.textCount, late: late.textCount, finalPhase: late.phase, minFont: late.minFont });
      console.log(JSON.stringify(states[states.length - 1]));
    }
    await page.close();
  }
} finally {
  clearInterval(keepAlive);
  browser.close();
}

writeFileSync(join(out, 'report.json'), JSON.stringify({ failures, states }, null, 2));
console.log(failures.length ? `FAILURES:\n${failures.join('\n')}` : 'all clear');
process.exit(failures.length ? 1 : 0);
