// Voxt 11 Step 4 per-phase mechanism audit.
// Start the dev server on 4473, then run `node .bot/out/voxt11-step4-audit.mjs`.
// Optional: BASE=http://localhost:4473/learning-sglang OUT=.bot/out/voxt11-step4-audit
// Captures en/zh desktop 1440x900 and en/zh 360/390/430 px, one PNG per phase,
// and checks identity (counter, step, phase, viewBoxWidth), per-phase mechanism
// states (start, idle limit, stop request while the process still runs, exit),
// byte/time boundaries (2.47 GB stays, idle 10/10), focus-stroke vs text
// collisions, text overlap, SVG text overflow, and >=10 CSS px fonts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4473/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/voxt11-step4-audit';
const url = `${base}/voxt/ch/models-and-app-updates/?step=4`;
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

// One browser per view: a reused browser froze the background compositor on
// phone captures and produced byte-identical PNGs for distinct DOM phases.
for (const view of views) {
  const browser = await launch({ width: view.width, height: view.height });
  try {
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
    if (setup.step !== 3 || setup.finalPhase !== PHASES - 1) failures.push(`${view.name}: identity step/finalPhase ${setup.step}/${setup.finalPhase}`);
    if (setup.counter !== '04 / 06') failures.push(`${view.name}: counter ${setup.counter}`);
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
          if (departed && root?.getAttribute('data-animation-step') === '3' && current === '${target}') {
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
        const all = texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' '));
        // The two dynamic status lines: desktop (529, 196/222), phone (150, 394/420).
        const statusCoords = new Set(['529|196', '529|222', '150|394', '150|420']);
        return {
          phase: Number(root.getAttribute('data-animation-phase')),
          focusBox,
          textBoxes: texts.map((el) => ({
            key: el.getAttribute('x') + '|' + el.getAttribute('y'),
            text: el.textContent.trim().replace(/\\s+/g, ' '),
            box: rectOf(el),
          })),
          status: texts.filter((el) => statusCoords.has(el.getAttribute('x') + '|' + el.getAttribute('y')))
            .map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
          diskStay: all.some((s) => /stays after the server exits|服务器退出后还留着/.test(s)),
          gbOnDisk: all.some((s) => /^2\\.47 GB$/.test(s)),
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
      const png = await page.screenshot(clip);
      const pngMd5 = createHash('md5').update(png).digest('hex');
      if (states.some((s) => s.view === view.name && s.pngMd5 === pngMd5)) {
        failures.push(`${view.name} p${target}: PNG identical to an earlier phase (frozen capture)`);
      }
      writeFileSync(join(dir, `p${target}.png`), png);
      states.push({ view: view.name, phase: target, pngMd5, ...state });
      console.log(JSON.stringify({ view: view.name, phase: target, status: state.status, minFont: state.minFont, overlaps: state.overlaps.length, overflow: state.overflow.length, focusHits: state.focusHits.length }));
    }
    await page.close();
  } finally {
    browser.close();
  }
}

for (const view of views) {
  const rows = states.filter((s) => s.view === view.name);
  const statuses = rows.map((r) => r.status.join(' | '));
  if (new Set(statuses).size !== 4) failures.push(`${view.name}: status pair not distinct per phase ${JSON.stringify(statuses)}`);
  if (!/stop request|停止请求/.test(rows[2].status.join(' ')) || !/still runs|还在运行/.test(rows[2].status.join(' '))) {
    failures.push(`${view.name}: p2 is not the stop-request-only state ${JSON.stringify(rows[2].status)}`);
  }
  if (/process exits|进程退出/.test(rows[2].status.join(' '))) failures.push(`${view.name}: p2 already shows the exit`);
  if (!/process exits|进程退出/.test(rows[3].status.join(' '))) failures.push(`${view.name}: p3 missing the exit state`);
  if (/stop request|停止请求/.test(rows[3].status.join(' '))) failures.push(`${view.name}: p3 still shows the request line`);
  if (!/idle|空闲/.test(rows[1].status.join(' '))) failures.push(`${view.name}: p1 missing the idle-limit state`);
  for (const row of rows) {
    if (!row.diskStay) failures.push(`${view.name} p${row.phase}: byte boundary 'stays after the server exits' missing`);
    if (!row.gbOnDisk) failures.push(`${view.name} p${row.phase}: 2.47 GB disk size missing`);
    if (row.minFont < 10) failures.push(`${view.name} p${row.phase}: minFont ${row.minFont} (${row.minFontText})`);
    if (row.overlaps.length) failures.push(`${view.name} p${row.phase}: text overlaps ${JSON.stringify(row.overlaps)}`);
    if (row.overflow.length) failures.push(`${view.name} p${row.phase}: svg overflow ${JSON.stringify(row.overflow)}`);
    if (row.focusHits.length) failures.push(`${view.name} p${row.phase}: focus stroke crosses text ${JSON.stringify(row.focusHits)}`);
  }
  const inside = (box, f) => f && box && box[0] >= f[0] - 1 && box[1] >= f[1] - 1 && box[2] <= f[2] + 1 && box[3] <= f[3] + 1;
  // Containment: every element a transition changes must sit inside that phase's focus rect.
  // Phase 0 has no incoming transition, so its frame must hold the objects the loop-back changes.
  const transitions = rows.map((row, p) => (p === 0 ? null : { at: p, from: p - 1 }));
  if (rows.length > 1) transitions.push({ at: 0, from: 3, forward: true });
  for (const tr of transitions) {
    if (!tr) continue;
    const row = rows[tr.at];
    const other = rows[tr.from];
    if (!row.focusBox) {
      failures.push(`${view.name} p${tr.at}: no focus rect`);
      continue;
    }
    const prevTexts = new Map(other.textBoxes.map((b) => [b.key, b.text]));
    const changed = row.textBoxes.filter((b) => prevTexts.has(b.key) && prevTexts.get(b.key) !== b.text);
    for (const b of changed) {
      if (!inside(b.box, row.focusBox)) failures.push(`${view.name} p${tr.at}: changed text outside focus (${b.text})`);
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
