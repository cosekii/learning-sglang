<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    DELIVERY_AUDIO_SAMPLE_RATE,
    DELIVERY_AUDIO_BYTES_PER_SAMPLE,
    DELIVERY_AUDIO_BYTES_PER_SECOND,
    DELIVERY_GENERATED_SECONDS,
    DELIVERY_READ_SECONDS,
    DELIVERY_QUEUED_SECONDS,
    DELIVERY_QUEUED_BYTES,
    DELIVERY_DEFAULT_CAP_BYTES,
    DELIVERY_DEFAULT_CAP_HOURS,
    DELIVERY_PAYLOAD_AUDIO_BYTES,
    DELIVERY_PAYLOAD_TEXT_CHARS,
    DELIVERY_OTHER_AUDIO_BYTES,
    DELIVERY_PAYLOAD_TOTAL_BYTES,
    DELIVERY_TEST_CAP_BYTES,
    DELIVERY_IDLE_CASE_STREAMS,
    DELIVERY_IDLE_TRIGGER_BYTES,
    DELIVERY_IDLE_BEFORE_BYTES,
    DELIVERY_IDLE_OVER_BYTES,
    DELIVERY_IDLE_AFTER_BYTES,
    DELIVERY_REPEAT_CASE_STREAMS,
    DELIVERY_REPEAT_TRIGGER_BYTES,
    DELIVERY_REPEAT_BEFORE_BYTES,
    DELIVERY_REPEAT_OVER_BYTES,
    DELIVERY_REPEAT_AFTER_FIRST_BYTES,
    DELIVERY_REPEAT_AFTER_SECOND_BYTES,
    DELIVERY_REPEAT_FAILED_COUNT,
    DELIVERY_CLOSE_CASE_BYTES,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Generation can finish before the reader takes six seconds of audio. Those 576,000 bytes still wait in the API process.',
    captionZh: '生成结束时，读者还有 6 秒声音没取走。576,000 字节仍留在 API 进程里。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? 760 : 560);
  const bytes = (n: number) => n.toLocaleString('en-US');
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('GENERATION FINISHED. DELIVERY DID NOT.', '生成结束了，交付还没结束。')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('delivery backlog = audio made, but not taken by the reader', '交付积压 = 已生成、读者还没取走的声音')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = waiting audio · grey = audio already read', '蓝 = 等待取走的声音 · 灰 = 已经读取的声音')}</text>
        {#if !phone}
          {#each [
            { x: 20, title: 'GENERATOR', lines: ['10 s made', 'generation slot: FREE'], linesZh: ['生成 10 秒', '生成名额：已释放'] },
            { x: 270, title: 'API PROCESS', lines: ['hands audio to reader', '6 s still queued'], linesZh: ['把声音交给读者', '还排着 6 秒'] },
            { x: 520, title: 'READER', lines: ['took 4 s', 'reads at its own pace'], linesZh: ['取走 4 秒', '按自己的速度读取'] },
          ] as box, i}
            <rect x={box.x} y="110" width="180" height="112" rx="11" fill={i === 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 1 ? 'var(--accent)' : 'var(--line)'} />
            <text x={box.x + 16} y="139" class="tag strong">{t(box.title, i === 0 ? '生成器' : i === 1 ? 'API 进程' : '读者')}</text>
            {#each box.lines as line, j}
              <text x={box.x + 16} y={169 + j * 28} class="tag">{t(line, box.linesZh[j])}</text>
            {/each}
            {#if i < 2}<text x={box.x + 211} y="174" text-anchor="middle" class="result">→</text>{/if}
          {/each}
        {:else}
          {#each [
            { y: 104, title: 'GENERATOR', lines: ['10 s made · slot FREE'], linesZh: ['生成 10 秒 · 名额已释放'] },
            { y: 210, title: 'API PROCESS', lines: ['hands audio to reader · 6 s queued'], linesZh: ['把声音交给读者 · 还排着 6 秒'] },
            { y: 316, title: 'READER', lines: ['took 4 s · reads at its own pace'], linesZh: ['取走 4 秒 · 按自己的速度读取'] },
          ] as box, i}
            <rect x="15" y={box.y} width="270" height="82" rx="11" fill={i === 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 1 ? 'var(--accent)' : 'var(--line)'} />
            <text x="30" y={box.y + 27} class="tag strong">{t(box.title, i === 0 ? '生成器' : i === 1 ? 'API 进程' : '读者')}</text>
            <text x="30" y={box.y + 56} class="tag">{t(box.lines[0], box.linesZh[0])}</text>
            {#if i < 2}<text x="150" y={box.y + 99} text-anchor="middle" class="result">↓</text>{/if}
          {/each}
        {/if}
        {@const barY = phone ? 446 : 278}
        {@const barX = phone ? 15 : 120}
        {@const readW = phone ? 96 : 192}
        {@const queueW = phone ? 144 : 288}
        <text x={barX} y={barY - 18} class="tag strong">{t('THE SAME 10 SECONDS OF AUDIO', '同一段 10 秒声音')}</text>
        <rect x={barX} y={barY} width={readW} height="58" rx="7" fill="var(--bg)" stroke="var(--faint)" />
        <rect x={barX + readW} y={barY} width={queueW} height="58" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={barX + readW / 2} y={barY + 35} text-anchor="middle" class="tag">{DELIVERY_READ_SECONDS} s {t('read', '已读')}</text>
        <text x={barX + readW + queueW / 2} y={barY + 35} text-anchor="middle" class="tag strong">{DELIVERY_QUEUED_SECONDS} s {t('waiting', '等待')}</text>
        <text x={W / 2} y={barY + 100} text-anchor="middle" class="formula">{DELIVERY_GENERATED_SECONDS} − {DELIVERY_READ_SECONDS} = {DELIVERY_QUEUED_SECONDS} s {t('still queued', '仍在排队')}</text>
        <text x={W / 2} y={barY + 137} text-anchor="middle" class="formula">{bytes(DELIVERY_AUDIO_SAMPLE_RATE)} × {DELIVERY_AUDIO_BYTES_PER_SAMPLE} B × {DELIVERY_QUEUED_SECONDS} s = {bytes(DELIVERY_QUEUED_BYTES)} B</text>
        <text x={W / 2} y={barY + 169} text-anchor="middle" class="tag">{t(`${bytes(DELIVERY_AUDIO_BYTES_PER_SECOND)} B each second × 6 seconds`, `每秒 ${bytes(DELIVERY_AUDIO_BYTES_PER_SECOND)} 字节 × 6 秒`)}</text>
        <text x={W / 2} y={barY + (phone ? 222 : 214)} text-anchor="middle" class="rowlabel">{t('What stops this queue from growing?', '怎样阻止这条队列一直变长？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed example. Socket buffering is excluded.', '构造算例，不计 socket 缓冲。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>
