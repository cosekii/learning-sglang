// Verify ML-20 across ML 12 Step 8 and ML 13 Step 1.
// Start the dev server, then run `BASE=http://127.0.0.1:4328/learning-sglang node .bot/out/ml20-seam-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4328/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml20-seam-audit';
const states = [];
const deepStates = [];
const failures = [];
mkdirSync(out, { recursive: true });
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const check = (condition, message) => { if (!condition) failures.push(message); };
const chapters = {
  ml12: { slug: '12-rl-speculative-decoding', step: 8, phases: 4, counter: '08 / 08' },
  ml13: { slug: '13-multi-turn-agent-rl', step: 1, phases: 3, counter: '01 / 08' },
};

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
    url: location.href,
    step: Number(root.getAttribute('data-animation-step')) + 1,
    phase: Number(root.getAttribute('data-animation-phase')),
    finalPhase: Number(root.getAttribute('data-animation-final-phase')),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    caption: document.querySelector('.caption')?.textContent.trim().replace(/\\s+/g, ' '),
    chapterNext: document.querySelector('a.chapter.next')?.getAttribute('href') || '',
    chapterPrev: document.querySelector('a.chapter:not(.next)')?.getAttribute('href') || '',
    deepExpanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
    visibleTexts: texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
    mechanism: { texts: texts.map((el) => el.textContent.trim()), shapes: shapes.map((el) => el.outerHTML) },
    minFont: sizes.length ? Math.min(...sizes.map((item) => item.size)) : 0,
    minFontText: sizes.sort((a, b) => a.size - b.size)[0]?.text || '',
    overlaps, overflow,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function setLanguage(page, lang, url) {
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  await page.goto(url);
  await page.evaluate(`(() => { const b = document.querySelector('button.deep'); if (b?.getAttribute('aria-expanded') === 'true') b.click(); })()`);
  await sleep(400);
}

async function openStep(page, key, lang, entry) {
  const cfg = chapters[key];
  if (key === 'ml13' && entry === 'previous') {
    const url = `${base}/ml-sys/ch/12-rl-speculative-decoding/?step=8`;
    await setLanguage(page, lang, url);
    await page.evaluate(`document.querySelector('a.chapter.next')?.click()`);
    await sleep(800);
    return;
  }
  const startStep = entry === 'direct' ? cfg.step : cfg.step - 1;
  const url = `${base}/ml-sys/ch/${cfg.slug}/?step=${startStep}`;
  await setLanguage(page, lang, url);
  if (entry === 'previous') {
    await page.press('ArrowRight');
    await sleep(250);
  }
}

async function capture(page, key, combo, phase) {
  const cfg = chapters[key];
  const target = String(phase);
  for (let i = 0; i < 200; i++) {
    const current = await page.evaluate(`document.querySelector('.viz')?.getAttribute('data-animation-phase')`);
    if (current === target) break;
    await sleep(50);
  }
  await sleep(350);
  const state = await page.evaluate(inspect);
  const name = `${key}-${combo.lang}-${combo.width}-${combo.entry}-s${cfg.step}-p${phase}`;
  check(!state.missing, `${name}: viz missing`);
  if (state.missing) return null;
  check(state.step === cfg.step && state.phase === phase && state.finalPhase === cfg.phases - 1 && state.counter === cfg.counter, `${name}: bad identity ${JSON.stringify({ step: state.step, phase: state.phase, finalPhase: state.finalPhase, counter: state.counter, url: state.url })}`);
  check(state.deepExpanded === 'false', `${name}: deep drawer covered the stage`);
  check(state.minFont >= 10, `${name}: minimum font ${state.minFont} on ${state.minFontText}`);
  check(!state.overlaps.length && !state.overflow.length && !state.pageOverflow, `${name}: geometry failed ${JSON.stringify({ overlaps: state.overlaps, overflow: state.overflow, pageOverflow: state.pageOverflow })}`);
  check(!state.visibleTexts.some((text) => /which pairs teach|Which pairs teach|哪些相邻位置能教|哪些位置教 draft/.test(text)), `${name}: old draft-pair question remains`);
  if (key === 'ml12') {
    check(state.chapterNext.includes('/ml-sys/ch/13-multi-turn-agent-rl/'), `${name}: wrong next chapter ${state.chapterNext}`);
    if (phase === cfg.phases - 1) {
      const required = combo.lang === 'en'
        ? 'Which tokens does the second model call need?'
        : combo.width === 390 ? '第二次调用需要哪些 token？' : '第二次模型调用需要哪些 token？';
      check(state.visibleTexts.includes(required), `${name}: missing narrowed question ${required}`);
    }
  } else {
    check(state.chapterPrev.includes('/ml-sys/ch/12-rl-speculative-decoding/'), `${name}: wrong previous chapter ${state.chapterPrev}`);
    check(combo.lang === 'en' ? state.caption.includes('The second call needs nine context tokens') : state.caption.includes('第二次调用需要 9 个上下文 token'), `${name}: caption does not answer the handoff ${state.caption}`);
    if (phase === cfg.phases - 1) {
      const required = combo.lang === 'en' ? 'second call: P+A+O = 9' : '第二次调用：P+A+O = 9';
      check(state.visibleTexts.includes(required), `${name}: missing visible answer ${required}`);
      check(state.visibleTexts.filter((text) => text === 'A').length === 4 && state.visibleTexts.filter((text) => text === 'O').length === 3, `${name}: accumulated A/O tokens missing`);
    }
  }
  const signature = hash(state.mechanism);
  const record = { name, key, lang: combo.lang, width: combo.width, entry: combo.entry, phase, signature, ...state, mechanism: undefined };
  if (combo.entry === 'direct' && phase === cfg.phases - 1 && (combo.lang === 'zh' || combo.width === 1440)) {
    const png = await page.screenshot();
    writeFileSync(join(out, `${name}.png`), png);
    record.pngMd5 = createHash('md5').update(png).digest('hex');
  }
  states.push(record);
  return record;
}

