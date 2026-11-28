<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_DELIVER_VERIFY_MS, VOXT_RESTORE_AFTER_INSERT_MS, VOXT_RESTORE_DEFAULT_MS,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'You press the shortcut in one app, then may switch. The text goes to the focus\'s owner, not necessarily back to the start app.',
    captionZh: '你在一个 app 按快捷键，之后可能切走。文字去焦点的所属进程，不一定回按快捷键的那个 app。',
  }, {
    caption: 'First check: is the focused field a password field? If so, nothing is typed; the card opens only if that feature\'s card is on.',
    captionZh: '先检查焦点是不是密码框。是的话什么都不贴；功能开了卡片才显示。',
  }, {
    caption: 'Next check: can that focused element take text? If not, the same exit applies.',
    captionZh: '再检查焦点能不能收文字。不能就走同一个出口。',
  }, {
    caption: 'After pasting, read the field again. An ordinary field that reads the same leaves the paste unconfirmed.',
    captionZh: '贴完再读一次焦点。普通框读起来一样，就只是没确认。',
  }, {
    caption: 'Save the old clipboard and put it back after the paste. A reader may still need what was there.',
    captionZh: '贴之前记住剪贴板，贴完把原来的放回去。里面可能有读者还要用的东西。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: the start app appears with the shortcut press, then the switch arrow, then the focus owner with its empty focused field and its cursor, then the answer text send the deck to Priya lands in that field, and finally the two lines saying the owner can be the start app, another app or a floating window, and that the start app is not automatically the destination.',
    zh: '画面按顺序形成：先出现按快捷键的 start app，再是切换箭头，再是焦点所属进程和它空着、只有光标的焦点框，然后答案文字 send the deck to Priya 落进框里，最后是底部两行：所属进程可以是 start app、别的 app 或浮窗，start app 不一定是目的地。',
  }, {
    en: 'The picture builds in order: the focus owner with a focused password field appears, drawn as dots with the subrole AXSecureTextField, then the line that the system may hold posted keys back, then the orange STOP with reason secure, then the card-on exit with the answer card, and finally the card-off exit with the copied result and the one-line notice.',
    zh: '画面按顺序形成：先出现焦点所属进程里有焦点的密码框，画成圆点，subrole 是 AXSecureTextField；再是系统可能挡住投递按键的一行；再是橙色的 STOP，原因 secure；再是开卡片的出口，显示答案卡；最后是关卡片的出口，复制结果并显示一行提示。',
  }, {
    en: 'The picture builds in order: the two intro lines, then the three rule cards one at a time (same as the start app, another app, a selection replace or Voxt own window), then the ordinary-delivery line and the card Insert line, and finally the line that a not-writable element takes the same exit as Step 2.',
    zh: '画面按顺序形成：先是两行说明，再三张规则卡逐一出现（和 start app 一样、另一个 app、替换选区或 Voxt 自己窗口），再是普通投递一行和卡片 Insert 一行，最后是「不能写就走和第 2 步同一个出口」。',
  }, {
    en: 'The picture builds in order: the before card with the real field text send the deck to and its cursor, then the ⌘V arrow, then the after card with the text grown to send the deck to Priya and the cursor moved to the new end, then the compare card with different means inserted and its evidence text grew, cursor moved, then the three other exits, and finally the 1000 ms wait line and the two summary lines.',
    zh: '画面按顺序形成：先是「贴之前」卡，框里是真文字 send the deck to 和光标；再是 ⌘V 箭头；再是「贴之后」卡，文字变长为 send the deck to Priya，光标移到新末尾；再是比较卡，「不同 → 贴进去」带着证据「文字变长 · 光标移动」；再是另外三个出口；最后是最多等 1000 ms 的一行和两行小结。',
  }, {
    en: 'The picture builds in order: the snapshot box with the old clipboard grocery list, then the paste box with the answer text on the clipboard, then the restore box with grocery list back, then the 150 ms and 500 ms timing lines, then the other-writer case where someone else\'s note stays because changeCount differs, then the unconfirmed exit, and finally the answer text and the closing question.',
    zh: '画面按顺序形成：先是快照框，旧剪贴板是 grocery list；再是粘贴框，答案文字占上剪贴板；再是放回框，grocery list 回来；再是 150 ms 和 500 ms 的计时行；再是别人写过的例子，changeCount 不同所以 someone else\'s note 留下；再是未确认的出口；最后是答案文字和收尾问题。',
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
  const H = $derived((phone ? [560, 640, 640, 670, 700] : [440, 500, 500, 480, 520])[step]);
  // Every step builds its state instead of showing a finished picture:
  // Step 1: the start app, the switch, the focus owner with an empty focused
  //   field, then the answer text lands in it, then the two bottom lines.
  // Step 2: the password field, the warning line, the STOP, then the two
  //   exits (card on, card off).
  // Step 3: the three rule cards one at a time, then the ordinary-delivery
  //   and card-Insert lines, then the not-writable exit.
  // Step 4: the before card with real text and cursor, the ⌘V arrow, the
  //   after card with the longer text and moved cursor, the compare with its
  //   evidence, the other exits, then the wait line.
  // Step 5: the clipboard value old → prepared → restored across the three
  //   boxes, the timing lines, the other-writer case, the unconfirmed exit,
  //   then the answer text and the question.
  const PHASE_COUNTS = [5, 5, 6, 6, 7];
  // Phone LoopProgress spots per step, kept clear of titles, boxes and footnotes.
  const LP_PHONE: [number, number][] = [[228, 520], [228, 590], [228, 560], [228, 630], [228, 664]];
  const PHASE_MS = 900;
  const REST_MS = 2200;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0), reduced = $state(false);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { phase = PHASE_COUNTS[s] - 1; return; }
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
  const answerText = 'send the deck to Priya';
  const oldClip = 'grocery list';
  const otherClip = "someone else's note";
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="deliver-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="deliver-arrow-accent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if !reduced}
        {#if phone}<LoopProgress ms={lapMs} {lap} x={LP_PHONE[step][0]} y={LP_PHONE[step][1]} />{:else}<LoopProgress ms={lapMs} {lap} />{/if}
      {/if}
      {#if step === 0}
        <text x="20" y="22" class="tag strong">{t('the destination is the focus\'s owner', '目的地是焦点的所属进程')}</text>
        <text x="20" y="46" class="tag">{t('start app: the app in front when you pressed the shortcut.', 'start app：按快捷键那一刻在前面的 app。')}</text>
        <text x="20" y="68" class="tag">{t('focus: the field where typing goes.', '焦点：打字会落下的框。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 260} height="140" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">start app</text>
        <rect x="34" y="136" width={phone ? 232 : 232} height="52" rx="7" fill="var(--faint)" />
        <text x="42" y="166" class="tag">{t('you press the shortcut here', '你在这里按快捷键')}</text>
        {#if phase >= 1}
          <g transition:fade>
            {#if phone}
              <path d="M150 250 V292" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
              <text x="160" y="276" class="tag">{t('you switch', '你切了 app')}</text>
            {:else}
              <path d="M296 166 H392" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
              <text x="300" y="158" class="tag">{t('you switch', '你切了 app')}</text>
            {/if}
          </g>
        {/if}
        {#if phase >= 2}
          <g in:fly={{ y: 30, duration: 500 }}>
            <rect x={phone ? 20 : 400} y={phone ? 300 : 96} width={phone ? 260 : 280} height="140" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
            <text x={phone ? 34 : 414} y={phone ? 326 : 122} class="rowlabel">{t('focus owner', '焦点所属进程')}</text>
            <rect x={phone ? 34 : 414} y={phone ? 340 : 136} width={phone ? 232 : 252} height="52" rx="7" fill="white" stroke="var(--accent)" />
            {#if phase < 3}
              <text x={phone ? 42 : 422} y={phone ? 372 : 168} class="mono" fill="var(--accent)">▏</text>
            {/if}
          </g>
        {/if}
        {#if phase >= 3}
          <g in:fly={{ y: 20, duration: 450 }}>
            <text x={phone ? 42 : 422} y={phone ? 364 : 158} class="mono strong">{answerText}<tspan fill="var(--accent)">▏</tspan></text>
            <text x={phone ? 42 : 422} y={phone ? 384 : 178} class="tag strong">{t('text lands in this focused field', '文字贴进这个有焦点的框')}</text>
          </g>
        {/if}
        {#if phase >= 4}
          <g transition:fade>
            <text x="20" y={phone ? 458 : 272} class="tag strong">{phone ? t('Owner: start app, another app, or a floating window.', '所属进程：start app、别的 app 或浮窗。') : t('The owner can be the start app, another app, or a floating window.', '所属进程可以是 start app、别的 app，或一个浮窗。')}</text>
            <text x="20" y={phone ? 480 : 300} class="tag strong">{phone ? t('Remembered, but not automatically the destination.', '会被记住，但不一定是目的地。') : t('The start app is remembered, but it is not automatically the destination.', 'start app 会被记住，但它不一定是目的地。')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('TextIO focus() · PasteCheck.targetReached', 'TextIO focus() · PasteCheck.targetReached') : t('Source: TextIO.swift focus() · PasteCheck.targetReached', '出处：TextIO.swift focus() · PasteCheck.targetReached')}</text>
      {:else if step === 1}
        <text x="20" y="22" class="tag strong">{t('gate 1 · password field', '第一道门 · 密码框')}</text>
        <text x="20" y="46" class="tag">{t('Read the focused field before typing anything.', '动键盘之前，先读焦点是什么。')}</text>
        <rect x="20" y="96" width={W - 40} height="150" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">{t('focus owner', '焦点所属进程')} · {t('focused field', '有焦点的框')}</text>
        <rect x="34" y="136" width={phone ? 232 : 300} height="52" rx="7" fill="white" stroke="var(--gen)" stroke-width="2" />
        <text x="44" y={phone ? 160 : 167} class="mono strong">••••••••</text>
        <text x={phone ? 44 : 360} y={phone ? 182 : 167} class="tag strong" fill="var(--gen)">AXSecureTextField</text>
        {#if phase >= 1}
          <text x="34" y="216" class="tag" transition:fade>{phone ? t('Password field: keys may be blocked.', '密码框：按键可能被挡住。') : t('A password field: the system may hold posted keys back.', '密码框：系统可能挡住投递的按键。')}</text>
        {/if}
        {#if phase >= 2}
          <g in:fly={{ y: 20, duration: 450 }}>
            <rect x="20" y="262" width={W - 40} height="60" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="34" y="286" class="tag strong">{t('STOP · nothing is typed', '停下 · 一个字也不贴')}</text>
            <text x="34" y="310" class="tag">{t('Reason: secure', '原因：secure')}</text>
          </g>
        {/if}
        {#if phase >= 3}
          <text x="20" y="342" class="tag strong" transition:fade>{t('If nothing is typed:', '没贴入时：')}</text>
          <g in:fly={{ y: 20, duration: 450 }}>
            <rect x="20" y="352" width={phone ? 260 : 330} height={phone ? 78 : 86} rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y="374" class="rowlabel">{t('card on', '开卡片')}</text>
            <text x="34" y={phone ? 400 : 398} class="tag strong">{t('answer card', '答案卡')}</text>
            <text x="34" y={phone ? 422 : 420} class="tag">{t('Insert or Copy', 'Insert 或 Copy')}</text>
          </g>
        {/if}
        {#if phase >= 4}
          <g in:fly={{ y: 20, duration: 450 }}>
            <rect x={phone ? 20 : 370} y={phone ? 444 : 352} width={phone ? 260 : 330} height={phone ? 110 : 86} rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x={phone ? 34 : 384} y={phone ? 466 : 374} class="rowlabel">{t('card off', '关卡片')}</text>
            <text x={phone ? 34 : 384} y={phone ? 490 : 398} class="tag strong">{t('copied result', '复制结果')}</text>
            <text x={phone ? 34 : 384} y={phone ? 512 : 420} class="tag">{t('notice: Not inserted. Copied: press ⌘V to paste.', '提示：未贴入，已复制，按 ⌘V 粘贴。')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('deliver.go · secure field check', 'deliver.go · 密码框检查') : t('Source: deliver.go · Secure(); f.Subrole == AXSecureTextField', '出处：deliver.go · Secure()；f.Subrole == AXSecureTextField')}</text>
      {:else if step === 2}
        <text x="20" y="22" class="tag strong">{t('gate 2 · can the focus take text?', '第二道门 · 焦点能收文字吗？')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Start app: an unread element counts as writable.', 'start app：读不出的元素也算能写。') : t('Start app: an element it cannot read, even a web area, counts as writable.', 'start app：读不出的元素，包括网页区域，也算能写。')}</text>
        <text x="20" y="68" class="tag">{phone ? t('Another app: must report editable.', '别的 app：元素必须报可编辑。') : t('Another app: the element must report editable; a page being read is not enough.', '别的 app：元素必须报可编辑；正在阅读的网页不算。')}</text>
        {#each [
          { y: 104, title: t('same as start app', '和 start app 一样'), sub: t('unknown → writable', '读不出 → 能写'), tag: 'Writable' },
          { y: 186, title: t('another app', '另一个 app'), sub: t('must be editable', '必须可编辑'), tag: 'Editable' },
          { y: 268, title: t('replace a selection, or Voxt window', '替换选区，或 Voxt 自己窗口'), sub: t('must be editable', '必须可编辑'), tag: 'Editable' },
        ] as rule, i}
          {#if phase >= i + 1}
            <g in:fly={{ y: 20, duration: 450 }}>
              <rect x="20" y={rule.y} width={phone ? 260 : 680} height={phone ? 66 : 60} rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="34" y={rule.y + 24} class="tag strong">{rule.title}</text>
              <text x="34" y={rule.y + 46} class="tag">{rule.sub}</text>
              {#if !phone}
                <text x="620" y={rule.y + 37} text-anchor="end" class="mono">{rule.tag}</text>
              {/if}
            </g>
          {/if}
        {/each}
        {#if phase >= 4}
          <g transition:fade>
            <text x="20" y={phone ? 360 : 352} class="tag">{t('Ordinary delivery: a button or a list is not writable.', '普通投递：按钮或列表不能写。')}</text>
            <text x="20" y={phone ? 384 : 376} class="tag">{phone ? t('Card Insert skips that check; a password still stops.', '卡片 Insert 跳过这道检查；密码框仍停下。') : t('Card Insert (user chose) skips that start-app check; a password still stops.', '卡片 Insert（用户自己选）跳过 start app 的这道检查；密码框仍停下。')}</text>
          </g>
        {/if}
        {#if phase >= 5}
          <text x={W / 2} y={phone ? 420 : 408} text-anchor="middle" class="tag strong" transition:fade>{t('Not writable → the same exit as Step 2.', '不能写 → 和第 2 步同一个出口。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: deliver.go · Writable(), check()', '出处：deliver.go · Writable()、check()')}</text>
      {:else if step === 3}
        <text x="20" y="22" class="tag strong">{t('after ⌘V · re-read the field', '贴完 ⌘V · 再读一次焦点')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Reads the field before and after ⌘V.', '在 ⌘V 前后各读一次焦点。') : t('The helper reads what the field shows before and after the paste.', 'helper 在贴之前和贴之后，各读一次焦点显示的内容。')}</text>
        <text x="20" y="68" class="tag">{t('Text and cursor, not the whole page.', '读它显示的文字和光标，不读整页。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 210} height={phone ? 96 : 100} rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">{t('before', '贴之前')}</text>
        <text x="34" y="156" class="mono">send the deck to <tspan fill="var(--accent)">▏</tspan></text>
        {#if phase >= 1}
          <g transition:fade>
            {#if phone}
              <path d="M150 200 V228" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
              <text x="160" y="218" class="tag">⌘V</text>
            {:else}
              <path d="M240 146 H262" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
              <text x="244" y="138" class="tag">⌘V</text>
            {/if}
          </g>
        {/if}
        {#if phase >= 2}
          <g in:fly={{ y: 20, duration: 450 }}>
            <rect x={phone ? 20 : 270} y={phone ? 240 : 96} width={phone ? 260 : 210} height={phone ? 96 : 100} rx="10" fill="var(--bg)" stroke="var(--line)" />
            <text x={phone ? 34 : 284} y={phone ? 266 : 122} class="rowlabel">{t('after', '贴之后')}</text>
            <text x={phone ? 34 : 284} y={phone ? 300 : 156} class="mono">{answerText}<tspan fill="var(--accent)">▏</tspan></text>
          </g>
        {/if}
        {#if phase >= 3}
          <g in:fly={{ y: 20, duration: 450 }}>
            <rect x={phone ? 20 : 520} y={phone ? 360 : 96} width={phone ? 260 : 180} height={phone ? 150 : 150} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={phone ? 34 : 534} y={phone ? 388 : 122} class="rowlabel">{t('compare', '比较')}</text>
            <text x={phone ? 34 : 534} y={phone ? 412 : 148} class="tag strong">{t('different → inserted', '不同 → 贴进去')}</text>
            <text x={phone ? 34 : 534} y={phone ? 432 : 168} class="tag">{t('text grew · cursor moved', '文字变长 · 光标移动')}</text>
          </g>
        {/if}
        {#if phase >= 4}
          <g transition:fade>
            <text x={phone ? 34 : 534} y={phone ? 456 : 192} class="tag">{t('same · field → unconfirmed', '一样 · 普通框 → 没确认')}</text>
            <text x={phone ? 34 : 534} y={phone ? 478 : 214} class="tag">{t('same · web area → inserted', '一样 · 网页区域 → 贴进去')}</text>
            <text x={phone ? 34 : 534} y={phone ? 500 : 236} class="tag">{t('cannot read → inserted', '读不出 → 按贴入')}</text>
          </g>
        {/if}
        {#if phase >= 5}
          <g transition:fade>
            <text x={W / 2} y={phone ? 545 : 276} text-anchor="middle" class="mono">{t('check waits up to', '最多等')} {VOXT_DELIVER_VERIFY_MS} ms</text>
            <text x={W / 2} y={phone ? 578 : 312} text-anchor="middle" class="tag strong">{phone ? t('Ordinary same: unconfirmed.', '普通框一样：没确认。') : t('An ordinary field that reads the same: unconfirmed.', '普通框读起来一样：没确认。')}</text>
            <text x={W / 2} y={phone ? 610 : 348} text-anchor="middle" class="tag">{phone ? t('Web area same: inserted.', '网页区域一样：按贴入。') : t('A web area that reads the same is trusted as inserted.', '网页区域读起来一样，按已贴入处理。')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('deliver.go DefaultVerifyMS · PasteCheck.compare', 'deliver.go DefaultVerifyMS · PasteCheck.compare') : t('Source: deliver.go DefaultVerifyMS = 1000 · a changed reading is evidence, not proof', '出处：deliver.go DefaultVerifyMS = 1000 · 读到变化是证据，不是证明')}</text>
      {:else if step === 4}
        <text x="20" y="22" class="tag strong">{t('clipboard · snapshot, then put it back', '剪贴板 · 先记住，再放回')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Blue: old clipboard · orange: text', '蓝：旧剪贴板 · 橙：文字') : t('Blue: the old clipboard · orange: the prepared text on it for a moment.', '蓝色：原来的剪贴板 · 橙色：文字短暂占用它。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 210} height="84" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="34" y="122" class="rowlabel">{t('snapshot', '快照')}</text>
        <text x="34" y="150" class="tag strong">{t('old clipboard kept', '记住旧剪贴板')}</text>
        <text x="34" y="172" class="mono">“{oldClip}”</text>
        {#if phase >= 1}
          <g in:fly={{ y: 20, duration: 450 }}>
            {#if phone}
              <path d="M150 188 V202" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
            {:else}
              <path d="M240 138 H262" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
            {/if}
            <rect x={phone ? 20 : 270} y={phone ? 210 : 96} width={phone ? 260 : 210} height="84" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={phone ? 34 : 284} y={phone ? 236 : 122} class="rowlabel">{t('paste', '贴')}</text>
            <text x={phone ? 34 : 284} y={phone ? 264 : 150} class="tag strong">{t('text on clipboard', '文字占剪贴板')}</text>
            <text x={phone ? 34 : 284} y={phone ? 286 : 172} class="mono">“{answerText}”</text>
          </g>
        {/if}
        {#if phase >= 2}
          <g in:fly={{ y: 20, duration: 450 }}>
            {#if phone}
              <path d="M150 302 V316" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
            {:else}
              <path d="M490 138 H512" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
            {/if}
            <rect x={phone ? 20 : 520} y={phone ? 324 : 96} width={phone ? 260 : 180} height="84" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={phone ? 34 : 534} y={phone ? 350 : 122} class="rowlabel">{t('restore', '放回')}</text>
            <text x={phone ? 34 : 534} y={phone ? 378 : 150} class="tag strong">{t('old clipboard back', '旧剪贴板回来')}</text>
            <text x={phone ? 34 : 534} y={phone ? 400 : 172} class="mono">“{oldClip}”</text>
          </g>
        {/if}
        {#if phase >= 3}
          <g transition:fade>
            {#if phone}
              <text x="20" y="448" class="mono">{VOXT_RESTORE_AFTER_INSERT_MS} ms {t('from', '从')} ⌘V · {VOXT_RESTORE_DEFAULT_MS} ms {t('after check', '查完后')}</text>
            {:else}
              <text x="20" y="226" class="mono">{t('inserted', '贴入')} {VOXT_RESTORE_AFTER_INSERT_MS} ms {t('from', '从')} ⌘V · {t('unknown', '不确定')} {VOXT_RESTORE_DEFAULT_MS} ms {t('after the check', '从查完起')}</text>
            {/if}
            <text x="20" y={phone ? 472 : 250} class="tag">{phone ? t('150 ms from ⌘V; checking time subtracted.', '150 ms 从 ⌘V；检查时间减掉。') : t('The 150 ms budget counts from ⌘V; checking time is subtracted.', '150 ms 预算从 ⌘V 起算；检查时间会减掉。')}</text>
          </g>
        {/if}
        {#if phase >= 4}
          <g transition:fade>
            <text x={phone ? 20 : 520} y={phone ? 428 : 200} class="tag" fill="var(--gen)">“{otherClip}” · {t('stays', '留下')}</text>
            <text x="20" y={phone ? 496 : 274} class="tag">{phone ? t('Another app wrote meanwhile: skip restore.', '这中间别的 app 写过：不覆盖。') : t('If another app wrote meanwhile, skip the restore (changeCount differs).', '这中间别的 app 写过了（changeCount 不同），就不覆盖。')}</text>
          </g>
        {/if}
        {#if phase >= 5}
          <text x={W / 2} y={phone ? 528 : 304} text-anchor="middle" class="tag strong" transition:fade>{phone ? t('Unconfirmed: card on, else copy + notice.', '未确认：开卡片，否则复制并提示。') : t('Paste unconfirmed: card if on, else copied + notice.', '粘贴未确认：开卡片则显示卡片，否则复制并提示。')}</text>
        {/if}
        {#if phase >= 6}
          <g in:fly={{ y: 20, duration: 450 }}>
            <rect x="20" y={phone ? 544 : 320} width={W - 40} height={phone ? 48 : 46} rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x="34" y={phone ? 562 : 336} class="rowlabel">{t('answer text', '答案文字')}</text>
            <text x="34" y={phone ? 584 : 356} class="tag">{t('send the deck to ', '把文件发给 ')}<tspan font-weight="600">Priya</tspan></text>
            <text x={W / 2} y={phone ? 632 : 400} text-anchor="middle" class="tag strong">{t('How does Voxt spell "Priya" right next time?', '下一次，Voxt 怎么把 “Priya” 写对？')}</text>
          </g>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('TextIO.swift · restore counts from ⌘V', 'TextIO.swift · 放回从 ⌘V 起算') : t('Source: helper TextIO.swift · restore counts from ⌘V; 150 ms if inserted, else 500 ms', '出处：helper TextIO.swift · 放回从 ⌘V 起算；贴入 150 ms，否则 500 ms')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
