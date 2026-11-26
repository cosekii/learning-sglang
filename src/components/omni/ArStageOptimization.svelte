<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    OPT_REFERENCE_ENCODE_MS,
    OPT_REFERENCE_REQUEST_COUNT,
    OPT_REFERENCE_TOTAL_MS,
    OPT_CACHED_TOTAL_MS,
    OPT_CACHE_SAVED_MS,
    OPT_SINGLE_FLIGHT_GPU_TOTAL_MS,
    OPT_AUDIO_TOKEN_BUCKETS,
    OPT_AUDIO_REAL_TOKENS,
    OPT_AUDIO_BUCKET_TOKENS,
    OPT_AUDIO_PADDING_TOKENS,
    OPT_AUDIO_GRAPH_COUNT,
    OPT_VOCODER_FRAMES_PER_CHUNK,
    OPT_VOCODER_CHUNK_MS,
    OPT_VOCODER_FRAME_MS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Three prompts reuse one reference voice. Three separate encodes cost about ${OPT_REFERENCE_TOTAL_MS} ms.`,
    captionZh: `三个 prompt 共用一段参考音频。分别编码三次约需 ${OPT_REFERENCE_TOTAL_MS} ms。`,
  }, {
    caption: 'The cache stores the first result under an exact key. The next two matching requests load it instead of encoding again.',
    captionZh: 'cache 按完整 key 保存首次结果。后两个相同请求直接读取，不再编码。',
  }, {
    caption: 'Three matching requests arrive before any result is cached. Single-flight makes B and C wait for A\'s encode instead of running two more.',
    captionZh: '三个相同请求同时到达，cache 还是空的。single-flight 让 B、C 等 A 编码，不再各算一次。',
  }, {
    caption: 'Async decode lets the GPU start step N before the CPU finishes step N−1. Their work can overlap.',
    captionZh: '异步 decode 让 GPU 先开始第 N 步，CPU 后收尾第 N−1 步。两边的工作可以重叠。',
  }, {
    caption: 'The audio encoder can capture its layer stack once. Matching calls replay those kernels as one graph.',
    captionZh: 'audio encoder 可以把整层序列录一次。匹配的调用把同一组 kernels 作为一张 graph 重放。',
  }, {
    caption: `A ${OPT_AUDIO_REAL_TOKENS}-token input uses the ${OPT_AUDIO_BUCKET_TOKENS}-token graph. It pads ${OPT_AUDIO_PADDING_TOKENS} zeros, replays, then keeps the first ${OPT_AUDIO_REAL_TOKENS} outputs.`,
    captionZh: `${OPT_AUDIO_REAL_TOKENS} 个 token 选用 ${OPT_AUDIO_BUCKET_TOKENS} 格 graph。补 ${OPT_AUDIO_PADDING_TOKENS} 个零后重放，只留前 ${OPT_AUDIO_REAL_TOKENS} 份输出。`,
  }, {
    caption: 'The AR loop now hands frames to the vocoder. How can that stage keep sound ahead of playback?',
    captionZh: 'AR 已把 frames 交给 vocoder。它怎样让声音赶在播放前到达？',
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
  const H = $derived(phone ? [790, 800, 850, 800, 810, 800, 900][step] : [540, 590, 590, 620, 560, 600, 620][step]);
  const requests = [
    { id: 'A', prompt: 'Hello', promptZh: '你好' },
    { id: 'B', prompt: 'Thank you', promptZh: '谢谢' },
    { id: 'C', prompt: 'Yes, please', promptZh: '好的' },
  ];
  const roadmap = $derived([
    { title: 'finished result', body: 'reuse it', titleZh: '已完成的结果', bodyZh: '下次复用' },
    { title: 'running encode', body: 'share it', titleZh: '正在做的编码', bodyZh: '同时共享' },
    { title: 'GPU + CPU', body: 'work at once', titleZh: 'GPU + CPU', bodyZh: '同时工作' },
    { title: 'recorded kernels', body: 'replay them', titleZh: '录下的 kernels', bodyZh: '重放它们' },
  ]);
  const summary = $derived([
    { name: 'cache', wait: 'finished encode repeats', limit: 'exact key must match', nameZh: 'cache', waitZh: '重复已完成编码', limitZh: '完整 key 必须匹配' },
    { name: 'single-flight', wait: 'same encode is running', limit: 'B and C still wait', nameZh: 'single-flight', waitZh: '相同编码正在运行', limitZh: 'B、C 仍等待' },
    { name: 'async decode', wait: 'GPU and CPU take turns', limit: 'overlap, not less work', nameZh: '异步 decode', waitZh: 'GPU、CPU 轮流工作', limitZh: '重叠，不少做工作' },
    { name: 'CUDA graph', wait: 'kernels dispatch one by one', limit: 'fixed bucket + eager fallback', nameZh: 'CUDA graph', waitZh: '逐个 dispatch kernels', limitZh: '固定 bucket + eager 回退' },
  ]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="opt-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'One voice, three encodes' : 'Three prompts repeat one reference encode', phone ? '一段声音，三次编码' : '三个 prompt 重复编码同一段声音')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'reference encoder = voice → model numbers' : 'reference encoder = example voice → model-ready numbers (codes)', phone ? 'reference encoder = 声音 → 模型数字' : 'reference encoder = 示例声音 → 模型可读的数（codes）')}</text>
        {#if !phone}
          {#each requests as request, i}
            {@const x = 30 + i * 230}
            <rect x={x} y="82" width="200" height="91" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 15} y="108" class="small strong">{request.id} · {t(`prompt: ${request.prompt}`, `prompt：${request.promptZh}`)}</text>
            <text x={x + 15} y="136" class="code">voice.wav</text>
            <text x={x + 15} y="158" class="small">{t('same reference voice', '同一段参考音频')}</text>
            <line x1={x + 100} y1="174" x2={x + 100} y2="197" stroke="var(--accent)" stroke-width="2" marker-end="url(#opt-arrow)" />
            <rect x={x} y="204" width="200" height="63" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={x + 100} y="230" text-anchor="middle" class="small strong">encoder</text>
            <text x={x + 100} y="253" text-anchor="middle" class="result">≈ {OPT_REFERENCE_ENCODE_MS} ms</text>
          {/each}
          <text x="360" y="309" text-anchor="middle" class="result">{OPT_REFERENCE_REQUEST_COUNT} × ≈{OPT_REFERENCE_ENCODE_MS} ms = ≈{OPT_REFERENCE_TOTAL_MS} ms {t('of encoder work', 'encoder 工作')}</text>
          <text x="30" y="350" class="small strong">{t('THIS CHAPTER · FOUR PLACES WHERE WORK CAN WAIT', '本章地图 · 四处可能等待的工作')}</text>
          {#each roadmap as item, i}
            {@const x = 30 + i * 170}
            <rect x={x} y="370" width="160" height="111" rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 14} y="394" class="result">{i + 1}</text>
            <text x={x + 14} y="422" class="small strong">{t(item.title, item.titleZh)}</text>
            <text x={x + 14} y="451" class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {:else}
          {#each requests as request, i}
            {@const y = 82 + i * 143}
            <rect x="18" y={y} width="264" height="124" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 25} class="small strong">{request.id} · {t(`prompt: ${request.prompt}`, `prompt：${request.promptZh}`)}</text>
            <text x="32" y={y + 50} class="code">voice.wav</text>
            <rect x="32" y={y + 65} width="150" height="41" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="107" y={y + 91} text-anchor="middle" class="small strong">encoder</text>
            <text x="264" y={y + 91} text-anchor="end" class="result">≈{OPT_REFERENCE_ENCODE_MS} ms</text>
          {/each}
          <text x="150" y="526" text-anchor="middle" class="result">{OPT_REFERENCE_REQUEST_COUNT} × ≈{OPT_REFERENCE_ENCODE_MS} = ≈{OPT_REFERENCE_TOTAL_MS} ms</text>
          <text x="18" y="564" class="small strong">{t('CHAPTER MAP · FOUR WAITS', '本章地图 · 四处等待')}</text>
          {#each roadmap as item, i}
            {@const x = 18 + (i % 2) * 135}
            {@const y = 582 + Math.floor(i / 2) * 87}
            <rect x={x} y={y} width="129" height="74" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 10} y={y + 22} class="result">{i + 1}</text>
            <text x={x + 10} y={y + 43} class="small strong">{t(item.title, item.titleZh)}</text>
            <text x={x + 10} y={y + 63} class="small">{t(item.body, item.bodyZh)}</text>
          {/each}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Public MOSS profile; constructed three-prompt example.', '公开 MOSS profile；三个 prompt 是构造示例。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Reuse a finished result · 1 of 4', '复用已完成的结果 · 1 / 4')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'cache = saved output found by a key' : 'cache = saved output · exact key = every identity field matches', phone ? 'cache = 按 key 找已存结果' : 'cache = 已存结果 · 完整 key = 每个身份字段都匹配')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('blue = GPU encode · orange = cached codes', '蓝 = GPU encode · 橙 = 已存 codes')}</text>
        {#if !phone}
          <rect x="30" y="102" width="660" height="112" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="45" y="126" class="small strong">{t('K = CACHE IDENTITY · ALL PARTS MUST MATCH', 'K = cache 身份 · 所有部分都必须匹配')}</text>
          <text x="45" y="151" class="code">model + version + encoder settings + result type</text>
          <text x="45" y="174" class="code">audio content + encode choices</text>
          <text x="45" y="198" class="small">{t('choices can change codes · prompt text is not in K', 'choices 会改变 codes · prompt 文本不在 K 里')}</text>
          {#each requests as request, i}
            {@const y = 229 + i * 61}
            <text x="30" y={y + 25} class="small strong">{request.id}</text>
            <rect x="62" y={y} width="48" height="35" rx="7" fill="var(--bg)" stroke="var(--line)" />
            <text x="86" y={y + 23} text-anchor="middle" class="code">K</text>
            <text x="126" y={y + 24} class="small strong">{i === 0 ? 'miss' : 'hit'}</text>
            <line x1="174" y1={y + 18} x2="207" y2={y + 18} stroke={i === 0 ? 'var(--accent)' : 'var(--gen)'} stroke-width="2" />
            <rect x="215" y={y - 4} width="190" height="44" rx="8" fill={i === 0 ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={i === 0 ? 'var(--accent)' : 'var(--gen)'} />
            <text x="310" y={y + 23} text-anchor="middle" class="small strong">{i === 0 ? t(`encode ≈${OPT_REFERENCE_ENCODE_MS} ms`, `编码 ≈${OPT_REFERENCE_ENCODE_MS} ms`) : t('load a copy', '读取副本')}</text>
            <text x="430" y={y + 23} class="small">{i === 0 ? t('→ store codes in cache', '→ codes 存入 cache') : t('→ same codes, no GPU encode', '→ 相同 codes，不做 GPU encode')}</text>
          {/each}
          <text x="30" y="405" class="small strong">{t('GPU ENCODE WORK · ONE SCALE', 'GPU ENCODE 工作 · 同一比例')}</text>
          <text x="30" y="437" class="small">{t('WITHOUT CACHE', '不用 cache')}</text>
          <rect x="165" y="417" width="487.5" height="29" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="660" y="438" text-anchor="end" class="result">≈{OPT_REFERENCE_TOTAL_MS} ms</text>
          <text x="30" y="482" class="small">{t('WITH CACHE', '使用 cache')}</text>
          <rect x="165" y="462" width="162.5" height="29" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="340" y="483" class="result">≈{OPT_CACHED_TOTAL_MS} ms</text>
          <text x="505" y="483" class="result">−≈{OPT_CACHE_SAVED_MS} ms</text>
          <text x="360" y="532" text-anchor="middle" class="small">{t('one miss + two hits · copies protect cached codes from edits', '一次 miss + 两次 hit · 副本保护已存 codes 不被修改')}</text>
        {:else}
          <rect x="18" y="102" width="264" height="134" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="126" class="small strong">{t('K = CACHE IDENTITY · MATCH ALL', 'K = cache 身份 · 全部匹配')}</text>
          <text x="32" y="150" class="code">model + version + settings</text>
          <text x="32" y="172" class="code">result type + audio + choices</text>
          <text x="32" y="195" class="small">{t('choices can change codes', 'choices 会改变 codes')}</text>
          <text x="32" y="219" class="small">{t('prompt text is not in K', 'prompt 文本不在 K 里')}</text>
          {#each requests as request, i}
            {@const y = 254 + i * 82}
            <rect x="18" y={y} width="264" height="76" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 24} class="small strong">{request.id} · K · {i === 0 ? 'miss' : 'hit'}</text>
            <rect x="32" y={y + 36} width="115" height="29" rx="6" fill={i === 0 ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={i === 0 ? 'var(--accent)' : 'var(--gen)'} />
            <text x="89" y={y + 56} text-anchor="middle" class="small">{i === 0 ? 'encoder' : t('load copy', '读取副本')}</text>
            <text x="264" y={y + 56} text-anchor="end" class="result">{i === 0 ? `≈${OPT_REFERENCE_ENCODE_MS} ms` : t('no encode', '不编码')}</text>
          {/each}
          <text x="18" y="510" class="small strong">{t('GPU ENCODE · ONE SCALE', 'GPU ENCODE · 同一比例')}</text>
          <text x="18" y="540" class="small">{t('WITHOUT CACHE', '不用 cache')}</text>
          <rect x="18" y="552" width="240" height="29" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="18" y="602" class="result">≈{OPT_REFERENCE_TOTAL_MS} ms</text>
          <text x="18" y="636" class="small">{t('WITH CACHE', '使用 cache')}</text>
          <rect x="18" y="648" width="80" height="29" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="110" y="669" class="result">≈{OPT_CACHED_TOTAL_MS} ms · −≈{OPT_CACHE_SAVED_MS}</text>
          <text x="150" y="724" text-anchor="middle" class="small">{t('1 miss + 2 hits', '1 次 miss + 2 次 hit')}</text>
          <text x="150" y="749" text-anchor="middle" class="small">{t('copies protect cached codes', '副本保护已存 codes')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'GPU work only; not request latency.' : 'Approximate GPU-work comparison, not whole-request latency.', phone ? '只算 GPU 工作，不是请求延迟。' : '大致 GPU 工作对照，不是整个请求的延迟。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Share a running encode · 2 of 4', '共享正在做的编码 · 2 / 4')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'single-flight = share one unfinished encode' : 'single-flight = callers with one key share one unfinished encode', phone ? 'single-flight = 共享一次未完成编码' : 'single-flight = 相同 key 的调用共享一次未完成编码')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('blue = GPU encode · orange = waiting for A', '蓝 = GPU encode · 橙 = 等待 A')}</text>
        {#if !phone}
          {#each [false, true] as shared}
            {@const x = shared ? 375 : 30}
            <rect x={x} y="100" width="315" height="357" rx="12" fill="var(--bg)" stroke={shared ? 'var(--accent)' : 'var(--line)'} />
            <text x={x + 15} y="126" class="small strong">{shared ? t('WITH SINGLE-FLIGHT', '使用 SINGLE-FLIGHT') : t('THREE INDEPENDENT CALLS', '三次独立调用')}</text>
            <text x={x + 15} y="151" class="small">{t('A, B, C arrive at 0 · cache empty', 'A、B、C 同时到达 · cache 为空')}</text>
            {#each requests as request, i}
              {@const y = 176 + i * 76}
              <text x={x + 15} y={y + 22} class="small strong">{request.id} · {shared ? (i === 0 ? t('does the work', '负责编码') : t('waits for A', '等待 A')) : t('caller', '调用')}</text>
              <rect x={x + 15} y={y + 34} width="200" height="28" rx="6" fill={shared && i > 0 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={shared && i > 0 ? 'var(--gen)' : 'var(--accent)'} />
              <text x={x + 115} y={y + 54} text-anchor="middle" class="small">{shared && i > 0 ? t(`wait ${OPT_REFERENCE_ENCODE_MS} → copy`, `等 ${OPT_REFERENCE_ENCODE_MS} → 副本`) : t(`encode ${OPT_REFERENCE_ENCODE_MS} ms`, `编码 ${OPT_REFERENCE_ENCODE_MS} ms`)}</text>
            {/each}
            <text x={x + 15} y="426" class="result">GPU {t('work', '工作')} = {shared ? `≈${OPT_SINGLE_FLIGHT_GPU_TOTAL_MS}` : `≈${OPT_REFERENCE_TOTAL_MS}`} ms</text>
          {/each}
          <text x="360" y="493" text-anchor="middle" class="result">A {t('encodes once', '编码一次')} · B + C {t('share that result', '共享这个结果')}</text>
          <text x="360" y="526" text-anchor="middle" class="small">{t('A stores the codes; B and C then load copies.', 'A 存好 codes；B、C 随后读取副本。')}</text>
          <text x="360" y="554" text-anchor="middle" class="small">{t('Later matching requests can hit this cache entry.', '后来的相同请求可以命中这个 cache 条目。')}</text>
        {:else}
          {#each [false, true] as shared, panel}
            {@const y = shared ? 409 : 98}
            <rect x="18" y={y} width="264" height="289" rx="11" fill="var(--bg)" stroke={shared ? 'var(--accent)' : 'var(--line)'} />
            <text x="32" y={y + 25} class="small strong">{shared ? t('SINGLE-FLIGHT', 'SINGLE-FLIGHT') : t('INDEPENDENT CALLS', '独立调用')}</text>
            <text x="32" y={y + 47} class="small">{t('all at 0 · cache empty', '同时到达 · cache 为空')}</text>
            {#each requests as request, i}
              {@const rowY = y + 62 + i * 56}
              <text x="32" y={rowY + 15} class="small strong">{request.id} · {shared ? (i === 0 ? t('does the work', '负责编码') : t('waits for A', '等待 A')) : t('caller', '调用')}</text>
              <rect x="32" y={rowY + 23} width="160" height="23" rx="5" fill={shared && i > 0 ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={shared && i > 0 ? 'var(--gen)' : 'var(--accent)'} />
              <text x="202" y={rowY + 40} class="small">{shared && i > 0 ? t('wait→copy', '等→副本') : `${OPT_REFERENCE_ENCODE_MS} ms`}</text>
            {/each}
            <text x="32" y={y + 259} class="result">GPU = {shared ? `≈${OPT_SINGLE_FLIGHT_GPU_TOTAL_MS}` : `≈${OPT_REFERENCE_TOTAL_MS}`} ms</text>
          {/each}
          <text x="150" y="730" text-anchor="middle" class="result">A {t('encodes once', '编码一次')} · B + C {t('share it', '共享结果')}</text>
          <text x="150" y="761" text-anchor="middle" class="small">{t('A stores; B and C load copies.', 'A 存好；B、C 读取副本。')}</text>
          <text x="150" y="792" text-anchor="middle" class="small">{t('Later requests can hit this entry.', '后来请求可命中此条目。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed example · batching off' : 'Constructed cold-cache comparison; batching is off.', phone ? '构造示例 · 关闭 batching' : '构造冷 cache 对照；关闭 batching。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Overlap GPU and CPU · 3 of 4', '让 GPU 和 CPU 同时工作 · 3 / 4')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t('N = next decode step · N−1 = the step before it', 'N = 下一个 decode step · N−1 = 它前面的一步')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue = GPU · orange = token/frame → out' : 'blue = GPU computes · orange = CPU sends token/frame → downstream', phone ? '蓝 = GPU · 橙 = token/frame → 输出' : '蓝 = GPU 计算 · 橙 = CPU 把 token/frame 发往下游')}</text>
        {#if !phone}
          <rect x="30" y="103" width="660" height="158" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="45" y="130" class="small strong">SYNC · {t('finish one step before starting the next', '完成一步，再开始下一步')}</text>
          {#each [
            { x: 60, w: 130, name: 'GPU N−1', color: 'accent' },
            { x: 190, w: 110, name: 'CPU N−1', color: 'gen' },
            { x: 300, w: 130, name: 'GPU N', color: 'accent' },
            { x: 430, w: 110, name: 'CPU N', color: 'gen' },
          ] as block}
            <rect x={block.x} y="158" width={block.w} height="57" rx="7" fill={`var(--${block.color}-soft)`} stroke={`var(--${block.color})`} />
            <text x={block.x + block.w / 2} y="192" text-anchor="middle" class="small strong">{block.name}</text>
          {/each}
          <text x="360" y="241" text-anchor="middle" class="small">{t('GPU and CPU take turns', 'GPU 和 CPU 轮流工作')}</text>
          <rect x="30" y="286" width="660" height="222" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="45" y="313" class="small strong">ASYNC · {t('GPU N starts before CPU N−1 finishes', 'GPU N 先开始，CPU N−1 后完成')}</text>
          <text x="45" y="359" class="small strong">GPU</text>
          <rect x="110" y="332" width="130" height="50" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="175" y="362" text-anchor="middle" class="small strong">GPU N−1</text>
          <rect x="240" y="332" width="130" height="50" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="305" y="362" text-anchor="middle" class="small strong">GPU N</text>
          <text x="45" y="424" class="small strong">CPU</text>
          <rect x="240" y="397" width="110" height="50" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="295" y="427" text-anchor="middle" class="small strong">CPU N−1</text>
          <rect x="350" y="397" width="110" height="50" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="405" y="427" text-anchor="middle" class="small strong">CPU N</text>
          <line x1="240" y1="324" x2="240" y2="456" stroke="var(--line)" stroke-dasharray="4 3" />
          <line x1="370" y1="324" x2="370" y2="390" stroke="var(--line)" stroke-dasharray="4 3" />
          <text x="360" y="482" text-anchor="middle" class="small strong">{t('GPU N and CPU N−1 can run at the same time', 'GPU N 和 CPU N−1 可以同时运行')}</text>
          <text x="360" y="537" text-anchor="middle" class="small">{t('GPU order preserves N−1 → N; only CPU output handling lags.', 'GPU 仍按 N−1 → N 的顺序；只有 CPU 输出处理晚一步。')}</text>
          <text x="360" y="566" text-anchor="middle" class="small">{t('The ready mark tells the CPU when N−1 is safe to send.', '就绪标记告诉 CPU 何时可以发出 N−1。')}</text>
        {:else}
          <rect x="18" y="101" width="264" height="166" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="127" class="small strong">SYNC · {t('one step at a time', '一次完成一步')}</text>
          {#each [
            { name: 'GPU', n: 'N−1', color: 'accent' },
            { name: 'CPU', n: 'N−1', color: 'gen' },
            { name: 'GPU', n: 'N', color: 'accent' },
            { name: 'CPU', n: 'N', color: 'gen' },
          ] as block, i}
            {@const x = 18 + i * 60}
            <rect x={x} y="153" width="60" height="64" rx="6" fill={`var(--${block.color}-soft)`} stroke={`var(--${block.color})`} />
            <text x={x + 30} y="180" text-anchor="middle" class="small strong">{block.name}</text>
            <text x={x + 30} y="202" text-anchor="middle" class="small">{block.n}</text>
          {/each}
          <text x="150" y="246" text-anchor="middle" class="small">{t('GPU and CPU take turns', 'GPU 和 CPU 轮流工作')}</text>
          <rect x="18" y="291" width="264" height="338" rx="11" fill="var(--bg)" stroke="var(--accent)" />
          <text x="32" y="317" class="small strong">ASYNC · {t('one step ahead', '向前重叠一步')}</text>
          <text x="32" y="360" class="small strong">GPU</text>
          <rect x="78" y="337" width="60" height="62" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="108" y="364" text-anchor="middle" class="small strong">GPU</text>
          <text x="108" y="386" text-anchor="middle" class="small">N−1</text>
          <rect x="138" y="337" width="60" height="62" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="168" y="364" text-anchor="middle" class="small strong">GPU</text>
          <text x="168" y="386" text-anchor="middle" class="small">N</text>
          <text x="32" y="464" class="small strong">CPU</text>
          <rect x="138" y="441" width="60" height="62" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="168" y="468" text-anchor="middle" class="small strong">CPU</text>
          <text x="168" y="490" text-anchor="middle" class="small">N−1</text>
          <rect x="198" y="441" width="60" height="62" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="228" y="468" text-anchor="middle" class="small strong">CPU</text>
          <text x="228" y="490" text-anchor="middle" class="small">N</text>
          <text x="150" y="548" text-anchor="middle" class="small strong">{t('GPU N starts before CPU N−1 ends', 'GPU N 先于 CPU N−1 完成')}</text>
          <text x="150" y="580" text-anchor="middle" class="small">{t('GPU and CPU can overlap', 'GPU 和 CPU 可以重叠')}</text>
          <text x="150" y="608" text-anchor="middle" class="small">{t('same work, new order', '工作相同，顺序不同')}</text>
          <text x="150" y="660" text-anchor="middle" class="small">{t('GPU keeps N−1 → N in order.', 'GPU 仍按 N−1 → N 排序。')}</text>
          <text x="150" y="689" text-anchor="middle" class="small">{t('Only CPU output handling lags.', '只有 CPU 输出处理晚一步。')}</text>
          <text x="150" y="718" text-anchor="middle" class="small">{t('The ready mark makes N−1 safe to send.', '就绪标记让 N−1 可以发出。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Ordering only · MOSS default off' : 'Constructed ordering; no speedup claimed. MOSS-TTS-Local defaults async decode off.', phone ? '只看顺序 · MOSS 默认关闭' : '构造顺序，不声称加速。MOSS-TTS-Local 默认关闭异步 decode。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Qwen audio graph · 4 of 4 · 1/2' : 'Qwen3-Omni audio graph · 4 of 4 · 1/2', phone ? 'Qwen audio graph · 4 / 4 · 1/2' : 'Qwen3-Omni audio graph · 4 / 4 · 1/2')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'CUDA graph = record once, then replay' : 'Learning SGLang Ch. 11 Step 1: a CUDA graph records launches, then replays them', phone ? 'CUDA graph = 录一次，再重放' : 'Learning SGLang 第 11 章第 1 步：CUDA graph 录下 launches，再重放')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue kernels · orange graph · grey CPU' : 'blue = GPU kernels · orange = graph · grey = CPU dispatch', phone ? '蓝 kernels · 橙 graph · 灰 CPU' : '蓝 = GPU kernels · 橙 = graph · 灰 = CPU dispatch')}</text>
        {#if !phone}
          {#each [false, true] as graphed}
            {@const x = graphed ? 375 : 30}
            <rect x={x} y="102" width="315" height="389" rx="12" fill="var(--bg)" stroke={graphed ? 'var(--gen)' : 'var(--line)'} />
            <text x={x + 15} y="128" class="small strong">{graphed ? t('CUDA GRAPH', 'CUDA GRAPH') : t('EAGER · EVERY CALL', 'EAGER · 每次调用')}</text>
            <rect x={x + 45} y="143" width="225" height="35" rx="7" fill="white" stroke={graphed ? 'var(--gen)' : 'var(--faint)'} />
            <text x={x + 157} y="166" text-anchor="middle" class="small">{graphed ? t('capture once · replay per match', '录一次 · 匹配时重放') : t('CPU dispatches every kernel', 'CPU 逐个 dispatch kernels')}</text>
            {#if graphed}
              <rect x={x + 24} y="190" width="267" height="250" rx="10" fill="var(--gen-soft)" fill-opacity="0.35" stroke="var(--gen)" stroke-width="2" />
              <text x={x + 39} y="210" class="small strong">GRAPH</text>
              <line x1={x + 157} y1="179" x2={x + 157} y2="189" stroke="var(--gen)" stroke-width="3" />
            {/if}
            {#each [t('attention', '注意力'), 'MLP', t('attention', '注意力'), 'MLP', '…'] as kernel, i}
              {@const y = 222 + i * 43}
              <rect x={x + 52} y={y} width="211" height="30" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={x + 157} y={y + 21} text-anchor="middle" class="small">{kernel}</text>
              {#if !graphed}
                <line x1={x + 157} y1={y - 11} x2={x + 157} y2={y - 3} stroke="var(--faint)" stroke-width="2" />
              {/if}
            {/each}
            <text x={x + 157} y="469" text-anchor="middle" class="small strong">{graphed ? t('one graph replay for the stack', '整层序列一次 graph replay') : t('one dispatch per kernel', '每个 kernel 一次 dispatch')}</text>
          {/each}
          <text x="360" y="522" text-anchor="middle" class="small strong">{t('Same kernels and math; only the CPU submission path changes.', 'kernels 和数学不变；改变的是 CPU 提交路径。')}</text>
        {:else}
          {#each [false, true] as graphed, panel}
            {@const y = graphed ? 423 : 98}
            <rect x="18" y={y} width="264" height="303" rx="11" fill="var(--bg)" stroke={graphed ? 'var(--gen)' : 'var(--line)'} />
            <text x="32" y={y + 24} class="small strong">{graphed ? 'CUDA GRAPH' : 'EAGER'}</text>
            <rect x="32" y={y + 37} width="236" height="32" rx="6" fill="white" stroke={graphed ? 'var(--gen)' : 'var(--faint)'} />
            <text x="150" y={y + 58} text-anchor="middle" class="small">{graphed ? t('capture once · replay', '录一次 · 重放') : t('CPU dispatches each kernel', 'CPU 逐个 dispatch')}</text>
            {#if graphed}
              <rect x="27" y={y + 78} width="246" height="181" rx="8" fill="var(--gen-soft)" fill-opacity="0.35" stroke="var(--gen)" />
              <text x="39" y={y + 97} class="small strong">GRAPH</text>
            {/if}
            {#each [t('attention', '注意力'), 'MLP', t('attention', '注意力'), 'MLP', '…'] as kernel, i}
              {@const ky = y + 105 + i * 31}
              <rect x="58" y={ky} width="184" height="24" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="150" y={ky + 17} text-anchor="middle" class="small">{kernel}</text>
              {#if !graphed}
                <line x1="150" y1={ky - 7} x2="150" y2={ky - 2} stroke="var(--faint)" stroke-width="2" />
              {/if}
            {/each}
            <text x="150" y={y + 282} text-anchor="middle" class="small strong">{graphed ? t('one graph replay', '一次 graph replay') : t('dispatch per kernel', '逐个 dispatch')}</text>
          {/each}
          <text x="150" y="754" text-anchor="middle" class="small strong">{t('Same kernels; new submission path.', 'kernels 不变；提交路径改变。')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Opt-in · eager fallback remains' : 'Opt-in audio-layer graphs; eager fallback remains. No timing win claimed.', phone ? '可选开启 · 保留 eager 回退' : '可选 audio 层 graph；保留 eager 回退，不声称耗时收益。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Qwen3-Omni audio buckets', 'Qwen3-Omni audio buckets')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'bucket = captured size' : 'token bucket = captured input size · Learning SGLang Ch. 11 Steps 10–11 showed pad and crop', phone ? 'bucket = 已 capture 的大小' : 'token bucket = 已 capture 的输入大小 · Learning SGLang 第 11 章第 10–11 步已讲补位和裁切')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue real · grey zeros · orange graph' : 'blue = real tokens · grey = zero padding · orange = chosen graph', phone ? '蓝真实 · 灰补零 · 橙 graph' : '蓝 = 真实 token · 灰 = 补零 · 橙 = 选中的 graph')}</text>
        {#if !phone}
          <text x="30" y="105" class="small strong">{OPT_AUDIO_GRAPH_COUNT} {t('DEFAULT SIZES · DEFAULT_TOKEN_BUCKETS', '种默认大小 · DEFAULT_TOKEN_BUCKETS')}</text>
          {#each OPT_AUDIO_TOKEN_BUCKETS as bucket, i}
            {@const x = 30 + i * 105}
            <rect x={x} y="120" width="100" height="58" rx="8" fill={bucket === OPT_AUDIO_BUCKET_TOKENS ? 'var(--gen-soft)' : 'var(--bg)'} stroke={bucket === OPT_AUDIO_BUCKET_TOKENS ? 'var(--gen)' : 'var(--line)'} />
            <text x={x + 50} y="155" text-anchor="middle" class="result">{bucket}</text>
          {/each}
          <text x="360" y="211" text-anchor="middle" class="result">{OPT_AUDIO_REAL_TOKENS} {t('real tokens', '真实 token')} → {OPT_AUDIO_BUCKET_TOKENS}-token graph</text>
          <rect x="120" y="239" width={480 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} height="52" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={120 + 480 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} y="239" width={480 * OPT_AUDIO_PADDING_TOKENS / OPT_AUDIO_BUCKET_TOKENS} height="52" fill="var(--bg)" stroke="var(--faint)" />
          <text x={120 + 240 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} y="271" text-anchor="middle" class="small strong">{OPT_AUDIO_REAL_TOKENS} real</text>
          <text x={120 + 480 * (OPT_AUDIO_REAL_TOKENS + OPT_AUDIO_PADDING_TOKENS / 2) / OPT_AUDIO_BUCKET_TOKENS} y="271" text-anchor="middle" class="small">{OPT_AUDIO_PADDING_TOKENS} zeros</text>
          <text x="360" y="320" text-anchor="middle" class="result">{OPT_AUDIO_BUCKET_TOKENS} − {OPT_AUDIO_REAL_TOKENS} = {OPT_AUDIO_PADDING_TOKENS} {t('zero positions', '个补零位置')}</text>
          <line x1="360" y1="338" x2="360" y2="360" stroke="var(--gen)" stroke-width="3" />
          <rect x="245" y="366" width="230" height="60" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="403" text-anchor="middle" class="small strong">{OPT_AUDIO_BUCKET_TOKENS}-token graph replay</text>
          <line x1="360" y1="427" x2="360" y2="449" stroke="var(--gen)" stroke-width="3" />
          <rect x="120" y="455" width={480 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} height="49" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={120 + 480 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} y="455" width={480 * OPT_AUDIO_PADDING_TOKENS / OPT_AUDIO_BUCKET_TOKENS} height="49" fill="white" stroke="var(--faint)" stroke-dasharray="5 4" />
          <text x={120 + 240 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} y="486" text-anchor="middle" class="small strong">output[:{OPT_AUDIO_REAL_TOKENS}]</text>
          <text x={120 + 480 * (OPT_AUDIO_REAL_TOKENS + OPT_AUDIO_PADDING_TOKENS / 2) / OPT_AUDIO_BUCKET_TOKENS} y="486" text-anchor="middle" class="small">{t('cropped', '裁掉')}</text>
          <text x="360" y="534" text-anchor="middle" class="small">{t('Real and padded positions are processed apart, so real outputs cannot read padding.', '真实和补零位置分开处理，真实输出读不到 padding。')}</text>
          <text x="360" y="563" text-anchor="middle" class="small">{t('No matching graph or above 4096 tokens → run the original layers eagerly.', '无匹配 graph 或超过 4096 token → 按原层序列 eager 运行。')}</text>
        {:else}
          <text x="18" y="103" class="small strong">{OPT_AUDIO_GRAPH_COUNT} {t('DEFAULT SIZES · DEFAULT_TOKEN_BUCKETS', '种默认大小 · DEFAULT_TOKEN_BUCKETS')}</text>
          {#each OPT_AUDIO_TOKEN_BUCKETS as bucket, i}
            {@const x = 18 + (i % 3) * 90}
            {@const y = 116 + Math.floor(i / 3) * 66}
            <rect x={x} y={y} width="82" height="54" rx="7" fill={bucket === OPT_AUDIO_BUCKET_TOKENS ? 'var(--gen-soft)' : 'var(--bg)'} stroke={bucket === OPT_AUDIO_BUCKET_TOKENS ? 'var(--gen)' : 'var(--line)'} />
            <text x={x + 41} y={y + 34} text-anchor="middle" class="result">{bucket}</text>
          {/each}
          <text x="150" y="275" text-anchor="middle" class="result">{OPT_AUDIO_REAL_TOKENS} → {OPT_AUDIO_BUCKET_TOKENS}-token graph</text>
          <rect x="30" y="300" width={240 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} height="49" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={30 + 240 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} y="300" width={240 * OPT_AUDIO_PADDING_TOKENS / OPT_AUDIO_BUCKET_TOKENS} height="49" fill="var(--bg)" stroke="var(--faint)" />
          <text x={30 + 120 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} y="330" text-anchor="middle" class="small strong">{OPT_AUDIO_REAL_TOKENS} real</text>
          <text x={30 + 240 * (OPT_AUDIO_REAL_TOKENS + OPT_AUDIO_PADDING_TOKENS / 2) / OPT_AUDIO_BUCKET_TOKENS} y="330" text-anchor="middle" class="small">{OPT_AUDIO_PADDING_TOKENS} zeros</text>
          <text x="150" y="377" text-anchor="middle" class="result">{OPT_AUDIO_BUCKET_TOKENS} − {OPT_AUDIO_REAL_TOKENS} = {OPT_AUDIO_PADDING_TOKENS}</text>
          <rect x="50" y="402" width="200" height="57" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="437" text-anchor="middle" class="small strong">{OPT_AUDIO_BUCKET_TOKENS}-token replay</text>
          <rect x="30" y="492" width={240 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} height="49" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={30 + 240 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} y="492" width={240 * OPT_AUDIO_PADDING_TOKENS / OPT_AUDIO_BUCKET_TOKENS} height="49" fill="white" stroke="var(--faint)" stroke-dasharray="5 4" />
          <text x={30 + 120 * OPT_AUDIO_REAL_TOKENS / OPT_AUDIO_BUCKET_TOKENS} y="522" text-anchor="middle" class="small strong">[:{OPT_AUDIO_REAL_TOKENS}]</text>
          <text x={30 + 240 * (OPT_AUDIO_REAL_TOKENS + OPT_AUDIO_PADDING_TOKENS / 2) / OPT_AUDIO_BUCKET_TOKENS} y="522" text-anchor="middle" class="small">{t('cropped', '裁掉')}</text>
          <text x="150" y="584" text-anchor="middle" class="small">{t('Real and padded positions are processed apart;', '真实和补零位置分开处理，')}</text>
          <text x="150" y="611" text-anchor="middle" class="small">{t('so real outputs cannot read padding.', '真实输出读不到 padding。')}</text>
          <text x="150" y="652" text-anchor="middle" class="small">{t('No match or >4096 tokens', '无匹配或超过 4096 token')}</text>
          <text x="150" y="681" text-anchor="middle" class="small strong">→ {t('run the original layers eagerly', '按原层序列 eager 运行')}</text>
          <text x="150" y="727" text-anchor="middle" class="small">{t('Only the first 300 outputs remain.', '只保留前 300 份输出。')}</text>
        {/if}
        {#if phone}
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Learning SGLang Ch. 11 Steps 10–11: pad + crop', 'Learning SGLang 第 11 章第 10–11 步：补位和裁切')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed shapes · no timing result' : 'Constructed tensor shapes; real outputs cannot read padding. No timing result.', phone ? '构造形状 · 无耗时结果' : '构造 tensor 形状；真实输出读不到 padding，无耗时结果。')}</text>
      {:else if step === 6}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Four mechanisms and waits' : 'Four mechanisms, four different waits', phone ? '四种机制与等待' : '四种机制，四种不同等待')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'MOSS 1–4 · Qwen audio 5–6' : 'Different examples: MOSS-TTS 1–4 · Qwen3-Omni audio 5–6', phone ? 'MOSS 1–4 · Qwen audio 5–6' : '不同示例：MOSS-TTS 第 1–4 步 · Qwen3-Omni audio 第 5–6 步')}</text>
        {#if !phone}
          <text x="30" y="88" class="small strong">{t('MECHANISM', '机制')}</text>
          <text x="190" y="88" class="small strong">{t('WAIT IT ADDRESSES', '处理的等待')}</text>
          <text x="440" y="88" class="small strong">{t('BOUNDARY', '边界')}</text>
          {#each summary as item, i}
            {@const y = 102 + i * 59}
            <rect x="25" y={y} width="670" height="49" rx="7" fill="var(--bg)" stroke="var(--line)" />
            <text x="35" y={y + 30} class="small strong">{i + 1} · {t(item.name, item.nameZh)}</text>
            <text x="190" y={y + 30} class="small">{t(item.wait, item.waitZh)}</text>
            <text x="440" y={y + 30} class="small">{t(item.limit, item.limitZh)}</text>
          {/each}
          <text x="30" y="374" class="small strong">{t('NEXT HAND-OFF', '下一次交接')}</text>
          <text x="30" y="400" class="label">{t('vocoder = codec frames → sound · blue = frames and sound', 'vocoder = codec frames → 声音 · 蓝 = frames 和声音')}</text>
          <rect x="25" y="422" width="80" height="57" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="65" y="457" text-anchor="middle" class="small strong">AR</text>
          <line x1="106" y1="451" x2="132" y2="451" stroke="var(--accent)" stroke-width="2" marker-end="url(#opt-arrow)" />
          <rect x="140" y="422" width="160" height="57" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="220" y="457" text-anchor="middle" class="small strong">{OPT_VOCODER_FRAMES_PER_CHUNK} codec frames</text>
          <line x1="301" y1="451" x2="337" y2="451" stroke="var(--accent)" stroke-width="2" marker-end="url(#opt-arrow)" />
          <rect x="345" y="422" width="130" height="57" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="410" y="457" text-anchor="middle" class="small strong">vocoder</text>
          <line x1="476" y1="451" x2="512" y2="451" stroke="var(--accent)" stroke-width="2" marker-end="url(#opt-arrow)" />
          <rect x="520" y="422" width="170" height="57" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="605" y="457" text-anchor="middle" class="small strong">{OPT_VOCODER_CHUNK_MS} ms {t('sound', '声音')}</text>
          <text x="360" y="514" text-anchor="middle" class="result">{OPT_VOCODER_FRAMES_PER_CHUNK} × {OPT_VOCODER_FRAME_MS} ms = {OPT_VOCODER_CHUNK_MS} ms</text>
          <text x="360" y="546" text-anchor="middle" class="small strong" style="fill:var(--gen)">{t('orange deadline = next chunk before the current one ends', '橙色期限 = 当前 chunk 播完前拿到下一段')}</text>
          <text x="360" y="583" text-anchor="middle" class="result">{t('How can the vocoder keep sound ahead of playback?', 'vocoder 怎样让声音赶在播放前到达？')}</text>
        {:else}
          {#each summary as item, i}
            {@const y = 82 + i * 92}
            <rect x="18" y={y} width="264" height="79" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 23} class="small strong">{i + 1} · {t(item.name, item.nameZh)}</text>
            <text x="32" y={y + 47} class="small">{t(item.wait, item.waitZh)}</text>
            <text x="32" y={y + 68} class="small">{t(item.limit, item.limitZh)}</text>
          {/each}
          <text x="18" y="476" class="small strong">{t('NEXT HAND-OFF', '下一次交接')}</text>
          <text x="18" y="501" class="label">{t('vocoder = frames → sound', 'vocoder = frames → 声音')}</text>
          <rect x="18" y="519" width="264" height="55" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="553" text-anchor="middle" class="small strong">AR → {OPT_VOCODER_FRAMES_PER_CHUNK} codec frames</text>
          <line x1="150" y1="575" x2="150" y2="594" stroke="var(--accent)" stroke-width="2" marker-end="url(#opt-arrow)" />
          <rect x="18" y="601" width="264" height="55" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="635" text-anchor="middle" class="small strong">vocoder</text>
          <line x1="150" y1="657" x2="150" y2="676" stroke="var(--accent)" stroke-width="2" marker-end="url(#opt-arrow)" />
          <rect x="18" y="683" width="264" height="55" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="717" text-anchor="middle" class="small strong">{OPT_VOCODER_CHUNK_MS} ms {t('sound', '声音')}</text>
          <text x="150" y="767" text-anchor="middle" class="result">{OPT_VOCODER_FRAMES_PER_CHUNK} × {OPT_VOCODER_FRAME_MS} = {OPT_VOCODER_CHUNK_MS} ms</text>
          <text x="150" y="800" text-anchor="middle" class="small strong" style="fill:var(--gen)">{t('deadline: before the current chunk ends', '期限：当前 chunk 播完前')}</text>
          <text x="150" y="837" text-anchor="middle" class="small strong">{t('How can vocoder stay ahead?', 'vocoder 怎样赶在播放前？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? '10 frames = 800 ms · Ch. 20 Steps 1–3' : 'Playback durations from Learning SGLang Ch. 20 Steps 1–3, not vocoder compute times.', phone ? '10 frames = 800 ms · 第 20 章' : '播放时长来自 Learning SGLang 第 20 章第 1–3 步，不是 vocoder 计算耗时。')}</text>
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
