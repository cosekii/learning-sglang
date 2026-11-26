<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_HISTORY_KEEP_DAYS, VOXT_RETRY_KEEP_DAYS, VOXT_RETRY_KEEP_HOURS, VOXT_HISTORY_SHORTER_DAYS,
    VOXT_HISTORY_DEMO_PER_DAY, VOXT_HISTORY_DEMO_ROWS,
    VOXT_HISTORY_TODAY, VOXT_HISTORY_CUTOFF, VOXT_HISTORY_OLD_DATE, VOXT_HISTORY_KEPT_DATE,
    VOXT_HISTORY_OLD_DAYS, VOXT_HISTORY_KEPT_DAYS,
    VOXT_HISTORY_COUNT_EXAMPLE, VOXT_HISTORY_COUNT_ROWS, VOXT_HISTORY_COUNT_DELETED,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'One finished dictation leaves one history row with its text and app. It may also keep the recording.',
    captionZh: '一次听写留一条历史记录，里面有文字和应用。可能还带一段录音。',
  }, {
    caption: 'The history row expires at 90 days. A failed or cancelled recording has its own 7-day clock.',
    captionZh: '历史记录 90 天后到期。失败或取消的录音另有 7 天的钟。',
  }, {
    caption: 'By default, entries older than 90 days are deleted with their recordings.',
    captionZh: '默认清理会删掉超过 90 天的记录，连同录音。',
  }, {
    caption: 'The same cleanup keeps at most N entries of each kind. Zero means no limit.',
    captionZh: '清理还给每种功能留最多 N 条。设 0 就是不限。',
  }, {
    caption: 'A failed or cancelled recognition keeps its recording 7 days when recordings are off. With recordings on, it lasts as long as the row.',
    captionZh: '保存录音关着时，失败或取消的录音留 7 天。开着时跟着记录走。',
  }, {
    caption: 'Retry reads that recording, recognizes it again, and runs the current settings. It updates the same row and inserts nothing.',
    captionZh: '重试读那段录音，重新识别，再用现在的设置跑一遍。它改同一条记录，不插入文字。',
  }, {
    caption: 'The JSONL export writes one object a line. Each object keeps the row’s fields.',
    captionZh: 'JSONL 导出每行一个对象。每个对象保留记录里的字段。',
  }, {
    caption: 'The Markdown export groups rows by day. Each line has time, app and text.',
    captionZh: 'Markdown 导出按天分组。每行只有时间、应用和文字。',
  }, {
    caption: 'The access switch opens one logged command. Programs running as you can still open the database directly.',
    captionZh: '访问开关只开一条会记账的命令。你账户里的程序仍能直接打开数据库。',
  }];
  const ariaLabels = [{
    en: 'One finished dictation leaves one row in the history. The row holds the kind, the app, the final text, and sometimes a recording of the voice.',
    zh: '一次听写结束后，历史里留下一条记录。记录里有功能种类、应用、最后的文字，有时还有一段录音。',
  }, {
    en: 'Two separate clocks. The history row lasts 90 days by default and its clock starts at the shortcut. A recording kept for a retry lasts 7 days and its clock starts when the retry recording is saved; it appears only when recognition failed or the user cancelled, and recordings are off.',
    zh: '两个分开的钟。历史记录默认留 90 天，钟从按下快捷键开始。为重试留下的录音留 7 天，钟从重试录音保存开始；它只在识别失败或用户取消、并且保存录音关着时出现。',
  }, {
    en: 'The cleanup deletes a history row when it is older than the cutoff. The cutoff is today minus the keep days, 90 days by default. The row goes with its recording.',
    zh: '历史记录超过分界线时会被清理删掉。分界线是今天减去保留天数，默认 90 天。记录连同录音一起删。',
  }, {
    en: 'The cleanup also keeps at most N entries of each kind. Transcribe, translate and rewrite each count on their own. Zero means no limit, which is the default.',
    zh: '清理还给每种功能各留最多 N 条。听写、翻译、改写各自计数。设 0 表示不限，这是默认。',
  }, {
    en: 'When recognition failed or the user cancelled, the row keeps its recording for 7 days even if recordings are off. A sweep runs every hour; the copy goes at the first sweep after its time.',
    zh: '识别失败或用户取消时，即使保存录音关着，记录也会保留录音 7 天。每小时扫一次；到期后的第一次清扫才删。',
  }, {
    en: 'Retry opens the kept recording, recognizes the whole file again, and runs the language-model step with the settings as they are now, when the feature has one. A Transcribe retry can stop after a whole-text snippet, with cleanup off, or with no language model. It updates the same row in place, inserts nothing, and clears a retry-only recording on success.',
    zh: '重试打开留下的录音，把整份文件重新识别，再用现在的设置跑语言模型这一步——前提是这个功能有语言模型。听写重试可能停在整段快捷短语、清理关着或没有语言模型。它原地更新同一条记录，不插入文字，成功时删掉只为重试保留的录音。',
  }, {
    en: 'The JSONL export writes one JSON object per line, oldest first. It supports the whole Row schema: id, time, kind, app, text, heard, instruction, target language, selection and typed. Empty optional fields are omitted, so a Transcribe row with an unknown app has no app key, and it has no instruction or target language. selection needs include selected text; typed also needs a Rewrite with a spoken instruction. Neither format writes recordings, web addresses, errors, internal names or timings.',
    zh: 'JSONL 导出每行一个 JSON 对象，从旧到新。它支持整份 Row 结构：id、时间、功能、应用、文字、识别原文、口述指令、目标语言、选中文字和输入文字。空的可选字段不写，所以应用未知的听写没有 app 键，也没有口述指令和目标语言。选中文字要打开「包含选中文字」；输入文字还要是带口述指令的改写。录音、网址、错误、内部名字和计时两种格式都不写。',
  }, {
    en: 'The Markdown export groups rows by local day. Each line has the time, the app when known, and the delivered text. It leaves out id, kind, heard, instruction, target language, selection and typed. Neither format writes recordings, web addresses, errors, internal names or timings.',
    zh: 'Markdown 导出按本地日期分组。每行只有时间、知道时的应用、交付的文字。它不带 id、功能、识别原文、口述指令、目标语言、选中文字和输入文字。录音、网址、错误、内部名字和计时两种格式都不写。',
  }, {
    en: 'The access switch controls one command for other programs. Off, the command gets no answer. On, every read is logged, and a new program name raises a notice. The switch is not a wall: a program running as the user can open the database file directly.',
    zh: '访问开关只控制给其他程序用的一条命令。关着时命令得不到回答。开着时每次读取都记账，新程序名会提醒。它不是墙：以用户身份运行的程序能直接打开数据库文件。',
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
  const H = $derived((phone ? [720, 700, 700, 700, 760, 720, 430, 410, 800] : [440, 440, 470, 510, 500, 460, 400, 360, 540])[step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="hr-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="hr-arrow-accent" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="hr-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
        <marker id="hr-arrow-eos" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--eos)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x="20" y="22" class="tag strong">{t('ONE DICTATION → ONE HISTORY ROW', '一次听写 → 一条历史记录')}</text>
        <text x="20" y="46" class="tag">{t('A row holds what you said. A recording holds your voice.', '记录装着你说的话。录音装着你的声音。')}</text>
        {#if phone}
          <text x="20" y="70" class="tag">{t('It may keep the recording too.', '它也可能留着录音。')}</text>
          <rect x="20" y="86" width="260" height="238" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="112" class="rowlabel">{t('history row', '历史记录')}</text>
          <text x="34" y="144" class="tag">{t('kind', '功能')}</text>
          <text x="120" y="144" class="mono">transcribe</text>
          <text x="34" y="176" class="tag">{t('app', '应用')}</text>
          <text x="120" y="176" class="mono">Mail</text>
          <text x="34" y="208" class="tag">{t('text', '文字')}</text>
          <text x="120" y="208" class="mono">“send it to Priya.”</text>
          <text x="34" y="240" class="tag">{t('recording', '录音')}</text>
          <text x="120" y="240" class="mono" fill="var(--gen)">audio.wav</text>
          <text x="34" y="280" class="tag">{t('one row per finished dictation', '每次听写完成留一条')}</text>
          <text x="34" y="304" class="tag">{t('only if you keep recordings', '只在你保留录音时')}</text>
          <text x="20" y="362" class="tag strong">{VOXT_HISTORY_DEMO_PER_DAY} × {VOXT_HISTORY_KEEP_DAYS} = {VOXT_HISTORY_DEMO_ROWS} {t('rows', '条记录')}</text>
          <text x="20" y="386" class="tag">{t('example: 10 dictations a day', '举例：一天 10 次听写')}</text>
          <rect x="20" y="410" width="260" height="92" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="34" y="436" class="tag strong">{t('no clock yet', '还没有钟')}</text>
          <text x="34" y="462" class="tag">{t('both stay until a clock removes them', '两者都留着，直到钟把它们拿走')}</text>
          <text x="34" y="486" class="tag">{t('the next step adds the clocks', '下一步给它们加钟')}</text>
        {:else}
          <rect x="20" y="66" width="680" height="150" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="92" class="rowlabel">{t('history row', '历史记录')}</text>
          <text x="40" y="132" class="tag">{t('kind', '功能')}</text>
          <text x="120" y="132" class="mono">transcribe</text>
          <text x="40" y="164" class="tag">{t('app', '应用')}</text>
          <text x="120" y="164" class="mono">Mail</text>
          <text x="40" y="196" class="tag">{t('text', '文字')}</text>
          <text x="120" y="196" class="mono">“send it to Priya.”</text>
          <text x="420" y="132" class="tag">{t('recording', '录音')}</text>
          <text x="420" y="164" class="mono" fill="var(--gen)">audio.wav</text>
          <text x="420" y="196" class="tag">{t('only if you keep recordings', '只在你保留录音时')}</text>
          <text x="20" y="258" class="tag strong">{VOXT_HISTORY_DEMO_PER_DAY} {t('dictations a day ×', '次听写一天 ×')} {VOXT_HISTORY_KEEP_DAYS} {t('days =', '天 =')} {VOXT_HISTORY_DEMO_ROWS} {t('rows', '条记录')}</text>
          <text x="20" y="284" class="tag">{t('Each row holds the text. A kept recording holds your voice.', '每条记录装着文字。保留的录音装着你的声音。')}</text>
          <rect x="20" y="312" width="680" height="76" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="34" y="340" class="tag strong">{t('no clock yet', '还没有钟')}</text>
          <text x="34" y="366" class="tag">{t('Both stay until a clock removes them. The next step adds the clocks.', '两者都留着，直到有钟把它们拿走。下一步加钟。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('source: store.Entry · session/run.go keep()', '出处：store.Entry · session/run.go keep()') : t('Source: store.Entry · session/run.go keep() writes the row and its recording', '出处：store.Entry · session/run.go 的 keep() 写记录和录音')}</text>

      {:else if step === 1}
        <text x="20" y="22" class="tag strong">{t('TWO CLOCKS', '两个钟')}</text>
        <text x="20" y="46" class="tag">{t('Two things expire at different times.', '两样东西在不同时间到期。')}</text>
        {#if phone}
          <text x="20" y="80" class="boxtitle">{t('HISTORY ROW', '历史记录')}</text>
          <text x="280" y="80" text-anchor="end" class="tag strong" fill="var(--accent)">{VOXT_HISTORY_KEEP_DAYS} {t('days', '天')}</text>
          <line x1="20" y1="100" x2="280" y2="100" stroke="var(--line)" stroke-width="2" />
          <rect x="20" y="94" width="260" height="12" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="20" y="128" class="tag">{t('shortcut', '按下快捷键')}</text>
          <text x="280" y="128" text-anchor="end" class="tag">{t('expires', '到期')}</text>
          <text x="20" y="176" class="boxtitle">{t('RETRY RECORDING', '重试录音')}</text>
          <text x="280" y="176" text-anchor="end" class="tag strong" fill="var(--gen)">{VOXT_RETRY_KEEP_DAYS} {t('days', '天')}</text>
          <line x1="20" y1="196" x2="280" y2="196" stroke="var(--line)" stroke-width="2" />
          <rect x="20" y="190" width="20" height="12" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
          <line x1="40" y1="183" x2="40" y2="209" stroke="var(--gen)" stroke-width="2" />
          <line x1="40" y1="196" x2="280" y2="196" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4" />
          <text x="46" y="188" class="tag" fill="var(--gen)">{t('expires at day 7', '第 7 天到期')}</text>
          <text x="20" y="220" class="tag">{t('retry recording saved', '重试录音保存')}</text>
          <text x="20" y="244" class="tag">{t('same 90-day ruler', '同一条 90 天的尺')}</text>
          <text x="20" y="268" class="tag">{t(`7 days is ${VOXT_HISTORY_SHORTER_DAYS} days shorter.`, `7 天比 90 天短 ${VOXT_HISTORY_SHORTER_DAYS} 天。`)}</text>
          <rect x="20" y="286" width="260" height="122" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="312" class="tag strong">{t('a retry recording is', '重试录音是')}</text>
          <text x="34" y="336" class="tag">{t('a kept recording of a', '一段留下的录音，')}</text>
          <text x="34" y="360" class="tag">{t('failed or cancelled dictation, so it', '给失败或取消的听写，')}</text>
          <text x="34" y="384" class="tag">{t('can be tried again.', '好让它再试一次。')}</text>
          <rect x="20" y="424" width="260" height="98" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="34" y="450" class="tag strong">{t('when does it exist?', '什么时候才有？')}</text>
          <text x="34" y="476" class="tag">{t('recognition failed or you cancelled', '识别失败或你取消')}</text>
          <text x="34" y="500" class="tag">{t('and keep recordings is off', '并且保存录音关着')}</text>
        {:else}
          <text x="20" y="82" class="boxtitle">{t('HISTORY ROW', '历史记录')}</text>
          <text x="660" y="82" text-anchor="end" class="tag strong" fill="var(--accent)">{t('default', '默认')} {VOXT_HISTORY_KEEP_DAYS} {t('days', '天')}</text>
          <line x1="60" y1="110" x2="660" y2="110" stroke="var(--line)" stroke-width="2" />
          <rect x="60" y="104" width="600" height="12" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="60" y="136" class="tag">{t('shortcut', '按下快捷键')}</text>
          <text x="660" y="136" text-anchor="end" class="tag">{t('expires at day 90', '第 90 天到期')}</text>
          <text x="20" y="178" class="boxtitle">{t('RETRY RECORDING', '重试录音')}</text>
          <text x="660" y="178" text-anchor="end" class="tag strong" fill="var(--gen)">{t('default', '默认')} {VOXT_RETRY_KEEP_DAYS} {t('days', '天')}</text>
          <line x1="60" y1="206" x2="660" y2="206" stroke="var(--line)" stroke-width="2" />
          <rect x="60" y="200" width="47" height="12" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
          <line x1="107" y1="193" x2="107" y2="219" stroke="var(--gen)" stroke-width="2" />
          <line x1="107" y1="206" x2="660" y2="206" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4" />
          <text x="115" y="198" class="tag" fill="var(--gen)">{t('expires at day 7', '第 7 天到期')}</text>
          <text x="60" y="232" class="tag">{t('retry recording saved', '重试录音保存')}</text>
          <text x="660" y="232" text-anchor="end" class="tag">{t('same 90-day ruler', '同一条 90 天的尺')}</text>
          <text x="20" y="262" class="tag">{t(`7 days is ${VOXT_HISTORY_SHORTER_DAYS} days shorter than 90.`, `7 天比 90 天短 ${VOXT_HISTORY_SHORTER_DAYS} 天。`)}</text>
          <rect x="20" y="282" width="680" height="84" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="308" class="tag strong">{t('A retry recording is a kept recording of a failed or cancelled dictation, so it can be tried again.', '重试录音是一段留下的失败或取消的听写录音，好让它再试一次。')}</text>
          <text x="34" y="336" class="tag">{t('It exists only when recognition failed or you cancelled, and keep recordings is off.', '它只在识别失败或你取消、并且保存录音关着时出现。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('settings/history.go · session/session.go', 'settings/history.go · session/session.go') : t('Source: settings/history.go DefaultKeepDays 90 · session/session.go DefaultAudioRetention 7×24h', '出处：settings/history.go DefaultKeepDays 90 · session/session.go DefaultAudioRetention 7×24h')}</text>

      {:else if step === 2}
        <text x="20" y="22" class="tag strong">{t('CLOCK 1 · AGE', '钟 1 · 年龄')}</text>
        <text x="20" y="46" class="tag">{t('A row older than 90 days is deleted.', '超过 90 天的记录会被删。')}</text>
        {#if phone}
          <text x="20" y="78" class="mono">{t('today', '今天')} {VOXT_HISTORY_TODAY}</text>
          <text x="20" y="100" class="mono">− {VOXT_HISTORY_KEEP_DAYS} {t('days', '天')}</text>
          <text x="20" y="122" class="mono" fill="var(--accent)">{t('cutoff', '分界线')} {VOXT_HISTORY_CUTOFF}</text>
          <rect x="20" y="140" width="260" height="86" rx="8" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="34" y="166" class="tag strong">{VOXT_HISTORY_OLD_DAYS} {t('days old', '天前')}</text>
          <text x="34" y="190" class="mono">{VOXT_HISTORY_OLD_DATE}</text>
          <text x="34" y="214" class="tag strong" fill="var(--eos)">{t('older than cutoff → cleanup deletes', '早于分界线 → 清理时删')}</text>
          <rect x="20" y="240" width="260" height="86" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="266" class="tag strong">{VOXT_HISTORY_KEPT_DAYS} {t('days old', '天前')}</text>
          <text x="34" y="290" class="mono">{VOXT_HISTORY_KEPT_DATE}</text>
          <text x="34" y="314" class="tag strong" fill="var(--accent)">{t('newer than cutoff → stays', '晚于分界线 → 留下')}</text>
          <text x="20" y="356" class="tag">{t('the row goes with its recording', '记录连同录音一起删')}</text>
          <text x="20" y="380" class="tag">{t('the cutoff moves with today', '分界线跟着今天走')}</text>
          <text x="20" y="404" class="tag">{t('tomorrow it is one day later', '明天它就晚一天')}</text>
          <text x="20" y="440" class="tag strong">{t('runs at start', '启动时跑')}</text>
          <text x="20" y="464" class="tag">{t('after each new row', '每条新记录之后')}</text>
          <text x="20" y="488" class="tag">{t('when the setting changes', '设置改动时')}</text>
        {:else}
          <text x="20" y="86" class="mono">{t('today', '今天')} {VOXT_HISTORY_TODAY} − {VOXT_HISTORY_KEEP_DAYS} {t('days = cutoff', '天 = 分界线')} {VOXT_HISTORY_CUTOFF}</text>
          <line x1="360" y1="118" x2="360" y2="330" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 5" />
          <text x="368" y="114" class="tag strong">{t('cutoff', '分界线')}</text>
          <rect x="40" y="132" width="296" height="112" rx="10" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="56" y="160" class="rowlabel">{t('OLDER', '更早')}</text>
          <text x="56" y="190" class="tag strong">{VOXT_HISTORY_OLD_DAYS} {t('days old', '天前')} · {VOXT_HISTORY_OLD_DATE}</text>
          <text x="56" y="218" class="tag strong" fill="var(--eos)">{t('at cleanup, with its recording', '清理时删，录音一起')}</text>
          <rect x="384" y="132" width="296" height="112" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="400" y="160" class="rowlabel">{t('NEWER', '更晚')}</text>
          <text x="400" y="190" class="tag strong">{VOXT_HISTORY_KEPT_DAYS} {t('days old', '天前')} · {VOXT_HISTORY_KEPT_DATE}</text>
          <text x="400" y="218" class="tag strong" fill="var(--accent)">{t('stays, with its recording', '留下，录音一起')}</text>
          <path d="M170 244 V272" stroke="var(--eos)" stroke-width="2" marker-end="url(#hr-arrow-eos)" />
          <text x="184" y="266" class="tag" fill="var(--eos)">{t('removed', '被清掉')}</text>
          <text x="20" y="300" class="tag">{t('The cutoff moves with today: tomorrow it is one day later.', '分界线跟着今天走：明天它就晚一天。')}</text>
          <text x="20" y="334" class="tag strong">{t('When the automatic cleanup runs', '自动清理什么时候跑')}</text>
          <text x="20" y="358" class="tag">{t('at start · after each new row · when the setting changes', '启动时 · 每条新记录之后 · 设置改动时')}</text>
          <text x="20" y="392" class="tag">{t('Keep days is one of 365 / 180 / 90 / 30 / 7.', '保留天数可选 365 / 180 / 90 / 30 / 7。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('history_settings_ops.go · history_retention.go', 'history_settings_ops.go · history_retention.go') : t('Source: settings/history.go Cutoff() · sqlitestore/history_retention.go pruneWhere()', '出处：settings/history.go Cutoff() · sqlitestore/history_retention.go pruneWhere()')}</text>

      {:else if step === 3}
        <text x="20" y="22" class="tag strong">{t('CLOCK 1 · COUNT', '钟 1 · 条数')}</text>
        <text x="20" y="46" class="tag">{t('Each kind keeps its newest N rows.', '每种功能各留最新的 N 条。')}</text>
        {#if phone}
          <rect x="20" y="72" width="260" height="176" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="98" class="rowlabel">transcribe</text>
          <text x="34" y="124" class="tag strong">{VOXT_HISTORY_COUNT_ROWS} {t('rows', '条')}</text>
          <text x="34" y="150" class="tag" fill="var(--accent)">{t('keep newest', '留最新')} {VOXT_HISTORY_COUNT_EXAMPLE}</text>
          <text x="266" y="150" text-anchor="end" class="tag" fill="var(--eos)">{t('delete', '删')} {VOXT_HISTORY_COUNT_DELETED}</text>
          <rect x="34" y="162" width="227" height="18" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="261" y="162" width="5" height="18" rx="1" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="34" y="204" class="tag">{VOXT_HISTORY_COUNT_ROWS} − {VOXT_HISTORY_COUNT_EXAMPLE} = {VOXT_HISTORY_COUNT_DELETED}</text>
          <text x="34" y="228" class="tag">{t('blue 100/102 · red 2/102', '蓝 100/102 · 红 2/102')}</text>
          <rect x="20" y="264" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="290" class="rowlabel">translate</text>
          <text x="34" y="316" class="tag">{t('same rule, its own newest N', '同一规则，各自留最新 N 条')}</text>
          <text x="34" y="340" class="tag">{t('no shared count', '不共用条数')}</text>
          <rect x="20" y="376" width="260" height="96" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="402" class="rowlabel">rewrite</text>
          <text x="34" y="428" class="tag">{t('same rule, its own newest N', '同一规则，各自留最新 N 条')}</text>
          <text x="34" y="452" class="tag">{t('no shared count', '不共用条数')}</text>
          <text x="20" y="508" class="tag strong">{t('N: 50 / 100 / 300 / 500 / 1000', 'N 可选 50 / 100 / 300 / 500 / 1000')}</text>
          <text x="20" y="532" class="tag">{t('0 = no limit (default)', '0 = 不限（默认）')}</text>
          <text x="20" y="556" class="tag">{t('age and count run together', '年龄和条数一起生效')}</text>
          <text x="20" y="580" class="tag">{t('either rule can delete a row', '哪条规则都能删记录')}</text>
        {:else}
          <rect x="20" y="70" width="680" height="240" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="40" y="100" class="rowlabel">transcribe · {t('the example', '例子')}</text>
          <text x="40" y="124" class="tag strong">{VOXT_HISTORY_COUNT_ROWS} {t('rows', '条')}</text>
          <text x="330" y="124" class="tag" fill="var(--accent)">{t('keep newest', '留最新')} {VOXT_HISTORY_COUNT_EXAMPLE}</text>
          <text x="650" y="124" text-anchor="end" class="tag" fill="var(--eos)">{t('delete', '删')} {VOXT_HISTORY_COUNT_DELETED}</text>
          <rect x="40" y="136" width="588" height="40" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="628" y="136" width="12" height="40" rx="2" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="40" y="204" class="tag strong">{VOXT_HISTORY_COUNT_ROWS} − {VOXT_HISTORY_COUNT_EXAMPLE} = {VOXT_HISTORY_COUNT_DELETED}</text>
          <text x="40" y="230" class="tag">{t('The bar length is the row count: 102 rows in all, 100 kept, 2 deleted.', '条长就是条数：一共 102 条，留 100 条，删 2 条。')}</text>
          <text x="40" y="256" class="tag">{t('Blue is 100/102 of the bar; red is 2/102.', '蓝色占整条的 100/102，红色占 2/102。')}</text>
          <text x="40" y="288" class="tag">{t('The deleted rows are the oldest of this kind.', '删掉的是这种功能里最旧的记录。')}</text>
          <rect x="20" y="330" width="330" height="80" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="356" class="rowlabel">translate</text>
          <text x="34" y="382" class="tag">{t('same rule, its own newest N', '同一规则，各自留最新 N 条')}</text>
          <rect x="370" y="330" width="330" height="80" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="384" y="356" class="rowlabel">rewrite</text>
          <text x="384" y="382" class="tag">{t('same rule, its own newest N', '同一规则，各自留最新 N 条')}</text>
          <text x="20" y="446" class="tag strong">{t('N: 50 / 100 / 300 / 500 / 1000; 0 = no limit (default)', 'N 可选 50 / 100 / 300 / 500 / 1000；0 = 不限（默认）')}</text>
          <text x="20" y="472" class="tag">{t('Age and count run together: either rule can delete a row.', '年龄和条数一起生效：哪条规则都能删记录。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('history_retention.go · pruneWhere()', 'history_retention.go · pruneWhere()') : t('Source: sqlitestore/history_retention.go pruneWhere() · settings/history.go KeepCountChoices', '出处：sqlitestore/history_retention.go pruneWhere() · settings/history.go KeepCountChoices')}</text>

      {:else if step === 4}
        <text x="20" y="22" class="tag strong">{t('CLOCK 2 · RETRY RECORDING', '钟 2 · 重试录音')}</text>
        <text x="20" y="46" class="tag">{phone ? t('Failed or cancelled: 7 days with recordings off.', '保存录音关着时，留 7 天。') : t('A failed or cancelled recording lasts 7 days with recordings off.', '保存录音关着时，失败或取消的录音留 7 天。')}</text>
        {#if phone}
          <rect x="20" y="70" width="260" height="96" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="96" class="rowlabel">{t('failed transcribe', '失败的听写')}</text>
          <text x="34" y="120" class="mono">2026-11-26</text>
          <text x="34" y="150" class="mono" fill="var(--gen)">audio.wav</text>
          <text x="20" y="204" class="boxtitle">{t('HISTORY ROW · 90 days', '历史记录 · 90 天')}</text>
          <rect x="20" y="216" width="260" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="20" y="250" class="boxtitle">{t('RETRY RECORDING · 7 days', '重试录音 · 7 天')}</text>
          <rect x="20" y="262" width="20" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
          <line x1="40" y1="258" x2="40" y2="276" stroke="var(--gen)" stroke-width="2" />
          <line x1="40" y1="267" x2="280" y2="267" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4" />
          <text x="46" y="284" class="tag" fill="var(--gen)">{t('expires at day 7', '第 7 天到期')}</text>
          <text x="20" y="304" class="tag">{t('kept even when keep recordings is off', '保存录音关着也留')}</text>
          <text x="20" y="328" class="tag">{t('so the dictation can run again', '所以这次听写还能再跑')}</text>
          <text x="20" y="364" class="tag strong">{t('retry clock:', '重试钟：')} {VOXT_RETRY_KEEP_DAYS} × 24 = {VOXT_RETRY_KEEP_HOURS} {t('hours', '小时')}</text>
          <text x="20" y="388" class="tag">{t('sweep: every 1 hour', '清扫：每 1 小时')}</text>
          <text x="20" y="424" class="tag">{t('successful retry deletes it at once', '重试成功马上删')}</text>
          <text x="20" y="448" class="tag">{t('recordings on: it follows the row', '保存录音开：跟着记录走')}</text>
          <text x="20" y="472" class="tag">{t('so it lasts as long as the row', '所以和记录一样久')}</text>
        {:else}
          <rect x="20" y="66" width="680" height="86" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="34" y="92" class="rowlabel">{t('failed transcribe', '失败的听写')}</text>
          <text x="34" y="120" class="mono">2026-11-26</text>
          <text x="250" y="92" class="tag">{t('no result', '没有结果')}</text>
          <text x="250" y="120" class="mono" fill="var(--gen)">audio.wav</text>
          <text x="470" y="92" class="tag">{t('kept so the dictation can run again', '留给这次听写再跑')}</text>
          <text x="470" y="120" class="tag" fill="var(--gen)">{t('even with recordings off', '保存录音关着也留')}</text>
          <text x="20" y="182" class="boxtitle">{t('HISTORY ROW', '历史记录')}</text>
          <text x="660" y="182" text-anchor="end" class="tag strong" fill="var(--accent)">{VOXT_HISTORY_KEEP_DAYS} {t('days', '天')}</text>
          <rect x="60" y="192" width="600" height="12" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="20" y="236" class="boxtitle">{t('RETRY RECORDING', '重试录音')}</text>
          <text x="660" y="236" text-anchor="end" class="tag strong" fill="var(--gen)">{VOXT_RETRY_KEEP_DAYS} {t('days', '天')}</text>
          <rect x="60" y="246" width="47" height="12" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
          <line x1="107" y1="240" x2="107" y2="264" stroke="var(--gen)" stroke-width="2" />
          <line x1="107" y1="252" x2="660" y2="252" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4" />
          <text x="115" y="278" class="tag" fill="var(--gen)">{t('expires at day 7', '第 7 天到期')}</text>
          <text x="20" y="296" class="tag strong">{t('retry clock:', '重试钟：')} {VOXT_RETRY_KEEP_DAYS} × 24 = {VOXT_RETRY_KEEP_HOURS} {t('hours', '小时')}</text>
          <text x="20" y="322" class="tag">{t('sweep: every 1 hour', '清扫：每 1 小时')}</text>
          <text x="20" y="348" class="tag">{t('A successful retry deletes it at once.', '重试成功马上删掉它。')}</text>
          <text x="20" y="374" class="tag">{t('With recordings on, the recording follows the row’s clock.', '保存录音开着时，录音跟着记录的钟走。')}</text>
          <text x="20" y="410" class="tag strong">{t('What the copy is for', '这份副本干什么用')}</text>
          <text x="20" y="434" class="tag">{t('Retry runs the dictation again from this file.', '重试就是拿这段录音再跑一次这次听写。')}</text>
          <text x="20" y="458" class="tag">{t('When it is gone, Retry says the recording is gone.', '录音没了，重试就说录音已经不在。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('session.go · session/run.go · history_retry.go', 'session.go · session/run.go · history_retry.go') : t('Source: session/session.go DefaultAudioRetention · session/run.go AudioUntil · history_retry.go hourly sweep', '出处：session/session.go DefaultAudioRetention · session/run.go AudioUntil · history_retry.go 每小时扫一次')}</text>

      {:else if step === 5}
        <text x="20" y="22" class="tag strong">{t('RETRY USES THE RECORDING', '重试用那段录音')}</text>
        <text x="20" y="46" class="tag">{t('Read the whole file, recognize again, run today’s settings.', '读整份文件，重新识别，再用现在的设置。')}</text>
        {#if phone}
          {#each [
            { y: 66, title: t('history row', '历史记录'), sub: 'audio.wav', fill: 'var(--gen-soft)', stroke: 'var(--gen)' },
            { y: 164, title: t('read the file', '读文件'), sub: t('16 kHz mono WAV', '16 kHz 单声道 WAV'), fill: 'var(--bg)', stroke: 'var(--line)' },
            { y: 262, title: t('recognize', '重新识别'), sub: t('whole recording', '整段录音'), fill: 'var(--bg)', stroke: 'var(--line)' },
            { y: 360, title: t('run the settings', '跑现在的设置'), sub: t('cleanup / language', '清理／语言模型'), fill: 'var(--bg)', stroke: 'var(--line)' },
            { y: 458, title: t('update the same row', '改同一条记录'), sub: t('old text → new text', '旧文字 → 新文字'), fill: 'var(--accent-soft)', stroke: 'var(--accent)' },
          ] as b, i}
            <rect x="20" y={b.y} width="260" height="76" rx="8" fill={b.fill} stroke={b.stroke} />
            <text x="34" y={b.y + 28} class="rowlabel">{b.title}</text>
            <text x="34" y={b.y + 54} class="mono">{b.sub}</text>
            {#if i < 4}
              <path d="M150 {b.y + 76} V{b.y + 94}" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
            {/if}
          {/each}
          <text x="20" y="566" class="tag strong">{t('It inserts nothing.', '它不插入文字。')}</text>
          <text x="20" y="590" class="tag">{t('Only rows with a kept recording can retry.', '只有留着录音的记录能重试。')}</text>
          <text x="20" y="614" class="tag">{t('No recording → “the recording is gone”.', '没录音 → “录音已经不在”。')}</text>
        {:else}
          {#each [
            { x: 20, w: 146, title: t('history row', '历史记录'), sub: 'audio.wav', fill: 'var(--gen-soft)', stroke: 'var(--gen)' },
            { x: 186, w: 156, title: t('read the file', '读文件'), sub: t('16 kHz mono WAV', '16 kHz 单声道 WAV'), fill: 'var(--bg)', stroke: 'var(--line)' },
            { x: 362, w: 166, title: t('recognize', '重新识别'), sub: t('whole recording', '整段录音'), fill: 'var(--bg)', stroke: 'var(--line)' },
            { x: 548, w: 152, title: t('run the settings', '跑现在的设置'), sub: t('cleanup / language', '清理／语言模型'), fill: 'var(--bg)', stroke: 'var(--line)' },
          ] as b, i}
            <rect x={b.x} y="92" width={b.w} height="96" rx="8" fill={b.fill} stroke={b.stroke} />
            <text x={b.x + 14} y="120" class="rowlabel">{b.title}</text>
            <text x={b.x + 14} y="150" class="mono">{b.sub}</text>
            {#if i < 3}
              <path d="M{b.x + b.w} 140 H{b.x + b.w + 16}" stroke="var(--muted)" stroke-width="2" marker-end="url(#hr-arrow)" />
            {/if}
          {/each}
          <rect x="20" y="212" width="680" height="76" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="240" class="tag strong">{t('update the same row: old text → new text', '改同一条记录：旧文字 → 新文字')}</text>
          <text x="34" y="266" class="tag">{t('the entry’s app and translation target are reused', '沿用原来的应用和翻译目标')}</text>
          <text x="20" y="318" class="tag strong">{t('It inserts nothing.', '它不插入文字。')}</text>
          <text x="20" y="344" class="tag">{t('Only rows with a kept recording can retry. No recording → “the recording is gone”.', '只有留着录音的记录能重试。没录音 → “录音已经不在”。')}</text>
          <text x="20" y="370" class="tag">{t('A success deletes a retry-only recording when recordings are off.', '成功时，保存录音关着就删掉只为重试留的那份。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('session/retry.go · Retry()', 'session/retry.go · Retry()') : t('Source: session/retry.go Retry() · ErrNoRecording · History.Put()', '出处：session/retry.go Retry() · ErrNoRecording · History.Put()')}</text>

      {:else if step === 6}
        <text x="20" y="22" class="tag strong">{t('EXPORT · JSONL · ONE OBJECT A LINE', '导出 · JSONL · 一行一个对象')}</text>
        {#if phone}
          <text x="20" y="46" class="tag">{t('The whole row schema.', '整份记录结构。')}</text>
          <text x="20" y="66" class="tag">{t('Empty optional fields are left out.', '空的可选字段不写。')}</text>
          <text x="34" y="98" class="boxtitle">{t('field', '字段')}</text>
          <text x="266" y="98" text-anchor="end" class="boxtitle">{t('when it is there', '什么时候有')}</text>
          {#each [
            { name: 'id', en: 'always', zh: '总是' },
            { name: 'created_at', en: 'always', zh: '总是' },
            { name: 'kind', en: 'always', zh: '总是' },
            { name: 'app', en: 'when known', zh: '知道时' },
            { name: 'text', en: 'always', zh: '总是' },
            { name: 'heard', en: 'always', zh: '总是' },
            { name: 'instruction', en: 'Rewrite + words', zh: '改写 + 口述' },
            { name: 'target_lang', en: 'Translate', zh: '翻译' },
            { name: 'selection', en: 'with the setting', zh: '设置打开时' },
            { name: 'typed', en: 'setting + Rewrite + words', zh: '设置 + 改写 + 口述' },
          ] as f, i}
            <text x="34" y={122 + i * 22} class="mono">{f.name}</text>
            <text x="266" y={122 + i * 22} text-anchor="end" class="tag">{t(f.en, f.zh)}</text>
          {/each}
          <text x="20" y="352" class="tag strong">{t('One object a line.', '一行一个对象。')}</text>
          <text x="20" y="376" class="tag">{t('The schema has all ten fields.', '结构里有十个字段。')}</text>
          <text x="20" y="400" class="tag">{t('Only empty optional fields are absent.', '只有空的可选字段不写。')}</text>
        {:else}
          <text x="20" y="46" class="tag">{t('The whole row schema, minus empty optional fields.', '整份记录结构，去掉空的可选字段。')}</text>
          <text x="40" y="88" class="boxtitle">{t('field', '字段')}</text>
          <text x="360" y="88" class="boxtitle">{t('when it is in the object', '什么时候写进去')}</text>
          {#each [
            { name: 'id', en: 'always', zh: '总是' },
            { name: 'created_at', en: 'always', zh: '总是' },
            { name: 'kind', en: 'always', zh: '总是' },
            { name: 'app', en: 'when known', zh: '知道时' },
            { name: 'text', en: 'always', zh: '总是' },
            { name: 'heard', en: 'always', zh: '总是' },
            { name: 'instruction', en: 'Rewrite with spoken words', zh: '改写且有口述' },
            { name: 'target_lang', en: 'Translate', zh: '翻译' },
            { name: 'selection', en: 'include selected text on', zh: '包含选中文字打开时' },
            { name: 'typed', en: 'that setting + Rewrite + spoken words', zh: '该设置 + 改写 + 口述' },
          ] as f, i}
            <text x="40" y={118 + i * 22} class="mono">{f.name}</text>
            <text x="360" y={118 + i * 22} class="tag">{t(f.en, f.zh)}</text>
          {/each}
          <text x="20" y="346" class="tag strong">{t('One object a line. The schema supports all ten fields; empty optional fields are left out.', '一行一个对象。结构支持全部十个字段；空的可选字段不写。')}</text>
          <text x="20" y="370" class="tag">{t('A Transcribe row with an unknown app has no app key, and no instruction or target language.', '应用未知的听写没有 app 键，也没有口述指令和目标语言。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('historyapi/row.go · FromEntry · render.go', 'historyapi/row.go · FromEntry · render.go') : t('Source: historyapi/row.go Row tags · FromEntry · render.go JSONL', '出处：historyapi/row.go 的 Row 标签 · FromEntry · render.go 的 JSONL')}</text>

      {:else if step === 7}
        <text x="20" y="22" class="tag strong">{t('EXPORT · MARKDOWN · A DAY SECTION', '导出 · MARKDOWN · 一天一节')}</text>
        {#if phone}
          <text x="20" y="46" class="tag">{t('Rows grouped by local day.', '记录按本地日期分组。')}</text>
          <text x="20" y="66" class="tag">{t('Each line has time, app and text.', '每行只有时间、应用和文字。')}</text>
          <rect x="20" y="90" width="260" height="160" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="122" class="mono">## 2026-11-26</text>
          <text x="34" y="152" class="mono">- 09:14 · Mail: hello Priya.</text>
          <text x="34" y="180" class="mono">- 09:20 ·: no app name</text>
          <text x="34" y="208" class="mono">- 09:31 · Notes: buy milk</text>
          <text x="20" y="278" class="tag">{t('Only time, app (when known), text.', '只有时间、应用（知道时）和文字。')}</text>
          <text x="20" y="306" class="tag">{t('No id, kind, heard, instruction,', '不带 id、功能、识别原文、口述指令、')}</text>
          <text x="20" y="328" class="tag">{t('target_lang, selection, typed.', '目标语言、选中和输入文字。')}</text>
          <text x="20" y="358" class="tag">{t('Never either: recording, web address,', '两种都不带：录音、网址、')}</text>
          <text x="20" y="380" class="tag">{t('errors, internal names, timings.', '错误、内部名字、计时。')}</text>
        {:else}
          <text x="20" y="46" class="tag">{t('Rows grouped by local day.', '记录按本地日期分组。')}</text>
          <rect x="20" y="80" width="680" height="150" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="40" y="112" class="mono">## 2026-11-26</text>
          <text x="40" y="142" class="mono">- 09:14 · Mail: send it to Priya.</text>
          <text x="40" y="170" class="mono">- 09:20 ·: no app name</text>
          <text x="40" y="198" class="mono">- 09:31 · Notes: buy milk</text>
          <text x="20" y="258" class="tag">{t('Each line: time, app (when known), text.', '每行：时间、应用（知道时）、文字。')}</text>
          <text x="20" y="286" class="tag">{t('Not in a Markdown file: id, kind, heard, instruction, target_lang, selection, typed.', 'Markdown 文件里没有：id、功能、识别原文、口述指令、目标语言、选中和输入文字。')}</text>
          <text x="20" y="314" class="tag">{t('Never in either format: recording, web address, errors, internal names, timings.', '两种格式都没有：录音、网址、错误、内部名字、计时。')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('historyapi/render.go · markdown()', 'historyapi/render.go · markdown()') : t('Source: historyapi/render.go Renderer.markdown()', '出处：historyapi/render.go 的 Renderer.markdown()')}</text>

      {:else if step === 8}
        <text x="20" y="22" class="tag strong">{t('THE ACCESS SWITCH', '访问开关')}</text>
        <text x="20" y="46" class="tag">{t('One logged command, only while the switch is on.', '一条会记账的命令，只在开关打开时。')}</text>
        {#if phone}
          <rect x="20" y="66" width="260" height="250" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="92" class="rowlabel">{t('the documented way', '有文档的那条路')}</text>
          <text x="34" y="122" class="tag strong">{t('switch off', '开关关')}</text>
          <text x="34" y="146" class="tag">{t('command gets no answer (exit 3)', '命令没有回答（退出码 3）')}</text>
          <text x="34" y="180" class="tag strong">{t('switch on', '开关开')}</text>
          <text x="34" y="204" class="tag">{t('each read logs time, count, program', '每次读取记时间、条数、程序')}</text>
          <text x="34" y="228" class="tag">{t('a new program name raises a notice', '新程序名会提醒')}</text>
          <text x="34" y="252" class="tag">{t('the log holds no text', '日志里没有文字')}</text>
          <text x="34" y="288" class="tag">{t('this is opt-in and visible', '这条路要你打开，而且看得见')}</text>
          <rect x="20" y="332" width="260" height="164" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="34" y="358" class="rowlabel">{t('same account, direct', '同一账户，直接开')}</text>
          <text x="34" y="386" class="mono">voxtnew.db</text>
          <text x="34" y="412" class="tag">{t('the one file that holds the history', '装历史的那一个文件')}</text>
          <text x="34" y="436" class="tag">{t('a program running as you reads it', '以你身份运行的程序能读它')}</text>
          <text x="34" y="460" class="tag">{t('not logged; the switch does not change it', '不记账；开关改不了这一点')}</text>
          <text x="34" y="484" class="tag">{t('the switch does not block this', '开关挡不住这一点')}</text>
          <text x="20" y="526" class="tag">{t('other accounts cannot open the channel', '其他账户打不开这条通道')}</text>
          <text x="20" y="550" class="tag">{t('there is no network port', '没有网络端口')}</text>
          <rect x="20" y="578" width="260" height="102" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="34" y="604" class="tag strong">{t('next chapter', '下一章')}</text>
          <text x="34" y="630" class="tag">{t('an audio file you already have', '一个现成的音频文件')}</text>
          <text x="34" y="654" class="tag">{t('→ SRT or TXT. How?', '→ SRT 或 TXT。怎么变？')}</text>
        {:else}
          <rect x="20" y="66" width="400" height="238" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="34" y="92" class="rowlabel">{t('the documented way', '有文档的那条路')}</text>
          <text x="34" y="124" class="tag strong">{t('switch off', '开关关')}</text>
          <text x="34" y="148" class="tag">{t('the command gets no answer (exit 3)', '命令没有回答（退出码 3）')}</text>
          <text x="34" y="182" class="tag strong">{t('switch on', '开关开')}</text>
          <text x="34" y="206" class="tag">{t('each read logs time, count, program name', '每次读取记时间、条数、程序名')}</text>
          <text x="34" y="230" class="tag">{t('a new program name raises a notice', '新程序名会提醒')}</text>
          <text x="34" y="254" class="tag">{t('the log holds no history text', '日志里没有历史文字')}</text>
          <text x="34" y="284" class="tag">{t('opt-in, and visible to you', '要你打开，而且你看得见')}</text>
          <rect x="440" y="66" width="260" height="238" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="454" y="92" class="rowlabel">{t('same account, direct', '同一账户，直接开')}</text>
          <text x="454" y="124" class="mono">voxtnew.db</text>
          <text x="454" y="150" class="tag">{t('the one file that holds', '装历史的')}</text>
          <text x="454" y="172" class="tag">{t('the history', '那一个文件')}</text>
          <text x="454" y="204" class="tag">{t('a program running as you', '以你身份运行的程序')}</text>
          <text x="454" y="226" class="tag">{t('can read it directly', '能直接读它')}</text>
          <text x="454" y="252" class="tag">{t('not logged', '不记账')}</text>
          <text x="454" y="276" class="tag">{t('the switch does not change it', '开关改不了这一点')}</text>
          <text x="20" y="336" class="tag">{t('Other accounts cannot open the channel (file mode 0600 inside ~/Library). There is no network port.', '其他账户打不开这条通道（文件权限 0600，在 ~/Library 里）。没有网络端口。')}</text>
          <text x="20" y="368" class="tag strong">{t('The switch is opt-in and visible; it does not stop a program running as you.', '这个开关要你打开，而且看得见；它挡不住以你身份运行的程序。')}</text>
          <rect x="20" y="396" width="680" height="84" rx="8" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
          <text x="34" y="424" class="tag strong">{t('next chapter', '下一章')}</text>
          <text x="34" y="450" class="tag">{t('An audio file you already have becomes SRT or TXT. How does a file become text?', '一个现成的音频文件变成 SRT 或 TXT。文件怎样变成文字？')}</text>
        {/if}
        <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{phone ? t('docs/history-access.md · history_access_controller.go', 'docs/history-access.md · history_access_controller.go') : t('Source: docs/history-access.md · history_access_controller.go · historyapi/server.go', '出处：docs/history-access.md · history_access_controller.go · historyapi/server.go')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>
