// Verify ML-50 with phase, viewport, entry, deep-dive, and timing-bar checks.
// Start the dev server, then run `BASE=http://127.0.0.1:4502/learning-sglang node .bot/out/ml50-step7-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4502/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml50-step7-audit';
const states = [];
const deepStates = [];
const failures = [];
const keepPng = new Set([
  'en-1440-direct-s7-p2.png',
  'en-1440-direct-s7-p4.png',
  'en-1440-direct-s7-p5.png',
  'zh-390-direct-s7-p5.png',
  'en-1440-deep.png',
  'zh-390-deep.png',
]);
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
  const timingBars = [...svg.querySelectorAll('rect')].filter((el) => el.getAttribute('x') === '180' && ['82', '130', '178', '226'].includes(el.getAttribute('y')) && opacity(el) >= 0.90).map((el) => ({ y: Number(el.getAttribute('y')), width: Number(el.getAttribute('width')) }));
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
    overlaps, overflow, timingBars,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openStep(page, lang, entry) {
  const url = `${base}/ml-sys/ch/07-weight-updates/?step=${entry === 'direct' ? 7 : 6}`;
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
  await sleep(350);
  const state = await page.evaluate(inspect);
  const name = `${combo.lang}-${combo.width}-${combo.entry}-s7-p${phase}`;
  check(!state.missing, `${name}: viz missing`);
  if (state.missing) return null;
  check(state.step === 7 && state.phase === phase && state.finalPhase === 5 && state.counter === '07 / 08', `${name}: bad identity ${JSON.stringify({ step: state.step, phase: state.phase, finalPhase: state.finalPhase, counter: state.counter })}`);
  check(state.deepExpanded === 'false', `${name}: deep drawer covered the stage`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont} on ${state.minFontText}`);
  check(!state.overlaps.length && !state.overflow.length && !state.pageOverflow, `${name}: geometry failed ${JSON.stringify({ overlaps: state.overlaps, overflow: state.overflow, pageOverflow: state.pageOverflow })}`);
  if (phase === 5 && combo.width === 1440) {
    const expected = new Map([[82, 480], [130, 480 * 2.202 / 7.047], [178, 480 * 0.5 / 7.047], [226, 480 * 0.6 / 7.047]]);
    check(state.timingBars.length === 4, `${name}: expected four timing bars, got ${JSON.stringify(state.timingBars)}`);
    for (const bar of state.timingBars) check(Math.abs(bar.width - expected.get(bar.y)) < 0.01, `${name}: bar scale mismatch ${JSON.stringify(bar)}`);
  }
  const signature = hash(state.mechanism);
  const png = await page.screenshot();
  const filename = `${name}.png`;
  if (keepPng.has(filename)) writeFileSync(join(out, filename), png);
  const record = { name, lang: combo.lang, width: combo.width, entry: combo.entry, step: 7, phase, signature, ...state, mechanism: undefined, pngMd5: createHash('md5').update(png).digest('hex') };
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
  check(deep.expanded === 'true' && deep.counter === '07 / 08', `${name}: wrong open state`);
  check(deep.text && !deep.katexErrors && !deep.rawMath && deep.overflow <= 1 && !deep.pageOverflow, `${name}: rendering failed ${JSON.stringify({ ...deep, text: undefined })}`);
  const required = lang === 'en'
    ? ['first-communication', 'dist.barrier(device_ids=[0], group=pg)', 'CI', '0.5', '0.6']
    : ['首次通信', 'dist.barrier(device_ids=[0], group=pg)', '自动测试', '0.5', '0.6'];
  for (const text of required) check(deep.text.includes(text), `${name}: missing ${text}`);
  const png = await page.screenshot();
  const filename = `${name}.png`;
  if (keepPng.has(filename)) writeFileSync(join(out, filename), png);
  deepStates.push({ name, lang, width, ...deep, text: undefined, pngMd5: createHash('md5').update(png).digest('hex') });
}

let browser;
try {
  browser = await launch({ width: 1440, height: 900 });
  for (const lang of ['en', 'zh']) for (const width of [1440, 390]) {
    if (lang === 'en' && width === 390) continue;
    for (const entry of ['direct', 'previous']) {
      const combo = { lang, width, entry };
      const page = await browser.tab({ width, height: width === 390 ? 1400 : 900, mobile: width === 390 });
      await openStep(page, lang, entry);
      let previous = null;
      for (let phase = 0; phase < 6; phase++) {
        const record = await capture(page, combo, phase);
        if (record && previous) check(record.signature !== previous.signature, `${record.name}: mechanism did not change`);
        if (record) previous = record;
      }
      if (previous) {
        const required = width === 390
          ? { en: [], zh: ['之后的完整更新', '1B ≈ 0.5 秒 · 8B ≈ 0.6 秒', 'CI = 自动测试 · barrier 要传 device_ids=[0]'] }[lang]
          : { en: ['1B · AFTER WARM-UP', '≈ 0.5 s', '8B · AFTER WARM-UP', '≈ 0.6 s', 'CI = automated tests · barrier needs device_ids=[0]'], zh: ['1B · WARM-UP 后', '≈ 0.5 s', '8B · WARM-UP 后', '≈ 0.6 s', 'CI = 自动测试 · barrier 要传 device_ids=[0]'] }[lang];
        for (const text of required) check(previous.visibleTexts.some((line) => line.includes(text)), `${previous.name}: missing final text ${text}`);
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
  expectedStates: 36,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state, index) => {
    const previous = states[states.indexOf(state) - 1];
    return previous && previous.lang === state.lang && previous.width === state.width && previous.entry === state.entry && previous.signature !== state.signature;
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
if (failures.length || states.length !== 36 || deepStates.length !== 4) process.exit(1);
