// Verify the changed Omni 11 deep-dive sections with an open, identified drawer.
// Usage: BASE=http://localhost:4483/learning-sglang OUT=.bot/out/omni48-deep WIDTH=1440 node .bot/out/omni11-deep-audit.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4483/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/omni48-deep';
const width = Number(process.env.WIDTH) || 1440;
const height = width <= 900 ? 844 : 900;
mkdirSync(out, { recursive: true });
const cases = [
  { chapter: 11, slug: '11-fish-s2-pro', steps: [1, 4, 5] },
];
const expected = {
  '11-1-en': ['preprocessing', '220 Fast calls', '2 × 4 × 8 × 8 = 512'],
  '11-1-zh': ['preprocessing', '220 次 Fast 调用', '2 × 4 × 8 × 8 = 512'],
  '11-4-en': ['Fast call 0 resets', 'sem_id'],
  '11-4-zh': ['Fast 第 0 次调用重置', 'sem_id'],
  '11-5-en': ['resets first', 'before the next Slow input'],
  '11-5-zh': ['先重置', '下一次 Slow 输入'],
};
const states = [];
const browser = await launch({ width, height });
try {
  for (const lang of ['en', 'zh']) {
    for (const { chapter, slug, steps } of cases) {
      for (const step of steps) {
        const page = await browser.tab({ width, height, mobile: width <= 900 });
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
            drawerClientWidth: body?.clientWidth,
            drawerScrollWidth: body?.scrollWidth,
            children: body ? [...body.children].map((el) => {
              const rect = el.getBoundingClientRect();
              return { tag: el.tagName, className: typeof el.className === 'string' ? el.className : '',
                clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, left: rect.left, right: rect.right,
                text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 100) };
            }) : [],
            wide: body ? [...body.querySelectorAll('*')].filter((el) => {
              const rect = el.getBoundingClientRect(), bounds = body.getBoundingClientRect();
              return rect.right > bounds.right + 1 || rect.left < bounds.left - 1;
            }).slice(0, 12).map((el) => ({
              tag: el.tagName, className: typeof el.className === 'string' ? el.className : '',
              clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
              text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 180),
            })) : [],
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
const report = { base, width, generatedAt: new Date().toISOString(), states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ views: states.length, report: join(out, 'report.json') }));
