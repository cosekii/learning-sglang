// Verify ML-47's producer chain across phases, languages, viewports, entries, and deep dives.
// Start the dev server, then run `BASE=http://localhost:4321/learning-sglang node .bot/out/ml47-producer-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4321/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml47-producer-audit';
const states = [];
const deepStates = [];
const failures = [];
const configs = [3, 4, 5].map((step) => ({ step, phases: 5, counter: `0${step} / 08` }));
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
  const cardOverflow = boxes.filter(({ el, rect }) => {
    const first = el.parentElement?.firstElementChild;
    if (first?.tagName !== 'rect') return false;
    const card = first.getBoundingClientRect();
    return rect.left < card.left - 1 || rect.right > card.right + 1 || rect.top < card.top - 1 || rect.bottom > card.bottom + 1;
  }).map(({ el }) => el.textContent.trim());
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
    overlaps, overflow, cardOverflow,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openStep(page, cfg, lang, entry) {
  const url = `${base}/ml-sys/ch/12-rl-speculative-decoding/?step=${entry === 'direct' ? cfg.step : cfg.step - 1}`;
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

function checkProducer(cfg, combo, phase, state, name) {
  const has = (text) => state.visibleTexts.includes(text);
  const mtpTitle = combo.lang === 'en' ? 'MTP LAYER' : 'MTP 层';
  check(!has('PREDICTION TASK') && !has('预测任务') && !has('DRAFT LAYER') && !has('DRAFT 层'), `${name}: old producer label remains`);
  if (cfg.step === 3) {
    check(has(mtpTitle) === (phase >= 3), `${name}: MTP layer appears in the wrong phase`);
    if (phase >= 3) {
      check(has('draft_hidden_state'), `${name}: draft hidden state is missing`);
      check(has(combo.lang === 'en' ? 'new draft notes' : 'draft 的新笔记'), `${name}: plain-language output is missing`);
    }
    if (phase === 4) {
      const chain = combo.width === 390
        ? (combo.lang === 'en' ? 'join(h(a), e(b)) → MTP → draft_hidden_state' : 'join(h(a), e(b)) → MTP → draft_hidden_state')
        : (combo.lang === 'en' ? 'join(h(a), e(b)) → MTP layer → draft_hidden_state' : 'join(h(a), e(b)) → MTP 层 → draft_hidden_state');
      check(has(chain), `${name}: visible input-to-output chain is missing`);
    }
  } else if (cfg.step === 4) {
    check(has(combo.lang === 'en' ? 'SHARED LM HEAD' : '共享 LM HEAD') === (phase >= 2), `${name}: shared LM head appears in the wrong phase`);
    if (phase >= 2) {
      check(has(combo.lang === 'en' ? 'draft scores' : 'draft 分数'), `${name}: draft scores are missing`);
      check(has(combo.lang === 'en' ? 'reads draft_hidden_state' : '读取 draft_hidden_state'), `${name}: score input is missing`);
    }
    if (phase === 4) {
      check(state.visibleTexts.some((text) => text.includes('draft_hidden_state →') && text.includes('LM head →')), `${name}: hidden-state-to-scores chain is missing`);
      check(state.visibleTexts.some((text) => text.includes('LM head =') && text.includes(combo.lang === 'en' ? 'token scorer shared by target and draft' : 'target 和 draft 共用')), `${name}: LM-head definition is missing`);
    }
  } else {
    check(has(mtpTitle) === (phase >= 1), `${name}: MTP layer appears in the wrong gradient phase`);
    if (phase === 4) {
      check(state.visibleTexts.some((text) => text.includes('draft_hidden_state →') && text.includes('LM head →')), `${name}: forward chain does not match Steps 3 and 4`);
      check(state.visibleTexts.some((text) => text.startsWith('CE → MTP')), `${name}: gradient route does not name the MTP layer`);
    }
  }
}

async function capture(page, cfg, combo, phase) {
  const name = `s${cfg.step}-${combo.lang}-${combo.width}-${combo.entry}-p${phase}`;
  let state;
  for (let i = 0; i < 200; i++) {
    state = await page.evaluate(inspect);
    if (state.step === cfg.step && state.phase === phase && state.counter === cfg.counter) break;
    await sleep(50);
  }
  await sleep(200);
  state = await page.evaluate(inspect);
  check(!state.missing, `${name}: viz missing`);
  if (state.missing) return null;
  check(state.step === cfg.step && state.phase === phase && state.finalPhase === cfg.phases - 1 && state.counter === cfg.counter, `${name}: bad identity ${JSON.stringify({ step: state.step, phase: state.phase, finalPhase: state.finalPhase, counter: state.counter })}`);
  check(state.deepExpanded === 'false', `${name}: deep drawer covered the stage`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont} on ${state.minFontText}`);
  const cardOverflow = state.cardOverflow;
  check(!state.overlaps.length && !state.overflow.length && !cardOverflow.length && !state.pageOverflow, `${name}: geometry failed ${JSON.stringify({ overlaps: state.overlaps, overflow: state.overflow, cardOverflow, pageOverflow: state.pageOverflow })}`);
  checkProducer(cfg, combo, phase, state, name);
  const signature = hash(state.mechanism);
  const png = await page.screenshot();
  const filename = `${name}.png`;
  writeFileSync(join(out, filename), png);
  const record = { name, step: cfg.step, lang: combo.lang, width: combo.width, entry: combo.entry, phase, signature, ...state, mechanism: undefined, pngMd5: createHash('md5').update(png).digest('hex') };
  states.push(record);
  return record;
}

async function captureDeep(page, cfg, lang, width) {
  await openStep(page, cfg, lang, 'direct');
  for (let i = 0; i < 200; i++) {
    const current = await page.evaluate(`document.querySelector('.viz')?.getAttribute('data-animation-phase')`);
    if (current === String(cfg.phases - 1)) break;
    await sleep(50);
  }
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
      wide: body ? [...body.querySelectorAll('*')].filter((el) => {
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.closest('.katex-mathml');
      }).map((el) => ({
        tag: el.tagName, className: String(el.className), text: el.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 120),
        scroll: el.scrollWidth - el.clientWidth,
        right: el.getBoundingClientRect().right - body.getBoundingClientRect().right,
      })).filter((item) => item.scroll > 1 || item.right > 1).slice(0, 20) : [],
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  })()`);
  const stage = await page.evaluate(inspect);
  const name = `s${cfg.step}-${lang}-${width}-deep`;
  check(deep.expanded === 'true' && deep.counter === cfg.counter, `${name}: wrong open state`);
  check(deep.text && !deep.katexErrors && !deep.rawMath && deep.overflow <= 1 && !deep.pageOverflow, `${name}: rendering failed ${JSON.stringify({ ...deep, text: undefined })}`);
  check(deep.text.includes('draft_hidden_state'), `${name}: deep dive lost the draft hidden state`);
  if (cfg.step === 3) {
    check(deep.text.includes(lang === 'en' ? 'MTP-layer output in this step' : '本步 MTP 层的输出'), `${name}: MTP producer is not defined`);
  } else if (cfg.step === 4) {
    check(deep.text.includes(lang === 'en' ? 'token scorer used by both target and draft' : 'target 和 draft 共用的 token 打分器'), `${name}: shared LM head is not explained`);
  } else {
    check(deep.text.includes(lang === 'en' ? 'The MTP hidden output, draft_hidden_state, is not detached' : 'hidden 输出 draft_hidden_state 没有 detach'), `${name}: detach boundary lost the named hidden state`);
  }
  const png = await page.screenshot();
  const filename = `${name}.png`;
  writeFileSync(join(out, filename), png);
  deepStates.push({ name, step: cfg.step, lang, width, ...deep, text: undefined, stageMinFont: stage.minFont, stageMinFontText: stage.minFontText, pngMd5: createHash('md5').update(png).digest('hex') });
}

