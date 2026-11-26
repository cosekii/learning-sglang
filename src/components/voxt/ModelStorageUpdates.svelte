<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_MODEL_FILE_COUNT,
    VOXT_MODEL_WEIGHTS_BYTES,
    VOXT_MODEL_VOCAB_BYTES,
    VOXT_MODEL_TOTAL_BYTES,
    VOXT_MODEL_TOTAL_GB,
    VOXT_MODEL_VAD_BYTES,
    VOXT_MODEL_JOB_BYTES,
    VOXT_MODEL_APP_RATIO,
    VOXT_APP_MB,
    VOXT_DOWNLOAD_RESERVE_GB,
    VOXT_SERVER_IDLE_MINUTES,
    VOXT_MODEL_COMMIT,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'The model arrives separately and is about nine times the app.',
    captionZh: '模型单独下载，大小约是应用的 9 倍。',
  }, {
    caption: "One pinned snapshot names the model's exact files and their fingerprints.",
    captionZh: '一个固定快照写清模型的文件和指纹。',
  }, {
    caption: 'One download job has four parts: resume, room, checks, and needs.',
    captionZh: '一个下载任务有四部分：续传、空位、校验和所需模型。',
  }, {
    caption: 'Using a model starts its server. Ten idle minutes request a stop; its files stay.',
    captionZh: '使用模型会启动服务器。空闲 10 分钟请求停止，文件留着。',
  }, {
    caption: 'A feed updates a release build; without one, a matching DMG, else the release page.',
    captionZh: '有更新源时发布版在应用内更新。无源时，有匹配 DMG 就安装，没有才开发布页。',
  }, {
    caption: 'Downloads, unloads, and in-app updates finish in three different ways.',
    captionZh: '下载、卸载和应用内更新，各有不同的完成条件。',
  }];
  const ariaLabels = [{
    en: 'The 2.47 gigabyte model arrives separately and is about nine times the 280 megabyte app. The total is 2,467,856,503 bytes; divided by 280,000,000 app bytes, the ratio is about 8.8. Three things have different lifetimes: model files on disk, one speech-server process in memory, and the app bundle on disk. Automatic mode asks an idle speech server to stop after ten minutes; its files stay. An app update replaces only the app bundle.',
    zh: '2.47 GB 模型单独下载，约是 280 MB 应用的 9 倍。模型共 2,467,856,503 字节，除以应用的字节数 280,000,000，约为 8.8 倍。三样东西有不同寿命：磁盘上的模型文件、内存里的一个语音服务器进程、磁盘上的应用包。自动模式在空闲十分钟后请求语音服务器停止，但文件留着。应用更新只换应用包。',
  }, {
    en: 'A pinned snapshot means one exact version. The commit fixes nine tested files. A fingerprint is an ID made from a file\'s bytes, so it catches a changed or broken file. Large files use a SHA-256 fingerprint; other files use git\'s content ID, called a git blob ID. The total is the nine-file sum from Step 1. The snapshot folder on disk uses the full forty-character commit.',
    zh: '固定快照就是一个确定的版本。提交固定了测试过的九个文件。指纹是根据文件字节算出的标记，能发现文件变了或坏了。大文件用 SHA-256 指纹，其他文件用 git 的内容标记 git blob ID。总数来自第 1 步的九文件求和。磁盘上的快照文件夹使用完整的 40 位提交。',
  }, {
    en: 'One download job brings the model and the small models it needs. A cancel keeps the bytes already here and the next start continues. LFS files are checked with SHA-256 and other files with git blob IDs; a mismatch is an error. Two gigabytes must stay free. The 1.24 megabyte Silero voice detector finds speech and rides in the same job.',
    zh: '一个下载任务带来模型和它需要的小模型。取消后已经下到的字节留着，下次接着下。LFS 文件用 SHA-256 校验，其他文件用 git blob ID，不对就报错。磁盘上要留 2 GB 空位。1.24 MB 的 Silero 语音检测器负责找出语音，也在同一个任务里。',
  }, {
    en: 'The model files stay on disk. Using a model starts the speech server, a separate program that loads the model into memory. The Silero voice detector has its own small server. Automatic mode asks the speech server to stop after ten idle minutes; the unload finishes when the process exits. Settings offers 5, 15, 30 or 60 minutes, or keep until quit. The next use starts it again. Delete requests unloading and then file removal without waiting; a busy server exits after its uses end.',
    zh: '模型文件留在磁盘上。用模型会启动语音服务器，它是把模型读进内存的另一个程序。Silero 语音检测器有自己的小服务器。自动模式在空闲十分钟后请求语音服务器停止，卸载在进程退出时才算完成；设置里可以选 5、15、30 或 60 分钟，也可以一直留到退出应用。下次用会再启动。删除先请求卸载，再请求删文件，不等待进程退出；忙碌的服务器等这次用完再退出。',
  }, {
    en: "Voxt's update list is its signed list of new app versions. A release build with that list lets the updater replace the app bundle while the old version runs; a card then asks for a restart. Until the restart, the helper on disk is the new version, so the app's helper manager refuses to start it. A release build without the list offers a matching DMG or, when none matches, the release page. Development builds have no update route. Neither route touches the model folder.",
    zh: 'Voxt 的更新清单是它签名的新版本清单。发布版有这个清单时，更新器在旧版本运行时替换应用包，然后卡片请用户重启。重启之前，磁盘上的 helper 已经是新版本，应用的 helper 管理器就不启动它。发布版没有这个清单时，提供匹配的 DMG；没有匹配的 DMG 就提供发布页。开发版没有更新路线。两条路都不动模型文件夹。',
  }, {
    en: 'Three things finish in three ways. A download is done when every content check passes and the files sit in the library. An unload is done when the server process exits and frees memory. An in-app update is done after the app bundle is replaced and the app restarts. Updating the app downloads no model, stopping the server deletes no file, and deleting a model updates no app. The next panel asks which sounds Voxt records in a meeting: the microphone, other apps, or both.',
    zh: '三件事有三种收尾。下载在校验全部通过、文件进入模型库时完成。卸载在服务器进程退出、内存释放时完成。应用内更新在应用包被替换、应用重启后完成。更新应用不下载模型，停服务器不删文件，删模型不更新应用。下一幅图问会议会录下哪些声音：麦克风、其他应用，还是两者都录。',
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
  const H = $derived((phone ? [660, 610, 700, 820, 730, 640] : [470, 450, 460, 480, 480, 560])[step]);

  const gb = VOXT_MODEL_TOTAL_GB.toFixed(2);
  const weightsGb = (VOXT_MODEL_WEIGHTS_BYTES / 1_000_000_000).toFixed(2);
  const vocabMb = (VOXT_MODEL_VOCAB_BYTES / 1_000_000).toFixed(2);
  const vadMb = (VOXT_MODEL_VAD_BYTES / 1_000_000).toFixed(2);
  const vadShare = (VOXT_MODEL_VAD_BYTES / VOXT_MODEL_JOB_BYTES * 100).toFixed(2);
  const commitShort = VOXT_MODEL_COMMIT.slice(0, 7);
  const ratio = Math.round(VOXT_MODEL_APP_RATIO);
  const ratioExact = VOXT_MODEL_APP_RATIO.toFixed(1);
  const totalBytes = VOXT_MODEL_TOTAL_BYTES.toLocaleString('en-US');
  const weightsBytes = VOXT_MODEL_WEIGHTS_BYTES.toLocaleString('en-US');
  const otherBytes = (VOXT_MODEL_TOTAL_BYTES - VOXT_MODEL_WEIGHTS_BYTES).toLocaleString('en-US');
  const appBytes = (VOXT_APP_MB * 1_000_000).toLocaleString('en-US');
  const vadBytes = VOXT_MODEL_VAD_BYTES.toLocaleString('en-US');
  const vocabBytes = VOXT_MODEL_VOCAB_BYTES.toLocaleString('en-US');
  const jobBytes = VOXT_MODEL_JOB_BYTES.toLocaleString('en-US');
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="ms-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>

      {#if step === 0}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t(`THE MODEL IS ABOUT ${ratio}× THE APP`, `模型约是应用的 ${ratio} 倍`)}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{totalBytes} ÷ {appBytes} ≈ {ratioExact}×</text>
        {#if !phone}
          <rect x="20" y="72" width="212" height="225" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="126" y="98" text-anchor="middle" class="label blue">{t('MODEL FILES', '模型文件')}</text>
          <text x="126" y="145" text-anchor="middle" class="result">{gb} GB</text>
          <text x="126" y="178" text-anchor="middle" class="detail">{t(`${VOXT_MODEL_FILE_COUNT} files in the model library`, `模型库里 ${VOXT_MODEL_FILE_COUNT} 个文件`)}</text>
          <text x="126" y="200" text-anchor="middle" class="detail">{t('on disk, in Application Support', '在磁盘的 Application Support 里')}</text>
          <text x="126" y="222" text-anchor="middle" class="detail">{t('downloaded after install', '装好应用后再下载')}</text>

          <rect x="254" y="72" width="212" height="225" rx="12" fill="var(--bg)" stroke="var(--gen)" />
          <text x="360" y="98" text-anchor="middle" class="label amber">{t('SPEECH SERVER', '语音服务器')}</text>
          <text x="360" y="145" text-anchor="middle" class="result">{t('1 ASR process', '1 个 ASR 进程')}</text>
          <text x="360" y="178" text-anchor="middle" class="detail">{t('loads a model into memory', '把模型读进内存')}</text>
          <text x="360" y="200" text-anchor="middle" class="detail">{t('stays after use', '用完后还会留着')}</text>
          <text x="360" y="222" text-anchor="middle" class="detail">{t('Automatic: idle 10 min → stop request', '自动模式：空闲 10 分钟 → 请求停止')}</text>

          <rect x="488" y="72" width="212" height="225" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="594" y="98" text-anchor="middle" class="label blue">{t('APP BUNDLE', '应用包')}</text>
          <text x="594" y="145" text-anchor="middle" class="result">{VOXT_APP_MB} MB</text>
          <text x="594" y="178" text-anchor="middle" class="detail">{t('0.1.0-beta.1 bundle', '0.1.0-beta.1 程序包')}</text>
          <text x="594" y="200" text-anchor="middle" class="detail">{t('the program you open', '你打开的程序')}</text>
          <text x="594" y="222" text-anchor="middle" class="detail">{t('installed separately', '单独安装')}</text>

          <rect x="150" y="316" width="12" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="168" y="326" class="detail">{t('a file on disk', '磁盘上的文件')}</text>
          <rect x="360" y="316" width="12" height="12" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="378" y="326" class="detail">{t('a running program', '运行的程序')}</text>

          <text x="28" y="360" class="pt">·</text>
          <text x="38" y="360" class="detail">{t('the model arrives later, not inside the app', '模型是后来下载的，不在应用里面')}</text>
          <text x="28" y="386" class="pt">·</text>
          <text x="38" y="386" class="detail">{t('Automatic asks an idle server to stop; its files stay', '自动模式会请求空闲服务器停止，文件留着')}</text>
          <text x="28" y="412" class="pt">·</text>
          <text x="38" y="412" class="detail">{t('an app update replaces the bundle, not the model folder', '应用更新换的是应用，不是模型文件夹')}</text>
          <text x={W / 2} y="438" text-anchor="middle" class="formula">{weightsBytes} B + {otherBytes} B = {totalBytes} B</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: catalog.go:205-213, docs/release.md.', '出处：catalog.go:205-213、docs/release.md。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="112" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="150" y="86" text-anchor="middle" class="label blue">{t('MODEL FILES', '模型文件')}</text>
          <text x="150" y="118" text-anchor="middle" class="result">{gb} GB</text>
          <text x="150" y="142" text-anchor="middle" class="detail">{t(`${VOXT_MODEL_FILE_COUNT} files · model library`, `${VOXT_MODEL_FILE_COUNT} 个文件 · 模型库`)}</text>
          <text x="150" y="162" text-anchor="middle" class="detail">{t('downloaded later', '后来才下载')}</text>

          <rect x="15" y="186" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="150" y="208" text-anchor="middle" class="label amber">{t('SPEECH SERVER', '语音服务器')}</text>
          <text x="150" y="240" text-anchor="middle" class="result">{t('1 ASR process', '1 个 ASR 进程')}</text>
          <text x="150" y="262" text-anchor="middle" class="detail">{t('loads a model into memory', '把模型读进内存')}</text>
          <text x="150" y="280" text-anchor="middle" class="detail">{t('Automatic: idle 10 min → stop request', '自动模式：空闲 10 分钟 → 请求停止')}</text>

          <rect x="15" y="296" width="270" height="100" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="150" y="318" text-anchor="middle" class="label blue">{t('APP BUNDLE', '应用包')}</text>
          <text x="150" y="350" text-anchor="middle" class="result">{VOXT_APP_MB} MB</text>
          <text x="150" y="372" text-anchor="middle" class="detail">{t('0.1.0-beta.1 bundle', '0.1.0-beta.1 程序包')}</text>
          <text x="150" y="390" text-anchor="middle" class="detail">{t('not the model', '不是模型')}</text>

          <rect x="30" y="414" width="12" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="48" y="424" class="detail">{t('a file on disk', '磁盘上的文件')}</text>
          <rect x="160" y="414" width="12" height="12" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="178" y="424" class="detail">{t('a running program', '运行的程序')}</text>

          <text x="20" y="458" class="pt">·</text>
          <text x="30" y="458" class="detail">{t('the model arrives later,', '模型是后来下载的，')}</text>
          <text x="30" y="478" class="detail">{t('not inside the app', '不在应用里面')}</text>
          <text x="20" y="504" class="pt">·</text>
          <text x="30" y="504" class="detail">{t('Automatic asks an idle server to stop;', '自动模式会请求空闲服务器停止，')}</text>
          <text x="30" y="524" class="detail">{t('its files stay', '文件留着')}</text>
          <text x="20" y="550" class="pt">·</text>
          <text x="30" y="550" class="detail">{t('an app update replaces the app,', '应用更新换的是应用，')}</text>
          <text x="30" y="570" class="detail">{t('not the model folder', '不是模型文件夹')}</text>
          <text x={W / 2} y="608" text-anchor="middle" class="formula">{weightsBytes} B + {otherBytes} B</text>
          <text x={W / 2} y="630" text-anchor="middle" class="formula">= {totalBytes} B</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: catalog.go:205-213, docs/release.md.', '出处：catalog.go:205-213、docs/release.md。')}</text>
        {/if}
      {:else if step === 1}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('MODEL FILES · ONE PINNED SNAPSHOT', '模型文件 · 一个固定快照')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('pinned = exact version · fingerprint = byte ID', '固定 = 版本确定 · 指纹 = 字节标记')}</text>
        {#if !phone}
          <rect x="20" y="74" width="250" height="110" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="40" y="98" class="label">{t('REPO · ONLINE HOME', '仓库 · 网上地址')}</text>
          <text x="40" y="122" class="mono">mlx-community/</text>
          <text x="40" y="142" class="mono">Qwen3-ASR-1.7B-8bit</text>
          <text x="40" y="168" class="label">{t('commit', '提交')} {commitShort} {t('= first 7 of the full commit', '= 完整提交的前 7 位')}</text>
          <line x1="272" y1="129" x2="294" y2="129" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="300" y="74" width="400" height="190" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="316" y="98" class="label">{t(`${VOXT_MODEL_FILE_COUNT} FILES · STEP 1 TOTAL = ${gb} GB`, `${VOXT_MODEL_FILE_COUNT} 个文件 · 第 1 步总数 = ${gb} GB`)}</text>
          <text x="316" y="124" class="mono">model.safetensors</text>
          <text x="684" y="124" text-anchor="end" class="mono">{weightsGb} GB</text>
          <text x="316" y="142" class="mono small">{t('SHA-256 bf304b… = fingerprint from bytes', 'SHA-256 bf304b… = 字节指纹')}</text>
          <text x="316" y="172" class="mono">vocab.json</text>
          <text x="684" y="172" text-anchor="end" class="mono">{vocabMb} MB</text>
          <text x="316" y="190" class="mono small">{t("git blob ID = git's byte fingerprint", 'git blob ID = git 的字节指纹')}</text>
          <text x="316" y="208" class="mono small">{vocabBytes} B ≈ {vocabMb} MB</text>
          <text x="316" y="230" class="detail">{t(`… and ${VOXT_MODEL_FILE_COUNT - 2} more files`, `… 还有 ${VOXT_MODEL_FILE_COUNT - 2} 个文件`)}</text>
          <text x="316" y="254" class="mono small">snapshots/{VOXT_MODEL_COMMIT}</text>
          <text x="40" y="316" class="label">{t("ON DISK · THIS COMMIT'S FILES", '在磁盘上 · 这个提交的文件')}</text>
          <text x="40" y="340" class="mono small">models--mlx-community--Qwen3-ASR-1.7B-8bit</text>
          <text x="40" y="358" class="mono small">  snapshots/{VOXT_MODEL_COMMIT}</text>
          <text x="28" y="392" class="pt">·</text>
          <text x="38" y="392" class="detail">{t('a repo can change; the commit fixes the tested files', '仓库会变；提交固定了测试过的文件')}</text>
          <text x="28" y="416" class="pt">·</text>
          <text x="38" y="416" class="detail">{t('a fingerprint catches a changed or broken file', '指纹能发现文件变了或坏了')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: internal/models/catalog.go, hub.go.', '出处：internal/models/catalog.go、hub.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="110" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="30" y="86" class="label">{t('REPO · ONLINE HOME', '仓库 · 网上地址')}</text>
          <text x="30" y="108" class="mono">mlx-community/</text>
          <text x="30" y="128" class="mono">Qwen3-ASR-1.7B-8bit</text>
          <text x="30" y="154" class="label">{t('commit', '提交')} {commitShort} {t('= first 7 chars', '= 前 7 位')}</text>
          <line x1="150" y1="176" x2="150" y2="196" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="15" y="202" width="270" height="240" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="226" class="label">{t(`${VOXT_MODEL_FILE_COUNT} FILES · STEP 1 TOTAL = ${gb} GB`, `${VOXT_MODEL_FILE_COUNT} 个文件 · 第 1 步总数 = ${gb} GB`)}</text>
          <text x="30" y="254" class="mono">model.safetensors</text>
          <text x="30" y="272" class="mono small">{weightsGb} GB · {t('SHA-256 = byte fingerprint', 'SHA-256 = 字节指纹')}</text>
          <text x="30" y="300" class="mono">vocab.json</text>
          <text x="30" y="318" class="mono small">{vocabMb} MB · {t('git blob ID = byte fingerprint', 'git blob ID = 字节指纹')}</text>
          <text x="30" y="336" class="mono small">{vocabBytes} B ≈ {vocabMb} MB</text>
          <text x="30" y="364" class="detail">{t(`… and ${VOXT_MODEL_FILE_COUNT - 2} more files`, `… 还有 ${VOXT_MODEL_FILE_COUNT - 2} 个文件`)}</text>
          <text x="30" y="382" class="mono small">models--mlx-community--</text>
          <text x="30" y="402" class="mono small">Qwen3-ASR-1.7B-8bit/snapshots/</text>
          <text x="30" y="422" class="mono small">{VOXT_MODEL_COMMIT}</text>
          <text x="20" y="474" class="pt">·</text>
          <text x="30" y="474" class="detail">{t('a repo can change; the commit', '仓库会变；提交')}</text>
          <text x="30" y="494" class="detail">{t('fixes the tested files', '固定了测试过的文件')}</text>
          <text x="20" y="520" class="pt">·</text>
          <text x="30" y="520" class="detail">{t('a fingerprint catches', '指纹能发现文件')}</text>
          <text x="30" y="540" class="detail">{t('a changed or broken file', '变了或坏了')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Source: internal/models/catalog.go.', '出处：internal/models/catalog.go。')}</text>
        {/if}
      {:else if step === 2}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('ONE DOWNLOAD JOB · FOUR PARTS', '一个下载任务 · 四个部分')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('resume · room · checks · needs', '续传 · 空位 · 校验 · 所需模型')}</text>
        {#if !phone}
          <rect x="30" y="74" width="660" height="120" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="50" y="98" class="label">{t('DOWNLOAD · ONE JOB', '下载 · 一个任务')}</text>
          <rect x="50" y="112" width="620" height="26" rx="6" fill="var(--accent-soft)" stroke="var(--line)" />
          <rect x="50" y="112" width="248" height="26" rx="6" fill="var(--accent)" />
          <line x1="298" y1="106" x2="298" y2="144" stroke="var(--eos)" stroke-width="2" />
          <text x="50" y="162" class="detail">{t('Cancel keeps these bytes; the next start continues from here.', '取消后这些字节留着；下次从这里接着下。')}</text>
          <text x="670" y="162" text-anchor="end" class="mono">{gb} GB</text>

          <rect x="30" y="212" width="200" height="116" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="130" y="236" text-anchor="middle" class="label">{t('ROOM', '空位')}</text>
          <text x="130" y="268" text-anchor="middle" class="result">{VOXT_DOWNLOAD_RESERVE_GB} GB</text>
          <text x="130" y="292" text-anchor="middle" class="detail">{t('must stay free', '必须空着')}</text>
          <text x="130" y="312" text-anchor="middle" class="detail">{t('on the disk', '在磁盘上')}</text>

          <rect x="260" y="212" width="200" height="116" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="360" y="236" text-anchor="middle" class="label">{t('CHECK · EACH FILE', '校验 · 每个文件')}</text>
          <text x="360" y="268" text-anchor="middle" class="result">{t('SHA-256', 'SHA-256')}</text>
          <text x="360" y="292" text-anchor="middle" class="detail">{t('or git blob ID', '或 git blob ID')}</text>
          <text x="360" y="312" text-anchor="middle" class="detail">{t('mismatch → error', '不对就报错')}</text>

          <rect x="490" y="212" width="200" height="116" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="590" y="236" text-anchor="middle" class="label">{t('NEEDS', '一起装')}</text>
          <text x="590" y="268" text-anchor="middle" class="result">{vadMb} MB</text>
          <text x="590" y="292" text-anchor="middle" class="detail">{t('Silero VAD', 'Silero VAD')}</text>
          <text x="590" y="312" text-anchor="middle" class="detail">{t('finds speech', '找出语音')}</text>

          <text x={W / 2} y="360" text-anchor="middle" class="formula">{totalBytes} B + {vadBytes} B = {jobBytes} B</text>
          <text x={W / 2} y="386" text-anchor="middle" class="formula">{vadBytes} ÷ {jobBytes} × 100 ≈ {vadShare}%</text>
          <text x={W / 2} y="412" text-anchor="middle" class="cut">{t('CANCEL KEEPS THE PARTIAL FILES', '取消会保留已下载的文件')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: internal/models/manager.go, catalog.go.', '出处：internal/models/manager.go、catalog.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="88" class="label">{t('DOWNLOAD · ONE JOB', '下载 · 一个任务')}</text>
          <rect x="30" y="102" width="240" height="24" rx="6" fill="var(--accent-soft)" stroke="var(--line)" />
          <rect x="30" y="102" width="96" height="24" rx="6" fill="var(--accent)" />
          <line x1="126" y1="96" x2="126" y2="132" stroke="var(--eos)" stroke-width="2" />
          <text x="30" y="148" class="detail">{t('Cancel keeps the bytes.', '取消后字节留着。')}</text>
          <text x="30" y="168" class="mono">{gb} GB</text>
          <text x="270" y="168" text-anchor="end" class="detail">{t('total', '总共')}</text>

          <rect x="15" y="210" width="270" height="76" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="30" y="234" class="label">{t('ROOM', '空位')}</text>
          <text x="150" y="268" text-anchor="middle" class="result">{VOXT_DOWNLOAD_RESERVE_GB} GB</text>
          <text x="270" y="268" text-anchor="end" class="detail">{t('must stay free', '必须空着')}</text>

          <rect x="15" y="300" width="270" height="76" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="30" y="324" class="label">{t('CHECK · SHA-256 OR GIT BLOB ID', '校验 · SHA-256 或 GIT BLOB ID')}</text>
          <text x="150" y="346" text-anchor="middle" class="result">{t('each file', '每个文件')}</text>
          <text x="150" y="368" text-anchor="middle" class="detail">{t('mismatch → error', '不对就报错')}</text>

          <rect x="15" y="390" width="270" height="76" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="30" y="414" class="label">{t('NEEDS · SILERO VAD', '一起装 · SILERO VAD')}</text>
          <text x="150" y="448" text-anchor="middle" class="result">{vadMb} MB</text>
          <text x="270" y="448" text-anchor="end" class="detail">{t('finds speech', '找出语音')}</text>

          <text x={W / 2} y="500" text-anchor="middle" class="formula">{totalBytes} B</text>
          <text x={W / 2} y="522" text-anchor="middle" class="formula">+ {vadBytes} B = {jobBytes} B</text>
          <text x={W / 2} y="548" text-anchor="middle" class="formula">{vadBytes} ÷ {jobBytes}</text>
          <text x={W / 2} y="570" text-anchor="middle" class="formula">× 100 ≈ {vadShare}%</text>
          <text x={W / 2} y="610" text-anchor="middle" class="cut">{t('CANCEL KEEPS THE PARTIAL FILES', '取消会保留已下载的文件')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: models/manager.go, catalog.go.', '出处：models/manager.go、catalog.go。')}</text>
        {/if}
      {:else if step === 3}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t("ONE SERVER'S LIFE", '服务器的一生')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('first use · idle wait · unload', '首次使用 · 空闲等待 · 卸载')}</text>
        {#if !phone}
          <rect x="20" y="72" width="300" height="190" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="170" y="96" text-anchor="middle" class="label blue">{t('ON DISK', '在磁盘上')}</text>
          <text x="170" y="120" text-anchor="middle" class="detail">{t('the snapshot folder', '快照文件夹')}</text>
          <text x="170" y="144" text-anchor="middle" class="mono">Qwen3-ASR-1.7B-8bit</text>
          <text x="170" y="168" text-anchor="middle" class="label">{gb} GB</text>
          <text x="170" y="196" text-anchor="middle" class="detail">{t('stays after the server exits', '服务器退出后还留着')}</text>
          <line x1="322" y1="167" x2="352" y2="167" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="358" y="72" width="342" height="190" rx="12" fill="var(--bg)" stroke="var(--gen)" />
          <text x="529" y="96" text-anchor="middle" class="label amber">{t('IN MEMORY', '在内存里')}</text>
          <text x="529" y="122" text-anchor="middle" class="mono">qwen3_asr_server</text>
          <text x="529" y="148" text-anchor="middle" class="detail">{t('loads the model from the folder', '从这个文件夹读模型')}</text>
          <text x="529" y="172" text-anchor="middle" class="detail">{t('VAD has its own small server', 'VAD 有自己的小服务器')}</text>
          <text x="529" y="196" text-anchor="middle" class="label">{t(`Automatic: idle ${VOXT_SERVER_IDLE_MINUTES} min → stop request`, `自动模式：空闲 ${VOXT_SERVER_IDLE_MINUTES} 分钟 → 请求停止`)}</text>
          <text x="529" y="222" text-anchor="middle" class="detail">{t('next use → restart', '下次用 → 再启动')}</text>

          <rect x="20" y="284" width="680" height="110" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="40" y="308" class="label">{t('DELETE MODEL FILES', '删除模型文件')}</text>
          <rect x="60" y="324" width="150" height="44" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="135" y="351" text-anchor="middle" class="label">{t('1 · request unload', '1 · 请求卸载')}</text>
          <line x1="214" y1="346" x2="242" y2="346" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="248" y="324" width="180" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="338" y="351" text-anchor="middle" class="label">{t('2 · request delete', '2 · 请求删除')}</text>
          <text x="448" y="342" class="detail">{t('no wait for the process;', '不等待进程退出；')}</text>
          <text x="448" y="362" class="detail">{t('a busy server exits after its uses', '忙碌的服务器等用完再退出')}</text>
          <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Settings: 5, 15, 30, 60 min, or keep until quit.', '设置：5、15、30 或 60 分钟，或一直留到退出应用。')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: internal/omni/runtime.go, internal/local/library.go.', '出处：internal/omni/runtime.go、internal/local/library.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="170" rx="10" fill="var(--bg)" stroke="var(--accent)" />
          <text x="150" y="88" text-anchor="middle" class="label blue">{t('ON DISK', '在磁盘上')}</text>
          <text x="150" y="112" text-anchor="middle" class="detail">{t('the snapshot folder', '快照文件夹')}</text>
          <text x="150" y="136" text-anchor="middle" class="mono">Qwen3-ASR-1.7B-8bit</text>
          <text x="150" y="160" text-anchor="middle" class="label">{gb} GB</text>
          <text x="150" y="186" text-anchor="middle" class="detail">{t('stays after the server exits', '服务器退出后还留着')}</text>
          <line x1="150" y1="240" x2="150" y2="268" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="15" y="274" width="270" height="190" rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x="150" y="298" text-anchor="middle" class="label amber">{t('IN MEMORY', '在内存里')}</text>
          <text x="150" y="322" text-anchor="middle" class="mono">qwen3_asr_server</text>
          <text x="150" y="346" text-anchor="middle" class="detail">{t('loads the model from the folder', '从文件夹读模型')}</text>
          <text x="150" y="368" text-anchor="middle" class="detail">{t('VAD has its own small server', 'VAD 有自己的小服务器')}</text>
          <text x="150" y="394" text-anchor="middle" class="label">{t(`Automatic: idle ${VOXT_SERVER_IDLE_MINUTES} min → stop request`, `自动模式：空闲 ${VOXT_SERVER_IDLE_MINUTES} 分钟 → 请求停止`)}</text>
          <text x="150" y="420" text-anchor="middle" class="detail">{t('next use → restart', '下次用 → 再启动')}</text>

          <rect x="15" y="486" width="270" height="200" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="510" class="label">{t('DELETE MODEL FILES', '删除模型文件')}</text>
          <rect x="30" y="524" width="110" height="40" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="85" y="549" text-anchor="middle" class="label">{t('1 · unload', '1 · 卸载')}</text>
          <line x1="144" y1="544" x2="168" y2="544" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="174" y="524" width="96" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="222" y="549" text-anchor="middle" class="label">{t('2 · delete', '2 · 删除')}</text>
          <text x="30" y="592" class="detail">{t('requests: unload, then delete', '先请求卸载，再请求删除')}</text>
          <text x="30" y="614" class="detail">{t('no wait for the process', '不等待进程退出')}</text>
          <text x="30" y="644" class="detail">{t('idle → stop request', '空闲 → 请求停止')}</text>
          <text x="30" y="666" class="detail">{t('busy → stop after use', '忙碌 → 用完再停')}</text>
          <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Settings: 5, 15, 30, 60 min, or keep until quit.', '设置：5、15、30 或 60 分钟，或留到退出应用。')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: omni/runtime.go, local/library.go.', '出处：omni/runtime.go、local/library.go。')}</text>
        {/if}
      {:else if step === 4}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('ONE APP UPDATE · TWO ROUTES', '一次应用更新 · 两条路')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('feed → in-app · no feed: matching DMG, else page', '有源：应用内 · 无源：匹配 DMG，否则发布页')}</text>
        {#if !phone}
          <rect x="20" y="72" width="330" height="170" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="185" y="96" text-anchor="middle" class="label">{t('WITH UPDATE LIST · IN-APP', '有更新清单 · 应用内更新')}</text>
          <rect x="40" y="112" width="110" height="50" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="95" y="134" text-anchor="middle" class="detail">{t('Voxt 2.0', 'Voxt 2.0')}</text>
          <text x="95" y="151" text-anchor="middle" class="detail">{t('running now', '正在运行')}</text>
          <line x1="154" y1="137" x2="176" y2="137" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="182" y="112" width="148" height="50" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="256" y="134" text-anchor="middle" class="detail">{t('Voxt 2.1', 'Voxt 2.1')}</text>
          <text x="256" y="151" text-anchor="middle" class="detail">{t('on disk', '在磁盘上')}</text>
          <text x="185" y="192" text-anchor="middle" class="detail">{t('the updater replaces the bundle', '更新器替换整个应用包')}</text>

          <rect x="370" y="72" width="330" height="170" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="535" y="96" text-anchor="middle" class="label">{t('NO FEED · RELEASE BUILD', '没有更新源 · 发布版')}</text>
          <rect x="390" y="112" width="290" height="60" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="535" y="138" text-anchor="middle" class="detail">{t('matching DMG', '匹配的 DMG')}</text>
          <text x="535" y="158" text-anchor="middle" class="detail">{t('download and install', '下载安装')}</text>
          <text x="535" y="196" text-anchor="middle" class="detail">{t('no match → release page', '没有匹配 → 发布页')}</text>
          <text x="535" y="220" text-anchor="middle" class="detail">{t('development builds have no update', '开发版没有更新')}</text>

          <rect x="20" y="256" width="680" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="40" y="283" class="label blue">{t('MODEL FOLDER', '模型文件夹')}</text>
          <text x="190" y="283" class="mono">SGLang Omni/models · {gb} GB</text>
          <text x="680" y="283" text-anchor="end" class="detail">{t('untouched by both routes', '两条路都不碰它')}</text>

          <text x="40" y="324" class="label">{t('UNTIL RESTART', '重启之前')}</text>
          <rect x="40" y="340" width="150" height="54" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="115" y="364" text-anchor="middle" class="detail">{t('old version', '旧版本')}</text>
          <text x="115" y="382" text-anchor="middle" class="detail">{t('keeps running', '照常运行')}</text>
          <line x1="194" y1="367" x2="222" y2="367" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="228" y="340" width="200" height="54" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="328" y="364" text-anchor="middle" class="detail">{t('helper on disk', '磁盘上的 helper')}</text>
          <text x="328" y="382" text-anchor="middle" class="detail">{t('is already the new one', '已经是新的')}</text>
          <line x1="432" y1="367" x2="460" y2="367" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="466" y="340" width="214" height="54" rx="8" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="573" y="364" text-anchor="middle" class="detail">{t("app's helper manager refuses it", '应用的 helper 管理器不启动它')}</text>
          <text x="573" y="382" text-anchor="middle" class="detail">{t('mismatch with the app', '和应用的版本对不上')}</text>
          <text x={W / 2} y="432" text-anchor="middle" class="cut">{t('A CARD ASKS: RESTART VOXT TO FINISH', '卡片提示：重启 Voxt 才算装完')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: Voxt/updates.go, updates_github.go, docs/release.md.', '出处：Voxt/updates.go、updates_github.go、docs/release.md。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="150" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="88" text-anchor="middle" class="label">{t('WITH UPDATE LIST · IN-APP', '有更新清单 · 应用内更新')}</text>
          <rect x="30" y="102" width="100" height="44" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="80" y="120" text-anchor="middle" class="detail">{t('Voxt 2.0', 'Voxt 2.0')}</text>
          <text x="80" y="137" text-anchor="middle" class="detail">{t('running', '在运行')}</text>
          <line x1="134" y1="124" x2="156" y2="124" stroke="var(--muted)" stroke-width="2" marker-end="url(#ms-arrow)" />
          <rect x="162" y="102" width="108" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="216" y="120" text-anchor="middle" class="detail">{t('Voxt 2.1', 'Voxt 2.1')}</text>
          <text x="216" y="137" text-anchor="middle" class="detail">{t('on disk', '在磁盘上')}</text>
          <text x="150" y="172" text-anchor="middle" class="detail">{t('the updater replaces the app', '更新器替换整个应用')}</text>

          <rect x="15" y="234" width="270" height="130" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="258" text-anchor="middle" class="label">{t('NO FEED · RELEASE BUILD', '没有更新源 · 发布版')}</text>
          <rect x="30" y="272" width="240" height="42" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="297" text-anchor="middle" class="detail">{t('matching DMG', '匹配的 DMG')}</text>
          <text x="150" y="334" text-anchor="middle" class="detail">{t('no match → release page', '没有匹配 → 发布页')}</text>
          <text x="150" y="354" text-anchor="middle" class="detail">{t('dev build: no update route', '开发版没有更新')}</text>

          <rect x="15" y="378" width="270" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="405" text-anchor="middle" class="detail">{t(`model folder · ${gb} GB · untouched`, `模型文件夹 · ${gb} GB · 两条路都不碰`)}</text>

          <text x="30" y="446" class="label">{t('UNTIL RESTART', '重启之前')}</text>
          <rect x="15" y="460" width="270" height="46" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="488" text-anchor="middle" class="detail">{t('old version keeps running', '旧版本照常运行')}</text>
          <rect x="15" y="518" width="270" height="46" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="546" text-anchor="middle" class="detail">{t('helper on disk is new', '磁盘上的 helper 已是新的')}</text>
          <rect x="15" y="576" width="270" height="46" rx="8" fill="var(--eos-soft)" stroke="var(--eos)" />
          <text x="150" y="596" text-anchor="middle" class="detail">{t("app's helper manager refuses it", '应用的 helper 管理器不启动它')}</text>
          <text x="150" y="616" text-anchor="middle" class="detail">{t('version does not match the app', '和应用的版本对不上')}</text>
          <text x="150" y="652" text-anchor="middle" class="cut">{t('RESTART VOXT TO FINISH', '重启 Voxt 才算装完')}</text>
          <text x={W / 2} y={H - 12} text-anchor="middle" class="footnote">{t('Sources: updates.go, updates_github.go.', '出处：updates.go、updates_github.go。')}</text>
        {/if}
      {:else if step === 5}
        <text x={W / 2} y={phone ? 25 : 27} text-anchor="middle" class="title">{t('THREE THINGS, THREE ENDINGS', '三件事，三种收尾')}</text>
        <text x={W / 2} y={phone ? 47 : 50} text-anchor="middle" class="subtitle">{t('download · unload · update', '下载 · 卸载 · 更新')}</text>
        {#if !phone}
          <text x="40" y="84" class="label">{t('THING', '东西')}</text>
          <text x="270" y="84" class="label">{t('ACTION', '动作')}</text>
          <text x="450" y="84" class="label">{t('DONE WHEN', '算完成的条件')}</text>
          <line x1="20" y1="96" x2="700" y2="96" stroke="var(--line)" />

          <text x="40" y="128" class="label blue">{t('model files', '模型文件')}</text>
          <text x="270" y="128" class="detail">{t('download', '下载')}</text>
          <text x="450" y="128" class="detail">{t('every content check passes;', '内容校验全部通过；')}</text>
          <text x="450" y="148" class="detail">{t('files sit in the library', '文件进入模型库')}</text>
          <line x1="20" y1="168" x2="700" y2="168" stroke="var(--line)" />

          <text x="40" y="200" class="label amber">{t('speech server', '语音服务器')}</text>
          <text x="270" y="200" class="detail">{t('unload', '卸载')}</text>
          <text x="450" y="200" class="detail">{t('the process exits;', '进程退出；')}</text>
          <text x="450" y="220" class="detail">{t('memory is freed', '内存释放')}</text>
          <line x1="20" y1="240" x2="700" y2="240" stroke="var(--line)" />

          <text x="40" y="272" class="label blue">{t('app bundle', '应用包')}</text>
          <text x="270" y="272" class="detail">{t('in-app update', '应用内更新')}</text>
          <text x="450" y="272" class="detail">{t('the bundle is replaced;', '应用包被替换；')}</text>
          <text x="450" y="292" class="detail">{t('the app restarts', '应用重启')}</text>
          <line x1="20" y1="312" x2="700" y2="312" stroke="var(--line)" />

          <text x="28" y="346" class="pt">·</text>
          <text x="38" y="346" class="detail">{t('updating the app downloads no model', '更新应用不下载模型')}</text>
          <text x="28" y="372" class="pt">·</text>
          <text x="38" y="372" class="detail">{t('stopping the server deletes no file', '停服务器不删文件')}</text>
          <text x="28" y="398" class="pt">·</text>
          <text x="38" y="398" class="detail">{t('deleting a model updates no app', '删模型不更新应用')}</text>
          <text x={W / 2} y="426" text-anchor="middle" class="label">{t('NEXT · ONE MEETING', '下一步 · 一场会议')}</text>
          <rect x="160" y="440" width="400" height="44" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x={W / 2} y="467" text-anchor="middle" class="detail">{t('microphone ?  ·  app sounds ?', '麦克风？ · 其他应用的声音？')}</text>
          <text x={W / 2} y="516" text-anchor="middle" class="cut">{t(phone ? 'APP READY: WHAT DOES A MEETING RECORD?' : 'WITH THE APP READY, WHAT DOES A MEETING RECORD?', '应用就绪后，会议要录下什么？')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: models, omni/runtime.go, updates.go.', '出处：models、omni/runtime.go、updates.go。')}</text>
        {:else}
          <rect x="15" y="64" width="270" height="92" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="88" class="label blue">{t('model files', '模型文件')}</text>
          <text x="30" y="112" class="detail">{t('download', '下载')}</text>
          <text x="30" y="136" class="detail">{t('done: checks pass,', '完成：校验通过，')}</text>
          <text x="30" y="152" class="detail">{t('files in the library', '文件进了模型库')}</text>

          <rect x="15" y="166" width="270" height="92" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="190" class="label amber">{t('speech server', '语音服务器')}</text>
          <text x="30" y="214" class="detail">{t('unload', '卸载')}</text>
          <text x="30" y="238" class="detail">{t('done: process exits,', '完成：进程退出，')}</text>
          <text x="30" y="254" class="detail">{t('memory freed', '内存释放')}</text>

          <rect x="15" y="268" width="270" height="92" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="30" y="292" class="label blue">{t('app bundle', '应用包')}</text>
          <text x="30" y="316" class="detail">{t('in-app update', '应用内更新')}</text>
          <text x="30" y="340" class="detail">{t('done: bundle replaced,', '完成：应用包替换，')}</text>
          <text x="30" y="356" class="detail">{t('app restarts', '应用重启')}</text>

          <text x="20" y="394" class="pt">·</text>
          <text x="30" y="394" class="detail">{t('an update downloads no model', '更新不下载模型')}</text>
          <text x="20" y="420" class="pt">·</text>
          <text x="30" y="420" class="detail">{t('a stop deletes no file', '停服务器不删文件')}</text>
          <text x="20" y="446" class="pt">·</text>
          <text x="30" y="446" class="detail">{t('a delete updates no app', '删模型不更新应用')}</text>

          <text x={W / 2} y="490" text-anchor="middle" class="label">{t('NEXT · ONE MEETING', '下一步 · 一场会议')}</text>
          <rect x="15" y="506" width="270" height="44" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x={W / 2} y="533" text-anchor="middle" class="detail">{t('microphone ? · app sounds ?', '麦克风？ · 其他应用的声音？')}</text>
          <text x={W / 2} y="584" text-anchor="middle" class="cut">{t(phone ? 'APP READY: WHAT DOES A MEETING RECORD?' : 'WITH THE APP READY, WHAT DOES A MEETING RECORD?', '应用就绪后，会议要录下什么？')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Sources: models, runtime.go, updates.go.', '出处：models、runtime.go、updates.go。')}</text>
        {/if}
      {/if}
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
  .result { font-size: 20px; font-weight: 650; fill: var(--fg); }
  .mono { font-family: var(--mono); font-size: 11.5px; fill: var(--fg); }
  .mono.small { font-size: 10.5px; }
  .blue { fill: var(--accent); }
  .amber { fill: var(--gen); }
  .footnote { font-size: 10.5px; }
  .pt { font-size: 11px; fill: var(--muted); }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .footnote { font-size: 11px; }
    .mono { font-size: 10.5px; }
    .mono.small { font-size: 9.5px; }
    .result { font-size: 16px; }
  }
</style>
