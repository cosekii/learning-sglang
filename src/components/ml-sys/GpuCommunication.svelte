<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { COMM_EXAMPLE_COMPUTE_BEFORE_MS, COMM_EXAMPLE_COMPUTE_AFTER_MS, COMM_EXAMPLE_WAIT_BEFORE_MS, COMM_EXAMPLE_WAIT_AFTER_MS, COMM_EXAMPLE_TOTAL_BEFORE_MS, COMM_EXAMPLE_TOTAL_AFTER_MS, COMM_EXAMPLE_COMPUTE_SAVED_MS, COMM_EXAMPLE_WAIT_ADDED_MS, COMM_EXAMPLE_TOTAL_ADDED_MS, COMM_WORLD_SIZE, COMM_PARTIAL_TENSORS, COMM_REDUCED_TENSOR, COMM_TENSOR_TEXT } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Compute halves to ${COMM_EXAMPLE_COMPUTE_AFTER_MS} ms, but communication grows from ${COMM_EXAMPLE_WAIT_BEFORE_MS} ms to ${COMM_EXAMPLE_WAIT_AFTER_MS} ms. Total time rises by ${COMM_EXAMPLE_TOTAL_ADDED_MS} ms.`,
    captionZh: `计算从 ${COMM_EXAMPLE_COMPUTE_BEFORE_MS} ms 减到 ${COMM_EXAMPLE_COMPUTE_AFTER_MS} ms，通信却从 ${COMM_EXAMPLE_WAIT_BEFORE_MS} ms 增到 ${COMM_EXAMPLE_WAIT_AFTER_MS} ms。总时间多了 ${COMM_EXAMPLE_TOTAL_ADDED_MS} ms。`,
  }, {
    caption: `Each GPU computes a two-number tensor. All-reduce adds the four tensors and gives every GPU ${COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}.`,
    captionZh: `每张卡算出自己的两格张量。all-reduce 求和，让四张卡都得到 ${COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}。`,
  }, {
    caption: `One process drives each GPU in this example. Rank names the process; world size counts all ${COMM_WORLD_SIZE}.`,
    captionZh: `这个例子里，一个进程管一张 GPU。rank 是进程编号，world size 是总数 ${COMM_WORLD_SIZE}。`,
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 510 : 410);
  const barScale = 22;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('A constructed example where more GPUs reduce compute time but add more communication time.', '构造例子：更多 GPU 减少计算时间，却增加更多通信时间。')}>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t('More GPUs can still finish later', 'GPU 更多，总时间也可能更长')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('constructed example · same work · same millisecond scale', '构造示例 · 同一份计算 · 同一把毫秒标尺')}</text>
        {#if !phone}
          {#each [{ x: 40, gpus: 4, compute: COMM_EXAMPLE_COMPUTE_BEFORE_MS, wait: COMM_EXAMPLE_WAIT_BEFORE_MS, total: COMM_EXAMPLE_TOTAL_BEFORE_MS }, { x: 380, gpus: 8, compute: COMM_EXAMPLE_COMPUTE_AFTER_MS, wait: COMM_EXAMPLE_WAIT_AFTER_MS, total: COMM_EXAMPLE_TOTAL_AFTER_MS }] as row}
            <rect x={row.x} y="82" width="300" height="196" rx="13" fill="var(--bg)" stroke="var(--line)" />
            <text x={row.x + 20} y="113" class="section">{row.gpus} GPUs</text>
            <text x={row.x + 20} y="145" class="small">{t('compute', '计算')} · {row.compute} ms</text>
            <rect x={row.x + 20} y="158" width={row.compute * barScale} height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={row.x + 20} y="215" class="small">{t('communication', '通信')} · {row.wait} ms</text>
            <rect x={row.x + 20} y="228" width={row.wait * barScale} height="32" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={row.x + 280} y="113" text-anchor="end" class="total">{row.total} ms</text>
          {/each}
          <rect x="40" y="300" width="640" height="62" rx="11" fill="var(--panel)" stroke="var(--line)" />
          <text x="360" y="326" text-anchor="middle" class="result">4 → 8 GPUs: −{COMM_EXAMPLE_COMPUTE_SAVED_MS} ms {t('compute', '计算')} · +{COMM_EXAMPLE_WAIT_ADDED_MS} ms {t('communication', '通信')} · +{COMM_EXAMPLE_TOTAL_ADDED_MS} ms {t('total', '总时间')}</text>
          <text x="360" y="350" text-anchor="middle" class="small">{t('communication = moving tensors between GPUs and waiting', '通信 = 在 GPU 之间搬张量，并等它到齐')}</text>
          <text x="60" y="385" class="small"><tspan fill="var(--accent)">■</tspan> {t('compute', '计算')}   <tspan fill="var(--gen)">■</tspan> {t('communication', '通信')}</text>
        {:else}
          {#each [{ y: 76, gpus: 4, compute: COMM_EXAMPLE_COMPUTE_BEFORE_MS, wait: COMM_EXAMPLE_WAIT_BEFORE_MS, total: COMM_EXAMPLE_TOTAL_BEFORE_MS }, { y: 246, gpus: 8, compute: COMM_EXAMPLE_COMPUTE_AFTER_MS, wait: COMM_EXAMPLE_WAIT_AFTER_MS, total: COMM_EXAMPLE_TOTAL_AFTER_MS }] as row}
            <rect x="18" y={row.y} width="264" height="154" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={row.y + 27} class="section">{row.gpus} GPUs</text>
            <text x="266" y={row.y + 27} text-anchor="end" class="total">{row.total} ms</text>
            <text x="32" y={row.y + 55} class="small">{t('compute', '计算')} {row.compute} ms</text>
            <rect x="32" y={row.y + 65} width={row.compute * 13} height="22" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="32" y={row.y + 111} class="small">{t('communication', '通信')} {row.wait} ms</text>
            <rect x="32" y={row.y + 121} width={row.wait * 13} height="22" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
          {/each}
          <text x="150" y="427" text-anchor="middle" class="result">−{COMM_EXAMPLE_COMPUTE_SAVED_MS} ms {t('compute', '计算')} · +{COMM_EXAMPLE_WAIT_ADDED_MS} ms {t('communication', '通信')}</text>
          <text x="150" y="453" text-anchor="middle" class="result">{t('total', '总时间')} +{COMM_EXAMPLE_TOTAL_ADDED_MS} ms</text>
          <text x="150" y="479" text-anchor="middle" class="small">{t('communication moves tensors and waits', '通信要搬张量，也要等待')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Teaching values, not a local benchmark.', '构造的教学数值，不是本机实测。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 36} y="30" class="title">{t('All-reduce · add, then give everyone the total', 'all-reduce · 求和，再发回每卡')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('a tensor is a row of numbers · two numbers here', '张量就是一排数 · 这里每份有 2 格')}</text>
        {#if !phone}
          {#each COMM_PARTIAL_TENSORS as tensor, i}
            <rect x={25 + i * 172} y="86" width="150" height="82" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={100 + i * 172} y="115" text-anchor="middle" class="small strong">GPU {i}</text>
            <text x={100 + i * 172} y="148" text-anchor="middle" class="tensor">{COMM_TENSOR_TEXT(tensor)}</text>
          {/each}
          <text x="360" y="198" text-anchor="middle" class="result">{COMM_PARTIAL_TENSORS.map(COMM_TENSOR_TEXT).join(' + ')} = {COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}</text>
          <line x1="360" y1="214" x2="360" y2="245" stroke="var(--gen)" stroke-width="3" />
          <path d="M360,249 l-8,-13 h16 z" fill="var(--gen)" />
          <rect x="40" y="260" width="640" height="91" rx="13" fill="var(--gen-soft)" stroke="var(--gen)" />
          {#each COMM_PARTIAL_TENSORS as _, i}
            <text x={110 + i * 165} y="293" text-anchor="middle" class="small strong">GPU {i}</text>
            <text x={110 + i * 165} y="328" text-anchor="middle" class="tensor">{COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}</text>
          {/each}
          <text x="360" y="378" text-anchor="middle" class="small">{t('blue = local part · orange = same reduced result on every GPU', '蓝 = 各卡自己的部分 · 橙 = 每卡相同的求和结果')}</text>
        {:else}
          {#each COMM_PARTIAL_TENSORS as tensor, i}
            <rect x={18 + (i % 2) * 137} y={78 + Math.floor(i / 2) * 85} width="127" height="72" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={81 + (i % 2) * 137} y={103 + Math.floor(i / 2) * 85} text-anchor="middle" class="small strong">GPU {i}</text>
            <text x={81 + (i % 2) * 137} y={132 + Math.floor(i / 2) * 85} text-anchor="middle" class="tensor">{COMM_TENSOR_TEXT(tensor)}</text>
          {/each}
          <text x="150" y="267" text-anchor="middle" class="result">1 + 3 + 5 + 7 = 16</text>
          <text x="150" y="291" text-anchor="middle" class="result">2 + 4 + 6 + 8 = 20</text>
          <rect x="18" y="312" width="264" height="121" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="339" text-anchor="middle" class="small strong">{t('every GPU receives', '每张 GPU 都得到')}</text>
          <text x="150" y="374" text-anchor="middle" class="tensor">{COMM_TENSOR_TEXT(COMM_REDUCED_TENSOR)}</text>
          <text x="150" y="407" text-anchor="middle" class="small">GPU 0 · GPU 1 · GPU 2 · GPU 3</text>
          <text x="150" y="462" text-anchor="middle" class="small">{t('blue = local part · orange = shared total', '蓝 = 自己的部分 · 橙 = 共同结果')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed values; the operation is SUM.', '构造数值；这里的归约操作是求和。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 36} y="30" class="title">{t('One process group · four GPU workers', '一个进程组 · 四个 GPU 工作者')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('rank = process number · world size = process count', 'rank = 进程编号 · world size = 进程总数')}</text>
        {#if !phone}
          <rect x="40" y="72" width="640" height="264" rx="15" fill="var(--bg)" stroke="var(--accent)" stroke-dasharray="7 5" />
          <text x="58" y="96" class="small strong">{t('process group', '进程组')}</text>
          {#each COMM_PARTIAL_TENSORS as tensor, i}
            <rect x="70" y={108 + i * 53} width="210" height="42" rx="8" fill="var(--panel)" stroke="var(--line)" />
            <text x="88" y={135 + i * 53} class="small strong">{t('process', '进程')} {i} · rank {i}</text>
            <line x1="280" y1={129 + i * 53} x2="425" y2={129 + i * 53} stroke="var(--accent)" stroke-width="2" />
            <path d={`M425,${129 + i * 53} l-10,-6 v12 z`} fill="var(--accent)" />
            <rect x="435" y={108 + i * 53} width="210" height="42" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="453" y={135 + i * 53} class="small strong">GPU {i} · {COMM_TENSOR_TEXT(tensor)}</text>
          {/each}
          <rect x="200" y="351" width="320" height="37" rx="18" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="375" text-anchor="middle" class="result">world size = {COMM_WORLD_SIZE}</text>
        {:else}
          <rect x="12" y="70" width="276" height="326" rx="14" fill="var(--bg)" stroke="var(--accent)" stroke-dasharray="7 5" />
          <text x="26" y="93" class="small strong">{t('process group', '进程组')}</text>
          {#each COMM_PARTIAL_TENSORS as tensor, i}
            <rect x="25" y={105 + i * 67} width="108" height="49" rx="8" fill="var(--panel)" stroke="var(--line)" />
            <text x="79" y={125 + i * 67} text-anchor="middle" class="small strong">{t('process', '进程')} {i}</text>
            <text x="79" y={145 + i * 67} text-anchor="middle" class="small">rank {i}</text>
            <line x1="133" y1={129 + i * 67} x2="162" y2={129 + i * 67} stroke="var(--accent)" stroke-width="2" />
            <path d={`M162,${129 + i * 67} l-8,-5 v10 z`} fill="var(--accent)" />
            <rect x="170" y={105 + i * 67} width="103" height="49" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="221" y={125 + i * 67} text-anchor="middle" class="small strong">GPU {i}</text>
            <text x="221" y={145 + i * 67} text-anchor="middle" class="small">{COMM_TENSOR_TEXT(tensor)}</text>
          {/each}
          <rect x="45" y="415" width="210" height="39" rx="19" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="440" text-anchor="middle" class="result">world size = {COMM_WORLD_SIZE}</text>
          <text x="150" y="477" text-anchor="middle" class="small">{t('one process per GPU in this example', '本例：一个进程对应一张 GPU')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('The one-process-per-GPU mapping is an example, not a requirement.', '一进程一卡是本例安排，不是唯一做法。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .section { font-family: var(--mono); font-size: 17px; font-weight: 700; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .total { font-family: var(--mono); font-size: 18px; font-weight: 700; fill: var(--fg); }
  .tensor { font-family: var(--mono); font-size: 18px; font-weight: 700; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section, .total, .tensor { font-size: 15px; }
    .result { font-size: 13px; }
  }
</style>
