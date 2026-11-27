// Verify ML-52 with phase, viewport, entry, deep-dive, geometry, and row-lifetime checks.
// Start the dev server, then run `BASE=http://127.0.0.1:4505/learning-sglang node .bot/out/ml52-step5-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4505/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml52-step5-audit';
const states = [];
const deepStates = [];
const failures = [];
const keepPng = new Set([
  'en-1440-direct-s5-p0.png', 'en-1440-direct-s5-p1.png',
  'en-1440-direct-s5-p2.png', 'en-1440-direct-s5-p3.png',
  'zh-390-direct-s5-p0.png', 'zh-390-direct-s5-p3.png',
  'en-1440-deep.png', 'zh-390-deep.png',
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
  const rows = [...svg.querySelectorAll('rect[data-row]')].filter((el) => opacity(el) >= 0.90).map((el) => ({
    card: Number(el.closest('[data-card]')?.getAttribute('data-card')),
    x: Number(el.getAttribute('x')), y: Number(el.getAttribute('y')),
    width: Number(el.getAttribute('width')), height: Number(el.getAttribute('height')), fill: el.getAttribute('fill'),
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
    overlaps, overflow, rows,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openStep(page, lang, entry) {
  const url = `${base}/ml-sys/ch/13-multi-turn-agent-rl/?step=${entry === 'direct' ? 5 : 4}`;
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
  const name = `${combo.lang}-${combo.width}-${combo.entry}-s5-p${phase}`;
  check(!state.missing, `${name}: viz missing`);
  if (state.missing) return null;
  check(state.step === 5 && state.phase === phase && state.finalPhase === 3 && state.counter === '05 / 08', `${name}: bad identity ${JSON.stringify({ step: state.step, phase: state.phase, finalPhase: state.finalPhase, counter: state.counter })}`);
  check(state.deepExpanded === 'false', `${name}: deep drawer covered the stage`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont} on ${state.minFontText}`);
  check(!state.overlaps.length && !state.overflow.length && !state.pageOverflow, `${name}: geometry failed ${JSON.stringify({ overlaps: state.overlaps, overflow: state.overflow, pageOverflow: state.pageOverflow })}`);
  check(state.rows.length === [6, 9, 12, 18][phase], `${name}: wrong visible row count ${state.rows.length}`);
  check(state.rows.every((row) => row.width === (combo.width === 390 ? 200 : 150) && row.height === (combo.width === 390 ? 6 : 8)), `${name}: rows do not share one scale`);
  if (phase === 3) {
    for (const card of [0, 1, 2]) check(state.rows.filter((row) => row.card === card).length === 6, `${name}: card ${card} does not show three inputs plus three outputs`);
  }
  const signature = hash(state.mechanism);
  const png = await page.screenshot();
  const filename = `${name}.png`;
  if (keepPng.has(filename)) writeFileSync(join(out, filename), png);
  const record = { name, lang: combo.lang, width: combo.width, entry: combo.entry, step: 5, phase, signature, ...state, mechanism: undefined, pngMd5: createHash('md5').update(png).digest('hex') };
  states.push(record);
  return record;
}

async function captureDeep(page, lang, width) {
  await openStep(page, lang, 'direct');
  await sleep(4300);
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
  const stage = await page.evaluate(inspect);
  const name = `${lang}-${width}-deep`;
  check(deep.expanded === 'true' && deep.counter === '05 / 08', `${name}: wrong open state`);
  check(deep.text && !deep.katexErrors && !deep.rawMath && deep.overflow <= 1 && !deep.pageOverflow, `${name}: rendering failed ${JSON.stringify({ ...deep, text: undefined })}`);
  const required = lang === 'en'
    ? ['The next turn and its new chunk are not drawn', 'fewer repeated copies', 'not a lower peak']
    : ['下一轮和它的新片段没有画出', '减少重复复制', '不说峰值下降'];
  for (const text of required) check(deep.text.includes(text), `${name}: missing ${text}`);
  const png = await page.screenshot();
  const filename = `${name}.png`;
  if (keepPng.has(filename)) writeFileSync(join(out, filename), png);
  deepStates.push({ name, lang, width, ...deep, text: undefined, stageMinFont: stage.minFont, stageMinFontText: stage.minFontText, pngMd5: createHash('md5').update(png).digest('hex') });
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
      for (let phase = 0; phase < 4; phase++) {
        const record = await capture(page, combo, phase);
        if (record && previous) check(record.signature !== previous.signature, `${record.name}: mechanism did not change`);
        if (record) previous = record;
      }
      if (previous) {
        const required = lang === 'en'
          ? ['CONCAT EVERY TURN', 'BUFFER, THEN CONCAT', 'WHILE CONCAT RUNS', 'next turn recopies all 3', 'old rows copied this once', 'inputs + output coexist', '2 + 1 + 3 = 6 rows']
          : ['每轮都拼接', '先存片段再拼接', '拼接进行时', '下一轮又复制这 3 行', '旧行只在这里复制一次', '输入和输出同时保留', '2 + 1 + 3 = 6 行'];
        for (const text of required) check(previous.visibleTexts.includes(text), `${previous.name}: missing final text ${text}`);
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
  expectedStates: 24,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state, index) => {
    const previous = states[states.indexOf(state) - 1];
    return previous && previous.lang === state.lang && previous.width === state.width && previous.entry === state.entry && previous.signature !== state.signature;
  }).length,
  deepStates: deepStates.length,
  uniquePngHashes: new Set(states.map((state) => state.pngMd5)).size,
  minFont: states.length ? Math.min(...states.map((state) => state.minFont)) : 0,
  deepStageMinFont: deepStates.length ? Math.min(...deepStates.map((state) => state.stageMinFont)) : 0,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
  failures,
};
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, summary, states, deepStates }, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (failures.length || states.length !== 24 || deepStates.length !== 4) process.exit(1);
