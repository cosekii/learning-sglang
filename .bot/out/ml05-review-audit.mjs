// Reproduce the ML 05 Steps 5–7 mechanism, layout, font, and deep-dive audit.
// Start the dev server, then run `BASE=http://localhost:4494/learning-sglang node .bot/out/ml05-review-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4494/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml05-review-audit';
const counts = [4, 3, 3, 5, 4, 6, 6];
const changedSteps = [5, 6, 7];
const required = {
  en: {
    5: ['stream: true', 'choices[0].delta.content', 'data: [DONE]'],
    6: ['RANK 0 · LEADER', 'cross-rank handoff', 'NODE 1 ·', 'r4…r7'],
    7: ['DELTA 1 ARRIVES', '4 deltas'],
  },
  zh: {
    5: ['stream: true', 'choices[0].delta.content', 'data: [DONE]'],
    6: ['RANK 0 · LEADER', '跨 rank 交接', 'NODE 1 ·', 'r4…r7'],
    7: ['收到第 1 个 delta', '4 个 delta'],
  },
};
const deepRequired = {
  en: {
    5: ['constructed streaming example', '[DONE]'],
    6: ['not a ninth worker', 'cross-rank handoff'],
    7: ['one-token-per-delta', 'Real SSE events'],
  },
  zh: {
    5: ['构造的流式例子', '[DONE]'],
    6: ['不是第 9 个 worker', '跨 rank 交接'],
    7: ['每个 delta 携带一个 token', '真实 SSE 事件'],
  },
};
const states = [];
const deepStates = [];
mkdirSync(out, { recursive: true });
const keepAlive = setInterval(() => {}, 1000);
let browser;

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const counter = (step) => `${String(step).padStart(2, '0')} / 07`;

async function open(page, lang, step) {
  const url = `${base}/ml-sys/ch/05-distributed-serving/?step=${step}&deep=0`;
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}')`);
  await page.goto(url);
  await page.evaluate(`(() => { const button = document.querySelector('button.deep'); if (button?.getAttribute('aria-expanded') === 'true') button.click(); })()`);
  await sleep(850);
  const identity = await page.evaluate(`(() => ({
    hydrated: Boolean(document.querySelector('.viz svg')),
    step: Number(document.querySelector('.viz')?.getAttribute('data-animation-step')),
    finalPhase: Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase')),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    expanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
  }))()`);
  assert(identity.hydrated && identity.step === step - 1 && identity.finalPhase === counts[step - 1] - 1 &&
    identity.counter === counter(step) && identity.expanded === 'false',
  `${lang} step ${step}: bad initial identity ${JSON.stringify(identity)}`);
}

async function capture(page, lang, width, step, phase, previous) {
  await page.evaluate(`new Promise((resolve, reject) => {
    const root = document.querySelector('.viz');
    let departed = root?.getAttribute('data-animation-phase') !== '${phase}';
    const deadline = Date.now() + 20000;
    const check = () => {
      const current = root?.getAttribute('data-animation-phase');
      if (current !== '${phase}') departed = true;
      if (departed && root?.getAttribute('data-animation-step') === '${step - 1}' && current === '${phase}') {
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
    const texts = [...svg.querySelectorAll('text')].filter((el) => el.textContent.trim() && opacity(el) >= 0.90);
    const mechanismTexts = texts.filter((el) => !el.closest('[aria-hidden="true"]'));
    const shapes = [...svg.querySelectorAll('rect,line,path')].filter((el) =>
      !el.closest('defs,marker,[aria-hidden="true"]') && opacity(el) >= 0.90);
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
      minFont: Math.round(smallest.size * 1000) / 1000,
      minFontText: smallest.text,
      overlaps,
      overflow,
      visibleTexts: mechanismTexts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
      visibleShapes: shapes.length,
      mechanism: {
        texts: mechanismTexts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
        shapes: shapes.map((el) => el.outerHTML),
      },
    };
  })()`);
  assert(state.step === step && state.phase === phase && state.finalPhase === counts[step - 1] - 1 &&
    state.counter === counter(step),
  `${lang} ${width} step ${step} phase ${phase}: identity mismatch ${JSON.stringify(state)}`);
  const signature = hash(state.mechanism);
  const changed = previous ? signature !== previous.signature : null;
  assert(changed !== false, `${lang} ${width} step ${step} phase ${phase}: mechanism did not change`);
  const previousTexts = new Set(previous?.visibleTexts || []);
  const currentTexts = new Set(state.visibleTexts);
  const appeared = state.visibleTexts.filter((text) => !previousTexts.has(text));
  const disappeared = (previous?.visibleTexts || []).filter((text) => !currentTexts.has(text));
  if (phase === counts[step - 1] - 1) {
    for (const text of required[lang][step]) assert(state.visibleTexts.some((line) => line.includes(text)),
      `${lang} ${width} step ${step}: final stage is missing ${text}: ${JSON.stringify(state.visibleTexts)}`);
  }
  const png = await page.screenshot();
  assert(!previous?.png?.equals(png), `${lang} ${width} step ${step} phase ${phase}: PNG matches previous phase`);
  const record = {
    lang, width, step, phase, finalPhase: state.finalPhase, counter: state.counter,
    minFont: state.minFont, minFontText: state.minFontText,
    overlaps: state.overlaps, overflow: state.overflow,
    visibleTexts: state.visibleTexts, visibleShapes: state.visibleShapes,
    appeared, disappeared, signature, changed,
    pngBytes: png.length, pngMd5: createHash('md5').update(png).digest('hex'),
  };
  states.push(record);
  writeFileSync(join(out, `${lang}-${width}-s${step}-p${phase}.png`), png);
  return { ...record, png };
}

