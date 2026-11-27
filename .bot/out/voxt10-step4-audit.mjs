// Voxt 10 Step 4 (1-based) animation audit: the RAF playhead and the quiet-window
// highlight now live on the same step as the waveform (step index 3).
// Start the dev server on 4488, then run `node .bot/out/voxt10-step4-audit.mjs`.
// Optional: BASE=http://localhost:4488/learning-sglang OUT=.bot/out/voxt10-step4-audit
// Checks: identity (hydration, counter 04 / 11, viewBox, lang), playhead present and
// advancing, quiet highlight appearing while the playhead crosses 2.90-3.35 s,
// loops label present, step 3 free of the playhead, >=10 CSS px desktop fonts,
// no text overlap, no SVG text overflow. Saves PNG evidence at three clock points.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4488/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/voxt10-step4-audit';
const url = `${base}/voxt/ch/file-transcription/?step=4`;
const views = [
  { name: 'en-desktop', lang: 'en', width: 1440, height: 900, mobile: false, vb: '0 0 720' },
  { name: 'zh-desktop', lang: 'zh', width: 1440, height: 900, mobile: false, vb: '0 0 720' },
  { name: 'en-390', lang: 'en', width: 390, height: 844, mobile: true, vb: '0 0 300' },
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
  const play = [...svg.querySelectorAll('line')].find((el) => el.getAttribute('stroke') === 'var(--fg)');
  const highlight = [...svg.querySelectorAll('rect')].find((el) => el.getAttribute('stroke') === 'var(--fg)');
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
    playX: play ? Number(play.getAttribute('x1')) : null,
    highlight: Boolean(highlight),
    loops: texts.some((el) => /loops|循环/.test(el.textContent)),
    minFont: smallest ? Math.round(smallest.size * 1000) / 1000 : null,
    minFontText: smallest?.text,
    overlaps, overflow,
  };
})()`;

try {
  for (const view of views) {
    const dir = join(out, view.name);
    mkdirSync(dir, { recursive: true });
    const page = await browser.tab({ width: view.width, height: view.height, mobile: view.mobile });

    // Step 3 must be free of the playhead: the clock moved to the waveform's step.
    await page.goto(`${base}/voxt/ch/file-transcription/?step=3`);
    await sleep(2500);
    const s3 = await page.evaluate(readState);
    if (s3.playX !== null) failures.push(`${view.name}: playhead still on step 3 (x=${s3.playX})`);
    if (s3.loops) failures.push(`${view.name}: loops label still on step 3`);
    if (s3.counter !== '03 / 11') failures.push(`${view.name}: step-3 counter ${s3.counter}`);

    await page.evaluate(`localStorage.setItem('lang', '${view.lang}')`);
    await page.goto(url);
    await sleep(1000);
    const setup = await page.evaluate(readState);
    if (setup.counter !== '04 / 11') failures.push(`${view.name}: counter ${setup.counter}`);
    if (setup.lang !== view.lang) failures.push(`${view.name}: html lang ${setup.lang}`);
    if (!setup.viewBox?.startsWith(view.vb)) failures.push(`${view.name}: viewBox ${setup.viewBox}`);
    if (setup.playX === null) failures.push(`${view.name}: no playhead on step 4`);
    if (!setup.loops) failures.push(`${view.name}: no loops label on step 4`);

    // Sample across more than one lap: playhead must advance, and the quiet
    // highlight must appear while the playhead crosses the 450 ms quiet window.
    const samples = [];
    let sawHighlight = false;
    let shotEarly = false, shotQuiet = false, shotLate = false;
    const span = view.mobile ? 256 : 636;
    const origin = view.mobile ? 20 : 40;
    for (let i = 0; i < 40; i++) {
      await sleep(220);
      const s = await page.evaluate(readState);
      samples.push(s);
      const clock = s.playX === null ? null : (s.playX - origin) / span * 8000;
      if (s.highlight) {
        sawHighlight = true;
        if (clock !== null && (clock < 2800 || clock > 3450)) failures.push(`${view.name}: highlight outside quiet window, clock ${Math.round(clock)}`);
        if (!shotQuiet) {
          shotQuiet = true;
          writeFileSync(join(dir, 'quiet.png'), await page.screenshot(await page.evaluate(`(() => { const r = document.querySelector('.viz').getBoundingClientRect(); return { x: Math.max(r.left, 0), y: Math.max(r.top, 0), width: r.width, height: r.height, scale: 2 }; })()`)));
          states.push({ view: view.name, point: 'quiet', ...s });
        }
      }
      if (!shotEarly && clock !== null && clock > 400 && clock < 2000) {
        shotEarly = true;
        writeFileSync(join(dir, 'early.png'), await page.screenshot(await page.evaluate(`(() => { const r = document.querySelector('.viz').getBoundingClientRect(); return { x: Math.max(r.left, 0), y: Math.max(r.top, 0), width: r.width, height: r.height, scale: 2 }; })()`)));
        states.push({ view: view.name, point: 'early', ...s });
      }
      if (!shotLate && clock !== null && clock > 6500) {
        shotLate = true;
        writeFileSync(join(dir, 'late.png'), await page.screenshot(await page.evaluate(`(() => { const r = document.querySelector('.viz').getBoundingClientRect(); return { x: Math.max(r.left, 0), y: Math.max(r.top, 0), width: r.width, height: r.height, scale: 2 }; })()`)));
        states.push({ view: view.name, point: 'late', ...s });
      }
    }
    const xs = samples.map((s) => s.playX).filter((x) => x !== null);
    if (xs.length < samples.length) failures.push(`${view.name}: playhead missing in ${samples.length - xs.length} samples`);
    if (new Set(xs.map((x) => Math.round(x))).size < 8) failures.push(`${view.name}: playhead not advancing (${xs.slice(0, 6)})`);
    if (!sawHighlight) failures.push(`${view.name}: quiet highlight never appeared in ${samples.length} samples`);
    if (!shotEarly || !shotQuiet || !shotLate) failures.push(`${view.name}: missing evidence shot early=${shotEarly} quiet=${shotQuiet} late=${shotLate}`);
    for (const s of samples) {
      if (!view.mobile && s.minFont !== null && s.minFont < 10) failures.push(`${view.name}: minFont ${s.minFont} (${s.minFontText})`);
      if (s.overlaps.length) failures.push(`${view.name}: text overlaps ${JSON.stringify(s.overlaps)}`);
      if (s.overflow.length) failures.push(`${view.name}: svg overflow ${JSON.stringify(s.overflow)}`);
    }
    const clocks = xs.map((x) => Math.round((x - origin) / span * 8000));
    console.log(JSON.stringify({ view: view.name, samples: samples.length, sawHighlight, clocks: clocks.slice(0, 10) }));
    await page.close();
  }
} finally {
  clearInterval(keepAlive);
  browser.close();
}

writeFileSync(join(out, 'report.json'), JSON.stringify({ failures, states }, null, 2));
console.log(failures.length ? `FAILURES:\n${failures.join('\n')}` : 'all clear');
process.exit(failures.length ? 1 : 0);
