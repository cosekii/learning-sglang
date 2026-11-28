// Lane k1: Omni-21 seam matrix for Omni 06 Step 8.
// Combos: en desktop 1440x900, zh desktop, zh 390px; entries: direct ?step=8, previous (?step=7 -> ArrowRight).
// Per combo: two mechanism states (early phase vs final phase), counter/phase identity, PNG per state.
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch, sleep } from '/Users/shuohuang/code/hmz-work/ls-k1-1128-103628/scripts/lib/browser.mjs';

const base = 'http://localhost:4321/learning-sglang/omni/ch/06-batching-backpressure/';
const outDir = '/tmp/k1-matrix';
mkdirSync(outDir, { recursive: true });

const STATE = `(() => {
  const root = document.querySelector('[data-animation-step]');
  const texts = [...document.querySelectorAll('.canvas svg text')].map((t) => t.textContent.replace(/\\s+/g, ' ').trim());
  return {
    step: root?.getAttribute('data-animation-step'),
    phase: root?.getAttribute('data-animation-phase'),
    final: root?.getAttribute('data-animation-final-phase'),
    counter: document.querySelector('.counter')?.textContent.replace(/\\s+/g, ' ').trim(),
    caption: document.querySelector('.caption')?.textContent.replace(/\\s+/g, ' ').trim(),
    counts: texts.filter((t) => /frames =|delivered|upstream poll|poll/.test(t)),
    arrows: [...document.querySelectorAll('.canvas svg path[marker-end]')].map((p) => p.getAttribute('opacity')),
    footnote: texts.filter((t) => /Next chapter|下一章/.test(t)),
  };
})()`;

const waitPhase = async (page, target, timeout = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const phase = await page.evaluate(`document.querySelector('[data-animation-step]')?.getAttribute('data-animation-phase')`);
    if (phase === String(target)) return true;
    await sleep(60);
  }
  return false;
};

const setLang = (page, lang) =>
  page.evaluate(`document.documentElement.dataset.lang = '${lang}'; window.dispatchEvent(new CustomEvent('langchange', { detail: '${lang}' }))`);

const browser = await launch({ port: 9460 });
const results = [];
for (const combo of [
  { name: 'en-desktop', lang: 'en', vp: {} },
  { name: 'zh-desktop', lang: 'zh', vp: {} },
  { name: 'zh-390', lang: 'zh', vp: { width: 390, height: 844, mobile: true } },
]) {
  for (const entry of ['direct', 'previous']) {
    const page = await browser.tab(combo.vp);
    await page.goto(entry === 'direct' ? `${base}?step=8` : `${base}?step=7`);
    await setLang(page, combo.lang);
    if (entry === 'previous') { await sleep(400); await page.press('ArrowRight'); }
    await sleep(500);
    const id = await page.evaluate(STATE);
    const okEarly = await waitPhase(page, 1);
    const early = await page.evaluate(STATE);
    writeFileSync(`${outDir}/${combo.name}-${entry}-p1.png`, await page.screenshot());
    const okFinal = await waitPhase(page, 4);
    const final = await page.evaluate(STATE);
    writeFileSync(`${outDir}/${combo.name}-${entry}-p4.png`, await page.screenshot());
    const changed = JSON.stringify(early.counts) !== JSON.stringify(final.counts) || JSON.stringify(early.arrows) !== JSON.stringify(final.arrows);
    results.push({
      combo: combo.name, entry,
      counter: final.counter, animationStep: final.step, finalPhase: final.final,
      reachedPhase1: okEarly, reachedFinal: okFinal, mechanismChanged: changed,
      earlyPhase: early.phase, finalPhaseNow: final.phase,
      caption: final.caption, footnote: final.footnote,
      earlyCounts: early.counts, finalCounts: final.counts,
    });
    await page.close();
  }
}
await browser.close();
writeFileSync(`${outDir}/report.json`, JSON.stringify(results, null, 2));
for (const r of results) {
  const pass = r.counter === '08 / 08' && r.animationStep === '7' && r.reachedPhase1 && r.reachedFinal && r.mechanismChanged && r.footnote.length === 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${r.combo} ${r.entry} · counter=${r.counter} phase ${r.earlyPhase}→${r.finalPhaseNow} · footnote=${r.footnote[0] ?? 'MISSING'}`);
}
