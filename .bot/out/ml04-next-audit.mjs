// Reproduce the ML 04 Step 7 closing-seam audit.
// Start the dev server, then run `BASE=http://localhost:4494/learning-sglang node .bot/out/ml04-next-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4494/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml04-next-audit';
const states = [];
const deepStates = [];
const seams = [];
mkdirSync(out, { recursive: true });
const keepAlive = setInterval(() => {}, 1000);
let browser;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function open(page, lang, chapter, step) {
  const slug = chapter === 4 ? '04-gpu-communication' : '05-distributed-serving';
  const url = `${base}/ml-sys/ch/${slug}/?step=${step}&deep=0`;
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}')`);
  await page.goto(url);
  await page.evaluate(`(() => { const button = document.querySelector('button.deep'); if (button?.getAttribute('aria-expanded') === 'true') button.click(); })()`);
  await sleep(850);
  const identity = await page.evaluate(`(() => ({
    step: Number(document.querySelector('.viz')?.getAttribute('data-animation-step')),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    expanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
  }))()`);
  assert(identity.step === step - 1 && identity.counter === `${String(step).padStart(2, '0')} / 07` && identity.expanded === 'false',
    `${lang} Ch.${chapter}: bad identity ${JSON.stringify(identity)}`);
}

async function capture(page, lang, phase) {
  await page.evaluate(`new Promise((resolve, reject) => {
    const root = document.querySelector('.viz');
    let departed = root?.getAttribute('data-animation-phase') !== '${phase}';
    const deadline = Date.now() + 15000;
    const check = () => {
      const current = root?.getAttribute('data-animation-phase');
      if (current !== '${phase}') departed = true;
      if (departed && root?.getAttribute('data-animation-step') === '6' && current === '${phase}') return resolve(true);
      if (Date.now() > deadline) return reject(new Error('phase wait timed out'));
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
    const sizes = texts.map((el) => {
      const ctm = el.getScreenCTM();
      return ctm ? parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d) : Infinity;
    });
    const boxes = texts.map((el) => ({ el, rect: el.getBoundingClientRect() }));
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].rect, b = boxes[j].rect;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push([i, j]);
    }
    const svgRect = svg.getBoundingClientRect();
    const overflow = boxes.filter(({ rect }) => rect.left < svgRect.left - 1 || rect.right > svgRect.right + 1).length;
    return {
      phase: Number(root.getAttribute('data-animation-phase')),
      finalPhase: Number(root.getAttribute('data-animation-final-phase')),
      counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
      texts: texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
      ringEdges: [...svg.querySelectorAll('line')].filter((el) => opacity(el) >= 0.90 && el.getAttribute('y1') === '138' && el.getAttribute('y2') === '155')
        .map((el) => ({ stroke: el.getAttribute('stroke'), width: el.getAttribute('stroke-width') })),
      minFont: Math.round(Math.min(...sizes) * 1000) / 1000,
      overlaps: overlaps.length,
      overflow,
    };
  })()`);
  assert(state.phase === phase && state.finalPhase === 3 && state.counter === '07 / 07', `${lang} phase ${phase}: identity failed`);
  const expected = lang === 'en' ? 'before GPUs can serve together' : 'GPU 怎样启动 worker';
  assert(state.texts.some((text) => text.includes(expected)), `${lang} phase ${phase}: closing question missing`);
  if (phase === 0) assert(state.ringEdges.length === 1 && state.ringEdges[0].stroke === 'var(--accent)', `${lang}: baseline Ring edge mismatch`);
  if (phase > 0) assert(state.ringEdges.length === 2, `${lang} phase ${phase}: second Ring edge missing`);
  if (phase === 1) assert(state.ringEdges.every((edge) => edge.stroke === 'var(--accent)'), `${lang}: edge changed before phase 2`);
  if (phase >= 2) assert(state.ringEdges[0].stroke === 'var(--accent)' && state.ringEdges[1].stroke === 'var(--gen)' && state.ringEdges[1].width === '5',
    `${lang} phase ${phase}: round-2 edge is not the only changed edge`);
  const png = await page.screenshot();
  const record = { lang, ...state, pngMd5: createHash('md5').update(png).digest('hex') };
  states.push(record);
  writeFileSync(join(out, `${lang}-s7-p${phase}.png`), png);
  return record;
}

