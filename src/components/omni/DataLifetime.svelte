<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { LIFETIME_RESULT_IDS, LIFETIME_SLOT_COUNT, LIFETIME_WAITING_COUNT } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: "One space cannot hold results A and B together. B must wait until A's reader finishes.",
    captionZh: '一格放不下 A、B 两份结果。等 A 的读者读完，B 才能用这一格。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 650 : 390);
  const panels = $derived([
    { title: t('REUSE NOW · WRONG READ', '现在覆盖 · 读错'), x: phone ? 15 : 20, y: phone ? 105 : 105, w: phone ? 270 : 325 },
    { title: t('WAIT FOR THE READER', '等读者读完'), x: phone ? 15 : 375, y: phone ? 365 : 105, w: phone ? 270 : 325 },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('Thinker produces results A and B for talker_ar, but this teaching example has only one storage space. Reusing the space for B while talker_ar is still reading A gives the reader the wrong result. Keeping A until the reader finishes makes B wait and preserves the correct read.', 'thinker 要给 talker_ar 两份结果 A、B，本例只有一格存储空间。talker_ar 还在读 A 时就把这格改放 B，会读到错误结果。让 B 等 A 读完再用这格，读取结果才正确。')}>
      <text x={phone ? 15 : 20} y="20" class="tag strong">{t('Example: one space, two results; talker_ar is still reading A', '示例：一格空间、两份结果；talker_ar 还在读 A')}</text>
      <rect x={phone ? 15 : 20} y="33" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 31 : 36} y="42" class="tag">{t('result being read', '正在读的结果')}</text>
      <rect x={phone ? 147 : 175} y="33" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 163 : 191} y="42" class="tag">{t('next result', '下一份结果')}</text>
      <text x={phone ? 15 : 20} y="68" class="tag">thinker → talker_ar · {LIFETIME_RESULT_IDS.length} {t('results', '份结果')} − {LIFETIME_SLOT_COUNT} {t('space', '格')} = {LIFETIME_WAITING_COUNT} {t('must wait', '份要等')}</text>
      <text x={phone ? 15 : 20} y="90" class="tag">{t('The one-space pool is a teaching example, not a configured limit.', '一格只是教学例子，不是实际配置的上限。')}</text>

      {#each panels as panel, i}
        {@const wrong = i === 0}
        <rect x={panel.x} y={panel.y} width={panel.w} height="220" rx="12" fill="var(--bg)" stroke={wrong ? 'var(--gen)' : 'var(--accent)'} stroke-width={wrong ? 1 : 2} />
        <text x={panel.x + 14} y={panel.y + 24} class="rowlabel">{panel.title}</text>
        <text x={panel.x + 14} y={panel.y + 48} class="tag">thinker</text>
        <rect x={panel.x + 14} y={panel.y + 58} width="62" height="36" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray={wrong ? '4 3' : '0'} />
        <text x={panel.x + 45} y={panel.y + 81} text-anchor="middle" class="mono strong">A</text>
        <rect x={panel.x + 14} y={panel.y + 104} width="62" height="36" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={panel.x + 45} y={panel.y + 127} text-anchor="middle" class="mono strong">B</text>
        <text x={panel.x + 45} y={panel.y + 158} text-anchor="middle" class="tag">{wrong ? t('B takes the space', 'B 占了这一格') : t('B waits outside', 'B 在格外等')}</text>

        <text x={panel.x + 175} y={panel.y + 48} text-anchor="middle" class="tag">{t('one space', '一格空间')}</text>
        <rect x={panel.x + 120} y={panel.y + 58} width="110" height="58" rx="8" fill={wrong ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={wrong ? 'var(--gen)' : 'var(--accent)'} />
        <text x={panel.x + 175} y={panel.y + 93} text-anchor="middle" class="mono strong">{wrong ? 'B' : 'A'}</text>
        <text x={panel.x + 175} y={panel.y + 135} text-anchor="middle" class="tag">{wrong ? t('A was replaced', 'A 被盖掉') : t('A stays readable', 'A 保持可读')}</text>

        <rect x={panel.x + 94} y={panel.y + 169} width="162" height="38" rx="7" fill="white" stroke={wrong ? 'var(--gen)' : 'var(--accent)'} />
        <text x={panel.x + 175} y={panel.y + 185} text-anchor="middle" class="tag strong">talker_ar</text>
        <text x={panel.x + 175} y={panel.y + 200} text-anchor="middle" class="tag">{wrong ? t('wanted A · reads B', '要读 A · 却读到 B') : t('reads A · then B may enter', '读完 A · B 才能进')}</text>
      {/each}
      <text x={W / 2} y={H - 30} text-anchor="middle" class="footnote">{t('The diagram covers safe reuse, not a particular transport or pool size.', '本图只讲何时能安全复用，不限定传输方式或池子大小。')}</text>
      <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Next: how does the reader find A, and how does the owner know it finished?', '下一步：读者怎样找到 A，主人又怎样知道它读完了？')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
