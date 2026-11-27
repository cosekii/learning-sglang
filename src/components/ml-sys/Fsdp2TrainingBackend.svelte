<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { HBM_GB } from '../../numbers';
  import { FSDP_EXAMPLE_PARAMS_B, FSDP_DP_SIZE, FSDP_FULL_WEIGHT_GB, FSDP_FULL_GRADIENT_GB, FSDP_FULL_OPTIMIZER_GB, FSDP_FULL_STATE_PER_GPU_GB, FSDP_FULL_CLUSTER_STATE_GB, FSDP_FULL_CARD_SHARE, FSDP_SHARD_WEIGHT_GB, FSDP_SHARD_GRADIENT_GB, FSDP_SHARD_OPTIMIZER_GB, FSDP_SHARD_STATE_PER_GPU_GB, FSDP_FORWARD_RESIDENT_GB, FSDP_SHARD_CLUSTER_STATE_GB } from '../../ml-sys/numbers';
  import { FSDP_PACK_TOKEN_CAP, FSDP_PRODUCTION_MAX_TOKENS_PER_GPU, FSDP_PACK_DP_SIZE, FSDP_PACK_CP_SIZE, FSDP_PACK_RECORDS, FSDP_PACK_MEMBERS, FSDP_ACTOR_EXAMPLE } from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type MobileItem = { title: string; titleZh: string; body: string; bodyZh: string; tone: Tone; phase?: number };
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; mobileTitle: string; mobileTitleZh: string; mobileSubtitle: string; mobileSubtitleZh: string;
    mobileFoot: string; mobileFootZh: string; mobileLegend: string; mobileLegendZh: string; mobile: MobileItem[]; formulas: { en: string; zh: string }[];
    phases: number; desktopH: number; mobileH: number;
  };
  type PackingRecord = (typeof FSDP_PACK_RECORDS)[number];
  type Pack = {
    memberIds: string[]; tokens: string[]; cuSeqlens: number[]; responseLengths: number[]; advantages: number[];
  };
  const firstFitCount = (records: PackingRecord[], cap: number) => {
    const bins: number[] = [];
    for (const record of records) {
      const length = record.tokens.length;
      const index = bins.findIndex((bin) => bin + length <= cap);
      if (index < 0) bins.push(length);
      else bins[index] += length;
    }
    return bins.length;
  };
  const buildPackingScene = () => {
    const byId = new Map(FSDP_PACK_RECORDS.map((record) => [record.id, record]));
    const packs = FSDP_PACK_MEMBERS.map((memberIds): Pack => {
      const members = memberIds.map((id) => {
        const record = byId.get(id);
        if (!record) throw new Error(`Unknown packing record ${id}`);
        return record;
      });
      const cuSeqlens = [0];
      for (const record of members) cuSeqlens.push(cuSeqlens[cuSeqlens.length - 1] + record.tokens.length);
      return {
        memberIds: [...memberIds],
        tokens: members.flatMap((record) => record.tokens),
        cuSeqlens,
        responseLengths: members.map((record) => record.responseLength),
        advantages: members.flatMap((record) => Array.from({ length: record.responseLength }, () => record.reward)),
      };
    });
    const count = firstFitCount([...FSDP_PACK_RECORDS], FSDP_PACK_TOKEN_CAP);
    return { firstFitCount: count, dpMaxCount: count, packs, gradAccum: [packs.length] };
  };
  const packingScene = buildPackingScene();
  const rewardText = (reward: number) => `${reward > 0 ? '+' : ''}${reward.toFixed(4)}`;
  const actor = FSDP_ACTOR_EXAMPLE;
  const ratioText = (ratio: number) => ratio.toFixed(2);
  const boundText = (bound: number) => bound.toFixed(2);

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    phases: 3, desktopH: 500, mobileH: 560,
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
    phases: 5, desktopH: 500, mobileH: 620,
    caption: `FSDP2 shards every parameter tensor across the same 8 ranks. One rank per GPU leaves ${FSDP_SHARD_STATE_PER_GPU_GB} GB of saved training state each.`,
    captionZh: `FSDP2 把每个参数张量分给 8 个 rank。每卡一个 rank，训练状态共 ${FSDP_SHARD_STATE_PER_GPU_GB} GB。`,
    title: 'FSDP2 keeps one shard per rank', titleZh: 'FSDP2 让每个 rank 各留一个分片',
    subtitle: 'DTensor = logical tensor (whole table) + placement (split rule) + local shard (rank\'s part)',
    subtitleZh: 'DTensor = 逻辑张量（完整数值表）+ placement（拆分规则）+ 本地分片（rank 的部分）',
    foot: 'Equal shards are a teaching simplification; real tensors need not divide evenly.',
    footZh: '等分只是教学简化；真实张量不一定能等分。',
    mobileTitle: 'DTensor gives each rank a shard', mobileTitleZh: 'DTensor 让每个 rank 各留一片',
    mobileSubtitle: 'whole table + split rule + rank parts', mobileSubtitleZh: '完整数值表 + 拆分规则 + 各 rank 的部分',
    mobileFoot: 'Equal shards are a teaching simplification.', mobileFootZh: '等分只是教学简化。',
    mobileLegend: 'Orange = logical tensor · blue = local shards', mobileLegendZh: '橙 = 逻辑张量 · 蓝 = 本地分片',
    mobile: [
      { title: 'LOGICAL TENSOR W', titleZh: '逻辑张量 W', body: 'one parameter · all rows', bodyZh: '一个参数 · 所有行', tone: 'orange' },
      { title: 'PLACEMENT · SHARD(0)', titleZh: 'PLACEMENT · SHARD(0)', body: 'split dim 0 (rows) across 8 ranks', bodyZh: '把第 0 维（行）分给 8 个 rank', tone: 'plain' },
      { title: 'LOCAL SHARDS', titleZh: '本地分片', body: 'rank r keeps row r · one rank per GPU', bodyZh: 'rank r 留第 r 行 · 每卡一个 rank', tone: 'blue' },
      { title: 'ALL SAVED TABLES', titleZh: '所有保存的表', body: '1 + 1 + 6 = 8 GB per rank', bodyZh: '每个 rank：1 + 1 + 6 = 8 GB', tone: 'blue' },
    ],
    formulas: [
      { en: `Per rank: ${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${FSDP_DP_SIZE} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB`, zh: `每个 rank：${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${FSDP_DP_SIZE} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB` },
      { en: `${FSDP_DP_SIZE} copies: ${FSDP_FULL_CLUSTER_STATE_GB} GB → ${FSDP_DP_SIZE} shards: ${FSDP_SHARD_CLUSTER_STATE_GB} GB`, zh: `${FSDP_DP_SIZE} 份副本：${FSDP_FULL_CLUSTER_STATE_GB} GB → ${FSDP_DP_SIZE} 个分片：${FSDP_SHARD_CLUSTER_STATE_GB} GB` },
      { en: 'Later: gather parts into full values', zh: '后续：把部分拼成完整数值' },
      { en: 'Step 4 all-gather · Step 7 Replicate()', zh: '第 4 步 all-gather · 第 7 步 Replicate()' },
    ],
  }, {
    phases: 6, desktopH: 520, mobileH: 900,
    caption: 'One train call repeats each normalized reward over its response tokens. Constructed cap 4 makes two packs, each with total-token boundaries.',
    captionZh: '一次训练调用把归一化分数复制到回答 token。构造 cap 4 形成两包，并记下总 token 边界。',
    title: 'Dynamic packs keep total-token boundaries', titleZh: '动态打包记下总 token 边界',
    subtitle: 'pack = one micro-batch of whole records · cu_seqlens = their total-token boundaries',
    subtitleZh: 'pack = 由完整记录组成的一个小批次 · cu_seqlens = 记录的总 token 边界',
    foot: `Constructed DP${FSDP_PACK_DP_SIZE}/CP${FSDP_PACK_CP_SIZE} and cap ${FSDP_PACK_TOKEN_CAP}; shipped Qwen3-4B FSDP script: ${FSDP_PRODUCTION_MAX_TOKENS_PER_GPU.toLocaleString('en-US')} tokens per GPU.`,
    footZh: `构造 DP${FSDP_PACK_DP_SIZE}/CP${FSDP_PACK_CP_SIZE} 与 cap ${FSDP_PACK_TOKEN_CAP}；自带 Qwen3-4B FSDP 脚本：每 GPU ${FSDP_PRODUCTION_MAX_TOKENS_PER_GPU.toLocaleString('en-US')} token。`,
    mobileTitle: `Cap ${FSDP_PACK_TOKEN_CAP} makes two packs`, mobileTitleZh: `构造 cap ${FSDP_PACK_TOKEN_CAP} 形成两包`,
    mobileSubtitle: 'cu_seqlens marks total-token boundaries', mobileSubtitleZh: 'cu_seqlens 记录总 token 边界',
    mobileFoot: `Constructed cap ${FSDP_PACK_TOKEN_CAP}; production cap ${FSDP_PRODUCTION_MAX_TOKENS_PER_GPU.toLocaleString('en-US')}.`, mobileFootZh: `构造 cap ${FSDP_PACK_TOKEN_CAP}；生产配置 cap ${FSDP_PRODUCTION_MAX_TOKENS_PER_GPU.toLocaleString('en-US')}。`,
    mobileLegend: 'Blue = data · orange = train', mobileLegendZh: '蓝 = 数据 · 橙 = 训练',
    mobile: [
      { title: 'TRAIN → ADVANTAGES', titleZh: 'TRAIN → ADVANTAGES', body: 'rewards repeat per response token', bodyZh: '归一化分数按回答 token 重复', tone: 'orange', phase: 0 },
      { title: 'A, B, C · 2, 2, 4 TOKENS', titleZh: 'A、B、C · 2、2、4 个 token', body: 'response lengths 1, 1, 2', bodyZh: '回答长度 1、1、2', tone: 'blue', phase: 0 },
      { title: 'FIRST FIT · COUNT ONLY', titleZh: 'FIRST FIT · 只决定包数', body: 'A+B fills 4 · C needs another', bodyZh: 'A+B 凑满 4 · C 需要另一包', tone: 'orange', phase: 1 },
      { title: 'DP MAX · [2]', titleZh: 'DP MAX · [2]', body: 'one rank keeps the same count', bodyZh: '一个 rank，包数仍为 2', tone: 'orange', phase: 2 },
      { title: 'PACK_SEQUENCES · A+B | C', titleZh: 'PACK_SEQUENCES · A+B | C', body: 'balanced membership, not first-fit bins', bodyZh: '均衡分组成员，不是 first-fit 分桶', tone: 'orange', phase: 3 },
      { title: `PACK 1 · ${packingScene.packs[0].memberIds.join('+')}`, titleZh: `第 1 包 · ${packingScene.packs[0].memberIds.join('+')}`, body: `${packingScene.packs[0].tokens.join(' ')} · cu [${packingScene.packs[0].cuSeqlens.join(',')}]`, bodyZh: `${packingScene.packs[0].tokens.join(' ')} · cu [${packingScene.packs[0].cuSeqlens.join(',')}]`, tone: 'blue', phase: 4 },
      { title: `PACK 2 · ${packingScene.packs[1].memberIds.join('+')}`, titleZh: `第 2 包 · ${packingScene.packs[1].memberIds.join('+')}`, body: `${packingScene.packs[1].tokens.join(' ')} · cu [${packingScene.packs[1].cuSeqlens.join(',')}]`, bodyZh: `${packingScene.packs[1].tokens.join(' ')} · cu [${packingScene.packs[1].cuSeqlens.join(',')}]`, tone: 'blue', phase: 5 },
    ],
    formulas: [
      { en: `first fit = ${packingScene.firstFitCount} packs · DP MAX = ${packingScene.dpMaxCount}`, zh: `first fit = ${packingScene.firstFitCount} 包 · DP MAX = ${packingScene.dpMaxCount}` },
      { en: `grad_accum = [${packingScene.gradAccum.join(',')}] → optimizer after pack ${packingScene.gradAccum[0]}`, zh: `grad_accum = [${packingScene.gradAccum.join(',')}] → 第 ${packingScene.gradAccum[0]} 包后才更新` },
      { en: `u = ${rewardText(FSDP_PACK_RECORDS[0].reward)} from Ch. 6 Step 6`, zh: `u = ${rewardText(FSDP_PACK_RECORDS[0].reward)}，来自第 6 章第 6 步` },
    ],
  }, {
    phases: 8, desktopH: 500, mobileH: 1000,
    caption: 'Pack 1 forms a clipped actor loss. Pack 2 completes backward before one optimizer update.',
    captionZh: '第 1 包算出裁剪后的 actor loss。第 2 包完成 backward 后，才更新一次权重。',
    title: 'One actor update: packed answers → weight changes', titleZh: '一次 actor 更新：打包回答 → 权重变化',
    subtitle: 'actor loss = number that guides weight changes · mask 1 = include token',
    subtitleZh: 'actor loss = 指导权重变化的数值 · mask 1 = 计入 token',
    foot: 'DP1 packs · DP8 tables, not peak · constructed gaps · U unknown · entropy/KL=0 · offload_train.',
    footZh: 'DP1 打包 · DP8 参数表，非峰值 · 构造差值 · U 未知 · entropy/KL=0 · offload_train。',
    mobileTitle: 'Two packs, one optimizer update', mobileTitleZh: '两包数据，一次优化器更新',
    mobileSubtitle: 'actor loss guides weight changes', mobileSubtitleZh: 'actor loss 指导权重变化',
    mobileFoot: 'DP1 packs · DP8 tables · U unknown · constructed', mobileFootZh: 'DP1 打包 · DP8 参数表 · U 未知 · 构造例',
    mobileLegend: 'Blue = loss · orange = update/offload', mobileLegendZh: '蓝 = loss · 橙 = 更新/offload',
    mobile: [
      { title: `FORWARD · zero_grad → ${FSDP_FORWARD_RESIDENT_GB} GB + U`, titleZh: `FORWARD · zero_grad → ${FSDP_FORWARD_RESIDENT_GB} GB + U`, body: 'all-gather full layer U → release', bodyZh: 'all-gather 完整层 U → 释放', tone: 'blue', phase: 0 },
      { title: 'UNPACK · A[a1] · B[b1]', titleZh: '拆包 · A[a1] · B[b1]', body: 'cu [0,2,4] · mask 1 = count token', bodyZh: 'cu [0,2,4] · mask 1 = 计入 token', tone: 'blue', phase: 1 },
      { title: 'RATIO · chance now ÷ before', titleZh: 'RATIO · 当前概率 ÷ 旧概率', body: `A 1.40 B 0.70 · exp(+0.3365,−0.3567)`, bodyZh: `A 1.40 B 0.70 · exp(+0.3365,−0.3567)`, tone: 'blue', phase: 2 },
      { title: 'ADVANTAGE + CLIP', titleZh: 'ADVANTAGE + 裁剪', body: `+u: 1.40→1.28 · −u: 0.70→0.80`, bodyZh: `+u：1.40→1.28 · −u：0.70→0.80`, tone: 'blue', phase: 3 },
      { title: 'LOSS AFTER CLIP · MAX', titleZh: '裁剪后的 LOSS · 取大值', body: `A ${rewardText(actor.policyLosses[0][0])} · B ${rewardText(actor.policyLosses[1][0])}`, bodyZh: `A ${rewardText(actor.policyLosses[0][0])} · B ${rewardText(actor.policyLosses[1][0])}`, tone: 'blue', phase: 4 },
      { title: `MASKED MEAN · ${rewardText(actor.pgLoss)}`, titleZh: `MASKED MEAN · ${rewardText(actor.pgLoss)}`, body: `A ${rewardText(actor.maskedMeans[0])} + B ${rewardText(actor.maskedMeans[1])}`, bodyZh: `A ${rewardText(actor.maskedMeans[0])} + B ${rewardText(actor.maskedMeans[1])}`, tone: 'blue', phase: 5 },
      { title: 'BACKWARD · loss → weight changes', titleZh: 'BACKWARD · loss → 权重变化方向', body: 'P1→P2 · grad_accum=[2] → 1 update', bodyZh: 'P1→P2 · grad_accum=[2] → 更新 1 次', tone: 'orange', phase: 6 },
      { title: 'SLEEP · LATER UPDATE WEIGHTS', titleZh: 'SLEEP · 随后更新权重', body: 'model + optimizer to CPU · export later', bodyZh: '模型和优化器移到 CPU · 随后导出', tone: 'orange', phase: 7 },
    ],
    formulas: [
      { en: 'ratio = exp(log_probs − old_log_probs)', zh: 'ratio = exp(log_probs − old_log_probs)' },
      { en: `clip = [${boundText(actor.clipLow)}, ${boundText(actor.clipHigh)}] · u = ${rewardText(actor.advantages[0])}`, zh: `clip = [${boundText(actor.clipLow)}, ${boundText(actor.clipHigh)}] · u = ${rewardText(actor.advantages[0])}` },
      { en: `pg_loss = ${rewardText(actor.maskedMeans[0])} + ${rewardText(actor.maskedMeans[1])} = ${rewardText(actor.pgLoss)}`, zh: `pg_loss = ${rewardText(actor.maskedMeans[0])} + ${rewardText(actor.maskedMeans[1])} = ${rewardText(actor.pgLoss)}` },
      { en: 'optimizer.step → sleep → update_weights', zh: 'optimizer.step → sleep → update_weights' },
    ],
  }, {
    phases: 5, desktopH: 500, mobileH: 600,
    caption: 'Each rank scales loss by R/B. FP32 FSDP2 then averages the gradients to finish the global-batch mean.',
    captionZh: '每个 rank 先把 loss 乘以 R/B。FP32 FSDP2 再取平均，得到全批梯度均值。',
    title: 'Scale by R/B, then average gradients', titleZh: '先乘 R/B，再平均梯度',
    subtitle: 'FP32 reduce-scatter = average pre-scaled gradients, then keep one shard',
    subtitleZh: 'FP32 reduce-scatter = 平均预缩放梯度，再各留一个分片',
    foot: 'Pinned slime: loss = loss * dp_size / global_batch_size; FP32 FSDP2 defaults to AVG.',
    footZh: '固定版 slime：loss = loss * dp_size / global_batch_size；FP32 FSDP2 默认 AVG。',
    mobileTitle: 'Scale R/B, then average', mobileTitleZh: '先乘 R/B，再取平均',
    mobileSubtitle: 'FP32 AVG = average, then keep a shard', mobileSubtitleZh: 'FP32 AVG = 取平均，再留分片',
    mobileFoot: 'R = 8 ranks · B = global batch', mobileFootZh: 'R = 8 个 rank · B = 全批大小',
    mobileLegend: 'Orange = owned shard · blue = layer gradient', mobileLegendZh: '橙 = 拥有分片 · 蓝 = 本层梯度',
    mobile: [
      { title: 'LAYER GRADIENT · TEMPORARY', titleZh: '本层梯度 · 临时', body: 'from the pre-scaled loss', bodyZh: '由预缩放 loss 算出', tone: 'blue' },
      { title: 'REDUCE-SCATTER', titleZh: 'REDUCE-SCATTER', body: 'FP32 AVG, then split', bodyZh: 'FP32 取平均，再分片', tone: 'plain' },
      { title: 'OWNED GRADIENT · ONE SHARD', titleZh: '拥有的梯度 · 一个分片', body: 'this layer\'s averaged shard', bodyZh: '本层平均后的分片', tone: 'orange' },
      { title: 'OPTIMIZER · AFTER ALL LAYERS', titleZh: '优化器 · 所有层算完后', body: 'update the owned weight shard', bodyZh: '更新拥有的权重分片', tone: 'plain' },
    ],
    formulas: [
      { en: 'loss × dp_size ÷ global_batch_size', zh: 'loss × dp_size ÷ global_batch_size' },
      { en: 'AVG = (rank sum) ÷ R', zh: 'AVG =（各 rank 之和）÷ R' },
      { en: 'R/B scale + AVG = batch mean', zh: 'R/B 预缩放 + AVG = 全批均值' },
      { en: 'all layers\' gradients: 8 GB ÷ 8 = 1 GB per rank', zh: '所有层的梯度：8 GB ÷ 8 = 每个 rank 1 GB' },
    ],
  }, {
    phases: 3, desktopH: 500, mobileH: 560,
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
    mobileLegend: 'Orange = bill · blue = layer · grey = intermediates', mobileLegendZh: '橙 = 训练账 · 蓝 = 完整层 · 灰 = 中间结果',
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
    phases: 4, desktopH: 520, mobileH: 600,
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
  let reduceMotion = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => (phone = query.matches);
    const updateMotion = () => (reduceMotion = motion.matches);
    update();
    updateMotion();
    query.addEventListener('change', update);
    motion.addEventListener('change', updateMotion);
    return () => {
      query.removeEventListener('change', update);
      motion.removeEventListener('change', updateMotion);
    };
  });
  const PHASE_COUNTS = steps.map((item) => item.phases);
  const PHASE_MS = 1000, REST_MS = 2800;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    phase = 0;
    if (reduceMotion) { phase = count - 1; return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.length = 0;
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? cur.mobileH : cur.desktopH);
</script>