async function captureDeep(page, lang, step) {
  await page.evaluate(`(() => { const button = document.querySelector('button.deep'); if (button.getAttribute('aria-expanded') !== 'true') button.click(); })()`);
  await sleep(450);
  const deep = await page.evaluate(`(() => {
    const body = document.querySelector('.deep-body');
    return {
      expanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
      counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
      text: body?.textContent.replace(/\\s+/g, ' ').trim(),
      katexErrors: document.querySelectorAll('.deep-body .katex-error').length,
      rawMath: body?.textContent.includes('$$'),
      overflow: body ? body.scrollWidth - body.clientWidth : null,
    };
  })()`);
  assert(deep.expanded === 'true' && deep.counter === counter(step) && deep.text &&
    !deep.katexErrors && !deep.rawMath && deep.overflow <= 1,
  `${lang} step ${step}: deep-dive audit failed ${JSON.stringify({ ...deep, text: undefined })}`);
  for (const text of deepRequired[lang][step]) assert(deep.text.includes(text), `${lang} step ${step}: deep dive is missing ${text}`);
  const png = await page.screenshot();
  writeFileSync(join(out, `${lang}-1440-s${step}-deep.png`), png);
  deepStates.push({ lang, step, expanded: deep.expanded, counter: deep.counter, katexErrors: deep.katexErrors,
    rawMath: deep.rawMath, overflow: deep.overflow, pngMd5: createHash('md5').update(png).digest('hex') });
  await page.evaluate(`document.querySelector('button.deep').click()`);
}

try {
  for (const lang of ['en', 'zh']) {
    browser = await launch({ width: 1440, height: 900 });
    const page = await browser.tab();
    for (const step of changedSteps) {
      await open(page, lang, step);
      let previous = null;
      for (let phase = 0; phase < counts[step - 1]; phase++) previous = await capture(page, lang, 1440, step, phase, previous);
      await captureDeep(page, lang, step);
    }
    await page.close();
    browser.close();
    browser = null;
  }
  for (const width of [360, 390, 430]) {
    browser = await launch({ width, height: 844 });
    const page = await browser.tab({ width, height: 844, mobile: true });
    for (const lang of ['en', 'zh']) for (const step of changedSteps) {
      await open(page, lang, step);
      await capture(page, lang, width, step, counts[step - 1] - 1, null);
    }
    await page.close();
    browser.close();
    browser = null;
  }
} finally {
  clearInterval(keepAlive);
  browser?.close();
}

const desktop = states.filter((state) => state.width === 1440);
const transitions = desktop.filter((state) => state.phase > 0);
const changedTransitions = transitions.filter((state) => state.changed).length;
const smallest = states.reduce((a, b) => a.minFont < b.minFont ? a : b);
const summary = {
  states: states.length,
  desktopStates: desktop.length,
  phoneStates: states.length - desktop.length,
  transitions: transitions.length,
  changedTransitions,
  mechanismSteps: new Set(transitions.map((state) => state.step)).size,
  deepStates: deepStates.length,
  uniquePngHashes: new Set(states.map((state) => state.pngMd5)).size,
  minFont: smallest.minFont,
  minFontLocation: `${smallest.lang}-${smallest.width}-s${smallest.step}-p${smallest.phase}`,
  minFontText: smallest.minFontText,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
};
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, generatedAt: new Date().toISOString(), summary, states, deepStates }, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
assert(states.length === 50 && desktop.length === 32 && transitions.length === 26 && changedTransitions === 26 &&
  summary.mechanismSteps === 3 && deepStates.length === 6 && summary.uniquePngHashes === states.length &&
  summary.minFont >= 10 && !summary.overlaps && !summary.overflow,
`audit failed: ${JSON.stringify(summary)}`);
