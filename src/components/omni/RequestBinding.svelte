<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    REQUEST_BINDING_PROCESS_NAME,
    REQUEST_BINDING_REQUEST_IDS,
    REQUEST_BINDING_ASSIGNMENTS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Two copies take turns: A and C use copy 0, and B uses copy 1. A\'s work is in copy 0, so its saved binding sends it there again.',
    captionZh: '两个副本轮流接：A、C 去第 0 份，B 去第 1 份。A 的记录在第 0 份；下次照绑定，仍去那里。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 940 : 560);
  const panels = $derived(REQUEST_BINDING_REQUEST_IDS.map((id, i) => phone
    ? { id, copy: REQUEST_BINDING_ASSIGNMENTS[i], x: 15, y: 85 + i * 175, w: 270, h: 160 }
    : { id, copy: REQUEST_BINDING_ASSIGNMENTS[i], x: 20 + i * 235, y: 85, w: 215, h: 260 }));
  const laterPanels = $derived(phone
    ? [{ x: 15, y: 640, w: 270, copy: 0 }, { x: 15, y: 765, w: 270, copy: 1 }]
    : [{ x: 20, y: 395, w: 325, copy: 0 }, { x: 375, y: 395, w: 325, copy: 1 }]);
  const arrival = (i: number) => t(`${i + 1}${['st', 'nd', 'rd'][i]} ARRIVAL`, `第 ${i + 1} 个到达`);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('Requests A, B and C arrive in order. The two talker_ar copies take turns: A and C bind to copy 0, B binds to copy 1. A has work in copy 0. Following its saved binding finds that work; switching to copy 1 would not.', '请求 A、B、C 依次到达。两个 talker_ar 副本轮流接收：A、C 绑定第 0 份，B 绑定第 1 份。A 的计算记录在第 0 份。照绑定去第 0 份能找到记录，改去第 1 份则没有。')}>
      <defs>
        <marker id="binding-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--muted)" />
        </marker>
      </defs>
      <text x={phone ? 5 : 20} y="20" class="pt">·</text>
      <text x={phone ? 15 : 30} y="20" class="tag strong">binding = {t('the copy choice saved for one request', '一个请求记住的副本选择')}</text>
      <text x={phone ? 5 : 20} y="42" class="pt">·</text>
      <text x={phone ? 15 : 30} y="42" class="tag">{t('An arrow shows which copy receives the request.', '箭头表示请求去了哪一份。')}</text>
      <text x={phone ? 5 : 20} y="64" class="pt">·</text>
      <text x={phone ? 15 : 30} y="64" class="tag">{t('The counter starts at 0; the two copies take turns.', '计数从 0 开始，两个副本轮流接。')}</text>

      {#each panels as panel, i}
        <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 15} y={panel.y + 22} class="rowlabel">{arrival(i)}</text>
        {#if phone}
          <rect x={panel.x + 15} y={panel.y + 37} width="78" height="42" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 54} y={panel.y + 62} text-anchor="middle" class="legend strong">{t('request', '请求')} {panel.id}</text>
          <line x1={panel.x + 96} y1={panel.y + 58} x2={panel.x + 151} y2={panel.y + 58} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#binding-arrow)" />
          <text x={panel.x + 124} y={panel.y + 45} text-anchor="middle" class="tag">{t('goes to', '分到')}</text>
          <rect x={panel.x + 158} y={panel.y + 32} width="97" height="54" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 206} y={panel.y + 53} text-anchor="middle" class="mono strong">{REQUEST_BINDING_PROCESS_NAME}</text>
          <text x={panel.x + 206} y={panel.y + 73} text-anchor="middle" class="tag strong">{t('copy', '第')} {panel.copy} {t('', '份')}</text>
          <rect x={panel.x + 15} y={panel.y + 103} width="240" height="40" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 135} y={panel.y + 128} text-anchor="middle" class="legend strong">{panel.id} → {REQUEST_BINDING_PROCESS_NAME}: {panel.copy} · {t('saved', '已记住')}</text>
        {:else}
          <rect x={panel.x + 57} y={panel.y + 40} width="100" height="40" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 107} y={panel.y + 65} text-anchor="middle" class="legend strong">{t('request', '请求')} {panel.id}</text>
          <line x1={panel.x + 107} y1={panel.y + 84} x2={panel.x + 107} y2={panel.y + 119} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#binding-arrow)" />
          <text x={panel.x + 120} y={panel.y + 105} class="tag">{t('goes to', '分到')}</text>
          <rect x={panel.x + 35} y={panel.y + 128} width="145" height="55" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 107} y={panel.y + 150} text-anchor="middle" class="mono strong">{REQUEST_BINDING_PROCESS_NAME}</text>
          <text x={panel.x + 107} y={panel.y + 172} text-anchor="middle" class="tag strong">{t('copy', '第')} {panel.copy} {t('', '份')}</text>
          <rect x={panel.x + 20} y={panel.y + 202} width="175" height="42" rx="8" fill="white" stroke="var(--line)" />
          <text x={panel.x + 107} y={panel.y + 220} text-anchor="middle" class="tag">{t('binding saved', '记住绑定')}</text>
          <text x={panel.x + 107} y={panel.y + 237} text-anchor="middle" class="mono strong">{panel.id} → {REQUEST_BINDING_PROCESS_NAME}: {panel.copy}</text>
        {/if}
      {/each}

      <text x={phone ? 15 : 30} y={phone ? 620 : 375} class="rowlabel">{t('REQUEST A SENDS AGAIN · ITS WORK IS IN COPY 0', '请求 A 再发消息 · 算到一半的记录在第 0 份')}</text>
      {#each laterPanels as panel}
        {@const saved = panel.copy === REQUEST_BINDING_ASSIGNMENTS[0]}
        <rect x={panel.x} y={panel.y} width={panel.w} height="110" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x={panel.x + 15} y={panel.y + 22} class="rowlabel">{saved ? t('USE SAVED BINDING', '照记住的绑定') : t('IF IT SWITCHED', '假如改去另一份')}</text>
        <rect x={panel.x + 15} y={panel.y + 38} width={phone ? 55 : 70} height="52" rx="8" fill="white" stroke="var(--line)" />
        <text x={panel.x + (phone ? 42 : 50)} y={panel.y + 69} text-anchor="middle" class="legend strong">A</text>
        <line x1={panel.x + (phone ? 73 : 90)} y1={panel.y + 64} x2={panel.x + (phone ? 101 : 121)} y2={panel.y + 64} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#binding-arrow)" />
        <rect x={panel.x + (phone ? 110 : 130)} y={panel.y + 38} width={phone ? 145 : 180} height="52" rx="8" fill="white" stroke="var(--line)" />
        <text x={panel.x + (phone ? 182 : 220)} y={panel.y + 58} text-anchor="middle" class="legend strong">{t('copy', '第')} {panel.copy} {t('', '份')}</text>
        <text x={panel.x + (phone ? 182 : 220)} y={panel.y + 79} text-anchor="middle" class="tag strong">{saved ? t('A\'s record is here', '有 A 的记录') : t('no record for A', '没有 A 的记录')}</text>
      {/each}
      <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('This step covers binding, not completion or abort.', '本步只讲绑定，不讲完成或取消。')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: how does request A release copy 0?', '下一步：请求 A 怎样释放第 0 份副本？')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
