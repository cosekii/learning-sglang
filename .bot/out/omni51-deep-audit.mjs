// Verify Omni 13 Step 9's open deep drawer in English and Chinese.
// Usage: BASE=http://127.0.0.1:4505/learning-sglang WIDTH=1440 node .bot/out/omni51-deep-audit.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4505/learning-sglang').replace(/\/$/, '');
const width = Number(process.env.WIDTH) || 1440;
const height = width <= 900 ? 1000 : 900;
const out = process.env.OUT || `.bot/out/omni51-deep-${width}`;
mkdirSync(out, { recursive: true });
const expected = {
  en: ['max(process.num_replicas)', 'one at a time', 'HTTP 200', 'ServerStatus.UP', 'launcher.py:552-605,761-770'],
  zh: ['max(process.num_replicas)', '逐条发送', 'HTTP 200', 'ServerStatus.UP', 'launcher.py:552-605,761-770'],
};
const states = [];
const browser = await launch({ width, height });
try {
  for (const lang of ['en', 'zh']) {
    const page = await browser.tab({ width, height, mobile: width <= 900 });
    const url = `${base}/omni/ch/13-qwen3-omni-deployment/?step=9`;
    await page.goto(url);
    await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '0')`);
    await page.goto(url);
    await page.evaluate(`new Promise((resolve, reject) => {
      const root = document.querySelector('.viz');
      const deadline = Date.now() + 15000;
      const check = () => {
        if (root?.getAttribute('data-animation-phase') === root?.getAttribute('data-animation-final-phase')) {
          resolve(true);
          return;
        }
        if (Date.now() > deadline) { reject(new Error('final phase wait timed out')); return; }
        setTimeout(check, 50);
      };
      check();
    })`);
    await sleep(500);
    await page.evaluate(`document.querySelector('button.deep')?.click()`);
    await sleep(500);
    const state = await page.evaluate(`(() => {
      const button = document.querySelector('button.deep');
      const panel = document.querySelector('.deep-panel');
      const body = document.querySelector('.deep-body');
      const svg = document.querySelector('.viz svg');
      const sizes = svg ? [...svg.querySelectorAll('text')].filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width && rect.height && Number(getComputedStyle(el).opacity) > 0;
      }).map((el) => {
        const ctm = el.getScreenCTM();
        return ctm ? parseFloat(getComputedStyle(el).fontSize) * Math.hypot(ctm.b, ctm.d) : 0;
      }) : [];
      return {
        counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
        expanded: button?.getAttribute('aria-expanded'),
        title: panel?.querySelector('h2')?.textContent.trim(),
        bodyText: body?.textContent.replace(/\\s+/g, ' ').trim() || '',
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        drawerOverflow: body ? body.scrollWidth > body.clientWidth + 1 : true,
        drawerClientWidth: body?.clientWidth,
        drawerScrollWidth: body?.scrollWidth,
        wide: body ? [...body.querySelectorAll('*')].filter((el) => {
          const rect = el.getBoundingClientRect(), bounds = body.getBoundingClientRect();
          return rect.right > bounds.right + 1 || rect.left < bounds.left - 1;
        }).slice(0, 12).map((el) => ({
          tag: el.tagName,
          className: typeof el.className === 'string' ? el.className : '',
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 180),
        })) : [],
        katexErrors: body?.querySelectorAll('.katex-error').length || 0,
        rawMath: body?.textContent.includes('$$') || false,
        minStageFont: sizes.length ? Math.min(...sizes) : 0,
        activeElement: document.activeElement?.className,
      };
    })()`);
    const missing = expected[lang].filter((text) => !state.bodyText.includes(text));
    const counter = state.counter?.match(/\d+/g)?.map(Number);
    const record = { step: 9, lang, ...state, bodyText: undefined, missing };
    states.push(record);
    if (counter?.[0] !== 9 || counter?.[1] !== 10 || state.expanded !== 'true' || !state.title ||
        missing.length || state.pageOverflow || state.drawerOverflow || state.katexErrors || state.rawMath) {
      throw new Error(`deep audit failed for ${lang}: ${JSON.stringify(record)}`);
    }
    writeFileSync(join(out, `13-9-${lang}.png`), await page.screenshot());
    await page.close();
  }
} finally {
  browser.close();
}
const report = { base, width, states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ views: states.length, minStageFont: Math.min(...states.map((state) => state.minStageFont)), report: join(out, 'report.json') }));
