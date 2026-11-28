// Voxt 11/04 deep-drawer overflow check: opens the drawer (localStorage deep=1) on the
// given steps, in en and zh, at desktop 1440x900 and phone 360/390/430 px.
// Asserts counter, aria-expanded=true, no raw $$ and no .katex-error, and
// .deep-body scrollWidth <= clientWidth. Reports the widest children on failure.
// Run with the dev server up: `node .bot/out/voxt11-deep-overflow.mjs`.
// Optional: BASE=... OUT=... SLUG=models-and-app-updates TOTAL=06 STEPS=4
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4321/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/voxt11-deep-overflow';
const slug = process.env.SLUG || 'models-and-app-updates';
const total = process.env.TOTAL || '06';
const steps = (process.env.STEPS || '4').split(',').map(Number);
const views = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: '360', width: 360, height: 844, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '430', width: 430, height: 844, mobile: true },
];
const failures = [];
const results = [];
mkdirSync(out, { recursive: true });

const browser = await launch({ width: 1440, height: 900 });
const keepAlive = setInterval(() => {}, 1000);
try {
  for (const view of views) {
    for (const lang of ['en', 'zh']) {
      const page = await browser.tab({ width: view.width, height: view.height, mobile: view.mobile });
      await page.goto(`${base}/voxt/ch/${slug}/`);
      await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '1')`);
      for (const step of steps) {
        await page.goto(`${base}/voxt/ch/${slug}/?step=${step}`);
        await sleep(1200);
        const r = await page.evaluate(`(() => {
          const body = document.querySelector('.deep-body');
          const btn = document.querySelector('button.deep');
          if (!body || !btn) return { missing: true };
          const bodyRect = body.getBoundingClientRect();
          const padR = parseFloat(getComputedStyle(body).paddingRight) || 0;
          const contentRight = bodyRect.right - padR;
          const clipped = (el) => {
            for (let n = el.parentElement; n && n !== body; n = n.parentElement) {
              const o = getComputedStyle(n).overflowX;
              if (o === 'auto' || o === 'scroll' || o === 'hidden') return true;
            }
            return false;
          };
          const wide = [...body.querySelectorAll('*')].filter((el) => !clipped(el)).map((el) => {
            const b = el.getBoundingClientRect();
            return { tag: el.tagName, cls: typeof el.className === 'string' ? el.className : '', text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 50), right: Math.round(b.right * 100) / 100, w: Math.round(b.width * 100) / 100 };
          }).filter((x) => x.w > 0 && x.right > contentRight + 0.5)
            .sort((a, b) => b.right - a.right).slice(0, 4);
          return {
            counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
            expanded: btn.getAttribute('aria-expanded'),
            client: body.clientWidth,
            scroll: body.scrollWidth,
            rawMath: (body.textContent || '').includes('$$'),
            katexError: Boolean(body.querySelector('.katex-error')),
            wide,
          };
        })()`);
        const tag = `${lang}-${view.name}-s${step}`;
        if (r.missing) failures.push(`${tag}: no deep body/button`);
        else {
          if (r.counter !== `${String(step).padStart(2, '0')} / ${total}`) failures.push(`${tag}: counter ${r.counter}`);
          if (r.expanded !== 'true') failures.push(`${tag}: aria-expanded ${r.expanded}`);
          if (r.rawMath) failures.push(`${tag}: raw $$ in drawer`);
          if (r.katexError) failures.push(`${tag}: .katex-error present`);
          if (r.scroll > r.client) failures.push(`${tag}: drawer overflow client=${r.client} scroll=${r.scroll} widest=${JSON.stringify(r.wide)}`);
          results.push({ view: view.name, lang, step, ...r });
          console.log(JSON.stringify({ tag, client: r.client, scroll: r.scroll, ok: r.scroll <= r.client }));
        }
      }
      await page.close();
    }
  }
} finally {
  clearInterval(keepAlive);
  browser.close();
}
writeFileSync(join(out, 'report.json'), JSON.stringify({ failures, results }, null, 2));
console.log(failures.length ? `FAILURES:\n${failures.join('\n')}` : 'all clear');
process.exit(failures.length ? 1 : 0);
