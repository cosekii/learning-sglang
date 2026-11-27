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
    DUPLEX_QWEN_CODEC_FRAME_MS,
    DUPLEX_QWEN_PREFILL_TEXT_ROWS,
    DUPLEX_QWEN_GENERATED_ROWS,
    DUPLEX_QWEN_DELIVERED_ROWS,
    DUPLEX_QWEN_HEARD_ROWS,
    DUPLEX_QWEN_GENERATED_SOUND_ROWS,
    DUPLEX_QWEN_COMPLETE_SOUND_MS,
    DUPLEX_QWEN_REMAINDER_MS,
    DUPLEX_CASCADE_SENTENCE_ENDS_MS,
    DUPLEX_CASCADE_DELIVERED_SENTENCES,
    DUPLEX_CASCADE_HEARD_SENTENCES,
    DUPLEX_NATIVE_DELIVERED_UNIT_COUNT,
    DUPLEX_NATIVE_HEARD_UNIT_COUNT,
    DUPLEX_NATIVE_LAST_DELIVERED_UNIT,
    DUPLEX_NATIVE_LAST_HEARD_UNIT,
    DUPLEX_NATIVE_PARTIAL_HEARD_MS,
    DUPLEX_PROFILER_READY_TO_ADMITTED_MS,
    DUPLEX_PROFILER_ADMITTED_TO_OUTPUT_MS,
    DUPLEX_PROFILER_READY_TO_OUTPUT_MS,
    DUPLEX_INTERRUPTION_START_MS,
    DUPLEX_INTERRUPTION_END_MS,
    DUPLEX_OLD_REPLY_STOP_MS,
    DUPLEX_NEW_REPLY_WORD_MS,
    DUPLEX_STOP_WAIT_MS,
    DUPLEX_RESPONSE_WAIT_MS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'An old reply has D = 2.0 seconds delivered and H = 1.2 seconds heard. The remaining 800 ms is beyond the server queues.',
    captionZh: '旧回答已交付 D = 2.0 秒，已播放 H = 1.2 秒。其余 800 ms 已不在服务器队列里。',
  }, {
    caption: 'Three designs handle the same interruption. A streaming cascade separates recognition, language and speech services.',
    captionZh: '三种设计处理同一次打断。streaming cascade 让识别、语言模型和语音生成接力。',
  }, {
    caption: 'The fence drops queued old work and blocks late chunks. Delivered audio stays outside its reach.',
    captionZh: '删除边界清掉排队的旧工作，并挡住迟到 chunks。已交付声音不在这条边界内。',
  }, {
    caption: 'Qwen keeps the smaller of delivered and played positions. At 1.2 seconds, its history keeps 18 reply rows.',
    captionZh: 'Qwen 取交付和播放位置的较小者。1.2 秒对应保留 18 行回答。',
  }, {
    caption: 'Sentence alignment keeps every sentence whose audio ended by the cut. At 1.2 seconds, only sentence 1 remains.',
    captionZh: '句子对齐保留声音结束不晚于切点的所有句子。1.2 秒时只剩第 1 句。',
  }, {
    caption: 'MiniCPM-o truncates at complete one-second units. At 1.2 seconds, only unit 0 enters repaired history.',
    captionZh: 'MiniCPM-o 只按完整的一秒单元裁切。1.2 秒时只保留 unit 0。',
  }, {
    caption: 'The server timer adds 150 ms admission and 50 ms to first output. That 200 ms does not measure playback or interruption stop.',
    captionZh: '服务器计时把 150 ms 接纳等待与 50 ms 首输出等待相加。这 200 ms 不测量播放或停答。',
  }, {
    caption: 'The listener waits 1.3 seconds for old-audio stop and 1.1 for reply. Next, which Qwen deployment belongs on these clocks?',
    captionZh: '旧声音 1.3 秒后才停，新回答的首个 ASR 词 1.1 秒后才出现。下一步，该把哪种 Qwen 部署放上这些时钟？',
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
  const H = $derived(phone ? [650, 790, 790, 760, 830, 830, 760, 800][step] : [540, 590, 570, 610, 640, 640, 590, 640][step]);
  const seconds = (ms: number) => (ms / 1000).toFixed(1);
  const listenerX = (ms: number) => 80 + (ms - DUPLEX_INTERRUPTION_START_MS) * 0.2;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Old reply: delivered is not heard', '旧回答：交付不等于听过')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'old work queued · blue = reply audio' : 'Ch. 11’s old reply · queued old work can be dropped · blue = reply audio', phone ? '旧工作可删 · 蓝 = 回答声音' : '第 11 章的旧回答 · 排队旧工作可删除 · 蓝 = 回答声音')}</text>
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
          <text x="360" y="433" text-anchor="middle" class="small strong">{t('The server can drop queued old reply work, not this delivered interval.', '服务器能删除排队的旧回答工作，删不掉这段已交付声音。')}</text>
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
          <text x="150" y="551" text-anchor="middle" class="small">{t('Queued old reply work can be dropped.', '队列中的旧回答工作可删除。')}</text>
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
            { x: 340, w: 135, name: 'submitted', sub: 'owners still run', action: 'ABORT IF PREEMPTING', nameZh: '已提交', subZh: 'owner 仍在运行', actionZh: '带 PREEMPT 才中止' },
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
            { y: 302, name: 'submitted', sub: 'abort if preempting', nameZh: '已提交', subZh: '带 preempt 才中止' },
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
      {:else if step === 3}
        <text x={phone ? 18 : 30} y="30" class="title">{t('History repair · 1 of 3 · Qwen3-Omni', '对话记录修复 · 1/3 · Qwen3-Omni')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'row = one saved token position' : 'row = one token position saved in thinker history', phone ? 'row = 记录里的一个 token 位置' : 'row = thinker 记录里保存的一个 token 位置')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'one 80 ms codec frame = one sound row' : 'one 80 ms codec frame adds one reply-sound row; three text rows come first', phone ? '每个 80 ms codec 帧 = 一行声音' : '每个 80 ms codec 帧增加一行回答声音，前面先有三行文字')}</text>
        <rect x={phone ? 18 : 170} y="105" width={phone ? 264 : 380} height="61" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x={W / 2} y="132" text-anchor="middle" class="small strong">min(D, H) = min({seconds(DUPLEX_DELIVERED_MS)}, {seconds(DUPLEX_HEARD_MS)}) = {seconds(Math.min(DUPLEX_DELIVERED_MS, DUPLEX_HEARD_MS))} s</text>
        <text x={W / 2} y="155" text-anchor="middle" class="small">{t('a later client report can only move the cut back', '客户端后来的报告只能把切点往前挪')}</text>
        {#if !phone}
          <text x="30" y="202" class="small strong">{t(`GENERATED REPLY · ${DUPLEX_QWEN_GENERATED_ROWS} ROWS`, `生成的回答 · ${DUPLEX_QWEN_GENERATED_ROWS} 行`)}</text>
          <text x="690" y="202" text-anchor="end" class="small">{t('blue = kept · grey = removed', '蓝 = 保留 · 灰 = 删除')}</text>
          {#each Array(DUPLEX_QWEN_GENERATED_ROWS) as _, i}
            <rect x={30 + i * 19} y="224" width="16" height="45" rx="3" fill={i < DUPLEX_QWEN_HEARD_ROWS ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i < DUPLEX_QWEN_HEARD_ROWS ? 'var(--accent)' : 'var(--faint)'} />
          {/each}
          <line x1={30 + DUPLEX_QWEN_HEARD_ROWS * 19 - 3} y1="211" x2={30 + DUPLEX_QWEN_HEARD_ROWS * 19 - 3} y2="283" stroke="var(--eos)" stroke-width="3" />
          <text x={30 + DUPLEX_QWEN_HEARD_ROWS * 19 - 3} y="303" text-anchor="middle" class="small strong">H cut · {DUPLEX_QWEN_HEARD_ROWS}</text>
          <line x1={30 + DUPLEX_QWEN_DELIVERED_ROWS * 19 - 3} y1="211" x2={30 + DUPLEX_QWEN_DELIVERED_ROWS * 19 - 3} y2="283" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 3" />
          <text x={30 + DUPLEX_QWEN_DELIVERED_ROWS * 19 - 3} y="303" text-anchor="middle" class="small">D · {DUPLEX_QWEN_DELIVERED_ROWS}</text>
          <text x="30" y="337" class="small">{DUPLEX_QWEN_PREFILL_TEXT_ROWS} + floor({DUPLEX_GENERATED_MS} ÷ {DUPLEX_QWEN_CODEC_FRAME_MS}) = {DUPLEX_QWEN_GENERATED_ROWS} {t('rows', '行')}</text>
          <text x="30" y="361" class="small">{DUPLEX_QWEN_GENERATED_SOUND_ROWS} × {DUPLEX_QWEN_CODEC_FRAME_MS} = {DUPLEX_QWEN_COMPLETE_SOUND_MS} ms · {DUPLEX_QWEN_REMAINDER_MS} ms {t('tail is not a full row', '尾巴不足一行')}</text>
          <text x="360" y="386" text-anchor="middle" class="result">D: {DUPLEX_QWEN_PREFILL_TEXT_ROWS} + floor({DUPLEX_DELIVERED_MS} ÷ {DUPLEX_QWEN_CODEC_FRAME_MS}) = {DUPLEX_QWEN_DELIVERED_ROWS}</text>
          <text x="360" y="429" text-anchor="middle" class="result">H: {DUPLEX_QWEN_PREFILL_TEXT_ROWS} + floor({DUPLEX_HEARD_MS} ÷ {DUPLEX_QWEN_CODEC_FRAME_MS}) = {DUPLEX_QWEN_HEARD_ROWS}</text>
          <rect x="170" y="457" width="380" height="52" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="360" y="489" text-anchor="middle" class="result">{t(`KEEP ${DUPLEX_QWEN_HEARD_ROWS} ROWS · NOT ${DUPLEX_QWEN_HEARD_ROWS} WORDS`, `保留 ${DUPLEX_QWEN_HEARD_ROWS} 行 · 不是 ${DUPLEX_QWEN_HEARD_ROWS} 个词`)}</text>
          <text x="360" y="557" text-anchor="middle" class="small strong">{t('How does a cascade cut reply text instead?', 'cascade 又会怎样裁切回答文字？')}</text>
        {:else}
          <text x="18" y="202" class="small strong">{t(`GENERATED · ${DUPLEX_QWEN_GENERATED_ROWS} ROWS`, `生成回答 · ${DUPLEX_QWEN_GENERATED_ROWS} 行`)}</text>
          {#each Array(DUPLEX_QWEN_GENERATED_ROWS) as _, i}
            <rect x={18 + (i % 17) * 15} y={222 + Math.floor(i / 17) * 57} width="12" height="43" rx="3" fill={i < DUPLEX_QWEN_HEARD_ROWS ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i < DUPLEX_QWEN_HEARD_ROWS ? 'var(--accent)' : 'var(--faint)'} />
          {/each}
          <text x="18" y="344" class="small">{DUPLEX_QWEN_PREFILL_TEXT_ROWS} + floor({DUPLEX_GENERATED_MS} ÷ {DUPLEX_QWEN_CODEC_FRAME_MS}) = {DUPLEX_QWEN_GENERATED_ROWS} {t('rows', '行')}</text>
          <text x="18" y="368" class="small">{DUPLEX_QWEN_GENERATED_SOUND_ROWS} × {DUPLEX_QWEN_CODEC_FRAME_MS} = {DUPLEX_QWEN_COMPLETE_SOUND_MS} ms · {DUPLEX_QWEN_REMAINDER_MS} ms {t('tail', '尾巴')}</text>
          <text x="18" y="392" class="small">{t('blue = kept · grey = removed', '蓝 = 保留 · 灰 = 删除')}</text>
          <text x="150" y="424" text-anchor="middle" class="result">D: {DUPLEX_QWEN_PREFILL_TEXT_ROWS} + floor({DUPLEX_DELIVERED_MS} ÷ {DUPLEX_QWEN_CODEC_FRAME_MS})</text>
          <text x="150" y="450" text-anchor="middle" class="result">= {DUPLEX_QWEN_DELIVERED_ROWS} {t('rows', '行')}</text>
          <text x="150" y="496" text-anchor="middle" class="result">H: {DUPLEX_QWEN_PREFILL_TEXT_ROWS} + floor({DUPLEX_HEARD_MS} ÷ {DUPLEX_QWEN_CODEC_FRAME_MS})</text>
          <text x="150" y="522" text-anchor="middle" class="result">= {DUPLEX_QWEN_HEARD_ROWS} {t('rows', '行')}</text>
          <rect x="18" y="550" width="264" height="62" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="576" text-anchor="middle" class="result">{t(`KEEP ${DUPLEX_QWEN_HEARD_ROWS} ROWS`, `保留 ${DUPLEX_QWEN_HEARD_ROWS} 行`)}</text>
          <text x="150" y="599" text-anchor="middle" class="small">{t('rows, not words', '是行数，不是词数')}</text>
          <text x="150" y="680" text-anchor="middle" class="small strong">{t('Next: cascade text history', '下一步：cascade 的文字记录')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Complete 80 ms rows only' : 'Only complete 80 ms codec rows count; this is a token-history cut, not word alignment.', phone ? '只数完整的 80 ms 行' : '只数完整的 80 ms codec 行；这是 token 记录切点，不是逐词对齐。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? '2 of 3 · streaming cascade' : 'History repair · 2 of 3 · streaming cascade', phone ? '2/3 · streaming cascade' : '对话记录修复 · 2/3 · streaming cascade')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'alignment = text matched to audio times' : 'alignment = matching reply text to audio end times', phone ? '对齐 = 文字对应声音结束时刻' : '对齐 = 把回答文字对应到声音结束时刻')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue = kept · grey = removed' : 'blue = sentences kept · grey = sentences removed', phone ? '蓝 = 保留 · 灰 = 删除' : '蓝 = 保留的句子 · 灰 = 删除的句子')}</text>
        {#if !phone}
          {#each [
            { x: 30, cut: DUPLEX_DELIVERED_MS, kept: DUPLEX_CASCADE_DELIVERED_SENTENCES, title: 'BEFORE CLIENT H · D = 2.0 s', titleZh: '客户端 H 之前 · D = 2.0 秒' },
            { x: 370, cut: Math.min(DUPLEX_DELIVERED_MS, DUPLEX_HEARD_MS), kept: DUPLEX_CASCADE_HEARD_SENTENCES, title: 'AFTER CLIENT H · min = 1.2 s', titleZh: '客户端 H 之后 · 较小值 = 1.2 秒' },
          ] as panel}
            <rect x={panel.x} y="112" width="320" height="329" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x={panel.x + 16} y="141" class="small strong">{t(panel.title, panel.titleZh)}</text>
            {#each ['Paris is cold.', 'Bring a coat.', 'See you there.'] as sentence, i}
              <rect x={panel.x + 16} y={169 + i * 71} width="288" height="54" rx="8" fill={i < panel.kept ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i < panel.kept ? 'var(--accent)' : 'var(--faint)'} />
              <text x={panel.x + 30} y={191 + i * 71} class="small strong">{i + 1} · {sentence}</text>
              <text x={panel.x + 30} y={213 + i * 71} class="small">{t('audio ends', '声音结束')} · {seconds(DUPLEX_CASCADE_SENTENCE_ENDS_MS[i])} s · {i < panel.kept ? t('KEEP', '保留') : t('DROP', '删除')}</text>
            {/each}
            <text x={panel.x + 160} y="420" text-anchor="middle" class="result">{t(`KEEP ${panel.kept} SENTENCE${panel.kept === 1 ? '' : 'S'}`, `保留 ${panel.kept} 句`)}</text>
          {/each}
          <text x="360" y="486" text-anchor="middle" class="result">{t('last sentence end ≤ min(D, H) = 1,200 ms', '最后保留句的结束时刻 ≤ min(D, H) = 1,200 ms')}</text>
          <text x="360" y="526" text-anchor="middle" class="small strong">{t('No gaps · sentence 2 = 1.0–2.0 s · 1,200 − 1,000 = 200 ms heard · DROP sentence 2', '句间无空档 · 第 2 句 = 1.0–2.0 秒 · 1,200 − 1,000 = 200 ms 已听 · 删除第 2 句')}</text>
          <text x="360" y="586" text-anchor="middle" class="result">{t('How does native MiniCPM-o cut one-second units?', 'native MiniCPM-o 怎样裁切一秒单元？')}</text>
        {:else}
          {#each [
            { y: 108, kept: DUPLEX_CASCADE_DELIVERED_SENTENCES, title: 'BEFORE H · D = 2.0 s', titleZh: 'H 之前 · D = 2.0 秒' },
            { y: 347, kept: DUPLEX_CASCADE_HEARD_SENTENCES, title: 'AFTER H · min = 1.2 s', titleZh: 'H 之后 · 较小值 = 1.2 秒' },
          ] as panel}
            <rect x="18" y={panel.y} width="264" height="217" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={panel.y + 28} class="small strong">{t(panel.title, panel.titleZh)}</text>
            {#each DUPLEX_CASCADE_SENTENCE_ENDS_MS as end, i}
              <rect x="32" y={panel.y + 46 + i * 43} width="236" height="35" rx="6" fill={i < panel.kept ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i < panel.kept ? 'var(--accent)' : 'var(--faint)'} />
              <text x="42" y={panel.y + 69 + i * 43} class="small">{i + 1} · {seconds(end)} s · {i < panel.kept ? t('KEEP', '保留') : t('DROP', '删除')}</text>
            {/each}
            <text x="150" y={panel.y + 199} text-anchor="middle" class="result">{t(`KEEP ${panel.kept}`, `保留 ${panel.kept} 句`)}</text>
          {/each}
          <text x="150" y="607" text-anchor="middle" class="result">min(D, H) = 1,200 ms</text>
          <text x="150" y="638" text-anchor="middle" class="small">{t('No gaps · sentence 2 = 1.0–2.0 s', '句间无空档 · 第 2 句 = 1.0–2.0 秒')}</text>
          <text x="150" y="663" text-anchor="middle" class="small">{t('1,200 − 1,000 = 200 ms heard · DROP', '1,200 − 1,000 = 200 ms 已听 · 删除')}</text>
          <text x="150" y="723" text-anchor="middle" class="small strong">{t('Next: native one-second units', '下一步：native 的一秒单元')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Default: sentence alignment' : 'Default method: sentence. Forced or ASR alignment can retain finer prefixes; not drawn here.', phone ? '默认使用句子对齐' : '默认 method: sentence。forced 或 ASR 对齐能保留更细前缀，本图不展开。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? '3 of 3 · MiniCPM-o 4.5' : 'History repair · 3 of 3 · MiniCPM-o 4.5', phone ? '3/3 · MiniCPM-o 4.5' : '对话记录修复 · 3/3 · MiniCPM-o 4.5')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'client cut = complete units only' : 'client truncate = keep only complete one-second units', phone ? '客户端切点 = 只留完整单元' : '客户端 truncate = 只保留完整的一秒单元')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue = kept · grey = dropped' : 'blue = units kept · grey = units dropped', phone ? '蓝 = 保留 · 灰 = 删除' : '蓝 = 保留的单元 · 灰 = 删除的单元')}</text>
        {#if !phone}
          {#each [
            { x: 30, kept: DUPLEX_NATIVE_DELIVERED_UNIT_COUNT, title: 'response.cancel · D = 2.0 s', titleZh: 'response.cancel · D = 2.0 秒' },
            { x: 370, kept: DUPLEX_NATIVE_HEARD_UNIT_COUNT, title: 'client truncate · H = 1.2 s', titleZh: '客户端 truncate · H = 1.2 秒' },
          ] as panel}
            <rect x={panel.x} y="112" width="320" height="329" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x={panel.x + 16} y="141" class="small strong">{t(panel.title, panel.titleZh)}</text>
            {#each [0, 1, 2] as unit}
              <rect x={panel.x + 16} y={169 + unit * 71} width="288" height="54" rx="8" fill={unit < panel.kept ? 'var(--accent-soft)' : 'var(--bg)'} stroke={unit < panel.kept ? 'var(--accent)' : 'var(--faint)'} />
              <text x={panel.x + 30} y={191 + unit * 71} class="small strong">unit {unit} · {unit < 2 ? t(`audio ends ${unit + 1}.0 s`, `声音在 ${unit + 1}.0 秒结束`) : t('not delivered', '尚未交付')}</text>
              <text x={panel.x + 30} y={213 + unit * 71} class="small">{unit < panel.kept ? t('KEEP IN HISTORY', '留在记录里') : t('DROP', '删除')}</text>
            {/each}
            <text x={panel.x + 160} y="420" text-anchor="middle" class="result">{t(`KEEP THROUGH UNIT ${panel.kept - 1}`, `保留到 unit ${panel.kept - 1}`)}</text>
          {/each}
          <text x="360" y="486" text-anchor="middle" class="result">floor(min(D, H) ÷ {DUPLEX_NATIVE_UNIT_MS}) = {DUPLEX_NATIVE_HEARD_UNIT_COUNT} {t('complete unit', '个完整单元')}</text>
          <rect x="80" y="510" width="560" height="52" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="360" y="542" text-anchor="middle" class="small strong">{DUPLEX_HEARD_MS} − {DUPLEX_NATIVE_UNIT_MS} = {DUPLEX_NATIVE_PARTIAL_HEARD_MS} ms {t('heard inside unit 1 · whole-unit cut drops it', '在 unit 1 里被听过 · 整单元裁切删掉它')}</text>
          <text x="360" y="606" text-anchor="middle" class="result">{t('Which server timer still says nothing about playback?', '哪种服务器计时仍不能说明播放情况？')}</text>
        {:else}
          {#each [
            { y: 108, kept: DUPLEX_NATIVE_DELIVERED_UNIT_COUNT, title: 'cancel · D = 2.0 s', titleZh: '取消 · D = 2.0 秒' },
            { y: 347, kept: DUPLEX_NATIVE_HEARD_UNIT_COUNT, title: 'truncate · H = 1.2 s', titleZh: '截断 · H = 1.2 秒' },
          ] as panel}
            <rect x="18" y={panel.y} width="264" height="217" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={panel.y + 28} class="small strong">{t(panel.title, panel.titleZh)}</text>
            {#each [0, 1, 2] as unit}
              <rect x="32" y={panel.y + 46 + unit * 43} width="236" height="35" rx="6" fill={unit < panel.kept ? 'var(--accent-soft)' : 'var(--bg)'} stroke={unit < panel.kept ? 'var(--accent)' : 'var(--faint)'} />
              <text x="42" y={panel.y + 69 + unit * 43} class="small">unit {unit} · {unit < panel.kept ? t('KEEP', '保留') : t('DROP', '删除')}</text>
            {/each}
            <text x="150" y={panel.y + 199} text-anchor="middle" class="result">{t(`THROUGH UNIT ${panel.kept - 1}`, `到 unit ${panel.kept - 1}`)}</text>
          {/each}
          <text x="150" y="607" text-anchor="middle" class="result">floor(1,200 ÷ {DUPLEX_NATIVE_UNIT_MS}) = {DUPLEX_NATIVE_HEARD_UNIT_COUNT}</text>
          <text x="150" y="638" text-anchor="middle" class="small">{DUPLEX_HEARD_MS} − {DUPLEX_NATIVE_UNIT_MS} = {DUPLEX_NATIVE_PARTIAL_HEARD_MS} ms</text>
          <text x="150" y="663" text-anchor="middle" class="small">{t('heard in unit 1 · whole-unit cut drops it', '在 unit 1 里被听过 · 整单元裁切删掉')}</text>
          <text x="150" y="723" text-anchor="middle" class="small strong">{t('Next: server timing boundaries', '下一步：服务器计时边界')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Unit indices start at 0' : 'Unit indices start at 0. Later user audio returns as forced-listen units; not drawn here.', phone ? 'unit 编号从 0 开始' : 'unit 编号从 0 开始。后续用户声音会作为强制 listening 单元补回，本图不展开。')}</text>
      {:else if step === 6}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Server timing', '服务器计时')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'Unit = work for one append' : 'Unit = the work done for one append through the Session stages', phone ? 'Unit = 一个 append 完成的工作' : 'Unit = 一个 append 经过各个 Session stage 时完成的工作')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'blue = admission · orange = to output' : 'blue = ready to admitted · orange = admitted to first output', phone ? '蓝 = 接纳 · 橙 = 到首输出' : '蓝 = 就绪到接纳 · 橙 = 接纳到首个输出')}</text>
        {#if !phone}
          <text x="90" y="126" class="small strong">ready</text>
          <text x="90" y="150" class="small">{t('all required input present', '需要的输入都到齐')}</text>
          <text x="450" y="126" text-anchor="middle" class="small strong">admitted</text>
          <text x="450" y="150" text-anchor="middle" class="small">{t('coordinator accepts', 'coordinator 接纳')}</text>
          <text x="630" y="126" text-anchor="end" class="small strong">first output</text>
          <text x="630" y="150" text-anchor="end" class="small">{t('output buffer', '输出缓冲')}</text>
          <rect x="90" y="184" width={DUPLEX_PROFILER_READY_TO_ADMITTED_MS * 2.4} height="58" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x={90 + DUPLEX_PROFILER_READY_TO_ADMITTED_MS * 2.4} y="184" width={DUPLEX_PROFILER_ADMITTED_TO_OUTPUT_MS * 2.4} height="58" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x={90 + DUPLEX_PROFILER_READY_TO_ADMITTED_MS * 1.2} y="219" text-anchor="middle" class="result">{DUPLEX_PROFILER_READY_TO_ADMITTED_MS} ms</text>
          <text x={90 + DUPLEX_PROFILER_READY_TO_ADMITTED_MS * 2.4 + DUPLEX_PROFILER_ADMITTED_TO_OUTPUT_MS * 1.2} y="219" text-anchor="middle" class="result">{DUPLEX_PROFILER_ADMITTED_TO_OUTPUT_MS} ms</text>
          <text x="360" y="298" text-anchor="middle" class="result">ready_to_first_output = {DUPLEX_PROFILER_READY_TO_ADMITTED_MS} + {DUPLEX_PROFILER_ADMITTED_TO_OUTPUT_MS} = {DUPLEX_PROFILER_READY_TO_OUTPUT_MS} ms</text>
          <rect x="60" y="338" width="285" height="83" rx="10" fill="var(--bg)" stroke="var(--eos)" />
          <text x="202" y="371" text-anchor="middle" class="small strong">{t('NOT client first audio', '不等于客户端首音')}</text>
          <text x="202" y="399" text-anchor="middle" class="small">{t('the first output may be text', '首个输出可能是文字')}</text>
          <rect x="375" y="338" width="285" height="83" rx="10" fill="var(--bg)" stroke="var(--eos)" />
          <text x="517" y="371" text-anchor="middle" class="small strong">{t('NOT old-audio stop', '不等于旧声音停止')}</text>
          <text x="517" y="399" text-anchor="middle" class="small">{t('no playback endpoint here', '这里没有播放端点')}</text>
          <text x="360" y="489" text-anchor="middle" class="small strong">{t('This clock explains server queueing and work, not what the listener heard.', '这个时钟解释服务器排队和工作，不说明听者听到了什么。')}</text>
          <text x="360" y="544" text-anchor="middle" class="result">{t('Which two waits can the listener measure?', '听者能测量哪两段等待？')}</text>
        {:else}
          {#each [
            { y: 115, name: 'ready', sub: 'required input present', nameZh: '就绪', subZh: '需要的输入到齐' },
            { y: 211, name: 'admitted', sub: 'coordinator accepts', nameZh: '接纳', subZh: 'coordinator 接纳' },
            { y: 307, name: 'first output', sub: 'content enters output buffer', nameZh: '首个输出', subZh: '内容进入输出缓冲' },
          ] as event, i}
            <circle cx="38" cy={event.y + 18} r="7" fill={i < 1 ? 'var(--accent)' : i < 2 ? 'var(--gen)' : 'var(--fg)'} />
            <text x="58" y={event.y + 14} class="small strong">{t(event.name, event.nameZh)}</text>
            <text x="58" y={event.y + 38} class="small">{t(event.sub, event.subZh)}</text>
          {/each}
          <rect x="18" y="386" width="264" height="55" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="420" text-anchor="middle" class="result">ready → admitted = {DUPLEX_PROFILER_READY_TO_ADMITTED_MS} ms</text>
          <rect x="18" y="453" width="264" height="55" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="487" text-anchor="middle" class="result">admitted → output = {DUPLEX_PROFILER_ADMITTED_TO_OUTPUT_MS} ms</text>
          <text x="150" y="550" text-anchor="middle" class="result">total = {DUPLEX_PROFILER_READY_TO_ADMITTED_MS} + {DUPLEX_PROFILER_ADMITTED_TO_OUTPUT_MS} = {DUPLEX_PROFILER_READY_TO_OUTPUT_MS} ms</text>
          <text x="150" y="598" text-anchor="middle" class="small strong">{t('NOT first audio · NOT audio stop', '不等于首音 · 不等于停答')}</text>
          <text x="150" y="626" text-anchor="middle" class="small">{t('First output may be text.', '首个输出可能是文字。')}</text>
          <text x="150" y="690" text-anchor="middle" class="small strong">{t('Next: listener-side waits', '下一步：听者测量的等待')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'profiler = server timer · fixed test values' : 'The profiler records server timing. Fixed test values; each Unit is timed before results are combined.', phone ? 'profiler = 服务器计时工具 · 固定测试值' : 'profiler 记录服务器耗时。这里使用固定测试值；先计算每个 Unit，再汇总。')}</text>
      {:else if step === 7}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Listener timing' : 'Listener timing · one recorded interruption', phone ? '听者计时' : '听者计时 · 一次录下的打断')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'S = user starts · R = user ends' : 'S = interruption starts · R = interruption ends', phone ? 'S = 开始打断 · R = 打断结束' : 'S = 开始打断 · R = 打断结束')}</text>
        <text x={phone ? 18 : 30} y="79" class="label">{t(phone ? 'orange = user · red = old · blue = new' : 'orange = user correction · red = old reply · blue = new reply', phone ? '橙 = 用户 · 红 = 旧回答 · 蓝 = 新回答' : '橙 = 用户纠正 · 红 = 旧回答 · 蓝 = 新回答')}</text>
        {#if !phone}
          <text x="30" y="122" class="small strong">{t('USER', '用户')}</text>
          <rect x={listenerX(DUPLEX_INTERRUPTION_START_MS)} y="112" width={(DUPLEX_INTERRUPTION_END_MS - DUPLEX_INTERRUPTION_START_MS) * 0.2} height="45" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="80" y="97" text-anchor="middle" class="result">S · {seconds(DUPLEX_INTERRUPTION_START_MS)}</text>
          <text x="380" y="97" text-anchor="middle" class="result">R · {seconds(DUPLEX_INTERRUPTION_END_MS)}</text>
          <text x="230" y="141" text-anchor="middle" class="small strong">“No, I meant London.”</text>
          <text x="30" y="222" class="small strong">{t('OLD REPLY', '旧回答')}</text>
          <rect x="80" y="203" width={(DUPLEX_OLD_REPLY_STOP_MS - DUPLEX_INTERRUPTION_START_MS) * 0.2} height="45" rx="7" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="340" y="190" text-anchor="middle" class="result">L · {seconds(DUPLEX_OLD_REPLY_STOP_MS)}</text>
          <text x="340" y="232" text-anchor="middle" class="small strong">{t('old speech segment ends', '旧语音段结束')}</text>
          <text x="30" y="322" class="small strong">{t('NEW REPLY', '新回答')}</text>
          <rect x="380" y="303" width={(DUPLEX_NEW_REPLY_WORD_MS - DUPLEX_INTERRUPTION_END_MS) * 0.2} height="45" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="5 3" />
          <rect x="600" y="303" width="90" height="45" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="600" y="290" text-anchor="middle" class="result">N · {seconds(DUPLEX_NEW_REPLY_WORD_MS)}</text>
          <text x="645" y="332" text-anchor="middle" class="small strong">{t('first ASR word', '首个 ASR 词')}</text>
          <rect x="50" y="384" width="295" height="70" rx="10" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="197" y="413" text-anchor="middle" class="small strong">{t('old reply stops', '旧回答停止')}</text>
          <text x="197" y="440" text-anchor="middle" class="result">L − S = {seconds(DUPLEX_OLD_REPLY_STOP_MS)} − {seconds(DUPLEX_INTERRUPTION_START_MS)} = {seconds(DUPLEX_STOP_WAIT_MS)} s</text>
          <rect x="375" y="384" width="295" height="70" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="522" y="413" text-anchor="middle" class="small strong">{t('new reply responds', '新回答回应')}</text>
          <text x="522" y="440" text-anchor="middle" class="result">N − R = {seconds(DUPLEX_NEW_REPLY_WORD_MS)} − {seconds(DUPLEX_INTERRUPTION_END_MS)} = {seconds(DUPLEX_RESPONSE_WAIT_MS)} s</text>
          {#each [
            { x: 50, name: 'Qwen', value: `${DUPLEX_QWEN_HEARD_ROWS} rows` },
            { x: 265, name: 'cascade', value: `sentence ${DUPLEX_CASCADE_HEARD_SENTENCES}` },
            { x: 480, name: 'MiniCPM-o', value: `unit ${DUPLEX_NATIVE_LAST_HEARD_UNIT}` },
          ] as result}
            <rect x={result.x} y="486" width="190" height="55" rx="9" fill="var(--bg)" stroke="var(--line)" />
            <text x={result.x + 95} y="509" text-anchor="middle" class="small strong">{result.name}</text>
            <text x={result.x + 95} y="531" text-anchor="middle" class="result">{result.value}</text>
          {/each}
          <text x="360" y="590" text-anchor="middle" class="small strong">{t('Next: choose the Qwen3-Omni deployment to put on these clocks.', '下一步：选择要放上这些时钟的 Qwen3-Omni 部署。')}</text>
        {:else}
          <rect x="18" y="106" width="264" height="68" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="133" text-anchor="middle" class="small strong">{t('USER CORRECTION', '用户纠正')}</text>
          <text x="150" y="158" text-anchor="middle" class="result">S = {seconds(DUPLEX_INTERRUPTION_START_MS)} · R = {seconds(DUPLEX_INTERRUPTION_END_MS)}</text>
          <rect x="18" y="194" width="264" height="82" rx="9" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="150" y="221" text-anchor="middle" class="small strong">{t(`OLD REPLY STOPS AT L = ${seconds(DUPLEX_OLD_REPLY_STOP_MS)}`, `旧回答在 L = ${seconds(DUPLEX_OLD_REPLY_STOP_MS)} 停止`)}</text>
          <text x="150" y="251" text-anchor="middle" class="result">L − S = {seconds(DUPLEX_STOP_WAIT_MS)} s</text>
          <rect x="18" y="296" width="264" height="82" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="323" text-anchor="middle" class="small strong">{t(`NEW ASR WORD AT N = ${seconds(DUPLEX_NEW_REPLY_WORD_MS)}`, `新 ASR 词在 N = ${seconds(DUPLEX_NEW_REPLY_WORD_MS)} 出现`)}</text>
          <text x="150" y="353" text-anchor="middle" class="result">N − R = {seconds(DUPLEX_RESPONSE_WAIT_MS)} s</text>
          <rect x="18" y="407" width="264" height="119" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="438" text-anchor="middle" class="small strong">{t('SAME HISTORY CUT AS STEPS 4–6', '与第 4–6 步相同的历史切点')}</text>
          <text x="150" y="470" text-anchor="middle" class="result">Qwen {DUPLEX_QWEN_HEARD_ROWS} · cascade {DUPLEX_CASCADE_HEARD_SENTENCES}</text>
          <text x="150" y="501" text-anchor="middle" class="result">MiniCPM-o unit {DUPLEX_NATIVE_LAST_HEARD_UNIT}</text>
          <text x="150" y="582" text-anchor="middle" class="small">{t('The two clocks use recorded speech.', '两个时钟都使用录下的语音。')}</text>
          <text x="150" y="610" text-anchor="middle" class="small">{t('They do not reuse the server clock.', '不复用服务器时钟。')}</text>
          <text x="150" y="680" text-anchor="middle" class="small strong">{t('Next: Qwen3-Omni deployment', '下一步：Qwen3-Omni 部署调优')}</text>
          <text x="150" y="710" text-anchor="middle" class="small">{t('Which deployment belongs on these clocks?', '哪种部署该放上这些时钟？')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Full-Duplex Bench (FDB) v1.0 scores recorded speech.', 'Full-Duplex Bench (FDB) v1.0 给录下的语音评分。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed · N = first ASR word at/after R' : 'Constructed example. N is the first ASR word at or after R, not necessarily first audio.', phone ? '构造算例 · N = 不早于 R 的首个 ASR 词' : '构造算例。N 是不早于 R 的首个 ASR 词，不一定是首个声音。')}</text>
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
