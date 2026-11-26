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
    OPT_CACHE_HIT_COUNT,
    OPT_CACHED_TOTAL_MS,
    OPT_CACHE_SAVED_MS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Three prompts reuse one reference voice. Three separate encodes cost about ${OPT_REFERENCE_TOTAL_MS} ms.`,
    captionZh: `三个 prompt 共用一段参考音频。分别编码三次约需 ${OPT_REFERENCE_TOTAL_MS} ms。`,
  }, {
    caption: 'The cache stores the first result under an exact key. The next two matching requests load it instead of encoding again.',
    captionZh: 'cache 按完整 key 保存首次结果。后两个相同请求直接读取，不再编码。',
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
  const H = $derived(phone ? [790, 800][step] : [540, 590][step]);
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
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'reference encoder = voice → codes' : 'reference encoder = example voice → model-readable codes', phone ? 'reference encoder = 声音 → codes' : 'reference encoder = 示例声音 → 模型可读的 codes')}</text>
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
        {#if !phone}
          <rect x="30" y="78" width="660" height="94" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="45" y="102" class="small strong">{t('EXACT KEY · ALL PARTS MUST MATCH', '完整 key · 所有部分都必须匹配')}</text>
          <text x="45" y="127" class="code">model + revision + encoder config + artifact + audio + options</text>
          <text x="45" y="153" class="small">{t('prompt text is not in this reference-encoder key', 'prompt 文本不在参考 encoder 的 key 里')}</text>
          {#each requests as request, i}
            {@const y = 191 + i * 66}
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
          <text x="360" y="532" text-anchor="middle" class="small">{t('one miss + two hits; bars count GPU encode only', '一次 miss + 两次 hit；横条只算 GPU encode')}</text>
        {:else}
          <rect x="18" y="78" width="264" height="112" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="102" class="small strong">{t('EXACT KEY · MATCH ALL', '完整 key · 全部匹配')}</text>
          <text x="32" y="126" class="code">model + revision + config</text>
          <text x="32" y="148" class="code">artifact + audio + options</text>
          <text x="32" y="174" class="small">{t('prompt text is not in this key', 'prompt 文本不在这个 key 里')}</text>
          {#each requests as request, i}
            {@const y = 211 + i * 91}
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
          <text x="150" y="749" text-anchor="middle" class="small">{t('GPU encode only', '只算 GPU encode')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'GPU work only; not request latency.' : 'Approximate GPU-work comparison, not whole-request latency.', phone ? '只算 GPU 工作，不是请求延迟。' : '大致 GPU 工作对照，不是整个请求的延迟。')}</text>
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