async function captureDeep(page, key, lang, width) {
  const cfg = chapters[key];
  await openStep(page, key, lang, 'direct');
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
      wide: body ? [...body.querySelectorAll('*')].map((el) => ({
        tag: el.tagName, className: String(el.className), text: el.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 140),
        scroll: el.scrollWidth - el.clientWidth,
        right: el.getBoundingClientRect().right - body.getBoundingClientRect().right,
      })).filter((item) => item.scroll > 1 || item.right > 1).slice(0, 20) : [],
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  })()`);
  const stage = await page.evaluate(inspect);
  const name = `${key}-${lang}-${width}-deep`;
  check(deep.expanded === 'true' && deep.counter === cfg.counter, `${name}: wrong open state`);
  check(deep.text && !deep.katexErrors && !deep.rawMath && deep.overflow <= 1 && !deep.pageOverflow, `${name}: rendering failed ${JSON.stringify({ ...deep, text: undefined })}`);
  if (key === 'ml12') {
    const required = lang === 'en'
      ? ['The next chapter first shows which tokens the second model call receives', 'Multi-turn draft-pair selection is outside this chapter', 'Derived · not drawn']
      : ['下一章先展示第二次模型调用收到哪些 token', '多轮 draft-pair 的选择不在本章范围内', '图外推导'];
    for (const text of required) check(deep.text.includes(text), `${name}: missing deep handoff ${text}`);
    check(!deep.text.includes('which adjacent positions may teach the draft') && !deep.text.includes('哪些相邻位置还能教 draft'), `${name}: old deep question remains`);
  } else {
    const required = lang === 'en'
      ? ['The nine second-call inputs include the two prompt tokens', 'Derived · not drawn']
      : ['第二次调用的 9 个输入包含 2 个 prompt token', '图外推导'];
    for (const text of required) check(deep.text.includes(text), `${name}: missing deep answer ${text}`);
  }
  const record = { name, key, lang, width, ...deep, text: undefined, stageMinFont: stage.minFont, stageMinFontText: stage.minFontText };
  if (width === 1440 || width === 390) {
    const png = await page.screenshot();
    writeFileSync(join(out, `${name}.png`), png);
    record.pngMd5 = createHash('md5').update(png).digest('hex');
  }
  deepStates.push(record);
}

let browser;
try {
  browser = await launch({ width: 1440, height: 900 });
  for (const key of Object.keys(chapters)) {
    for (const combo of [
      { lang: 'en', width: 1440 },
      { lang: 'zh', width: 1440 },
      { lang: 'zh', width: 390 },
    ]) {
      for (const entry of ['direct', 'previous']) {
        const page = await browser.tab({ width: combo.width, height: combo.width === 390 ? 1400 : 900, mobile: combo.width === 390 });
        const fullCombo = { ...combo, entry };
        await openStep(page, key, combo.lang, entry);
        let previous = null;
        for (let phase = 0; phase < chapters[key].phases; phase++) {
          const record = await capture(page, key, fullCombo, phase);
          if (record && previous) check(record.signature !== previous.signature, `${record.name}: mechanism did not change`);
          if (record) previous = record;
        }
        await page.close();
      }
    }
    for (const lang of ['en', 'zh']) for (const width of [1440, 390]) {
      const page = await browser.tab({ width, height: width === 390 ? 1400 : 900, mobile: width === 390 });
      await captureDeep(page, key, lang, width);
      await page.close();
    }
  }
} finally {
  browser?.close();
}

const transitions = states.filter((state) => state.phase > 0);
const summary = {
  states: states.length,
  expectedStates: 42,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state) => {
    const previous = states[states.indexOf(state) - 1];
    return previous && previous.key === state.key && previous.lang === state.lang && previous.width === state.width && previous.entry === state.entry && previous.signature !== state.signature;
  }).length,
  deepStates: deepStates.length,
  screenshots: states.filter((state) => state.pngMd5).length + deepStates.filter((state) => state.pngMd5).length,
  minFont: states.length ? Math.min(...states.map((state) => state.minFont)) : 0,
  deepStageMinFont: deepStates.length ? Math.min(...deepStates.map((state) => state.stageMinFont)) : 0,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
  failures,
};
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, summary, states, deepStates }, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (failures.length || states.length !== 42 || summary.changedTransitions !== 30 || deepStates.length !== 8) process.exit(1);
