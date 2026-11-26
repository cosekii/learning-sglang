<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_DICT_TERM, VOXT_DICT_ALIAS, VOXT_DICT_SECOND_TERM, VOXT_DICT_TERM_COUNT,
    VOXT_DICT_HINT_COUNT, VOXT_DICT_GLOSSARY_ALL_UP_TO,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Recognition wrote Preeya. One row maps Preeya to Priya; fixing by hand costs 11 keystrokes.',
    captionZh: '识别写成了 Preeya。词典一行把 Preeya 配到 Priya；手动改要按 11 次键。',
  }, {
    caption: 'One row helps three ways. Dictionary-wide notes are the fourth.',
    captionZh: '一行词条有三个去处。整部词典的备注是第四个。',
  }, {
    caption: 'Only enabled terms go to the speech model as hints. An alias stays out.',
    captionZh: '发给语音模型的提示只含启用的词条。别名不进去。',
  }, {
    caption: 'Aliases become the term before cleanup. This works without the language model.',
    captionZh: '别名在清理之前就换成词条。没有语言模型也照样换。',
  }, {
    caption: "Small dictionaries put the glossary in system. Large ones put matched terms at user's start, only when a line fits.",
    captionZh: '小词典把术语表放进 system。大词典只在有条目放得下时，把匹配到的词条放在 user 开头。',
  }, {
    caption: 'Dictionary-wide notes are free text for the language model. They never reach the recognizer.',
    captionZh: '全词典备注是写给语言模型的自由文字，不会到识别器。',
  }, {
    caption: 'Hints and alias replacement work without the model; the glossary and dictionary notes do not. How long does Voxt keep the recording?',
    captionZh: '提示和别名替换不需要模型；术语表和全词典备注需要。Voxt 把录音留多久？',
  }];
  const ariaLabels = [{
    en: 'Your voice says call Priya, but the speech model writes call Preeya, the wrong name. A dictionary row fixes this once: a term with its aliases, and an optional private note.',
    zh: '你的声音说 call Priya，语音模型却写成 call Preeya，名字错了。词典里一行就能一次修好：一个词条、它的别名，和可选的私有备注。',
  }, {
    en: 'One dictionary row has three parts. The term is the spelling you want. Aliases are what recognition tends to write instead. The row note is private and is not sent anywhere. The row helps in three places: speech hints from the term (a word list the recognizer can expect), alias replacement in the transcript, and a language-model glossary made only from the term and aliases (a term list the model should keep as written). The fourth destination is separate: dictionary-wide settings.Dictionary.Notes goes to the language-model prompt when notes are enabled.',
    zh: '一行词典有三部分。词条是你想要的写法，别名是识别常写成的样子，行内备注是私有的，不发送到任何地方。这行有三个去处：词条去语音模型当提示（一份给识别器的词表），别名在文字稿里换回词条，只有词条和别名组成语言模型术语表（一份让模型照写的词条表）。第四个去处来自另一处设置：整部词典的 settings.Dictionary.Notes 在备注开启时进入语言模型提示。',
  }, {
    en: 'The enabled terms alone are sent to the speech model as hints, the most recently changed first. The alias is not sent, because it is exactly what recognition gets wrong. The dictionary settings must have both the dictionary and the speech hints on. A service with fewer hint slots drops hints from the end, so the newest-changed terms stay at the front.',
    zh: '只有启用的词条会作为提示发给语音模型，最近改过的排前面。别名不发，因为别名正是识别会写错的样子。词典设置里要同时打开词典和语音提示。槽位更少的服务从末尾删提示，最近改过的词条留在前面。',
  }, {
    en: 'After recognition, enabled aliases are replaced by their term in the text, before any language-model cleanup. A Latin alias like Preeya matches whole words, ignoring case: a letter or digit outside Han, Hiragana, Katakana and Hangul on either side blocks the match. A side of the alias that ends in punctuation skips that side’s boundary check. Aliases written in Han, Hiragana, Katakana or Hangul match anywhere; when several aliases could match at the same spot, the longest wins. A term already written correctly is left alone, so this works with the language model off or failing.',
    zh: '识别之后、语言模型清理之前，启用的别名会在文字里换回词条。像 Preeya 这样的拉丁别名按整词匹配、不分大小写：旁边紧挨着汉字、平假名、片假名、韩文以外的字母或数字就不匹配。若别名某一端是标点，那一端不查边界。用汉字、平假名、片假名或韩文写的别名可以在任意位置匹配；同一位置有多个别名能匹配时，最长的胜出。已经写对的词条保持原样，所以语言模型关掉或失败时这一步照样有效。',
  }, {
    en: 'With 30 or fewer distinct enabled terms, all terms become candidates and the rendered glossary sits in the system message. With more than 30, a term becomes a candidate when the replaced text mentions it or any of its aliases; system keeps generic rules, and the rendered glossary opens the user message only when at least one candidate line is kept. The request input is call Priya after alias replacement.',
    zh: '不超过 30 个不同的启用词条时，全部成为候选，渲染出的术语表放在 system 消息里。超过 30 个时，替换后的文字提到某个词条本身或它的任一别名，那个词条才成为候选；system 只留通用规则，渲染出的术语表非空时才放在 user 开头。这次请求的输入是别名替换后的 call Priya。',
  }, {
    en: 'Dictionary-wide settings.Dictionary.Notes is free text, separate from a row’s private store.Term.Note. When enabled, it joins the language model system layers and never goes to the speech model or transcript replacement. Final messages are system, then history, then user; this request input sits only in user. Notes-off keeps the dictionary notes out of the prompt even while the dictionary is on.',
    zh: '整部词典的 settings.Dictionary.Notes 是自由文字，和行内私有的 store.Term.Note 不同。开启时，它作为单独一层进入语言模型的 system，从不去语音模型或文字稿替换。最终消息顺序是 system、history、user，这次请求的输入只在 user 里。即使词典开着，关掉备注也能让全词典备注不进提示。',
  }, {
    en: 'With the language model off or failing, the speech hints and the alias replacement still work. The glossary and dictionary-wide notes do not, because both ride in the language-model messages. The master dictionary switch turns all four off. The next chapter asks how long Voxt keeps the recording and its history.',
    zh: '语言模型关掉或失败时，语音提示和别名替换仍然有效。术语表和全词典备注不行，因为两者都随语言模型消息发送。词典总开关一关，四个都不走。下一章看 Voxt 把录音和历史留多久。',
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
  const H = $derived((phone ? [640, 720, 640, 700, 760, 620, 620] : [470, 520, 430, 450, 500, 430, 560])[step]);

  const PHASE_COUNTS = [3, 5, 3, 5, 4, 3, 4];
  const PHASE_MS = 800;
  const REST_MS = 1200;
  const motionFrames = (isPhone: boolean, s: number): { x: number; y: number; w: number; h: number }[] => (isPhone ? [
    [{ x: 28, y: 406, w: 244, h: 24 }, { x: 28, y: 436, w: 244, h: 24 }, { x: 28, y: 466, w: 244, h: 24 }],
    [{ x: 20, y: 62, w: 260, h: 132 }, { x: 20, y: 222, w: 260, h: 86 }, { x: 20, y: 320, w: 260, h: 86 }, { x: 20, y: 418, w: 260, h: 86 }, { x: 20, y: 516, w: 260, h: 86 }],
    [{ x: 20, y: 62, w: 260, h: 150 }, { x: 20, y: 244, w: 260, h: 96 }, { x: 20, y: 348, w: 260, h: 44 }],
    [{ x: 20, y: 62, w: 260, h: 58 }, { x: 20, y: 146, w: 260, h: 58 }, { x: 20, y: 230, w: 260, h: 52 }, { x: 20, y: 306, w: 260, h: 134 }, { x: 20, y: 454, w: 260, h: 70 }],
    [{ x: 20, y: 62, w: 260, h: 230 }, { x: 20, y: 308, w: 260, h: 272 }, { x: 34, y: 426, w: 232, h: 132 }, { x: 20, y: 308, w: 260, h: 272 }],
    [{ x: 20, y: 62, w: 260, h: 120 }, { x: 20, y: 212, w: 260, h: 96 }, { x: 20, y: 330, w: 260, h: 70 }],
    [{ x: 20, y: 80, w: 260, h: 66 }, { x: 20, y: 160, w: 260, h: 66 }, { x: 20, y: 240, w: 260, h: 66 }, { x: 20, y: 320, w: 260, h: 66 }],
  ] : [
    [{ x: 30, y: 305, w: 180, h: 60 }, { x: 220, y: 305, w: 180, h: 60 }, { x: 410, y: 305, w: 270, h: 60 }],
    [{ x: 20, y: 78, w: 220, h: 300 }, { x: 300, y: 66, w: 400, h: 72 }, { x: 300, y: 156, w: 400, h: 72 }, { x: 300, y: 246, w: 400, h: 72 }, { x: 300, y: 336, w: 400, h: 72 }],
    [{ x: 20, y: 72, w: 300, h: 190 }, { x: 384, y: 96, w: 316, h: 140 }, { x: 20, y: 286, w: 680, h: 72 }],
    [{ x: 20, y: 76, w: 150, h: 66 }, { x: 204, y: 76, w: 176, h: 66 }, { x: 414, y: 76, w: 286, h: 66 }, { x: 20, y: 164, w: 370, h: 176 }, { x: 410, y: 164, w: 290, h: 150 }],
    [{ x: 20, y: 72, w: 340, h: 250 }, { x: 380, y: 72, w: 320, h: 250 }, { x: 394, y: 192, w: 292, h: 130 }, { x: 380, y: 72, w: 320, h: 250 }],
    [{ x: 20, y: 72, w: 240, h: 140 }, { x: 324, y: 72, w: 376, h: 140 }, { x: 20, y: 240, w: 680, h: 90 }],
    [{ x: 20, y: 82, w: 510, h: 58 }, { x: 20, y: 154, w: 510, h: 58 }, { x: 20, y: 226, w: 510, h: 58 }, { x: 20, y: 298, w: 510, h: 58 }],
  ])[s];

  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  const routePayload = (i: number) => t(
    ['sent: Priya', 'sent: Preeya → Priya', 'sent: Priya + Preeya', 'sent: notes text'][i],
    ['发送：Priya', '发送：Preeya → Priya', '发送：Priya + Preeya', '发送：备注文字'][i],
  );
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
  const motion = $derived(motionFrames(phone, step));
  const focus = $derived(motion[Math.min(phase, motion.length - 1)]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="dict-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="dict-arrow-accent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="dict-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x="20" y="22" class="tag strong">{t('RECOGNITION HEARD IT WRONG', '识别听错了')}</text>
        <text x="20" y="46" class="tag">{t('One spoken sentence, one wrong word.', '一句话，一个词听错。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="58" rx="8" fill="var(--faint)" />
          <text x="34" y="86" class="rowlabel">{t('your voice', '你的声音')}</text>
          <text x="34" y="108" class="tag">“call Priya”</text>
          <path d="M150 120 V140" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="20" y="146" width="260" height="58" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="170" class="rowlabel">{t('speech model', '语音模型')}</text>
          <text x="34" y="192" class="tag">{t('writes words', '写出文字')}</text>
          <path d="M150 204 V224" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="20" y="230" width="260" height="58" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="254" class="rowlabel">{t('recognized text', '识别文字')}</text>
          <text x="34" y="276" class="tag strong">call <tspan fill={phase >= 2 ? 'var(--accent)' : 'var(--gen)'} font-weight={phase >= 2 ? '600' : '400'}>{phase >= 2 ? VOXT_DICT_TERM : VOXT_DICT_ALIAS}</tspan>.</text>
          {#if phase === 1}
            <text x="20" y="316" class="tag">{t('row matches: Preeya → Priya', '这一行匹配：Preeya → Priya')}</text>
          {:else}
            <text x="20" y="316" class="tag">{t('you meant: ', '你想要的：')}<tspan fill="var(--accent)" font-weight="600">call {VOXT_DICT_TERM}.</tspan></text>
          {/if}
          <text x="20" y="348" class="tag strong">{t('fixing by hand: 6 deletes + 5 keys = 11 keystrokes', '手动改：删 6 个字符 + 打 5 个字符 = 11 次按键')}</text>
        {:else}
          <rect x="20" y="66" width="150" height="82" rx="8" fill="var(--faint)" />
          <text x="34" y="92" class="rowlabel">{t('your voice', '你的声音')}</text>
          <text x="34" y="120" class="tag">“call Priya”</text>
          <path d="M170 107 H192" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="204" y="66" width="150" height="82" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="218" y="92" class="rowlabel">{t('speech model', '语音模型')}</text>
          <text x="218" y="120" class="tag">{t('writes words', '写出文字')}</text>
          <path d="M354 107 H376" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="388" y="66" width="312" height="82" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="402" y="92" class="rowlabel">{t('recognized text', '识别文字')}</text>
          <text x="402" y="122" class="tag strong">call <tspan fill={phase >= 2 ? 'var(--accent)' : 'var(--gen)'} font-weight={phase >= 2 ? '600' : '400'}>{phase >= 2 ? VOXT_DICT_TERM : VOXT_DICT_ALIAS}</tspan>.</text>
          <text x="402" y="138" class="tag">{phase === 1 ? t('the row matches Preeya → Priya', '这一行把 Preeya 匹配到 Priya') : phase >= 2 ? t('the text becomes call Priya.', '文字变成 call Priya.') : t('the wrong name lands as written', '错的名字就这样落下')}</text>
          <text x="20" y="184" class="tag">{t('you meant: ', '你想要的：')}<tspan fill="var(--accent)" font-weight="600">call {VOXT_DICT_TERM}.</tspan></text>
          <text x="20" y="208" class="tag strong">{t('fixing by hand: 6 deletes + 5 keys = 11 keystrokes', '手动改：删 6 个字符 + 打 5 个字符 = 11 次按键')}</text>
        {/if}
        {#if phone}
          <rect x="20" y="368" width="260" height="196" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="394" class="rowlabel">{t('dictionary row', '词典一行')}</text>
          <text x="34" y="422" class="tag">{t('term', '词条')}</text>
          <text x="266" y="422" text-anchor="end" class="mono strong" fill="var(--accent)">{VOXT_DICT_TERM}</text>
          <text x="34" y="452" class="tag">{t('alias', '别名')}</text>
          <text x="266" y="452" text-anchor="end" class="mono strong" fill="var(--gen)">{VOXT_DICT_ALIAS}</text>
          <text x="34" y="482" class="tag">{t('note', '备注')}</text>
          <text x="266" y="482" text-anchor="end" class="detail">{t('on the design team', '在设计团队里')}</text>
          <text x="34" y="520" class="tag">{t('the alias is what recognition writes.', '别名就是识别会写的样子。')}</text>
          <text x="34" y="544" class="tag">{t('the term is what you want instead.', '词条是你要换成的写法。')}</text>
        {:else}
          <rect x="20" y="262" width="680" height="150" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="288" class="rowlabel">{t('dictionary row', '词典一行')}</text>
          <text x="40" y="326" class="tag strong">{t('term', '词条')}</text>
          <text x="40" y="352" class="mono strong" fill="var(--accent)">{VOXT_DICT_TERM}</text>
          <text x="230" y="326" class="tag strong">{t('aliases', '别名')}</text>
          <text x="230" y="352" class="mono strong" fill="var(--gen)">{VOXT_DICT_ALIAS}</text>
          <text x="420" y="326" class="tag strong">{t('note', '备注')}</text>
          <text x="420" y="352" class="detail">{t('on the design team', '在设计团队里')}</text>
          <text x="34" y="388" class="tag">{t('the alias is what recognition writes; the term is what you want; the note is free text.', '别名是识别会写的样子；词条是你要的写法；备注是自由文字。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('source: dict.go · Term, Aliases', '出处：dict.go · Term、Aliases') : t('Source: Voxt/internal/dict/dict.go · a term carries aliases and a note', '出处：Voxt/internal/dict/dict.go · 一个词条带别名和备注')}</text>

      {:else if step === 1}
        <text x="20" y="22" class="tag strong">{t('THREE ROW ROUTES + ONE SETTINGS ROUTE', '词条三个去处 + 设置一个去处')}</text>
        <text x="20" y="46" class="tag">{t(phone ? 'hint: a word list · glossary: a term list' : 'hint: a word list for the recognizer · glossary: a term list for the model', 'hint：给识别器的词表 · glossary：给模型的词条表')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="132" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="86" class="rowlabel">{t('term', '词条')} <tspan class="mono" fill="var(--accent)">{VOXT_DICT_TERM}</tspan></text>
          <text x="34" y="116" class="rowlabel">{t('alias', '别名')} <tspan class="mono" fill="var(--gen)">{VOXT_DICT_ALIAS}</tspan></text>
          <text x="34" y="146" class="rowlabel">{t('row note', '行内备注')} <tspan class="detail">{t('private · not sent', '私有 · 不发送')}</tspan></text>
          <text x="34" y="176" class="detail">{t('the row you typed once', '你写一次的那行')}</text>
          <path d="M150 194 V214" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          {#each [
            { y: 222, name: t('1 · SPEECH MODEL', '1 · 语音模型'), part: t('term → hint', '词条 → 提示'), note: t('needs dictionary + speech hints', '需要词典 + 语音提示') },
            { y: 320, name: t('2 · TRANSCRIPT', '2 · 文字稿'), part: t('alias → term', '别名 → 词条'), note: t('needs dictionary', '需要词典') },
            { y: 418, name: t('3 · LANGUAGE MODEL · glossary', '3 · 语言模型 · 术语表'), part: t('term + alias', '词条 + 别名'), note: t('needs dictionary + glossary', '需要词典 + 术语表') },
            { y: 516, name: t('4 · LANGUAGE MODEL · dictionary notes', '4 · 语言模型 · 全词典备注'), part: t('settings.Dictionary.Notes', 'settings.Dictionary.Notes'), note: t('needs dictionary, notes not off', '需要词典，备注未关') },
          ] as d, i}
            <rect x="20" y={d.y} width="260" height="86" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y={d.y + 24} class="tag strong">{d.name}</text>
            <text x="34" y={d.y + 50} class="detail">{phase === i + 1 ? routePayload(i) : d.part}</text>
            <text x="34" y={d.y + 72} class="detail">{d.note}</text>
          {/each}
        {:else}
          <rect x="20" y="78" width="220" height="300" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="104" class="rowlabel">{t('dictionary row', '词典一行')}</text>
          <text x="34" y="140" class="tag strong">{t('term', '词条')}</text>
          <text x="34" y="162" class="mono strong" fill="var(--accent)">{VOXT_DICT_TERM}</text>
          <text x="34" y="200" class="tag strong">{t('aliases', '别名')}</text>
          <text x="34" y="222" class="mono strong" fill="var(--gen)">{VOXT_DICT_ALIAS}</text>
          <text x="34" y="260" class="tag strong">{t('row note', '行内备注')}</text>
          <text x="34" y="282" class="detail">{t('private · not sent anywhere', '私有 · 不发送到任何地方')}</text>
          <text x="34" y="348" class="detail">{t('typed once, reused every dictation', '写一次，每次听写都用')}</text>
          {#each [
            { y: 66, name: t('1 · SPEECH MODEL · hints', '1 · 语音模型 · 提示'), part: t('term only', '只发词条'), note: t('dictionary + speech hints', '词典 + 语音提示') },
            { y: 156, name: t('2 · TRANSCRIPT · replace', '2 · 文字稿 · 替换'), part: t('alias → term', '别名 → 词条'), note: t('dictionary on', '词典开着') },
            { y: 246, name: t('3 · LANGUAGE MODEL · glossary', '3 · 语言模型 · 术语表'), part: t('term + aliases', '词条 + 别名'), note: t('dictionary + glossary', '词典 + 术语表') },
            { y: 336, name: t('4 · LANGUAGE MODEL · dictionary notes', '4 · 语言模型 · 全词典备注'), part: t('settings.Dictionary.Notes', 'settings.Dictionary.Notes'), note: t('dictionary + notes on', '词典 + 备注开启') },
          ] as d, i}
            <rect x="300" y={d.y} width="400" height="72" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="314" y={d.y + 26} class="tag strong">{d.name}</text>
            <text x="314" y={d.y + 50} class="detail">{phase === i + 1 ? routePayload(i) : d.part} · {d.note}</text>
            {#if i < 3}
              <line x1="244" y1={[146, 208, 222][i]} x2="292" y2={d.y + 36} stroke="var(--muted)" stroke-width="1.5" marker-end="url(#dict-arrow)" />
            {/if}
          {/each}
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('switches: dictionary, hints, glossary, notes off', '开关：词典、提示、术语表、关闭备注') : t('Switches: dictionary on/off · speech hints · glossary · notes off', '开关：词典开/关 · 语音提示 · 术语表 · 关闭备注')}</text>

      {:else if step === 2}
        <text x="20" y="22" class="tag strong">{t('1 OF 4 · TERM → SPEECH HINTS', '第 1/4 个 · 词条 → 语音提示')}</text>
        <text x="20" y="46" class="tag">{t('A word list you give the recognizer.', '发给识别器的一份词表。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="150" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="86" class="rowlabel">{t('enabled terms (switched on)', '启用的词条（开着的）')}</text>
          <text x="34" y="114" class="mono strong">{VOXT_DICT_TERM}</text>
          <text x="34" y="140" class="mono strong">{VOXT_DICT_SECOND_TERM} <tspan class="detail" font-weight="400">{t('· second term', '· 第二个词条')}</tspan></text>
          <text x="34" y="176" class="detail">{t('newest change first', '最近改的排前面')}</text>
          <path d="M150 212 V236" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="20" y="244" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="268" class="rowlabel">{t('speech model', '语音模型')}</text>
          <text x="34" y="296" class="mono">{phase >= 2 ? `${VOXT_DICT_TERM} · ${VOXT_DICT_SECOND_TERM}` : phase >= 1 ? VOXT_DICT_TERM : t('waiting', '等待')}</text>
          <text x="34" y="320" class="detail">{phase >= 2 ? VOXT_DICT_HINT_COUNT : phase >= 1 ? 1 : 0} {t('hints', '条提示')}</text>
          <text x="20" y="370" class="tag strong" fill="var(--gen)">{VOXT_DICT_ALIAS} ✗</text>
          <text x="20" y="394" class="tag">{t('an alias is not a hint', '别名不当提示')}</text>
          <text x="20" y="418" class="tag">{t('it is what recognition gets wrong', '它正是识别会写错的')}</text>
          <text x="20" y="458" class="tag">{t('fewer slots: drop the end; newest stay first', '槽位更少：从末尾删，最近改的排前面')}</text>
        {:else}
          <rect x="20" y="72" width="300" height="190" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="98" class="rowlabel">{t('enabled terms (switched on)', '启用的词条（开着的）')}</text>
          <text x="34" y="132" class="mono strong">{VOXT_DICT_TERM}</text>
          <text x="34" y="162" class="mono strong">{VOXT_DICT_SECOND_TERM} <tspan class="detail" font-weight="400">{t('· second term', '· 第二个词条')}</tspan></text>
          <text x="34" y="200" class="detail">{t('most recently changed first', '最近改过的排前面')}</text>
          <text x="34" y="226" class="detail">{VOXT_DICT_TERM_COUNT} {t('terms →', '个词条 →')} {VOXT_DICT_HINT_COUNT} {t('hints', '条提示')}</text>
          <path d="M320 160 H372" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="384" y="96" width="316" height="140" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="398" y="122" class="rowlabel">{t('speech model', '语音模型')}</text>
          {#if phase >= 1}<text x="398" y="154" class="mono">{VOXT_DICT_TERM}</text>{:else}<text x="398" y="154" class="detail">{t('waiting', '等待')}</text>{/if}
          {#if phase >= 2}<text x="398" y="180" class="mono">{VOXT_DICT_SECOND_TERM}</text>{/if}
          <text x="398" y="212" class="detail">{phase >= 2 ? t('2 hints · no aliases', '2 条提示 · 没有别名') : phase >= 1 ? t('1 hint · no aliases', '1 条提示 · 没有别名') : t('0 hints', '0 条提示')}</text>
          <rect x="20" y="286" width="680" height="72" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="312" class="tag strong" fill="var(--gen)">{VOXT_DICT_ALIAS} ✗</text>
          <text x="34" y="338" class="detail">{t('An alias is not sent: it is what recognition gets wrong.', '别名不发：它正是识别会写错的样子。')}</text>
          <text x="20" y="390" class="tag">{t('A service with fewer slots drops hints from the end, so the newest-changed terms stay at the front.', '槽位更少的服务从末尾删，最近改过的词条就留在前面。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('dict.Hints · enabled terms, newest first', 'dict.Hints · 启用的词条，最近优先') : t('Source: dict.Hints() · enabled terms, each once, newest change first', '出处：dict.Hints() · 启用的词条各一次，最近改过优先')}</text>

      {:else if step === 3}
        <text x="20" y="22" class="tag strong">{t('2 OF 4 · ALIAS → TRANSCRIPT', '第 2/4 个 · 别名 → 文字稿')}</text>
        <text x="20" y="46" class="tag">{t('Swapped before cleanup, while it is still plain text.', '在清理之前换掉，此时还是纯文字。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="58" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="86" class="rowlabel">{t('recognized', '识别结果')}</text>
          <text x="34" y="108" class="tag">call <tspan fill="var(--gen)">Preeya</tspan>.</text>
          <path d="M150 120 V140" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="20" y="146" width="260" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="170" class="rowlabel">{phase >= 1 ? t('replaced', '替换后') : t('before the swap', '换之前')}</text>
          <text x="34" y="192" class="tag">call <tspan fill={phase >= 1 ? 'var(--accent)' : 'var(--gen)'} font-weight={phase >= 1 ? '600' : '400'}>{phase >= 1 ? VOXT_DICT_TERM : VOXT_DICT_ALIAS}</tspan>.</text>
          <path d="M150 204 V224" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="20" y="230" width="260" height="52" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="262" text-anchor="middle" class="tag">{phase >= 2 ? t('receives: call Priya.', '收到：call Priya.') : t('waits for plain text', '等纯文字')}</text>
          <text x="20" y="312" class="tag strong">{t('matching rules', '匹配规则')}</text>
          <text x="20" y="336" class="tag">{t('Preeya: whole words, any case', 'Preeya：整词，不分大小写')}</text>
          <text x="20" y="360" class="tag">{t('alias ends in punctuation: that end is not checked', '别名以标点结尾：那一端不查边界')}</text>
          <text x="20" y="384" class="tag">{t('Han / Hiragana / Katakana / Hangul: anywhere', '汉字/平假名/片假名/韩文：任意位置')}</text>
          <text x="20" y="408" class="tag">{t('same spot: the longest wins', '同一位置：最长的胜出')}</text>
          <text x="20" y="432" class="tag">{t('a correct term is left alone', '已经对的词条不动')}</text>
          <rect x="20" y="454" width="260" height="70" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="34" y="478" class="tag strong">{phase >= 4 ? t('model off: still call Priya', '模型关掉：仍是 call Priya') : t('model off or failed?', '模型关了或失败？')}</text>
          <text x="34" y="504" class="tag">{t('still “call Priya”', '仍是 “call Priya”')}</text>
        {:else}
          <rect x="20" y="76" width="150" height="66" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="100" class="rowlabel">{t('recognized', '识别结果')}</text>
          <text x="34" y="126" class="tag">call <tspan fill="var(--gen)">Preeya</tspan>.</text>
          <path d="M170 109 H192" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="204" y="76" width="176" height="66" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="218" y="100" class="rowlabel">{phase >= 1 ? t('replaced', '替换后') : t('before the swap', '换之前')}</text>
          <text x="218" y="126" class="tag">call <tspan fill={phase >= 1 ? 'var(--accent)' : 'var(--gen)'} font-weight={phase >= 1 ? '600' : '400'}>{phase >= 1 ? VOXT_DICT_TERM : VOXT_DICT_ALIAS}</tspan>.</text>
          <path d="M380 109 H402" stroke="var(--muted)" stroke-width="2" marker-end="url(#dict-arrow)" />
          <rect x="414" y="76" width="286" height="66" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="428" y="100" class="rowlabel">{t('language-model cleanup', '语言模型清理')}</text>
          <text x="428" y="126" class="detail">{phase >= 2 ? t('receives: call Priya.', '收到：call Priya.') : t('waits for plain text', '等纯文字')}</text>
          <rect x="20" y="164" width="370" height="176" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="190" class="rowlabel">{t('matching rules', '匹配规则')}</text>
          <text x="34" y="216" class="tag">{t('Preeya: whole words, any case', 'Preeya：整词，不分大小写')}</text>
          <text x="34" y="240" class="tag">{t('alias ends in punctuation: that end is not checked', '别名以标点结尾：那一端不查边界')}</text>
          <text x="34" y="264" class="tag">{t('Han / Hiragana / Katakana / Hangul: anywhere', '汉字/平假名/片假名/韩文：任意位置都能匹配')}</text>
          <text x="34" y="288" class="tag">{t('when several could match at one spot, the longest wins', '同一位置有多个能匹配时，最长的胜出')}</text>
          <text x="34" y="312" class="tag">{t('a term already written stays', '已经写对的词条保持原样')}</text>
          <rect x="410" y="164" width="290" height="150" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="424" y="190" class="rowlabel">{phase >= 4 ? t('model off: the swap still ran', '模型关掉：替换照样跑了') : t('with the model off or failing', '模型关掉或失败时')}</text>
          <text x="424" y="222" class="tag strong">call <tspan fill="var(--accent)">{VOXT_DICT_TERM}</tspan>.</text>
          <text x="424" y="252" class="tag">{t('the swap runs before cleanup', '替换在清理之前跑')}</text>
          <text x="424" y="276" class="tag">{t('so it does not need the model', '所以不靠语言模型')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('dict.Replace · spoken() before transcribe()', 'dict.Replace · transcribe() 前的 spoken()') : t('Source: dict.Replace() · session.cleanup.go spoken() runs before transcribe()', '出处：dict.Replace() · session.cleanup.go 的 spoken() 在 transcribe() 之前')}</text>

      {:else if step === 4}
        <text x="20" y="22" class="tag strong">{t('3 OF 4 · GLOSSARY → MODEL MESSAGES', '第 3/4 个 · 术语表 → 模型消息')}</text>
        <text x="20" y="46" class="tag">{t('its place depends on the dictionary size.', '位置由词典大小决定。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="230" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="86" class="rowlabel">≤ {VOXT_DICT_GLOSSARY_ALL_UP_TO} · {t('GLOSSARY IN SYSTEM', '术语表在 SYSTEM')}</text>
          <rect x="34" y="100" width="232" height="92" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="46" y="122" class="detail">system</text>
          <text x="46" y="142" class="detail">{t('general rules', '通用规则')}</text>
          <text x="46" y="164" class="mono">- {VOXT_DICT_TERM} ({VOXT_DICT_ALIAS})</text>
          <text x="46" y="184" class="mono">- {VOXT_DICT_SECOND_TERM}</text>
          <rect x="34" y="204" width="232" height="64" rx="6" fill="var(--bg)" stroke="var(--line)" />
          <text x="46" y="226" class="detail">user</text>
          <text x="46" y="254" class="tag">call {VOXT_DICT_TERM}.</text>

          <rect x="20" y="308" width="260" height="272" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="332" class="rowlabel">&gt; {VOXT_DICT_GLOSSARY_ALL_UP_TO} · {t('GLOSSARY IN USER', '术语表在 USER')}</text>
          <rect x="34" y="346" width="232" height="68" rx="6" fill="var(--bg)" stroke="var(--line)" />
          <text x="46" y="368" class="detail">system</text>
          <text x="46" y="392" class="detail">{t('generic rules only', '只有通用规则')}</text>
          <rect x="34" y="426" width="232" height="132" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="46" y="448" class="detail">user</text>
          {#if phase === 0}
            <text x="46" y="480" class="detail">{t('no glossary line yet', '还没有术语表行')}</text>
            <text x="46" y="516" class="tag">call {VOXT_DICT_TERM}.</text>
          {:else if phase === 1}
            <text x="46" y="480" class="detail">{t('candidate: Priya', '候选：Priya')}</text>
            <text x="46" y="506" class="detail">{t('the text names it', '文字点名了它')}</text>
            <text x="46" y="540" class="tag">call {VOXT_DICT_TERM}.</text>
          {:else if phase === 3}
            <text x="46" y="474" class="mono">{t('<glossary>', '<glossary>')}</text>
            <text x="46" y="498" class="detail">{t('matched terms', '匹配到的词条')}</text>
            <text x="46" y="522" class="mono">{t('</glossary>', '</glossary>')}</text>
            <text x="46" y="548" class="tag">call {VOXT_DICT_TERM}.</text>
          {:else}
            <text x="46" y="480" class="detail">{t('no match, or caps block all', '没有匹配，或被上限挡住')}</text>
            <text x="46" y="506" class="detail">{t('glossary empty → none added', '术语表为空 → 不加')}</text>
            <text x="46" y="540" class="tag">call {VOXT_DICT_TERM}.</text>
          {/if}

          <text x="20" y="612" class="tag">{t('≤30: all terms · >30: text names term or alias', '≤30：全部词条 · >30：文字点名词条或别名')}</text>
          <text x="20" y="634" class="tag">{t('→ that term becomes a candidate', '→ 那个词条成为候选')}</text>
        {:else}
          <rect x="20" y="72" width="340" height="250" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="96" class="rowlabel">≤ {VOXT_DICT_GLOSSARY_ALL_UP_TO} · {t('GLOSSARY IN SYSTEM', '术语表在 SYSTEM')}</text>
          <rect x="34" y="108" width="312" height="104" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="48" y="128" class="detail">system</text>
          <text x="48" y="150" class="detail">{t('general rules', '通用规则')}</text>
          <text x="48" y="174" class="mono">- {VOXT_DICT_TERM} ({t('heard as', '可能被听成')}: {VOXT_DICT_ALIAS})</text>
          <text x="48" y="196" class="mono">- {VOXT_DICT_SECOND_TERM}</text>
          <rect x="34" y="224" width="312" height="70" rx="7" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="246" class="detail">user</text>
          <text x="48" y="274" class="tag">call {VOXT_DICT_TERM}.</text>

          <rect x="380" y="72" width="320" height="250" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="394" y="96" class="rowlabel">&gt; {VOXT_DICT_GLOSSARY_ALL_UP_TO} · {t('GLOSSARY IN USER', '术语表在 USER')}</text>
          <rect x="394" y="108" width="292" height="72" rx="7" fill="var(--bg)" stroke="var(--line)" />
          <text x="408" y="130" class="detail">system</text>
          <text x="408" y="156" class="detail">{t('generic rules only', '只有通用规则')}</text>
          <rect x="394" y="192" width="292" height="130" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="408" y="214" class="detail">user</text>
          {#if phase === 0}
            <text x="408" y="246" class="detail">{t('no glossary line yet', '还没有术语表行')}</text>
            <text x="408" y="290" class="tag">call {VOXT_DICT_TERM}.</text>
          {:else if phase === 1}
            <text x="408" y="246" class="detail">{t('candidate: Priya', '候选：Priya')}</text>
            <text x="408" y="272" class="detail">{t('the text names it', '文字点名了它')}</text>
            <text x="408" y="306" class="tag">call {VOXT_DICT_TERM}.</text>
          {:else if phase === 3}
            <text x="408" y="240" class="mono">{t('<glossary>', '<glossary>')}</text>
            <text x="408" y="264" class="detail">{t('matched terms', '匹配到的词条')}</text>
            <text x="408" y="288" class="mono">{t('</glossary>', '</glossary>')}</text>
            <text x="408" y="312" class="tag">call {VOXT_DICT_TERM}.</text>
          {:else}
            <text x="408" y="246" class="detail">{t('no match, or caps block all', '没有匹配，或被上限挡住')}</text>
            <text x="408" y="272" class="detail">{t('glossary empty → none added', '术语表为空 → 不加')}</text>
            <text x="408" y="306" class="tag">call {VOXT_DICT_TERM}.</text>
          {/if}

          <text x="20" y="352" class="tag">{t('≤30: all terms · >30: text names term or alias', '≤30：全部词条 · >30：文字点名词条或别名')}</text>
          <text x="20" y="374" class="tag">{t('→ that term becomes a candidate', '→ 那个词条成为候选')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('compose.Build · GlossaryAllUpTo 30', 'compose.Build · GlossaryAllUpTo 30') : t('Source: compose.Build · GlossaryAllUpTo 30', '出处：compose.Build · GlossaryAllUpTo 30')}</text>

      {:else if step === 5}
        <text x="20" y="22" class="tag strong">{t('4 OF 4 · DICTIONARY NOTES → SYSTEM', '第 4/4 个 · 全词典备注 → SYSTEM')}</text>
        <text x="20" y="46" class="tag">{t('separate from the row’s private note.', '和行内私有备注不是一回事。')}</text>
        {#if phone}
          <rect x="20" y="62" width="260" height="120" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="86" class="rowlabel">{t('dictionary-wide notes', '全词典备注')}</text>
          <text x="34" y="112" class="detail">settings.Dictionary.Notes</text>
          <text x="34" y="136" class="detail">{t('e.g. “Priya is on the design team;', '例如 “Priya 在设计团队；')}</text>
          <text x="34" y="158" class="detail">{t('heard as ‘Preeya’.”', '被听成 ‘Preeya’。”')}</text>
          <path d="M150 182 V204" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="20" y="212" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="236" class="rowlabel">{t('system prompt · notes layer', 'system 提示 · 备注一层')}</text>
          <text x="34" y="262" class="mono">{phase >= 1 ? t('notes join the system layers', '备注加入 system 各层') : t('no notes layer yet', '还没有备注层')}</text>
          <text x="34" y="288" class="detail">{t('no request input here', '这次请求的输入不在这里')}</text>
          {#if phase >= 2}
            <text x="20" y="340" class="tag strong">{t('never sent to', '从不发到')}</text>
            <text x="20" y="366" class="tag" fill="var(--gen)">✗ {t('speech model', '语音模型')}</text>
            <text x="20" y="390" class="tag" fill="var(--gen)">✗ {t('transcript replacement', '文字稿替换')}</text>
          {/if}
          <text x="20" y="428" class="tag">{t('messages: system → history → user', '消息：system → history → user')}</text>
          <text x="20" y="452" class="tag">{t('this request is in user', '这次请求的输入在 user')}</text>
          <text x="20" y="490" class="tag">{t('notes-off keeps them out', '关掉备注就不进提示')}</text>
          <text x="20" y="514" class="tag">{t('even while the dictionary is on', '词典开着也一样')}</text>
        {:else}
          <rect x="20" y="72" width="240" height="140" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="98" class="rowlabel">{t('dictionary-wide notes', '全词典备注')}</text>
          <text x="34" y="126" class="detail">settings.Dictionary.Notes</text>
          <text x="34" y="152" class="detail">{t('“Priya is on the design team;', '“Priya 在设计团队；')}</text>
          <text x="34" y="174" class="detail">{t('heard as ‘Preeya’.”', '被听成 ‘Preeya’。”')}</text>
          <text x="34" y="198" class="detail">{t('any notes that help', '任何有用的说明都行')}</text>
          <path d="M260 142 H312" stroke="var(--accent)" stroke-width="2" marker-end="url(#dict-arrow-accent)" />
          <rect x="324" y="72" width="376" height="140" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="338" y="98" class="rowlabel">{t('system prompt · notes layer', 'system 提示 · 备注一层')}</text>
          <text x="338" y="128" class="detail">{phase >= 1 ? t('role · task rules · dictionary notes', '角色 · 任务规则 · 全词典备注') : t('role · task rules', '角色 · 任务规则')}</text>
          <text x="338" y="156" class="mono">{phase >= 1 ? t('notes join the system layers', '备注加入 system 各层') : t('no notes layer yet', '还没有备注层')}</text>
          <text x="338" y="186" class="detail">{t('no request input here', '这次请求的输入不在这里')}</text>
          {#if phase >= 2}
            <rect x="20" y="240" width="680" height="90" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="34" y="266" class="tag strong" fill="var(--gen)">{t('never sent to', '从不发到')}</text>
            <text x="34" y="294" class="tag">✗ {t('speech model (hints come from the term)', '语音模型（提示只来自词条）')}</text>
            <text x="34" y="318" class="tag">✗ {t('the transcript (replacement reads aliases)', '文字稿（替换只读别名）')}</text>
          {/if}
          <text x="20" y="356" class="tag">{t('messages: system → history → user · this request is in user', '消息：system → history → user · 这次请求的输入在 user')}</text>
          <text x="20" y="384" class="tag">{t('Notes-off keeps the notes out of the prompt even while the dictionary is on.', '即使词典开着，关掉备注也能让全词典备注不进提示。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('PromptDictionary · compose addDictionary', 'PromptDictionary · compose addDictionary') : t('Source: session/text.go PromptDictionary() · compose/dictionary.go addDictionary()', '出处：session/text.go PromptDictionary() · compose/dictionary.go addDictionary()')}</text>

      {:else if step === 6}
        <text x="20" y="22" class="tag strong">{t('WHAT SURVIVES WITHOUT THE MODEL', '没有语言模型时还剩什么')}</text>
        <text x="20" y="46" class="tag">{t('The dictionary has two kinds of help.', '词典有两种帮忙方式。')}</text>
        {#if phone}
          <text x="266" y="70" text-anchor="end" class="detail">{t('model off', '模型关掉')}</text>
          {#each [
            { y: 80, name: t('speech hints', '语音提示'), without: true, note: t('from the term', '来自词条') },
            { y: 160, name: t('alias → term', '别名 → 词条'), without: true, note: t('before cleanup', '清理之前') },
            { y: 240, name: t('glossary', '术语表'), without: false, note: t('inside the prompt', '在提示里') },
            { y: 320, name: t('dictionary notes', '全词典备注'), without: false, note: t('inside the prompt', '在提示里') },
          ] as r, i}
            {@const solved = phase === PHASE_COUNTS[step] - 1 || phase > i}
            <rect x="20" y={r.y} width="260" height="66" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y={r.y + 26} class="tag strong">{r.name}</text>
            <text x="34" y={r.y + 50} class="detail">{r.note}</text>
            <text x="266" y={r.y + 36} text-anchor="end" class="tag strong" fill={solved ? (r.without ? 'var(--gen)' : 'var(--muted)') : 'var(--line)'}>{solved ? (r.without ? '✓' : '✗') : '·'}</text>
          {/each}
          <text x="20" y="418" class="tag">{t('✓ still works · ✗ needs the language model.', '✓ 仍然有效 · ✗ 需要语言模型。')}</text>
          <text x="20" y="446" class="tag">{t('the master switch turns all four off', '总开关一关，四个都不走')}</text>
          <rect x="20" y="470" width="260" height="86" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="5 4" />
          <text x="34" y="496" class="rowlabel">{t('the recording → history', '录音 → 历史')}</text>
          <text x="34" y="526" class="tag strong">{t('kept for how long?', '留多久？')}</text>
        {:else}
          <text x="624" y="72" text-anchor="middle" class="detail">{t('model off', '模型关掉')}</text>
          {#each [
            { y: 82, name: t('speech hints', '语音提示'), without: true, note: t('from the term', '来自词条') },
            { y: 154, name: t('alias → term', '别名 → 词条'), without: true, note: t('before cleanup', '清理之前') },
            { y: 226, name: t('glossary', '术语表'), without: false, note: t('inside the prompt', '在提示里') },
            { y: 298, name: t('dictionary notes', '全词典备注'), without: false, note: t('inside the prompt', '在提示里') },
          ] as r, i}
            {@const solved = phase === PHASE_COUNTS[step] - 1 || phase > i}
            <rect x="20" y={r.y} width="510" height="58" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y={r.y + 24} class="tag strong">{r.name}</text>
            <text x="34" y={r.y + 45} class="detail">{r.note}</text>
            <rect x="548" y={r.y} width="152" height="58" rx="8" fill={solved ? (r.without ? 'var(--gen-soft)' : 'var(--faint)') : 'var(--bg)'} stroke={solved ? (r.without ? 'var(--gen)' : 'var(--line)') : 'var(--line)'} />
            <text x="624" y={r.y + 36} text-anchor="middle" class="tag strong" fill={solved ? (r.without ? 'var(--gen)' : 'var(--muted)') : 'var(--line)'}>{solved ? (r.without ? '✓' : '✗') : '·'}</text>
          {/each}
          <text x="20" y="390" class="tag">{t('Hints and alias replacement run outside the language model, so they survive its failure.', '提示和别名替换在语言模型之外运行，所以模型失败也还在。')}</text>
          <text x="20" y="414" class="tag">{t('The master dictionary switch turns all four off.', '词典总开关一关，四个都不走。')}</text>
          <rect x="20" y="436" width="680" height="86" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="5 4" />
          <text x="34" y="462" class="rowlabel">{t('the recording → history', '录音 → 历史')}</text>
          <text x="34" y="492" class="tag strong">{t('kept for how long?', '留多久？')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('recording → history: next chapter', '录音 → 历史：下一章') : t('The recording and its history are next. Source: session/cleanup.go spoken()', '接下来看录音和历史。出处：session/cleanup.go spoken()')}</text>
      {/if}
      {#if focus}
        <rect class="motion-focus" x={focus.x - 4} y={focus.y - 4} width={focus.w + 8} height={focus.h + 8} rx="10" fill="none" stroke="var(--eos)" stroke-width="3" />
      {/if}
      <LoopProgress ms={lapMs} {lap} x={phone ? 236 : 640} y={phone ? H - 30 : 20} />
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .motion-focus { pointer-events: none; transition: x 240ms, y 240ms, width 240ms, height 240ms; }
</style>
