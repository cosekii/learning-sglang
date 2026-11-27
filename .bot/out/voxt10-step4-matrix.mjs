// Assertion matrix for Voxt 10 displayed Step 4 (component step 3), whose animation predates lane d's
// build-up work: a cursor sweeps the waveform and the 450 ms quiet window highlights when the cursor
// crosses it. For each of the six EVAL language/viewport/entry combinations, samples for up to 9 s and
// throws unless: the cursor's x changes across samples, the quiet-window highlight (the rect stroked
// var(--fg)) appears in at least one sample, and the counter reads 04 / 11. Output is saved as JSON.
// usage: node .bot/out/voxt10-step4-matrix.mjs [baseUrl]   (default http://localhost:4489/learning-sglang)
import { writeFileSync } from 'node:fs';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = process.argv[2] ?? 'http://localhost:4489/learning-sglang';
const url = `${base}/voxt/ch/file-transcription/`;
const grab = `({
  counter: document.querySelector('.counter')?.innerText.trim(),
  cursorX: Number(document.querySelector('figure.viz svg line[stroke="var(--fg)"]')?.getAttribute('x1')),
  quietLit: !!document.querySelector('figure.viz svg rect[stroke="var(--fg)"]')
})`;

const failures = [];
const check = (combo, cond, what) => { if (!cond) failures.push(`${combo}: ${what}`); };

async function run(name, zh, width, entry) {
  const browser = await launch({ port: 9700 + Math.floor(Math.random() * 200), width, height: width < 600 ? 844 : 900 });
  const page = await browser.tab();
  if (zh) { await page.goto(url); await page.evaluate(`localStorage.setItem('lang', 'zh')`); }
  if (entry === 'prev') {
    await page.goto(`${url}?step=3`);
    await sleep(1200);
    await page.evaluate(`[...document.querySelectorAll('button.icon')].find(b => /Next|下一步/.test(b.title))?.click()`);
  } else {
    await page.goto(`${url}?step=4`);
  }
  const xs = new Set();
  let quietSeen = false;
  let counter = '';
  const deadline = Date.now() + 9000;
  while (Date.now() < deadline) {
    const i = await page.evaluate(grab);
    counter = i.counter;
    if (Number.isFinite(i.cursorX)) xs.add(Math.round(i.cursorX));
    if (i.quietLit) { quietSeen = true; break; }
    await sleep(250);
  }
  const result = { cursorPositions: xs.size, quietHighlightSeen: quietSeen, counter };
  console.log(`${name}: ${JSON.stringify(result)}`);
  check(name, xs.size >= 2, `cursor did not move (${xs.size} position)`);
  check(name, quietSeen, 'quiet-window highlight never appeared in 9 s');
  check(name, counter.replace(/\s/g, '') === '04/11', `counter is ${counter}, expected 04 / 11`);
  await page.close();
  await browser.close();
  return { combo: name.trim(), ...result };
}

const results = [];
results.push(await run('en-desktop-direct', false, 1440, 'direct'));
results.push(await run('zh-desktop-direct', true, 1440, 'direct'));
results.push(await run('zh-390-direct', true, 390, 'direct'));
results.push(await run('en-desktop-prev-entry', false, 1440, 'prev'));
results.push(await run('zh-desktop-prev-entry', true, 1440, 'prev'));
results.push(await run('zh-390-prev-entry', true, 390, 'prev'));

const out = { base, when: new Date().toISOString(), combinations: results.length, failures, results };
writeFileSync(new URL('./voxt10-step4-matrix.json', import.meta.url), JSON.stringify(out, null, 2));
if (failures.length) {
  console.error(`FAIL ${failures.length}\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`PASS ${results.length} combinations, output saved to .bot/out/voxt10-step4-matrix.json`);
