<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { HYBRID_SYSTEM_TOKENS, HYBRID_NUM_BATCH_DEFAULT, HYBRID_NUM_BATCH_TUNED, HYBRID_SHORT_WAIT_DEFAULT_S, HYBRID_SHORT_WAIT_TUNED_S, HYBRID_WAIT_SAVED_S, HYBRID_WAIT_RATIO, HYBRID_RECOMPUTE_DEFAULT_MIN, HYBRID_RECOMPUTE_DEFAULT_MAX, HYBRID_RECOMPUTE_TUNED_MIN, HYBRID_RECOMPUTE_TUNED_MAX, HYBRID_COLD_DEFAULT_S, HYBRID_COLD_TUNED_S, HYBRID_COLD_EXTRA_S, HYBRID_USER_TOKENS, HYBRID_PROMPT_TOKENS, HYBRID_FULL_ATTENTION_NEW_TOKENS, HYBRID_LOG_MATCH_TOKENS, HYBRID_LOG_END_TOKENS, HYBRID_LOG_CHECKPOINT_TOKENS, HYBRID_LOG_REPLAY_POSITIONS, HYBRID_LOG_RECOMPUTE_APPROX, HYBRID_LOG_NEW_TOKENS, HYBRID_LOG_EXTRA_APPROX } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `At num_batch ${HYBRID_NUM_BATCH_DEFAULT}, the short request takes ${HYBRID_SHORT_WAIT_DEFAULT_S} s. At ${HYBRID_NUM_BATCH_TUNED}, it takes ${HYBRID_SHORT_WAIT_TUNED_S} s and recomputes ${HYBRID_RECOMPUTE_TUNED_MIN}–${HYBRID_RECOMPUTE_TUNED_MAX} tokens.`,
    captionZh: `同样的短请求，num_batch ${HYBRID_NUM_BATCH_DEFAULT} 用 ${HYBRID_SHORT_WAIT_DEFAULT_S} 秒，${HYBRID_NUM_BATCH_TUNED} 只用 ${HYBRID_SHORT_WAIT_TUNED_S} 秒。重算从 ${HYBRID_RECOMPUTE_DEFAULT_MIN}–${HYBRID_RECOMPUTE_DEFAULT_MAX} 个 token 降到 ${HYBRID_RECOMPUTE_TUNED_MIN}–${HYBRID_RECOMPUTE_TUNED_MAX} 个。`,
  }, {
    caption: `Full attention stores each token’s K/V in its own slot. A new request keeps ${HYBRID_SYSTEM_TOKENS.toLocaleString()} shared slots and computes only its ${HYBRID_USER_TOKENS}-token tail.`,
    captionZh: `全注意力把每个 token 的 K/V 单独存一格。新请求保留 ${HYBRID_SYSTEM_TOKENS.toLocaleString()} 格共同前缀，只算 ${HYBRID_USER_TOKENS} 个新 token。`,
  }, {
    caption: `A recurrent state is one fixed-size summary, updated by every token. Once the old tail joins it, token ${HYBRID_SYSTEM_TOKENS.toLocaleString()}’s version was not saved.`,
    captionZh: `recurrent state 是一份定长摘要，每个 token 都更新它。旧 user 并入后，第 ${HYBRID_SYSTEM_TOKENS.toLocaleString()} 个 token 时的摘要没有另存。`,
  }, {
    caption: `A checkpoint copies the whole state at one position. Restore at ${HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()} and replay about ${HYBRID_LOG_RECOMPUTE_APPROX.toLocaleString()} tokens to reach ${HYBRID_LOG_END_TOKENS.toLocaleString()}.`,
    captionZh: `checkpoint 把某个位置的整份 state 抄下来。从 ${HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()} 恢复，再重放约 ${HYBRID_LOG_RECOMPUTE_APPROX.toLocaleString()} 个 token 到 ${HYBRID_LOG_END_TOKENS.toLocaleString()}。`,
  }, {
    caption: 'A hybrid request needs one resume point for both layer kinds. SGLang truncates reusable KV to the newest node that still has Mamba state.',
    captionZh: 'hybrid 请求要为两类 layer 选一个共同恢复点。SGLang 把可复用 KV 截到最新仍存 Mamba state 的节点。',
  }, {
    caption: 'MambaRadixCache keeps token paths and state values separate. Evicting one internal state leaves a tombstone; matching falls back to an older surviving state.',
    captionZh: 'MambaRadixCache 分开管理 token 路径和 state。内部 state 被淘汰后留下墓碑，匹配会回退到更早仍存留的 state。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 460 : 410);
  const waitWidth = (seconds: number, width: number) => seconds / HYBRID_SHORT_WAIT_DEFAULT_S * width;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('Compare per-token attention KV with recurrent-state snapshots, replay and hybrid prefix matching.', '对照逐 token 注意力 KV 与 recurrent state 的快照、重放和 hybrid 前缀匹配。')}>
      {#if step === 0}
      {#if !phone}
        <text x="38" y="30" class="title">{t('One setting changes the short-request wait', '一个设置改变短请求等待')}</text>
        <text x="38" y="55" class="label">{t(`same machine · same ${HYBRID_SYSTEM_TOKENS.toLocaleString()}-token system · same short users`, `同一台机器 · 同一个 ${HYBRID_SYSTEM_TOKENS.toLocaleString()} token system · 同样的短 user`)}</text>
        <text x="40" y="88" class="small strong">num_batch</text>
        <text x="170" y="88" class="small strong">{t('short-request total wait', '短请求总耗时')}</text>
        <text x="552" y="88" class="small strong">{t('tokens recomputed', '重算 token')}</text>

        <text x="40" y="132" class="batch">{HYBRID_NUM_BATCH_DEFAULT} · {t('default', '默认')}</text>
        <rect x="170" y="103" width="300" height="46" rx="7" fill="var(--bg)" stroke="var(--line)" />
        <rect x="170" y="103" width={waitWidth(HYBRID_SHORT_WAIT_DEFAULT_S, 300)} height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="320" y="132" text-anchor="middle" class="time">{HYBRID_SHORT_WAIT_DEFAULT_S} s</text>
        <text x="552" y="132" class="tokens">{HYBRID_RECOMPUTE_DEFAULT_MIN.toLocaleString()}–{HYBRID_RECOMPUTE_DEFAULT_MAX.toLocaleString()}</text>

        <text x="40" y="237" class="batch">{HYBRID_NUM_BATCH_TUNED}</text>
        <rect x="170" y="208" width="300" height="46" rx="7" fill="var(--bg)" stroke="var(--line)" />
        <rect x="170" y="208" width={waitWidth(HYBRID_SHORT_WAIT_TUNED_S, 300)} height="46" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={180 + waitWidth(HYBRID_SHORT_WAIT_TUNED_S, 300)} y="237" class="time">{HYBRID_SHORT_WAIT_TUNED_S} s</text>
        <text x="552" y="237" class="tokens">{HYBRID_RECOMPUTE_TUNED_MIN}–{HYBRID_RECOMPUTE_TUNED_MAX}</text>

        <rect x="40" y="282" width="640" height="82" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="360" y="310" text-anchor="middle" class="result">{HYBRID_NUM_BATCH_TUNED}: {HYBRID_WAIT_SAVED_S} s {t('less waiting per short request', '每条短请求少等')} · {HYBRID_SHORT_WAIT_DEFAULT_S} ÷ {HYBRID_SHORT_WAIT_TUNED_S} ≈ {HYBRID_WAIT_RATIO.toFixed(1)}×</text>
        <text x="360" y="340" text-anchor="middle" class="cold">{t('cold startup', '冷启动')}: {HYBRID_COLD_DEFAULT_S} s → {HYBRID_COLD_TUNED_S} s · +{HYBRID_COLD_EXTRA_S} s</text>
        <rect x="40" y="366" width="13" height="13" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="61" y="377" class="small">{t('blue = total wait for one short request', '蓝色 = 一条短请求的总耗时')}</text>
      {:else}
        <text x="18" y="27" class="title">{t('One setting changes the wait', '一个设置改变等待')}</text>
        <text x="18" y="51" class="small">{t('same machine · same short users', '同一台机器 · 同样的短 user')}</text>
        <text x="18" y="71" class="small">{t(`same ${HYBRID_SYSTEM_TOKENS.toLocaleString()}-token system`, `同一个 ${HYBRID_SYSTEM_TOKENS.toLocaleString()} token system`)}</text>

        <rect x="20" y="91" width="260" height="111" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="117" class="batch">num_batch {HYBRID_NUM_BATCH_DEFAULT} · {t('default', '默认')}</text>
        <text x="266" y="117" text-anchor="end" class="time">{HYBRID_SHORT_WAIT_DEFAULT_S} s</text>
        <rect x="34" y="133" width="232" height="25" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="34" y="181" class="small">{t('recompute', '重算')} {HYBRID_RECOMPUTE_DEFAULT_MIN.toLocaleString()}–{HYBRID_RECOMPUTE_DEFAULT_MAX.toLocaleString()} token</text>

        <rect x="20" y="216" width="260" height="111" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="34" y="242" class="batch">num_batch {HYBRID_NUM_BATCH_TUNED}</text>
        <text x="266" y="242" text-anchor="end" class="time">{HYBRID_SHORT_WAIT_TUNED_S} s</text>
        <rect x="34" y="258" width="232" height="25" rx="5" fill="var(--bg)" stroke="var(--line)" />
        <rect x="34" y="258" width={waitWidth(HYBRID_SHORT_WAIT_TUNED_S, 232)} height="25" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="34" y="306" class="small">{t('recompute', '重算')} {HYBRID_RECOMPUTE_TUNED_MIN}–{HYBRID_RECOMPUTE_TUNED_MAX} token</text>

        <text x="150" y="357" text-anchor="middle" class="result">{HYBRID_WAIT_SAVED_S} s {t('less waiting', '少等')} · {HYBRID_SHORT_WAIT_DEFAULT_S} ÷ {HYBRID_SHORT_WAIT_TUNED_S} ≈ {HYBRID_WAIT_RATIO.toFixed(1)}×</text>
        <text x="150" y="385" text-anchor="middle" class="cold">{t('cold startup', '冷启动')}: {HYBRID_COLD_DEFAULT_S} s → {HYBRID_COLD_TUNED_S} s</text>
        <text x="150" y="407" text-anchor="middle" class="small">+{HYBRID_COLD_EXTRA_S} s · {t('blue = one short request', '蓝色 = 一条短请求')}</text>
      {/if}
      {:else if step === 1}
        <defs>
          <pattern id="released-tail" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="var(--bg)" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--faint)" stroke-width="2" />
          </pattern>
        </defs>
        {#if !phone}
          <text x="38" y="30" class="title">{t('Full attention · one K/V slot per token', '全注意力 · 每个 token 一格 K/V')}</text>
          <text x="38" y="55" class="label">{t('Ch. 8 Steps 2–3 · matching starts at token 1', 'Ch. 8 Steps 2–3 · 从第 1 个 token 开始匹配')}</text>

          <text x="40" y="96" class="small strong">{t('old request', '旧请求')}</text>
          <rect x="170" y="72" width="350" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="520" y="72" width="70" height="32" rx="5" fill="url(#released-tail)" stroke="var(--muted)" />
          <text x="345" y="93" text-anchor="middle" class="small">system · {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="555" y="93" text-anchor="middle" class="small">{t('old', '旧')} {HYBRID_USER_TOKENS}</text>
          <text x="680" y="96" text-anchor="end" class="small">{HYBRID_PROMPT_TOKENS.toLocaleString()} token</text>

          <text x="40" y="154" class="small strong">{t('new request', '新请求')}</text>
          <rect x="170" y="130" width="350" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="520" y="130" width="70" height="32" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="345" y="151" text-anchor="middle" class="small">{t('same system', '相同 system')} · {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="555" y="151" text-anchor="middle" class="small">{t('new', '新')} {HYBRID_USER_TOKENS}</text>
          <text x="680" y="154" text-anchor="end" class="small">{HYBRID_PROMPT_TOKENS.toLocaleString()} token</text>

          <text x="40" y="210" class="small strong">{t('new request’s KV slots', '新请求的 KV 槽位')}</text>
          <rect x="170" y="224" width="350" height="36" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="520" y="224" width="70" height="36" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="345" y="247" text-anchor="middle" class="small">{t('reuse', '复用')} {HYBRID_SYSTEM_TOKENS.toLocaleString()} K/V</text>
          <text x="555" y="247" text-anchor="middle" class="small">{HYBRID_USER_TOKENS} {t('new', '新增')}</text>
          <rect x="520" y="274" width="70" height="22" rx="4" fill="url(#released-tail)" stroke="var(--muted)" stroke-dasharray="4 3" />
          <text x="555" y="316" text-anchor="middle" class="small">{t('old 40 released', '旧 40 格释放')}</text>

          <text x="360" y="338" text-anchor="middle" class="result">{HYBRID_PROMPT_TOKENS.toLocaleString()} − {HYBRID_SYSTEM_TOKENS.toLocaleString()} = {HYBRID_FULL_ATTENTION_NEW_TOKENS} {t('tokens to prefill', '个 token 要 prefill')}</text>
          <text x="360" y="364" text-anchor="middle" class="small">{t('blue = reuse · orange = compute · hatch = release', '蓝 = 复用 · 橙 = 计算 · 斜线 = 释放')}</text>
        {:else}
          <text x="18" y="27" class="title">{t('Full attention', '全注意力')}</text>
          <text x="18" y="51" class="small">{t('one K/V slot per token', '每个 token 一格 K/V')}</text>

          <text x="20" y="82" class="small strong">{t('old request', '旧请求')}</text>
          <rect x="40" y="94" width="180" height="30" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="220" y="94" width="60" height="30" rx="5" fill="url(#released-tail)" stroke="var(--muted)" />
          <text x="130" y="113" text-anchor="middle" class="small">system {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="250" y="113" text-anchor="middle" class="small">{t('old', '旧')}{HYBRID_USER_TOKENS}</text>

          <text x="20" y="154" class="small strong">{t('new request', '新请求')}</text>
          <rect x="40" y="166" width="180" height="30" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="220" y="166" width="60" height="30" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="130" y="185" text-anchor="middle" class="small">{t('same', '相同')} {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="250" y="185" text-anchor="middle" class="small">{t('new', '新')}{HYBRID_USER_TOKENS}</text>

          <text x="20" y="229" class="small strong">{t('new request’s KV slots', '新请求的 KV 槽位')}</text>
          <rect x="40" y="242" width="180" height="33" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="220" y="242" width="60" height="33" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="130" y="263" text-anchor="middle" class="small">{t('reuse', '复用')} {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="250" y="263" text-anchor="middle" class="small">{HYBRID_USER_TOKENS} {t('new', '新增')}</text>
          <rect x="220" y="287" width="60" height="19" rx="4" fill="url(#released-tail)" stroke="var(--muted)" stroke-dasharray="4 3" />
          <text x="150" y="325" text-anchor="middle" class="small">{t('hatched old tail is released', '斜线旧尾部释放')}</text>

          <text x="150" y="355" text-anchor="middle" class="result">{HYBRID_PROMPT_TOKENS.toLocaleString()} − {HYBRID_SYSTEM_TOKENS.toLocaleString()} = {HYBRID_FULL_ATTENTION_NEW_TOKENS}</text>
          <text x="150" y="382" text-anchor="middle" class="small">{t('40 tokens to prefill', '40 个 token 要 prefill')}</text>
          <text x="150" y="409" text-anchor="middle" class="small">{t('blue = reuse · orange = compute', '蓝 = 复用 · 橙 = 计算')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Block widths are schematic.', '色块宽度是示意。')}</text>
      {:else if step === 2}
        {#if !phone}
          <text x="38" y="30" class="title">{t('Recurrent state · one running summary', 'recurrent state · 一份不断更新的摘要')}</text>
          <text x="38" y="55" class="label">{t('fixed-size state · every token updates the same copy', '定长 state · 每个 token 都更新同一份')}</text>

          <text x="40" y="84" class="small strong">{t('tokens already processed', '已经处理的 token')}</text>
          <rect x="40" y="95" width="330" height="35" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="370" y="95" width="90" height="35" rx="5" fill="var(--bg)" stroke="var(--muted)" stroke-dasharray="5 3" />
          <text x="205" y="117" text-anchor="middle" class="small">system · {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="415" y="117" text-anchor="middle" class="small">{t('old user', '旧 user')} · {HYBRID_USER_TOKENS}</text>
          <line x1="468" y1="112" x2="520" y2="112" stroke="var(--gen)" stroke-width="3" />
          <path d="M520,112 l-11,-7 v14 z" fill="var(--gen)" />
          <rect x="530" y="75" width="150" height="95" rx="12" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
          <text x="605" y="103" text-anchor="middle" class="small strong">{t('current state', '当前 state')}</text>
          <text x="605" y="132" text-anchor="middle" class="batch">{t('after', '处理到')} {HYBRID_PROMPT_TOKENS.toLocaleString()}</text>
          <text x="605" y="154" text-anchor="middle" class="small">system + {t('old', '旧')} {HYBRID_USER_TOKENS}</text>

          <rect x="40" y="210" width="300" height="105" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="190" y="240" text-anchor="middle" class="small strong">{t('token matching still works', 'token 匹配仍然有效')}</text>
          <text x="190" y="269" text-anchor="middle" class="small">{t('first 5,500 tokens are identical', '前 5,500 个 token 完全相同')}</text>
          <text x="190" y="296" text-anchor="middle" class="small">{t('matching content ≠ having its old state', '内容相同 ≠ 留着当时 state')}</text>

          <line x1="605" y1="171" x2="605" y2="216" stroke="var(--eos)" stroke-width="2" stroke-dasharray="5 4" />
          <path d="M596,187 l18,18 M614,187 l-18,18" stroke="var(--eos)" stroke-width="3" />
          <rect x="390" y="220" width="290" height="95" rx="12" fill="var(--eos-soft)" stroke="var(--eos)" stroke-dasharray="6 4" />
          <text x="535" y="250" text-anchor="middle" class="small strong">{t('needed for the new request', '新请求需要')}</text>
          <text x="535" y="278" text-anchor="middle" class="batch">{t('state after', '处理到')} {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="535" y="301" text-anchor="middle" class="small unavailable">{t('not saved; cannot subtract old 40', '没有另存；不能减去旧 40')}</text>

          <text x="360" y="351" text-anchor="middle" class="small">{t('The current summary includes the old tail; earlier summaries were not saved.', '当前摘要已包含旧尾部；更早的摘要没有另存。')}</text>
        {:else}
          <text x="18" y="27" class="title">{t('Recurrent state', 'recurrent state')}</text>
          <text x="18" y="51" class="small">{t('one fixed-size running summary', '一份定长、不断更新的摘要')}</text>

          <text x="20" y="80" class="small strong">{t('tokens already processed', '已经处理的 token')}</text>
          <rect x="20" y="91" width="190" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="210" y="91" width="70" height="32" rx="5" fill="var(--bg)" stroke="var(--muted)" stroke-dasharray="5 3" />
          <text x="115" y="111" text-anchor="middle" class="small">system {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="245" y="111" text-anchor="middle" class="small">{t('old', '旧')} {HYBRID_USER_TOKENS}</text>
          <line x1="150" y1="124" x2="150" y2="143" stroke="var(--gen)" stroke-width="3" />
          <path d="M150,145 l-7,-11 h14 z" fill="var(--gen)" />

          <rect x="45" y="148" width="210" height="72" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
          <text x="150" y="171" text-anchor="middle" class="small strong">{t('current state', '当前 state')}</text>
          <text x="150" y="194" text-anchor="middle" class="batch">{t('after', '处理到')} {HYBRID_PROMPT_TOKENS.toLocaleString()}</text>
          <text x="150" y="212" text-anchor="middle" class="small">system + {t('old', '旧')} {HYBRID_USER_TOKENS}</text>

          <path d="M140,225 l20,20 M160,225 l-20,20" stroke="var(--eos)" stroke-width="3" />
          <rect x="45" y="249" width="210" height="68" rx="11" fill="var(--eos-soft)" stroke="var(--eos)" stroke-dasharray="6 4" />
          <text x="150" y="273" text-anchor="middle" class="small strong">{t('new request needs', '新请求需要')}</text>
          <text x="150" y="296" text-anchor="middle" class="batch">{t('state after', '处理到')} {HYBRID_SYSTEM_TOKENS.toLocaleString()}</text>
          <text x="150" y="312" text-anchor="middle" class="small unavailable">{t('not saved', '没有另存')}</text>

          <text x="150" y="347" text-anchor="middle" class="small">{t('token match: first 5,500 still same', 'token 匹配：前 5,500 仍相同')}</text>
          <text x="150" y="374" text-anchor="middle" class="small">{t('current state already includes old 40', '当前 state 已包含旧 40')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Earlier states require separately saved copies.', '更早的 state 需要另外保存副本。')}</text>
      {:else if step === 3}
        {#if !phone}
          <text x="38" y="30" class="title">{t('Checkpoint · copy the whole state at one position', 'checkpoint · 抄下某个位置的整份 state')}</text>
          <text x="38" y="55" class="label">{t('restore the newest copy that does not pass the token match', '恢复不越过 token 匹配位置的最新副本')}</text>
          <line x1="50" y1="140" x2="430" y2="140" stroke="var(--accent)" stroke-width="7" />
          <line x1="430" y1="140" x2="670" y2="140" stroke="var(--gen)" stroke-width="7" />
          <text x="50" y="169" text-anchor="middle" class="small">0</text>

          <path d="M192 103 h16 v25 l-8 -5 -8 5 z" fill="var(--fg)" />
          <text x="200" y="89" text-anchor="middle" class="small strong">{t('saved state', '已存 state')}</text>
          <line x1="200" y1="129" x2="200" y2="151" stroke="var(--fg)" stroke-width="2" />
          <text x="200" y="169" text-anchor="middle" class="batch">{HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()}</text>

          <line x1="430" y1="104" x2="430" y2="153" stroke="var(--accent)" stroke-width="3" />
          <text x="430" y="89" text-anchor="middle" class="small strong">{t('match ends · no copy', '匹配结束 · 没有副本')}</text>
          <text x="430" y="169" text-anchor="middle" class="batch">{HYBRID_LOG_MATCH_TOKENS.toLocaleString()}</text>

          <text x="490" y="124" text-anchor="middle" class="small">{HYBRID_LOG_NEW_TOKENS} {t('new', '新增')}</text>
          <path d="M563 122 l14 14 M577 122 l-14 14" stroke="var(--eos)" stroke-width="3" />
          <text x="570" y="99" text-anchor="middle" class="small unavailable">{t('old-tail copy', '旧尾部副本')}</text>
          <text x="570" y="169" text-anchor="middle" class="small unavailable">{t('rejected', '不可用')}</text>
          <text x="570" y="190" text-anchor="middle" class="small">{t('after match', '越过匹配')}</text>

          <line x1="660" y1="119" x2="660" y2="153" stroke="var(--fg)" stroke-width="2" />
          <text x="660" y="99" text-anchor="middle" class="small strong">{t('new end', '新末尾')}</text>
          <text x="660" y="169" text-anchor="middle" class="batch">{HYBRID_LOG_END_TOKENS.toLocaleString()}</text>

          <line x1="200" y1="215" x2="660" y2="215" stroke="var(--gen)" stroke-width="4" />
          <path d="M660,215 l-13,-8 v16 z" fill="var(--gen)" />
          <text x="430" y="246" text-anchor="middle" class="result">{HYBRID_LOG_END_TOKENS.toLocaleString()} − {HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()} = {HYBRID_LOG_REPLAY_POSITIONS.toLocaleString()} {t('positions', '个位置')}</text>
          <text x="430" y="274" text-anchor="middle" class="small">{t('log: about', '日志：约')} {HYBRID_LOG_RECOMPUTE_APPROX.toLocaleString()} {t('recomputed tokens', '个重算 token')}</text>
          <text x="430" y="299" text-anchor="middle" class="small">{HYBRID_LOG_NEW_TOKENS} {t('new', '新增')} + ≈{HYBRID_LOG_EXTRA_APPROX} {t('revisited', '个重走')}</text>
          <rect x="90" y="316" width="540" height="43" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="343" text-anchor="middle" class="small strong">{t('restore at 4,536 · replay through 5,558', '从 4,536 恢复 · 重放到 5,558')}</text>
        {:else}
          <text x="18" y="27" class="title">{t('Checkpoint', 'checkpoint')}</text>
          <text x="18" y="51" class="small">{t('a copy of the whole state at one position', '某个位置的整份 state 副本')}</text>
          <text x="18" y="76" class="small strong">{t('match: first 5,514 tokens same', '匹配：前 5,514 个 token 相同')}</text>

          <line x1="25" y1="136" x2="175" y2="136" stroke="var(--accent)" stroke-width="6" />
          <line x1="175" y1="136" x2="275" y2="136" stroke="var(--gen)" stroke-width="6" />
          <text x="25" y="160" text-anchor="middle" class="small">0</text>
          <path d="M63 104 h14 v22 l-7 -5 -7 5 z" fill="var(--fg)" />
          <text x="70" y="94" text-anchor="middle" class="small">{t('saved', '已存')}</text>
          <text x="70" y="181" text-anchor="middle" class="batch">{HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()}</text>
          <line x1="175" y1="107" x2="175" y2="148" stroke="var(--accent)" stroke-width="3" />
          <text x="165" y="98" text-anchor="middle" class="small">{t('no copy', '无副本')}</text>
          <text x="175" y="160" text-anchor="middle" class="batch">{HYBRID_LOG_MATCH_TOKENS.toLocaleString()}</text>
          <text x="230" y="105" text-anchor="middle" class="small">{HYBRID_LOG_NEW_TOKENS} {t('new', '新增')}</text>
          <path d="M218 127 l14 14 M232 127 l-14 14" stroke="var(--eos)" stroke-width="3" />
          <text x="225" y="181" text-anchor="middle" class="small unavailable">{t('old copy ×', '旧副本 ×')}</text>
          <text x="225" y="202" text-anchor="middle" class="small">{t('after match', '越过匹配')}</text>
          <text x="275" y="160" text-anchor="middle" class="batch">{HYBRID_LOG_END_TOKENS.toLocaleString()}</text>

          <line x1="70" y1="224" x2="270" y2="224" stroke="var(--gen)" stroke-width="4" />
          <path d="M270,224 l-12,-7 v14 z" fill="var(--gen)" />
          <text x="150" y="253" text-anchor="middle" class="result">{HYBRID_LOG_END_TOKENS.toLocaleString()} − {HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()} = {HYBRID_LOG_REPLAY_POSITIONS.toLocaleString()}</text>
          <text x="150" y="280" text-anchor="middle" class="small">≈{HYBRID_LOG_RECOMPUTE_APPROX.toLocaleString()} {t('recomputed tokens in log', '个重算 token（日志）')}</text>
          <text x="150" y="304" text-anchor="middle" class="small">{HYBRID_LOG_NEW_TOKENS} {t('new', '新增')} + ≈{HYBRID_LOG_EXTRA_APPROX} {t('revisited', '个重走')}</text>
          <text x="150" y="341" text-anchor="middle" class="small strong">{t('restore newest usable copy', '恢复最新可用副本')}</text>
          <text x="150" y="366" text-anchor="middle" class="small">{t('then replay to the new prompt end', '再重放到新 prompt 末尾')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Positions are schematic; 1,022 is position arithmetic.', '位置间距是示意；1,022 是位置算式。')}</text>
      {:else if step === 4}
        {#if !phone}
          <text x="38" y="30" class="title">{t('Hybrid · choose one common resume point', 'hybrid · 选一个共同恢复点')}</text>
          <text x="38" y="55" class="label">{t('full-attention layers + recurrent layers · one request', '全注意力 layer + recurrent layer · 同一个请求')}</text>
          <text x="230" y="86" text-anchor="middle" class="batch">P · {HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()}</text>
          <text x="480" y="86" text-anchor="middle" class="batch">M · {HYBRID_LOG_MATCH_TOKENS.toLocaleString()}</text>
          <text x="640" y="86" text-anchor="middle" class="batch">E · {HYBRID_LOG_END_TOKENS.toLocaleString()}</text>

          <text x="40" y="126" class="small strong">{t('full-attention layers', '全注意力 layer')}</text>
          <rect x="170" y="103" width="310" height="30" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="480" y="103" width="160" height="30" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="325" y="123" text-anchor="middle" class="small">{t('KV can reuse through M', 'KV 可复用到 M')}</text>
          <text x="560" y="123" text-anchor="middle" class="small">{HYBRID_LOG_NEW_TOKENS} {t('new', '新增')}</text>
          <text x="360" y="157" text-anchor="middle" class="small">{t('token matching reaches 5,514', 'token 匹配走到 5,514')}</text>

          <text x="40" y="204" class="small strong">{t('recurrent layers', 'recurrent layer')}</text>
          <line x1="230" y1="190" x2="640" y2="190" stroke="var(--gen)" stroke-width="4" />
          <path d="M640,190 l-12,-7 v14 z" fill="var(--gen)" />
          <rect x="194" y="169" width="72" height="42" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
          <text x="230" y="195" text-anchor="middle" class="small strong">{t('state P', 'state P')}</text>
          <rect x="455" y="174" width="50" height="32" rx="6" fill="var(--bg)" stroke="var(--eos)" stroke-dasharray="5 3" />
          <path d="M466 181 l16 16 M482 181 l-16 16" stroke="var(--eos)" stroke-width="2" />
          <text x="435" y="234" text-anchor="middle" class="small">{t('newest surviving state at P · none at M', '最新存留 state 在 P · M 没有')}</text>

          <text x="40" y="287" class="small strong">{t('hybrid match result', 'hybrid 匹配结果')}</text>
          <rect x="170" y="260" width="60" height="34" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="230" y="260" width="410" height="34" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="435" y="282" text-anchor="middle" class="small strong">{t('resume at P · compute through E', '从 P 恢复 · 计算到 E')}</text>
          <text x="360" y="328" text-anchor="middle" class="result">value[:best_value_len] → P = {HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()}</text>
          <text x="360" y="355" text-anchor="middle" class="small">E − P = {HYBRID_LOG_REPLAY_POSITIONS.toLocaleString()} {t('positions to prefill', '个位置要 prefill')}</text>
        {:else}
          <text x="18" y="27" class="title">{t('Hybrid', 'hybrid')}</text>
          <text x="18" y="51" class="small">{t('one resume point for both layer kinds', '两类 layer 共用一个恢复点')}</text>
          <text x="70" y="82" text-anchor="middle" class="batch">P · {HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()}</text>
          <text x="180" y="82" text-anchor="middle" class="batch">M · {HYBRID_LOG_MATCH_TOKENS.toLocaleString()}</text>
          <text x="260" y="82" text-anchor="middle" class="batch">E · {HYBRID_LOG_END_TOKENS.toLocaleString()}</text>

          <text x="20" y="112" class="small strong">{t('full attention', '全注意力')}</text>
          <rect x="30" y="124" width="150" height="26" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="180" y="124" width="90" height="26" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="172" text-anchor="middle" class="small">{t('KV can reuse through M', 'KV 可复用到 M')}</text>

          <text x="20" y="207" class="small strong">{t('recurrent state', 'recurrent state')}</text>
          <line x1="70" y1="226" x2="265" y2="226" stroke="var(--gen)" stroke-width="4" />
          <path d="M265,226 l-11,-7 v14 z" fill="var(--gen)" />
          <rect x="40" y="207" width="60" height="38" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
          <text x="70" y="231" text-anchor="middle" class="small">{t('state P', 'state P')}</text>
          <text x="150" y="267" text-anchor="middle" class="small">{t('newest state at P · none at M', '最新 state 在 P · M 没有')}</text>

          <text x="20" y="301" class="small strong">{t('hybrid result', 'hybrid 结果')}</text>
          <rect x="30" y="312" width="40" height="29" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="70" y="312" width="200" height="29" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="170" y="332" text-anchor="middle" class="small">{t('resume P → compute E', '恢复 P → 算到 E')}</text>
          <text x="150" y="374" text-anchor="middle" class="result">prefix ends at P</text>
          <text x="150" y="401" text-anchor="middle" class="small">E − P = {HYBRID_LOG_REPLAY_POSITIONS.toLocaleString()} {t('positions', '个位置')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">value = value[:best_value_len]</text>
      {:else}
        {#if !phone}
          <text x="38" y="30" class="title">{t('MambaRadixCache · a token path can outlive its state', 'MambaRadixCache · token 路径可以比 state 活得久')}</text>
          <text x="38" y="55" class="label">{t('evict one internal mamba_value · keep its KV and children', '淘汰内部节点的 mamba_value · 保留 KV 和子节点')}</text>

          <rect x="35" y="116" width="70" height="50" rx="9" fill="var(--bg)" stroke="var(--line)" />
          <text x="70" y="146" text-anchor="middle" class="small strong">root</text>
          <line x1="105" y1="141" x2="160" y2="141" stroke="var(--muted)" stroke-width="2" />
          <path d="M160,141 l-10,-6 v12 z" fill="var(--muted)" />

          <rect x="165" y="101" width="140" height="80" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
          <text x="235" y="127" text-anchor="middle" class="small strong">{t('earlier prefix P', '更早前缀 P')}</text>
          <text x="235" y="151" text-anchor="middle" class="batch">{HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()}</text>
          <text x="235" y="172" text-anchor="middle" class="small">{t('state kept ✓', 'state 保留 ✓')}</text>
          <line x1="305" y1="141" x2="370" y2="141" stroke="var(--accent)" stroke-width="3" />
          <path d="M370,141 l-11,-7 v14 z" fill="var(--accent)" />

          <rect x="375" y="96" width="170" height="90" rx="11" fill="var(--eos-soft)" stroke="var(--eos)" stroke-width="2" stroke-dasharray="6 4" />
          <text x="460" y="121" text-anchor="middle" class="small strong">{t('shared prefix M', '共同前缀 M')}</text>
          <text x="460" y="145" text-anchor="middle" class="batch">{HYBRID_LOG_MATCH_TOKENS.toLocaleString()}</text>
          <text x="460" y="166" text-anchor="middle" class="small unavailable">mamba_value = None</text>
          <text x="460" y="204" text-anchor="middle" class="small unavailable">{t('tombstone · state evicted', '墓碑 · state 已淘汰')}</text>

          <line x1="545" y1="126" x2="600" y2="88" stroke="var(--muted)" stroke-width="2" />
          <path d="M600,88 l-11,1 6,9 z" fill="var(--muted)" />
          <rect x="605" y="55" width="90" height="66" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="650" y="81" text-anchor="middle" class="small strong">{t('old user', '旧 user')}</text>
          <text x="650" y="105" text-anchor="middle" class="small">{t('state kept ✓', 'state 保留 ✓')}</text>

          <line x1="545" y1="159" x2="600" y2="194" stroke="var(--gen)" stroke-width="2" stroke-dasharray="5 3" />
          <path d="M600,194 l-6,-10 11,1 z" fill="var(--gen)" />
          <rect x="605" y="170" width="90" height="66" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" stroke-dasharray="5 3" />
          <text x="650" y="195" text-anchor="middle" class="small strong">{t('new tail E', '新尾部 E')}</text>
          <text x="650" y="219" text-anchor="middle" class="small">{t('compute', '待计算')}</text>

          <rect x="40" y="254" width="640" height="100" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="281" text-anchor="middle" class="small strong">{t('token match still reaches M · state restore stops at P', 'token 匹配仍到 M · state 恢复停在 P')}</text>
          <text x="360" y="309" text-anchor="middle" class="result">P → M → E · {HYBRID_LOG_REPLAY_POSITIONS.toLocaleString()} {t('positions to replay', '个位置要重放')}</text>
          <text x="360" y="336" text-anchor="middle" class="small">{t('old-user state cannot serve a different tail', '旧 user 的 state 不能用于不同尾部')}</text>
        {:else}
          <text x="18" y="27" class="title">{t('MambaRadixCache', 'MambaRadixCache')}</text>
          <text x="18" y="51" class="small">{t('token paths and states have separate lifetimes', 'token 路径和 state 分开淘汰')}</text>

          <rect x="15" y="79" width="125" height="78" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
          <text x="78" y="104" text-anchor="middle" class="small strong">{t('earlier prefix P', '更早前缀 P')}</text>
          <text x="78" y="128" text-anchor="middle" class="batch">{HYBRID_LOG_CHECKPOINT_TOKENS.toLocaleString()}</text>
          <text x="78" y="149" text-anchor="middle" class="small">{t('state kept ✓', 'state 保留 ✓')}</text>
          <line x1="140" y1="118" x2="158" y2="118" stroke="var(--accent)" stroke-width="3" />
          <path d="M158,118 l-9,-6 v12 z" fill="var(--accent)" />

          <rect x="163" y="74" width="122" height="88" rx="10" fill="var(--eos-soft)" stroke="var(--eos)" stroke-width="2" stroke-dasharray="6 4" />
          <text x="224" y="98" text-anchor="middle" class="small strong">{t('shared prefix M', '共同前缀 M')}</text>
          <text x="224" y="121" text-anchor="middle" class="batch">{HYBRID_LOG_MATCH_TOKENS.toLocaleString()}</text>
          <text x="224" y="141" text-anchor="middle" class="small unavailable">state = None</text>
          <text x="224" y="157" text-anchor="middle" class="small unavailable">{t('tombstone', '墓碑')}</text>

          <line x1="210" y1="162" x2="90" y2="190" stroke="var(--muted)" stroke-width="2" />
          <rect x="30" y="190" width="105" height="57" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="83" y="214" text-anchor="middle" class="small strong">{t('old user', '旧 user')}</text>
          <text x="83" y="236" text-anchor="middle" class="small">{t('state kept ✓', 'state 保留 ✓')}</text>
          <line x1="238" y1="162" x2="220" y2="190" stroke="var(--gen)" stroke-width="2" stroke-dasharray="5 3" />
          <rect x="170" y="190" width="105" height="57" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" stroke-dasharray="5 3" />
          <text x="223" y="214" text-anchor="middle" class="small strong">{t('new tail E', '新尾部 E')}</text>
          <text x="223" y="236" text-anchor="middle" class="small">{t('compute', '待计算')}</text>

          <text x="150" y="281" text-anchor="middle" class="small strong">{t('match reaches M · restore stops at P', '匹配到 M · 恢复停在 P')}</text>
          <text x="150" y="309" text-anchor="middle" class="result">P → M → E</text>
          <text x="150" y="337" text-anchor="middle" class="small">{HYBRID_LOG_REPLAY_POSITIONS.toLocaleString()} {t('positions to replay', '个位置要重放')}</text>
          <text x="150" y="365" text-anchor="middle" class="small">{t('KV and children stay', 'KV 和子节点保留')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('A branch boundary does not guarantee a saved state.', '分叉边界不保证已经保存 state。')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{step === 0 ? t('Selected article measurements; not this computer.', '选自原文实测，不是本机实测。') : step === 1 ? t('Simplified article example; Ch. 8 Steps 2–3 covers matching.', '原文简化例；匹配见 Ch. 8 Steps 2–3。') : step === 2 ? t('llama.cpp: previous per-token states are not preserved here.', 'llama.cpp：这里没有保存此前的逐 token state。') : step === 3 ? t('Logged article example; recomputation stays approximate.', '原文日志例；重算 token 保留约数。') : step === 4 ? t('Pinned SGLang match; earlier positions reused as a schematic.', '固定版 SGLang 匹配逻辑；沿用前面位置作示意。') : t('Pinned SGLang eviction; positions are schematic.', '固定版 SGLang 淘汰逻辑；位置是示意。')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 14px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  .batch { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .time { font-family: var(--mono); font-size: 17px; font-weight: 700; fill: var(--fg); }
  .tokens { font-family: var(--mono); font-size: 16px; font-weight: 650; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 16px; font-weight: 650; fill: var(--accent); }
  .cold { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--gen); }
  .unavailable { fill: var(--eos); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .small { font-size: 12px; }
    .batch, .time { font-size: 14px; }
    .result, .cold { font-size: 14px; }
  }
</style>
