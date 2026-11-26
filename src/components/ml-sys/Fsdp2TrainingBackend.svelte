<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { FSDP_EXAMPLE_PARAMS_B, FSDP_DP_SIZE, FSDP_BYTES_PER_PARAM, FSDP_FULL_WEIGHT_GB, FSDP_FULL_GRADIENT_GB, FSDP_FULL_OPTIMIZER_GB, FSDP_FULL_STATE_PER_GPU_GB, FSDP_FULL_CLUSTER_STATE_GB, FSDP_FULL_CARD_SHARE, FSDP_SHARD_WEIGHT_GB, FSDP_SHARD_GRADIENT_GB, FSDP_SHARD_OPTIMIZER_GB, FSDP_SHARD_STATE_PER_GPU_GB, FSDP_SHARD_CLUSTER_STATE_GB } from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type MobileItem = { title: string; titleZh: string; body: string; bodyZh: string; tone: Tone };
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; mobileTitle: string; mobileTitleZh: string; mobileSubtitle: string; mobileSubtitleZh: string;
    mobileFoot: string; mobileFootZh: string; mobile: MobileItem[]; formulas: { en: string; zh: string }[];
  };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: `This full training copy costs ${FSDP_FULL_STATE_PER_GPU_GB} GB per GPU. Eight replicated GPUs hold ${FSDP_FULL_CLUSTER_STATE_GB} GB.`,
    captionZh: `本例每张 GPU 保存完整训练表，共 ${FSDP_FULL_STATE_PER_GPU_GB} GB。8 张卡重复保存，总计 ${FSDP_FULL_CLUSTER_STATE_GB} GB。`,
    title: 'Full replication turns 64 GB into 512 GB', titleZh: '完整复制把 64 GB 变成 512 GB',
    subtitle: 'full replication = every GPU keeps the same weights, gradients and optimizer state',
    subtitleZh: '完整复制 = 每张 GPU 都保存同样的权重、梯度和优化器状态',
    foot: 'Constructed 4B example; 16-bit = 2 bytes and FP32 = 4 bytes per number.',
    footZh: '构造的 4B 示例；16 位 = 每个数 2 字节，FP32 = 每个数 4 字节。',
    mobileTitle: 'Eight full copies · 512 GB', mobileTitleZh: '8 份完整复制 · 512 GB',
    mobileSubtitle: 'full replication = every GPU keeps all tables', mobileSubtitleZh: '完整复制 = 每张卡保存所有表',
    mobileFoot: 'Constructed example, not a memory measurement.', mobileFootZh: '构造算例，不是显存实测。',
    mobile: [
      { title: 'TRAINING STATE', titleZh: '训练状态', body: 'weights + gradients + optimizer state', bodyZh: '权重 + 梯度 + 优化器状态', tone: 'orange' },
      { title: 'ONE GPU · FULL COPY', titleZh: '一张 GPU · 完整复制', body: '8 + 8 + 48 = 64 GB', bodyZh: '8 + 8 + 48 = 64 GB', tone: 'orange' },
      { title: '8 GPUS · SAME COPIES', titleZh: '8 张 GPU · 相同副本', body: '64 GB × 8 = 512 GB', bodyZh: '64 GB × 8 = 512 GB', tone: 'blue' },
    ],
    formulas: [
      { en: `${FSDP_EXAMPLE_PARAMS_B}B values × ${FSDP_BYTES_PER_PARAM} bytes = ${FSDP_FULL_STATE_PER_GPU_GB} GB`, zh: `${FSDP_EXAMPLE_PARAMS_B}B 个数 × ${FSDP_BYTES_PER_PARAM} 字节 = ${FSDP_FULL_STATE_PER_GPU_GB} GB` },
      { en: `${FSDP_FULL_STATE_PER_GPU_GB} GB × ${FSDP_DP_SIZE} = ${FSDP_FULL_CLUSTER_STATE_GB} GB`, zh: `${FSDP_FULL_STATE_PER_GPU_GB} GB × ${FSDP_DP_SIZE} = ${FSDP_FULL_CLUSTER_STATE_GB} GB` },
      { en: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ 80 GB = ${(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}% of one H100`, zh: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ 80 GB = 一张 H100 的 ${(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}%` },
      { en: '16 bytes = 2 + 2 + 12 per value', zh: '每个数 16 字节 = 2 + 2 + 12' },
    ],
  }, {
    caption: `FSDP2 divides the same tables across the DP group. Each rank owns ${FSDP_SHARD_STATE_PER_GPU_GB} GB in this example.`,
    captionZh: `FSDP2 把同样的表分给 DP 组。本例每个 rank 拥有 ${FSDP_SHARD_STATE_PER_GPU_GB} GB。`,
    title: 'FSDP2 keeps one slice of each table', titleZh: 'FSDP2 让每个 rank 各留一片',
    subtitle: 'shard = one rank\'s part · DP group = ranks sharing one model',
    subtitleZh: 'shard = 一个 rank 的一片 · DP 组 = 共同分担一个模型的 rank',
    foot: 'Equal slices simplify the layout; DP size is the mesh size, not always the physical GPU count.',
    footZh: '等分只是简化画法；DP 大小取决于 mesh，不一定等于物理 GPU 数。',
    mobileTitle: 'Each rank owns 8 GB', mobileTitleZh: '每个 rank 拥有 8 GB',
    mobileSubtitle: 'shard = one rank\'s part · DP 8', mobileSubtitleZh: 'shard = 一个 rank 的一片 · DP 8',
    mobileFoot: 'Equal slices are a teaching simplification.', mobileFootZh: '等分只是教学简化。',
    mobile: [
      { title: 'FSDP2 · DP GROUP 8', titleZh: 'FSDP2 · DP 组 8', body: 'divide the same tables, not the models', bodyZh: '分同样的表，不是分成 8 个模型', tone: 'blue' },
      { title: 'EACH RANK OWNS', titleZh: '每个 rank 拥有', body: '1 + 1 + 6 = 8 GB', bodyZh: '1 + 1 + 6 = 8 GB', tone: 'blue' },
      { title: '8 RANKS TOGETHER', titleZh: '8 个 rank 合计', body: '8 × 8 = 64 GB, not 512 GB', bodyZh: '8 × 8 = 64 GB，不是 512 GB', tone: 'orange' },
    ],
    formulas: [
      { en: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${FSDP_DP_SIZE} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB per rank`, zh: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${FSDP_DP_SIZE} = 每个 rank ${FSDP_SHARD_STATE_PER_GPU_GB} GB` },
      { en: `${FSDP_DP_SIZE} × ${FSDP_SHARD_STATE_PER_GPU_GB} GB = ${FSDP_SHARD_CLUSTER_STATE_GB} GB total`, zh: `${FSDP_DP_SIZE} × ${FSDP_SHARD_STATE_PER_GPU_GB} GB = 合计 ${FSDP_SHARD_CLUSTER_STATE_GB} GB` },
      { en: 'Each GPU keeps one-eighth of its old copy', zh: '每张 GPU 只留原来的八分之一' },
    ],
  }, {
    caption: 'Forward temporarily rebuilds one layer for computation. The full layer is released afterward.',
    captionZh: '前向计算时，先临时拼出一层。算完就释放这一层。',
    title: 'Forward borrows a full layer, then releases it', titleZh: '前向先借来完整一层，用完释放',
    subtitle: 'all-gather = rebuild one full layer from every rank\'s shard · unit = the layer gathered together',
    subtitleZh: 'all-gather = 从各 rank 的分片拼出完整一层 · unit = 一起聚合的这一层',
    foot: 'The temporary unit has U bytes; the source supplies no U value.',
    footZh: '临时 unit 的大小记作 U；来源没有给出 U 的数值。',
    mobileTitle: 'Borrow a layer, then release it', mobileTitleZh: '借来一层，用完释放',
    mobileSubtitle: 'all-gather = rebuild a full layer', mobileSubtitleZh: 'all-gather = 拼出完整一层',
    mobileFoot: 'U is temporary and unquantified.', mobileFootZh: 'U 是临时占用，数值未知。',
    mobile: [
      { title: 'OWNED SHARDS', titleZh: '拥有的分片', body: '8 GB stay on this rank', bodyZh: '这个 rank 长期保存 8 GB', tone: 'orange' },
      { title: 'ALL-GATHER · ONE UNIT', titleZh: 'ALL-GATHER · 一个 unit', body: 'every rank contributes its shard', bodyZh: '每个 rank 都拿出自己的一片', tone: 'blue' },
      { title: 'FULL LAYER · U BYTES', titleZh: '完整一层 · U 字节', body: 'compute with the full values', bodyZh: '用完整数值计算', tone: 'blue' },
      { title: 'RELEASE', titleZh: '释放', body: 'return to 8 GB owned', bodyZh: '回到长期保存的 8 GB', tone: 'plain' },
    ],
    formulas: [
      { en: 'During compute: 8 GB + U', zh: '计算时：8 GB + U' },
      { en: 'After release: 8 GB owned', zh: '释放后：长期保存 8 GB' },
      { en: 'U is not a measured value', zh: 'U 不是实测数值' },
    ],
  }, {
    caption: 'Backward reduces gradients across ranks. Each rank keeps its gradient slice and updates its weight slice.',
    captionZh: '反向计算会汇总各 rank 的梯度。每个 rank 留下自己的梯度片，再更新自己的权重片。',
    title: 'Backward keeps a reduced gradient slice', titleZh: '反向计算留下归约后的梯度片',
    subtitle: 'reduce-scatter = sum matching gradients, then keep one slice',
    subtitleZh: 'reduce-scatter = 汇总对应梯度，再各留一片',
    foot: 'Backward also gathers parameters as needed; this step follows the gradient path.',
    footZh: '反向计算也会按需聚合参数；本步只跟梯度这条线。',
    mobileTitle: 'Keep one reduced gradient slice', mobileTitleZh: '留下一片归约后的梯度',
    mobileSubtitle: 'reduce-scatter = sum, then split', mobileSubtitleZh: 'reduce-scatter = 汇总再分片',
    mobileFoot: 'The optimizer updates only the owned weight shard.', mobileFootZh: '优化器只更新自己拥有的权重片。',
    mobile: [
      { title: 'FULL GRADIENT · TEMPORARY', titleZh: '完整梯度 · 临时', body: 'produced during backward', bodyZh: '反向计算时产生', tone: 'blue' },
      { title: 'REDUCE-SCATTER', titleZh: 'REDUCE-SCATTER', body: 'sum matching values, then split', bodyZh: '汇总对应数值，再分片', tone: 'orange' },
      { title: 'OWNED GRADIENT · 1 GB', titleZh: '拥有的梯度 · 1 GB', body: 'only this rank\'s slice', bodyZh: '只留这个 rank 的一片', tone: 'orange' },
      { title: 'OPTIMIZER', titleZh: '优化器', body: 'update the owned weight shard', bodyZh: '更新自己拥有的权重片', tone: 'orange' },
    ],
    formulas: [
      { en: 'parameters: all-gather', zh: '参数：all-gather' },
      { en: 'gradients: reduce-scatter', zh: '梯度：reduce-scatter' },
      { en: 'owned gradient = 1 GB', zh: '拥有的梯度 = 1 GB' },
    ],
  }, {
    caption: `The owned slices total ${FSDP_SHARD_STATE_PER_GPU_GB} GB. Peak memory also includes the largest temporary unit and activations.`,
    captionZh: `长期分片合计 ${FSDP_SHARD_STATE_PER_GPU_GB} GB。峰值还包括最大临时 unit 和激活。`,
    title: 'Owned 8 GB is not the peak', titleZh: '长期保存 8 GB，不等于峰值',
    subtitle: 'peak = saved state plus temporary memory needed at the busiest moment',
    subtitleZh: '峰值 = 保存状态 + 最忙时需要的临时显存',
    foot: 'The source\'s exact peak formula is for FSDP1 Stage 3; no exact FSDP2 peak is claimed.',
    footZh: '来源的精确峰值公式针对 FSDP1 Stage 3；本步不声称 FSDP2 的精确峰值。',
    mobileTitle: 'Owned 8 GB is not the peak', mobileTitleZh: '长期 8 GB，不是峰值',
    mobileSubtitle: 'peak = saved state + temporary work', mobileSubtitleZh: '峰值 = 保存状态 + 临时工作',
    mobileFoot: 'No exact FSDP2 peak is claimed.', mobileFootZh: '不声称 FSDP2 的精确峰值。',
    mobile: [
      { title: 'OWNED STATE · 8 GB', titleZh: '长期状态 · 8 GB', body: 'weights + gradients + optimizer', bodyZh: '权重 + 梯度 + 优化器状态', tone: 'orange' },
      { title: 'LARGEST UNIT · Umax', titleZh: '最大 unit · Umax', body: 'the biggest temporary full layer', bodyZh: '最大的一份临时完整层', tone: 'blue' },
      { title: 'ACTIVATIONS + OTHER · ?', titleZh: '激活 + 其他 · ?', body: 'intermediate results, no source total', bodyZh: '中间结果，来源未给总量', tone: 'plain' },
    ],
    formulas: [
      { en: 'Peak is greater than 8 GB', zh: '峰值大于 8 GB' },
      { en: 'No exact total is claimed', zh: '不填精确总量' },
    ],
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
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [560, 560, 600, 600, 560][step] : [500, 500, 500, 500, 500][step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="fsdp-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="fsdp-arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobileTitle, cur.mobileTitleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobileSubtitle, cur.mobileSubtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.mobile as item, i}
          {@const y = 80 + i * 91}
          <rect x="25" y={y} width="250" height="70" rx="11" fill={fill(item.tone)} stroke={stroke(item.tone)} />
          <text x="150" y={y + 25} text-anchor="middle" class="small strong">{t(item.title, item.titleZh)}</text>
          <text x="150" y={y + 50} text-anchor="middle" class="small">{t(item.body, item.bodyZh)}</text>
          {#if i < cur.mobile.length - 1}
            <line x1="150" y1={y + 70} x2="150" y2={y + 86} stroke={stroke(item.tone)} stroke-width="2.5" marker-end={item.tone === 'orange' ? 'url(#fsdp-arrow-orange)' : 'url(#fsdp-arrow-blue)'} />
          {/if}
        {/each}
        {#each cur.formulas as line, i}
          <text x="150" y={80 + cur.mobile.length * 91 + 12 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
      {:else if step === 0}
        <rect x="35" y="88" width="310" height="252" rx="13" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="190" y="120" text-anchor="middle" class="section">{t('ONE GPU · FULL COPY', '一张 GPU · 完整复制')}</text>
        <text x="65" y="158" class="small">{t('weights · 2 bytes each', '权重 · 每个 2 字节')}</text>
        <text x="315" y="158" text-anchor="end" class="result">{FSDP_FULL_WEIGHT_GB} GB</text>
        <text x="65" y="194" class="small">{t('gradients · 2 bytes each', '梯度 · 每个 2 字节')}</text>
        <text x="315" y="194" text-anchor="end" class="result">{FSDP_FULL_GRADIENT_GB} GB</text>
        <text x="65" y="230" class="small">{t('optimizer · 3 tables × 4 bytes', '优化器 · 3 张表 × 4 字节')}</text>
        <text x="315" y="230" text-anchor="end" class="result">{FSDP_FULL_OPTIMIZER_GB} GB</text>
        <line x1="60" y1="250" x2="320" y2="250" stroke="var(--line)" />
        <text x="65" y="284" class="small strong">{t('TOTAL ON THIS GPU', '这张 GPU 合计')}</text>
        <text x="315" y="284" text-anchor="end" class="big">{FSDP_FULL_STATE_PER_GPU_GB} GB</text>
        <text x="190" y="318" text-anchor="middle" class="small">{(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}% {t('of an 80 GB H100', '一张 80 GB H100')}</text>
        <rect x="375" y="88" width="310" height="252" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="530" y="120" text-anchor="middle" class="section">{t('8 GPUS · SAME COPIES', '8 张 GPU · 相同副本')}</text>
        {#each Array.from({ length: FSDP_DP_SIZE }, (_, i) => i) as i}
          <rect x={393 + (i % 4) * 70} y={140 + Math.floor(i / 4) * 72} width="60" height="56" rx="8" fill="var(--bg)" stroke="var(--accent)" />
          <text x={423 + (i % 4) * 70} y={163 + Math.floor(i / 4) * 72} text-anchor="middle" class="small">GPU {i}</text>
          <text x={423 + (i % 4) * 70} y={184 + Math.floor(i / 4) * 72} text-anchor="middle" class="small strong">{FSDP_FULL_STATE_PER_GPU_GB} GB</text>
        {/each}
        <text x="530" y="318" text-anchor="middle" class="big">{FSDP_FULL_CLUSTER_STATE_GB} GB</text>
        <text x="360" y="382" text-anchor="middle" class="result">{FSDP_EXAMPLE_PARAMS_B}B values × {FSDP_BYTES_PER_PARAM} bytes = {FSDP_FULL_STATE_PER_GPU_GB} GB {t('per GPU', '每张 GPU')}</text>
        <text x="360" y="416" text-anchor="middle" class="result">{FSDP_FULL_STATE_PER_GPU_GB} GB × {FSDP_DP_SIZE} = {FSDP_FULL_CLUSTER_STATE_GB} GB</text>
        <text x="360" y="452" text-anchor="middle" class="small">{t('Orange = saved training tables · blue = repeated full copies', '橙 = 训练保存的表 · 蓝 = 重复的完整副本')}</text>
      {:else if step === 1}
        <rect x="30" y="88" width="315" height="248" rx="13" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="187" y="120" text-anchor="middle" class="section">{t('BEFORE · FULL COPY', '之前 · 完整复制')}</text>
        <rect x="60" y="140" width="250" height="64" rx="9" fill="var(--bg)" stroke="var(--gen)" />
        <text x="185" y="180" text-anchor="middle" class="big">{FSDP_FULL_STATE_PER_GPU_GB} GB</text>
        <text x="187" y="231" text-anchor="middle" class="small">{FSDP_FULL_WEIGHT_GB} + {FSDP_FULL_GRADIENT_GB} + {FSDP_FULL_OPTIMIZER_GB} = {FSDP_FULL_STATE_PER_GPU_GB} GB</text>
        <text x="187" y="270" text-anchor="middle" class="result">{FSDP_DP_SIZE} {t('copies', '份')} = {FSDP_FULL_CLUSTER_STATE_GB} GB</text>
        <text x="187" y="305" text-anchor="middle" class="small">{t('every GPU keeps every table', '每张 GPU 都保存所有表')}</text>
        <rect x="375" y="88" width="315" height="248" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="532" y="120" text-anchor="middle" class="section">{t('WITH FSDP2 · ONE RANK', '使用 FSDP2 · 一个 rank')}</text>
        <rect x="405" y="140" width={250 / FSDP_DP_SIZE} height="64" rx="4" fill="var(--bg)" stroke="var(--accent)" />
        <text x="450" y="180" class="big">{FSDP_SHARD_STATE_PER_GPU_GB} GB</text>
        <text x="532" y="231" text-anchor="middle" class="small">{FSDP_SHARD_WEIGHT_GB} + {FSDP_SHARD_GRADIENT_GB} + {FSDP_SHARD_OPTIMIZER_GB} = {FSDP_SHARD_STATE_PER_GPU_GB} GB</text>
        <text x="532" y="270" text-anchor="middle" class="result">{FSDP_DP_SIZE} {t('ranks', '个 rank')} = {FSDP_SHARD_CLUSTER_STATE_GB} GB</text>
        <text x="532" y="305" text-anchor="middle" class="small">{t('each rank owns one shard', '每个 rank 拥有一片')}</text>
        <text x="360" y="370" text-anchor="middle" class="small strong">{t('The two bars use one scale: 250 px = 64 GB.', '两条柱使用同一比例：250 px = 64 GB。')}</text>
        <text x="360" y="407" text-anchor="middle" class="result">{FSDP_FULL_STATE_PER_GPU_GB} GB ÷ {FSDP_DP_SIZE} = {FSDP_SHARD_STATE_PER_GPU_GB} GB {t('per rank', '每个 rank')}</text>
        <text x="360" y="450" text-anchor="middle" class="small">{t('Orange = full copies · blue = owned shards', '橙 = 完整副本 · 蓝 = 拥有的分片')}</text>
      {:else if step === 2}
        {#each [
          { x: 25, title: 'OWNED SHARDS', titleZh: '拥有的分片', result: '8 GB', body: 'persistent', bodyZh: '长期保存', tone: 'orange' },
          { x: 205, title: 'ALL-GATHER', titleZh: 'ALL-GATHER', result: 'one unit', body: 'from every rank', bodyZh: '来自每个 rank', tone: 'blue' },
          { x: 385, title: 'FULL LAYER', titleZh: '完整一层', result: 'U bytes', body: 'compute', bodyZh: '计算', tone: 'blue' },
          { x: 565, title: 'RELEASE', titleZh: '释放', result: 'U gone', body: 'owned 8 GB', bodyZh: '仍保存 8 GB', tone: 'plain' },
        ] as node, i}
          <rect x={node.x} y="105" width="130" height="151" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.tone === 'plain' ? '5 4' : '0'} />
          <text x={node.x + 65} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={node.x + 65} y="180" text-anchor="middle" class="result">{node.result}</text>
          <text x={node.x + 65} y="222" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if i < 3}
            <line x1={node.x + 130} y1="181" x2={node.x + 170} y2="181" stroke={i === 0 ? 'var(--gen)' : 'var(--accent)'} stroke-width="2.5" marker-end={i === 0 ? 'url(#fsdp-arrow-orange)' : 'url(#fsdp-arrow-blue)'} />
          {/if}
        {/each}
        <text x="360" y="304" text-anchor="middle" class="result">{t('DURING COMPUTE', '计算时')} · 8 GB + U</text>
        <text x="360" y="342" text-anchor="middle" class="result">{t('AFTER RELEASE', '释放后')} · 8 GB</text>
        <text x="360" y="383" text-anchor="middle" class="small">{t('Forward gathers parameters, not gradients.', '前向聚合的是参数，不是梯度。')}</text>
        <text x="360" y="429" text-anchor="middle" class="small">{t('Orange = persistent state · blue = temporary full values', '橙 = 长期保存状态 · 蓝 = 临时完整数值')}</text>
      {:else if step === 3}
        {#each [
          { x: 40, title: 'FULL GRADIENT', titleZh: '完整梯度', result: 'temporary', body: 'from backward', bodyZh: '反向计算产生', tone: 'blue' },
          { x: 275, title: 'REDUCE-SCATTER', titleZh: 'REDUCE-SCATTER', result: 'sum + split', body: 'across all ranks', bodyZh: '跨所有 rank', tone: 'orange' },
          { x: 510, title: 'OWNED GRADIENT', titleZh: '拥有的梯度', result: '1 GB', body: 'this rank\'s slice', bodyZh: '这个 rank 的一片', tone: 'orange' },
        ] as node, i}
          <rect x={node.x} y="95" width="170" height="157" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} />
          <text x={node.x + 85} y="129" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={node.x + 85} y="174" text-anchor="middle" class="result">{node.result}</text>
          <text x={node.x + 85} y="217" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if i < 2}<line x1={node.x + 170} y1="174" x2={node.x + 225} y2="174" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#fsdp-arrow-orange)" />{/if}
        {/each}
        <line x1="595" y1="252" x2="595" y2="292" stroke="var(--gen)" stroke-width="2.5" marker-end="url(#fsdp-arrow-orange)" />
        <rect x="485" y="302" width="220" height="79" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="595" y="332" text-anchor="middle" class="section">{t('OPTIMIZER', '优化器')}</text>
        <text x="595" y="361" text-anchor="middle" class="small">{t('update the owned weight shard', '更新自己拥有的权重片')}</text>
        <rect x="35" y="292" width="365" height="99" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="217" y="324" text-anchor="middle" class="small strong">{t('DO NOT ALL-GATHER THE GRADIENT', '不要 all-gather 梯度')}</text>
        <text x="217" y="359" text-anchor="middle" class="result">parameters: all-gather</text>
        <text x="217" y="383" text-anchor="middle" class="result">gradients: reduce-scatter</text>
        <text x="360" y="435" text-anchor="middle" class="small">{t('Orange = reduction and owned state · blue = temporary full gradient', '橙 = 归约与拥有状态 · 蓝 = 临时完整梯度')}</text>
      {:else if step === 4}
        <rect x="70" y="88" width="300" height="79" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x="220" y="119" text-anchor="middle" class="result">A + other ?</text>
        <text x="220" y="148" text-anchor="middle" class="small">{t('activations and other temporary results', '激活和其他临时结果')}</text>
        <rect x="70" y="177" width="300" height="79" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="220" y="208" text-anchor="middle" class="result">Umax</text>
        <text x="220" y="237" text-anchor="middle" class="small">{t('largest full unit gathered at once', '一次聚合的最大完整 unit')}</text>
        <rect x="70" y="266" width="300" height="89" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="220" y="302" text-anchor="middle" class="big">8 GB</text>
        <text x="220" y="334" text-anchor="middle" class="small">{t('owned weights + gradients + optimizer state', '拥有的权重 + 梯度 + 优化器状态')}</text>
        <text x="420" y="125" class="result">A</text>
        <text x="455" y="125" class="small">{t('activations = training intermediates', '激活 = 训练中间结果')}</text>
        <text x="420" y="199" class="result">Umax</text>
        <text x="480" y="199" class="small">{t('temporary, size unknown', '临时占用，大小未知')}</text>
        <text x="420" y="286" class="result">?</text>
        <text x="455" y="286" class="small">{t('no exact total in the source', '来源没有精确总量')}</text>
        <text x="360" y="401" text-anchor="middle" class="result">{t('PEAK', '峰值')} &gt; 8 GB · {t('exact total unknown', '精确总量未知')}</text>
        <text x="360" y="448" text-anchor="middle" class="small">{t('Orange = persistent owned state · blue = temporary unit · grey = other temporary memory', '橙 = 长期拥有状态 · 蓝 = 临时 unit · 灰 = 其他临时显存')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(cur.mobileFoot, cur.mobileFootZh) : t(cur.foot, cur.footZh)}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .section { font-family: var(--mono); font-size: 15px; font-weight: 700; fill: var(--fg); }
  .strong { font-weight: 650; }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .big { font-family: var(--mono); font-size: 25px; font-weight: 700; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .result { font-size: 12px; }
    .big { font-size: 22px; }
  }
</style>
