// Screenshot steps with the deep-dive panel open, in Chinese or English.
// usage: node scripts/deep-shot.mjs <outDir> <zh|en> <slug> <step> [<step> ...]
//   W=1440 H=900 set the viewport.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, sleep } from './lib/browser.mjs';

const [outDir, lang, slug, ...steps] = process.argv.slice(2);
if (!outDir || !slug || !steps.length) { console.error('usage: deep-shot.mjs <outDir> <zh|en> <slug> <step> ...'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const browser = await launch({ port: 9334, width: Number(process.env.W) || 1440, height: Number(process.env.H) || 900 });
const page = await browser.tab();
const base = 'http://localhost:4321/learning-sglang/ch/';
await page.goto(base + slug + '/');
await page.evaluate(`localStorage.setItem('lang', ${JSON.stringify(lang)})`);
for (const s of steps) {
  await page.goto(`${base}${slug}/?step=${s}`);
  await sleep(1500);
  await page.evaluate(`(() => { const b = document.querySelector('button.deep'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); })()`);
  await sleep(1200);
  const name = `${slug}-${lang}-s${s}.png`;
  writeFileSync(join(outDir, name), await page.screenshot());
  console.log(name);
}
browser.close();
