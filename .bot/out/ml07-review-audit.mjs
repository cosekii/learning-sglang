// Verify the ML 07 ML-41–44 repairs with real phase, viewport, entry, and deep-dive states.
// Start the dev server, then run `BASE=http://127.0.0.1:4502/learning-sglang node .bot/out/ml07-review-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4502/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml07-review-audit';
const selected = (process.env.STEPS || '2,4,5,6,7').split(',').map(Number);
const counts = { 2: 6, 4: 5, 5: 6, 6: 5, 7: 4 };
const required = {
  en: {
    2: ['load own part', 'weight values', 'weight locations'],
    4: ['FULL_TENSOR()', '1,048,576'],
    5: ['BUCKET 1 · CLEARED', 'BUCKET 2 · ON GPU'],
    6: ['discard the', 'partially updated model'],
    7: ['1 + 30 + 2 = 33 ms', '161.5'],
  },
  zh: {
    2: ['装入自己那份', '权重数值', '权重位置'],
    4: ['FULL_TENSOR()', '1,048,576'],
    5: ['BUCKET 1 · 已清空', 'BUCKET 2 · 在 GPU 上'],
    6: ['失败时，弃用', '部分更新的模型'],
    7: ['1 + 30 + 2 = 33 ms', '161.5'],
  },
};
const deepRequired = {
  en: {
    2: ['Implementation · not drawn', 'update_weights_from_disk'],
    4: ['Implementation · not drawn', 'gather_object', '[512,1024]'],
    5: ['Bucket 2 is on the GPU'],
    6: ['partially updated model'],
    7: ['Measurement setup · not drawn', 'torch.cuda.synchronize()'],
  },
  zh: {
    2: ['图外实现', 'update_weights_from_disk'],
    4: ['图外实现', 'gather_object', '[512,1024]'],
    5: ['第 2 桶在 GPU 上'],
    6: ['部分更新的模型'],
    7: ['图外测量设置', 'torch.cuda.synchronize()'],
  },
};
const states = [];
const deepStates = [];
const failures = [];
mkdirSync(out, { recursive: true });
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const check = (condition, message) => { if (!condition) failures.push(message); };

const inspect = `(() => {
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
  const texts = [...svg.querySelectorAll('text')].filter((el) => el.textContent.trim() && opacity(el) >= 0.90 && !el.closest('[aria-hidden="true"]'));
  const shapes = [...svg.querySelectorAll('rect,line,path')].filter((el) => !el.closest('defs,marker,[aria-hidden="true"]') && opacity(el) >= 0.90);
  const boxes = texts.map((el) => ({ el, rect: el.getBoundingClientRect() }));
  const sizes = texts.map((el) => {
    const ctm = el.getScreenCTM();
    return { text: el.textContent.trim().replace(/\\s+/g, ' '), size: ctm ? parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d) : 0 };
  });
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i].rect, b = boxes[j].rect;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) {
      overlaps.push([boxes[i].el.textContent.trim(), boxes[j].el.textContent.trim()]);
    }
  }
  const svgRect = svg.getBoundingClientRect();
  const overflow = boxes.filter(({ rect }) => rect.left < svgRect.left - 1 || rect.right > svgRect.right + 1).map(({ el, rect }) => ({
    text: el.textContent.trim(), by: Math.max(svgRect.left - rect.left, rect.right - svgRect.right),
  }));
  return {
    step: Number(root.getAttribute('data-animation-step')) + 1,
    phase: Number(root.getAttribute('data-animation-phase')),
    finalPhase: Number(root.getAttribute('data-animation-final-phase')),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    deepExpanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
    visibleTexts: texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
    mechanism: { texts: texts.map((el) => el.textContent.trim()), shapes: shapes.map((el) => el.outerHTML) },
    minFont: sizes.length ? Math.min(...sizes.map((item) => item.size)) : 0,
    minFontText: sizes.sort((a, b) => a.size - b.size)[0]?.text || '',
    overlaps, overflow,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openStep(page, lang, step, entry) {
  const url = `${base}/ml-sys/ch/07-weight-updates/?step=${entry === 'direct' ? step : step - 1}`;
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  await page.goto(url);
  await page.evaluate(`(() => { const b = document.querySelector('button.deep'); if (b?.getAttribute('aria-expanded') === 'true') b.click(); })()`);
  await sleep(400);
  if (entry === 'previous') {
    await page.press('ArrowRight');
    await sleep(250);
  }
}

async function capture(page, combo, step, phase) {
  const target = String(phase);
  for (let i = 0; i < 200; i++) {
    const current = await page.evaluate(`document.querySelector('.viz')?.getAttribute('data-animation-phase')`);
    if (current === target) break;
    await sleep(50);
  }
  await sleep(350);
  const state = await page.evaluate(inspect);
  const name = `${combo.lang}-${combo.width}-${combo.entry}-s${step}-p${phase}`;
  check(!state.missing, `${name}: viz missing`);
  if (state.missing) return null;
  check(state.step === step && state.phase === phase && state.finalPhase === counts[step] - 1 && state.counter === `${String(step).padStart(2, '0')} / 08`, `${name}: bad identity ${JSON.stringify({ step: state.step, phase: state.phase, finalPhase: state.finalPhase, counter: state.counter })}`);
  check(state.deepExpanded === 'false', `${name}: deep drawer covered the stage`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont} on ${state.minFontText}`);
  check(!state.overlaps.length && !state.overflow.length && !state.pageOverflow, `${name}: geometry failed ${JSON.stringify({ overlaps: state.overlaps, overflow: state.overflow, pageOverflow: state.pageOverflow })}`);
  if (step === 2) {
    const joined = state.visibleTexts.join(' ');
    for (const forbidden of ['process group', 'local shard', 'update channel', 'DISTRIBUTED', 'TENSOR', 'handle']) {
      check(!joined.toLowerCase().includes(forbidden.toLowerCase()), `${name}: removed term remains: ${forbidden}`);
    }
  }
  const signature = hash(state.mechanism);
  const png = await page.screenshot();
  writeFileSync(join(out, `${name}.png`), png);
  const record = { name, lang: combo.lang, width: combo.width, entry: combo.entry, step, phase, signature, ...state, mechanism: undefined, pngMd5: createHash('md5').update(png).digest('hex') };
  states.push(record);
  return record;
}

