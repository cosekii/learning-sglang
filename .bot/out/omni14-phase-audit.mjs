// Reproduce the Omni 14 mechanism, layout, and desktop-font audit.
// Start the dev server, then run `node .bot/out/omni14-phase-audit.mjs`.
// Optional: BASE=http://localhost:4467/learning-sglang OUT=.bot/out/omni14-phase-audit
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4467/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/omni14-phase-audit';
const expectedCounts = [4, 4, 4, 4, 4, 5, 4, 5];
const selectedSteps = (process.env.STEPS || expectedCounts.map((_, index) => index + 1).join(','))
  .split(',').map(Number);
const states = [];
mkdirSync(out, { recursive: true });

const browser = await launch({ width: 1440, height: 900 });
const keepAlive = setInterval(() => {}, 1000);
try {
  const page = await browser.tab();
  for (const step of selectedSteps) {
    await page.goto(`${base}/omni/ch/14-slow-reader-backpressure/?step=${step}`);
    await sleep(850);
    const finalPhase = await page.evaluate(`Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase'))`);
    if (finalPhase !== expectedCounts[step - 1] - 1) {
      throw new Error(`step ${step}: expected final phase ${expectedCounts[step - 1] - 1}, got ${finalPhase}`);
    }
    let previousSignature = null;
    for (let target = 0; target <= finalPhase; target++) {
      await page.evaluate(`new Promise((resolve, reject) => {
        const root = document.querySelector('.viz');
        let departed = root?.getAttribute('data-animation-phase') !== '${target}';
        const deadline = Date.now() + 20000;
        const check = () => {
          const current = root?.getAttribute('data-animation-phase');
          if (current !== '${target}') departed = true;
          if (departed && root?.getAttribute('data-animation-step') === '${step - 1}' && current === '${target}') {
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
      await sleep(550);
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
          !el.closest('defs,marker') && !el.classList.contains('motion-focus') && opacity(el) >= 0.05);
        const mechanismTexts = texts.filter((el) => !el.closest('[aria-hidden="true"]'));
        const mechanismShapes = shapes.filter((el) => !el.closest('[aria-hidden="true"]'));
        const mechanism = {
          texts: mechanismTexts.map((el) => [el.textContent.trim().replace(/\s+/g, ' '), Math.round(opacity(el) * 100) / 100]),
          shapes: mechanismShapes.map((el) => [el.outerHTML, Math.round(opacity(el) * 100) / 100]),
        };
        const sizes = texts.map((el) => {
          const ctm = el.getScreenCTM();
          return ctm ? {
            size: parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d),
            text: el.textContent.trim().replace(/\s+/g, ' '),
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
        const counter = document.querySelector('.counter')?.textContent.trim().replace(/\s+/g, ' ');
        return {
          step: Number(root.getAttribute('data-animation-step')) + 1,
          phase: Number(root.getAttribute('data-animation-phase')),
          finalPhase: Number(root.getAttribute('data-animation-final-phase')),
          counter,
          texts: texts.length,
          minFont: Math.round(smallest.size * 1000) / 1000,
          minFontText: smallest.text,
          overlaps,
          overflow,
          mechanism,
        };
      })()`);
      const counter = state.counter?.match(/\d+/g)?.map(Number);
      if (state.step !== step || state.phase !== target || counter?.[0] !== step || counter?.[1] !== 8) {
        throw new Error(`step ${step} phase ${target}: identity mismatch (counter: ${state.counter})`);
      }
      const signature = createHash('sha256').update(JSON.stringify(state.mechanism)).digest('hex');
      const changed = previousSignature === null ? null : signature !== previousSignature;
      previousSignature = signature;
      const record = { step, phase: target, ...state, mechanism: undefined, signature, changed };
      states.push(record);
      console.log(JSON.stringify(record));
      writeFileSync(join(out, `s${step}-p${target}.png`), await page.screenshot());
    }
  }
  await page.close();
} finally {
  clearInterval(keepAlive);
  browser.close();
}

const transitions = states.filter((state) => state.changed !== null);
const changedTransitions = transitions.filter((state) => state.changed).length;
const mechanismSteps = selectedSteps.filter((step) => states.some((state) => state.step === step && state.changed)).length;
const expectedPhases = selectedSteps.reduce((sum, step) => sum + expectedCounts[step - 1], 0);
const expectedTransitions = expectedPhases - selectedSteps.length;
const smallest = states.reduce((a, b) => a.minFont < b.minFont ? a : b);
const summary = {
  steps: selectedSteps.length,
  phases: states.length,
  transitions: transitions.length,
  changedTransitions,
  mechanismSteps,
  minFont: smallest.minFont,
  minFontStep: smallest.step,
  minFontPhase: smallest.phase,
  minFontText: smallest.minFontText,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
};
const report = { base, generatedAt: new Date().toISOString(), summary, states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (states.length !== expectedPhases || transitions.length !== expectedTransitions || mechanismSteps !== selectedSteps.length ||
    summary.minFont < 10 || summary.overlaps || summary.overflow) {
  throw new Error(`audit failed: ${JSON.stringify(summary)}`);
}