<figure class="viz" class:dtensor-step={step === 1} data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if !reduceMotion}<LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} />{/if}
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
          <g opacity={phase >= (item.phase ?? Math.min(i, PHASE_COUNTS[step] - 2)) ? 1 : 0}>
            <rect x="25" y={y} width="250" height="70" rx="11" fill={fill(item.tone)} stroke={stroke(item.tone)} />
            <text x="150" y={y + 25} text-anchor="middle" class="small strong">{t(item.title, item.titleZh)}</text>
            <text x="150" y={y + 50} text-anchor="middle" class="small">{t(item.body, item.bodyZh)}</text>
            {#if i < cur.mobile.length - 1 && step !== 5}
              <line x1="150" y1={y + 70} x2="150" y2={y + 86} stroke={step >= 2 ? 'var(--line)' : stroke(item.tone)} stroke-width="2.5" marker-end={step >= 2 ? 'url(#fsdp-arrow-plain)' : item.tone === 'orange' ? 'url(#fsdp-arrow-orange)' : 'url(#fsdp-arrow-blue)'} />
            {/if}
          </g>
        {/each}
        <g opacity={phase >= PHASE_COUNTS[step] - 1 ? 1 : 0}>
          {#each cur.formulas as line, i}
            <text x="150" y={80 + cur.mobile.length * 91 + 12 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'} style={step === 4 && i === 3 ? 'font-size: 11px' : undefined}>{t(line.en, line.zh)}</text>
          {/each}
          <text x="150" y={80 + cur.mobile.length * 91 + 12 + cur.formulas.length * 27} text-anchor="middle" class="small">{t(cur.mobileLegend, cur.mobileLegendZh)}</text>
        </g>
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
        <g opacity={phase >= 1 ? 1 : 0}>
          <rect x="375" y="88" width="310" height="252" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="530" y="120" text-anchor="middle" class="section">{t('8 GPUS · SAME COPIES', '8 张 GPU · 相同副本')}</text>
          {#each Array.from({ length: FSDP_DP_SIZE }, (_, i) => i) as i}
            <rect x={393 + (i % 4) * 70} y={140 + Math.floor(i / 4) * 72} width="60" height="56" rx="8" fill="var(--bg)" stroke="var(--accent)" />
            <text x={423 + (i % 4) * 70} y={163 + Math.floor(i / 4) * 72} text-anchor="middle" class="small">GPU {i}</text>
            <text x={423 + (i % 4) * 70} y={184 + Math.floor(i / 4) * 72} text-anchor="middle" class="small strong">{FSDP_FULL_STATE_PER_GPU_GB} GB</text>
          {/each}
          <text x="530" y="318" text-anchor="middle" class="big">{FSDP_FULL_CLUSTER_STATE_GB} GB</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0}>
          <text x="360" y="382" text-anchor="middle" class="result">{FSDP_EXAMPLE_PARAMS_B}B values × 16 bytes = {FSDP_FULL_STATE_PER_GPU_GB} GB {t('per GPU', '每张 GPU')}</text>
          <text x="360" y="416" text-anchor="middle" class="result">{FSDP_FULL_STATE_PER_GPU_GB} GB × {FSDP_DP_SIZE} = {FSDP_FULL_CLUSTER_STATE_GB} GB</text>
          <text x="360" y="452" text-anchor="middle" class="small">{t('Orange = saved training tables · blue = repeated full copies', '橙 = 训练保存的表 · 蓝 = 重复的完整副本')}</text>
        </g>
      {:else if step === 1}
        <rect x="30" y="88" width="260" height="248" rx="13" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="160" y="118" text-anchor="middle" class="section">{t('LOGICAL TENSOR W', '逻辑张量 W')}</text>
        <text x="160" y="144" text-anchor="middle" class="small">{t('one parameter · all rows', '一个参数 · 所有行')}</text>
        {#each Array.from({ length: FSDP_DP_SIZE }, (_, i) => i) as i}
          <text x="55" y={167 + i * 20} text-anchor="middle" class="small">{i}</text>
          <rect x="70" y={154 + i * 20} width="180" height="14" rx="3" fill="var(--bg)" stroke="var(--gen)" />
        {/each}
        <g opacity={phase >= 1 ? 1 : 0}>
          <text x="360" y="151" text-anchor="middle" class="result">Shard(0)</text>
          <text x="360" y="177" text-anchor="middle" class="small strong">placement</text>
          <text x="360" y="202" text-anchor="middle" class="small">{t('split dim 0 = rows', '拆分第 0 维 = 行')}</text>
          <text x="360" y="225" text-anchor="middle" class="small">{t('across 8 ranks', '分给 8 个 rank')}</text>
          <line x1="305" y1="254" x2="415" y2="254" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fsdp-arrow-plain)" />
        </g>
        <g opacity={phase >= 2 ? 1 : 0}>
          <rect x="430" y="88" width="260" height="248" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="560" y="118" text-anchor="middle" class="section">{t('LOCAL SHARDS', '本地分片')}</text>
          <text x="560" y="144" text-anchor="middle" class="small">{t('one local shard per rank', '每个 rank 一个本地分片')}</text>
          {#each Array.from({ length: FSDP_DP_SIZE }, (_, i) => i) as i}
            <text x="452" y={167 + i * 20} class="small">rank {i}</text>
            <rect x="510" y={154 + i * 20} width="130" height="14" rx="3" fill="var(--bg)" stroke="var(--accent)" />
            <text x="575" y={166 + i * 20} text-anchor="middle" class="small">{t('row', '行')} {i}</text>
          {/each}
          <text x="560" y="326" text-anchor="middle" class="small">{t('rank r keeps row r · GPU r', 'rank r 留第 r 行 · 第 r 张 GPU')}</text>
        </g>
        <g opacity={phase >= 3 ? 1 : 0}>
          <text x="35" y="348" class="small strong">{t('ALL SAVED TABLES · 250 PX = 512 GB', '所有保存的表 · 250 PX = 512 GB')}</text>
          <rect x="35" y="361" width="250" height="20" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="300" y="376" class="small">{FSDP_DP_SIZE} {t('copies', '份')} · {FSDP_FULL_CLUSTER_STATE_GB} GB</text>
          <rect x="35" y="392" width={250 * FSDP_SHARD_CLUSTER_STATE_GB / FSDP_FULL_CLUSTER_STATE_GB} height="20" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="82" y="407" class="small">{FSDP_DP_SIZE} {t('shards', '片')} · {FSDP_SHARD_CLUSTER_STATE_GB} GB</text>
          <text x="550" y="374" text-anchor="middle" class="result">{t(`${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${FSDP_DP_SIZE} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB per rank`, `每个 rank：${FSDP_FULL_STATE_PER_GPU_GB} GB ÷ ${FSDP_DP_SIZE} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB`)}</text>
          <text x="550" y="404" text-anchor="middle" class="result">{t(`${FSDP_SHARD_WEIGHT_GB} + ${FSDP_SHARD_GRADIENT_GB} + ${FSDP_SHARD_OPTIMIZER_GB} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB saved state`, `权重 ${FSDP_SHARD_WEIGHT_GB} + 梯度 ${FSDP_SHARD_GRADIENT_GB} + 优化器 ${FSDP_SHARD_OPTIMIZER_GB} = ${FSDP_SHARD_STATE_PER_GPU_GB} GB`)}</text>
        </g>
        <g opacity={phase >= 4 ? 1 : 0}>
          <rect x="30" y="425" width="660" height="52" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="360" y="446" text-anchor="middle" class="small strong">{t('Later steps gather the parts back when full values are needed.', '后续步骤需要完整数值时，会把这些部分拼回去。')}</text>
          <text x="360" y="467" text-anchor="middle" class="small strong">{t('Step 4 all-gather → full layer · Step 7 Replicate() → full tensor', '第 4 步 all-gather → 完整一层 · 第 7 步 Replicate() → 完整张量')}</text>
        </g>
      {:else if step === 2}
        <text x="36" y="75" class="small">{t("train = one awaited call · process_rollout_data selects this rank's records", 'train = 一次等待完成的调用 · process_rollout_data 选出这个 rank 的记录')}</text>
        <text x="36" y="96" class="small">{t('normalized rewards repeat by response_lengths → advantages', '归一化 rewards 按 response_lengths 重复 → advantages')}</text>
        {#each FSDP_PACK_RECORDS as record, i}
          <g>
            <rect x={25 + i * 235} y="110" width="210" height="78" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={130 + i * 235} y="132" text-anchor="middle" class="small strong">{record.id} · {record.tokens.length} TOKENS</text>
            <text x={130 + i * 235} y="154" text-anchor="middle" class="small">{record.tokens.join(' ')} · {t('response', '回答')} {record.responseLength}</text>
            <text x={130 + i * 235} y="176" text-anchor="middle" class="small">advantage [{Array.from({ length: record.responseLength }, () => rewardText(record.reward)).join(', ')}]</text>
          </g>
        {/each}
        <g opacity={phase >= 1 ? 1 : 0}>
          <rect x="30" y="205" width="315" height="75" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="187" y="228" text-anchor="middle" class="small strong">{t('FIRST FIT · COUNT ONLY', 'FIRST FIT · 只决定包数')}</text>
          <text x="187" y="250" text-anchor="middle" class="small">A+B = 4 · C {t('needs another bin', '需要另一桶')}</text>
          <text x="187" y="270" text-anchor="middle" class="result">count = {packingScene.firstFitCount}</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0}>
          <rect x="375" y="205" width="315" height="75" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="532" y="228" text-anchor="middle" class="small strong">DP MAX</text>
          <text x="532" y="250" text-anchor="middle" class="small">{t('one rank keeps the same count', '一个 rank，包数不变')}</text>
          <text x="532" y="270" text-anchor="middle" class="result">MAX([{packingScene.firstFitCount}]) = [{packingScene.dpMaxCount}]</text>
        </g>
        <g opacity={phase >= 3 ? 1 : 0}>
          <rect x="30" y="298" width="660" height="62" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="323" text-anchor="middle" class="small strong">pack_sequences(num_packs={packingScene.dpMaxCount})</text>
          <text x="360" y="348" text-anchor="middle" class="small">{t('balanced members: A+B | C · first fit did not choose them', '均衡成员：A+B | C · 不是 first fit 决定的成员')}</text>
        </g>
        {#each packingScene.packs as pack, i}
          <g opacity={phase >= 4 + i ? 1 : 0}>
            <rect x={30 + i * 350} y="380" width={i === 0 ? 320 : 310} height="96" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={190 + i * 350} y="403" text-anchor="middle" class="small strong">PACK {i + 1} · {pack.memberIds.join('+')}</text>
            <text x={190 + i * 350} y="425" text-anchor="middle" class="small">flat_tokens → tokens</text>
            <text x={190 + i * 350} y="447" text-anchor="middle" class="small">[{pack.tokens.join(', ')}]</text>
            <text x={190 + i * 350} y="469" text-anchor="middle" class="result">cu_seqlens = [{pack.cuSeqlens.join(', ')}]</text>
          </g>
        {/each}
        <text x="360" y="493" text-anchor="middle" class="result" opacity={phase >= 5 ? 1 : 0}>grad_accum = [{packingScene.gradAccum.join(', ')}] → {t('one optimizer step after pack 2', '第 2 包后只有一次优化器更新')}</text>
      {:else if step === 3}
        {#each [
          { title: 'FORWARD · zero_grad clears old gradient · all-gather rebuilds full layer U', titleZh: 'FORWARD · zero_grad 清旧梯度 · all-gather 拼出完整层 U', a: `DP8: ${FSDP_FORWARD_RESIDENT_GB} GB + U during compute`, aZh: `DP8：计算时 ${FSDP_FORWARD_RESIDENT_GB} GB + U`, b: `release U → ${FSDP_FORWARD_RESIDENT_GB} GB · old scoring + current training`, bZh: `释放 U → ${FSDP_FORWARD_RESIDENT_GB} GB · 旧评分 + 当前训练`, tone: 'blue' },
          { title: 'UNPACK · cu_seqlens = [0,2,4]', titleZh: '拆包 · cu_seqlens = [0,2,4]', a: 'A response[a1] · mask[1]', aZh: 'A 回答[a1] · mask[1]', b: 'B response[b1] · mask[1]', bZh: 'B 回答[b1] · mask[1]', tone: 'blue' },
          { title: 'RATIO = current chance ÷ old chance = exp(log_probs − old_log_probs)', titleZh: 'RATIO = 当前概率 ÷ 旧概率 = exp(log_probs − old_log_probs)', a: `A exp(${rewardText(actor.logGaps[0])}) = ${ratioText(actor.ratios[0])}`, aZh: `A exp(${rewardText(actor.logGaps[0])}) = ${ratioText(actor.ratios[0])}`, b: `B exp(${rewardText(actor.logGaps[1])}) = ${ratioText(actor.ratios[1])}`, bZh: `B exp(${rewardText(actor.logGaps[1])}) = ${ratioText(actor.ratios[1])}`, tone: 'blue' },
          { title: `ADVANTAGE + CLIP [${boundText(actor.clipLow)}, ${boundText(actor.clipHigh)}]`, titleZh: `ADVANTAGE + 裁剪 [${boundText(actor.clipLow)}, ${boundText(actor.clipHigh)}]`, a: `A ${rewardText(actor.advantages[0])} · 1.40 → 1.28`, aZh: `A ${rewardText(actor.advantages[0])} · 1.40 → 1.28`, b: `B ${rewardText(actor.advantages[1])} · 0.70 → 0.80`, bZh: `B ${rewardText(actor.advantages[1])} · 0.70 → 0.80`, tone: 'blue' },
          { title: 'LOSS AFTER CLIP = max(−r·adv, −clip(r)·adv)', titleZh: '裁剪后的 LOSS = max(−r·adv, −clip(r)·adv)', a: `A max(${rewardText(actor.unclippedLosses[0][0])}, ${rewardText(actor.clippedLosses[0][0])}) = ${rewardText(actor.policyLosses[0][0])}`, aZh: `A max(${rewardText(actor.unclippedLosses[0][0])}, ${rewardText(actor.clippedLosses[0][0])}) = ${rewardText(actor.policyLosses[0][0])}`, b: `B max(${rewardText(actor.unclippedLosses[1][0])}, ${rewardText(actor.clippedLosses[1][0])}) = ${rewardText(actor.policyLosses[1][0])}`, bZh: `B max(${rewardText(actor.unclippedLosses[1][0])}, ${rewardText(actor.clippedLosses[1][0])}) = ${rewardText(actor.policyLosses[1][0])}`, tone: 'blue' },
          { title: 'MASKED MEAN · sum the per-record means', titleZh: 'MASKED MEAN · 每条记录取均值，再求和', a: `A ${rewardText(actor.maskedMeans[0])} × 1 ÷ 1`, aZh: `A ${rewardText(actor.maskedMeans[0])} × 1 ÷ 1`, b: `B ${rewardText(actor.maskedMeans[1])} × 1 ÷ 1 · Σ = ${rewardText(actor.pgLoss)}`, bZh: `B ${rewardText(actor.maskedMeans[1])} × 1 ÷ 1 · Σ = ${rewardText(actor.pgLoss)}`, tone: 'blue' },
          { title: 'BACKWARD = loss → weight-change directions · Pack 1 → Pack 2', titleZh: 'BACKWARD = loss → 权重变化方向 · 第 1 包 → 第 2 包', a: 'grad_accum = [2]', aZh: 'grad_accum = [2]', b: 'then one optimizer.step()', bZh: '然后一次 optimizer.step()', tone: 'orange' },
          { title: 'SLEEP · train returns → offload', titleZh: 'SLEEP · train 返回 → offload', a: 'model + optimizer GPU → CPU', aZh: '模型和优化器 GPU → CPU', b: 'later update_weights → Ch. 7', bZh: '随后 update_weights → 第 7 章', tone: 'orange' },
        ] as node, i}
          <g opacity={phase >= i ? 1 : 0}>
            <rect x="35" y={74 + i * 48} width="650" height="42" rx="10" fill={fill(node.tone)} stroke={stroke(node.tone)} />
            <text x="52" y={89 + i * 48} class="small strong">{t(node.title, node.titleZh)}</text>
            <text x="52" y={107 + i * 48} class="small">{t(node.a, node.aZh)}</text>
            <text x="668" y={107 + i * 48} text-anchor="end" class="small">{t(node.b, node.bZh)}</text>
          </g>
        {/each}
        <text x="360" y="472" text-anchor="middle" class="small" opacity={phase >= 7 ? 1 : 0}>{t('Blue = token values and loss · orange = weight update and offload', '蓝 = token 数值和 loss · 橙 = 权重更新和 offload')}</text>
      {:else if step === 4}
        {#each [
          { x: 40, title: 'LAYER GRADIENT', titleZh: '本层梯度', result: 'temporary', resultZh: '临时', body: 'after forward', bodyZh: '前向之后算出', tone: 'blue' },
          { x: 275, title: 'REDUCE-SCATTER', titleZh: 'REDUCE-SCATTER', result: 'AVG + split', resultZh: '平均 + 分片', body: 'FP32 default', bodyZh: 'FP32 默认', tone: 'plain' },
          { x: 510, title: 'OWNED GRADIENT', titleZh: '拥有的梯度', result: 'one shard', resultZh: '一个分片', body: 'this layer\'s shard', bodyZh: '本层的分片', tone: 'orange' },
        ] as node, i}
          <g opacity={phase >= (i === 0 ? 0 : i === 1 ? 2 : 3) ? 1 : 0}>
            <rect x={node.x} y="95" width="170" height="157" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} />
            <text x={node.x + 85} y="129" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x={node.x + 85} y="174" text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
            <text x={node.x + 85} y="217" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if i < 2}<line x1={node.x + 170} y1="174" x2={node.x + 225} y2="174" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fsdp-arrow-plain)" opacity={phase >= (i === 0 ? 2 : 3) ? 1 : 0} />{/if}
          </g>
        {/each}
        <g opacity={phase >= 4 ? 1 : 0}>
          <line x1="595" y1="252" x2="595" y2="292" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fsdp-arrow-plain)" />
          <rect x="485" y="302" width="220" height="79" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="595" y="332" text-anchor="middle" class="section">{t('OPTIMIZER', '优化器')}</text>
          <text x="595" y="361" text-anchor="middle" class="small">{t('after all layers: update owned weights', '所有层算完后：更新拥有的权重')}</text>
        </g>
        <g opacity={phase >= 1 ? 1 : 0}>
          <rect x="35" y="292" width="365" height="124" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="217" y="320" text-anchor="middle" class="small strong">{t('PRE-SCALE EACH RANK\'S LOSS', '先缩放每个 rank 的 LOSS')}</text>
          <text x="217" y="350" text-anchor="middle" class="small">{t('loss = loss * dp_size / global_batch_size', 'loss = loss * dp_size / global_batch_size')}</text>
          <text x="217" y="380" text-anchor="middle" class="small">{t('R = 8 ranks · B = global batch · AVG = sum ÷ R', 'R = 8 个 rank · B = 全批大小 · AVG = 求和 ÷ R')}</text>
        </g>
        <text x="217" y="406" text-anchor="middle" class="small" opacity={phase >= 4 ? 1 : 0}>{t('all layers\' gradients: 8 GB ÷ 8 = 1 GB per rank', '所有层的梯度：8 GB ÷ 8 = 每个 rank 1 GB')}</text>
        <text x="360" y="455" text-anchor="middle" class="small" opacity={phase >= 4 ? 1 : 0}>{t('Orange = owned shard · blue = temporary layer gradient', '橙 = 拥有分片 · 蓝 = 临时的本层梯度')}</text>
      {:else if step === 5}
        <g opacity={phase >= 2 ? 1 : 0}>
          <rect x="70" y="88" width="300" height="79" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="220" y="119" text-anchor="middle" class="result">{t('training intermediates', '训练中间结果')}</text>
          <text x="220" y="148" text-anchor="middle" class="small">{t('+ other temporary results · size unknown', '+ 其他临时结果 · 大小未知')}</text>
          <text x="420" y="125" class="small">{t('intermediates = values made during training', '中间结果 = 训练时算出的值')}</text>
          <text x="420" y="286" class="small">{t('? = no exact total in the source', '? = 来源没有精确总量')}</text>
        </g>
        <g opacity={phase >= 1 ? 1 : 0}>
          <rect x="70" y="177" width="300" height="79" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="220" y="208" text-anchor="middle" class="result">{t('largest borrowed layer', '最大临时完整层')}</text>
          <text x="220" y="237" text-anchor="middle" class="small">{t('temporary, size unknown', '临时占用，大小未知')}</text>
          <text x="420" y="199" class="small">{t('the biggest layer borrowed at once', '同一时刻借来的最大一层')}</text>
        </g>
        <rect x="70" y="266" width="300" height="89" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="220" y="302" text-anchor="middle" class="big">{FSDP_SHARD_STATE_PER_GPU_GB} GB</text>
        <text x="220" y="334" text-anchor="middle" class="small">{t('weights + gradients + optimizer state', '权重 + 梯度 + 优化器状态')}</text>
        <text x="420" y="322" class="small">{FSDP_SHARD_STATE_PER_GPU_GB} GB {t('is the training-state bill,', '是完整训练状态账，')}</text>
        <text x="420" y="346" class="small">{t('not a permanent forward floor.', '不是 forward 的永久常驻量。')}</text>
        <g opacity={phase >= 2 ? 1 : 0}>
          <text x="360" y="411" text-anchor="middle" class="result">{t('PEAK', '峰值')} &gt; {FSDP_SHARD_STATE_PER_GPU_GB} GB · {t('exact total unknown', '精确总量未知')}</text>
          <text x="360" y="458" text-anchor="middle" class="small">{t('Orange = training-state bill · blue = borrowed layer · grey = intermediates + other', '橙 = 训练状态账 · 蓝 = 临时完整层 · 灰 = 中间结果和其他临时显存')}</text>
        </g>
      {:else if step === 6}
        {#each [
          { x: 25, title: 'WEIGHT SHARDS', titleZh: '权重分片', result: 'weights only', resultZh: '仅权重', body: 'grad + opt stay', bodyZh: '梯度和优化器留下', tone: 'orange' },
          { x: 205, title: 'REPLICATE()', titleZh: 'REPLICATE()', result: 'full tensor', resultZh: '完整张量', body: 'one parameter', bodyZh: '一个参数', tone: 'plain' },
          { x: 385, title: 'BUCKET', titleZh: '一桶', result: 'full tensors', resultZh: '完整张量', body: 'wait + send', bodyZh: '等待并发送', tone: 'blue' },
          { x: 565, title: 'ROLLOUT', titleZh: 'ROLLOUT', result: 'v1', resultZh: 'v1', body: 'Ch. 7 Step 5 · handoff', bodyZh: '第 7 章第 5 步交接', tone: 'plain' },
        ] as node, i}
          <g opacity={phase >= i ? 1 : 0}>
            <rect x={node.x} y="95" width="130" height="151" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.tone === 'plain' ? '5 4' : '0'} />
            <text x={node.x + 65} y="127" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x={node.x + 65} y="170" text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
            <text x={node.x + 65} y="212" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if i < 3}
              <line x1={node.x + 130} y1="171" x2={node.x + 170} y2="171" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fsdp-arrow-plain)" opacity={phase > i ? 1 : 0} />
            {/if}
          </g>
        {/each}
        <rect x="35" y="294" width="305" height="100" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" stroke-dasharray="5 4" />
        <text x="187" y="326" text-anchor="middle" class="section">{t('STAYS IN TRAINING', '留在训练端')}</text>
        <text x="187" y="362" text-anchor="middle" class="small">{t('gradients + optimizer state', '梯度 + 优化器状态')}</text>
        <g opacity={phase >= 3 ? 1 : 0}>
          <rect x="380" y="294" width="305" height="100" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="532" y="316" text-anchor="middle" class="small strong">{t('NEXT · FEWER BITS', '下一章 · 更少位')}</text>
          <text x="532" y="340" text-anchor="middle" class="small">{t('weights + gradients: 16 bits = 2 bytes', '权重 + 梯度：16 位 = 2 字节')}</text>
          <text x="532" y="363" text-anchor="middle" class="small">{t('optimizer tables: 32 bits = 4 bytes · 2×', '优化器表：32 位 = 4 字节 · 2 倍')}</text>
          <text x="532" y="386" text-anchor="middle" class="small strong">{t('Which tables can use fewer bits?', '哪些表能用更少位？')}</text>
          <text x="360" y="441" text-anchor="middle" class="small">{t('Orange = training state · blue = temporary full weights for export', '橙 = 训练状态 · 蓝 = 导出的临时完整权重')}</text>
          <text x="360" y="478" text-anchor="middle" class="small">{t('Ch. 7 Step 5 shows one-bucket handoffs; Step 6 shows whole-version waits and old-KV rejection.', '第 7 章第 5 步讲按桶交接，第 6 步讲整版等待和旧 KV 失效。')}</text>
        </g>
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
  @media (min-width: 601px) {
    .dtensor-step :global(.tag), .dtensor-step :global(.footnote) { font-size: 13px; }
  }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .result { font-size: 12px; }
    .big { font-size: 22px; }
  }
</style>