try {
  for (const lang of ['en', 'zh']) {
    browser = await launch({ width: 1440, height: 900 });
    const page = await browser.tab();
    await open(page, lang, 4, 7);
    const phaseStates = [];
    for (let phase = 0; phase <= 3; phase++) phaseStates.push(await capture(page, lang, phase));
    const first = phaseStates[0], last = phaseStates[phaseStates.length - 1];
    for (let i = 1; i < phaseStates.length; i++) {
      const previous = phaseStates[i - 1], current = phaseStates[i];
      assert((JSON.stringify(previous.texts) !== JSON.stringify(current.texts) || JSON.stringify(previous.ringEdges) !== JSON.stringify(current.ringEdges)) &&
        previous.pngMd5 !== current.pngMd5, `${lang} phase ${i}: mechanism did not change`);
    }
    await page.evaluate(`document.querySelector('button.deep').click()`);
    await sleep(450);
    const deep = await page.evaluate(`(() => {
      const body = document.querySelector('.deep-body');
      return {
        expanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
        text: body?.textContent.replace(/\\s+/g, ' ').trim(),
        katexErrors: document.querySelectorAll('.deep-body .katex-error').length,
        rawMath: body?.textContent.includes('$$'),
        overflow: body ? body.scrollWidth - body.clientWidth : null,
      };
    })()`);
    const expectedDeep = lang === 'en' ? 'starts the workers' : '先启动 worker';
    assert(deep.expanded === 'true' && deep.text.includes(expectedDeep) && !deep.katexErrors && !deep.rawMath && deep.overflow <= 1,
      `${lang}: deep closing seam failed`);
    const deepPng = await page.screenshot();
    deepStates.push({ lang, expanded: deep.expanded, overflow: deep.overflow,
      pngMd5: createHash('md5').update(deepPng).digest('hex') });
    writeFileSync(join(out, `${lang}-s7-deep.png`), deepPng);
    await page.evaluate(`document.querySelector('button.deep').click()`);
    await open(page, lang, 5, 1);
    const firstAnswer = await page.evaluate(`(() => ({
      caption: document.querySelector('.caption')?.textContent.replace(/\\s+/g, ' ').trim(),
      stage: document.querySelector('.viz svg')?.textContent.replace(/\\s+/g, ' ').trim(),
    }))()`);
    const answerText = `${firstAnswer.caption} ${firstAnswer.stage}`;
    const answerNeedles = lang === 'en' ? ['SGLang readiness', 'HTTP'] : ['SGLang 就绪', 'HTTP'];
    for (const needle of answerNeedles) assert(answerText.includes(needle), `${lang}: Ch.5 first step does not answer startup: ${answerText}`);
    seams.push({ lang, question: last.texts.find((text) => text.includes('Next:') || text.includes('下一章')), answer: firstAnswer.caption });
    await page.close();
    browser.close();
    browser = null;
  }
} finally {
  clearInterval(keepAlive);
  browser?.close();
}

const summary = {
  states: states.length,
  changedTransitions: states.length - 2,
  mechanismSteps: 1,
  deepStates: deepStates.length,
  minFont: Math.min(...states.map((state) => state.minFont)),
  overlaps: states.reduce((sum, state) => sum + state.overlaps, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow, 0),
  seams: seams.length,
};
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, generatedAt: new Date().toISOString(), summary, states, deepStates, seams }, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
assert(states.length === 8 && summary.changedTransitions === 6 && deepStates.length === 2 && seams.length === 2 && summary.minFont >= 10 && !summary.overlaps && !summary.overflow,
  `audit failed: ${JSON.stringify(summary)}`);
