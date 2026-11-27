// ML-62: verify ML 06 Step 3's deep table stays inside the drawer.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4503/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/ml62-deep-audit';
const url = `${base}/ml-sys/ch/06-slime-rollout-loop/?step=3`;
mkdirSync(out, { recursive: true });
const browser = await launch({ width: 1440, height: 900 });
const results = [];
const failures = [];

try {
  for (const lang of ['en', 'zh']) {
    for (const width of [360, 390, 430]) {
      const page = await browser.tab({ width, height: 1200, mobile: true });
      await page.goto(url);
      await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '1')`);
      await page.goto(url);
      await sleep(4400);
      const state = await page.evaluate(`(() => {
        const body = document.querySelector('.deep-body');
        const button = document.querySelector('button.deep');
        if (!body || !button) return { missing: true };
        const rect = body.getBoundingClientRect();
        const table = body.querySelector('table');
        const tableRect = table?.getBoundingClientRect();
        return {
          counter: document.querySelector('.counter')?.textContent.trim().replace(/\\s+/g, ' '),
          expanded: button.getAttribute('aria-expanded'),
          client: body.clientWidth,
          scroll: body.scrollWidth,
          bodyLeft: rect.left,
          bodyRight: rect.right,
          tableRight: tableRect?.right,
          tableOverflow: tableRect ? Math.max(0, tableRect.right - (rect.right - parseFloat(getComputedStyle(body).paddingRight))) : null,
          cells: table ? [...table.querySelectorAll('td')].map((cell) => ({ text: cell.textContent, html: cell.innerHTML, width: cell.getBoundingClientRect().width })) : [],
          rawMath: (body.textContent || '').includes('$$'),
          katexError: Boolean(body.querySelector('.katex-error')),
        };
      })()`);
      const name = `${lang}-${width}`;
      if (state.missing || state.counter !== '03 / 08' || state.expanded !== 'true' || state.rawMath || state.katexError) {
        failures.push(`${name}: identity or rendering failed`);
      } else if (state.scroll > state.client + 1) {
        failures.push(`${name}: drawer overflow client=${state.client} scroll=${state.scroll} table=${state.tableOverflow}px`);
      }
      writeFileSync(join(out, `${name}.png`), await page.screenshot());
      results.push({ name, ...state, png: `${name}.png` });
      await page.close();
    }
  }
} finally {
  browser.close();
}

writeFileSync(join(out, 'report.json'), JSON.stringify({ url, results, failures }, null, 2) + '\n');
console.log(JSON.stringify({ results: results.map(({ name, client, scroll, tableOverflow }) => ({ name, client, scroll, tableOverflow })), failures }, null, 2));
if (failures.length) process.exit(1);
