// Assertion matrix for Voxt 10 displayed Step 5 (component step 4) build-up.
// For each of the six EVAL language/viewport/entry combinations, waits for phases 1 and 3 and throws
// unless: phase 1 shows the CUE 2 bracket but no pre-roll rect and no bullets; phase 3 adds the
// 300 ms pre-roll label and the speech/cue time bullets. Counter must read 05 / 11. Output as JSON.
// usage: node .bot/out/voxt10-step5-matrix.mjs [baseUrl]   (default http://localhost:4489/learning-sglang)
import { writeFileSync } from 'node:fs';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = process.argv[2] ?? 'http://localhost:4489/learning-sglang';
const url = `${base}/voxt/ch/file-transcription/`;
const waitPhase = `(target) => new Promise((res) => { const deadline = Date.now() + 16000; const c = () => {
  const p = document.querySelector('figure.viz')?.getAttribute('data-animation-phase');
  if (p === target) return res(true);
  if (Date.now() > deadline) return res(false);
  setTimeout(c, 60); }; c(); })`;
const grab = `({
  phase: document.querySelector('figure.viz')?.getAttribute('data-animation-phase'),
  counter: document.querySelector('.counter')?.innerText.trim(),
  texts: [...document.querySelectorAll('figure.viz svg text')].map(t => t.textContent.trim()).filter(Boolean)
})`;

const failures = [];
const check = (combo, phase, cond, what) => { if (!cond) failures.push(`${combo} phase ${phase}: ${what}`); };

async function run(name, zh, width, entry) {
  const browser = await launch({ port: 9700 + Math.floor(Math.random() * 200), width, height: width < 600 ? 844 : 900 });
  const page = await browser.tab();
  if (zh) { await page.goto(url); await page.evaluate(`localStorage.setItem('lang', 'zh')`); }
  if (entry === 'prev') {
    await page.goto(`${url}?step=4`);
    await sleep(1200);
    await page.evaluate(`[...document.querySelectorAll('button.icon')].find(b => /Next|下一步/.test(b.title))?.click()`);
  } else {
    await page.goto(`${url}?step=5`);
  }
  const states = {};
  for (const target of ['1', '3']) {
    const reached = await page.evaluate(`(${waitPhase})('${target}')`);
    const i = await page.evaluate(grab);
    const has = (s) => i.texts.some((t) => t.includes(s));
    const state = {
      reached,
      phase: i.phase,
      counter: i.counter,
      cue2: has('CUE 2') || has('第 2 句'),
      preroll: has('300 ms'),
      bullets: has('speech at') || has('speech starts at') || has('讲话在') || has('讲话从'),
    };
    states[`phase${target}`] = state;
    check(name, target, reached, 'phase not reached within 16 s');
    check(name, target, i.counter.replace(/\s/g, '') === '05/11', `counter is ${i.counter}, expected 05 / 11`);
    check(name, target, state.cue2, 'CUE 2 bracket missing');
    if (target === '1') {
      check(name, target, !state.preroll, 'pre-roll label visible before phase 2');
      check(name, target, !state.bullets, 'time bullets visible before phase 3');
    } else {
      check(name, target, state.preroll, '300 ms pre-roll label missing in final phase');
      check(name, target, state.bullets, 'speech/cue time bullets missing in final phase');
    }
  }
  console.log(`${name}: ${JSON.stringify(states)}`);
  await page.close();
  await browser.close();
  return { combo: name.trim(), states };
}

const results = [];
results.push(await run('en-desktop-direct', false, 1440, 'direct'));
results.push(await run('zh-desktop-direct', true, 1440, 'direct'));
results.push(await run('zh-390-direct', true, 390, 'direct'));
results.push(await run('en-desktop-prev-entry', false, 1440, 'prev'));
results.push(await run('zh-desktop-prev-entry', true, 1440, 'prev'));
results.push(await run('zh-390-prev-entry', true, 390, 'prev'));

const out = { base, when: new Date().toISOString(), combinations: results.length, failures, results };
writeFileSync(new URL('./voxt10-step5-matrix.json', import.meta.url), JSON.stringify(out, null, 2));
if (failures.length) {
  console.error(`FAIL ${failures.length}\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`PASS ${results.length} combinations x 2 phases, output saved to .bot/out/voxt10-step5-matrix.json`);
