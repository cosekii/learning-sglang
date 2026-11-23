<script lang="ts">
  // Reusable step controller. Every visualization is "a function of a step number";
  // this component owns the number, the caption and the keyboard; the viz owns the drawing.
  import type { NavLink } from '../chapters';
  import { lang, syncLang } from '../i18n';
  interface Props {
    step: number; total: number; caption: string; captionZh?: string; onchange: (s: number) => void;
    deep?: string; deepZh?: string;   // optional per-step long-form explanation, shown in a toggleable panel
    prev?: NavLink; next?: NavLink;   // neighbouring chapters, offered at the first and last step
  }
  let { step, total, caption, captionZh, deep, deepZh, onchange, prev, next }: Props = $props();
  // Pick up the saved language after hydration, same pattern as ?step= in the viz components.
  $effect(() => { syncLang(); });
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const shown = $derived($lang === 'zh' && captionZh ? captionZh : caption);
  const shownDeep = $derived($lang === 'zh' && deepZh ? deepZh : deep);
  // The deep-dive drawer stays open across steps and pages, so a reader can follow it through a chapter.
  let open = $state(false);
  let body: HTMLElement | undefined = $state();
  $effect(() => { open = localStorage.getItem('deep') === '1'; });
  function toggle(v = !open) { open = v; localStorage.setItem('deep', v ? '1' : '0'); }
  // html.deep-open makes room for the drawer (global.css); a new step starts at the top of its text.
  $effect(() => { document.documentElement.classList.toggle('deep-open', open && !!shownDeep); });
  $effect(() => { step; if (body) body.scrollTop = 0; });
  const atStart = $derived(step === 0);
  const atEnd = $derived(step === total - 1);
  const prevLink = $derived(atStart && prev?.ready ? prev : undefined);
  const nextLink = $derived(atEnd && next?.ready ? next : undefined);

  function go(delta: number) {
    const next = Math.min(total - 1, Math.max(0, step + delta));
    if (next !== step) onchange(next);
  }
  function jump(s: number) { if (s !== step) onchange(s); }

  // One viz per page, so the whole window drives it: ← → step.
  function onkey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if ((e.key === 'd' || e.key === 'D') && shownDeep) toggle();
    else if (e.key === 'Escape' && open) toggle(false);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
</script>

<svelte:window onkeydown={onkey} />

