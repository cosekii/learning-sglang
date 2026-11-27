// Reproduce the ML 10 mechanism, layout, desktop-font, navigation, and deep-dive audit.
// Start the dev server, then run `BASE=http://localhost:4484/learning-sglang node .bot/out/ml10-final-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4484/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml10-final-audit';
const counts = [3, 5, 4, 4, 5, 5, 5, 5, 3];
const required = {
  en: {
    4: ['gradient = weight-update direction', 'STE is an approximation'],
    5: ['code = one integer', 'every RL update converts weights again'],
    6: ['packing = eight codes', 'q + 8 gives fields 0…15'],
    7: ['LOAD + REORDER', 'Marlin after: [s0,s8,…,s56'],
    8: ['separate detail: FP32 accumulate', 'only inside this matrix instruction'],
    9: ['index = tensor-to-file table', 'TRAINING: fake BF16 round trip'],
  },
  zh: {
    4: ['梯度 = 权重的更新方向和幅度', 'STE 是近似'],
    5: ['编码 = 用一个整数', '每轮 RL 更新都重新转换权重'],
    6: ['打包 = 八个编码', 'q + 8 得到 0…15 的非负字段'],
    7: ['装入 + 重排', 'Marlin 重排后：[s0,s8,…,s56'],
    8: ['另一个细节：FP32 累加', '只在这条指令内部'],
    9: ['index = 张量到文件的目录', '训练：fake BF16 往返'],
  },
};
const deepRequired = {
  en: {
    4: ['direction for changing a weight', 'return grad_output, None'],
    5: ['0.35/0.10=3.5', 'Every RL weight update'],
    6: ['0xFEC98710', '71.875%'],
    7: ['LOAD + REORDER', 's0, s8, s16, s24, s32, s40, s48, s56'],
    8: ['separately, FP32 accumulates', 'q=12-8=4'],
    9: ['index as a table', 'Chapter 13 Step 1'],
  },
  zh: {
    4: ['权重该往哪个方向改、改多少', 'return grad_output, None'],
    5: ['0.35/0.10=3.5', '每次 RL 权重更新'],
    6: ['0xFEC98710', '71.875%'],
    7: ['LOAD + REORDER', 's0, s8, s16, s24, s32, s40, s48, s56'],
    8: ['另一个细节是这条指令内部用 FP32', 'q=12-8=4'],
    9: ['index 解释成“每个张量放在哪个文件”的目录', '第 13 章第 1 步'],
  },
};
const states = [];
const deepStates = [];
const navigation = {};
mkdirSync(out, { recursive: true });
const keepAlive = setInterval(() => {}, 1000);
let browser;

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function open(page, lang, step) {
  const url = `${base}/ml-sys/ch/10-int4-qat-rollout/?step=${step}`;
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}')`);
  await page.goto(url);
  await page.evaluate(`(() => { const button = document.querySelector('button.deep'); if (button?.getAttribute('aria-expanded') === 'true') button.click(); })()`);
  await sleep(850);
  const identity = await page.evaluate(`(() => ({
    step: Number(document.querySelector('.viz')?.getAttribute('data-animation-step')),
    finalPhase: Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase')),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
  }))()`);
  assert(identity.step === step - 1 && identity.finalPhase === counts[step - 1] - 1 && identity.counter === `${String(step).padStart(2, '0')} / 09`,
    `${lang} step ${step}: bad initial identity ${JSON.stringify(identity)}`);
}

