import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4321/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml48-step5-audit';
const states = [];
const deepStates = [];
const failures = [];
mkdirSync(out, { recursive: true });
const check = (condition, message) => { if (!condition) failures.push(message); };

const inspect = `(() => {
  const root = document.querySelector('.viz');
  const svg = root?.querySelector('svg');
  if (!root || !svg) return { missing: true };
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    for (let node = el; node instanceof SVGElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    }
    return true;
  };
  const texts = [...svg.querySelectorAll('text')].filter(visible).map((el) => {
    const rect = el.getBoundingClientRect();
    const ctm = el.getScreenCTM();
    const card = el.parentElement?.firstElementChild?.tagName === 'rect' ? el.parentElement.firstElementChild.getBoundingClientRect() : null;
    return {
      text: el.textContent.trim().replace(/\\s+/g, ' '),
      left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      size: ctm ? parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d) : 0,
      card: card ? { left: card.left, right: card.right, top: card.top, bottom: card.bottom } : null,
    };
  });
  const svgRect = svg.getBoundingClientRect();
  const overflow = texts.filter((t) => t.left < svgRect.left - 1 || t.right > svgRect.right + 1).map((t) => t.text);
  const cardOverflow = texts.filter((t) => t.card && (t.left < t.card.left - 1 || t.right > t.card.right + 1 || t.top < t.card.top - 1 || t.bottom > t.card.bottom + 1)).map((t) => t.text);
  const overlaps = [];
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push([a.text, b.text]);
  }
  return {
    step: root.getAttribute('data-animation-step'), phase: root.getAttribute('data-animation-phase'),
    finalPhase: root.getAttribute('data-animation-final-phase'),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    caption: document.querySelector('.caption')?.textContent.trim().replace(/\\s+/g, ' ') || '',
    deepExpanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
    texts: texts.map((t) => t.text), minFont: texts.length ? Math.min(...texts.map((t) => t.size)) : 0,
    overflow, cardOverflow, overlaps,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openStep(page, lang, entry) {
  const url = `${base}/ml-sys/ch/08-fsdp2-training-backend/?step=${entry === 'direct' ? 5 : 4}`;
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  await page.goto(url);
  await sleep(400);
  if (entry === 'previous') { await page.press('ArrowRight'); await sleep(250); }
}

async function capture(page, combo, phase) {
  const name = `${combo.lang}-${combo.width}-${combo.entry}-p${phase}`;
  let state;
  for (let i = 0; i < 200; i++) {
    state = await page.evaluate(inspect);
    if (state.step === '4' && state.phase === String(phase) && state.counter === '05 / 07') break;
    await sleep(50);
  }
  await sleep(150);
  state = await page.evaluate(inspect);
  check(state.step === '4' && state.phase === String(phase) && state.finalPhase === '5' && state.counter === '05 / 07', `${name}: wrong identity`);
  check(state.deepExpanded === 'false', `${name}: deep drawer is open`);
  check(state.caption.toLowerCase().includes(combo.lang === 'en' ? 'if enabled' : '启用时'), `${name}: caption makes offload unconditional`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont}`);
  check(!state.overflow.length && !state.overlaps.length && !state.pageOverflow, `${name}: stage geometry failed ${JSON.stringify({ overflow: state.overflow, overlaps: state.overlaps })}`);
  check(!state.cardOverflow.length, `${name}: card overflow ${state.cardOverflow.join('|')}`);
  const compact = state.texts.join('|').replace(/\s+/g, '').toLowerCase();
  const required = [
    [combo.lang === 'en' ? 'rule' : '规则', combo.lang === 'en' ? 'rankcount' : 'rank数', combo.lang === 'en' ? 'records' : '记录', 'r/b'],
    [combo.lang === 'en' ? 'pack1' : '第1包', '-0.4490', 'g1', combo.width === 1440 ? 'w0' : (combo.lang === 'en' ? 'oldweights' : '旧权重')],
    [combo.lang === 'en' ? 'pack2' : '第2包', '-0.9354', 'g2', 'g1+g2', combo.width === 1440 ? 'w0' : (combo.lang === 'en' ? 'oldweights' : '旧权重')],
    ['grad_accum=[2]', 'optimizer.step', combo.width === 1440 ? 'w1' : (combo.lang === 'en' ? 'newweights' : '新权重'), 'zero_grad'],
    ['offload_train', 'gpu→cpu'],
    ['update_weights', combo.width === 1440 ? (combo.lang === 'en' ? 'exportw1only' : '只导出w1') : (combo.lang === 'en' ? 'newweightsonly' : '只导出新权重'), combo.lang === 'en' ? 'step7' : '第7步'],
  ][phase];
  for (const text of required) check(compact.includes(text), `${name}: missing ${text}`);
  if (phase < 3) {
    check(!compact.includes('w1'), `${name}: weights changed before the optimizer boundary`);
    check(!compact.includes('optimizer.step'), `${name}: optimizer ran before Pack 2 finished`);
  }
  if (phase === 5) {
    const ordered = combo.lang === 'en'
      ? ['rule', 'pack1', 'pack2', 'grad_accum', 'gpu→cpu', 'update_weights']
      : ['规则', '第1包', '第2包', 'grad_accum', 'gpu→cpu', 'update_weights'];
    const positions = ordered.map((needle) => compact.indexOf(needle));
    check(positions.every((position, i) => position >= 0 && (i === 0 || position > positions[i - 1])), `${name}: wrong training order ${JSON.stringify(positions)}`);
    check(compact.includes('r/b×1/r=1/b'), `${name}: missing reduction identity`);
    check(compact.includes('fp32=32-bit') || compact.includes('fp32=32位'), `${name}: FP32 is not explained`);
    check(compact.includes(combo.lang === 'en' ? 'separate' : '独立'), `${name}: DP8 view is not marked separate`);
    check(compact.includes('8gb÷8=') && compact.includes('1gb'), `${name}: missing gradient shard arithmetic`);
    check(!compact.includes('gradientsstayintraining') && !compact.includes('梯度留在训练端'), `${name}: cleared gradients are said to remain`);
  }
  states.push({ name, ...state });
  writeFileSync(join(out, `${name}.png`), await page.screenshot());
  return compact;
}

