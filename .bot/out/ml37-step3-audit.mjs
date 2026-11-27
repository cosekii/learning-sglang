import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4495/learning-sglang').replace(/\/$/, '');
const out = new URL('./ml37-step3-audit/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const url = `${base}/ml-sys/ch/06-slime-rollout-loop/?step=3`;
const browser = await launch({ port: 9445, width: 1440, height: 900 });
const states = [];
const failures = [];

const inspect = `(() => {
  const figure = document.querySelector('.viz');
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let node = el; node instanceof SVGElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    }
    return true;
  };
  const texts = [...document.querySelectorAll('.viz svg text')].filter(visible).map((el) => {
    const r = el.getBoundingClientRect();
    const ctm = el.getScreenCTM();
    return {
      text: el.textContent.trim().replace(/\\s+/g, ' '),
      left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      size: ctm ? parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d) : 0,
    };
  });
  const svg = document.querySelector('.viz svg').getBoundingClientRect();
  const overflow = texts.filter((t) => t.left < svg.left - 1 || t.right > svg.right + 1)
    .map((t) => ({ text: t.text, by: Math.max(svg.left - t.left, t.right - svg.right) }));
  const overlaps = [];
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (width > 1 && height > 1) overlaps.push([a.text, b.text]);
  }
  return {
    counter: document.querySelector('.counter')?.textContent.trim() || '',
    step: figure?.getAttribute('data-animation-step'),
    phase: figure?.getAttribute('data-animation-phase'),
    finalPhase: figure?.getAttribute('data-animation-final-phase'),
    texts: texts.map((t) => t.text), overflow, overlaps,
    minFont: texts.length ? Math.min(...texts.map((t) => t.size)) : 0,
    minText: texts.length ? texts.reduce((a, b) => a.size < b.size ? a : b).text : '',
    deepExpanded: document.querySelector('button.deep')?.getAttribute('aria-expanded'),
    svgSize: { width: svg.width, height: svg.height },
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function waitForPhase(page, target) {
  for (let i = 0; i < 160; i++) {
    const state = await page.evaluate(inspect);
    if (state.step === '2' && state.phase === String(target) && state.counter === '03 / 08') {
      await sleep(450);
      const settled = await page.evaluate(inspect);
      if (settled.phase === String(target)) return settled;
    }
    await sleep(50);
  }
  throw new Error(`phase ${target} did not settle with the Step 3 counter`);
}

for (const lang of ['en', 'zh']) {
  const page = await browser.tab({ width: 1440, height: 900 });
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  await page.goto(url);
  await page.evaluate(`(() => { const b = document.querySelector('button.deep'); if (b?.getAttribute('aria-expanded') === 'true') b.click(); })()`);
  await sleep(400);
  for (const phase of [0, 1, 2, 3]) {
    const state = await waitForPhase(page, phase);
    const name = `${lang}-desktop-p${phase}`;
    const png = await page.screenshot();
    const after = await page.evaluate(inspect);
    if (after.step !== '2' || after.counter !== '03 / 08') failures.push(`${name}: page identity moved during capture`);
    if (state.deepExpanded !== 'false' || state.overflow.length || state.overlaps.length || state.pageOverflow) failures.push(`${name}: layout geometry failed`);
    if (state.minFont < 10) failures.push(`${name}: minimum font ${state.minFont}`);
    const hasLogProbs = state.texts.some((text) => text.includes('rollout_log_probs'));
    const hasRewardSlot = state.texts.some((text) => text.includes('reward = ?'));
    if ((phase === 3) !== hasLogProbs || (phase === 3) !== hasRewardSlot) failures.push(`${name}: record fields revealed in the wrong phase`);
    states.push({ name, ...state, png: `${name}.png` });
    writeFileSync(join(out, `${name}.png`), png);
  }
  const button = `document.querySelector('button.deep')`;
  await page.evaluate(`(() => { const b = ${button}; if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); })()`);
  await sleep(500);
  const deep = await page.evaluate(`(() => ({
    expanded: ${button}?.getAttribute('aria-expanded'),
    counter: document.querySelector('.counter')?.textContent.trim() || '',
    text: document.querySelector('.deep-body')?.textContent || '',
    overflow: (() => { const el = document.querySelector('.deep-body'); return el ? el.scrollWidth > el.clientWidth + 1 : true; })(),
    katexError: Boolean(document.querySelector('.deep-body .katex-error')),
    rawMath: (() => {
      const body = document.querySelector('.deep-body');
      if (!body) return true;
      const copy = body.cloneNode(true);
      copy.querySelectorAll('.katex-mathml, script, style').forEach((el) => el.remove());
      const visibleText = copy.textContent || '';
      return visibleText.includes('$$') || visibleText.includes('\\\\frac') || visibleText.includes('\\\\mathbin');
    })(),
  }))()`);
  if (deep.expanded !== 'true' || deep.counter !== '03 / 08' || deep.overflow || deep.katexError || deep.rawMath || !deep.text.includes('rollout_log_probs')) {
    failures.push(`${lang}-deep: content or geometry failed`);
  }
  writeFileSync(join(out, `${lang}-deep.png`), await page.screenshot());
  states.push({ name: `${lang}-deep`, ...deep, png: `${lang}-deep.png` });
  await page.close();
}

for (const lang of ['en', 'zh']) for (const width of [360, 390, 430]) {
  const page = await browser.tab({ width, height: 1400, mobile: true });
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  await page.goto(url);
  await page.evaluate(`(() => { const b = document.querySelector('button.deep'); if (b?.getAttribute('aria-expanded') === 'true') b.click(); })()`);
  await sleep(400);
  const state = await waitForPhase(page, 3);
  const name = `${lang}-phone-${width}-p3`;
  writeFileSync(join(out, `${name}.png`), await page.screenshot());
  if (state.deepExpanded !== 'false' || state.overflow.length || state.overlaps.length || state.pageOverflow) failures.push(`${name}: layout geometry failed`);
  if (state.minFont < 10) failures.push(`${name}: minimum font ${state.minFont}`);
  if (!state.texts.some((text) => text.includes('rollout_log_probs')) || !state.texts.some((text) => text.includes('reward = ?'))) {
    failures.push(`${name}: final record fields missing`);
  }
  states.push({ name, ...state, png: `${name}.png` });
  await page.close();
}

browser.close();
const report = {
  url,
  states,
  mechanismTransitions: states.filter((s) => s.name.includes('desktop')).length - 2,
  failures,
};
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ states: states.length, failures, out }, null, 2));
if (failures.length) process.exit(1);
