// Checks the deep-dive Markdown against docs/deep-dive-progress.md. No dev server needed.
// usage: node scripts/deep-check.mjs [NN]   (NN: one chapter, e.g. 03; default: every chapter marked done)
// Per chapter: src/deep/<slug>.{en,zh}.md each have one "## " section per step, the component has no inline
// deepDives left and passes deep to StepControls, and the MDX hands deep to the component.
import { readFileSync, existsSync } from 'node:fs';

const only = process.argv[2];
const rows = readFileSync('docs/deep-dive-progress.md', 'utf8').split('\n')
  .map((l) => l.split('|').map((c) => c.trim()))
  .filter((c) => /^\d\d$/.test(c[1] ?? ''))
  .map(([, nn, slug, comp, steps, status]) => ({ nn, slug, comp, steps: Number(steps), status }));

const todo = only ? rows.filter((r) => r.nn === only.padStart(2, '0')) : rows.filter((r) => r.status === 'done');
if (!todo.length) { console.error(only ? `no chapter ${only} in the progress table` : 'no chapter marked done'); process.exit(1); }

let bad = 0;
for (const r of todo) {
  const errs = [];
  for (const lang of ['en', 'zh']) {
    const f = `src/deep/${r.slug}.${lang}.md`;
    if (!existsSync(f)) { errs.push(`${f} missing`); continue; }
    const md = readFileSync(f, 'utf8');
    const n = (md.match(/^## /gm) ?? []).length;
    if (n !== r.steps) errs.push(`${f}: ${n} "## " sections, chapter has ${r.steps} steps`);
    // A Unicode subscript sum with its last subscript dropped, as chapter 2 once had ("Σ wⱼ v").
    if (/Σ[^\n]{0,15}?\bv(?![ⱼᵢ₀-₉_])[\s<`$]/.test(md)) errs.push(`${f}: a sum looks like it lost a subscript`);
  }
  const comp = readFileSync(`src/components/viz/${r.comp}.svelte`, 'utf8');
  if (/const deepDives/.test(comp)) errs.push(`${r.comp}.svelte still has an inline deepDives array`);
  if (!/deep=\{deep\?\.en\[step\]\} deepZh=\{deep\?\.zh\[step\]\}/.test(comp)) errs.push(`${r.comp}.svelte does not pass deep={deep?.en[step]} deepZh={deep?.zh[step]} to StepControls`);
  const mdx = readFileSync(`src/pages/ch/${r.slug}.mdx`, 'utf8');
  if (!mdx.includes(`deepFor('${r.slug}')`) || !/ deep=\{deep\}/.test(mdx)) errs.push(`${r.slug}.mdx does not load deepFor('${r.slug}') and pass deep={deep}`);
  if (errs.length) { bad++; console.log(`FAIL ${r.nn} ${r.slug}\n  ${errs.join('\n  ')}`); }
  else console.log(`ok   ${r.nn} ${r.slug} (${r.steps} steps)`);
}
process.exit(bad ? 1 : 0);
