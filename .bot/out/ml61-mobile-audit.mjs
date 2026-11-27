// ML-61: verify the mobile wording at three widths in English and Chinese.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4503/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml61-mobile-audit';
const url = `${base}/ml-sys/ch/06-slime-rollout-loop/?step=3`;
mkdirSync(out, { recursive: true });
const browser = await launch({ width: 1440, height: 900 });
const results = [];
const failures = [];

const inspect = `(() => {
  const figure = document.querySelector('.viz');
  const svg = document.querySelector('.viz svg');
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let node = el; node instanceof SVGElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    }
    return true;
  };
  const texts = [...svg.querySelectorAll('text')].filter(visible).map((el) => {
    const r = el.getBoundingClientRect();
    const ctm = el.getScreenCTM();
    return { text: el.textContent.trim().replace(/\\s+/g, ' '), left: r.left, right: r.right,
      size: ctm ? parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d) : 0 };
  });
  const rect = svg.getBoundingClientRect();
  return {
    counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
    step: figure?.getAttribute('data-animation-step'),
    phase: figure?.getAttribute('data-animation-phase'),
    finalPhase: figure?.getAttribute('data-animation-final-phase'),
    texts: texts.map((t) => t.text),
    overflow: texts.filter((t) => t.left < rect.left - 1 || t.right > rect.right + 1).map((t) => t.text),
    minFont: Math.min(...texts.map((t) => t.size)),
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

try {
  for (const lang of ['en', 'zh']) {
    for (const width of [360, 390, 430]) {
      const page = await browser.tab({ width, height: 1200, mobile: true });
      await page.goto(url);
      await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
      await page.goto(url);
      let state;
      for (let i = 0; i < 160; i++) {
        state = await page.evaluate(inspect);
        if (state.counter === '03 / 08' && state.step === '2' && state.phase === state.finalPhase) break;
        await sleep(50);
      }
      await sleep(300);
      state = await page.evaluate(inspect);
      const name = `${lang}-${width}`;
      const expected = lang === 'en' ? 'write 8 answers' : '写出 8 份回答';
      const forbidden = lang === 'en' ? 'write 8 different answers' : '写出 8 份不同回答';
      if (state.counter !== '03 / 08' || state.step !== '2' || state.phase !== state.finalPhase) failures.push(`${name}: wrong page or phase identity`);
      if (!state.texts.includes(expected) || state.texts.includes(forbidden)) failures.push(`${name}: expected wording missing or old wording remains`);
      if (state.overflow.length || state.pageOverflow) failures.push(`${name}: horizontal overflow ${JSON.stringify(state.overflow)}`);
      if (state.minFont < 10) failures.push(`${name}: minimum font ${state.minFont}`);
      writeFileSync(join(out, `${name}.png`), await page.screenshot());
      results.push({ name, ...state, png: `${name}.png` });
      await page.close();
    }
  }
} finally {
  browser.close();
}

writeFileSync(join(out, 'report.json'), JSON.stringify({ url, results, failures }, null, 2) + '\n');
console.log(JSON.stringify({ results: results.map(({ name, counter, phase, minFont, texts }) => ({ name, counter, phase, minFont, wording: texts.find((t) => t.includes('write 8') || t.includes('写出 8')) })), failures }, null, 2));
if (failures.length) process.exit(1);
