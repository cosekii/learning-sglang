<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    DUPLEX_GENERATED_MS,
    DUPLEX_DELIVERED_MS,
    DUPLEX_HEARD_MS,
    DUPLEX_DELIVERED_UNPLAYED_MS,
    DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS,
    DUPLEX_NATIVE_UNIT_MS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Delivery reaches 2.0 seconds, but playback reaches 1.2. The remaining 800 ms is already beyond the server queues.',
    captionZh: '声音已交付 2.0 秒，但只播放了 1.2 秒。其余 800 ms 已不在服务器队列里。',
  }, {
    caption: 'Three designs handle the same interruption. A streaming cascade separates recognition, language and speech services.',
    captionZh: '三种设计处理同一次打断。streaming cascade 让识别、语言模型和语音生成接力。',
  }, {
    caption: 'The fence drops queued old work and blocks late chunks. Delivered audio stays outside its reach.',
    captionZh: '删除边界清掉排队的旧工作，并挡住迟到 chunks。已交付声音不在这条边界内。',
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
  const H = $derived(phone ? [650, 790, 790][step] : [540, 590, 570][step]);
  const seconds = (ms: number) => (ms / 1000).toFixed(1);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Delivered sound is not played sound', '交付的声音不等于播过的声音')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t('one constructed reply · blue = reply audio', '同一段构造回答 · 蓝 = 回答声音')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t('red outline = delivered but not played', '红框 = 已交付但还没播放')}</text>
        {#if !phone}
          {#each [
            { y: 120, ms: DUPLEX_GENERATED_MS, name: 'generated', sub: 'the model produced it', nameZh: '已生成', subZh: '模型已经算出' },
            { y: 205, ms: DUPLEX_DELIVERED_MS, name: 'delivered = D', sub: 'the server connection took it', nameZh: '已交付 = D', subZh: '服务器连接已经取走' },
            { y: 290, ms: DUPLEX_HEARD_MS, name: 'heard = H', sub: 'the client says it played', nameZh: '已播放 = H', subZh: '客户端报告已经播放' },
          ] as row}
            <text x="30" y={row.y + 20} class="small strong">{t(row.name, row.nameZh)}</text>
            <text x="30" y={row.y + 42} class="small">{t(row.sub, row.subZh)}</text>
            <rect x="240" y={row.y} width={(row.ms / DUPLEX_GENERATED_MS) * 410} height="50" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="655" y={row.y + 31} text-anchor="end" class="result">{seconds(row.ms)} s</text>
          {/each}
          <rect x={240 + (DUPLEX_HEARD_MS / DUPLEX_GENERATED_MS) * 410} y="205" width={(DUPLEX_DELIVERED_UNPLAYED_MS / DUPLEX_GENERATED_MS) * 410} height="50" rx="7" fill="none" stroke="var(--eos)" stroke-width="3" />
          <text x="360" y="393" text-anchor="middle" class="result">D − H = {seconds(DUPLEX_DELIVERED_MS)} − {seconds(DUPLEX_HEARD_MS)} = {seconds(DUPLEX_DELIVERED_UNPLAYED_MS)} s = {DUPLEX_DELIVERED_UNPLAYED_MS} ms</text>
          <text x="360" y="433" text-anchor="middle" class="small strong">{t('The server can delete queued sound, not this delivered interval.', '服务器能删掉排队声音，删不掉这段已交付声音。')}</text>
          <text x="360" y="477" text-anchor="middle" class="result">{t('What does each design keep in the next answer?', '三种设计会把多少旧回答留进下一次回答？')}</text>
        {:else}
          {#each [
            { y: 125, ms: DUPLEX_GENERATED_MS, name: 'generated · model output', nameZh: '已生成 · 模型输出' },
            { y: 250, ms: DUPLEX_DELIVERED_MS, name: 'delivered = D · connection took it', nameZh: '已交付 = D · 连接取走' },
            { y: 375, ms: DUPLEX_HEARD_MS, name: 'heard = H · client played it', nameZh: '已播放 = H · 客户端播过' },
          ] as row}
            <text x="18" y={row.y - 14} class="small strong">{t(row.name, row.nameZh)}</text>
            <rect x="18" y={row.y} width={(row.ms / DUPLEX_GENERATED_MS) * 230} height="48" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="278" y={row.y + 30} text-anchor="end" class="result">{seconds(row.ms)} s</text>
          {/each}
          <rect x={18 + (DUPLEX_HEARD_MS / DUPLEX_GENERATED_MS) * 230} y="250" width={(DUPLEX_DELIVERED_UNPLAYED_MS / DUPLEX_GENERATED_MS) * 230} height="48" rx="7" fill="none" stroke="var(--eos)" stroke-width="3" />
          <text x="150" y="477" text-anchor="middle" class="result">D − H = {seconds(DUPLEX_DELIVERED_MS)} − {seconds(DUPLEX_HEARD_MS)}</text>
          <text x="150" y="507" text-anchor="middle" class="result">= {DUPLEX_DELIVERED_UNPLAYED_MS} ms {t('not played', '还没播放')}</text>
          <text x="150" y="551" text-anchor="middle" class="small">{t('Queued sound can be deleted.', '服务器能删掉排队声音。')}</text>
          <text x="150" y="577" text-anchor="middle" class="small">{t('This delivered interval cannot.', '删不掉这段已交付声音。')}</text>
          <text x="150" y="617" text-anchor="middle" class="small strong">{t('What enters the next answer?', '多少旧回答进入下次回答？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? `Constructed times · default lead ≤ ${DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS} ms` : `Constructed times. The default output lead is ${DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS} ms; delivery is a server ledger, not acoustic proof.`, phone ? `构造时刻 · 默认提前交付 ≤ ${DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS} ms` : `构造时刻。默认最多提前交付 ${DUPLEX_DEFAULT_MAX_OUTPUT_LEAD_MS} ms；交付记录不是播放证明。`)}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Three strategies, one interruption', '三种策略，同一次打断')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t('alternatives, not three stages in one pipeline', '三种替代方案，不是一条流水线里的三段')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue = strategies · orange = interrupt' : 'blue = strategy map · orange = shared interruption', phone ? '蓝 = 策略 · 橙 = 打断' : '蓝 = 策略地图 · 橙 = 共用的打断')}</text>
        {#if !phone}
          {#each [
            { x: 30, n: '1 of 3', name: 'turn-based', model: 'Qwen3-Omni', lines: ['VAD finds the turn end', 'speech onset stops a reply'], linesZh: ['VAD 找到说话结束', '回答时一开口就打断'], ref: 'Ch. 21 Step 1', refZh: '第 21 章第 1 步' },
            { x: 265, n: '2 of 3', name: 'streaming cascade', model: 'ASR → LLM → TTS', lines: ['ASR: sound → text', 'LLM: text → reply', 'TTS: reply → sound'], linesZh: ['ASR：声音 → 文字', 'LLM：文字 → 回答', 'TTS：回答 → 声音'], ref: 'separate services', refZh: '不同服务接力' },
            { x: 500, n: '3 of 3', name: 'native full-duplex', model: 'MiniCPM-o 4.5', lines: [`${DUPLEX_NATIVE_UNIT_MS / 1000} s audio units`, 'one model listens or speaks'], linesZh: [`每份声音 ${DUPLEX_NATIVE_UNIT_MS / 1000} 秒`, '同一模型选择听或说'], ref: 'Ch. 21 Steps 1–2', refZh: '第 21 章第 1–2 步' },
          ] as card}
            <rect x={card.x} y="112" width="190" height="294" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={card.x + 16} y="140" class="small strong">{card.n}</text>
            <text x={card.x + 16} y="174" class="small strong">{card.name}</text>
            <text x={card.x + 16} y="204" class="code">{card.model}</text>
            {#each card.lines as line, i}
              <text x={card.x + 16} y={249 + i * 34} class="small">{t(line, card.linesZh[i])}</text>
            {/each}
            <text x={card.x + 16} y="378" class="small">{t(card.ref, card.refZh)}</text>
          {/each}
          <rect x="120" y="438" width="480" height="56" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="472" text-anchor="middle" class="small strong">{t('same interruption: “No, I meant London.”', '同一次打断：「不对，我说的是伦敦。」')}</text>
          <text x="360" y="538" text-anchor="middle" class="result">{t('Which old outputs can the graph delete first?', '修改对话记录前，图能先删掉哪些旧输出？')}</text>
        {:else}
          {#each [
            { y: 108, n: '1 of 3', name: 'turn-based · Qwen3-Omni', lines: ['VAD finds turn end', 'speech onset stops a reply'], linesZh: ['VAD 找到说话结束', '回答时一开口就打断'] },
            { y: 282, n: '2 of 3', name: 'streaming cascade', lines: ['ASR: sound → text', 'LLM: text → reply', 'TTS: reply → sound'], linesZh: ['ASR：声音 → 文字', 'LLM：文字 → 回答', 'TTS：回答 → 声音'] },
            { y: 456, n: '3 of 3', name: 'native full-duplex · MiniCPM-o', lines: [`${DUPLEX_NATIVE_UNIT_MS / 1000} s units · listen or speak`, 'Ch. 21 Steps 1–2'], linesZh: [`每份 ${DUPLEX_NATIVE_UNIT_MS / 1000} 秒 · 选择听或说`, '第 21 章第 1–2 步'] },
          ] as card}
            <rect x="18" y={card.y} width="264" height="150" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="32" y={card.y + 27} class="small strong">{card.n}</text>
            <text x="32" y={card.y + 55} class="small strong">{card.name}</text>
            {#each card.lines as line, i}
              <text x="32" y={card.y + 88 + i * 27} class="small">{t(line, card.linesZh[i])}</text>
            {/each}
          {/each}
          <rect x="18" y="630" width="264" height="62" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="656" text-anchor="middle" class="small strong">{t('same interruption', '同一次打断')}</text>
          <text x="150" y="680" text-anchor="middle" class="small">“No, I meant London.”</text>
          <text x="150" y="733" text-anchor="middle" class="small strong">{t('Which old outputs can be deleted?', '哪些旧输出能先删掉？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Different systems · not a benchmark' : 'Different models and services; this map does not compare their speed.', phone ? '不同系统 · 不比较速度' : '不同模型和服务；这张地图不比较速度。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 30} y="30" class="title">{t('The graph fences the old reply', '图给旧回答设一道删除边界')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'fence = old work cannot pass' : 'interruption fence = a turn marker that old work cannot pass', phone ? '边界 = 旧工作不能越过' : '删除边界 = 标出旧回答，不让它的工作越过')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue = old · orange = input · red = fence' : 'blue = old reply · orange = client input · red = fence', phone ? '蓝 = 旧回答 · 橙 = 输入 · 红 = 边界' : '蓝 = 旧回答 · 橙 = 客户端输入 · 红 = 删除边界')}</text>
        {#if !phone}
          {#each [
            { x: 30, w: 125, name: 'target inbox', sub: 'waiting input', action: 'DROP', nameZh: '目标 inbox', subZh: '等待的输入', actionZh: '删除' },
            { x: 185, w: 125, name: 'unsent append', sub: 'not submitted', action: 'DROP', nameZh: '未送出 append', subZh: '还没提交', actionZh: '删除' },
            { x: 340, w: 135, name: 'submitted', sub: 'owners still run', action: 'ABORT', nameZh: '已提交', subZh: 'owner 仍在运行', actionZh: '中止' },
          ] as box}
            <rect x={box.x} y="125" width={box.w} height="86" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={box.x + box.w / 2} y="154" text-anchor="middle" class="small strong">{t(box.name, box.nameZh)}</text>
            <text x={box.x + box.w / 2} y="181" text-anchor="middle" class="small">{t(box.sub, box.subZh)}</text>
            <text x={box.x + box.w / 2} y="239" text-anchor="middle" class="result">{t(box.action, box.actionZh)}</text>
          {/each}
          <line x1="500" y1="105" x2="500" y2="370" stroke="var(--eos)" stroke-width="3" stroke-dasharray="7 5" />
          <text x="500" y="101" text-anchor="middle" class="small strong">{t('FENCE', '边界')}</text>
          <rect x="530" y="125" width="160" height="86" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="610" y="154" text-anchor="middle" class="small strong">{t('delivered = D', '已交付 = D')}</text>
          <text x="610" y="181" text-anchor="middle" class="small">{t('connection took it', '连接已经取走')}</text>
          <text x="610" y="239" text-anchor="middle" class="result">{t('CANNOT RECALL', '收不回来')}</text>
          <rect x="30" y="292" width="205" height="65" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="132" y="319" text-anchor="middle" class="small strong">{t('client input · KEEP', '客户端输入 · 保留')}</text>
          <text x="132" y="343" text-anchor="middle" class="small">“No, I meant London.”</text>
          <rect x="270" y="292" width="160" height="65" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="350" y="319" text-anchor="middle" class="small strong">{t('late old chunk', '迟到的旧 chunk')}</text>
          <text x="350" y="343" text-anchor="middle" class="result">{t('BLOCK', '挡住')}</text>
          <rect x="530" y="292" width="160" height="65" rx="10" fill="var(--bg)" stroke="var(--eos)" />
          <text x="610" y="319" text-anchor="middle" class="small strong">reply.delivered</text>
          <text x="610" y="343" text-anchor="middle" class="result">D = {seconds(DUPLEX_DELIVERED_MS)} s</text>
          <text x="360" y="415" text-anchor="middle" class="result">D − H = {DUPLEX_DELIVERED_UNPLAYED_MS} ms {t('outside the graph queues', '已在图的队列之外')}</text>
          <text x="360" y="475" text-anchor="middle" class="small strong">{t('The graph also reports D so history can use the same cut.', '图还报告 D，让对话记录使用同一个切点。')}</text>
          <text x="360" y="522" text-anchor="middle" class="result">{t('How many reply rows does Qwen keep?', 'Qwen 会保留旧回答的多少行？')}</text>
        {:else}
          {#each [
            { y: 112, name: 'target inbox · DROP', sub: 'waiting old input', nameZh: '目标 inbox · 删除', subZh: '等待的旧输入' },
            { y: 207, name: 'unsent append · DROP', sub: 'not submitted', nameZh: '未送出 append · 删除', subZh: '还没提交' },
            { y: 302, name: 'submitted · ABORT', sub: 'owners stop old work', nameZh: '已提交 · 中止', subZh: 'owner 停止旧工作' },
          ] as box}
            <rect x="18" y={box.y} width="264" height="75" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="150" y={box.y + 30} text-anchor="middle" class="small strong">{t(box.name, box.nameZh)}</text>
            <text x="150" y={box.y + 56} text-anchor="middle" class="small">{t(box.sub, box.subZh)}</text>
          {/each}
          <line x1="18" y1="397" x2="282" y2="397" stroke="var(--eos)" stroke-width="3" stroke-dasharray="7 5" />
          <text x="150" y="421" text-anchor="middle" class="small strong">{t('FENCE · late old chunks BLOCK', '边界 · 迟到旧 chunks 挡住')}</text>
          <rect x="18" y="442" width="264" height="70" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="470" text-anchor="middle" class="small strong">{t('delivered = D · CANNOT RECALL', '已交付 = D · 收不回来')}</text>
          <text x="150" y="496" text-anchor="middle" class="result">reply.delivered = {seconds(DUPLEX_DELIVERED_MS)} s</text>
          <rect x="18" y="532" width="264" height="62" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="558" text-anchor="middle" class="small strong">{t('client input · KEEP', '客户端输入 · 保留')}</text>
          <text x="150" y="581" text-anchor="middle" class="small">“No, I meant London.”</text>
          <text x="150" y="636" text-anchor="middle" class="result">D − H = {DUPLEX_DELIVERED_UNPLAYED_MS} ms</text>
          <text x="150" y="666" text-anchor="middle" class="small">{t('outside the graph queues', '已在图的队列之外')}</text>
          <text x="150" y="718" text-anchor="middle" class="small strong">{t('Next: Qwen history rows', '下一步：Qwen 保留多少行？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'D uses Step 1 · no global undo' : 'D reuses Step 1. The graph fences old work; it does not undo client playback.', phone ? 'D 来自第 1 步 · 不是全局撤销' : 'D 沿用第 1 步。图隔离旧工作，不会撤销客户端已经播放的声音。')}</text>
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
