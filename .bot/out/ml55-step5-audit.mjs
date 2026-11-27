// Verify ML-55 with the exact bucket conversion order across phases, entries, languages, and deep dives.
// Start the dev server, then run `BASE=http://127.0.0.1:4510/learning-sglang node .bot/out/ml55-step5-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4510/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml55-step5-audit';
const states = [];
const deepStates = [];
const failures = [];
const operations = ['PP/EP broadcast', 'TP gather', 'unpad', 'HF layout', 'handles', 'ray.get', 'clear'];
const bucketIds = ['restored', 'pp-ep', 'tp', 'unpad', 'hf', 'handles', 'loaded', 'cleared'];
const bucketText = {
  en: [
    ['BUCKET 1 · ON GPU', 'source values + empty receivers'],
    ['BUCKET 1 · TP PIECES', 'every rank has its piece'],
    ['BUCKET 1 · FULL TENSOR', 'padding if present'],
    ['BUCKET 1 · UNPADDED', 'any padding removed'],
    ['BUCKET 1 · HF TENSORS', 'Hugging Face names + layout'],
    ['BUCKET 1 · HANDLES', 'GPU notes · converted tensors stay'],
    ['SGLANG · LOADED', 'ray.get returned · copy still alive'],
    ['BUCKET 1 · CLEARED', 'converted copy released'],
  ],
  zh: [
    ['第 1 桶 · 在 GPU 上', '源数值 + 空接收副本'],
    ['第 1 桶 · TP 分片', '每个 rank 都有 TP 分片'],
    ['第 1 桶 · 完整张量', '可能有 padding'],
    ['第 1 桶 · 已去 PADDING', '可能的 padding 已去掉'],
    ['第 1 桶 · HF 张量', 'Hugging Face 名称 + 布局'],
    ['第 1 桶 · 句柄', 'GPU 位置便签 · 张量仍保留'],
    ['SGLANG · 已装入', 'ray.get 已返回 · 副本仍保留'],
    ['BUCKET 1 · 已清空', '转换后的副本已释放'],
  ],
};
const expected = {
  en: [
    'empty copies → each rank\'s TP piece',
    'TP pieces → full tensor',
    'full tensor → any padding removed',
    'Hugging Face names + weight-table layout',
    'converted tensors stay + GPU notes',
    'wait until SGLang finishes loading',
    'converted copy → cleared',
  ],
  zh: [
    '空副本 → 每个 rank 的 TP 分片',
    'TP 分片 → 完整张量',
    '完整张量 → 去掉可能的 padding',
    'Hugging Face 名称和权重表布局',
    '张量仍保留 + GPU 位置便签',
    '等 SGLang 装入完成',
    '转换后的副本 → 清空',
  ],
};
mkdirSync(out, { recursive: true });
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const check = (condition, message) => { if (!condition) failures.push(message); };
const keepPng = (name, phase) => [1, 5, 9].includes(phase)
  || (name.startsWith('en-1440-direct') || name.startsWith('zh-390-direct'));

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
  const bucket = svg.querySelector('[data-bucket-state]');
  return {
    step: Number(root.getAttribute('data-animation-step')) + 1,
    phase: Number(root.getAttribute('data-animation-phase')),
    finalPhase: Number(root.getAttribute('data-animation-final-phase')),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    deepExpanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
    bucketState: bucket && opacity(bucket) >= 0.90 ? bucket.getAttribute('data-bucket-state') : null,
    visibleTexts: texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
    mechanism: { texts: texts.map((el) => el.textContent.trim()), shapes: shapes.map((el) => el.outerHTML) },
    minFont: sizes.length ? Math.min(...sizes.map((item) => item.size)) : 0,
    minFontText: sizes.sort((a, b) => a.size - b.size)[0]?.text || '',
    overlaps, overflow,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openStep(page, lang, entry) {
  const url = `${base}/ml-sys/ch/07-weight-updates/?step=${entry === 'direct' ? 5 : 4}`;
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

async function capture(page, combo, phase) {
  const target = String(phase);
  for (let i = 0; i < 200; i++) {
    const current = await page.evaluate(`document.querySelector('.viz')?.getAttribute('data-animation-phase')`);
    if (current === target) break;
    await sleep(50);
  }
  await sleep(250);
  const state = await page.evaluate(inspect);
  const name = `${combo.lang}-${combo.width}-${combo.entry}-s5-p${phase}`;
  check(!state.missing, `${name}: viz missing`);
  if (state.missing) return null;
  check(state.step === 5 && state.phase === phase && state.finalPhase === 9 && state.counter === '05 / 08', `${name}: bad identity ${JSON.stringify({ step: state.step, phase: state.phase, finalPhase: state.finalPhase, counter: state.counter })}`);
  check(state.deepExpanded === 'false', `${name}: deep drawer covered the stage`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont} on ${state.minFontText}`);
  check(!state.overlaps.length && !state.overflow.length && !state.pageOverflow, `${name}: geometry failed ${JSON.stringify({ overlaps: state.overlaps, overflow: state.overflow, pageOverflow: state.pageOverflow })}`);
  if (phase === 0) check(!state.bucketState, `${name}: bucket object appeared too early`);
  if (phase >= 1) {
    const index = Math.min(phase - 1, bucketIds.length - 1);
    check(state.bucketState === bucketIds[index], `${name}: bucket state ${state.bucketState}, expected ${bucketIds[index]}`);
    for (const text of bucketText[combo.lang][index]) check(state.visibleTexts.includes(text), `${name}: bucket object missing ${text}`);
  }
  for (let i = 0; i < operations.length; i++) {
    const visible = state.visibleTexts.includes(operations[i]);
    check(visible === (phase >= i + 2), `${name}: ${operations[i]} visibility is ${visible}, expected ${phase >= i + 2}`);
    if (phase >= i + 2) check(state.visibleTexts.includes(expected[combo.lang][i]), `${name}: missing ${expected[combo.lang][i]}`);
  }
  if (phase < 8) check(!state.visibleTexts.some((line) => line.includes('BUCKET 1 · CLEARED') || line.includes('BUCKET 1 · 已清空')), `${name}: bucket cleared too early`);
  if (phase >= 8) check(state.visibleTexts.some((line) => line.includes('BUCKET 1 · CLEARED') || line.includes('BUCKET 1 · 已清空')), `${name}: bucket not cleared`);
  if (phase < 9) check(!state.visibleTexts.some((line) => line.includes('BUCKET 2 · ON GPU') || line.includes('BUCKET 2 · 在 GPU 上')), `${name}: next bucket arrived too early`);
  if (phase === 9) {
    check(state.visibleTexts.some((line) => line.includes('BUCKET 2 · ON GPU') || line.includes('BUCKET 2 · 在 GPU 上')), `${name}: next bucket missing`);
    const positions = operations.map((op) => state.visibleTexts.indexOf(op));
    check(positions.every((position, i) => position >= 0 && (i === 0 || position > positions[i - 1])), `${name}: wrong conversion order ${JSON.stringify(positions)}`);
    const joined = state.visibleTexts.join(' ');
    for (const forbidden of ['assemble', 'arrange', '拼好', '排成']) check(!joined.includes(forbidden), `${name}: generic conversion wording remains: ${forbidden}`);
  }
  const signature = hash(state.mechanism);
  const png = await page.screenshot();
  const filename = `${name}.png`;
  if (keepPng(filename, phase)) writeFileSync(join(out, filename), png);
  const record = { name, lang: combo.lang, width: combo.width, entry: combo.entry, step: 5, phase, signature, ...state, mechanism: undefined, pngMd5: createHash('md5').update(png).digest('hex') };
  states.push(record);
  return record;
}

async function captureDeep(page, lang, width) {
  await openStep(page, lang, 'direct');
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
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  })()`);
  const name = `${lang}-${width}-deep`;
  check(deep.expanded === 'true' && deep.counter === '05 / 08', `${name}: wrong open state`);
  check(deep.text && !deep.katexErrors && !deep.rawMath && deep.overflow <= 1 && !deep.pageOverflow, `${name}: rendering failed ${JSON.stringify({ ...deep, text: undefined })}`);
  const required = lang === 'en'
    ? [...operations, 'empty receiving copies', 'unused extra positions', 'Bucket 2']
    : [...operations, '空接收副本', '无用的额外位置', '第 2 桶'];
  for (const text of required) check(deep.text.includes(text), `${name}: missing ${text}`);
  for (const forbidden of ['arranges', 'arrange', '排成 SGLang']) check(!deep.text.includes(forbidden), `${name}: generic conversion wording remains: ${forbidden}`);
  const png = await page.screenshot();
  writeFileSync(join(out, `${name}.png`), png);
  deepStates.push({ name, lang, width, ...deep, text: undefined, pngMd5: createHash('md5').update(png).digest('hex') });
}

let browser;
try {
  browser = await launch({ width: 1440, height: 900 });
  for (const lang of ['en', 'zh']) for (const width of [1440, 390]) {
    for (const entry of ['direct', 'previous']) {
      const combo = { lang, width, entry };
      const page = await browser.tab({ width, height: width === 390 ? 1400 : 900, mobile: width === 390 });
      await openStep(page, lang, entry);
      let previous = null;
      for (let phase = 0; phase < 10; phase++) {
        const record = await capture(page, combo, phase);
        if (record && previous) check(record.signature !== previous.signature, `${record.name}: mechanism did not change`);
        if (record) previous = record;
      }
      await page.close();
    }
  }
  for (const lang of ['en', 'zh']) for (const width of [1440, 390]) {
    const page = await browser.tab({ width, height: width === 390 ? 1400 : 900, mobile: width === 390 });
    await captureDeep(page, lang, width);
    await page.close();
  }
} finally {
  browser?.close();
}

const transitions = states.filter((state) => state.phase > 0);
const summary = {
  states: states.length,
  expectedStates: 80,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state, index) => {
    const previous = states[states.indexOf(state) - 1];
    return previous && previous.lang === state.lang && previous.width === state.width && previous.entry === state.entry && previous.signature !== state.signature;
  }).length,
  bucketStateChanges: transitions.filter((state) => {
    const previous = states[states.indexOf(state) - 1];
    return previous && previous.lang === state.lang && previous.width === state.width && previous.entry === state.entry && previous.bucketState !== state.bucketState;
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
if (failures.length || states.length !== 80 || deepStates.length !== 4) process.exit(1);
