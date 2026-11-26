<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    STREAM_P90_SHARED_S, STREAM_P90_ALONE_S, STREAM_P90_EXTRA_S,
    STREAM_P90_SOONER_PERCENT,
    STREAM_TEACHING_SUBMIT_S, STREAM_TEACHING_FIRST_AUDIO_S, STREAM_TEACHING_DONE_S,
    STREAM_TEACHING_TTFT_S, STREAM_TEACHING_TOTAL_S,
    STREAM_CHUNK_DURATION_S, STREAM_CHUNK1_ARRIVAL_S, STREAM_CHUNK1_END_S,
    STREAM_CHUNK2_ARRIVAL_S, STREAM_CHUNK2_END_S, STREAM_STALL_S, STREAM_STALL_CHUNK_PERCENT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `The talker's own GPU gave p90 first sound in ${STREAM_P90_ALONE_S.toFixed(1)} seconds. Sharing the thinker's GPU took ${STREAM_P90_SHARED_S.toFixed(1)} seconds.`,
    captionZh: `talker 独占 GPU 时，首音 p90 是 ${STREAM_P90_ALONE_S.toFixed(1)} 秒。与 thinker 同卡时是 ${STREAM_P90_SHARED_S.toFixed(1)} 秒。`,
  }, {
    caption: 'TTFT stops at the first audio delta. The total timer continues to [DONE].',
    captionZh: 'TTFT 在首个 audio delta 停止。总计时继续到 [DONE]。',
  }, {
    caption: `Chunk 2 arrives ${STREAM_STALL_S.toFixed(1)} seconds after chunk 1 ends. The player stays silent for ${STREAM_STALL_S.toFixed(1)} seconds.`,
    captionZh: `chunk 2 晚于 chunk 1 结束 ${STREAM_STALL_S.toFixed(1)} 秒。播放器因此静音 ${STREAM_STALL_S.toFixed(1)} 秒。`,
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
  const H = $derived(phone ? [590, 650, 600][step] : [430, 460, 480][step]);
  const barMax = $derived(phone ? 185 : 400);
  const barScale = $derived(barMax / STREAM_P90_SHARED_S);
  const timeX = (seconds: number) => 60 + (seconds / STREAM_TEACHING_DONE_S) * 600;
  const timeY = (seconds: number) => 112 + (seconds / STREAM_TEACHING_DONE_S) * 300;
  const playX = (seconds: number) => (phone ? 20 : 40) + (seconds - 1) * (phone ? 100 : 240);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="measure-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Measure the first-sound wait' : 'One GPU move changed the first-sound wait', phone ? '测量首音等待' : '挪动 talker，首音等待就变了')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'first sound = first returned audio' : 'first sound = the first audio returned to the client', phone ? '首音 = 返回的第一段声音' : '首音 = 返回给客户端的第一段声音')}</text>
        <text x={phone ? 18 : 36} y="79" class="label">{t('p90 = 9 in 10 first sounds arrived within this time', 'p90 = 十个首音里九个在此时间内到达')}</text>
        {#if !phone}
          <rect x="36" y="105" width="648" height="215" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="58" y="136" class="small strong">{t('SAME MODEL · SAME 8-REQUEST LOAD', '同一模型 · 同样同时 8 个请求')}</text>
          <text x="58" y="177" class="small">{t('TALKER BESIDE THINKER', 'talker 与 thinker 同卡')}</text>
          <rect x="260" y="156" width={STREAM_P90_SHARED_S * barScale} height="33" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="648" y="179" text-anchor="end" class="result">{STREAM_P90_SHARED_S.toFixed(1)} s</text>
          <text x="58" y="236" class="small">{t('TALKER ON ITS OWN GPU', 'talker 独占一张 GPU')}</text>
          <rect x="260" y="215" width={STREAM_P90_ALONE_S * barScale} height="33" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={272 + STREAM_P90_ALONE_S * barScale} y="237" class="result">{STREAM_P90_ALONE_S.toFixed(1)} s</text>
          <text x="58" y="289" class="small">{t('blue = measured p90 wait, one scale', '蓝 = 实测 p90 等待，同一比例')}</text>
          <text x="648" y="289" text-anchor="end" class="result">+{STREAM_P90_EXTRA_S.toFixed(1)} s</text>
          <text x="360" y="356" text-anchor="middle" class="result">1 − {STREAM_P90_ALONE_S.toFixed(2)} ÷ {STREAM_P90_SHARED_S.toFixed(2)} ≈ {STREAM_P90_SOONER_PERCENT.toFixed(0)}% {t('sooner', '更早')}</text>
          <text x="360" y="392" text-anchor="middle" class="small strong">{t('Which part of the wait did the move remove?', '这次挪动省掉了哪段等待？')}</text>
        {:else}
          <rect x="18" y="104" width="264" height="251" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="134" class="small strong">{t('SAME 8-REQUEST LOAD', '同样同时 8 个请求')}</text>
          <text x="32" y="174" class="small">{t('BESIDE THINKER', '与 thinker 同卡')}</text>
          <rect x="32" y="188" width={STREAM_P90_SHARED_S * barScale} height="31" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="32" y="244" class="result">{STREAM_P90_SHARED_S.toFixed(1)} s</text>
          <text x="32" y="278" class="small">{t('OWN GPU', '独占 GPU')}</text>
          <rect x="32" y="292" width={STREAM_P90_ALONE_S * barScale} height="31" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="32" y="347" class="result">{STREAM_P90_ALONE_S.toFixed(1)} s · −{STREAM_P90_EXTRA_S.toFixed(1)} s</text>
          <text x="18" y="391" class="small">{t('blue = p90 wait · one scale', '蓝 = p90 等待 · 同一比例')}</text>
          <text x="150" y="435" text-anchor="middle" class="result">1 − {STREAM_P90_ALONE_S.toFixed(2)} ÷ {STREAM_P90_SHARED_S.toFixed(2)}</text>
          <text x="150" y="465" text-anchor="middle" class="result">≈ {STREAM_P90_SOONER_PERCENT.toFixed(0)}% {t('sooner', '更早')}</text>
          <text x="150" y="510" text-anchor="middle" class="small strong">{t('Which wait disappeared?', '省掉了哪段等待？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'PR #1235 · H200 · two runs each' : 'PR #1235 · H200 · 8 requests at once · two runs each', phone ? 'PR #1235 · H200 · 各跑两次' : 'PR #1235 · H200 · 同时 8 个请求 · 各跑两次')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Stop at the first audio' : 'Two timers stop at different events', phone ? '到首个声音就停表' : '两个计时器在不同事件停止')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('TTFT = time to the first audio chunk', 'TTFT = 到第一段声音的时间')}</text>
        <text x={phone ? 18 : 36} y="79" class="label">{t('orange = TTFT · blue = whole request', '橙 = TTFT · 蓝 = 整个请求')}</text>
        {#if !phone}
          <line x1="60" y1="160" x2="660" y2="160" stroke="var(--line)" stroke-width="4" />
          {#each [
            { at: STREAM_TEACHING_SUBMIT_S, title: 'POST', sub: 'request submitted', titleZh: '提交请求', subZh: '计时开始' },
            { at: STREAM_TEACHING_FIRST_AUDIO_S / 2, title: 'text delta', sub: 'no audio yet', titleZh: '文字 delta', subZh: '还没有声音' },
            { at: STREAM_TEACHING_FIRST_AUDIO_S, title: 'first audio delta', sub: 'stop TTFT', titleZh: '首个 audio delta', subZh: 'TTFT 停表' },
            { at: STREAM_TEACHING_DONE_S, title: '[DONE]', sub: 'stop total', titleZh: '[DONE]', subZh: '总计时停表' },
          ] as event}
            <circle cx={timeX(event.at)} cy="160" r="8" fill={event.at === STREAM_TEACHING_FIRST_AUDIO_S ? 'var(--gen)' : 'var(--accent)'} />
            <text x={timeX(event.at)} y="126" text-anchor="middle" class="small strong">{t(event.title, event.titleZh)}</text>
            <text x={timeX(event.at)} y="194" text-anchor="middle" class="small">{t(event.sub, event.subZh)}</text>
            <text x={timeX(event.at)} y="218" text-anchor="middle" class="result">{event.at.toFixed(1)} s</text>
          {/each}
          <line x1="60" y1="265" x2={timeX(STREAM_TEACHING_FIRST_AUDIO_S)} y2="265" stroke="var(--gen)" stroke-width="5" />
          <text x={(60 + timeX(STREAM_TEACHING_FIRST_AUDIO_S)) / 2} y="294" text-anchor="middle" class="result">TTFT = {STREAM_TEACHING_FIRST_AUDIO_S.toFixed(1)} − {STREAM_TEACHING_SUBMIT_S.toFixed(1)} = {STREAM_TEACHING_TTFT_S.toFixed(1)} s</text>
          <line x1="60" y1="335" x2="660" y2="335" stroke="var(--accent)" stroke-width="5" />
          <text x="360" y="364" text-anchor="middle" class="result">total = {STREAM_TEACHING_DONE_S.toFixed(1)} − {STREAM_TEACHING_SUBMIT_S.toFixed(1)} = {STREAM_TEACHING_TOTAL_S.toFixed(1)} s</text>
          <text x="360" y="410" text-anchor="middle" class="small strong">{t('Text deltas and [DONE] do not change the TTFT boundary.', '文字 delta 和 [DONE] 都不改变 TTFT 的停表点。')}</text>
        {:else}
          <line x1="52" y1="112" x2="52" y2="412" stroke="var(--line)" stroke-width="4" />
          {#each [
            { at: STREAM_TEACHING_SUBMIT_S, title: 'POST', sub: 'start', titleZh: '提交', subZh: '开始' },
            { at: STREAM_TEACHING_FIRST_AUDIO_S / 2, title: 'text delta', sub: 'no audio', titleZh: '文字 delta', subZh: '无声音' },
            { at: STREAM_TEACHING_FIRST_AUDIO_S, title: 'FIRST AUDIO', sub: 'stop TTFT', titleZh: '首个声音', subZh: 'TTFT 停表' },
            { at: STREAM_TEACHING_DONE_S, title: '[DONE]', sub: 'stop total', titleZh: '[DONE]', subZh: '总计时停表' },
          ] as event}
            <circle cx="52" cy={timeY(event.at)} r="8" fill={event.at === STREAM_TEACHING_FIRST_AUDIO_S ? 'var(--gen)' : 'var(--accent)'} />
            <text x="74" y={timeY(event.at) - 3} class="small strong">{t(event.title, event.titleZh)} · {event.at.toFixed(1)} s</text>
            <text x="74" y={timeY(event.at) + 19} class="small">{t(event.sub, event.subZh)}</text>
          {/each}
          <rect x="20" y="454" width="260" height="70" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="481" text-anchor="middle" class="result">TTFT = {STREAM_TEACHING_FIRST_AUDIO_S.toFixed(1)} − {STREAM_TEACHING_SUBMIT_S.toFixed(1)} = {STREAM_TEACHING_TTFT_S.toFixed(1)} s</text>
          <text x="150" y="507" text-anchor="middle" class="small">{t('stop at first audio', '到首个声音停止')}</text>
          <rect x="20" y="544" width="260" height="70" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="571" text-anchor="middle" class="result">total = {STREAM_TEACHING_DONE_S.toFixed(1)} − {STREAM_TEACHING_SUBMIT_S.toFixed(1)} = {STREAM_TEACHING_TOTAL_S.toFixed(1)} s</text>
          <text x="150" y="597" text-anchor="middle" class="small">{t('continue to [DONE]', '继续到 [DONE]')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed times · time.perf_counter()' : 'Constructed request times; the code uses time.perf_counter().', '构造时刻 · time.perf_counter()')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'A late chunk leaves silence' : 'A late chunk opens a silent gap', phone ? 'chunk 来晚就会静音' : '下一个 chunk 来晚，播放器就静音')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('stall = playback waits for a missing chunk', '卡顿 = 播放器等还没到的 chunk')}</text>
        <text x={phone ? 18 : 36} y="79" class="label">{t('blue = playing · orange = silence', '蓝 = 播放 · 橙 = 静音')}</text>
        <text x={phone ? 20 : 40} y="100" class="small strong">{t('CHUNK ARRIVALS', 'CHUNK 到达')}</text>
        {#each [STREAM_CHUNK1_ARRIVAL_S, STREAM_CHUNK2_ARRIVAL_S] as arrival, i}
          <circle cx={playX(arrival)} cy="145" r="8" fill="var(--accent)" />
          <text x={playX(arrival)} y="128" text-anchor="middle" class="result">{arrival.toFixed(1)} s</text>
          <text x={playX(arrival)} y="190" text-anchor="middle" class="small">chunk {i + 1}</text>
          <line x1={playX(arrival)} y1="204" x2={playX(arrival)} y2="235" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3" />
        {/each}
        <text x={phone ? 20 : 40} y="226" class="small strong">{t('PLAYER', '播放器')}</text>
        <rect x={playX(STREAM_CHUNK1_ARRIVAL_S)} y="244" width={STREAM_CHUNK_DURATION_S * (phone ? 100 : 240)} height="60" fill="var(--accent-soft)" stroke="var(--accent)" />
        <rect x={playX(STREAM_CHUNK1_END_S)} y="244" width={STREAM_STALL_S * (phone ? 100 : 240)} height="60" fill="var(--gen-soft)" stroke="var(--gen)" />
        <rect x={playX(STREAM_CHUNK2_ARRIVAL_S)} y="244" width={STREAM_CHUNK_DURATION_S * (phone ? 100 : 240)} height="60" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={(playX(STREAM_CHUNK1_ARRIVAL_S) + playX(STREAM_CHUNK1_END_S)) / 2} y="280" text-anchor="middle" class="small strong">chunk 1</text>
        <text x={(playX(STREAM_CHUNK2_ARRIVAL_S) + playX(STREAM_CHUNK2_END_S)) / 2} y="280" text-anchor="middle" class="small strong">chunk 2</text>
        <text x={(playX(STREAM_CHUNK1_END_S) + playX(STREAM_CHUNK2_ARRIVAL_S)) / 2} y="331" text-anchor="middle" class="result">{STREAM_STALL_S.toFixed(1)} s {t('silent', '静音')}</text>
        <text x={W / 2} y="370" text-anchor="middle" class="result">chunk 1 {t('ends', '结束')} = {STREAM_CHUNK1_ARRIVAL_S.toFixed(1)} + {STREAM_CHUNK_DURATION_S.toFixed(1)} = {STREAM_CHUNK1_END_S.toFixed(1)} s</text>
        <text x={W / 2} y="407" text-anchor="middle" class="result">stall = max(0, {STREAM_CHUNK2_ARRIVAL_S.toFixed(1)} − {STREAM_CHUNK1_END_S.toFixed(1)}) = {STREAM_STALL_S.toFixed(1)} s</text>
        <text x={W / 2} y={phone ? 449 : 450} text-anchor="middle" class="small strong">{STREAM_STALL_S.toFixed(1)} ÷ {STREAM_CHUNK_DURATION_S.toFixed(1)} = {STREAM_STALL_CHUNK_PERCENT.toFixed(1)}% {t('of one chunk', '一个 chunk')}</text>
        {#if phone}
          <text x="150" y="493" text-anchor="middle" class="small">{t('Keep every audio arrival time', '记录每个声音块的到达时刻')}</text>
          <text x="150" y="521" text-anchor="middle" class="small">{t('to find this gap in a real run.', '就能在实测中找出空档。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed times · 800 ms from Ch. 20' : 'Constructed arrival times; the 800 ms chunk follows Learning SGLang Ch. 20.', phone ? '构造时刻 · 800 ms 见第 20 章' : '构造到达时刻；800 ms chunk 见 Learning SGLang 第 20 章。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .strong { font-weight: 650; }
  @media (max-width: 900px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .result { font-size: 12px; }
  }
</style>
