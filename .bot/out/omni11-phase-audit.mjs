// Reproduce the Omni 11 mechanism, layout, and desktop-font audit.
// Usage: start the chapter's dev server on port 4466, then run `node .bot/out/omni11-phase-audit.mjs`.
// Optional: BASE=http://localhost:4466/learning-sglang OUT=.bot/out/omni11-phase-audit
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4466/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/omni11-phase-audit';
const lang = process.env.LANG === 'zh' ? 'zh' : 'en';
const onlyStep = Number(process.env.STEP) || null;
const width = Number(process.env.WIDTH) || 1440;
const height = width <= 900 ? 844 : 900;
const expectedCounts = [4, 4, 3, 11, 5, 4, 3, 4];
const selectedCounts = expectedCounts.filter((_, index) => !onlyStep || onlyStep === index + 1);
const expectedStates = selectedCounts.reduce((sum, count) => sum + count, 0);
const expectedTransitions = selectedCounts.reduce((sum, count) => sum + count - 1, 0);
const states = [];
mkdirSync(out, { recursive: true });

const browser = await launch({ width, height });
const keepAlive = setInterval(() => {}, 1000);
try {
  const page = await browser.tab({ width, height, mobile: width <= 900 });
  await page.goto(`${base}/omni/ch/11-fish-s2-pro/?step=1`);
  await page.evaluate(`localStorage.setItem('lang', '${lang}')`);
  for (let step = 1; step <= expectedCounts.length; step++) {
    if (onlyStep && step !== onlyStep) continue;
    await page.goto(`${base}/omni/ch/11-fish-s2-pro/?step=${step}`);
    await sleep(850);
    const finalPhase = await page.evaluate(`Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase'))`);
    if (finalPhase !== expectedCounts[step - 1] - 1) {
      throw new Error(`step ${step}: expected final phase ${expectedCounts[step - 1] - 1}, got ${finalPhase}`);
    }
    let previousSignature = null;
    for (let target = 0; target <= finalPhase; target++) {
      // Wait for a fresh entry into the target phase, so the 380 ms transition settle cannot cross it.
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
      await sleep(380);
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
          texts: mechanismTexts.map((el) => [el.textContent.trim().replace(/\\s+/g, ' '), Math.round(opacity(el) * 100) / 100]),
          shapes: mechanismShapes.map((el) => [el.outerHTML, Math.round(opacity(el) * 100) / 100]),
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
        const tailBox = svg.querySelector('rect.motion-tail');
        const tailLabel = svg.querySelector('text.motion-tail');
        const tail = tailBox && tailLabel ? (() => {
          const box = tailBox.getBoundingClientRect();
          const label = tailLabel.getBoundingClientRect();
          return {
            text: tailLabel.textContent.trim(),
            leftOverflow: Math.max(0, box.left - label.left),
            rightOverflow: Math.max(0, label.right - box.right),
            topOverflow: Math.max(0, box.top - label.top),
            bottomOverflow: Math.max(0, label.bottom - box.bottom),
          };
        })() : null;
        const counter = document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' ');
        return {
          step: Number(root.getAttribute('data-animation-step')) + 1,
          phase: Number(root.getAttribute('data-animation-phase')),
          finalPhase: Number(root.getAttribute('data-animation-final-phase')),
          counter,
          texts: texts.length,
          solidTexts: texts.filter((el) => opacity(el) >= 0.90).length,
          solidShapes: shapes.filter((el) => opacity(el) >= 0.90).length,
          minFont: Math.round(smallest.size * 1000) / 1000,
          minFontText: smallest.text,
          overlaps,
          overflow,
          tail,
          mechanism,
        };
      })()`);
      const counter = state.counter?.match(/\d+/g)?.map(Number);
      if (state.step !== step || state.phase !== target || counter?.[0] !== step || counter?.[1] !== 8) {
        throw new Error(`step ${step} phase ${target}: identity mismatch (counter: ${state.counter})`);
      }
      const signature = createHash('sha256').update(JSON.stringify(state.mechanism)).digest('hex');
      const changed = previousSignature === null ? null : signature !== previousSignature;
      if (changed === false) throw new Error(`step ${step} phase ${target}: mechanism did not change`);
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
const smallest = states.reduce((a, b) => a.minFont < b.minFont ? a : b);
const summary = {
  steps: new Set(states.map((state) => state.step)).size,
  phases: states.length,
  transitions: transitions.length,
  changedTransitions,
  minFont: smallest.minFont,
  minFontStep: smallest.step,
  minFontPhase: smallest.phase,
  minFontText: smallest.minFontText,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
  tailOverflow: states.filter((state) => state.tail && ['leftOverflow', 'rightOverflow', 'topOverflow', 'bottomOverflow']
    .some((key) => state.tail[key] > 0.01)).length,
  maxTailLeftOverflow: Math.max(0, ...states.map((state) => state.tail?.leftOverflow || 0)),
  maxTailRightOverflow: Math.max(0, ...states.map((state) => state.tail?.rightOverflow || 0)),
};
const report = { base, lang, generatedAt: new Date().toISOString(), summary, states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (states.length !== expectedStates || transitions.length !== expectedTransitions || changedTransitions !== expectedTransitions ||
    summary.minFont < 10 || summary.overlaps || summary.overflow || summary.tailOverflow) {
  throw new Error(`audit failed: ${JSON.stringify(summary)}`);
}
