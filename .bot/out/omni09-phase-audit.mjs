// Verify Omni 05 Steps 1–3 across language, viewport, and entry path.
// Usage: STEP=1 LANG=en WIDTH=1440 ENTRY=direct BASE=http://127.0.0.1:4501/learning-sglang node .bot/out/omni09-phase-audit.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4501/learning-sglang').replace(/\/$/, '');
const step = Number(process.env.STEP) || 1;
if (![1, 2, 3].includes(step)) throw new Error('STEP must be 1, 2, or 3');
const lang = process.env.LANG === 'zh' ? 'zh' : 'en';
const entry = process.env.ENTRY === 'prev' ? 'prev' : 'direct';
const width = Number(process.env.WIDTH) || 1440;
const height = width <= 900 ? 1000 : 900;
const phone = width <= 900;
const out = process.env.OUT || `.bot/out/omni09-s${step}-${lang}${phone ? width : 'desktop'}-${entry}`;
mkdirSync(out, { recursive: true });
const config = {
  1: {
    final: 3,
    required: [[], [lang === 'zh' ? '读错' : 'WRONG READ'], [lang === 'zh' ? 'A 读取完成 ✓' : 'A read finished ✓'], [lang === 'zh' ? 'A 读完后 B 进入' : 'B entered after A']],
    forbidden: [
      ...(lang === 'zh' ? [] : []),
    ],
  },
};
if (!config[step]) throw new Error(`Step ${step} audit rules are not defined yet`);
const expectedFinal = config[step].final;

const browser = await launch({ width, height });
const states = [];
try {
  const page = await browser.tab({ width, height, mobile: phone });
  await page.goto(`${base}/omni/ch/05-data-lifetime/?step=1`);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  if (entry === 'prev' && step === 1) {
    await page.goto(`${base}/omni/ch/05-data-lifetime/?step=2`);
    await sleep(900);
    await page.press('ArrowLeft');
  } else if (entry === 'prev') {
    await page.goto(`${base}/omni/ch/05-data-lifetime/?step=${step - 1}`);
    await sleep(900);
    await page.press('ArrowRight');
  } else {
    await page.goto(`${base}/omni/ch/05-data-lifetime/?step=${step}`);
  }
  await sleep(900);
  const finalPhase = await page.evaluate(`Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase'))`);
  if (finalPhase !== expectedFinal) throw new Error(`expected final phase ${expectedFinal}, got ${finalPhase}`);
  let previousSignature = null;
  for (let target = 0; target <= expectedFinal; target++) {
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
    await sleep(400);
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
      const shapes = [...svg.querySelectorAll('rect,line,path')].filter((el) => !el.closest('defs,marker') && opacity(el) >= 0.05);
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
      return {
        step: Number(root.getAttribute('data-animation-step')) + 1,
        phase: Number(root.getAttribute('data-animation-phase')),
        finalPhase: Number(root.getAttribute('data-animation-final-phase')),
        counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
        text: texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
        minFont: Math.round(smallest.size * 1000) / 1000,
        minFontText: smallest.text,
        overlaps,
        overflow,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        mechanism,
      };
    })()`);
    const counter = state.counter?.match(/\d+/g)?.map(Number);
    if (state.step !== step || state.phase !== target || counter?.[0] !== step || counter?.[1] !== 5) {
      throw new Error(`phase ${target}: identity mismatch (counter: ${state.counter})`);
    }
    const required = config[step].required[target];
    const missing = required.filter((text) => !state.text.some((line) => line.includes(text)));
    if (missing.length) throw new Error(`phase ${target}: missing ${missing.join(', ')}`);
    const forbidden = step === 1 ? [
      ...(target < 1 ? [lang === 'zh' ? '读错' : 'WRONG READ'] : []),
      ...(target < 2 ? [lang === 'zh' ? 'A 读取完成 ✓' : 'A read finished ✓'] : []),
      ...(target < 3 ? [lang === 'zh' ? 'A 读完后 B 进入' : 'B entered after A'] : []),
    ] : [];
    const premature = forbidden.filter((text) => state.text.some((line) => line.includes(text)));
    if (premature.length) throw new Error(`phase ${target}: premature completion ${premature.join(', ')}`);
    const signature = createHash('sha256').update(JSON.stringify(state.mechanism)).digest('hex');
    const changed = previousSignature === null ? null : signature !== previousSignature;
    if (changed === false) throw new Error(`phase ${target}: mechanism did not change`);
    previousSignature = signature;
    states.push({ phase: target, ...state, mechanism: undefined, signature, changed });
    writeFileSync(join(out, `s${step}-p${target}.png`), await page.screenshot());
  }
  await page.close();
} finally {
  browser.close();
}

const transitions = states.filter((state) => state.changed !== null);
const summary = {
  states: states.length,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state) => state.changed).length,
  minFont: Math.min(...states.map((state) => state.minFont)),
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
  pageOverflow: states.some((state) => state.pageOverflow),
};
const report = { base, step, lang, entry, width, summary, states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (states.length !== expectedFinal + 1 || transitions.length !== expectedFinal || summary.changedTransitions !== expectedFinal ||
    summary.minFont < 10 || summary.overlaps || summary.overflow || summary.pageOverflow) {
  throw new Error(`audit failed: ${JSON.stringify(summary)}`);
}
