// Voxt perf public-facts increment: opened-drawer captures of the six changed
// deep sections, en + zh, desktop 1440x900. Start the dev server on 4475, then
// run `node .bot/out/voxt-perf-public-deeps.mjs`.
// Optional: BASE=http://localhost:4475/learning-sglang OUT=.bot/out/voxt-perf-public-deeps
// Asserts per capture: counter, html lang, the deep button's aria-expanded=true,
// the PR entry present and scrolled into the drawer viewport, and zero
// horizontal overflow (page and drawer body). DOM and geometry only.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { launch, sleep } from '../../scripts/lib/browser.mjs';

const base = (process.env.BASE || 'http://localhost:4475/learning-sglang').replace(/\/$/, '');
const out = process.env.OUT || '.bot/out/voxt-perf-public-deeps';
const targets = [
  { slug: 'speech-recognition-routes', step: 6, counter: '06 / 07', pr: 'PR #2549', lead: 'Public performance evidence', leadZh: '公开性能证据' },
  { slug: 'models-and-app-updates', step: 4, counter: '04 / 06', pr: 'PR #4407', lead: 'Public performance evidence', leadZh: '公开性能证据' },
  { slug: 'compose-and-cleanup', step: 5, counter: '05 / 08', pr: 'PR #4295', lead: 'Public performance evidence', leadZh: '公开性能证据' },
  { slug: 'personal-dictionary', step: 3, counter: '03 / 07', pr: 'PR #4589', lead: 'Public performance evidence', leadZh: '公开性能证据' },
  { slug: 'personal-dictionary', step: 4, counter: '04 / 07', pr: 'PR #3795', lead: 'Public performance evidence', leadZh: '公开性能证据' },
  { slug: 'microphone-to-voice-frames', step: 6, counter: '06 / 08', pr: 'PR #2833', lead: 'Public performance evidence', leadZh: '公开性能证据' },
];
const failures = [];
const results = [];
mkdirSync(out, { recursive: true });

// One browser per capture: a reused browser froze the background compositor in
// an earlier audit and produced byte-identical PNGs for distinct DOM states.
for (const t of targets) {
  for (const lang of ['en', 'zh']) {
    const name = `${t.slug}-s${t.step}-${lang}`;
    const url = `${base}/voxt/ch/${t.slug}/?step=${t.step}`;
    const browser = await launch({ width: 1440, height: 900 });
    try {
      const page = await browser.tab({ width: 1440, height: 900 });
      await page.goto(url);
      await page.evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('deep', '1')`);
      await page.goto(url);
      await sleep(1200);
      const state = await page.evaluate(`(() => {
        const button = document.querySelector('button.deep');
        const body = document.querySelector('.deep-body');
        const needle = ${JSON.stringify(t.pr)};
        const leadNeedle = ${JSON.stringify(t.lead)};
        const leadZhNeedle = ${JSON.stringify(t.leadZh)};
        const links = body ? [...body.querySelectorAll('a')] : [];
        const prLink = links.find((a) => a.textContent.trim() === needle);
        if (prLink) prLink.scrollIntoView({ block: 'center' });
        const prRect = prLink?.getBoundingClientRect();
        const bodyRect = body?.getBoundingClientRect();
        const visible = !!(prRect && bodyRect && prRect.top >= bodyRect.top && prRect.bottom <= bodyRect.bottom);
        return {
          counter: document.querySelector('.counter')?.textContent.trim().replace(/\s+/g, ' '),
          lang: document.documentElement.dataset.lang,
          expanded: button?.getAttribute('aria-expanded'),
          prFound: !!prLink,
          prHref: prLink?.getAttribute('href'),
          prVisibleAfterScroll: visible,
          leadFound: body ? body.textContent.includes(leadNeedle) || body.textContent.includes(leadZhNeedle) : false,
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
          drawerOverflow: body ? body.scrollWidth - body.clientWidth : null,
        };
      })()`);
      await sleep(400);
      if (state.counter !== t.counter) failures.push(`${name}: counter ${state.counter}`);
      if (state.lang !== lang) failures.push(`${name}: html lang ${state.lang}`);
      if (state.expanded !== 'true') failures.push(`${name}: aria-expanded ${state.expanded}`);
      if (!state.prFound) failures.push(`${name}: ${t.pr} link not found in drawer`);
      if (!state.leadFound) failures.push(`${name}: public-evidence lead-in not found`);
      if (!state.prVisibleAfterScroll) failures.push(`${name}: ${t.pr} not inside drawer viewport after scroll`);
      if (state.pageOverflow > 0) failures.push(`${name}: page horizontal overflow ${state.pageOverflow}px`);
      if (state.drawerOverflow > 0) failures.push(`${name}: drawer horizontal overflow ${state.drawerOverflow}px`);
      const shot = await page.screenshot();
      const file = join(out, `${name}.png`);
      writeFileSync(file, shot);
      results.push({ name, sha256: createHash('sha256').update(shot).digest('hex'), ...state });
    } finally {
      await browser.close();
    }
  }
}

writeFileSync(join(out, 'report.json'), JSON.stringify({ base, targets: targets.length * 2, failures, results }, null, 2));
console.log(JSON.stringify({ captures: results.length, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
