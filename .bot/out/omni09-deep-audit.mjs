// Verify Omni 05 Steps 1–3 open deep drawers in English and Chinese.
// Usage: WIDTH=390 BASE=http://127.0.0.1:4501/learning-sglang node .bot/out/omni09-deep-audit.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4501/learning-sglang').replace(/\/$/, '');
const width = Number(process.env.WIDTH) || 1440;
const height = width <= 900 ? 1000 : 900;
const out = process.env.OUT || `.bot/out/omni09-deep-${width}`;
mkdirSync(out, { recursive: true });
const expected = {
  1: {
    en: ['Both panels start', 'Blue marks A', 'does not claim that B has been read'],
    zh: ['两边起初', '蓝色表示先到的 A', '末相没有说 B 已经被读取'],
  },
  2: {
    en: ['SHM means shared memory', 'field-use preview', 'Step 3 performs that send'],
    zh: ['SHM 就是共享内存', '字段使用预览', '第 3 步才执行发布'],
  },
  3: {
    en: ['watch_pending', 'job.ready', 'not drawn'],
    zh: ['watch_pending', 'job.ready', '不在图上'],
  },
};
const states = [];
const browser = await launch({ width, height });
try {
  for (const step of [1, 2, 3]) for (const lang of ['en', 'zh']) {
    const page = await browser.tab({ width, height, mobile: width <= 900 });
    const url = `${base}/omni/ch/05-data-lifetime/?step=${step}`;
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
    await sleep(400);
    await page.evaluate(`document.querySelector('button.deep')?.click()`);
    await sleep(400);
    const state = await page.evaluate(`(() => {
      const button = document.querySelector('button.deep');
      const panel = document.querySelector('.deep-panel');
      const body = document.querySelector('.deep-body');
      const svg = document.querySelector('.viz svg');
      const opacity = (el) => {
        let value = 1;
        for (let node = el; node && node !== svg; node = node.parentElement) value *= Number(getComputedStyle(node).opacity);
        return value;
      };
      const sizes = svg ? [...svg.querySelectorAll('text')].filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width && rect.height && opacity(el) >= 0.05;
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
          text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 180),
        })) : [],
        katexErrors: body?.querySelectorAll('.katex-error').length || 0,
        rawMath: body?.textContent.includes('$$') || false,
        minStageFont: sizes.length ? Math.min(...sizes) : 0,
        activeElement: document.activeElement?.className,
      };
    })()`);
    const missing = expected[step][lang].filter((text) => !state.bodyText.includes(text));
    const counter = state.counter?.match(/\d+/g)?.map(Number);
    const record = { step, lang, ...state, bodyText: undefined, missing };
    states.push(record);
    if (counter?.[0] !== step || counter?.[1] !== 5 || state.expanded !== 'true' || !state.title ||
        missing.length || state.pageOverflow || state.drawerOverflow || state.katexErrors || state.rawMath) {
      throw new Error(`deep audit failed for step ${step} ${lang}: ${JSON.stringify(record)}`);
    }
    writeFileSync(join(out, `05-${step}-${lang}.png`), await page.screenshot());
    await page.close();
  }
} finally {
  browser.close();
}
const report = { base, width, states };
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ views: states.length, minStageFont: Math.min(...states.map((state) => state.minStageFont)), report: join(out, 'report.json') }));