<div class="controls">
  <p class="caption"><span>{@html shown}</span></p>
  <div class="row">
    <div class="buttons">
      <button class="icon" onclick={() => jump(0)} disabled={atStart} title={t('Reset', '重置')}>↺</button>
      {#if prevLink}
        <a class="chapter" href={prevLink.href}><span>← {t(prevLink.title, prevLink.titleZh ?? prevLink.title)}</span></a>
      {:else}
        <button class="icon" onclick={() => go(-1)} disabled={atStart} title={t('Previous', '上一步')}>←</button>
      {/if}
      {#if nextLink}
        <a class="chapter next" href={nextLink.href}><span>{t('Next: ', '下一章：')}{t(nextLink.title, nextLink.titleZh ?? nextLink.title)} →</span></a>
      {:else}
        <button class="icon" onclick={() => go(1)} disabled={atEnd} title={t('Next', '下一步')}>→</button>
      {/if}
      {#if shownDeep}
        <button class="deep" class:on={open} onclick={() => toggle()} aria-expanded={open} title={t('Deep dive (D)', '深入讲解（D）')}>{t('Deep dive', '深入讲解')} <kbd>D</kbd></button>
      {/if}
    </div>
    <div class="progress" role="tablist">
      {#each Array(total) as _, i}
        <button class="seg" class:on={i <= step} class:cur={i === step} onclick={() => jump(i)} aria-label={t(`step ${i + 1}`, `第 ${i + 1} 步`)}></button>
      {/each}
    </div>
    <span class="counter">{pad(step + 1)} <em>/</em> {pad(total)}</span>
  </div>
</div>

{#if open && shownDeep}
  <aside class="deep-panel" aria-label={t('Deep dive', '深入讲解')}>
    <header>
      <span>{t('Deep dive', '深入讲解')} · {t(`step ${step + 1} of ${total}`, `第 ${step + 1} / ${total} 步`)}</span>
      <button class="close" onclick={() => toggle(false)} title={t('Close (Esc)', '关闭（Esc）')}>×</button>
    </header>
    <div class="deep-body" bind:this={body}>{@html shownDeep}</div>
    <footer>
      <button onclick={() => go(-1)} disabled={atStart}>← {t('Previous step', '上一步')}</button>
      <button onclick={() => go(1)} disabled={atEnd}>{t('Next step', '下一步')} →</button>
    </footer>
  </aside>
{/if}

<style>
  .controls { font-family: var(--sans); flex: 0 0 auto; }
  /* Fixed height (3 lines) so the canvas above never shifts when a caption wraps differently. Keep captions to 3 lines at 60ch. */
  .caption { --lh: 1.45; height: calc(1.3rem * var(--lh) * 3); margin: 0.6rem auto; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 1.3rem; line-height: var(--lh); letter-spacing: -0.01em; }
  /* with the deep-dive drawer open the column is narrower; a smaller size keeps a 60ch caption within its 3 lines */
  :global(html.deep-open) .caption { font-size: 1.08rem; }
  :global(html.deep-open) .progress { gap: 3px; }
  .caption span { max-width: 60ch; text-align: center; text-wrap: balance; }
  .caption :global(b) { font-weight: 650; }
  .caption :global(code) { font-family: var(--mono); font-size: 0.82em; background: var(--code-bg); padding: 0.1em 0.35em; border-radius: 5px; }
  .row { display: flex; align-items: center; gap: 1rem; }
  .buttons { margin-right: auto; }
  .buttons { display: flex; gap: 0.45rem; }
  button, .chapter { font: inherit; font-size: 0.95rem; height: 40px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; border-radius: 999px; border: 1px solid var(--line); background: white; color: var(--fg); cursor: pointer; transition: border-color 150ms, background 150ms, transform 100ms; }
  button:hover:not(:disabled), .chapter:hover { border-color: var(--faint); }
  button:active:not(:disabled) { transform: translateY(1px); }
  button:disabled { opacity: 0.35; cursor: default; }
  .icon { width: 40px; padding: 0; font-size: 1.05rem; }
  .chapter { padding: 0 1rem; font-size: 0.9rem; color: var(--fg); text-decoration: none; white-space: nowrap; }
  .chapter.next { background: var(--accent-soft); border-color: transparent; color: var(--accent); font-weight: 550; }
  .chapter.next:hover { border-color: var(--accent); }
  .buttons { flex: 0 0 auto; }
  .progress { display: flex; gap: 5px; flex: 0 1 auto; min-width: 0; overflow: hidden; }
  .seg { flex: 0 1 26px; min-width: 2px; width: 26px; height: 6px; padding: 0; border-radius: 3px; border: 0; background: var(--line); transition: background 200ms; }
  .seg.on { background: var(--accent); opacity: 0.45; }
  .seg.cur { opacity: 1; }
  .seg:hover { opacity: 0.8; background: var(--accent); }
  .counter { white-space: nowrap; font-family: var(--mono); color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
  .counter em { font-style: normal; color: var(--faint); }
  .deep { padding: 0 0.8rem 0 1rem; font-size: 0.9rem; gap: 0.45rem; white-space: nowrap; }
  .deep kbd { font-family: var(--mono); font-size: 0.7rem; border: 1px solid var(--line); border-radius: 4px; padding: 0.05em 0.35em; color: var(--muted); background: var(--bg); }
  .deep.on { background: var(--accent-soft); border-color: transparent; color: var(--accent); font-weight: 550; }
  .deep.on kbd { border-color: transparent; color: var(--accent); background: white; }
  /* A drawer on the right, full height; html.deep-open in global.css narrows the stage to make room. */
  .deep-panel { position: fixed; top: 0; right: 0; bottom: 0; width: var(--deep-w); z-index: 20; display: flex; flex-direction: column; background: white; border-left: 1px solid var(--line); box-shadow: -8px 0 24px rgba(0, 0, 0, 0.04); font-family: var(--sans); }
  .deep-panel header, .deep-panel footer { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.7rem 1.25rem; }
  .deep-panel header { border-bottom: 1px solid var(--line); font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .deep-panel footer { border-top: 1px solid var(--line); }
  .deep-panel footer button { padding: 0 0.9rem; height: 34px; font-size: 0.85rem; }
  .close { width: 30px; height: 30px; padding: 0; font-size: 1.1rem; }
  .deep-body { flex: 1 1 auto; overflow-y: auto; padding: 1.1rem 1.5rem 1.5rem; font-size: 0.95rem; line-height: 1.75; color: var(--fg); }
  .deep-body :global(h2) { font-size: 1.15rem; font-weight: 650; letter-spacing: -0.01em; line-height: 1.4; margin: 0 0 0.8rem; }
  .deep-body :global(h3) { font-size: 0.85rem; font-weight: 650; letter-spacing: 0.02em; color: var(--accent); margin: 1.5rem 0 0.45rem; }
  .deep-body :global(p) { margin: 0 0 0.7rem; }
  .deep-body :global(ul), .deep-body :global(ol) { margin: 0 0 0.7rem; padding-left: 1.25rem; }
  .deep-body :global(li) { margin: 0.2rem 0; }
  .deep-body :global(blockquote) { margin: 0 0 0.9rem; padding: 0.6rem 0.9rem; background: var(--accent-soft); border-radius: 8px; color: var(--fg); }
  .deep-body :global(blockquote p) { margin: 0; }
  .deep-body :global(b), .deep-body :global(strong) { font-weight: 650; }
  .deep-body :global(code) { font-variant-ligatures: none; font-family: var(--mono); font-size: 0.85em; background: var(--code-bg); padding: 0.1em 0.35em; border-radius: 5px; }
  .deep-body :global(table) { width: 100%; border-collapse: collapse; margin: 0.3rem 0 0.9rem; font-size: 0.88rem; line-height: 1.5; }
  .deep-body :global(th), .deep-body :global(td) { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  .deep-body :global(th) { font-weight: 600; color: var(--muted); font-size: 0.8rem; }
  .deep-body :global(.katex-display) { margin: 0.6rem 0 0.9rem; padding: 0.55rem 0.4rem; background: var(--bg); border-radius: 8px; overflow-x: auto; overflow-y: hidden; }
  .deep-body :global(.katex) { font-size: 1.05em; }

  /* Phones: the stage is narrower than 60ch, so a caption can take more than three lines. Let it grow past a five-line floor
     (most captions fit in five, so the buttons rarely move), put the progress bar on its own line, and let its segments shrink. */
  @media (max-width: 900px) {
    .caption { font-size: 1.05rem; height: auto; min-height: calc(1.05rem * var(--lh) * 5); margin: 0.4rem 0; overflow: visible; }
    .caption span { max-width: 100%; overflow-wrap: anywhere; }
    .row { flex-wrap: wrap; gap: 0.6rem 0.75rem; }
    .buttons { flex: 1 1 100%; min-width: 0; margin-right: 0; flex-wrap: wrap; }
    .chapter { flex: 0 1 auto; min-width: 0; }
    .chapter span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .progress { flex: 1 1 0; min-width: 0; gap: 3px; }
    .seg { flex: 1 1 26px; width: auto; min-width: 3px; max-width: 26px; height: 8px; }
    .icon { flex: 0 0 40px; }
  }
</style>
