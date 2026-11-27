// Verify Omni 13 Step 5 across language, viewport, and entry path.
// Usage: BASE=http://127.0.0.1:4501/learning-sglang LANG=en WIDTH=1440 ENTRY=direct node .bot/out/omni49-step5-audit.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4501/learning-sglang').replace(/\/$/, '');
const lang = process.env.LANG === 'zh' ? 'zh' : 'en';
const entry = process.env.ENTRY === 'prev' ? 'prev' : 'direct';
const width = Number(process.env.WIDTH) || 1440;
const height = width <= 900 ? 1000 : 900;
const phone = width <= 900;
const out = process.env.OUT || `.bot/out/omni49-step5-${lang}${phone ? width : 'desktop'}-${entry}`;
mkdirSync(out, { recursive: true });

const browser = await launch({ width, height });
const states = [];
try {
  const page = await browser.tab({ width, height, mobile: phone });
  await page.goto(`${base}/omni/ch/13-qwen3-omni-deployment/?step=1`);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  if (entry === 'prev') {
    await page.goto(`${base}/omni/ch/13-qwen3-omni-deployment/?step=4`);
    await sleep(900);
    await page.press('ArrowRight');
  } else {
    await page.goto(`${base}/omni/ch/13-qwen3-omni-deployment/?step=5`);
  }
  await sleep(900);
  const finalPhase = await page.evaluate(`Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase'))`);
  if (finalPhase !== 4) throw new Error(`expected final phase 4, got ${finalPhase}`);
  let previousSignature = null;
  for (let target = 0; target <= finalPhase; target++) {
    await page.evaluate(`new Promise((resolve, reject) => {
      const root = document.querySelector('.viz');
      let departed = root?.getAttribute('data-animation-phase') !== '${target}';
      const deadline = Date.now() + 20000;
      const check = () => {
        const current = root?.getAttribute('data-animation-phase');
        if (current !== '${target}') departed = true;
        if (departed && root?.getAttribute('data-animation-step') === '4' && current === '${target}') {
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
    await sleep(500);
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
      const shapes = [...svg.querySelectorAll('rect,line,path')].filter((el) =>
        !el.closest('defs,marker') && opacity(el) >= 0.05);
      const mechanism = {
        texts: texts.map((el) => [el.textContent.trim().replace(/\\s+/g, ' '), Math.round(opacity(el) * 100) / 100]),
        shapes: shapes.map((el) => [el.outerHTML, Math.round(opacity(el) * 100) / 100]),
      };
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
      const bars = [...svg.querySelectorAll('rect')].filter((el) => ['var(--accent)', 'var(--gen)', 'var(--eos)'].includes(el.getAttribute('fill')))
        .map((el) => ({
          fill: el.getAttribute('fill'),
          x: Number(el.getAttribute('x')),
          y: Number(el.getAttribute('y')),
          width: Number(el.getAttribute('width')),
          opacity: opacity(el),
        }));
      const limits = [...svg.querySelectorAll('line')].map((el) => ({
        x1: Number(el.getAttribute('x1')),
        y1: Number(el.getAttribute('y1')),
        opacity: opacity(el),
      }));
      return {
        step: Number(root.getAttribute('data-animation-step')) + 1,
        phase: Number(root.getAttribute('data-animation-phase')),
        finalPhase: Number(root.getAttribute('data-animation-final-phase')),
        counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
        minFont: Math.round(smallest.size * 1000) / 1000,
        minFontText: smallest.text,
        overlaps,
        overflow,
        bars,
        limits,
        mechanism,
      };
    })()`);
    const counter = state.counter?.match(/\d+/g)?.map(Number);
    if (state.step !== 5 || state.phase !== target || counter?.[0] !== 5 || counter?.[1] !== 10) {
      throw new Error(`phase ${target}: identity mismatch (counter: ${state.counter})`);
    }
    const signature = createHash('sha256').update(JSON.stringify(state.mechanism)).digest('hex');
    const changed = previousSignature === null ? null : signature !== previousSignature;
    if (changed === false) throw new Error(`phase ${target}: mechanism did not change`);
    previousSignature = signature;
    const record = { phase: target, ...state, mechanism: undefined, signature, changed };
    states.push(record);
    writeFileSync(join(out, `s5-p${target}.png`), await page.screenshot());
  }
  await page.close();
} finally {
  browser.close();
}

const barWidth = phone ? 240 : 290;
const expected = [
  { remaining: 77.745728, overflow: 5.745728, afterOverflow: 0 },
  { remaining: 80.891456, overflow: 8.891456, afterOverflow: 0.891456 },
];
const geometryFailures = [];
for (let i = 0; i < expected.length; i++) {
  const panelX = phone ? 15 : 20 + i * 360;
  const panelY = phone ? 255 + i * 305 : 200;
  const bars = states.at(-1).bars.filter((bar) => bar.x >= panelX && bar.x < panelX + (phone ? 270 : 320) && (bar.y === panelY + 96 || bar.y === panelY + 187));
  const want = [
    { fill: 'var(--accent)', y: panelY + 96, width: expected[i].remaining / 90 * barWidth },
    { fill: 'var(--gen)', y: panelY + 96, width: 8 / 90 * barWidth },
    { fill: 'var(--eos)', y: panelY + 96, width: expected[i].overflow / 90 * barWidth },
    { fill: 'var(--accent)', y: panelY + 187, width: expected[i].remaining / 90 * barWidth },
  ];
  if (expected[i].afterOverflow) want.push({ fill: 'var(--eos)', y: panelY + 187, width: expected[i].afterOverflow / 90 * barWidth });
  for (const target of want) {
    const match = bars.find((bar) => bar.fill === target.fill && bar.y === target.y);
    if (!match || Math.abs(match.width - target.width) > 0.000001) {
      geometryFailures.push({ panel: i, target, actual: match });
    }
  }
  const expectedLimit = panelX + 15 + 80 / 90 * barWidth;
  for (const y1 of [panelY + 90, panelY + 181]) {
    const limit = states.at(-1).limits.find((line) => line.y1 === y1 && line.x1 >= panelX && line.x1 <= panelX + 15 + barWidth);
    if (!limit || Math.abs(limit.x1 - expectedLimit) > 0.000001) {
      geometryFailures.push({ panel: i, expectedLimit, y1, actual: limit });
    }
  }
}
const transitions = states.filter((state) => state.changed !== null);
const summary = {
  states: states.length,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state) => state.changed).length,
  minFont: Math.min(...states.map((state) => state.minFont)),
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
  geometryFailures,
};
const report = { base, lang, entry, width, summary, states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (states.length !== 5 || transitions.length !== 4 || summary.changedTransitions !== 4 ||
    summary.minFont < 10 || summary.overlaps || summary.overflow || geometryFailures.length) {
  throw new Error(`audit failed: ${JSON.stringify(summary)}`);
}
