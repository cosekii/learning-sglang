<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
    en: 'Two windows: the start app where the shortcut was pressed, and the process that owns the focused element. That owner is the destination; it can be the start app, another app, or a floating window that is not in front.',
    zh: '两个窗口：按快捷键时的 start app，和有焦点元素的那个进程。这个所属进程就是目的地；它可以是 start app、别的 app，或一个不在最前面的浮窗。',
  }, {
    en: 'The focus owner has a focused password field, shown as dots with the subrole AXSecureTextField. A password field stops the delivery, so nothing is pasted. The exit depends on that feature\'s card setting: card on opens the answer card; card off copies the result and shows a one-line notice.',
    zh: '焦点所属的进程里有一个获得焦点的密码框，画成圆点，subrole 是 AXSecureTextField。密码框会挡住投递，什么也不贴。出口看该功能的卡片设置：开卡片就打开答案卡；关卡片就复制结果并显示一行提示。',
  }, {
    en: 'Three ways to decide whether the focused element takes text. In the start app, an element it cannot read, even a web area, counts as writable. In another app, the element must report editable; a page being read is not enough. A selection replace or Voxt own window needs an editable element. For ordinary delivery, a button or a list is not writable. The card\'s Insert is a user choice: AnyEditable skips that start-app check, so a chosen button can receive it; a password still stops.',
    zh: '三种判断焦点能不能收文字。在 start app 里，读不出的元素，包括网页区域，都按能写处理。在别的 app 里，元素必须报可编辑；正在阅读的网页不算。要替换选中的文字，或在 Voxt 自己的窗口里，元素必须可编辑。普通投递时，按钮或列表不能写。卡片的 Insert 是用户自己选的：AnyEditable 跳过 start app 的这一道检查，所以选中的按钮也能收到文字；密码框仍然停下。',
  }, {
    en: 'After Command-V, the helper reads the focused field again: its text and its cursor. A different reading is evidence the text landed. An ordinary readable field that reads the same leaves the paste unconfirmed; the same exit as Step 2: card when on, or copy and notice when off. A web area or editable web region that reads the same is instead treated as unknown and inserted, because those editors often accept a paste without updating what Accessibility reads. A field that cannot be read is trusted as inserted.',
    zh: 'Command-V 之后，helper 再读一次焦点：它的文字和光标。读到不同，是把文字贴进去的证据。普通、读得出来的框读到一样，只算没确认；出口是第 2 步的：开卡片或复制并提示。网页区域或可编辑的网页部分读到一样，则改成 unknown 并按已贴入处理，因为这些编辑器常接受粘贴却不更新 Accessibility 读到的东西。读不出的元素也按已贴入处理。',
  }, {
    en: 'The clipboard is snapshotted before Command-V and the prepared text is written over it. After a confirmed paste the old clipboard returns after one hundred fifty milliseconds; when the result is unknown it returns after the default five hundred. If another program wrote to the clipboard meanwhile, Voxt does not put the old one back. An unconfirmed posted paste keeps the text on the clipboard, and the fallback card offers Insert and Copy. A password or not-editable check returns before the clipboard is written, so it leaves the clipboard alone. KeepClipboard is the separate switch that keeps the text there on purpose.',
    zh: 'Command-V 之前先给剪贴板拍快照，再写入准备好的文字。确认贴进去后，一百五十毫秒把原来的剪贴板放回；结果不确定时按默认五百毫秒放回。如果这中间别的程序写了剪贴板，Voxt 不会用旧的覆盖它。发出粘贴但没确认时，文字留在剪贴板，退回的卡片提供 Insert 和 Copy。密码框和不可编辑的检查发生在写剪贴板之前，所以不动剪贴板。KeepClipboard 是另一个开关，故意把文字留在剪贴板上。',
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
</script>

<figure class="viz">
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
      {#if step === 0}
        <text x="20" y="22" class="tag strong">{t('the destination is the focus\'s owner', '目的地是焦点的所属进程')}</text>
        <text x="20" y="46" class="tag">{t('start app: the app in front when you pressed the shortcut.', 'start app：按快捷键那一刻在前面的 app。')}</text>
        <text x="20" y="68" class="tag">{t('focus: the field where typing goes.', '焦点：打字会落下的框。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 260} height="140" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">start app</text>
        <rect x="34" y="136" width={phone ? 232 : 232} height="52" rx="7" fill="var(--faint)" />
        <text x="42" y="166" class="tag">{t('you press the shortcut here', '你在这里按快捷键')}</text>
        <rect x={phone ? 20 : 400} y={phone ? 300 : 96} width={phone ? 260 : 280} height="140" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
        <text x={phone ? 34 : 414} y={phone ? 326 : 122} class="rowlabel">{t('focus owner', '焦点所属进程')}</text>
        <rect x={phone ? 34 : 414} y={phone ? 340 : 136} width={phone ? 232 : 252} height="52" rx="7" fill="white" stroke="var(--accent)" />
        <text x={phone ? 42 : 422} y={phone ? 370 : 166} class="tag strong">{t('text lands in this focused field', '文字贴进这个有焦点的框')}</text>
        {#if phone}
          <path d="M150 250 V292" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
          <text x="160" y="276" class="tag">{t('you switch', '你切了 app')}</text>
        {:else}
          <path d="M296 166 H392" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
          <text x="300" y="158" class="tag">{t('you switch', '你切了 app')}</text>
        {/if}
        <text x="20" y={phone ? 458 : 272} class="tag strong">{t('The owner can be the start app, another app, or a floating window.', '所属进程可以是 start app、别的 app，或一个浮窗。')}</text>
        <text x="20" y={phone ? 480 : 300} class="tag strong">{phone ? t('Remembered, but not automatically the destination.', '会被记住，但不一定是目的地。') : t('The start app is remembered, but it is not automatically the destination.', 'start app 会被记住，但它不一定是目的地。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('TextIO focus() · PasteCheck.targetReached', 'TextIO focus() · PasteCheck.targetReached') : t('Source: TextIO.swift focus() · PasteCheck.targetReached', '出处：TextIO.swift focus() · PasteCheck.targetReached')}</text>
      {:else if step === 1}
        <text x="20" y="22" class="tag strong">{t('gate 1 · password field', '第一道门 · 密码框')}</text>
        <text x="20" y="46" class="tag">{t('Read the focused field before typing anything.', '动键盘之前，先读焦点是什么。')}</text>
        <rect x="20" y="96" width={W - 40} height="150" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">{t('focus owner', '焦点所属进程')} · {t('focused field', '有焦点的框')}</text>
        <rect x="34" y="136" width={phone ? 232 : 300} height="52" rx="7" fill="white" stroke="var(--gen)" stroke-width="2" />
        <text x="44" y="167" class="mono strong">••••••••</text>
        <text x={phone ? 34 : 360} y={phone ? 166 : 167} class="tag strong" fill="var(--gen)">AXSecureTextField</text>
        <text x="34" y="216" class="tag">{phone ? t('Password field: keys may be blocked.', '密码框：按键可能被挡住。') : t('A password field: the system may hold posted keys back.', '密码框：系统可能挡住投递的按键。')}</text>
        <rect x="20" y="262" width={W - 40} height="60" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="34" y="286" class="tag strong">{t('STOP · nothing is typed', '停下 · 一个字也不贴')}</text>
        <text x="34" y="310" class="tag">{t('Reason: secure', '原因：secure')}</text>
        <text x="20" y="342" class="tag strong">{t('If nothing is typed:', '没贴入时：')}</text>
        <rect x="20" y="352" width={phone ? 260 : 330} height={phone ? 78 : 86} rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="374" class="rowlabel">{t('card on', '开卡片')}</text>
        <text x="34" y={phone ? 400 : 398} class="tag strong">{t('answer card', '答案卡')}</text>
        <text x="34" y={phone ? 422 : 420} class="tag">{t('Insert or Copy', 'Insert 或 Copy')}</text>
        <rect x={phone ? 20 : 370} y={phone ? 444 : 352} width={phone ? 260 : 330} height={phone ? 110 : 86} rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x={phone ? 34 : 384} y={phone ? 466 : 374} class="rowlabel">{t('card off', '关卡片')}</text>
        <text x={phone ? 34 : 384} y={phone ? 490 : 398} class="tag strong">{t('copied result', '复制结果')}</text>
        <text x={phone ? 34 : 384} y={phone ? 512 : 420} class="tag">{t('notice: Not inserted. Copied: press ⌘V to paste.', '提示：未贴入，已复制，按 ⌘V 粘贴。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('deliver.go · secure field check', 'deliver.go · 密码框检查') : t('Source: deliver.go · Secure(); f.Subrole == AXSecureTextField', '出处：deliver.go · Secure()；f.Subrole == AXSecureTextField')}</text>
      {:else if step === 2}
        <text x="20" y="22" class="tag strong">{t('gate 2 · can the focus take text?', '第二道门 · 焦点能收文字吗？')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Start app: an unread element counts as writable.', 'start app：读不出的元素也算能写。') : t('Start app: an element it cannot read, even a web area, counts as writable.', 'start app：读不出的元素，包括网页区域，也算能写。')}</text>
        <text x="20" y="68" class="tag">{phone ? t('Another app: must report editable.', '别的 app：元素必须报可编辑。') : t('Another app: the element must report editable; a page being read is not enough.', '别的 app：元素必须报可编辑；正在阅读的网页不算。')}</text>
        {#each [
          { y: 104, title: t('same as start app', '和 start app 一样'), sub: t('unknown → writable', '读不出 → 能写'), tag: 'Writable' },
          { y: 186, title: t('another app', '另一个 app'), sub: t('must be editable', '必须可编辑'), tag: 'Editable' },
          { y: 268, title: t('replace a selection, or Voxt window', '替换选区，或 Voxt 自己窗口'), sub: t('must be editable', '必须可编辑'), tag: 'Editable' },
        ] as rule}
          <rect x="20" y={rule.y} width={phone ? 260 : 680} height={phone ? 66 : 60} rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y={rule.y + 24} class="tag strong">{rule.title}</text>
          <text x="34" y={rule.y + 46} class="tag">{rule.sub}</text>
          {#if !phone}
            <text x="620" y={rule.y + 37} text-anchor="end" class="mono">{rule.tag}</text>
          {/if}
        {/each}
        <text x="20" y={phone ? 360 : 352} class="tag">{t('Ordinary delivery: a button or a list is not writable.', '普通投递：按钮或列表不能写。')}</text>
        <text x="20" y={phone ? 384 : 376} class="tag">{phone ? t('Card Insert skips that check; a password still stops.', '卡片 Insert 跳过这道检查；密码框仍停下。') : t('Card Insert (user chose) skips that start-app check; a password still stops.', '卡片 Insert（用户自己选）跳过 start app 的这道检查；密码框仍停下。')}</text>
        <text x={W / 2} y={phone ? 420 : 408} text-anchor="middle" class="tag strong">{t('Not writable → the same exit as Step 2.', '不能写 → 和第 2 步同一个出口。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: deliver.go · Writable(), check()', '出处：deliver.go · Writable()、check()')}</text>
      {:else if step === 3}
        <text x="20" y="22" class="tag strong">{t('after ⌘V · re-read the field', '贴完 ⌘V · 再读一次焦点')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Reads the field before and after ⌘V.', '在 ⌘V 前后各读一次焦点。') : t('The helper reads what the field shows before and after the paste.', 'helper 在贴之前和贴之后，各读一次焦点显示的内容。')}</text>
        <text x="20" y="68" class="tag">{t('Text and cursor, not the whole page.', '读它显示的文字和光标，不读整页。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 210} height={phone ? 96 : 100} rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="122" class="rowlabel">{t('before', '贴之前')}</text>
        <text x="34" y="152" class="tag">{t('field text + cursor', '框里的文字和光标')}</text>
        {#if phone}
          <path d="M150 200 V228" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
          <text x="160" y="218" class="tag">⌘V</text>
        {:else}
          <path d="M240 146 H262" stroke="var(--accent)" stroke-width="2" marker-end="url(#deliver-arrow-accent)" />
          <text x="244" y="138" class="tag">⌘V</text>
        {/if}
        <rect x={phone ? 20 : 270} y={phone ? 240 : 96} width={phone ? 260 : 210} height={phone ? 96 : 100} rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x={phone ? 34 : 284} y={phone ? 266 : 122} class="rowlabel">{t('after', '贴之后')}</text>
        <text x={phone ? 34 : 284} y={phone ? 296 : 152} class="tag">{t('field text + cursor', '框里的文字和光标')}</text>
        <rect x={phone ? 20 : 520} y={phone ? 360 : 96} width={phone ? 260 : 180} height={phone ? 150 : 150} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={phone ? 34 : 534} y={phone ? 388 : 122} class="rowlabel">{t('compare', '比较')}</text>
        <text x={phone ? 34 : 534} y={phone ? 414 : 150} class="tag strong">{t('different → inserted', '不同 → 贴进去')}</text>
        <text x={phone ? 34 : 534} y={phone ? 442 : 174} class="tag">{t('same · field → unconfirmed', '一样 · 普通框 → 没确认')}</text>
        <text x={phone ? 34 : 534} y={phone ? 470 : 198} class="tag">{t('same · web area → inserted', '一样 · 网页区域 → 贴进去')}</text>
        <text x={phone ? 34 : 534} y={phone ? 498 : 222} class="tag">{t('cannot read → inserted', '读不出 → 按贴入')}</text>
        <text x={W / 2} y={phone ? 545 : 276} text-anchor="middle" class="mono">{t('check waits up to', '最多等')} {VOXT_DELIVER_VERIFY_MS} ms</text>
        <text x={W / 2} y={phone ? 578 : 312} text-anchor="middle" class="tag strong">{phone ? t('Ordinary same: unconfirmed.', '普通框一样：没确认。') : t('An ordinary field that reads the same: unconfirmed.', '普通框读起来一样：没确认。')}</text>
        <text x={W / 2} y={phone ? 610 : 348} text-anchor="middle" class="tag">{phone ? t('Web area same: inserted.', '网页区域一样：按贴入。') : t('A web area that reads the same is trusted as inserted.', '网页区域读起来一样，按已贴入处理。')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('deliver.go DefaultVerifyMS · PasteCheck.compare', 'deliver.go DefaultVerifyMS · PasteCheck.compare') : t('Source: deliver.go DefaultVerifyMS = 1000 · a changed reading is evidence, not proof', '出处：deliver.go DefaultVerifyMS = 1000 · 读到变化是证据，不是证明')}</text>
      {:else if step === 4}
        <text x="20" y="22" class="tag strong">{t('clipboard · snapshot, then put it back', '剪贴板 · 先记住，再放回')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Blue: old clipboard · orange: text', '蓝：旧剪贴板 · 橙：文字') : t('Blue: the old clipboard · orange: the prepared text on it for a moment.', '蓝色：原来的剪贴板 · 橙色：文字短暂占用它。')}</text>
        <rect x="20" y="96" width={phone ? 260 : 210} height="84" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="34" y="122" class="rowlabel">{t('snapshot', '快照')}</text>
        <text x="34" y="150" class="tag strong">{t('old clipboard kept', '记住旧剪贴板')}</text>
        <rect x={phone ? 20 : 270} y={phone ? 210 : 96} width={phone ? 260 : 210} height="84" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x={phone ? 34 : 284} y={phone ? 236 : 122} class="rowlabel">{t('paste', '贴')}</text>
        <text x={phone ? 34 : 284} y={phone ? 264 : 150} class="tag strong">{t('text on clipboard', '文字占剪贴板')}</text>
        <rect x={phone ? 20 : 520} y={phone ? 324 : 96} width={phone ? 260 : 180} height="84" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={phone ? 34 : 534} y={phone ? 350 : 122} class="rowlabel">{t('restore', '放回')}</text>
        <text x={phone ? 34 : 534} y={phone ? 378 : 150} class="tag strong">{t('old clipboard back', '旧剪贴板回来')}</text>
        {#if phone}
          <path d="M150 188 V202" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
          <path d="M150 302 V316" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
        {:else}
          <path d="M240 138 H262" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
          <path d="M490 138 H512" stroke="var(--muted)" stroke-width="2" marker-end="url(#deliver-arrow)" />
        {/if}
        <text x="20" y={phone ? 448 : 226} class="mono">{t('inserted:', '贴进去：')} {VOXT_RESTORE_AFTER_INSERT_MS} ms · {t('unknown:', '不确定：')} {VOXT_RESTORE_DEFAULT_MS} ms</text>
        <text x="20" y={phone ? 474 : 252} class="tag">{t('If another app wrote meanwhile, skip the restore.', '这中间别的 app 写过了，就不覆盖。')}</text>
        <text x={W / 2} y={phone ? 506 : 284} text-anchor="middle" class="tag strong">{t('Paste unconfirmed: the card offers Insert and Copy.', '粘贴未确认：卡片提供 Insert 和 Copy。')}</text>
        <rect x="20" y={phone ? 524 : 306} width={W - 40} height={phone ? 48 : 46} rx="8" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y={phone ? 542 : 322} class="rowlabel">{t('answer text', '答案文字')}</text>
        <text x="34" y={phone ? 564 : 342} class="tag">{t('send the deck to ', '把文件发给 ')}<tspan font-weight="600">Priya</tspan></text>
        <text x={W / 2} y={phone ? 620 : 392} text-anchor="middle" class="tag strong">{t('How does Voxt spell "Priya" right next time?', '下一次，Voxt 怎么把 “Priya” 写对？')}</text>
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('helper TextIO.swift · next: names and terms', 'helper TextIO.swift · 下一章：人名和术语') : t('Source: helper TextIO.swift · restore 150 ms after a confirmed paste, else 500 ms', '出处：helper TextIO.swift · 确认贴入后 150 ms 放回，否则 500 ms')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
