// Voxt 11 Step 3 per-phase mechanism audit.
// Start the dev server on 4471, then run `node .bot/out/voxt11-step3-audit.mjs`.
// Optional: BASE=http://localhost:4471/learning-sglang OUT=.bot/out/voxt11-step3-audit
// Captures en/zh desktop 1440x900 and en/zh 360/390/430 px, one PNG per phase,
// and checks identity (counter, step, phase, viewBoxWidth), per-phase mechanism
// changes (fill width, status line, check ✓, constant cancel marker), focus-stroke
// vs text collisions, text overlap, SVG text overflow, and >=10 CSS px fonts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4471/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/voxt11-step3-audit';
const url = `${base}/voxt/ch/models-and-app-updates/?step=3`;
const views = [
  { name: 'en-desktop', lang: 'en', width: 1440, height: 900, mobile: false, vb: '0 0 720' },
  { name: 'zh-desktop', lang: 'zh', width: 1440, height: 900, mobile: false, vb: '0 0 720' },
  { name: 'en-360', lang: 'en', width: 360, height: 844, mobile: true, vb: '0 0 300' },
  { name: 'zh-360', lang: 'zh', width: 360, height: 844, mobile: true, vb: '0 0 300' },
  { name: 'en-390', lang: 'en', width: 390, height: 844, mobile: true, vb: '0 0 300' },
  { name: 'zh-390', lang: 'zh', width: 390, height: 844, mobile: true, vb: '0 0 300' },
  { name: 'en-430', lang: 'en', width: 430, height: 844, mobile: true, vb: '0 0 300' },
  { name: 'zh-430', lang: 'zh', width: 430, height: 844, mobile: true, vb: '0 0 300' },
];
const PHASES = 4;
const failures = [];
const states = [];
mkdirSync(out, { recursive: true });

const browser = await launch({ width: 1440, height: 900 });
const keepAlive = setInterval(() => {}, 1000);
try {
  for (const view of views) {
    const dir = join(out, view.name);
    mkdirSync(dir, { recursive: true });
    const page = await browser.tab({ width: view.width, height: view.height, mobile: view.mobile });
    await page.goto(url);
    await page.evaluate(`localStorage.setItem('lang', '${view.lang}')`);
    await page.goto(url);
    await sleep(1000);
    const setup = await page.evaluate(`(() => {
      const root = document.querySelector('.viz');
      const svg = root?.querySelector('svg');
      return {
        step: root ? Number(root.getAttribute('data-animation-step')) : null,
        finalPhase: root ? Number(root.getAttribute('data-animation-final-phase')) : null,
        viewBox: svg?.getAttribute('viewBox'),
        counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
        lang: document.documentElement.dataset.lang,
      };
    })()`);
    if (setup.step !== 2 || setup.finalPhase !== PHASES - 1) failures.push(`${view.name}: identity step/finalPhase ${setup.step}/${setup.finalPhase}`);
    if (setup.counter !== '03 / 06') failures.push(`${view.name}: counter ${setup.counter}`);
    if (!setup.viewBox?.startsWith(view.vb)) failures.push(`${view.name}: viewBox ${setup.viewBox}`);
    if (setup.lang !== view.lang) failures.push(`${view.name}: html lang ${setup.lang}`);

    for (let target = 0; target < PHASES; target++) {
      await page.evaluate(`new Promise((resolve, reject) => {
        const root = document.querySelector('.viz');
        let departed = root?.getAttribute('data-animation-phase') !== '${target}';
        const deadline = Date.now() + 30000;
        const check = () => {
          const current = root?.getAttribute('data-animation-phase');
          if (current !== '${target}') departed = true;
          if (departed && root?.getAttribute('data-animation-step') === '2' && current === '${target}') {
            resolve(true);
            return;
          }
          if (Date.now() > deadline) {
            reject(new Error('phase wait timed out'));
            return;
          }
          setTimeout(check, 30);
        };
        check();
      })`);
      await sleep(600);
      const state = await page.evaluate(`(() => {
        const root = document.querySelector('.viz');
        const svg = root.querySelector('svg');
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
        const fill = [...svg.querySelectorAll('rect')].find((el) => el.getAttribute('fill') === 'var(--accent)' && !el.classList.contains('motion-focus'));
        const marker = [...svg.querySelectorAll('line')].find((el) => el.getAttribute('stroke') === 'var(--eos)');
        const focus = svg.querySelector('.motion-focus');
        const sizes = texts.map((el) => {
          const ctm = el.getScreenCTM();
          return ctm ? {
            size: parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d),
            text: el.textContent.trim().replace(/\\s+/g, ' '),
          } : null;
        }).filter(Boolean);
        const smallest = sizes.sort((a, b) => a.size - b.size)[0];
        const boxes = texts.map((el) => ({ el, rect: el.getBoundingClientRect() }));
        const overlaps = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].rect, b = boxes[j].rect;
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) {
            overlaps.push([boxes[i].el.textContent.trim(), boxes[j].el.textContent.trim()]);
          }
        }
        const svgRect = svg.getBoundingClientRect();
        const overflow = boxes.filter(({ rect }) => rect.left < svgRect.left - 1 || rect.right > svgRect.right + 1)
          .map(({ el }) => el.textContent.trim());
        let focusHits = [];
        let focusBox = null;
        if (focus) {
          const f = focus.getBoundingClientRect();
          focusBox = [f.left, f.top, f.right, f.bottom];
          const band = 1.6;
          const bands = [
            { left: f.left - band, right: f.left + band, top: f.top, bottom: f.bottom },
            { left: f.right - band, right: f.right + band, top: f.top, bottom: f.bottom },
            { left: f.left, right: f.right, top: f.top - band, bottom: f.top + band },
            { left: f.left, right: f.right, top: f.bottom - band, bottom: f.bottom + band },
          ];
          focusHits = boxes.filter(({ rect }) => bands.some((b) =>
            Math.min(rect.right, b.right) - Math.max(rect.left, b.left) > 0.5 &&
            Math.min(rect.bottom, b.bottom) - Math.max(rect.top, b.top) > 0.5))
            .map(({ el }) => el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40));
        }
        const rectOf = (el) => {
          const r = el.getBoundingClientRect();
          return [r.left, r.top, r.right, r.bottom];
        };
        return {
          phase: Number(root.getAttribute('data-animation-phase')),
          fillWidth: fill ? Number(fill.getAttribute('width')) : null,
          fillBox: fill ? rectOf(fill) : null,
          focusBox,
          textBoxes: texts.map((el) => ({
            key: el.getAttribute('x') + '|' + el.getAttribute('y'),
            text: el.textContent.trim().replace(/\\s+/g, ' '),
            box: rectOf(el),
          })),
          markerPresent: Boolean(marker),
          status: texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' '))
            .filter((s) => /cancel|next start|resumed|checks|取消|接着|满格|校验/i.test(s)),
          gbLine: texts.map((el) => el.textContent.trim()).find((s) => s.includes('GB')),
          minFont: Math.round(smallest.size * 1000) / 1000,
          minFontText: smallest.text,
          overlaps,
          overflow,
          focusHits,
          textCount: texts.length,
        };
      })()`);
      if (state.phase !== target) failures.push(`${view.name} p${target}: phase attr ${state.phase}`);
      const clip = await page.evaluate(`(() => {
        const r = document.querySelector('.viz').getBoundingClientRect();
        return { x: Math.max(r.left, 0), y: Math.max(r.top, 0), width: r.width, height: r.height, scale: 2 };
      })()`);
      writeFileSync(join(dir, `p${target}.png`), await page.screenshot(clip));
      states.push({ view: view.name, phase: target, ...state });
      console.log(JSON.stringify({ view: view.name, phase: target, ...state, overlaps: state.overlaps.length, overflow: state.overflow.length }));
    }
    await page.close();
  }
} finally {
  clearInterval(keepAlive);
  browser.close();
}

