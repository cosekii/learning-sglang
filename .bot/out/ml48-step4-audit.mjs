import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4325/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml48-step4-audit';
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
    deepExpanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
    texts: texts.map((t) => t.text), minFont: texts.length ? Math.min(...texts.map((t) => t.size)) : 0,
    overflow, cardOverflow, overlaps,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openStep(page, lang, entry) {
  const url = `${base}/ml-sys/ch/08-fsdp2-training-backend/?step=${entry === 'direct' ? 4 : 3}`;
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
    if (state.step === '3' && state.phase === String(phase) && state.counter === '04 / 07') break;
    await sleep(50);
  }
  await sleep(150);
  state = await page.evaluate(inspect);
  check(state.step === '3' && state.phase === String(phase) && state.finalPhase === '7' && state.counter === '04 / 07', `${name}: wrong identity`);
  check(state.deepExpanded === 'false', `${name}: deep drawer is open`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont}`);
  check(!state.overflow.length && !state.overlaps.length && !state.pageOverflow, `${name}: stage geometry failed`);
  check(!state.cardOverflow.length, `${name}: card overflow ${state.cardOverflow.join('|')}`);
  const compact = state.texts.join('|').replace(/\s+/g, '').toLowerCase();
  const required = [
    ['forward', '7gb+u', 'all-gather'],
    ['cu', '[0,2,4]', 'mask'],
    ['ratio', '+0.3365', '0.70'],
    ['advantage', '1.28', '0.80'],
    ['loss', '-1.1973', '+0.7483'],
    ['maskedmean', '-0.4490'],
    ['backward', 'grad_accum'],
    ['sleep', 'cpu', 'update_weights'],
  ][phase];
  for (const text of required) check(compact.includes(text), `${name}: missing ${text}`);
  states.push({ name, ...state });
  writeFileSync(join(out, `${name}.png`), await page.screenshot());
  return compact;
}

async function captureDeep(page, lang, width) {
  await openStep(page, lang, 'direct');
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate(`document.querySelector('.viz')?.getAttribute('data-animation-phase')`) === '7') break;
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
    };
  })()`);
  const name = `${lang}-${width}-deep`;
  const required = lang === 'en' ? ['compute_policy_loss', 'cu_seqlens', '0.7483', 'train.py:73-79,92-94'] : ['compute_policy_loss', 'cu_seqlens', '0.7483', 'train.py:73-79,92-94'];
  check(state.expanded === 'true' && state.counter === '04 / 07', `${name}: wrong open state`);
  check(!state.katexErrors && !state.rawMath && state.overflow <= 1 && !state.pageOverflow, `${name}: rendering failed ${state.overflow}`);
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
      for (let phase = 0; phase < 8; phase++) {
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
  url: `${base}/ml-sys/ch/08-fsdp2-training-backend/?step=4`,
  states: states.length,
  mechanismTransitions: states.length / 8 * 7,
  deepStates: deepStates.length,
  minStageFont: Math.min(...states.map((state) => state.minFont)),
  failures,
  statesDetail: states,
  deepDetail: deepStates,
};
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ states: report.states, mechanismTransitions: report.mechanismTransitions, deepStates: report.deepStates, minStageFont: report.minStageFont, failures }, null, 2));
if (failures.length) process.exit(1);