async function capture(page, lang, step, phase, previous) {
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
  assert(state.step === step && state.phase === phase && state.finalPhase === counts[step - 1] - 1 && state.counter === `${String(step).padStart(2, '0')} / 09`,
    `${lang} step ${step} phase ${phase}: identity mismatch ${JSON.stringify(state)}`);
  const signature = hash(state.mechanism);
  const changed = previous ? signature !== previous.signature : null;
  assert(changed !== false, `${lang} step ${step} phase ${phase}: mechanism did not change`);
  const previousTexts = new Set(previous?.visibleTexts || []);
  const currentTexts = new Set(state.visibleTexts);
  const appeared = state.visibleTexts.filter((text) => !previousTexts.has(text));
  const disappeared = (previous?.visibleTexts || []).filter((text) => !currentTexts.has(text));
  if (phase === counts[step - 1] - 1 && required[lang][step]) {
    for (const text of required[lang][step]) assert(state.visibleTexts.some((line) => line.includes(text)),
      `${lang} step ${step}: final stage is missing ${text}`);
  }
  const png = await page.screenshot();
  assert(!previous?.png?.equals(png), `${lang} step ${step} phase ${phase}: PNG is byte-identical to the previous phase`);
  const record = {
    lang, step, phase, finalPhase: state.finalPhase, counter: state.counter,
    minFont: state.minFont, minFontText: state.minFontText,
    overlaps: state.overlaps, overflow: state.overflow,
    visibleTexts: state.visibleTexts, visibleShapes: state.visibleShapes,
    appeared, disappeared, signature, changed,
    pngBytes: png.length, pngMd5: createHash('md5').update(png).digest('hex'),
  };
  states.push(record);
  writeFileSync(join(out, `${lang}-s${step}-p${phase}.png`), png);
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
  assert(deep.expanded === 'true' && deep.counter === `${String(step).padStart(2, '0')} / 09` && deep.text &&
    !deep.katexErrors && !deep.rawMath && deep.overflow <= 1,
  `${lang} step ${step}: deep-dive audit failed ${JSON.stringify({ ...deep, text: undefined })}`);
  for (const text of deepRequired[lang][step] || []) assert(deep.text.includes(text), `${lang} step ${step}: deep dive is missing ${text}`);
  const png = await page.screenshot();
  writeFileSync(join(out, `${lang}-s${step}-deep.png`), png);
  deepStates.push({ lang, step, expanded: deep.expanded, counter: deep.counter, katexErrors: deep.katexErrors,
    rawMath: deep.rawMath, overflow: deep.overflow, pngMd5: createHash('md5').update(png).digest('hex') });
  await page.evaluate(`document.querySelector('button.deep').click()`);
}

try {
  for (const lang of ['en', 'zh']) {
    browser = await launch({ width: 1440, height: 900 });
    const page = await browser.tab();
    for (let step = 1; step <= counts.length; step++) {
      await open(page, lang, step);
      let previous = null;
      for (let phase = 0; phase < counts[step - 1]; phase++) previous = await capture(page, lang, step, phase, previous);
      if (step >= 4) await captureDeep(page, lang, step);
      if (step === 1 || step === 9) {
        const nav = await page.evaluate(`(() => ({
          previous: document.querySelector('a.chapter:not(.next)')?.getAttribute('href'),
          next: document.querySelector('a.chapter.next')?.getAttribute('href'),
        }))()`);
        if (step === 1) {
          assert(nav.previous?.endsWith('/ml-sys/ch/09-fp8-rollout-training/'), `${lang} step 1 previous link: ${JSON.stringify(nav)}`);
          navigation[lang] = { ...navigation[lang], previous: nav.previous };
        } else {
          assert(nav.next?.endsWith('/ml-sys/ch/12-rl-speculative-decoding/'), `${lang} step 9 next link: ${JSON.stringify(nav)}`);
          navigation[lang] = { ...navigation[lang], next: nav.next };
        }
      }
    }
    await page.close();
    browser.close();
    browser = null;
  }
} finally {
  clearInterval(keepAlive);
  browser?.close();
}

const transitions = states.filter((state) => state.phase > 0);
const changedTransitions = transitions.filter((state) => state.changed).length;
const smallest = states.reduce((a, b) => a.minFont < b.minFont ? a : b);
const summary = {
  states: states.length,
  englishStates: states.filter((state) => state.lang === 'en').length,
  chineseStates: states.filter((state) => state.lang === 'zh').length,
  transitions: transitions.length,
  changedTransitions,
  mechanismSteps: new Set(states.filter((state) => state.phase > 0).map((state) => `${state.lang}-${state.step}`)).size / 2,
  deepStates: deepStates.length,
  uniquePngHashes: new Set(states.map((state) => state.pngMd5)).size,
  minFont: smallest.minFont,
  minFontLocation: `${smallest.lang}-s${smallest.step}-p${smallest.phase}`,
  minFontText: smallest.minFontText,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
};
const expectedStates = 2 * counts.reduce((sum, count) => sum + count, 0);
const expectedTransitions = 2 * counts.reduce((sum, count) => sum + count - 1, 0);
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, generatedAt: new Date().toISOString(), summary, navigation, states, deepStates }, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
assert(states.length === expectedStates && transitions.length === expectedTransitions && changedTransitions === expectedTransitions &&
  summary.mechanismSteps === 9 && deepStates.length === 12 && summary.uniquePngHashes === states.length &&
  summary.minFont >= 10 && !summary.overlaps && !summary.overflow,
`audit failed: ${JSON.stringify(summary)}`);
