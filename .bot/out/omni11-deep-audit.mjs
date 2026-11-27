// Verify the changed Omni 11/12 deep-dive sections with an open, identified drawer.
// Usage: BASE=http://localhost:4483/learning-sglang OUT=.bot/out/omni11-final-deep node .bot/out/omni11-deep-audit.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4483/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/omni11-final-deep';
mkdirSync(out, { recursive: true });
const cases = [
  { chapter: 11, slug: '11-fish-s2-pro', steps: [1, 2, 7, 8] },
  { chapter: 12, slug: '12-full-duplex-strategies', steps: [1] },
];
const expected = {
  '11-1-en': ['Ch. 10 Step 8', 'Slow AR chooses'],
  '11-1-zh': ['第 10 章第 8 步', 'Slow AR 先选'],
  '11-2-en': ['reference codec', 'Shipped DAC configuration'],
  '11-2-zh': ['参考 codec', '默认 DAC 配置'],
  '11-7-en': ['grey 512-sample tail', 'final flush releases'],
  '11-7-zh': ['灰色 512', '最后一次释放'],
  '11-8-en': ['queued', 'Chapter 12 Step 1'],
  '11-8-zh': ['队列', '第 12 章第 1 步'],
  '12-1-en': ['Ch. 11 Step 8', '800 ms'],
  '12-1-zh': ['第 11 章第 8 步', '800 ms'],
};
const states = [];
const browser = await launch({ width: 1440, height: 900 });
try {
  for (const lang of ['en', 'zh']) {
    for (const { chapter, slug, steps } of cases) {
      for (const step of steps) {
        const page = await browser.tab();
        const url = `${base}/omni/ch/${slug}/?step=${step}`;
        await page.goto(url);
        await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
        await page.goto(url);
        await sleep(900);
        await page.evaluate(`new Promise((resolve, reject) => {
          const root = document.querySelector('.viz');
          if (!root?.hasAttribute('data-animation-step')) { resolve(true); return; }
          const deadline = Date.now() + 15000;
          const check = () => {
            if (root.getAttribute('data-animation-phase') === root.getAttribute('data-animation-final-phase')) {
              resolve(true);
              return;
            }
            if (Date.now() > deadline) { reject(new Error('final phase wait timed out')); return; }
            setTimeout(check, 50);
          };
          check();
        })`);
        await sleep(400);
        await page.evaluate(`document.querySelector('button.deep')?.click()`);
        await sleep(500);
        const state = await page.evaluate(`(() => {
          const button = document.querySelector('button.deep');
          const panel = document.querySelector('.deep-panel');
          const body = document.querySelector('.deep-body');
          return {
            counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
            expanded: button?.getAttribute('aria-expanded'),
            title: panel?.querySelector('h2')?.textContent.trim(),
            bodyText: body?.textContent.replace(/\\s+/g, ' ').trim() || '',
            pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            drawerOverflow: body ? body.scrollWidth > body.clientWidth + 1 : true,
            katexErrors: body?.querySelectorAll('.katex-error').length || 0,
            rawMath: body?.textContent.includes('$$') || false,
          };
        })()`);
        const key = `${chapter}-${step}-${lang}`;
        const missing = expected[key].filter((text) => !state.bodyText.includes(text));
        const counter = state.counter?.match(/\d+/g)?.map(Number);
        const record = { chapter, step, lang, ...state, bodyText: undefined, missing };
        states.push(record);
        console.log(JSON.stringify(record));
        if (counter?.[0] !== step || counter?.[1] !== 8 || state.expanded !== 'true' || !state.title ||
            missing.length || state.pageOverflow || state.drawerOverflow || state.katexErrors || state.rawMath) {
          throw new Error(`deep audit failed for ${key}: ${JSON.stringify(record)}`);
        }
        writeFileSync(join(out, `${key}.png`), await page.screenshot());
        await page.close();
      }
    }
  }
} finally {
  browser.close();
}
const report = { base, generatedAt: new Date().toISOString(), states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ views: states.length, report: join(out, 'report.json') }));