async function captureDeep(page, lang, width) {
  await openStep(page, lang, 'direct');
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate(`document.querySelector('.viz')?.getAttribute('data-animation-phase')`) === '5') break;
    await sleep(50);
  }
  await page.evaluate(`(() => { const b = document.querySelector('button.deep'); if (b?.getAttribute('aria-expanded') !== 'true') b.click(); })()`);
  await sleep(450);
  const state = await page.evaluate(`(() => {
    const body = document.querySelector('.deep-body');
    return {
      expanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
      counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
      text: body?.textContent.replace(/\\s+/g, ' ').trim() || '',
      overflow: body ? body.scrollWidth - body.clientWidth : null,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      katexErrors: document.querySelectorAll('.deep-body .katex-error').length,
      rawMath: body?.textContent.includes('$$') || false,
      mathOverflow: body ? [...body.querySelectorAll('.katex-display')].map((el) => ({ client: el.clientWidth, scroll: el.scrollWidth })) : [],
      paragraphOverflow: body ? [...body.querySelectorAll('p')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => ({ client: el.clientWidth, scroll: el.scrollWidth, text: el.textContent?.slice(0, 80) })) : [],
    };
  })()`);
  const name = `${lang}-${width}-deep`;
  const required = ['train.py:92-94', 'grad_accum=[2]', 'optimizer.step', '0.9354'];
  check(state.expanded === 'true' && state.counter === '05 / 07', `${name}: wrong open state`);
  check(!state.katexErrors && !state.rawMath && state.overflow <= 1 && !state.pageOverflow, `${name}: rendering failed ${state.overflow}`);
  check(state.mathOverflow.every((el) => el.scroll <= el.client + 1), `${name}: formula clipped ${JSON.stringify(state.mathOverflow)}`);
  check(!state.paragraphOverflow.length, `${name}: paragraph clipped ${JSON.stringify(state.paragraphOverflow)}`);
  for (const text of required) check(state.text.includes(text), `${name}: missing ${text}`);
  const stage = await page.evaluate(inspect);
  deepStates.push({ name, ...state, text: undefined, stageMinFont: stage.minFont });
  writeFileSync(join(out, `${name}.png`), await page.screenshot());
}

const browser = await launch({ width: 1440, height: 900 });
try {
  for (const combo of [{ lang: 'en', width: 1440 }, { lang: 'zh', width: 1440 }, { lang: 'en', width: 390 }, { lang: 'zh', width: 390 }]) {
    for (const entry of ['direct', 'previous']) {
      const page = await browser.tab({ width: combo.width, height: combo.width === 390 ? 1400 : 900, mobile: combo.width === 390 });
      await openStep(page, combo.lang, entry);
      let previous;
      for (let phase = 0; phase < 6; phase++) {
        const signature = await capture(page, { ...combo, entry }, phase);
        if (previous !== undefined) check(signature !== previous, `${combo.lang}-${combo.width}-${entry}-p${phase}: static transition`);
        previous = signature;
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
  browser.close();
}

const report = {
  url: `${base}/ml-sys/ch/08-fsdp2-training-backend/?step=5`,
  states: states.length,
  mechanismTransitions: states.length / 6 * 5,
  deepStates: deepStates.length,
  minStageFont: Math.min(...states.map((state) => state.minFont)),
  failures,
  statesDetail: states,
  deepDetail: deepStates,
};
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ states: report.states, mechanismTransitions: report.mechanismTransitions, deepStates: report.deepStates, minStageFont: report.minStageFont, failures }, null, 2));
if (failures.length) process.exit(1);
