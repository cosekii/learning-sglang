// Verify ML-18 with phase, viewport, entry, deep-dive, and geometry checks.
// Start the dev server, then run `BASE=http://127.0.0.1:4512/learning-sglang node .bot/out/ml18-step5-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4512/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml18-step5-audit';
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
    caption: document.querySelector('.caption')?.textContent.trim().replace(/\\s+/g, ' '),
    deepExpanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
    visibleTexts: texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
    mechanism: { texts: texts.map((el) => el.textContent.trim()), shapes: shapes.map((el) => el.outerHTML) },
    minFont: sizes.length ? Math.min(...sizes.map((item) => item.size)) : 0,
    minFontText: sizes.sort((a, b) => a.size - b.size)[0]?.text || '',
    overlaps, overflow,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openStep(page, lang, entry) {
  const url = `${base}/ml-sys/ch/12-rl-speculative-decoding/?step=${entry === 'direct' ? 5 : 4}`;
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
  check(state.step === 5 && state.phase === phase && state.finalPhase === 4 && state.counter === '05 / 08', `${name}: bad identity ${JSON.stringify({ step: state.step, phase: state.phase, finalPhase: state.finalPhase, counter: state.counter })}`);
  check(state.deepExpanded === 'false', `${name}: deep drawer covered the stage`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont} on ${state.minFontText}`);
  check(!state.overlaps.length && !state.overflow.length && !state.pageOverflow, `${name}: geometry failed ${JSON.stringify({ overlaps: state.overlaps, overflow: state.overflow, pageOverflow: state.pageOverflow })}`);
  if (combo.lang === 'zh') {
    check(state.caption.includes('辅助 CE') && state.caption.includes('共享表'), `${name}: Chinese caption lost the shared-table boundary ${state.caption}`);
  } else {
    check(state.caption.includes('shared tables') && state.caption.includes('Main RL'), `${name}: English caption lost the shared-table boundary ${state.caption}`);
  }
  if (phase === 4) {
    const required = combo.width === 390
      ? (combo.lang === 'en'
        ? ['SHARED TABLES', 'embedding · LM head', 'forward uses current values', 'IDs → embedding → model numbers', 'hidden states → LM head → scores', 'CE ✕→ target trunk', 'CE ✕→ shared tables', 'Main RL updates target + shared tables']
        : ['共享表', '前向使用当前数值', 'token ID → embedding → 模型数列', 'hidden state → LM head → 分数', 'CE ✕→ target 主干', 'CE ✕→ 共享表', '主 RL 更新 target 和共享表'])
      : (combo.lang === 'en'
        ? ['SHARED TABLES', 'embedding · LM head', 'forward uses current values', 'forward: token IDs → embedding → model numbers', 'forward: hidden states → LM head → token scores', 'CE ✕→ target trunk', 'CE ✕→ shared embedding + LM head', 'main RL updates target + shared tables']
        : ['共享表', '前向使用当前数值', '前向：token ID → embedding → 模型数列', '前向：hidden state → LM head → token 分数', 'CE ✕→ target 主干', 'CE ✕→ 共享 embedding 和 LM head', '主 RL 仍更新 target 和共享表']);
    for (const text of required) check(state.visibleTexts.includes(text), `${name}: missing stage text ${text}`);
  }
  const signature = hash(state.mechanism);
  const png = await page.screenshot();
  const filename = `${name}.png`;
  writeFileSync(join(out, filename), png);
  const record = { name, lang: combo.lang, width: combo.width, entry: combo.entry, step: 5, phase, signature, ...state, mechanism: undefined, pngMd5: createHash('md5').update(png).digest('hex') };
  states.push(record);
  return record;
}

async function captureDeep(page, lang, width) {
  await openStep(page, lang, 'direct');
  await sleep(5300);
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
      wide: body ? [...body.querySelectorAll('*')].map((el) => ({
        tag: el.tagName, className: String(el.className), text: el.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 120),
        scroll: el.scrollWidth - el.clientWidth,
        right: el.getBoundingClientRect().right - body.getBoundingClientRect().right,
      })).filter((item) => item.scroll > 1 || item.right > 1).slice(0, 20) : [],
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  })()`);
  const stage = await page.evaluate(inspect);
  const name = `${lang}-${width}-deep`;
  check(deep.expanded === 'true' && deep.counter === '05 / 08', `${name}: wrong open state`);
  check(deep.text && !deep.katexErrors && !deep.rawMath && deep.overflow <= 1 && !deep.pageOverflow, `${name}: rendering failed ${JSON.stringify({ ...deep, text: undefined })}`);
  const required = lang === 'en'
    ? ['shared-tables card', 'token IDs into model numbers', 'hidden states into token scores', 'two distinct parameter sets', 'make_viewless_tensor', 'functional_call', 'do not mutate the original parameters']
    : ['共享表卡片', 'token ID 变成模型数列', 'hidden state 变成 token 分数', '两组不同的参数', 'make_viewless_tensor', 'functional_call', '不修改原参数'];
  for (const text of required) check(deep.text.includes(text), `${name}: missing deep text ${text}`);
  const png = await page.screenshot();
  const filename = `${name}.png`;
  writeFileSync(join(out, filename), png);
  deepStates.push({ name, lang, width, ...deep, text: undefined, stageMinFont: stage.minFont, stageMinFontText: stage.minFontText, pngMd5: createHash('md5').update(png).digest('hex') });
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
      for (let phase = 0; phase < 5; phase++) {
        const record = await capture(page, combo, phase);
        if (record && previous) check(record.signature !== previous.signature, `${record.name}: mechanism did not change`);
        if (record) previous = record;
      }
      await page.close();
    }
  }
  for (const lang of ['en', 'zh']) for (const width of [1440, 360, 390, 430]) {
    const page = await browser.tab({ width, height: width === 1440 ? 900 : 1400, mobile: width !== 1440 });
    await captureDeep(page, lang, width);
    await page.close();
  }
} finally {
  browser?.close();
}

const transitions = states.filter((state) => state.phase > 0);
const summary = {
  states: states.length,
  expectedStates: 40,
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
if (failures.length || states.length !== 40 || deepStates.length !== 8) process.exit(1);