for (const view of views) {
  const rows = states.filter((s) => s.view === view.name);
  const fills = rows.map((r) => r.fillWidth);
  const [f0, f1, f2, f3] = fills;
  if (!(f0 < f1 && f1 < f2 && f2 === f3)) failures.push(`${view.name}: fill widths not resume-shaped ${fills}`);
  if (!rows.every((r) => r.markerPresent)) failures.push(`${view.name}: cancel marker missing in some phase`);
  const statuses = rows.map((r) => r.status.join(' | '));
  if (new Set(statuses).size !== 4) failures.push(`${view.name}: status line not distinct per phase ${JSON.stringify(statuses)}`);
  if (!/GB ✓/.test(rows[3].gbLine || '')) failures.push(`${view.name}: check ✓ missing at p3 (${rows[3].gbLine})`);
  if (/✓/.test(rows[0].gbLine || '') || /✓/.test(rows[1].gbLine || '') || /✓/.test(rows[2].gbLine || '')) failures.push(`${view.name}: ✓ too early`);
  for (const row of rows) {
    if (row.minFont < 10) failures.push(`${view.name} p${row.phase}: minFont ${row.minFont} (${row.minFontText})`);
    if (row.overlaps.length) failures.push(`${view.name} p${row.phase}: text overlaps ${JSON.stringify(row.overlaps)}`);
    if (row.overflow.length) failures.push(`${view.name} p${row.phase}: svg overflow ${JSON.stringify(row.overflow)}`);
    if (row.focusHits.length) failures.push(`${view.name} p${row.phase}: focus stroke crosses text ${JSON.stringify(row.focusHits)}`);
  }
  const inside = (box, f) => f && box && box[0] >= f[0] - 1 && box[1] >= f[1] - 1 && box[2] <= f[2] + 1 && box[3] <= f[3] + 1;
  // Containment: every element a transition changes must sit inside that phase's focus rect.
  // Phase 0 has no incoming transition, so its frame must hold the objects the next transition changes.
  const transitions = rows.map((row, p) => (p === 0 ? null : { at: p, from: p - 1 }));
  if (rows.length > 1) transitions.push({ at: 0, from: 0, forward: true });
  for (const tr of transitions) {
    if (!tr) continue;
    const row = rows[tr.at];
    const other = tr.forward ? rows[1] : rows[tr.from];
    if (!row.focusBox) {
      failures.push(`${view.name} p${tr.at}: no focus rect`);
      continue;
    }
    const prevTexts = new Map(other.textBoxes.map((b) => [b.key, b.text]));
    const changed = row.textBoxes.filter((b) => prevTexts.has(b.key) && prevTexts.get(b.key) !== b.text);
    for (const b of changed) {
      if (!inside(b.box, row.focusBox)) failures.push(`${view.name} p${tr.at}: changed text outside focus (${b.text})`);
    }
    if (row.fillWidth !== other.fillWidth && !inside(row.fillBox, row.focusBox)) {
      failures.push(`${view.name} p${tr.at}: changed fill outside focus`);
    }
  }
}

const smallest = states.reduce((a, b) => (a.minFont < b.minFont ? a : b));
const summary = {
  views: views.length,
  phases: states.length,
  minFont: smallest.minFont,
  minFontView: smallest.view,
  minFontPhase: smallest.phase,
  minFontText: smallest.minFontText,
  failures,
};
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, generatedAt: new Date().toISOString(), summary, states }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (failures.length) throw new Error(`audit failed: ${failures.length} failure(s)`);
