// Reproduce the ML 08 Step 2 mechanism, layout, font, and deep-dive audit.
// Start the dev server on port 4321, then run `node .bot/out/ml08-step2-audit.mjs`.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4321/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml08-step2-audit';
const url = `${base}/ml-sys/ch/08-fsdp2-training-backend/?step=2`;
const states = [];
let previousPhasePng = null;
mkdirSync(out, { recursive: true });

let browser = await launch({ width: 1440, height: 900 });
const keepAlive = setInterval(() => {}, 1000);

async function open(page, lang) {
  previousPhasePng = null;
  await page.goto(url);
  await page.evaluate(`localStorage.setItem('lang', '${lang}')`);
  await page.goto(url);
  await page.evaluate(`(() => { const button = document.querySelector('button.deep'); if (button?.getAttribute('aria-expanded') === 'true') button.click(); })()`);
  await sleep(850);
  const identity = await page.evaluate(`(() => ({
    step: Number(document.querySelector('.viz')?.getAttribute('data-animation-step')),
    finalPhase: Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase')),
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
  }))()`);
  if (identity.step !== 1 || identity.finalPhase !== 4 || identity.counter !== '02 / 06') {
    throw new Error(`${lang}: bad initial identity ${JSON.stringify(identity)}`);
  }
}

async function capture(page, lang, width, phase) {
  await page.evaluate(`new Promise((resolve, reject) => {
    const root = document.querySelector('.viz');
    let departed = root?.getAttribute('data-animation-phase') !== '${phase}';
    const deadline = Date.now() + 20000;
    const check = () => {
      const current = root?.getAttribute('data-animation-phase');
      if (current !== '${phase}') departed = true;
      if (departed && root?.getAttribute('data-animation-step') === '1' && current === '${phase}') {
        resolve(true);
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error('phase wait timed out'));
        return;
      }
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
    const shapes = [...svg.querySelectorAll('rect,line,path')].filter((el) =>
      !el.closest('defs,marker,[aria-hidden="true"]') && opacity(el) >= 0.90);
    const sizes = texts.map((el) => {
      const ctm = el.getScreenCTM();
      return ctm ? {
        size: parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d),
        text: el.textContent.trim().replace(/\\s+/g, ' '),
      } : null;
    }).filter(Boolean);
    const smallest = sizes.sort((a, b) => a.size - b.size)[0];
    const boxes = texts.map((el) => ({ el, rect: el.getBoundingClientRect() }));
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].rect, b = boxes[j].rect;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) {
        overlaps.push([boxes[i].el.textContent.trim(), boxes[j].el.textContent.trim()]);
      }
    }
    const svgRect = svg.getBoundingClientRect();
    const overflow = boxes.filter(({ rect }) => rect.left < svgRect.left - 1 || rect.right > svgRect.right + 1)
      .map(({ el }) => el.textContent.trim());
    return {
      step: Number(root.getAttribute('data-animation-step')) + 1,
      phase: Number(root.getAttribute('data-animation-phase')),
      finalPhase: Number(root.getAttribute('data-animation-final-phase')),
      counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
      minFont: Math.round(smallest.size * 1000) / 1000,
      minFontText: smallest.text,
      overlaps,
      overflow,
      mechanism: {
        texts: texts.filter((el) => !el.closest('[aria-hidden="true"]')).map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
        shapes: shapes.map((el) => el.outerHTML),
      },
    };
  })()`);
  if (state.step !== 2 || state.phase !== phase || state.finalPhase !== 4 || state.counter !== '02 / 06') {
    throw new Error(`${lang} ${width} phase ${phase}: identity mismatch ${JSON.stringify(state)}`);
  }
  const previous = states.find((state) => state.lang === lang && state.width === width && state.phase === phase - 1);
  const changed = previous ? JSON.stringify(previous.mechanism) !== JSON.stringify(state.mechanism) : null;
  if (changed === false) throw new Error(`${lang} ${width} phase ${phase}: mechanism did not change`);
  const png = await page.screenshot();
  if (previousPhasePng?.equals(png)) {
    throw new Error(`${lang} ${width} phase ${phase}: PNG is byte-identical to the previous phase`);
  }
  const record = {
    lang, width, ...state, changed,
    pngBytes: png.length,
    pngMd5: createHash('md5').update(png).digest('hex'),
  };
  states.push(record);
  writeFileSync(join(out, `${lang}-${width}-s2-p${phase}.png`), png);
  previousPhasePng = png;
  return record;
}

try {
  for (const lang of ['en', 'zh']) {
    const page = await browser.tab();
    await open(page, lang);
    for (let phase = 0; phase <= 4; phase++) await capture(page, lang, 1440, phase);
    await page.evaluate(`(() => { const button = document.querySelector('button.deep'); if (button.getAttribute('aria-expanded') !== 'true') button.click(); })()`);
    await sleep(400);
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
    if (deep.expanded !== 'true' || !deep.text.includes('Shard(0)') || !deep.text.includes('Replicate()') ||
        deep.katexErrors || deep.rawMath || deep.overflow > 1) {
      throw new Error(`${lang}: deep-dive audit failed ${JSON.stringify(deep)}`);
    }
    writeFileSync(join(out, `${lang}-1440-s2-deep.png`), await page.screenshot());
    await page.close();
  }

  browser.close();
  browser = null;
  for (const lang of ['en', 'zh']) for (const width of [360, 390, 430]) {
    // A fresh browser keeps each phone group's compositor active instead of reusing a frozen background target.
    browser = await launch({ width, height: 844 });
    const page = await browser.tab({ width, height: 844, mobile: true });
    await open(page, lang);
    for (let phase = 0; phase <= 4; phase++) await capture(page, lang, width, phase);
    await page.close();
    browser.close();
    browser = null;
  }
} finally {
  clearInterval(keepAlive);
  browser?.close();
}

const desktop = states.filter((state) => state.width === 1440);
const transitions = states.filter((state) => state.phase > 0);
const changedTransitions = transitions.filter((state) => state.changed).length;
const smallest = states.reduce((a, b) => a.minFont < b.minFont ? a : b);
const summary = {
  states: states.length,
  desktopStates: desktop.length,
  phoneStates: states.length - desktop.length,
  transitions: transitions.length,
  changedTransitions,
  uniquePngHashes: new Set(states.map((state) => state.pngMd5)).size,
  minFont: smallest.minFont,
  minFontLocation: `${smallest.lang}-${smallest.width}-s2-p${smallest.phase}`,
  minFontText: smallest.minFontText,
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
};
writeFileSync(join(out, 'report.json'), JSON.stringify({ base, generatedAt: new Date().toISOString(), summary, states }, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (states.length !== 40 || desktop.length !== 10 || transitions.length !== 32 || changedTransitions !== 32 ||
    summary.uniquePngHashes !== states.length || summary.minFont < 10 || summary.overlaps || summary.overflow) {
  throw new Error(`audit failed: ${JSON.stringify(summary)}`);
}
