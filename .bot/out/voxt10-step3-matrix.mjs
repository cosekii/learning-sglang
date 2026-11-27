// Assertion matrix for Voxt 10 displayed Step 3 (component step 2) protocol order.
// For each of the six EVAL language/viewport/entry combinations, waits for phases 3, 4 and 5
// separately and throws unless:
//   phase 3: exactly one {"segment": …} reply line, PCM "still being sent", no all-sent, no done payload
//   phase 4: exactly two segment lines, still sending, no all-sent, no done payload
//   phase 5: two segment lines plus the exact {"done":true,"count":2} payload, "all sent", no sending text
// Counter must read 03 / 11 in every state. Any mismatch throws; output is saved as JSON.
// usage: node .bot/out/voxt10-step3-matrix.mjs [baseUrl]   (default http://localhost:4489/learning-sglang)
import { writeFileSync } from 'node:fs';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = process.argv[2] ?? 'http://localhost:4489/learning-sglang';
const url = `${base}/voxt/ch/file-transcription/`;
const SEG = '{"segment": …}';
const DONE = '{"done":true,"count":2}';
const SENDING = ['still being sent', '还在发送'];
const ALLSENT = ['all sent', '全部送完'];

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
    await page.goto(`${url}?step=2`);
    await sleep(1200);
    await page.evaluate(`[...document.querySelectorAll('button.icon')].find(b => /Next|下一步/.test(b.title))?.click()`);
  } else {
    await page.goto(`${url}?step=3`);
  }
  const states = {};
  for (const target of ['3', '4', '5']) {
    const reached = await page.evaluate(`(${waitPhase})('${target}')`);
    const i = await page.evaluate(grab);
    const has = (s) => i.texts.some((t) => t.includes(s));
    const state = {
      reached,
      phase: i.phase,
      counter: i.counter,
      segmentLines: i.texts.filter((t) => t === SEG).length,
      donePayload: i.texts.some((t) => t === DONE),
      sending: SENDING.some(has),
      allSent: ALLSENT.some(has),
    };
    states[`phase${target}`] = state;
    check(name, target, reached, 'phase not reached within 16 s');
    check(name, target, i.counter.replace(/\s/g, '') === '03/11', `counter is ${i.counter}, expected 03 / 11`);
    check(name, target, state.segmentLines === (target === '3' ? 1 : 2), `segment reply lines = ${state.segmentLines}`);
    if (target === '5') check(name, target, state.donePayload, 'missing exact {"done":true,"count":2} payload');
    else check(name, target, !state.donePayload, 'done payload present before upload completion');
    if (target === '5') {
      check(name, target, state.allSent, 'missing all-sent text');
      check(name, target, !state.sending, 'still-being-sending text present in final phase');
    } else {
      check(name, target, state.sending, 'missing still-being-sent text');
      check(name, target, !state.allSent, 'all-sent text present before upload completion');
    }
  }
  console.log(`${name}: phase3 ${JSON.stringify(states.phase3)}`);
  console.log(`${name}: phase4 ${JSON.stringify(states.phase4)}`);
  console.log(`${name}: phase5 ${JSON.stringify(states.phase5)}`);
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
writeFileSync(new URL('./voxt10-step3-matrix.json', import.meta.url), JSON.stringify(out, null, 2));
if (failures.length) {
  console.error(`FAIL ${failures.length}\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`PASS ${results.length} combinations x 3 phases, output saved to .bot/out/voxt10-step3-matrix.json`);
