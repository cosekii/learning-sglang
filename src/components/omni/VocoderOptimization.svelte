<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    OPT_VOCODER_CHUNK_MS,
    VOC_LEFT_CONTEXT_FRAMES,
    VOC_NEW_FRAMES,
    VOC_STATELESS_INPUT_FRAMES,
    VOC_BATCH_REQUEST_COUNT,
    VOC_BATCH_CALLS_BEFORE,
    VOC_BATCH_CALLS_AFTER,
    VOC_STATE_FIRST_MAIN_US,
    VOC_STATE_FIRST_SLOT_US,
    VOC_STATE_LATER_MAIN_US,
    VOC_STATE_LATER_SLOT_US,
    VOC_STATE_FIRST_CHANGE_PERCENT,
    VOC_STATE_LATER_REDUCTION_PERCENT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'A later window decodes 25 old frames plus 10 new ones. It emits only the 10 new frames.',
    captionZh: '后续窗口要算 25 帧旧内容和 10 帧新内容。它只输出那 10 帧新内容。',
  }, {
    caption: 'Three matching windows share one model call. Each request still gets its own sound chunk.',
    captionZh: '三个匹配窗口共用一次模型调用。每个请求仍拿到自己的声音 chunk。',
  }, {
    caption: 'A codec-state slot keeps decoder work between windows. The next window reads only 10 new frames.',
    captionZh: 'codec-state slot 保存窗口之间的解码工作。下个窗口只读 10 帧新内容。',
  }, {
    caption: 'In PR #2909’s eight-row test, later windows got faster. First windows got slower because they also wrote state.',
    captionZh: 'PR #2909 的 8 行测试里，后续窗口更快。首个窗口还要写入状态，所以更慢。',
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
  const fmt = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [790, 850, 850, 740][step] : [570, 630, 640, 570][step]);
  const roadmap = $derived([
    { title: 'ready windows', body: 'decode them together', titleZh: '准备好的窗口', bodyZh: '放在一起解码' },
    { title: 'earlier decoder work', body: 'keep it for next time', titleZh: '之前算过的内容', bodyZh: '留给下个窗口' },
    { title: 'recorded kernels', body: 'replay the same shape', titleZh: '录下的 kernels', bodyZh: '重放相同形状' },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="voc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'One later window' : 'One later window repeats earlier work', phone ? '一个后续窗口' : '后续窗口重复计算旧内容')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'vocoder = frames → sound · blue = new' : 'vocoder = codec frames → sound · blue = new frames', phone ? 'vocoder = frames → 声音 · 蓝 = 新帧' : 'vocoder = codec frames → 声音 · 蓝 = 新帧')}</text>
        {#if !phone}
          <rect x="30" y="88" width="660" height="224" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="115" class="small strong">{t('INPUT TO THIS WINDOW', '这个窗口的输入')}</text>
          <rect x="48" y="137" width="360" height="67" rx="8" fill="white" stroke="var(--faint)" />
          <text x="228" y="165" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} {t('old frames', '帧旧内容')}</text>
          <text x="228" y="188" text-anchor="middle" class="small">{t('decoded again · not emitted again', '再次解码 · 不再次输出')}</text>
          <rect x="416" y="137" width="144" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="488" y="165" text-anchor="middle" class="result">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="488" y="188" text-anchor="middle" class="small">{t('decode + emit', '解码并输出')}</text>
          <text x="304" y="231" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} + {VOC_NEW_FRAMES} = {VOC_STATELESS_INPUT_FRAMES} {t('input frames', '帧输入')}</text>
          <line x1="570" y1="170" x2="595" y2="170" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="603" y="137" width="70" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="638" y="176" text-anchor="middle" class="small strong">vocoder</text>
          <line x1="638" y1="205" x2="638" y2="231" stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x="500" y="239" width="173" height="54" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="586" y="261" text-anchor="middle" class="small strong">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="586" y="281" text-anchor="middle" class="small">= {OPT_VOCODER_CHUNK_MS} ms {t('sound', '声音')}</text>
          <text x="30" y="346" class="small strong">{t('THIS CHAPTER · THREE WAYS TO CHANGE THE WORK', '本章地图 · 三种改变工作的方式')}</text>
          {#each roadmap as item, i}
            {@const x = 30 + i * 225}
            <rect x={x} y="368" width="210" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 15} y="395" class="result">{i + 1}</text>
            <text x={x + 15} y="425" class="small strong">{t(item.title, item.titleZh)}</text>
            <text x={x + 15} y="454" class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {:else}
          <rect x="18" y="86" width="264" height="344" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="112" class="small strong">{t('INPUT TO THIS WINDOW', '这个窗口的输入')}</text>
          <rect x="32" y="130" width="236" height="69" rx="8" fill="white" stroke="var(--faint)" />
          <text x="150" y="157" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} {t('old frames', '帧旧内容')}</text>
          <text x="150" y="181" text-anchor="middle" class="small">{t('decoded again · not emitted', '再次解码 · 不再次输出')}</text>
          <rect x="32" y="209" width="236" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="237" text-anchor="middle" class="result">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')}</text>
          <text x="150" y="260" text-anchor="middle" class="small">{t('decode + emit', '解码并输出')}</text>
          <text x="150" y="304" text-anchor="middle" class="result">{VOC_LEFT_CONTEXT_FRAMES} + {VOC_NEW_FRAMES} = {VOC_STATELESS_INPUT_FRAMES} {t('input frames', '帧输入')}</text>
          <rect x="32" y="323" width="236" height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="350" text-anchor="middle" class="small strong">vocoder</text>
          <rect x="32" y="375" width="236" height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="401" text-anchor="middle" class="small strong">{VOC_NEW_FRAMES} {t('new frames', '帧新内容')} = {OPT_VOCODER_CHUNK_MS} ms {t('sound', '声音')}</text>
          <text x="18" y="466" class="small strong">{t('THIS CHAPTER · THREE CHANGES', '本章地图 · 三种改变')}</text>
          {#each roadmap as item, i}
            {@const y = 486 + i * 86}
            <rect x="18" y={y} width="264" height="73" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 24} class="result">{i + 1}</text>
            <text x="59" y={y + 24} class="small strong">{t(item.title, item.titleZh)}</text>
            <text x="59" y={y + 51} class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Qwen3-Omni · 10 new frames = 800 ms playback' : 'Qwen3-Omni default window; 800 ms is playback time, not compute time.', phone ? 'Qwen3-Omni · 10 帧新内容 = 800 ms 播放' : 'Qwen3-Omni 默认窗口；800 ms 是播放时长，不是计算耗时。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Batch matching windows · 1 of 3', '合并匹配窗口 · 1 / 3')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'matching = same length, kind and state mode' : 'matching windows = same frame count, window kind and state mode', phone ? '匹配 = 长度、类型、状态模式相同' : '匹配窗口 = 帧数、窗口类型和状态模式相同')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('B = requests per call · T = frames per request', 'B = 每次调用的请求数 · T = 每请求的帧数')}</text>
        {#each [false, true] as shared}
          {@const x = phone ? 18 : shared ? 375 : 30}
          {@const y = phone ? shared ? 465 : 102 : 102}
          {@const pw = phone ? 264 : 315}
          {@const ph = phone ? 340 : 405}
          <rect x={x} y={y} width={pw} height={ph} rx="12" fill="var(--bg)" stroke={shared ? 'var(--accent)' : 'var(--line)'} />
          <text x={x + 15} y={y + 27} class="small strong">{shared ? t('ONE SHARED CALL', '一次共享调用') : t('THREE SEPARATE CALLS', '三次独立调用')}</text>
          <text x={x + 15} y={y + 51} class="small">{VOC_BATCH_REQUEST_COUNT} {t('first windows · 10 new frames each', '个首个窗口 · 各 10 帧新内容')}</text>
          {#if shared}
            <rect x={x + 91} y={y + 75} width={pw - 108} height="194" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={x + 107} y={y + 98} class="code">[B=3, T=10]</text>
          {/if}
          {#each ['A', 'B', 'C'] as id, i}
            {@const ry = y + 77 + i * 65}
            <text x={x + 15} y={ry + 23} class="small strong">{id}</text>
            <line x1={x + 37} y1={ry + 19} x2={x + 78} y2={ry + 19} stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
            {#if !shared}
              <rect x={x + 91} y={ry} width={pw - 108} height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={x + 102} y={ry + 18} class="code">[B=1, T=10]</text>
              <text x={x + 102} y={ry + 35} class="small">→ {id} {t('sound', '声音')}</text>
            {:else}
              <text x={x + 107} y={ry + 42} class="small">→ {id} {t('sound', '声音')}</text>
            {/if}
          {/each}
          <text x={x + 15} y={y + 302} class="result">{t('model calls', '模型调用')} = {shared ? VOC_BATCH_CALLS_AFTER : VOC_BATCH_CALLS_BEFORE}</text>
          <text x={x + 15} y={y + 331} class="small strong">{t('sound chunks', '声音 chunks')} = {VOC_BATCH_REQUEST_COUNT}</text>
          {#if !phone}
            <text x={x + 15} y={y + 370} class="small">{shared ? t('three rows inside one call', '一次调用里的三行') : t('one row inside each call', '每次调用里的一行')}</text>
          {/if}
        {/each}
        {#if !phone}
          <text x="360" y="548" text-anchor="middle" class="result">{VOC_BATCH_CALLS_BEFORE} {t('calls', '次调用')} → {VOC_BATCH_CALLS_AFTER} {t('call', '次调用')} · {VOC_BATCH_REQUEST_COUNT} {t('separate outputs', '份独立输出')}</text>
          <text x="360" y="582" text-anchor="middle" class="small">{t('Batching changes the call boundary, not who owns each output.', 'batching 改变调用边界，不改变每份输出的归属。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed shapes · matching also checks kind + state' : 'Constructed shapes; grouping also checks first/later kind and slot/stateless mode.', phone ? '构造形状 · 还检查窗口类型和状态模式' : '构造形状；分组还检查首个/后续类型和 slot/无状态模式。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Keep decoder work · 2 of 3 · 1/2' : 'Keep decoder work between windows · 2 of 3 · 1/2', phone ? '保留解码工作 · 2 / 3 · 1/2' : '在窗口之间保留解码工作 · 2 / 3 · 1/2')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'slot = one request’s saved decoder work' : 'codec-state slot = one request’s saved decoder work', phone ? 'slot = 一个请求已存的解码工作' : 'codec-state slot = 一个请求已存的解码工作')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue new · orange saved · grey repeated' : 'blue = new frames · orange = saved work · grey = old frames decoded again', phone ? '蓝新帧 · 橙已存 · 灰重算' : '蓝 = 新帧 · 橙 = 已存工作 · 灰 = 再次解码的旧帧')}</text>
        {#each [false, true] as slot}
          {@const x = phone ? 18 : slot ? 375 : 30}
          {@const y = phone ? slot ? 465 : 102 : 102}
          {@const pw = phone ? 264 : 315}
          {@const ph = phone ? 340 : 405}
          <rect x={x} y={y} width={pw} height={ph} rx="12" fill="var(--bg)" stroke={slot ? 'var(--gen)' : 'var(--line)'} />
          <text x={x + 15} y={y + 28} class="small strong">{slot ? t('WITH A SLOT', '使用 SLOT') : t('WITHOUT A SLOT', '不用 SLOT')}</text>
          <text x={x + 15} y={y + 52} class="small">{t('the same later window', '同一个后续窗口')}</text>
          <rect x={x + 15} y={y + 76} width="132" height="80" rx="8" fill={slot ? 'var(--gen-soft)' : 'white'} stroke={slot ? 'var(--gen)' : 'var(--faint)'} />
          <text x={x + 81} y={y + 107} text-anchor="middle" class="result">{slot ? t('saved work', '已存工作') : `${VOC_LEFT_CONTEXT_FRAMES} ${t('old frames', '帧旧内容')}`}</text>
          <text x={x + 81} y={y + 135} text-anchor="middle" class="small">{slot ? t('read from the slot', '从 slot 读取') : t('decode again', '再次解码')}</text>
          <rect x={x + 155} y={y + 76} width={pw - 170} height="80" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + 155 + (pw - 170) / 2} y={y + 107} text-anchor="middle" class="result">{VOC_NEW_FRAMES} {t('new', '帧新内容')}</text>
          <text x={x + 155 + (pw - 170) / 2} y={y + 135} text-anchor="middle" class="small">{t('decode + emit', '解码并输出')}</text>
          <line x1={x + pw / 2} y1={y + 158} x2={x + pw / 2} y2={y + 183} stroke="var(--accent)" stroke-width="2" marker-end="url(#voc-arrow)" />
          <rect x={x + 45} y={y + 191} width={pw - 90} height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + pw / 2} y={y + 221} text-anchor="middle" class="small strong">vocoder</text>
          <rect x={x + 45} y={y + 255} width={pw - 90} height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + pw / 2} y={y + 283} text-anchor="middle" class="small strong">{VOC_NEW_FRAMES} {t('new frames out', '帧新内容输出')}</text>
          <text x={x + 15} y={y + 330} class="result">{t('input', '输入')} = {slot ? VOC_NEW_FRAMES : VOC_STATELESS_INPUT_FRAMES} {t('frames', '帧')}</text>
          {#if !phone}
            <text x={x + 15} y={y + 370} class="small">{slot ? t('the slot supplies earlier context', 'slot 提供旧上下文') : `${VOC_LEFT_CONTEXT_FRAMES} + ${VOC_NEW_FRAMES} = ${VOC_STATELESS_INPUT_FRAMES}`}</text>
          {/if}
        {/each}
        {#if !phone}
          <text x="360" y="548" text-anchor="middle" class="result">{VOC_STATELESS_INPUT_FRAMES} {t('input frames', '帧输入')} → {VOC_NEW_FRAMES} {t('input frames', '帧输入')} · {VOC_NEW_FRAMES} {t('emitted in both', '两种都输出 10 帧')}</text>
          <text x="360" y="583" text-anchor="middle" class="small">{t('The slot replaces repeated decoding with saved decoder work.', 'slot 用已存解码工作替代重复解码。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Frame counts, not latency · first window writes state' : 'Input-frame counts, not latency. The first window writes the slot; no free slot keeps the stateless path.', phone ? '帧数不是耗时 · 首个窗口写入状态' : '输入帧数不是耗时。首个窗口写入 slot；没有空 slot 就走无状态路径。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Measure the slot · 2 of 3 · 2/2', '测量 slot · 2 / 3 · 2/2')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? '8 rows · middle of 20 timings' : '8 rows per call · 20 timings; the middle value is shown', phone ? '8 行 · 20 次计时取中间值' : '每次调用 8 行 · 20 次计时，取中间值')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue stateless · orange slot · one scale' : 'blue = stateless · orange = slot-backed · one shared scale', phone ? '蓝无状态 · 橙 slot · 同比例' : '蓝 = 无状态 · 橙 = 使用 slot · 同一比例')}</text>
        {#each [true, false] as first}
          {@const main = first ? VOC_STATE_FIRST_MAIN_US : VOC_STATE_LATER_MAIN_US}
          {@const kept = first ? VOC_STATE_FIRST_SLOT_US : VOC_STATE_LATER_SLOT_US}
          {@const x = phone ? 18 : first ? 30 : 375}
          {@const y = phone ? first ? 102 : 374 : 102}
          {@const pw = phone ? 264 : 315}
          {@const bw = phone ? 125 : 175}
          <rect x={x} y={y} width={pw} height="260" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 15} y={y + 28} class="small strong">{first ? t('FIRST WINDOW', '首个窗口') : t('LATER WINDOW', '后续窗口')}</text>
          <text x={x + 15} y={y + 52} class="small">{first ? t('10 frames + write state', '10 帧 + 写入状态') : t('35 frames → 10 frames', '35 帧 → 10 帧')}</text>
          <text x={x + 15} y={y + 80} class="small">{t('stateless', '无状态')}</text>
          <rect x={x + 15} y={y + 89} width={bw * main / VOC_STATE_LATER_MAIN_US} height="27" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + 27 + bw} y={y + 109} class="result">{fmt(main)} µs</text>
          <text x={x + 15} y={y + 145} class="small">{t('slot-backed', '使用 slot')}</text>
          <rect x={x + 15} y={y + 154} width={bw * kept / VOC_STATE_LATER_MAIN_US} height="27" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={x + 27 + bw} y={y + 174} class="result">{fmt(kept)} µs</text>
          <text x={x + 15} y={y + 229} class="result">{first ? '+' : '−'}{fmt(first ? VOC_STATE_FIRST_CHANGE_PERCENT : VOC_STATE_LATER_REDUCTION_PERCENT)}% {t('time', '耗时')}</text>
        {/each}
        <text x={W / 2} y={phone ? 674 : 444} text-anchor="middle" class="small strong">{t(phone ? 'Both replay one CUDA graph' : 'Both sides replay one CUDA graph; only the window path changes.', phone ? '两边都重放一次 CUDA graph' : '两边都重放一次 CUDA graph；只有窗口路径不同。')}</text>
        <text x={W / 2} y={phone ? 700 : 478} text-anchor="middle" class="small">{t(phone ? 'Window GPU time, not request latency' : 'These are window GPU times, not whole-request latency.', phone ? '窗口 GPU 耗时，不是请求延迟' : '这些是窗口 GPU 耗时，不是整个请求的延迟。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'PR #2909 · Qwen3-Omni BF16 · H200' : 'Public PR #2909 · Qwen3-Omni colocated BF16 on H200 · median of 20 graph replays.', phone ? 'PR #2909 · Qwen3-Omni BF16 · H200' : '公开 PR #2909 · Qwen3-Omni 同卡 BF16 · H200 · 20 次 graph 重放取中位数。')}</text>
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
  .code { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  @media (max-width: 900px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .result { font-size: 12px; }
    .code { font-size: 12px; }
  }
</style>
