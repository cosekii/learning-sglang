// Verify Omni 13 Step 9's replica2 warmup order across language, viewport, and entry path.
// Usage: BASE=http://127.0.0.1:4505/learning-sglang LANG=en WIDTH=1440 ENTRY=direct node .bot/out/omni51-step9-audit.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4505/learning-sglang').replace(/\/$/, '');
const lang = process.env.LANG === 'zh' ? 'zh' : 'en';
const entry = process.env.ENTRY === 'prev' ? 'prev' : 'direct';
const width = Number(process.env.WIDTH) || 1440;
const height = width <= 900 ? 1000 : 900;
const phone = width <= 900;
const out = process.env.OUT || `.bot/out/omni51-step9-${lang}${phone ? width : 'desktop'}-${entry}`;
mkdirSync(out, { recursive: true });

const browser = await launch({ width, height });
const states = [];
try {
  const page = await browser.tab({ width, height, mobile: phone });
  await page.goto(`${base}/omni/ch/13-qwen3-omni-deployment/?step=1`);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  if (entry === 'prev') {
    await page.goto(`${base}/omni/ch/13-qwen3-omni-deployment/?step=8`);
    await sleep(900);
    await page.press('ArrowRight');
  } else {
    await page.goto(`${base}/omni/ch/13-qwen3-omni-deployment/?step=9`);
  }
  await sleep(100);
  const finalPhase = await page.evaluate(`Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase'))`);
  if (finalPhase !== 7) throw new Error(`expected final phase 7, got ${finalPhase}`);
  let previousSignature = null;
  for (let target = 0; target <= finalPhase; target++) {
    await page.evaluate(`new Promise((resolve, reject) => {
      const root = document.querySelector('.viz');
      let departed = root?.getAttribute('data-animation-phase') !== '${target}';
      const deadline = Date.now() + 20000;
      const check = () => {
        const current = root?.getAttribute('data-animation-phase');
        if (current !== '${target}') departed = true;
        if (departed && root?.getAttribute('data-animation-step') === '8' && current === '${target}') {
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
    await sleep(500);
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
      const texts = [...svg.querySelectorAll('text')].filter((el) => el.textContent.trim() && opacity(el) >= 0.05);
      const shapes = [...svg.querySelectorAll('rect,line,path')].filter((el) =>
        !el.closest('defs,marker') && opacity(el) >= 0.05);
      const mechanism = {
        texts: texts.map((el) => [el.textContent.trim().replace(/\\s+/g, ' '), Math.round(opacity(el) * 100) / 100]),
        shapes: shapes.map((el) => [el.outerHTML, Math.round(opacity(el) * 100) / 100]),
      };
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
        text: texts.map((el) => el.textContent.trim().replace(/\\s+/g, ' ')),
        minFont: Math.round(smallest.size * 1000) / 1000,
        minFontText: smallest.text,
        overlaps,
        overflow,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        mechanism,
      };
    })()`);
    const counter = state.counter?.match(/\d+/g)?.map(Number);
    if (state.step !== 9 || state.phase !== target || counter?.[0] !== 9 || counter?.[1] !== 10) {
      throw new Error(`phase ${target}: identity mismatch (counter: ${state.counter})`);
    }
    const required = [
      [lang === 'zh' ? '发送中' : 'sending', lang === 'zh' ? '启动中 · 0 / 2' : 'STARTING · 0 / 2'],
      ['warmup 1 · HTTP 200', lang === 'zh' ? '启动中 · 1 / 2' : 'STARTING · 1 / 2'],
      [lang === 'zh' ? 'warmup 2 · 发送中' : 'warmup 2 · sending'],
      ['warmup 2 · HTTP 200', lang === 'zh' ? '就绪 · 2 / 2' : 'UP · 2 / 2'],
      [lang === 'zh' ? '保持不变' : 'KEEP FIXED'],
      [lang === 'zh' ? '基准客户端记录' : 'BENCHMARK CLIENT RECORD'],
      ['chunk 1'],
      ['chunk 2', lang === 'zh' ? '就绪' : 'ready'],
    ][target];
    const missing = required.filter((text) => !state.text.some((line) => line.includes(text)));
    if (missing.length) throw new Error(`phase ${target}: missing ${missing.join(', ')}`);
    const forbidden = [
      ...(target < 1 ? ['warmup 1 · HTTP 200'] : []),
      ...(target < 2 ? [lang === 'zh' ? 'warmup 2 · 发送中' : 'warmup 2 · sending'] : []),
      ...(target < 3 ? ['warmup 2 · HTTP 200', lang === 'zh' ? '就绪 · 2 / 2' : 'UP · 2 / 2'] : []),
      ...(target < 4 ? [lang === 'zh' ? '保持不变' : 'KEEP FIXED'] : []),
      ...(target < 5 ? [lang === 'zh' ? '基准客户端记录' : 'BENCHMARK CLIENT RECORD'] : []),
      ...(target < 6 ? ['chunk 1'] : []),
      ...(target < 7 && !phone ? [lang === 'zh' ? 'chunk 2 · 就绪' : 'chunk 2 · ready'] : []),
    ];
    const premature = forbidden.filter((text) => state.text.some((line) => line.includes(text)));
    if (target < 7 && phone && state.text.some((line) => line === (lang === 'zh' ? '就绪' : 'ready'))) premature.push('chunk 2 ready');
    if (premature.length) throw new Error(`phase ${target}: premature state ${premature.join(', ')}`);
    const signature = createHash('sha256').update(JSON.stringify(state.mechanism)).digest('hex');
    const changed = previousSignature === null ? null : signature !== previousSignature;
    if (changed === false) throw new Error(`phase ${target}: mechanism did not change`);
    previousSignature = signature;
    states.push({ phase: target, ...state, mechanism: undefined, signature, changed });
    writeFileSync(join(out, `s9-p${target}.png`), await page.screenshot());
  }
  const finalText = states.at(-1).text.join('\n');
  for (const needle of ['max(process.num_replicas) = 2', 'warmup 1 · HTTP 200', 'warmup 2 · HTTP 200']) {
    if (!finalText.includes(needle)) throw new Error(`final state missing ${needle}`);
  }
  await page.close();
} finally {
  browser.close();
}

const transitions = states.filter((state) => state.changed !== null);
const summary = {
  states: states.length,
  transitions: transitions.length,
  changedTransitions: transitions.filter((state) => state.changed).length,
  minFont: Math.min(...states.map((state) => state.minFont)),
  overlaps: states.reduce((sum, state) => sum + state.overlaps.length, 0),
  overflow: states.reduce((sum, state) => sum + state.overflow.length, 0),
  pageOverflow: states.some((state) => state.pageOverflow),
};
const report = { base, lang, entry, width, summary, states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (states.length !== 8 || transitions.length !== 7 || summary.changedTransitions !== 7 ||
    summary.minFont < 10 || summary.overlaps || summary.overflow || summary.pageOverflow) {
  throw new Error(`audit failed: ${JSON.stringify(summary)}`);
}
