<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_BOX_MAX_IMAGES,
    VOXT_SELECTION_SETTLE_MS,
    VOXT_SELECTION_POLL_MS,
    VOXT_SELECTION_MODIFIER_WAIT_MS,
    VOXT_SELECTION_COPY_MS,
    VOXT_REWRITE_COPY_MS,
    VOXT_SELECTION_RETRY_MS,
    VOXT_DRAFT_EVERY_MS,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Rewrite and Translate start from text on the screen, not from your voice. Both use the model connection from Chapter 5.',
    captionZh: '改写和翻译从屏幕上的文字出发，不从你的声音出发。两者都用第 5 章的模型连接。',
  }, {
    caption: 'Voxt reads the selection through Accessibility first. Blank reads count as nothing, so it copies with ⌘C and puts the clipboard back.',
    captionZh: '先经辅助功能读选区。读到空白或占位符算没读到，就改用 ⌘C 复制，再把剪贴板放回。',
  }, {
    caption: 'The shortcut starts the microphone and opens the card together. The selection lands as a block; type more, paste up to 4 pictures.',
    captionZh: '快捷键同时启动麦克风、打开卡片。选中的文字落成一个块；你可以再打字，最多再贴 4 张图。',
  }, {
    caption: 'One request carries the parts in a fixed order: selection, typed text, spoken instruction.',
    captionZh: '一个请求按固定顺序装三部分：选中文字、补打的字、指令。',
  }, {
    caption: 'The answer streams into the card. Inserting activates the original app before pasting; a failure stays in the card.',
    captionZh: '答案流进卡片。插入会先激活原来的 app 再粘贴；失败留在卡片里，可以重试。',
  }, {
    caption: 'Translate walks the same route with a language as the instruction. An answer that looks untranslated is asked again, more firmly.',
    captionZh: '翻译走同一条路，指令换成目标语言。看着没译的答案，会更坚决地再问一次。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: a left panel sums up the Transcribe route, voice to text at the cursor. A right panel appears with the Rewrite and Translate route, selected text to an answer card and back into the app. A shared box below says both routes use one language-model connection, two pills say what Rewrite and Translate each do, and two lines list the chapter\'s six steps with the question how Voxt gets the text you point at.',
    zh: '画面按顺序形成：左侧面板回顾 Transcribe 路线，从声音到光标处的文字。右侧面板出现，是改写和翻译的路线：选中的文字到答案卡再回到 app。下方一个共用的框说两条路用同一个语言模型连接，两个小牌分别说改写和翻译做什么，最后两行列出本章六步和 Voxt 怎样拿到你指着的文字这个问题。',
  }, {
    en: 'The picture builds in order: an app window with a selected sentence. Path 1 appears, an Accessibility read that returns the sentence. A guard strip says blanks or one placeholder count as nothing. A settle box says a fresh command-A selection can lag, waited out with 600 milliseconds, checking every 60. Path 2 appears as four beats: held shortcut keys lift within 800 milliseconds, snapshot the clipboard, command-C with 300 milliseconds for a change, read it and put the snapshot back. Two lines add Rewrite\'s retries while the keys stay down.',
    zh: '画面按顺序形成：一个 app 窗口里有一句选中的话。第一条路出现：辅助功能读取，拿回这句话。一条守卫带说全空白或一个占位符等于没读到。一个等候框说刚按下的 command-A 选区可能还没出现，等 600 毫秒、每 60 毫秒看一次。第二条路出现，共四拍：按着的快捷键在 800 毫秒内松开、给剪贴板拍照、按 command-C 等 300 毫秒的变化、读出来并把照片放回去。最后两行补充改写时键还按着会怎样重读。',
  }, {
    en: 'The picture builds in order: a pill for the Rewrite shortcut, a box saying the microphone starts, and a card panel. The selection lands in the card as a block, a typed line and a row of up to four picture slots appear, a send strip says the shortcut again or Enter sends and Esc closes without sending, and a failure strip says a failed send comes back with everything kept and Enter sends again.',
    zh: '画面按顺序形成：一个改写快捷键的牌子、一个写着麦克风启动的框和一个卡片面板。选中的文字落成卡片里的一个块，出现一行补打的字和一排最多四张图的格子，发送条说再按快捷键或回车发送、Esc 不发送就关闭，失败条说发送失败会带着错误回来、所有内容保留、回车再发。',
  }, {
    en: 'The picture builds in order: three tagged blocks, selected text, typed text and the spoken instruction, merge into one request box. A formula line fixes the order, two strips give the cases where typed text takes the source place and where the request is the speech alone, and two lines say the card\'s latest text and pictures are read at send and win over the clipboard picture.',
    zh: '画面按顺序形成：三个带标签的块——选中的文字、补打的字和口述的指令——汇入一个请求框。一行算式固定顺序，两条带子分别给出没有选区时补打的字顶上的情况和只有语音的情况，最后两行说发送时才读卡片上最新的文字和图片，并且它们盖过剪贴板里的图。',
  }, {
    en: 'The picture builds in order: a card with the streaming answer I can come Friday, published at most every 40 milliseconds. A panel splits the two answer shapes, a JSON object with a title when writing from scratch and plain text for a follow-up. A strip shows a follow-up replaying the earlier turns, an insert strip says the original app is activated first and the answer pasted there, and three lines add the full-screen panel, the repeated checks and a failure staying in the card.',
    zh: '画面按顺序形成：一张卡片里答案 I can come Friday 流进来，最多每 40 毫秒发布一次。一个面板分开两种答案形态：从头写起时是带标题的 JSON 对象，追问时是纯文本。一条带子展示追问会重放之前的轮次，插入条说先激活原来的 app 再把答案粘贴进去，最后三行补充全屏时的面板、插入前再跑一遍检查和失败留在卡片里。',
  }, {
    en: 'The picture builds in order: two entry rows, translate what you said and translate the selection directly with no speech. A rule strip says an answer comes back in your main language when no language is picked. A check panel lists three signs an answer looks untranslated and says the instruction tags are ignored. A retry strip says Voxt asks again more firmly and keeps the first answer when the retry fails. The closing question asks how one spoken trigger types a whole saved passage.',
    zh: '画面按顺序形成：两行入口，翻译你说的话和直接翻译选区不需要说话。一条规则带说没挑语言时答案译回你的主要语言。一个检查面板列出答案看着没译的三种迹象，并说指令标签不算数。一条重试带说 Voxt 会更坚决地再问一次、重试失败就保留第一个答案。收尾问题问一句暗号怎样打出存好的一整段。',
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
  const H = $derived((phone ? [706, 886, 766, 746, 786, 806] : [560, 560, 560, 560, 560, 560])[step]);
  const LP_PHONE = [592, 842, 722, 702, 742, 762];

  const PHASE_COUNTS = [5, 6, 5, 5, 5, 5];
  const PHASE_MS = 900;
  const REST_MS = 2200;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    phase = 0;
    const count = PHASE_COUNTS[s];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const motionFrames = (isPhone: boolean, s: number): { x: number; y: number; w: number; h: number }[] => (isPhone ? [
    [{ x: 15, y: 60, w: 270, h: 170 }, { x: 15, y: 246, w: 270, h: 170 }, { x: 15, y: 432, w: 270, h: 52 }, { x: 15, y: 500, w: 270, h: 88 }, { x: 15, y: 600, w: 270, h: 78 }],
    [{ x: 15, y: 58, w: 270, h: 74 }, { x: 15, y: 148, w: 270, h: 120 }, { x: 15, y: 410, w: 270, h: 110 }, { x: 15, y: 284, w: 270, h: 110 }, { x: 15, y: 536, w: 270, h: 240 }, { x: 15, y: 792, w: 270, h: 44 }],
    [{ x: 15, y: 52, w: 270, h: 104 }, { x: 30, y: 192, w: 240, h: 64 }, { x: 30, y: 268, w: 240, h: 128 }, { x: 30, y: 408, w: 240, h: 88 }, { x: 15, y: 528, w: 270, h: 76 }],
    [{ x: 15, y: 52, w: 270, h: 204 }, { x: 15, y: 272, w: 270, h: 84 }, { x: 15, y: 392, w: 270, h: 64 }, { x: 15, y: 468, w: 270, h: 64 }, { x: 15, y: 548, w: 270, h: 64 }],
    [{ x: 15, y: 52, w: 270, h: 150 }, { x: 15, y: 218, w: 270, h: 150 }, { x: 15, y: 384, w: 270, h: 90 }, { x: 15, y: 490, w: 270, h: 80 }, { x: 15, y: 588, w: 270, h: 64 }],
    [{ x: 15, y: 52, w: 270, h: 180 }, { x: 15, y: 248, w: 270, h: 72 }, { x: 15, y: 336, w: 270, h: 160 }, { x: 15, y: 512, w: 270, h: 72 }, { x: 15, y: 610, w: 270, h: 110 }],
  ] : [
    [{ x: 20, y: 70, w: 320, h: 200 }, { x: 380, y: 70, w: 320, h: 200 }, { x: 160, y: 306, w: 400, h: 52 }, { x: 130, y: 384, w: 460, h: 46 }, { x: 20, y: 456, w: 680, h: 62 }],
    [{ x: 20, y: 70, w: 680, h: 86 }, { x: 20, y: 166, w: 330, h: 118 }, { x: 20, y: 294, w: 680, h: 70 }, { x: 370, y: 166, w: 330, h: 118 }, { x: 20, y: 374, w: 680, h: 112 }, { x: 20, y: 492, w: 680, h: 42 }],
    [{ x: 20, y: 110, w: 170, h: 164 }, { x: 250, y: 100, w: 430, h: 56 }, { x: 250, y: 172, w: 430, h: 120 }, { x: 250, y: 308, w: 430, h: 48 }, { x: 20, y: 462, w: 680, h: 56 }],
    [{ x: 20, y: 86, w: 300, h: 224 }, { x: 380, y: 150, w: 320, h: 120 }, { x: 20, y: 380, w: 680, h: 44 }, { x: 20, y: 436, w: 680, h: 44 }, { x: 20, y: 492, w: 680, h: 42 }],
    [{ x: 20, y: 70, w: 330, h: 190 }, { x: 370, y: 70, w: 330, h: 190 }, { x: 20, y: 280, w: 680, h: 60 }, { x: 20, y: 356, w: 680, h: 60 }, { x: 20, y: 432, w: 680, h: 62 }],
    [{ x: 20, y: 70, w: 680, h: 80 }, { x: 20, y: 170, w: 680, h: 44 }, { x: 20, y: 234, w: 680, h: 120 }, { x: 20, y: 374, w: 680, h: 54 }, { x: 20, y: 452, w: 680, h: 78 }],
  ])[s];
  const frames = $derived(motionFrames(phone, step));
  const focus = $derived(frames[Math.min(phase, frames.length - 1)]);

  // The constructed example (src/voxt/numbers.ts holds the code constants):
  // a wishy-washy line, an instruction, and the rewritten answer.
  const selText = t('i might be able to come friday, not sure yet', 'i might be able to come friday, not sure yet');
  const selShort = t('i might be able to come friday…', 'i might be able to come friday…');
  const typedText = t('add the time', 'add the time');
  const instruction = t('make it sound sure', 'make it sound sure');
  const answer = t('I can come Friday, at 3 pm.', 'I can come Friday, at 3 pm.');
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="rt-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x={W / 2} y={phone ? 24 : 27} text-anchor="middle" class="title">{phone ? t('REWRITE & TRANSLATE', '改写与翻译 · 从文字出发') : t('REWRITE & TRANSLATE · FROM TEXT, NOT VOICE', '改写与翻译 · 从文字出发，不从声音')}</text>
        <text x={W / 2} y={phone ? 46 : 50} text-anchor="middle" class="subtitle">{t('two more routes into the same language model', '通往同一个语言模型的另外两条路')}</text>
        {#if !phone}
          <rect x="20" y="70" width="320" height="200" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="96" class="label">{t('TRANSCRIBE · your voice (Ch. 1–6)', 'TRANSCRIBE · 你的声音（第 1–6 章）')}</text>
          <text x="40" y="130" class="detail">{t('you speak a sentence', '你说一句话')}</text>
          <text x="40" y="156" class="detail">{t('↓ microphone → recognition → clean-up', '↓ 麦克风 → 识别 → 整理')}</text>
          <text x="40" y="182" class="detail">{t('↓', '↓')}</text>
          <text x="40" y="208" class="detail">{t('text lands at the cursor', '文字落在光标处')}</text>
          <rect x="380" y="70" width="320" height="200" rx="10" fill="none" stroke="var(--fg)" stroke-dasharray="6 5" />
          {#if phase >= 1}
            <rect x="380" y="70" width="320" height="200" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="400" y="96" class="label">{t('REWRITE · TRANSLATE · text you point at', 'REWRITE · TRANSLATE · 你指着的文字')}</text>
            <text x="400" y="130" class="detail">{t('you select text in any app', '你在任意 app 里选中文字')}</text>
            <text x="400" y="156" class="detail">{t('↓ the answer card', '↓ 答案卡')}</text>
            <text x="400" y="182" class="detail">{t('↓', '↓')}</text>
            <text x="400" y="208" class="detail">{t('text goes back into that app', '文字放回那个 app')}</text>
          {/if}
          {#if phase >= 2}
            <line x1="180" y1="270" x2="280" y2="306" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
            <line x1="540" y1="270" x2="440" y2="306" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
            <rect x="160" y="306" width="400" height="52" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="360" y="337" text-anchor="middle" class="label blue">{t('one language-model connection (Ch. 5)', '同一个语言模型连接（第 5 章）')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="130" y="384" width="220" height="46" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="240" y="412" text-anchor="middle" class="detail">{t('REWRITE · change what you wrote', '改写 · 改动你写的文字')}</text>
            <rect x="370" y="384" width="220" height="46" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="480" y="412" text-anchor="middle" class="detail">{t('TRANSLATE · another language', '翻译 · 换成另一种语言')}</text>
          {/if}
          {#if phase >= 4}
            <text x="28" y="472" class="pt">·</text>
            <text x="38" y="472" class="detail">{t('this chapter: the map (1) · reading the selection (2) · the card (3)', '本章：地图（1）· 读选区（2）· 卡片（3）')}</text>
            <text x="28" y="494" class="pt">·</text>
            <text x="38" y="494" class="detail">{t('one request (4) · the answer back (5) · Translate (6)', '一个请求（4）· 答案回来（5）· 翻译（6）')}</text>
            <text x={W / 2} y="522" text-anchor="middle" class="cut">{t('first: how does Voxt get the text you point at?', '先看：Voxt 怎样拿到你指着的文字？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: rewrite_box.go; internal/session/write.go.', '出处：rewrite_box.go；internal/session/write.go。')}</text>
        {:else}
          <rect x="15" y="60" width="270" height="170" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="84" class="label">{t('TRANSCRIBE (Ch. 1–6)', 'TRANSCRIBE（第 1–6 章）')}</text>
          <text x="30" y="114" class="detail">{t('you speak a sentence', '你说一句话')}</text>
          <text x="30" y="140" class="detail">{t('↓ recognition → clean-up', '↓ 识别 → 整理')}</text>
          <text x="30" y="166" class="detail">{t('↓ text at the cursor', '↓ 文字落在光标处')}</text>
          <rect x="15" y="246" width="270" height="170" rx="10" fill="none" stroke="var(--fg)" stroke-dasharray="6 5" />
          {#if phase >= 1}
            <rect x="15" y="246" width="270" height="170" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="270" class="label">{t('REWRITE · TRANSLATE', 'REWRITE · TRANSLATE')}</text>
            <text x="30" y="300" class="detail">{t('you select text in an app', '你在 app 里选中文字')}</text>
            <text x="30" y="326" class="detail">{t('↓ the answer card', '↓ 答案卡')}</text>
            <text x="30" y="352" class="detail">{t('↓ back into that app', '↓ 放回那个 app')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="432" width="270" height="52" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" />
            <text x="150" y="454" text-anchor="middle" class="label blue">{t('one model connection', '同一个模型连接')}</text>
            <text x="150" y="474" text-anchor="middle" class="label blue">{t('(Ch. 5)', '（第 5 章）')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="500" width="270" height="40" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="150" y="525" text-anchor="middle" class="detail">{t('REWRITE · change what you wrote', '改写 · 改动你写的文字')}</text>
            <rect x="15" y="548" width="270" height="40" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="150" y="573" text-anchor="middle" class="detail">{t('TRANSLATE · another language', '翻译 · 换成另一种语言')}</text>
          {/if}
          {#if phase >= 4}
            <text x="22" y="610" class="pt">·</text>
            <text x="32" y="610" class="detail">{t('map (1) · selection (2) · card (3)', '地图（1）· 选区（2）· 卡片（3）')}</text>
            <text x="22" y="632" class="pt">·</text>
            <text x="32" y="632" class="detail">{t('request (4) · answer (5) · Translate (6)', '请求（4）· 答案（5）· 翻译（6）')}</text>
            <text x={W / 2} y="656" text-anchor="middle" class="cut">{t('first: how does Voxt get', '先看：Voxt 怎样拿到')}</text>
            <text x={W / 2} y="678" text-anchor="middle" class="cut">{t('the text you point at?', '你指着的文字？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: rewrite_box.go; write.go.', '出处：rewrite_box.go；write.go。')}</text>
        {/if}
      {/if}

      {#if step === 1}
        <text x={W / 2} y={phone ? 24 : 27} text-anchor="middle" class="title">{t('READING THE SELECTION · TWO PATHS', '读选区 · 两条路')}</text>
        <text x={W / 2} y={phone ? 46 : 50} text-anchor="middle" class="subtitle">{t('the selection = the text you marked in another app', '选区 = 你在别的 app 里选中的文字')}</text>
        {#if !phone}
          <rect x="20" y="70" width="680" height="86" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="96" class="label">{t('ANY APP', '任意一个 APP')}</text>
          <rect x="40" y="108" width="352" height="26" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="52" y="126" class="mono">{selText}</text>
          <text x="412" y="126" class="detail">{t('← you selected this', '← 你选中了这句')}</text>
          {#if phase >= 1}
            <rect x="20" y="166" width="330" height="118" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="192" class="label blue">{t('PATH 1 · Accessibility read', '第一条路 · 辅助功能读取')}</text>
            <text x="40" y="218" class="detail">{t('the system lets apps share their text (Ch. 2)', '系统允许 app 分享自己的文字（第 2 章）')}</text>
            <text x="40" y="256" class="mono">{t('✓ i might be able to come friday…', '✓ i might be able to come friday…')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="294" width="680" height="70" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="318" class="label">{t('a read of blanks or one placeholder counts as nothing', '读到全空白或一个占位符，等于没读到')}</text>
            <text x="40" y="344" class="mono">{t('"" · "   " · U+FFFC = no reading', '"" · "   " · U+FFFC = 没读到')}</text>
            <text x="360" y="344" class="detail">{t('U+FFFC = one marker editors put in a selection to stand for a picture', 'U+FFFC = 编辑器在选区里代表一张图的记号')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="370" y="166" width="330" height="118" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="390" y="192" class="label">{t('⌘A in the same motion can lag', '同一个动作里的 ⌘A 可能慢半拍')}</text>
            <text x="390" y="218" class="detail">{t('a selection you just made may not show yet', '刚选中的内容可能还没出现')}</text>
            <text x="390" y="256" class="formula">{`wait out a settle: ${VOXT_SELECTION_SETTLE_MS} ms · every ${VOXT_SELECTION_POLL_MS} ms`}</text>
          {/if}
          {#if phase >= 4}
            <rect x="20" y="374" width="680" height="112" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="400" class="label blue">{t('PATH 2 · copy with ⌘C (only in apps that allow it)', '第二条路 · 用 ⌘C 复制（只在允许的 app 里）')}</text>
            <rect x="36" y="414" width="152" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="48" y="436" class="detail">{t('1 · held shortcut', '1 · 按着的快捷键')}</text>
            <text x="48" y="456" class="detail">{`keys lift · ≤ ${VOXT_SELECTION_MODIFIER_WAIT_MS} ms`}</text>
            <line x1="190" y1="461" x2="198" y2="461" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
            <rect x="202" y="414" width="152" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="214" y="436" class="detail">{t('2 · snapshot', '2 · 给剪贴板')}</text>
            <text x="214" y="456" class="detail">{t('the clipboard', '拍一张照')}</text>
            <line x1="356" y1="461" x2="364" y2="461" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
            <rect x="368" y="414" width="152" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="380" y="436" class="detail">{t('3 · ⌘C · wait for', '3 · ⌘C · 等变化')}</text>
            <text x="380" y="456" class="detail">{`a change · ≤ ${VOXT_SELECTION_COPY_MS} ms`}</text>
            <line x1="522" y1="461" x2="530" y2="461" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
            <rect x="534" y="414" width="152" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="546" y="436" class="detail">{t('4 · read it · put the', '4 · 读出来 · 把照片')}</text>
            <text x="546" y="456" class="detail">{t('snapshot back', '放回去')}</text>
          {/if}
          {#if phase >= 5}
            <text x="28" y="506" class="pt">·</text>
            <text x="38" y="506" class="detail">{`keys still down → the helper skips ⌘C and reads again every ${VOXT_SELECTION_RETRY_MS} ms (Rewrite reads while you speak)`}</text>
            <text x="28" y="528" class="pt">·</text>
            <text x="38" y="528" class="detail">{`the last read happens when the recording ends; a long selection's copy gets ${VOXT_REWRITE_COPY_MS} ms`}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/session/run_selection.go; docs/helper-protocol.md.', '出处：internal/session/run_selection.go；docs/helper-protocol.md。')}</text>
        {:else}
          <rect x="15" y="58" width="270" height="74" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="80" class="label">{t('ANY APP', '任意一个 APP')}</text>
          <rect x="30" y="92" width="218" height="24" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="40" y="108" class="mono">{selShort}</text>
          {#if phase >= 1}
            <rect x="15" y="148" width="270" height="120" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="172" class="label blue">{t('PATH 1 · Accessibility', '第一条路 · 辅助功能')}</text>
            <text x="30" y="198" class="detail">{t('the system lets apps', '系统允许 app')}</text>
            <text x="30" y="220" class="detail">{t('share their text (Ch. 2)', '分享文字（第 2 章）')}</text>
            <text x="30" y="252" class="mono">{t('✓ the sentence', '✓ 拿到了这句话')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="410" width="270" height="110" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="434" class="label">{t('blanks or one placeholder', '全空白或一个占位符')}</text>
            <text x="30" y="456" class="label">{t('count as nothing', '等于没读到')}</text>
            <text x="30" y="482" class="mono">{t('"" · " " · U+FFFC', '"" · " " · U+FFFC')}</text>
            <text x="30" y="506" class="detail">{t('U+FFFC = a picture marker', 'U+FFFC = 图片的记号')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="284" width="270" height="110" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="308" class="label">{t('⌘A can lag', '⌘A 可能慢半拍')}</text>
            <text x="30" y="334" class="detail">{t('a fresh selection may', '刚选中的内容')}</text>
            <text x="30" y="356" class="detail">{t('not show yet', '可能还没出现')}</text>
            <text x="30" y="382" class="formula">{`${VOXT_SELECTION_SETTLE_MS} ms · every ${VOXT_SELECTION_POLL_MS} ms`}</text>
          {/if}
          {#if phase >= 4}
            <rect x="15" y="536" width="270" height="240" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="560" class="label blue">{t('PATH 2 · ⌘C (if allowed)', '第二条路 · ⌘C（若允许）')}</text>
            <rect x="30" y="576" width="240" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="42" y="600" class="detail">{`1 · held keys lift · ≤ ${VOXT_SELECTION_MODIFIER_WAIT_MS} ms`}</text>
            <rect x="30" y="624" width="240" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="42" y="648" class="detail">{t('2 · snapshot the clipboard', '2 · 给剪贴板拍照')}</text>
            <rect x="30" y="672" width="240" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="42" y="696" class="detail">{`3 · ⌘C · wait · ≤ ${VOXT_SELECTION_COPY_MS} ms`}</text>
            <rect x="30" y="720" width="240" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="42" y="744" class="detail">{t('4 · read · put it back', '4 · 读出 · 把照片放回')}</text>
          {/if}
          {#if phase >= 5}
            <text x="22" y="806" class="pt">·</text>
            <text x="32" y="806" class="detail">{`keys down → skip ⌘C, retry every ${VOXT_SELECTION_RETRY_MS} ms`}</text>
            <text x="22" y="828" class="pt">·</text>
            <text x="32" y="828" class="detail">{`last read at stop · long copy ${VOXT_REWRITE_COPY_MS} ms`}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: run_selection.go;', '出处：run_selection.go；')}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('docs/helper-protocol.md.', 'docs/helper-protocol.md。')}</text>
        {/if}
      {/if}

      {#if step === 2}
        <text x={W / 2} y={phone ? 24 : 27} text-anchor="middle" class="title">{t('THE CARD · OPENS WITH THE MICROPHONE', '输入卡 · 和麦克风一起来')}</text>
        <text x={W / 2} y={phone ? 46 : 50} text-anchor="middle" class="subtitle">{t('one press of the Rewrite shortcut does both', '按一下改写快捷键，两件事同时发生')}</text>
        {#if !phone}
          <rect x="20" y="110" width="170" height="60" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="105" y="136" text-anchor="middle" class="detail">{t('you press the', '你按下')}</text>
          <text x="105" y="156" text-anchor="middle" class="detail">{t('Rewrite shortcut', '改写快捷键')}</text>
          <line x1="105" y1="170" x2="105" y2="206" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
          <rect x="20" y="210" width="170" height="60" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="105" y="236" text-anchor="middle" class="detail">{t('the microphone', '麦克风')}</text>
          <text x="105" y="256" text-anchor="middle" class="detail">{t('starts', '开始录音')}</text>
          <line x1="190" y1="200" x2="230" y2="200" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
          <rect x="230" y="70" width="470" height="380" rx="10" fill="none" stroke="var(--fg)" stroke-dasharray="6 5" />
          {#if phase >= 1}
            <rect x="230" y="70" width="470" height="380" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="250" y="94" class="label">{t('THE CARD', '这张卡片')}</text>
            <rect x="250" y="106" width="430" height="56" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="266" y="128" class="label blue">{t('SELECTED TEXT', '选中的文字')}</text>
            <text x="266" y="150" class="mono">{selText}</text>
          {/if}
          {#if phase >= 2}
            <rect x="250" y="178" width="430" height="46" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="266" y="206" class="detail">{`TYPED · ${typedText}`}</text>
            <rect x="250" y="240" width="430" height="60" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            {#each Array(VOXT_BOX_MAX_IMAGES) as _, i}
              <rect x={266 + i * 58} y="252" width="44" height="36" rx="6" fill="none" stroke="var(--fg)" stroke-dasharray="4 3" />
            {/each}
            <text x="520" y="276" class="detail">{t(`paste or drop · up to ${VOXT_BOX_MAX_IMAGES} pictures`, `粘贴或拖入 · 最多 ${VOXT_BOX_MAX_IMAGES} 张图`)}</text>
          {/if}
          {#if phase >= 3}
            <rect x="250" y="316" width="430" height="56" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="266" y="340" class="detail">{t('shortcut again or Enter · sends', '再按快捷键或回车 · 发送')}</text>
            <text x="266" y="362" class="detail">{t('Esc · closes without sending', 'Esc · 不发送就关闭')}</text>
          {/if}
          {#if phase >= 4}
            <rect x="20" y="462" width="680" height="56" rx="10" fill="var(--bg)" stroke="var(--eos)" />
            <text x="40" y="486" class="label">{t('a send that fails comes back with the error', '发送失败会带着错误回来')}</text>
            <text x="40" y="508" class="detail">{t('everything kept · Enter sends again', '所有内容都保留 · 回车再发一次')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`Source: rewrite_box.go — the box holds at most ${VOXT_BOX_MAX_IMAGES} pictures.`, `出处：rewrite_box.go —— 卡片最多装 ${VOXT_BOX_MAX_IMAGES} 张图。`)}</text>
        {:else}
          <rect x="15" y="52" width="270" height="44" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="150" y="79" text-anchor="middle" class="detail">{t('you press the Rewrite shortcut', '你按下改写快捷键')}</text>
          <rect x="15" y="112" width="270" height="44" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="150" y="139" text-anchor="middle" class="detail">{t('the microphone starts', '麦克风开始录音')}</text>
          <rect x="15" y="172" width="270" height="330" rx="10" fill="none" stroke="var(--fg)" stroke-dasharray="6 5" />
          {#if phase >= 1}
            <rect x="15" y="172" width="270" height="330" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="194" class="label">{t('THE CARD', '这张卡片')}</text>
            <rect x="30" y="204" width="240" height="60" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="42" y="226" class="label blue">{t('SELECTED TEXT', '选中的文字')}</text>
            <text x="42" y="248" class="mono">{selShort}</text>
          {/if}
          {#if phase >= 2}
            <rect x="30" y="280" width="240" height="44" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="42" y="306" class="detail">{`TYPED · ${typedText}`}</text>
            <rect x="30" y="340" width="240" height="56" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            {#each Array(VOXT_BOX_MAX_IMAGES) as _, i}
              <rect x={42 + i * 46} y="350" width="36" height="30" rx="6" fill="none" stroke="var(--fg)" stroke-dasharray="4 3" />
            {/each}
            <text x="228" y="370" class="detail">{`≤ ${VOXT_BOX_MAX_IMAGES}`}</text>
          {/if}
          {#if phase >= 3}
            <rect x="30" y="412" width="240" height="76" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="42" y="436" class="detail">{t('shortcut again / Enter', '再按快捷键 / 回车')}</text>
            <text x="42" y="458" class="detail">{t('· sends', '· 发送')}</text>
            <text x="42" y="480" class="detail">{t('Esc closes · nothing sent', 'Esc 关闭 · 不发送')}</text>
          {/if}
          {#if phase >= 4}
            <rect x="15" y="528" width="270" height="76" rx="10" fill="var(--bg)" stroke="var(--eos)" />
            <text x="30" y="552" class="label">{t('a failed send comes back', '发送失败会回来')}</text>
            <text x="30" y="576" class="detail">{t('everything kept', '所有内容保留')}</text>
            <text x="30" y="596" class="detail">{t('Enter sends again', '回车再发一次')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`Source: rewrite_box.go · ≤ ${VOXT_BOX_MAX_IMAGES} pictures.`, `出处：rewrite_box.go · 最多 ${VOXT_BOX_MAX_IMAGES} 张图。`)}</text>
        {/if}
      {/if}

      {#if step === 3}
        <text x={W / 2} y={phone ? 24 : 27} text-anchor="middle" class="title">{t('ONE REQUEST · A FIXED ORDER', '一个请求 · 固定顺序')}</text>
        <text x={W / 2} y={phone ? 46 : 50} text-anchor="middle" class="subtitle">{t('the parts always travel in the same order', '几个部分永远按同一个顺序走')}</text>
        {#if !phone}
          <rect x="20" y="86" width="300" height="64" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="36" y="110" class="label blue">{t('<selected_text>', '<selected_text>')}</text>
          <text x="36" y="134" class="mono">{selShort}</text>
          <rect x="20" y="166" width="300" height="64" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="36" y="190" class="label">{t('<typed_text>', '<typed_text>')}</text>
          <text x="36" y="214" class="mono">{typedText}</text>
          <rect x="20" y="246" width="300" height="64" rx="8" fill="var(--bg)" stroke="var(--fg)" />
          <text x="36" y="270" class="label">{t('<instruction>', '<instruction>')}</text>
          <text x="36" y="294" class="mono">{t('spoken: "make it sound sure"', '口述："make it sound sure"')}</text>
          {#if phase >= 1}
            <line x1="320" y1="118" x2="390" y2="190" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
            <line x1="320" y1="198" x2="390" y2="210" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
            <line x1="320" y1="278" x2="390" y2="230" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#rt-arrow)" />
            <rect x="396" y="150" width="304" height="120" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="548" y="196" text-anchor="middle" class="label">{t('ONE REQUEST', '一个请求')}</text>
            <text x="548" y="224" text-anchor="middle" class="detail">{t('to the language model', '发给语言模型')}</text>
            <text x={W / 2} y="346" text-anchor="middle" class="formula">{t('selection → typed → instruction · always this order', '选中文字 → 补打的字 → 指令 · 永远这个顺序')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="380" width="680" height="44" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="407" class="detail">{t("nothing selected? what you typed takes the source's place — the order stays", '没选中文字？你补打的字顶上来源的位置 —— 顺序不变')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="436" width="680" height="44" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="463" class="detail">{t('nothing selected or typed? the request is the speech alone', '没选中也没补打？请求里只有口述的指令')}</text>
          {/if}
          {#if phase >= 4}
            <text x="28" y="506" class="pt">·</text>
            <text x="38" y="506" class="detail">{t("text and pictures are read off the card when the answer is asked for", '要发送时才读卡片上最新的文字和图片')}</text>
            <text x="28" y="528" class="pt">·</text>
            <text x="38" y="528" class="detail">{t("they win over the clipboard's picture; a window that will not be sent is never shot", '它们盖过剪贴板里的图；不会发送的窗口不会被截图')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/session/write.go; internal/compose/compose.go (RewriteMessage).', '出处：internal/session/write.go；internal/compose/compose.go（RewriteMessage）。')}</text>
        {:else}
          <rect x="15" y="52" width="270" height="60" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="30" y="74" class="label blue">{t('<selected_text>', '<selected_text>')}</text>
          <text x="30" y="98" class="mono">{selShort}</text>
          <rect x="15" y="124" width="270" height="60" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="30" y="146" class="label">{t('<typed_text>', '<typed_text>')}</text>
          <text x="30" y="170" class="mono">{typedText}</text>
          <rect x="15" y="196" width="270" height="60" rx="8" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="218" class="label">{t('<instruction>', '<instruction>')}</text>
          <text x="30" y="242" class="mono">{t('spoken instruction', '口述的指令')}</text>
          {#if phase >= 1}
            <rect x="15" y="272" width="270" height="64" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="150" y="298" text-anchor="middle" class="label">{t('ONE REQUEST', '一个请求')}</text>
            <text x="150" y="322" text-anchor="middle" class="detail">{t('to the language model', '发给语言模型')}</text>
            <text x={W / 2} y="366" text-anchor="middle" class="formula">{t('selected → typed → instruction', '选中 → 补打 → 指令')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="392" width="270" height="64" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="416" class="detail">{t('nothing selected? what you', '没选中文字？')}</text>
            <text x="30" y="440" class="detail">{t("typed takes the source's place", '补打的字顶上来源位置')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="468" width="270" height="64" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="492" class="detail">{t('nothing selected or typed?', '没选中也没补打？')}</text>
            <text x="30" y="516" class="detail">{t('the request is the speech alone', '请求里只有口述指令')}</text>
          {/if}
          {#if phase >= 4}
            <text x="22" y="560" class="pt">·</text>
            <text x="32" y="560" class="detail">{t('card text & pictures read at send', '发送时才读卡片的字和图')}</text>
            <text x="22" y="582" class="pt">·</text>
            <text x="32" y="582" class="detail">{t('they win over the clipboard picture', '它们盖过剪贴板的图')}</text>
            <text x="22" y="604" class="pt">·</text>
            <text x="32" y="604" class="detail">{t('an unsent window is never shot', '不发送的窗口不截图')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: write.go; compose.go.', '出处：write.go；compose.go。')}</text>
        {/if}
      {/if}

      {#if step === 4}
        <text x={W / 2} y={phone ? 24 : 27} text-anchor="middle" class="title">{t('THE ANSWER COMES BACK', '答案回来')}</text>
        <text x={W / 2} y={phone ? 46 : 50} text-anchor="middle" class="subtitle">{t('into the card first, then back into the app you came from', '先流进卡片，再放回你原来的 app')}</text>
        {#if !phone}
          <rect x="20" y="70" width="330" height="190" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="96" class="label">{t('THE CARD', '这张卡片')}</text>
          <rect x="40" y="110" width="290" height="52" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="56" y="142" class="mono">{answer}</text>
          <text x="40" y="196" class="detail">{t('the answer streams in', '答案流进来')}</text>
          <text x="40" y="222" class="formula">{`at most every ${VOXT_DRAFT_EVERY_MS} ms (0.04 s)`}</text>
          {#if phase >= 1}
            <rect x="370" y="70" width="330" height="190" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="390" y="96" class="label">{t('TWO SHAPES', '两种形态')}</text>
            <text x="390" y="128" class="detail">{t('writing from scratch → a JSON answer', '从头写起 → 一个 JSON 答案')}</text>
            <text x="390" y="152" class="mono">{t('{title, content} · a titled card', '{title, content} · 带标题的卡')}</text>
            <text x="390" y="196" class="detail">{t('a follow-up → plain text,', '追问 → 纯文本，')}</text>
            <text x="390" y="220" class="detail">{t('as a conversation does', '像对话一样')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="280" width="680" height="60" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="304" class="label">{t('a follow-up replays the earlier turns as the conversation', '追问会把之前的轮次重放进对话')}</text>
            <text x="40" y="328" class="mono">{t('user: make it sound sure → assistant: I can come Friday… → user: shorter', '用户：make it sound sure → 助手：I can come Friday… → 用户：shorter')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="356" width="680" height="60" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="40" y="380" class="label blue">{t('INSERT', '插入')}</text>
            <text x="40" y="404" class="detail">{t('activate the original app first (the Ch. 7 checks), then paste the answer there', '先激活原来的 app（第 7 章的检查），再把答案粘贴进去')}</text>
          {/if}
          {#if phase >= 4}
            <text x="28" y="446" class="pt">·</text>
            <text x="38" y="446" class="detail">{t('over a full-screen app the card is a panel — an ordinary window cannot show there', '在全屏 app 上，卡片是一个面板 —— 普通窗口在那里显示不出来')}</text>
            <text x="28" y="468" class="pt">·</text>
            <text x="38" y="468" class="detail">{t('the Ch. 7 checks run again before inserting; a refused insert keeps the answer in the card', '插入前第 7 章的检查再跑一遍；被拒绝的插入会把答案留在卡片里')}</text>
            <text x="28" y="490" class="pt">·</text>
            <text x="38" y="490" class="detail">{t('a failed request stays in the card, to try again', '失败的请求留在卡片里，可以重试')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/session/write.go; session_answer.go; rewrite_box.go.', '出处：internal/session/write.go；session_answer.go；rewrite_box.go。')}</text>
        {:else}
          <rect x="15" y="52" width="270" height="150" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="76" class="label">{t('THE CARD', '这张卡片')}</text>
          <rect x="30" y="88" width="240" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="42" y="117" class="mono">{answer}</text>
          <text x="30" y="162" class="detail">{t('streams in', '流进来')}</text>
          <text x="30" y="186" class="formula">{`every ${VOXT_DRAFT_EVERY_MS} ms (0.04 s)`}</text>
          {#if phase >= 1}
            <rect x="15" y="218" width="270" height="150" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="242" class="label">{t('TWO SHAPES', '两种形态')}</text>
            <text x="30" y="270" class="detail">{t('from scratch → JSON', '从头写起 → JSON')}</text>
            <text x="30" y="294" class="mono">{t('{title, content}', '{title, content}')}</text>
            <text x="30" y="330" class="detail">{t('a follow-up →', '追问 →')}</text>
            <text x="30" y="352" class="detail">{t('plain text', '纯文本')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="384" width="270" height="90" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="408" class="label">{t('a follow-up replays', '追问会重放')}</text>
            <text x="30" y="432" class="label">{t('the earlier turns', '之前的轮次')}</text>
            <text x="30" y="460" class="mono">{t('user → assistant → user', '用户 → 助手 → 用户')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="490" width="270" height="80" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="30" y="514" class="label blue">{t('INSERT', '插入')}</text>
            <text x="30" y="538" class="detail">{t('activate the app first (Ch. 7)', '先激活原 app（第 7 章）')}</text>
            <text x="30" y="560" class="detail">{t('then paste the answer there', '再把答案粘贴进去')}</text>
          {/if}
          {#if phase >= 4}
            <text x="22" y="602" class="pt">·</text>
            <text x="32" y="602" class="detail">{t('full-screen app → the card is a panel', '全屏 app → 卡片变成面板')}</text>
            <text x="22" y="624" class="pt">·</text>
            <text x="32" y="624" class="detail">{t('checks run again before inserting', '插入前再跑一遍检查')}</text>
            <text x="22" y="646" class="pt">·</text>
            <text x="32" y="646" class="detail">{t('a failure stays in the card', '失败留在卡片里')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: write.go; session_answer.go.', '出处：write.go；session_answer.go。')}</text>
        {/if}
      {/if}

      {#if step === 5}
        <text x={W / 2} y={phone ? 24 : 27} text-anchor="middle" class="title">{phone ? t('TRANSLATE · A LANGUAGE', '翻译 · 指令换成一种语言') : t('TRANSLATE · A LANGUAGE AS THE INSTRUCTION', '翻译 · 指令换成一种语言')}</text>
        <text x={W / 2} y={phone ? 46 : 50} text-anchor="middle" class="subtitle">{t('the same route as Rewrite, one word changed', '和改写同一条路，只换了一个词')}</text>
        {#if !phone}
          <rect x="20" y="70" width="330" height="80" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="40" y="98" class="detail">{t('you speak → translate what you said', '你说话 → 翻译你说的')}</text>
          <text x="40" y="128" class="mono">{t('明天见 → See you tomorrow.', '明天见 → See you tomorrow.')}</text>
          <rect x="370" y="70" width="330" height="80" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="390" y="98" class="detail">{t('you select → the selection translates directly', '你选中 → 直接翻译选区')}</text>
          <text x="390" y="128" class="mono">{t('no speech needed', '不需要说话')}</text>
          {#if phase >= 1}
            <rect x="20" y="170" width="680" height="44" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="197" class="detail">{t('no language picked for this text? the answer comes back in your main language · see you tomorrow → 明天见', '没给这段文字挑语言？答案译回你的主要语言 · see you tomorrow → 明天见')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="20" y="234" width="680" height="120" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="40" y="260" class="label">{t('LOOKS UNTRANSLATED? THREE SIGNS', '看着没译？三种迹象')}</text>
            <text x="48" y="288" class="pt">·</text>
            <text x="58" y="288" class="detail">{t('the answer is the source again', '答案和原文一模一样')}</text>
            <text x="48" y="310" class="pt">·</text>
            <text x="58" y="310" class="detail">{t('the whole source sits beside its translation', '原文整段摆在译文旁边')}</text>
            <text x="48" y="332" class="pt">·</text>
            <text x="58" y="332" class="detail">{t('it is mostly in the wrong script · 〈指令〉tags around a real translation are ignored', '大部分不是目标文字 · 真译文外的〈指令〉标签不算数')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="20" y="374" width="680" height="54" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="40" y="398" class="label blue">{t('ask again, more firmly (Strict)', '更坚决地再问一次（Strict）')}</text>
            <text x="40" y="420" class="detail">{t('the retry fails? keep the first answer', '再问也失败？保留第一个答案')}</text>
          {/if}
          {#if phase >= 4}
            <text x={W / 2} y="472" text-anchor="middle" class="cut">{t('Text can be rewritten and translated —', '文字能改、能译 ——')}</text>
            <text x={W / 2} y="496" text-anchor="middle" class="cut">{t('how does one spoken trigger', '说一句暗号，')}</text>
            <text x={W / 2} y="520" text-anchor="middle" class="cut">{t('type a whole saved passage?', '怎样打出存好的一整段？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: internal/session/write.go; internal/compose/translate.go.', '出处：internal/session/write.go；internal/compose/translate.go。')}</text>
        {:else}
          <rect x="15" y="52" width="270" height="84" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="76" class="detail">{t('you speak → translate it', '你说话 → 翻译它')}</text>
          <text x="30" y="106" class="mono">{t('明天见 → See you…', '明天见 → See you…')}</text>
          <rect x="15" y="148" width="270" height="84" rx="10" fill="var(--bg)" stroke="var(--fg)" />
          <text x="30" y="172" class="detail">{t('you select → translate directly', '你选中 → 直接翻译')}</text>
          <text x="30" y="202" class="mono">{t('no speech needed', '不需要说话')}</text>
          {#if phase >= 1}
            <rect x="15" y="248" width="270" height="72" rx="8" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="272" class="detail">{t('no language picked? back into', '没挑语言？译回你的')}</text>
            <text x="30" y="296" class="detail">{t('your main language', '主要语言')}</text>
          {/if}
          {#if phase >= 2}
            <rect x="15" y="336" width="270" height="160" rx="10" fill="var(--bg)" stroke="var(--fg)" />
            <text x="30" y="360" class="label">{t('LOOKS UNTRANSLATED?', '看着没译？')}</text>
            <text x="34" y="388" class="pt">·</text>
            <text x="44" y="388" class="detail">{t('= the source again', '和原文一样')}</text>
            <text x="34" y="410" class="pt">·</text>
            <text x="44" y="410" class="detail">{t('whole source beside it', '原文整段在旁边')}</text>
            <text x="34" y="432" class="pt">·</text>
            <text x="44" y="432" class="detail">{t('mostly the wrong script', '大多不是目标文字')}</text>
            <text x="30" y="470" class="detail">{t('〈指令〉tags are ignored', '〈指令〉标签不算数')}</text>
          {/if}
          {#if phase >= 3}
            <rect x="15" y="512" width="270" height="72" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="30" y="536" class="label blue">{t('ask again, more firmly', '更坚决地再问一次')}</text>
            <text x="30" y="562" class="detail">{t('retry fails → keep the first', '再失败 → 保留第一个')}</text>
          {/if}
          {#if phase >= 4}
            <text x={W / 2} y="630" text-anchor="middle" class="cut">{t('Text can be rewritten —', '文字能改、能译 ——')}</text>
            <text x={W / 2} y="654" text-anchor="middle" class="cut">{t('how does one spoken trigger', '说一句暗号，')}</text>
            <text x={W / 2} y="678" text-anchor="middle" class="cut">{t('type a saved passage?', '怎样打出存好的一整段？')}</text>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: write.go; translate.go.', '出处：write.go；translate.go。')}</text>
        {/if}
      {/if}
      {#if focus}
        <rect class="motion-focus" x={focus.x - 4} y={focus.y - 4} width={focus.w + 8} height={focus.h + 8} rx="10" fill="none" stroke="var(--eos)" stroke-width="3" />
      {/if}
      <LoopProgress ms={lapMs} {lap} x={phone ? 236 : 640} y={phone ? LP_PHONE[step] : 20} />
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 16px; font-weight: 650; fill: var(--fg); }
  .subtitle { font-size: 13px; font-weight: 600; fill: var(--accent); }
  .label { font-size: 12px; font-weight: 700; fill: var(--fg); }
  .detail { font-size: 11px; fill: var(--fg); }
  .cut { font-size: 12px; font-weight: 650; fill: var(--accent); }
  .formula { font-family: var(--mono); font-size: 12px; font-weight: 650; fill: var(--fg); }
  .mono { font-family: var(--mono); font-size: 11.5px; fill: var(--fg); }
  .blue { fill: var(--accent); }
  .footnote { font-size: 10.5px; }
  .pt { font-size: 11px; fill: var(--muted); }
  .motion-focus { pointer-events: none; transition: x 240ms, y 240ms, width 240ms, height 240ms; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .footnote { font-size: 11px; }
    .mono { font-size: 10.5px; }
  }
</style>
