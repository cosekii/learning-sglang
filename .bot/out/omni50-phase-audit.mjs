// Verify Omni 05 Steps 4–5 across language, viewport, and entry path.
// Usage: STEP=4 LANG=en WIDTH=1440 ENTRY=direct BASE=http://127.0.0.1:4501/learning-sglang node .bot/out/omni50-phase-audit.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4501/learning-sglang').replace(/\/$/, '');
const step = Number(process.env.STEP) || 4;
if (![4, 5].includes(step)) throw new Error('STEP must be 4 or 5');
const expectedFinal = step === 4 ? 6 : 5;
const lang = process.env.LANG === 'zh' ? 'zh' : 'en';
const entry = process.env.ENTRY === 'prev' ? 'prev' : 'direct';
const width = Number(process.env.WIDTH) || 1440;
const height = width <= 900 ? 1000 : 900;
const phone = width <= 900;
const out = process.env.OUT || `.bot/out/omni50-s${step}-${lang}${phone ? width : 'desktop'}-${entry}`;
mkdirSync(out, { recursive: true });

const browser = await launch({ width, height });
const states = [];
try {
  const page = await browser.tab({ width, height, mobile: phone });
  await page.goto(`${base}/omni/ch/05-data-lifetime/?step=1`);
  await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
  if (entry === 'prev') {
    await page.goto(`${base}/omni/ch/05-data-lifetime/?step=${step - 1}`);
    await sleep(900);
    await page.press('ArrowRight');
  } else {
    await page.goto(`${base}/omni/ch/05-data-lifetime/?step=${step}`);
  }
  await sleep(900);
  const finalPhase = await page.evaluate(`Number(document.querySelector('.viz')?.getAttribute('data-animation-final-phase'))`);
  if (finalPhase !== expectedFinal) throw new Error(`expected final phase ${expectedFinal}, got ${finalPhase}`);
  let previousSignature = null;
  for (let target = 0; target <= finalPhase; target++) {
    await page.evaluate(`new Promise((resolve, reject) => {
      const root = document.querySelector('.viz');
      let departed = root?.getAttribute('data-animation-phase') !== '${target}';
      const deadline = Date.now() + 20000;
      const check = () => {
        const current = root?.getAttribute('data-animation-phase');
        if (current !== '${target}') departed = true;
        if (departed && root?.getAttribute('data-animation-step') === '${step - 1}' && current === '${target}') {
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
    await sleep(400);
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
      const shapes = [...svg.querySelectorAll('rect,line,path')].filter((el) => !el.closest('defs,marker') && opacity(el) >= 0.05);
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
    if (state.step !== step || state.phase !== target || counter?.[0] !== step || counter?.[1] !== 5) {
      throw new Error(`phase ${target}: identity mismatch (counter: ${state.counter})`);
    }
    const required = step === 4
      ? [[], ['ShmGetOperation', 'SHM block A'], [lang === 'zh' ? '复制完成 ✓' : 'copy ✓'], ['SHM A · unlinked', lang === 'zh' ? 'finally：close + unlink' : 'finally: close + unlink'], [lang === 'zh' ? '接收空间返回 ✓' : 'buffer returns ✓'], [lang === 'zh' ? '数据 A' : 'payload A'], ['success = true']][target]
      : [[], ['pending.ack.set_result'], ['mark_receiver_done'], ['wait_for_completion'], ['finally: sem.release'], ['pending.pop(A) ✓']][target];
    const missing = required.filter((text) => !state.text.some((line) => line.includes(text)));
    if (missing.length) throw new Error(`phase ${target}: missing ${missing.join(', ')}`);
    const forbidden = step === 4
      ? [
          ...(target < 2 ? [lang === 'zh' ? '复制完成 ✓' : 'copy ✓'] : []),
          ...(target < 3 ? ['SHM A · unlinked', lang === 'zh' ? '句柄已关' : 'handle closed'] : []),
          ...(target < 4 ? [lang === 'zh' ? '接收空间返回 ✓' : 'buffer returns ✓'] : []),
          ...(target < 6 ? ['success = true', lang === 'zh' ? '读取完成 ✓' : 'read finished ✓'] : []),
        ]
      : [
          ...(target < 1 ? ['pending.ack.set_result ✓'] : []),
          ...(target < 4 ? ['finally: sem.release'] : []),
          ...(target < 5 ? ['pending: no A', 'pending.pop(A) ✓'] : []),
        ];
    const premature = forbidden.filter((text) => state.text.some((line) => text === 'finally: sem.release' ? line === text : line.includes(text)));
    if (premature.length) throw new Error(`phase ${target}: premature completion ${premature.join(', ')}`);
    const signature = createHash('sha256').update(JSON.stringify(state.mechanism)).digest('hex');
    const changed = previousSignature === null ? null : signature !== previousSignature;
    if (changed === false) throw new Error(`phase ${target}: mechanism did not change`);
    previousSignature = signature;
    const record = { phase: target, ...state, mechanism: undefined, signature, changed };
    states.push(record);
    writeFileSync(join(out, `s${step}-p${target}.png`), await page.screenshot());
  }
  const finalText = states.at(-1).text;
  if (finalText.some((line) => line.includes('backend may reclaim'))) throw new Error('generic reclaim label remains');
  const ordered = step === 4
    ? ['get_async', 'await wait_for_completion', lang === 'zh' ? 'finally：close + unlink' : 'finally: close + unlink', lang === 'zh' ? '接收空间返回 ✓' : 'buffer returns ✓', lang === 'zh' ? '数据 A' : 'payload A', 'success = true']
    : ['pending.ack.set_result', 'mark_receiver_done', 'wait_for_completion', 'finally: sem.release', 'pending.pop(A) ✓'];
  const positions = ordered.map((needle) => finalText.findIndex((line) => line.includes(needle)));
  if (positions.some((position) => position < 0) || positions.some((position, i) => i && position <= positions[i - 1])) {
    throw new Error(`wrong final order: ${JSON.stringify({ ordered, positions, finalText })}`);
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
const report = { base, step, lang, entry, width, summary, states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ summary, report: join(out, 'report.json') }, null, 2));
if (states.length !== expectedFinal + 1 || transitions.length !== expectedFinal || summary.changedTransitions !== expectedFinal ||
    summary.minFont < 10 || summary.overlaps || summary.overflow || summary.pageOverflow) {
  throw new Error(`audit failed: ${JSON.stringify(summary)}`);
}