let browser;
try {
  browser = await launch({ width: 1440, height: 900 });
  for (const cfg of configs) {
    for (const combo of [{ lang: 'en', width: 1440 }, { lang: 'zh', width: 1440 }, { lang: 'zh', width: 390 }]) {
      for (const entry of ['direct', 'previous']) {
        const page = await browser.tab({ width: combo.width, height: combo.width === 390 ? 1400 : 900, mobile: combo.width === 390 });
        await openStep(page, cfg, combo.lang, entry);
        let previous = null;
        for (let phase = 0; phase < cfg.phases; phase++) {
          const record = await capture(page, cfg, { ...combo, entry }, phase);
          if (record && previous) check(record.signature !== previous.signature, `${record.name}: mechanism did not change`);
          if (record) previous = record;
        }
        await page.close();
      }
    }
    for (const lang of ['en', 'zh']) for (const width of [1440, 360, 390, 430]) {
      const page = await browser.tab({ width, height: width === 1440 ? 900 : 1400, mobile: width !== 1440 });
      await captureDeep(page, cfg, lang, width);
      await page.close();
    }
  }
} finally {
  browser?.close();
}

const transitions = states.filter((state) => state.phase > 0);
const summary = {
  states: states.length,
  expectedStates: 90,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state) => {
    const previous = states[states.indexOf(state) - 1];
    return previous && previous.step === state.step && previous.lang === state.lang && previous.width === state.width && previous.entry === state.entry && previous.signature !== state.signature;
  }).length,
  deepStates: deepStates.length,
  uniquePngHashes: new Set([...states, ...deepStates].map((state) => state.pngMd5)).size,
  minFont: states.length ? Math.min(...states.map((state) => state.minFont)) : 0,
  deepStageMinFont: deepStates.length ? Math.min(...deepStates.map((state) => state.stageMinFont)) : 0,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
  cardOverflow: states.reduce((sum, state) => sum + state.cardOverflow.length, 0),
  failures,
};
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, summary, states, deepStates }, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (failures.length || states.length !== 90 || summary.changedTransitions !== 72 || deepStates.length !== 24) process.exit(1);