async function captureDeep(page, lang, step) {
  await page.evaluate(`(() => { const b = document.querySelector('button.deep'); if (b?.getAttribute('aria-expanded') !== 'true') b.click(); })()`);
  await sleep(450);
  const deep = await page.evaluate(`(() => {
    const body = document.querySelector('.deep-body');
    return {
      expanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
      counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
      text: body?.textContent.replace(/\\s+/g, ' ').trim() || '',
      katexErrors: document.querySelectorAll('.deep-body .katex-error').length,
      rawMath: body?.textContent.includes('$$') || false,
      overflow: body ? body.scrollWidth - body.clientWidth : null,
    };
  })()`);
  const name = `${lang}-deep-s${step}`;
  check(deep.expanded === 'true' && deep.counter === `${String(step).padStart(2, '0')} / 08`, `${name}: wrong open state`);
  check(deep.text && !deep.katexErrors && !deep.rawMath && deep.overflow <= 1, `${name}: rendering failed ${JSON.stringify({ ...deep, text: undefined })}`);
  for (const text of deepRequired[lang][step]) check(deep.text.includes(text), `${name}: missing ${text}`);
  const png = await page.screenshot();
  writeFileSync(join(out, `${name}.png`), png);
  deepStates.push({ name, lang, step, ...deep, text: undefined, pngMd5: createHash('md5').update(png).digest('hex') });
}

let browser;
try {
  browser = await launch({ width: 1440, height: 900 });
  for (const step of selected) {
    for (const lang of ['en', 'zh']) for (const width of [1440, 390]) {
      if (lang === 'en' && width === 390 && step !== 6) continue;
      for (const entry of ['direct', 'previous']) {
        const combo = { lang, width, entry };
        const page = await browser.tab({ width, height: width === 390 ? 1400 : 900, mobile: width === 390 });
        await openStep(page, lang, step, entry);
        let previous = null;
        for (let phase = 0; phase < counts[step]; phase++) {
          const record = await capture(page, combo, step, phase);
          if (record && previous) check(record.signature !== previous.signature, `${record.name}: mechanism did not change`);
          if (record) previous = record;
        }
        if (previous) {
          const finalRequired = step === 5 && width === 390
            ? { en: ['bucket 1 cleared', 'bucket 2 is on the GPU'], zh: ['第 1 桶已清空', '第 2 桶在 GPU 上'] }[lang]
            : required[lang][step];
          for (const text of finalRequired) check(previous.visibleTexts.some((line) => line.includes(text)), `${previous.name}: missing final text ${text}`);
        }
        await page.close();
      }
    }
    for (const lang of ['en', 'zh']) {
      const page = await browser.tab({ width: 1440, height: 900 });
      await openStep(page, lang, step, 'direct');
      await captureDeep(page, lang, step);
      await page.close();
    }
  }
} finally {
  browser?.close();
}

const transitions = states.filter((state) => state.phase > 0);
const expectedStates = selected.reduce((sum, step) => sum + counts[step] * (step === 6 ? 8 : 6), 0);
const summary = {
  steps: selected,
  states: states.length,
  expectedStates,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state, index) => {
    const previous = states[states.indexOf(state) - 1];
    return previous && previous.step === state.step && previous.lang === state.lang && previous.width === state.width && previous.entry === state.entry && previous.signature !== state.signature;
  }).length,
  deepStates: deepStates.length,
  uniquePngHashes: new Set(states.map((state) => state.pngMd5)).size,
  minFont: states.length ? Math.min(...states.map((state) => state.minFont)) : 0,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
  failures,
};
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, summary, states, deepStates }, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (failures.length || states.length !== expectedStates || deepStates.length !== selected.length * 2) process.exit(1);
