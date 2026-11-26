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
  }, {
    caption: 'One API process shares one byte cap across its streams. It counts audio bytes, not text characters.',
    captionZh: '一个 API 进程里的多路流共用一个字节上限。只数声音字节，不数字符。',
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
  const H = $derived(phone ? [760, 900, 760, 850, 900, 800, 850, 900][step] : [560, 680, 620, 650, 680, 610, 640, 650][step]);
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
      {:else if step === 1}
        <text x={phone ? 15 : 20} y="26" class="rowlabel">{t('ONE API PROCESS, ONE SHARED BYTE CAP', '一个 API 进程，一个共享字节上限')}</text>
        <text x={phone ? 15 : 20} y="52" class="tag">{t('cap = the most queued audio bytes all its streams may hold', '上限 = 这里所有流合计最多能保留的声音字节')}</text>
        <text x={phone ? 15 : 20} y="76" class="tag">{t('blue = counted audio · grey = not counted', '蓝 = 计入的声音 · 灰 = 不计入')}</text>
        <rect x={phone ? 15 : 70} y="102" width={phone ? 270 : 580} height="132" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="132" text-anchor="middle" class="mono">stream_delivery.max_total_backlog_bytes</text>
        <text x={W / 2} y="164" text-anchor="middle" class="result">1 GiB = {bytes(DELIVERY_DEFAULT_CAP_BYTES)} B</text>
        <text x={W / 2} y="194" text-anchor="middle" class="tag">{t('per API process', '每个 API 进程')} · none = {t('cap off', '关闭上限')}</text>
        <text x={W / 2} y="219" text-anchor="middle" class="tag">{bytes(DELIVERY_DEFAULT_CAP_BYTES)} ÷ {bytes(DELIVERY_AUDIO_BYTES_PER_SECOND)} ≈ {DELIVERY_DEFAULT_CAP_HOURS.toFixed(1)} h {t('of audio', '声音')}</text>
        {#each phone ? [
          { x: 15, y: 266, w: 270, name: 'STREAM A', audio: DELIVERY_PAYLOAD_AUDIO_BYTES, text: true },
          { x: 15, y: 472, w: 270, name: 'STREAM B', audio: DELIVERY_OTHER_AUDIO_BYTES, text: false },
        ] : [
          { x: 40, y: 266, w: 300, name: 'STREAM A', audio: DELIVERY_PAYLOAD_AUDIO_BYTES, text: true },
          { x: 380, y: 266, w: 300, name: 'STREAM B', audio: DELIVERY_OTHER_AUDIO_BYTES, text: false },
        ] as card}
          <rect x={card.x} y={card.y} width={card.w} height="174" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={card.x + 16} y={card.y + 28} class="tag strong">{card.name}</text>
          <rect x={card.x + 16} y={card.y + 45} width={card.w - 32} height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={card.x + 28} y={card.y + 72} class="mono">audio_waveform: {card.audio} B</text>
          {#if card.text}
            <text x={card.x + 20} y={card.y + 115} class="tag" fill="var(--muted)">text: {DELIVERY_PAYLOAD_TEXT_CHARS} {t('characters', '个字符')}</text>
          {/if}
          <text x={card.x + 20} y={card.y + 151} class="result">{t('COUNT', '计入')} = {card.audio} B</text>
        {/each}
        {@const totalY = phone ? 686 : 474}
        <rect x={phone ? 15 : 170} y={totalY} width={phone ? 270 : 380} height="72" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={W / 2} y={totalY + 29} text-anchor="middle" class="tag strong">{t('SHARED AUDIO-BYTE LEDGER', '共享声音字节账')}</text>
        <text x={W / 2} y={totalY + 56} text-anchor="middle" class="result">{DELIVERY_PAYLOAD_AUDIO_BYTES} + {DELIVERY_OTHER_AUDIO_BYTES} = {DELIVERY_PAYLOAD_TOTAL_BYTES} B</text>
        <text x={W / 2} y={totalY + 101} text-anchor="middle" class="tag">{t('Text and socket buffers stay outside this audio-byte ledger.', '文字和 socket 缓冲不记入这份声音字节账。')}</text>
        <text x={W / 2} y={totalY + (phone ? 160 : 151)} text-anchor="middle" class="rowlabel">{t('Over the cap, which stream fails?', '超过上限后，哪一路流失败？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed payloads. Another API process has its own cap.', '构造的消息内容。另一个 API 进程有自己的上限。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>
