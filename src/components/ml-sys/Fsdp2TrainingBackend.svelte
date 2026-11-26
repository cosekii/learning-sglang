<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { HBM_GB } from '../../numbers';
  import { FSDP_EXAMPLE_PARAMS_B, FSDP_DP_SIZE, FSDP_FULL_WEIGHT_GB, FSDP_FULL_GRADIENT_GB, FSDP_FULL_OPTIMIZER_GB, FSDP_FULL_STATE_PER_GPU_GB, FSDP_FULL_CLUSTER_STATE_GB, FSDP_FULL_CARD_SHARE, FSDP_SHARD_WEIGHT_GB, FSDP_SHARD_GRADIENT_GB, FSDP_SHARD_OPTIMIZER_GB, FSDP_SHARD_STATE_PER_GPU_GB, FSDP_FORWARD_RESIDENT_GB, FSDP_SHARD_CLUSTER_STATE_GB } from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type MobileItem = { title: string; titleZh: string; body: string; bodyZh: string; tone: Tone };
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; mobileTitle: string; mobileTitleZh: string; mobileSubtitle: string; mobileSubtitleZh: string;
    mobileFoot: string; mobileFootZh: string; mobileLegend: string; mobileLegendZh: string; mobile: MobileItem[]; formulas: { en: string; zh: string }[];
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
    foot: 'Constructed example; bytes per value: weights 2, gradients 2, optimizer tables 4 each.',
    footZh: '构造示例；每个数占：权重 2 字节，梯度 2 字节，优化器表各 4 字节。',
    mobileTitle: 'Eight full copies · 512 GB', mobileTitleZh: '8 份完整复制 · 512 GB',
    mobileSubtitle: 'full replication = every GPU keeps all tables', mobileSubtitleZh: '完整复制 = 每张卡保存所有表',
    mobileFoot: 'Constructed example, not a memory measurement.', mobileFootZh: '构造算例，不是显存实测。',
    mobileLegend: 'Orange = saved tables · blue = full copies', mobileLegendZh: '橙 = 保存的表 · 蓝 = 完整副本',
    mobile: [
      { title: 'TRAINING STATE', titleZh: '训练状态', body: 'weights + gradients + optimizer state', bodyZh: '权重 + 梯度 + 优化器状态', tone: 'orange' },
      { title: 'ONE GPU · FULL COPY', titleZh: '一张 GPU · 完整复制', body: '8 + 8 + 48 = 64 GB', bodyZh: '8 + 8 + 48 = 64 GB', tone: 'orange' },
      { title: '8 GPUS · SAME COPIES', titleZh: '8 张 GPU · 相同副本', body: '64 GB × 8 = 512 GB', bodyZh: '64 GB × 8 = 512 GB', tone: 'blue' },
    ],
    formulas: [
      { en: `${FSDP_EXAMPLE_PARAMS_B}B values × 16 bytes = ${FSDP_FULL_STATE_PER_GPU_GB} GB per GPU`, zh: `每张 GPU：${FSDP_EXAMPLE_PARAMS_B}B 个数 × 16 字节 = ${FSDP_FULL_STATE_PER_GPU_GB} GB` },
      { en: `${FSDP_FULL_STATE_PER_GPU_GB} GB × ${FSDP_DP_SIZE} = ${FSDP_FULL_CLUSTER_STATE_GB} GB`, zh: `${FSDP_FULL_STATE_PER_GPU_GB} GB × ${FSDP_DP_SIZE} = ${FSDP_FULL_CLUSTER_STATE_GB} GB` },
      { en: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${HBM_GB} GB = ${(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}% of one H100`, zh: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${HBM_GB} GB = 一张 H100 的 ${(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}%` },
      { en: '16 bytes = 2 + 2 + 3 × 4 per value', zh: '每个数 16 字节 = 2 + 2 + 3 × 4' },
    ],
  }, {
    caption: `FSDP2 gives each of the same 8 ranks one shard. One rank per GPU means ${FSDP_SHARD_STATE_PER_GPU_GB} GB each.`,
    captionZh: `FSDP2 让同样 8 个 rank 各留一个分片。本例每卡一个 rank，每个分片占 ${FSDP_SHARD_STATE_PER_GPU_GB} GB。`,
    title: 'FSDP2 keeps one shard per rank', titleZh: 'FSDP2 让每个 rank 各留一个分片',
    subtitle: 'shard = one rank\'s part · same 8 ranks, one per GPU',
    subtitleZh: '分片 = 一个 rank 的一份 · 同样 8 个 rank，每卡一个',
    foot: 'Equal shards are a teaching simplification; real tensors need not divide evenly.',
    footZh: '等分只是教学简化；真实张量不一定能等分。',
    mobileTitle: 'Each rank owns 8 GB', mobileTitleZh: '每个 rank 拥有 8 GB',
    mobileSubtitle: 'shard = one rank\'s part · one rank per GPU', mobileSubtitleZh: '分片 = 一个 rank 的一份 · 每卡一个 rank',
    mobileFoot: 'Equal shards are a teaching simplification.', mobileFootZh: '等分只是教学简化。',
    mobileLegend: 'Orange = full copy · blue = owned shard', mobileLegendZh: '橙 = 完整副本 · 蓝 = 拥有分片',
    mobile: [
      { title: 'BEFORE · FULL COPY', titleZh: '之前 · 完整副本', body: '64 GB per GPU · 8 copies = 512 GB', bodyZh: '每卡 64 GB · 8 份 = 512 GB', tone: 'orange' },
      { title: 'EACH RANK OWNS', titleZh: '每个 rank 拥有', body: '1 + 1 + 6 = 8 GB', bodyZh: '1 + 1 + 6 = 8 GB', tone: 'blue' },
      { title: '8 RANKS TOGETHER', titleZh: '8 个 rank 合计', body: '8 × 8 = 64 GB, not 512 GB', bodyZh: '8 × 8 = 64 GB，不是 512 GB', tone: 'blue' },
    ],
    formulas: [
      { en: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${FSDP_DP_SIZE} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB per rank`, zh: `${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${FSDP_DP_SIZE} = 每个 rank ${FSDP_SHARD_STATE_PER_GPU_GB} GB` },
      { en: `${FSDP_DP_SIZE} × ${FSDP_SHARD_STATE_PER_GPU_GB} GB = ${FSDP_SHARD_CLUSTER_STATE_GB} GB total`, zh: `${FSDP_DP_SIZE} × ${FSDP_SHARD_STATE_PER_GPU_GB} GB = 合计 ${FSDP_SHARD_CLUSTER_STATE_GB} GB` },
      { en: 'Each GPU keeps one-eighth of its old copy', zh: '每张 GPU 只留原来的八分之一' },
    ],
  }, {
    caption: `zero_grad clears the old gradient shard. Forward starts with ${FSDP_FORWARD_RESIDENT_GB} GB, then temporarily adds one full layer.`,
    captionZh: `zero_grad 清掉旧梯度分片。Forward 先保留 ${FSDP_FORWARD_RESIDENT_GB} GB，再临时加入完整一层。`,
    title: `Forward starts with ${FSDP_FORWARD_RESIDENT_GB} GB, then borrows a layer`, titleZh: `Forward 先保留 ${FSDP_FORWARD_RESIDENT_GB} GB，再借来一层`,
    subtitle: 'all-gather = rebuild one full layer from every rank\'s shard',
    subtitleZh: 'all-gather = 从各 rank 的分片拼出完整一层',
    foot: 'Initial forward after zero_grad(set_to_none=True); U has no supplied value.',
    footZh: '本步是 zero_grad(set_to_none=True) 后的初始 forward；U 大小未知。',
    mobileTitle: `Forward starts with ${FSDP_FORWARD_RESIDENT_GB} GB`, mobileTitleZh: `Forward 先保留 ${FSDP_FORWARD_RESIDENT_GB} GB`,
    mobileSubtitle: 'all-gather = rebuild a full layer', mobileSubtitleZh: 'all-gather = 拼出完整一层',
    mobileFoot: 'Initial forward after zero_grad; U is unknown.', mobileFootZh: 'zero_grad 后的初始 forward；U 大小未知。',
    mobileLegend: 'Orange = weights + optimizer · blue = temporary layer', mobileLegendZh: '橙 = 权重 + 优化器 · 蓝 = 临时完整层',
    mobile: [
      { title: 'WEIGHTS + OPTIMIZER', titleZh: '权重 + 优化器', body: `${FSDP_SHARD_WEIGHT_GB} GB + ${FSDP_SHARD_OPTIMIZER_GB} GB = ${FSDP_FORWARD_RESIDENT_GB} GB`, bodyZh: `${FSDP_SHARD_WEIGHT_GB} GB + ${FSDP_SHARD_OPTIMIZER_GB} GB = ${FSDP_FORWARD_RESIDENT_GB} GB`, tone: 'orange' },
      { title: 'ALL-GATHER · ONE LAYER', titleZh: 'ALL-GATHER · 完整一层', body: 'every rank contributes its shard', bodyZh: '每个 rank 都拿出自己的一片', tone: 'plain' },
      { title: 'FULL LAYER · U', titleZh: '完整一层 · U', body: 'temporary memory, size unknown', bodyZh: '临时显存，大小未知', tone: 'blue' },
      { title: 'RELEASE', titleZh: '释放', body: `${FSDP_FORWARD_RESIDENT_GB} GB remains`, bodyZh: `仍留 ${FSDP_FORWARD_RESIDENT_GB} GB`, tone: 'plain' },
    ],
    formulas: [
      { en: `During compute: ${FSDP_FORWARD_RESIDENT_GB} GB + U`, zh: `计算时：${FSDP_FORWARD_RESIDENT_GB} GB + U` },
      { en: `After release: ${FSDP_FORWARD_RESIDENT_GB} GB`, zh: `释放后：${FSDP_FORWARD_RESIDENT_GB} GB` },
      { en: `Training bill: ${FSDP_FORWARD_RESIDENT_GB} + ${FSDP_SHARD_GRADIENT_GB} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB`, zh: `训练账：${FSDP_FORWARD_RESIDENT_GB} + ${FSDP_SHARD_GRADIENT_GB} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB` },
    ],
  }, {
    caption: 'Each rank scales its loss before backward. The summed, pre-scaled gradients do not multiply the update by eight.',
    captionZh: 'backward 前先缩放 loss。汇总预缩放梯度，更新不会放大 8 倍。',
    title: 'Scale loss, then sum the gradients', titleZh: '先缩放 loss，再汇总梯度',
    subtitle: 'reduce-scatter = sum pre-scaled gradients, then keep one shard',
    subtitleZh: 'reduce-scatter = 汇总预缩放梯度，再各留一个分片',
    foot: 'Pinned slime: loss = loss * dp_size / global_batch_size before loss.backward().',
    footZh: '固定版 slime：loss.backward() 前执行 loss = loss * dp_size / global_batch_size。',
    mobileTitle: 'Scale loss, then sum gradients', mobileTitleZh: '先缩放 loss，再汇总梯度',
    mobileSubtitle: 'reduce-scatter = sum, then split', mobileSubtitleZh: 'reduce-scatter = 汇总再分片',
    mobileFoot: 'Rank gradients enter the sum already pre-scaled.', mobileFootZh: '各 rank 的梯度先预缩放，再参加汇总。',
    mobileLegend: 'Orange = owned shard · blue = layer gradient', mobileLegendZh: '橙 = 拥有分片 · 蓝 = 本层梯度',
    mobile: [
      { title: 'LAYER GRADIENT · TEMPORARY', titleZh: '本层梯度 · 临时', body: 'from the pre-scaled loss', bodyZh: '由预缩放 loss 算出', tone: 'blue' },
      { title: 'REDUCE-SCATTER', titleZh: 'REDUCE-SCATTER', body: 'sum pre-scaled values, then split', bodyZh: '汇总预缩放值，再分片', tone: 'plain' },
      { title: 'OWNED GRADIENT · ONE SHARD', titleZh: '拥有的梯度 · 一个分片', body: 'this layer\'s reduced shard', bodyZh: '本层汇总后的分片', tone: 'orange' },
      { title: 'OPTIMIZER · AFTER ALL LAYERS', titleZh: '优化器 · 所有层算完后', body: 'update the owned weight shard', bodyZh: '更新拥有的权重分片', tone: 'plain' },
    ],
    formulas: [
      { en: 'loss × dp_size ÷ global_batch_size', zh: 'loss × dp_size ÷ global_batch_size' },
      { en: 'rank gradients are pre-scaled', zh: '各 rank 梯度已预缩放' },
      { en: 'the sum does not make an 8× update', zh: '求和不会把更新放大 8 倍' },
      { en: 'all layers\' gradients: 8 GB ÷ 8 = 1 GB per rank', zh: '所有层的梯度：8 GB ÷ 8 = 每个 rank 1 GB' },
    ],
  }, {
    caption: `The full training-state bill is ${FSDP_SHARD_STATE_PER_GPU_GB} GB. Temporary layers and intermediates raise the peak above it.`,
    captionZh: `完整训练状态账是 ${FSDP_SHARD_STATE_PER_GPU_GB} GB。临时层和中间结果还会抬高峰值。`,
    title: `The ${FSDP_SHARD_STATE_PER_GPU_GB} GB training bill is below the peak`, titleZh: `${FSDP_SHARD_STATE_PER_GPU_GB} GB 训练账不是峰值`,
    subtitle: 'peak = training state plus temporary memory at the busiest moment',
    subtitleZh: '峰值 = 训练状态 + 最忙时的临时显存',
    foot: 'The source supplies no exact FSDP2 peak total.',
    footZh: '来源没有给出 FSDP2 的精确峰值总量。',
    mobileTitle: `The ${FSDP_SHARD_STATE_PER_GPU_GB} GB bill is below the peak`, mobileTitleZh: `${FSDP_SHARD_STATE_PER_GPU_GB} GB 训练账不是峰值`,
    mobileSubtitle: 'peak = training state + temporary work', mobileSubtitleZh: '峰值 = 训练状态 + 临时工作',
    mobileFoot: 'No exact FSDP2 peak is supplied.', mobileFootZh: '来源没有给出 FSDP2 的精确峰值。',
    mobileLegend: 'Orange = training bill · blue = layer · grey = intermediates', mobileLegendZh: '橙 = 训练账 · 蓝 = 完整层 · 灰 = 中间结果',
    mobile: [
      { title: `TRAINING BILL · ${FSDP_SHARD_STATE_PER_GPU_GB} GB`, titleZh: `训练状态账 · ${FSDP_SHARD_STATE_PER_GPU_GB} GB`, body: 'weights + gradients + optimizer', bodyZh: '权重 + 梯度 + 优化器状态', tone: 'orange' },
      { title: 'LARGEST BORROWED LAYER', titleZh: '最大临时完整层', body: 'temporary full values, size unknown', bodyZh: '临时完整数值，大小未知', tone: 'blue' },
      { title: 'INTERMEDIATES + OTHER · ?', titleZh: '中间结果 + 其他 · ?', body: 'temporary results, no source total', bodyZh: '临时结果，来源未给总量', tone: 'plain' },
    ],
    formulas: [
      { en: `Peak is greater than ${FSDP_SHARD_STATE_PER_GPU_GB} GB`, zh: `峰值大于 ${FSDP_SHARD_STATE_PER_GPU_GB} GB` },
      { en: 'No exact total is claimed', zh: '不填精确总量' },
    ],
  }, {
    caption: 'After training, export gathers full weight tensors into buckets. Gradients and optimizer state stay in training.',
    captionZh: '训练结束后，导出把完整权重张量装进桶。梯度和优化器状态留在训练端。',
    title: 'Rollout receives full weights bucket by bucket', titleZh: 'Rollout 按桶收到完整权重',
    subtitle: 'Replicate() = gather one weight tensor\'s shards into a full tensor',
    subtitleZh: 'Replicate() = 把一个张量在各 rank 的分片拼成完整张量',
    foot: 'No whole-model gather; Ch. 7 Steps 5 and 6 show bucket handoffs, whole-version waits and old-KV rejection.',
    footZh: '不会一次拼出整套训练模型；第 7 章第 5、6 步讲按桶交接、整版等待和旧 KV 失效。',
    mobileTitle: 'Full weights, one bucket at a time', mobileTitleZh: '完整权重，一次一桶',
    mobileSubtitle: 'Replicate() = gather one tensor\'s shards', mobileSubtitleZh: 'Replicate() = 拼起一个张量的各 rank 分片',
    mobileFoot: 'Ch. 7 Step 6: whole-version wait; old KV rejected.', mobileFootZh: '第 7 章第 6 步：等待完整版本，旧 KV 失效。',
    mobileLegend: 'Orange = training state · blue = full weights', mobileLegendZh: '橙 = 训练状态 · 蓝 = 完整权重',
    mobile: [
      { title: 'WEIGHT SHARDS ONLY', titleZh: '只取权重分片', body: 'gradients + optimizer stay in training', bodyZh: '梯度和优化器留在训练端', tone: 'orange' },
      { title: 'REPLICATE()', titleZh: 'REPLICATE()', body: 'one full weight tensor', bodyZh: '拼出一个完整权重张量', tone: 'plain' },
      { title: 'BUCKET', titleZh: '一桶', body: 'full tensors wait together', bodyZh: '完整张量一起等待发送', tone: 'blue' },
      { title: 'CH. 7 STEP 5 → ROLLOUT', titleZh: '第 7 章第 5 步 → ROLLOUT', body: 'one-bucket handoff', bodyZh: '每次交接一桶', tone: 'plain' },
    ],
    formulas: [
      { en: 'weights + gradients: 16 bits = 2 bytes', zh: '权重 + 梯度：16 位 = 2 字节' },
      { en: 'optimizer tables: 32 bits = 4 bytes · 2×', zh: '优化器表：32 位 = 4 字节 · 2 倍' },
      { en: 'Next: fewer bits per number?', zh: '下一章：每个数用更少位？' },
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
  const H = $derived(phone ? [560, 560, 600, 600, 560, 600][step] : [500, 500, 500, 500, 500, 520][step]);
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
        <marker id="fsdp-arrow-plain" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--line)" />
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
          {#if i < cur.mobile.length - 1 && step !== 4}
            <line x1="150" y1={y + 70} x2="150" y2={y + 86} stroke={step >= 2 ? 'var(--line)' : stroke(item.tone)} stroke-width="2.5" marker-end={step >= 2 ? 'url(#fsdp-arrow-plain)' : item.tone === 'orange' ? 'url(#fsdp-arrow-orange)' : 'url(#fsdp-arrow-blue)'} />
          {/if}
        {/each}
        {#each cur.formulas as line, i}
          <text x="150" y={80 + cur.mobile.length * 91 + 12 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'} style={step === 3 && i === 3 ? 'font-size: 11px' : undefined}>{t(line.en, line.zh)}</text>
        {/each}
        <text x="150" y={80 + cur.mobile.length * 91 + 12 + cur.formulas.length * 27} text-anchor="middle" class="small">{t(cur.mobileLegend, cur.mobileLegendZh)}</text>
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
        <text x="190" y="318" text-anchor="middle" class="small">{FSDP_FULL_STATE_PER_GPU_GB} GB ÷ {HBM_GB} GB = {(FSDP_FULL_CARD_SHARE * 100).toFixed(0)}% {t('of H100', 'H100')}</text>
        <rect x="375" y="88" width="310" height="252" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="530" y="120" text-anchor="middle" class="section">{t('8 GPUS · SAME COPIES', '8 张 GPU · 相同副本')}</text>
        {#each Array.from({ length: FSDP_DP_SIZE }, (_, i) => i) as i}
          <rect x={393 + (i % 4) * 70} y={140 + Math.floor(i / 4) * 72} width="60" height="56" rx="8" fill="var(--bg)" stroke="var(--accent)" />
          <text x={423 + (i % 4) * 70} y={163 + Math.floor(i / 4) * 72} text-anchor="middle" class="small">GPU {i}</text>
          <text x={423 + (i % 4) * 70} y={184 + Math.floor(i / 4) * 72} text-anchor="middle" class="small strong">{FSDP_FULL_STATE_PER_GPU_GB} GB</text>
        {/each}
        <text x="530" y="318" text-anchor="middle" class="big">{FSDP_FULL_CLUSTER_STATE_GB} GB</text>
        <text x="360" y="382" text-anchor="middle" class="result">{FSDP_EXAMPLE_PARAMS_B}B values × 16 bytes = {FSDP_FULL_STATE_PER_GPU_GB} GB {t('per GPU', '每张 GPU')}</text>
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
          { x: 25, title: 'WEIGHTS + OPT', titleZh: '权重 + 优化器', result: `${FSDP_FORWARD_RESIDENT_GB} GB`, resultZh: `${FSDP_FORWARD_RESIDENT_GB} GB`, body: 'after zero_grad', bodyZh: 'zero_grad 之后', tone: 'orange' },
          { x: 205, title: 'ALL-GATHER', titleZh: 'ALL-GATHER', result: 'one layer', resultZh: '一层', body: 'from every rank', bodyZh: '来自每个 rank', tone: 'plain' },
          { x: 385, title: 'FULL LAYER', titleZh: '完整一层', result: 'U', resultZh: 'U', body: 'compute', bodyZh: '计算', tone: 'blue' },
          { x: 565, title: 'RELEASE', titleZh: '释放', result: 'U gone', resultZh: 'U 已释放', body: `${FSDP_FORWARD_RESIDENT_GB} GB remains`, bodyZh: `仍留 ${FSDP_FORWARD_RESIDENT_GB} GB`, tone: 'plain' },
        ] as node, i}
          <rect x={node.x} y="105" width="130" height="151" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.tone === 'plain' ? '5 4' : '0'} />
          <text x={node.x + 65} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={node.x + 65} y="180" text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
          <text x={node.x + 65} y="222" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if i < 3}
            <line x1={node.x + 130} y1="181" x2={node.x + 170} y2="181" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fsdp-arrow-plain)" />
          {/if}
        {/each}
        <text x="360" y="304" text-anchor="middle" class="result">{t('DURING COMPUTE', '计算时')} · {FSDP_FORWARD_RESIDENT_GB} GB + U</text>
        <text x="360" y="342" text-anchor="middle" class="result">{t('AFTER RELEASE', '释放后')} · {FSDP_FORWARD_RESIDENT_GB} GB</text>
        <text x="360" y="383" text-anchor="middle" class="small">{FSDP_SHARD_WEIGHT_GB} GB {t('weights', '权重')} + {FSDP_SHARD_OPTIMIZER_GB} GB {t('optimizer', '优化器')} = {FSDP_FORWARD_RESIDENT_GB} GB</text>
        <text x="360" y="409" text-anchor="middle" class="small">{t('Backward adds the', 'Backward 加入')} {FSDP_SHARD_GRADIENT_GB} GB {t('gradient shard', '梯度分片')}：{FSDP_FORWARD_RESIDENT_GB} + {FSDP_SHARD_GRADIENT_GB} = {FSDP_SHARD_STATE_PER_GPU_GB} GB</text>
        <text x="360" y="449" text-anchor="middle" class="small">{t('Orange = weights + optimizer · blue = temporary full values', '橙 = 权重 + 优化器 · 蓝 = 临时完整数值')}</text>
      {:else if step === 3}
        {#each [
          { x: 40, title: 'LAYER GRADIENT', titleZh: '本层梯度', result: 'temporary', resultZh: '临时', body: 'after forward', bodyZh: '前向之后算出', tone: 'blue' },
          { x: 275, title: 'REDUCE-SCATTER', titleZh: 'REDUCE-SCATTER', result: 'sum + split', resultZh: '汇总 + 分片', body: 'pre-scaled, not 8×', bodyZh: '预缩放，不放大 8 倍', tone: 'plain' },
          { x: 510, title: 'OWNED GRADIENT', titleZh: '拥有的梯度', result: 'one shard', resultZh: '一个分片', body: 'this layer\'s shard', bodyZh: '本层的分片', tone: 'orange' },
        ] as node, i}
          <rect x={node.x} y="95" width="170" height="157" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} />
          <text x={node.x + 85} y="129" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={node.x + 85} y="174" text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
          <text x={node.x + 85} y="217" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if i < 2}<line x1={node.x + 170} y1="174" x2={node.x + 225} y2="174" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fsdp-arrow-plain)" />{/if}
        {/each}
        <line x1="595" y1="252" x2="595" y2="292" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fsdp-arrow-plain)" />
        <rect x="485" y="302" width="220" height="79" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="595" y="332" text-anchor="middle" class="section">{t('OPTIMIZER', '优化器')}</text>
        <text x="595" y="361" text-anchor="middle" class="small">{t('after all layers: update owned weights', '所有层算完后：更新拥有的权重')}</text>
        <rect x="35" y="292" width="365" height="124" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="217" y="320" text-anchor="middle" class="small strong">{t('PRE-SCALE EACH RANK\'S LOSS', '先缩放每个 rank 的 LOSS')}</text>
        <text x="217" y="350" text-anchor="middle" class="small">{t('loss = loss * dp_size / global_batch_size', 'loss = loss * dp_size / global_batch_size')}</text>
        <text x="217" y="380" text-anchor="middle" class="small">{t('Different records contribute pre-scaled gradients.', '不同训练样本提供预缩放梯度。')}</text>
        <text x="217" y="406" text-anchor="middle" class="small">{t('all layers\' gradients: 8 GB ÷ 8 = 1 GB per rank', '所有层的梯度：8 GB ÷ 8 = 每个 rank 1 GB')}</text>
        <text x="360" y="455" text-anchor="middle" class="small">{t('Orange = owned shard · blue = temporary layer gradient', '橙 = 拥有分片 · 蓝 = 临时的本层梯度')}</text>
      {:else if step === 4}
        <rect x="70" y="88" width="300" height="79" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x="220" y="119" text-anchor="middle" class="result">{t('training intermediates', '训练中间结果')}</text>
        <text x="220" y="148" text-anchor="middle" class="small">{t('+ other temporary results · size unknown', '+ 其他临时结果 · 大小未知')}</text>
        <rect x="70" y="177" width="300" height="79" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="220" y="208" text-anchor="middle" class="result">{t('largest borrowed layer', '最大临时完整层')}</text>
        <text x="220" y="237" text-anchor="middle" class="small">{t('temporary, size unknown', '临时占用，大小未知')}</text>
        <rect x="70" y="266" width="300" height="89" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="220" y="302" text-anchor="middle" class="big">{FSDP_SHARD_STATE_PER_GPU_GB} GB</text>
        <text x="220" y="334" text-anchor="middle" class="small">{t('weights + gradients + optimizer state', '权重 + 梯度 + 优化器状态')}</text>
        <text x="420" y="125" class="small">{t('intermediates = values made during training', '中间结果 = 训练时算出的值')}</text>
        <text x="420" y="199" class="small">{t('the biggest layer borrowed at once', '同一时刻借来的最大一层')}</text>
        <text x="420" y="286" class="small">{t('? = no exact total in the source', '? = 来源没有精确总量')}</text>
        <text x="420" y="322" class="small">{FSDP_SHARD_STATE_PER_GPU_GB} GB {t('is the training-state bill,', '是完整训练状态账，')}</text>
        <text x="420" y="346" class="small">{t('not a permanent forward floor.', '不是 forward 的永久常驻量。')}</text>
        <text x="360" y="411" text-anchor="middle" class="result">{t('PEAK', '峰值')} &gt; {FSDP_SHARD_STATE_PER_GPU_GB} GB · {t('exact total unknown', '精确总量未知')}</text>
        <text x="360" y="458" text-anchor="middle" class="small">{t('Orange = training-state bill · blue = borrowed layer · grey = intermediates + other', '橙 = 训练状态账 · 蓝 = 临时完整层 · 灰 = 中间结果和其他临时显存')}</text>
      {:else if step === 5}
        {#each [
          { x: 25, title: 'WEIGHT SHARDS', titleZh: '权重分片', result: 'weights only', resultZh: '仅权重', body: 'grad + opt stay', bodyZh: '梯度和优化器留下', tone: 'orange' },
          { x: 205, title: 'REPLICATE()', titleZh: 'REPLICATE()', result: 'full tensor', resultZh: '完整张量', body: 'one parameter', bodyZh: '一个参数', tone: 'plain' },
          { x: 385, title: 'BUCKET', titleZh: '一桶', result: 'full tensors', resultZh: '完整张量', body: 'wait + send', bodyZh: '等待并发送', tone: 'blue' },
          { x: 565, title: 'ROLLOUT', titleZh: 'ROLLOUT', result: 'v1', resultZh: 'v1', body: 'Ch. 7 Step 5 · handoff', bodyZh: '第 7 章第 5 步交接', tone: 'plain' },
        ] as node, i}
          <rect x={node.x} y="95" width="130" height="151" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.tone === 'plain' ? '5 4' : '0'} />
          <text x={node.x + 65} y="127" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={node.x + 65} y="170" text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
          <text x={node.x + 65} y="212" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if i < 3}
            <line x1={node.x + 130} y1="171" x2={node.x + 170} y2="171" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fsdp-arrow-plain)" />
          {/if}
        {/each}
        <rect x="35" y="294" width="305" height="100" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" stroke-dasharray="5 4" />
        <text x="187" y="326" text-anchor="middle" class="section">{t('STAYS IN TRAINING', '留在训练端')}</text>
        <text x="187" y="362" text-anchor="middle" class="small">{t('gradients + optimizer state', '梯度 + 优化器状态')}</text>
        <rect x="380" y="294" width="305" height="100" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="532" y="316" text-anchor="middle" class="small strong">{t('NEXT · FEWER BITS', '下一章 · 更少位')}</text>
        <text x="532" y="340" text-anchor="middle" class="small">{t('weights + gradients: 16 bits = 2 bytes', '权重 + 梯度：16 位 = 2 字节')}</text>
        <text x="532" y="363" text-anchor="middle" class="small">{t('optimizer tables: 32 bits = 4 bytes · 2×', '优化器表：32 位 = 4 字节 · 2 倍')}</text>
        <text x="532" y="386" text-anchor="middle" class="small strong">{t('Which tables can use fewer bits?', '哪些表能用更少位？')}</text>
        <text x="360" y="441" text-anchor="middle" class="small">{t('Orange = training state · blue = temporary full weights for export', '橙 = 训练状态 · 蓝 = 导出的临时完整权重')}</text>
        <text x="360" y="478" text-anchor="middle" class="small">{t('Ch. 7 Step 5 shows one-bucket handoffs; Step 6 shows whole-version waits and old-KV rejection.', '第 7 章第 5 步讲按桶交接，第 6 步讲整版等待和旧 KV 失效。')}</text>
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
