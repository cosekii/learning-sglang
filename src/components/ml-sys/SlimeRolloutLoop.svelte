<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { SLIME_ROLLOUT_BATCH_SIZE, SLIME_SAMPLES_PER_PROMPT, SLIME_SAMPLES_PER_ROUND, SLIME_GLOBAL_BATCH_SIZE, SLIME_EXAMPLE_RAW_REWARDS, SLIME_EXAMPLE_REWARD_MEAN, SLIME_EXAMPLE_CENTERED_REWARDS, SLIME_EXAMPLE_REWARD_STD, SLIME_GRPO_STD_EPSILON, SLIME_EXAMPLE_NORMALIZED_REWARDS } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const signed = (value: number, digits = 1) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
  const copies = Array.from({ length: SLIME_SAMPLES_PER_PROMPT }, (_, i) => i);
  const steps = [{
    caption: `One round generates ${SLIME_SAMPLES_PER_ROUND} answers before training. The config asks for ${SLIME_SAMPLES_PER_PROMPT} answers to each of ${SLIME_ROLLOUT_BATCH_SIZE} questions.`,
    captionZh: `一轮先生成 ${SLIME_SAMPLES_PER_ROUND} 个回答，再训练。配置让 ${SLIME_ROLLOUT_BATCH_SIZE} 道题各写 ${SLIME_SAMPLES_PER_PROMPT} 个回答。`,
  }, {
    caption: `A prompt is the question text sent to the model. The data source makes ${SLIME_SAMPLES_PER_PROMPT} copies of each prompt.`,
    captionZh: `prompt 是交给模型的问题。数据源把每个 prompt 复制 ${SLIME_SAMPLES_PER_PROMPT} 份。`,
  }, {
    caption: 'Rollout uses the current weights to write answers. Each answer becomes a record with token IDs and its length.',
    captionZh: 'Rollout 用当前权重写回答。每个回答都记下 token 和回答长度。',
  }, {
    caption: `A reward checks an answer against the expected answer. This constructed group has four 1s and four 0s.`,
    captionZh: 'Reward 按标准答案给回答打分。这组示例有 4 个 1 分和 4 个 0 分。',
  }, {
    caption: `GRPO first subtracts the prompt group's mean reward. These 1s and 0s become +0.5 and −0.5.`,
    captionZh: 'GRPO 先减去同组平均分。这里的 1 和 0 变成 +0.5 和 −0.5。',
  }, {
    caption: `The config also divides by the group's reward spread. The results are about +0.9354 and −0.9354.`,
    captionZh: '配置再除以同组分数的离散程度。结果约为 +0.9354 和 −0.9354。',
  }, {
    caption: `The controller flattens ${SLIME_ROLLOUT_BATCH_SIZE} groups into ${SLIME_SAMPLES_PER_ROUND} training records. One training call produces the next weights.`,
    captionZh: `控制器把 ${SLIME_ROLLOUT_BATCH_SIZE} 组展开成 ${SLIME_SAMPLES_PER_ROUND} 条训练数据。一次训练调用算出新权重。`,
  }, {
    caption: 'slime waits for the weight update before rollout 1. Rollout 1 then uses weights v1.',
    captionZh: 'slime 等权重更新完，再开始第 1 轮。第 1 轮的 SGLang 使用 v1。',
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
  const H = $derived(phone ? [650, 570, 690, 650, 620, 650, 710, 610][step] : [400, 400, 450, 410, 450, 460, 450, 410][step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="slime-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="slime-arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? '256 answers, then train' : 'One round writes 256 answers before training', '一轮先写 256 个回答，再开始训练')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'slime = an RL system · score, then train' : 'slime = the RL system · RL = use scores on generated answers to change weights', phone ? 'slime = RL 系统：先打分，再训练' : 'slime = RL 系统 · RL = 给回答打分，再据此修改模型权重')}</text>
        {#each [
          { title: 'WEIGHTS v0', titleZh: '权重 v0', body: 'current number tables', bodyZh: '当前的数字表', tone: 'plain' },
          { title: '256 ANSWERS', titleZh: '256 个回答', body: '32 questions × 8', bodyZh: '32 道题 × 8', tone: 'blue' },
          { title: 'SCORE EACH', titleZh: '逐个打分', body: 'one score / answer', bodyZh: '每个回答一个分数', tone: 'blue' },
          { title: 'TRAIN → v1', titleZh: '训练 → v1', body: 'new number tables', bodyZh: '新的数字表', tone: 'orange' },
        ] as node, i}
          {@const x = phone ? 25 : 15 + i * 180}
          {@const y = phone ? 76 + i * 128 : 96}
          {@const w = phone ? 250 : 150}
          {@const h = phone ? 96 : 142}
          <rect x={x} y={y} width={w} height={h} rx="12" fill={node.tone === 'blue' ? 'var(--accent-soft)' : node.tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)'} stroke={node.tone === 'blue' ? 'var(--accent)' : node.tone === 'orange' ? 'var(--gen)' : 'var(--line)'} />
          <text x={x + w / 2} y={y + (phone ? 27 : 38)} text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={x + w / 2} y={y + (phone ? 62 : 86)} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if !phone && i === 1}<text x={x + w / 2} y={y + 113} text-anchor="middle" class="result">= 256</text>{/if}
          {#if i < 3}
            {#if phone}
              <line x1="150" y1={y + h} x2="150" y2={y + h + 22} stroke={i === 2 ? 'var(--gen)' : 'var(--accent)'} stroke-width="3" marker-end={i === 2 ? 'url(#slime-arrow-orange)' : 'url(#slime-arrow-blue)'} />
            {:else}
              <line x1={x + w} y1={y + 71} x2={x + w + 20} y2={y + 71} stroke={i === 2 ? 'var(--gen)' : 'var(--accent)'} stroke-width="3" marker-end={i === 2 ? 'url(#slime-arrow-orange)' : 'url(#slime-arrow-blue)'} />
            {/if}
          {/if}
        {/each}
        {#if phone}
          <text x="150" y="580" text-anchor="middle" class="result">32 × 8 = 256 {t('answers', '个回答')}</text>
          <text x="150" y="606" text-anchor="middle" class="small">{t('blue = data · orange = training', '蓝 = 数据 · 橙 = 训练')}</text>
        {:else}
          <text x="360" y="290" text-anchor="middle" class="result">32 × 8 = 256 {t('answers before the training call', '个回答都准备好，才调用训练')}</text>
          <text x="360" y="326" text-anchor="middle" class="small">{t('blue = questions, answers and scores · orange = training', '蓝 = 问题、回答和分数 · 橙 = 训练')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Shipped Qwen3-4B config at slime 261ecee.', 'slime 261ecee 自带的 Qwen3-4B 配置。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Eight copies per prompt' : 'The data source makes groups of eight', phone ? '每道 prompt 复制 8 份' : '数据源把每道题复制成 8 份一组')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('prompt = question text sent to the model', 'prompt = 交给模型的问题文本')}</text>
        {#if !phone}
          <rect x="40" y="88" width="220" height="205" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="124" text-anchor="middle" class="section">PROMPT PICKER</text>
          <text x="150" y="169" text-anchor="middle" class="result">32 prompts</text>
          <text x="150" y="207" text-anchor="middle" class="small">{t('take 32 question cards', '取出 32 张问题卡')}</text>
          <text x="150" y="250" text-anchor="middle" class="code">get_samples(32)</text>
          <line x1="260" y1="190" x2="305" y2="190" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="315" y="88" width="365" height="205" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="497" y="120" text-anchor="middle" class="section">ONE GROUP · SAME PROMPT × 8</text>
          {#each copies as i}
            <rect x={335 + (i % 4) * 82} y={140 + Math.floor(i / 4) * 59} width="70" height="45" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={370 + (i % 4) * 82} y={168 + Math.floor(i / 4) * 59} text-anchor="middle" class="small">copy {i}</text>
          {/each}
          <text x="497" y="273" text-anchor="middle" class="small">{t('eight independent answer sheets', '8 张独立答题纸，问题相同')}</text>
        {:else}
          <rect x="20" y="76" width="260" height="121" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="107" text-anchor="middle" class="section">PROMPT PICKER</text>
          <text x="150" y="143" text-anchor="middle" class="result">32 prompts</text>
          <text x="150" y="175" text-anchor="middle" class="small">{t('take 32 question cards', '取出 32 张问题卡')}</text>
          <line x1="150" y1="197" x2="150" y2="228" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="20" y="238" width="260" height="210" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="268" text-anchor="middle" class="small strong">{t('ONE GROUP · SAME PROMPT × 8', '一组 · 同一 prompt × 8')}</text>
          {#each copies as i}
            <rect x={35 + (i % 4) * 60} y={286 + Math.floor(i / 4) * 58} width="50" height="43" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={60 + (i % 4) * 60} y={313 + Math.floor(i / 4) * 58} text-anchor="middle" class="small">{i}</text>
          {/each}
          <text x="150" y="425" text-anchor="middle" class="small">{t('8 answer sheets, same question', '8 张答题纸，问题相同')}</text>
        {/if}
        <text x={W / 2} y={phone ? 486 : 337} text-anchor="middle" class="result">32 groups × 8 copies = 256 {t('answer sheets', '张答题纸')}</text>
        <text x={W / 2} y={phone ? 516 : 365} text-anchor="middle" class="small">{t('The copies start identical; their answers come next.', '复制时内容相同；下一步才写不同回答。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">RolloutDataSource.get_samples · --n-samples-per-prompt 8</text>
      {:else if step === 2}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Rollout writes answer records' : 'Rollout turns copies into answer records', 'Rollout 把副本变成回答记录')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'rollout = current model writes answers' : 'rollout = the current model writes answers with SGLang', 'rollout = 当前模型用 SGLang 写回答')}</text>
        {#if !phone}
          <rect x="30" y="91" width="180" height="177" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="120" y="124" text-anchor="middle" class="section">1 PROMPT GROUP</text>
          <text x="120" y="165" text-anchor="middle" class="result">8 copies</text>
          <text x="120" y="203" text-anchor="middle" class="small">{t('same question text', '相同的问题文本')}</text>
          <text x="120" y="239" text-anchor="middle" class="small">{t('weights not changed here', '这里还没改权重')}</text>
          <line x1="210" y1="180" x2="255" y2="180" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="265" y="111" width="180" height="137" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="355" y="148" text-anchor="middle" class="section">SGLANG ROLLOUT</text>
          <text x="355" y="187" text-anchor="middle" class="result">weights v0</text>
          <text x="355" y="220" text-anchor="middle" class="small">{t('write 8 answers', '写出 8 个回答')}</text>
          <line x1="445" y1="180" x2="490" y2="180" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="500" y="76" width="180" height="207" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="590" y="106" text-anchor="middle" class="section">8 ANSWER RECORDS</text>
          {#each copies as i}
            <rect x={515 + (i % 2) * 80} y={121 + Math.floor(i / 2) * 37} width="70" height="28" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={550 + (i % 2) * 80} y={140 + Math.floor(i / 2) * 37} text-anchor="middle" class="small">{t('answer', '回答')} {i}</text>
          {/each}
          <rect x="40" y="309" width="640" height="75" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="360" y="338" text-anchor="middle" class="small strong">{t('ONE ANSWER RECORD · tokens = prompt token IDs + answer token IDs', '一份回答记录 · tokens = 问题 token + 回答 token')}</text>
          <text x="360" y="367" text-anchor="middle" class="code">response_length = {t('number of answer tokens', '回答 token 的数量')}</text>
        {:else}
          <rect x="35" y="75" width="230" height="91" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="106" text-anchor="middle" class="section">1 GROUP · 8 COPIES</text>
          <text x="150" y="140" text-anchor="middle" class="small">{t('same question · weights v0', '问题相同 · 权重 v0')}</text>
          <line x1="150" y1="166" x2="150" y2="199" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="35" y="209" width="230" height="91" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="241" text-anchor="middle" class="section">SGLANG ROLLOUT</text>
          <text x="150" y="275" text-anchor="middle" class="small">{t('write 8 different answers', '写出 8 份不同回答')}</text>
          <line x1="150" y1="300" x2="150" y2="333" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="35" y="343" width="230" height="126" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="373" text-anchor="middle" class="section">8 ANSWER RECORDS</text>
          {#each copies as i}
            <rect x={50 + (i % 4) * 52} y={390 + Math.floor(i / 4) * 34} width="43" height="26" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={71 + (i % 4) * 52} y={408 + Math.floor(i / 4) * 34} text-anchor="middle" class="small">A{i}</text>
          {/each}
          <rect x="20" y="494" width="260" height="124" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="524" text-anchor="middle" class="small strong">{t('ONE ANSWER RECORD', '一份回答记录')}</text>
          <text x="150" y="554" text-anchor="middle" class="small">tokens = prompt + answer</text>
          <text x="150" y="582" text-anchor="middle" class="small">response_length</text>
          <text x="150" y="606" text-anchor="middle" class="small">= {t('answer token count', '回答 token 数量')}</text>
        {/if}
        <text x={W / 2} y={phone ? 650 : 409} text-anchor="middle" class="result">32 × 8 = 256 {t('records', '份记录')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Each answer token keeps its generation score.' : 'The record also saves generation scores for each answer token.', '记录还保存每个回答 token 的生成分数。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Score each answer' : 'The reward gives every answer a raw score', phone ? '给每个回答打分' : 'Reward 给每个回答一个原始分数')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'reward = score from answer checking' : 'reward = score from checking the answer against the expected answer', 'reward = 对照标准答案后得到的分数')}</text>
        {#if !phone}
          <rect x="30" y="91" width="190" height="190" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="125" y="124" text-anchor="middle" class="section">ANSWER + LABEL</text>
          <text x="125" y="161" text-anchor="middle" class="small">{t('model answer', '模型回答')}</text>
          <text x="125" y="194" text-anchor="middle" class="small">+</text>
          <text x="125" y="229" text-anchor="middle" class="small">{t('expected answer', '标准答案')}</text>
          <text x="125" y="259" text-anchor="middle" class="code">label</text>
          <line x1="220" y1="186" x2="265" y2="186" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="275" y="116" width="170" height="140" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="153" text-anchor="middle" class="section">DEEPSCALER</text>
          <text x="360" y="190" text-anchor="middle" class="small">{t('check the math answer', '检查数学答案')}</text>
          <text x="360" y="225" text-anchor="middle" class="code">async_rm</text>
          <line x1="445" y1="186" x2="490" y2="186" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="500" y="76" width="180" height="220" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="590" y="106" text-anchor="middle" class="section">8 RAW REWARDS</text>
          {#each SLIME_EXAMPLE_RAW_REWARDS as reward, i}
            <rect x={515 + (i % 2) * 80} y={121 + Math.floor(i / 2) * 40} width="70" height="31" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={550 + (i % 2) * 80} y={142 + Math.floor(i / 2) * 40} text-anchor="middle" class="result">{reward}</text>
          {/each}
        {:else}
          <rect x="35" y="76" width="230" height="101" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="108" text-anchor="middle" class="section">ANSWER + LABEL</text>
          <text x="150" y="145" text-anchor="middle" class="small">{t('model answer + expected answer', '模型回答 + 标准答案')}</text>
          <line x1="150" y1="177" x2="150" y2="210" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="35" y="220" width="230" height="101" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="252" text-anchor="middle" class="section">DEEPSCALER</text>
          <text x="150" y="288" text-anchor="middle" class="small">{t('check the math answer', '检查数学答案')}</text>
          <line x1="150" y1="321" x2="150" y2="354" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="20" y="364" width="260" height="185" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="394" text-anchor="middle" class="section">8 RAW REWARDS</text>
          {#each SLIME_EXAMPLE_RAW_REWARDS as reward, i}
            <rect x={35 + (i % 4) * 60} y={411 + Math.floor(i / 4) * 54} width="50" height="40" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={60 + (i % 4) * 60} y={437 + Math.floor(i / 4) * 54} text-anchor="middle" class="result">{reward}</text>
          {/each}
        {/if}
        <text x={W / 2} y={phone ? 582 : 334} text-anchor="middle" class="small strong">1 = {t('verified match', '核对正确')} · 0 = {t('no verified match', '没有核对正确')}</text>
        <text x={W / 2} y={phone ? 610 : 363} text-anchor="middle" class="small">{t('blue = answer data · orange = answer checking', '蓝 = 回答数据 · 橙 = 检查回答')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed scores, not outputs from a training run.', '构造的分数，不是一次训练的真实输出。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 36} y="30" class="title">{t('GRPO starts with the group mean', 'GRPO 先算同组平均分')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'centered = raw reward − group mean' : 'GRPO = compare answers from the same prompt · centered = raw − mean', 'GRPO = 比较同题回答 · 居中分数 = 原始分 − 平均分')}</text>
        <text x={phone ? 20 : 50} y="82" class="small strong">{t('RAW REWARDS FROM STEP 4', '第 4 步的原始分数')}</text>
        {#each SLIME_EXAMPLE_RAW_REWARDS as reward, i}
          {@const x = phone ? 30 + (i % 4) * 65 : 50 + i * 80}
          {@const y = phone ? 94 + Math.floor(i / 4) * 58 : 96}
          <rect x={x} y={y} width={phone ? 55 : 60} height={phone ? 44 : 56} rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + (phone ? 27.5 : 30)} y={y + (phone ? 29 : 36)} text-anchor="middle" class="result">{reward}</text>
        {/each}
        {#if phone}
          <line x1="150" y1="220" x2="150" y2="275" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <text x="165" y="250" class="delta">− mean 0.5</text>
          <text x="20" y="316" class="small strong">{t('CENTERED REWARDS', '减去平均分后的分数')}</text>
        {:else}
          <line x1="360" y1="170" x2="360" y2="213" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <text x="378" y="197" class="delta">− mean 0.5</text>
          <text x="50" y="246" class="small strong">{t('CENTERED REWARDS', '减去平均分后的分数')}</text>
        {/if}
        {#each SLIME_EXAMPLE_CENTERED_REWARDS as reward, i}
          {@const x = phone ? 30 + (i % 4) * 65 : 50 + i * 80}
          {@const y = phone ? 328 + Math.floor(i / 4) * 58 : 258}
          <rect x={x} y={y} width={phone ? 55 : 60} height={phone ? 44 : 56} rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + (phone ? 27.5 : 30)} y={y + (phone ? 29 : 36)} text-anchor="middle" class="result">{signed(reward)}</text>
        {/each}
        {#if phone}
          <text x="150" y="474" text-anchor="middle" class="result">mean = 4 ÷ 8 = 0.5</text>
          <text x="150" y="505" text-anchor="middle" class="small">1 − 0.5 = +0.5</text>
          <text x="150" y="533" text-anchor="middle" class="small">0 − 0.5 = −0.5</text>
        {:else}
          <rect x="40" y="333" width="640" height="64" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="358" text-anchor="middle" class="result">mean = (1 + 1 + 1 + 1 + 0 + 0 + 0 + 0) ÷ 8 = 0.5</text>
          <text x="360" y="384" text-anchor="middle" class="result">centered = raw − 0.5</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(phone ? 'The raw rewards are kept too.' : 'This mean-centering stage keeps the original raw rewards too.', '这一步居中后，原始分数也仍然保留。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('The same eight constructed scores continue in Step 6.', '第 6 步继续使用同组 8 个构造分数。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Normalize by reward spread' : 'The config also normalizes by reward spread', '配置再按同组分数的离散程度归一化')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'std = score spread · ε = tiny division guard' : 'standard deviation (std) = score spread · ε = tiny guard against division by zero', phone ? 'std = 分数离散程度 · ε = 除法保护' : 'standard deviation (std) = 分数离散程度 · ε = 防止除以 0 的小数')}</text>
        <text x={phone ? 20 : 45} y="82" class="small strong">{t('CENTERED REWARDS FROM STEP 5', '第 5 步居中后的分数')}</text>
        {#each SLIME_EXAMPLE_CENTERED_REWARDS as reward, i}
          {@const x = phone ? 30 + (i % 4) * 65 : 45 + i * 80}
          {@const y = phone ? 94 + Math.floor(i / 4) * 58 : 96}
          <rect x={x} y={y} width={phone ? 55 : 65} height={phone ? 44 : 56} rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + (phone ? 27.5 : 32.5)} y={y + (phone ? 29 : 36)} text-anchor="middle" class="result">{signed(reward)}</text>
        {/each}
        {#if phone}
          <line x1="150" y1="220" x2="150" y2="275" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <text x="165" y="250" class="delta">÷ (std + ε)</text>
          <text x="20" y="316" class="small strong">{t('NORMALIZED REWARDS', '归一化后的分数')}</text>
        {:else}
          <line x1="360" y1="170" x2="360" y2="213" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <text x="378" y="197" class="delta">÷ (std + ε)</text>
          <text x="45" y="246" class="small strong">{t('NORMALIZED REWARDS', '归一化后的分数')}</text>
        {/if}
        {#each SLIME_EXAMPLE_NORMALIZED_REWARDS as reward, i}
          {@const x = phone ? 30 + (i % 4) * 65 : 45 + i * 80}
          {@const y = phone ? 328 + Math.floor(i / 4) * 58 : 258}
          <rect x={x} y={y} width={phone ? 55 : 65} height={phone ? 44 : 56} rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x + (phone ? 27.5 : 32.5)} y={y + (phone ? 29 : 36)} text-anchor="middle" class="small strong">{signed(reward, 4)}</text>
        {/each}
        {#if phone}
          <text x="150" y="474" text-anchor="middle" class="small">std = √[(4×0.5² + 4×(−0.5)²) ÷ 7]</text>
          <text x="150" y="503" text-anchor="middle" class="result">= {SLIME_EXAMPLE_REWARD_STD.toFixed(6)}</text>
          <text x="150" y="536" text-anchor="middle" class="small">0.5 ÷ ({SLIME_EXAMPLE_REWARD_STD.toFixed(6)} + 0.000001)</text>
          <text x="150" y="565" text-anchor="middle" class="result">= {SLIME_EXAMPLE_NORMALIZED_REWARDS[0].toFixed(4)}</text>
        {:else}
          <rect x="35" y="335" width="650" height="62" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="360" text-anchor="middle" class="small">std = √[(4×0.5² + 4×(−0.5)²) ÷ 7] = {SLIME_EXAMPLE_REWARD_STD.toFixed(6)}</text>
          <text x="360" y="385" text-anchor="middle" class="result">0.5 ÷ ({SLIME_EXAMPLE_REWARD_STD.toFixed(6)} + {SLIME_GRPO_STD_EPSILON.toFixed(6)}) = {SLIME_EXAMPLE_NORMALIZED_REWARDS[0].toFixed(4)}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">torch.std: 8 − 1 = 7 · ε = {SLIME_GRPO_STD_EPSILON.toFixed(6)}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Values are rounded to four decimals on the cards.', '卡片上的结果四舍五入到 4 位小数。')}</text>
      {:else if step === 6}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Pack 256 records for training' : 'Pack 256 records, then call training', '把 256 份记录打包，再调用训练')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'controller = packs answers for training' : 'RolloutController = converts answer records into training data', 'RolloutController = 把回答记录转成训练数据')}</text>
        {#if !phone}
          {#each [
            { x: 30, title: '32 GROUPS', titleZh: '32 组', body: '8 records each', bodyZh: '每组 8 份记录', tone: 'blue' },
            { x: 270, title: 'CONTROLLER', titleZh: '控制器', body: 'flatten + pack', bodyZh: '展开并打包', tone: 'orange' },
            { x: 510, title: 'TRAIN_DATA', titleZh: '训练数据', body: '256 records', bodyZh: '256 份记录', tone: 'blue' },
          ] as node, i}
            <rect x={node.x} y="88" width="180" height="139" rx="12" fill={node.tone === 'blue' ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={node.tone === 'blue' ? 'var(--accent)' : 'var(--gen)'} />
            <text x={node.x + 90} y="124" text-anchor="middle" class="section">{t(node.title, node.titleZh)}</text>
            <text x={node.x + 90} y="163" text-anchor="middle" class="result">{t(node.body, node.bodyZh)}</text>
            <text x={node.x + 90} y="199" text-anchor="middle" class="small">{i === 2 ? t('tokens · lengths · rewards', 'token · 长度 · 分数') : i === 1 ? '_convert_samples…' : '32 × 8 = 256'}</text>
            {#if i < 2}<line x1={node.x + 180} y1="157" x2={node.x + 230} y2="157" stroke={i === 0 ? 'var(--gen)' : 'var(--accent)'} stroke-width="3" marker-end={i === 0 ? 'url(#slime-arrow-orange)' : 'url(#slime-arrow-blue)'} />{/if}
          {/each}
          <text x="360" y="262" text-anchor="middle" class="result">256 records = global batch size {SLIME_GLOBAL_BATCH_SIZE}</text>
          <line x1="550" y1="227" x2="550" y2="280" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="150" y="291" width="420" height="101" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="326" text-anchor="middle" class="section">ACTOR_MODEL.ASYNC_TRAIN(0, DATA)</text>
          <text x="360" y="365" text-anchor="middle" class="result">weights v0 → weights v1</text>
        {:else}
          <rect x="35" y="75" width="230" height="81" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="106" text-anchor="middle" class="section">32 GROUPS × 8</text>
          <text x="150" y="137" text-anchor="middle" class="small">= 256 {t('answer records', '份回答记录')}</text>
          <line x1="150" y1="156" x2="150" y2="186" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="35" y="196" width="230" height="81" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="227" text-anchor="middle" class="section">CONTROLLER</text>
          <text x="150" y="258" text-anchor="middle" class="small">{t('flatten + pack', '展开并打包')}</text>
          <line x1="150" y1="277" x2="150" y2="307" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="35" y="317" width="230" height="111" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="348" text-anchor="middle" class="section">TRAIN_DATA · 256</text>
          <text x="150" y="379" text-anchor="middle" class="small">tokens · lengths · rewards</text>
          <text x="150" y="407" text-anchor="middle" class="small">global batch = {SLIME_GLOBAL_BATCH_SIZE}</text>
          <line x1="150" y1="428" x2="150" y2="458" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="20" y="468" width="260" height="131" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="500" text-anchor="middle" class="small strong">ACTOR_MODEL.ASYNC_TRAIN</text>
          <text x="150" y="532" text-anchor="middle" class="code">rollout 0 + train_data</text>
          <text x="150" y="572" text-anchor="middle" class="result">weights v0 → v1</text>
        {/if}
        <text x={W / 2} y={phone ? 635 : 420} text-anchor="middle" class="small">{t(phone ? 'blue = data · orange = train' : 'blue = training data · orange = conversion and training', '蓝 = 训练数据 · 橙 = 转换与训练')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('One call can process records in smaller batches.', '一次调用可以分成更小的批次处理。')}</text>
      {:else if step === 7}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Update weights before rollout 1' : 'Finish the weight update before rollout 1', '先完成权重更新，再开始第 1 轮')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'ray.get waits for the update to finish' : 'ray.get(actor_model.async_update_weights()) waits for completion', 'ray.get 会等 async_update_weights 完成')}</text>
        {#if !phone}
          <rect x="35" y="99" width="180" height="145" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="125" y="135" text-anchor="middle" class="section">TRAINING</text>
          <text x="125" y="177" text-anchor="middle" class="result">weights v1</text>
          <text x="125" y="213" text-anchor="middle" class="small">{t('just produced in Step 7', '第 7 步刚算出')}</text>
          <line x1="215" y1="171" x2="260" y2="171" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="270" y="99" width="180" height="145" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="135" text-anchor="middle" class="section">UPDATE WEIGHTS</text>
          <text x="360" y="177" text-anchor="middle" class="result">copy v1</text>
          <text x="360" y="213" text-anchor="middle" class="small">{t('wait until finished', '等到更新完成')}</text>
          <line x1="450" y1="171" x2="495" y2="171" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="505" y="99" width="180" height="145" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="595" y="135" text-anchor="middle" class="section">SGLANG ROLLOUT</text>
          <text x="595" y="177" text-anchor="middle" class="result">weights v1 ✓</text>
          <text x="595" y="213" text-anchor="middle" class="small">{t('ready for round 1', '可以开始第 1 轮')}</text>
          <line x1="595" y1="244" x2="595" y2="280" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="390" y="290" width="295" height="62" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="537" y="317" text-anchor="middle" class="small strong">ROLLOUT 1 · NEXT 32 GROUPS</text>
          <text x="537" y="340" text-anchor="middle" class="small">{t('generate with weights v1', '用 v1 生成新回答')}</text>
          <text x="55" y="316" class="small strong">{t('LOOP ORDER', '循环顺序')}</text>
          <text x="55" y="343" class="code">generate 0 → train 0 → update → generate 1</text>
        {:else}
          <rect x="35" y="75" width="230" height="86" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="106" text-anchor="middle" class="section">TRAINING · WEIGHTS v1</text>
          <text x="150" y="139" text-anchor="middle" class="small">{t('produced in Step 7', '第 7 步刚算出')}</text>
          <line x1="150" y1="161" x2="150" y2="191" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="35" y="201" width="230" height="86" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="232" text-anchor="middle" class="section">UPDATE WEIGHTS · COPY v1</text>
          <text x="150" y="265" text-anchor="middle" class="small">{t('wait until finished', '等到更新完成')}</text>
          <line x1="150" y1="287" x2="150" y2="317" stroke="var(--gen)" stroke-width="3" marker-end="url(#slime-arrow-orange)" />
          <rect x="35" y="327" width="230" height="86" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="358" text-anchor="middle" class="section">SGLANG · WEIGHTS v1 ✓</text>
          <text x="150" y="391" text-anchor="middle" class="small">{t('ready for round 1', '可以开始第 1 轮')}</text>
          <line x1="150" y1="413" x2="150" y2="443" stroke="var(--accent)" stroke-width="3" marker-end="url(#slime-arrow-blue)" />
          <rect x="35" y="453" width="230" height="86" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="484" text-anchor="middle" class="section">ROLLOUT 1 · NEXT GROUPS</text>
          <text x="150" y="517" text-anchor="middle" class="small">{t('generate with weights v1', '用 v1 生成新回答')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(phone ? 'Next: what carries v1 into SGLang?' : 'Next chapter: what carries weights v1 from training into the SGLang box?', phone ? '下一章：什么把 v1 送进 SGLang？' : '下一章：什么把权重 v1 从训练框送进 SGLang 框？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">train.py:56–75 · generate → train → update</text>
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
  .section { font-family: var(--mono); font-size: 15px; font-weight: 700; fill: var(--fg); }
  .code { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  .delta { font-family: var(--mono); font-size: 13px; font-weight: 650; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .code { font-size: 12px; }
    .delta { font-size: 12px; }
    .result { font-size: 12px; }
  }
</style>
