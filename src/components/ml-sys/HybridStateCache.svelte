<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { HYBRID_SYSTEM_TOKENS, HYBRID_NUM_BATCH_DEFAULT, HYBRID_NUM_BATCH_TUNED, HYBRID_SHORT_WAIT_DEFAULT_S, HYBRID_SHORT_WAIT_TUNED_S, HYBRID_WAIT_SAVED_S, HYBRID_WAIT_RATIO, HYBRID_RECOMPUTE_DEFAULT_MIN, HYBRID_RECOMPUTE_DEFAULT_MAX, HYBRID_RECOMPUTE_TUNED_MIN, HYBRID_RECOMPUTE_TUNED_MAX, HYBRID_COLD_DEFAULT_S, HYBRID_COLD_TUNED_S, HYBRID_COLD_EXTRA_S } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `At num_batch ${HYBRID_NUM_BATCH_DEFAULT}, the short request takes ${HYBRID_SHORT_WAIT_DEFAULT_S} s. At ${HYBRID_NUM_BATCH_TUNED}, it takes ${HYBRID_SHORT_WAIT_TUNED_S} s and recomputes ${HYBRID_RECOMPUTE_TUNED_MIN}–${HYBRID_RECOMPUTE_TUNED_MAX} tokens.`,
    captionZh: `同样的短请求，num_batch ${HYBRID_NUM_BATCH_DEFAULT} 用 ${HYBRID_SHORT_WAIT_DEFAULT_S} 秒，${HYBRID_NUM_BATCH_TUNED} 只用 ${HYBRID_SHORT_WAIT_TUNED_S} 秒。重算从 ${HYBRID_RECOMPUTE_DEFAULT_MIN}–${HYBRID_RECOMPUTE_DEFAULT_MAX} 个 token 降到 ${HYBRID_RECOMPUTE_TUNED_MIN}–${HYBRID_RECOMPUTE_TUNED_MAX} 个。`,
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
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(`At num_batch ${HYBRID_NUM_BATCH_DEFAULT}, a short request takes ${HYBRID_SHORT_WAIT_DEFAULT_S} seconds and recomputes ${HYBRID_RECOMPUTE_DEFAULT_MIN} to ${HYBRID_RECOMPUTE_DEFAULT_MAX} tokens. At ${HYBRID_NUM_BATCH_TUNED}, it takes ${HYBRID_SHORT_WAIT_TUNED_S} seconds and recomputes ${HYBRID_RECOMPUTE_TUNED_MIN} to ${HYBRID_RECOMPUTE_TUNED_MAX} tokens. Cold startup takes longer with the second setting.`, `num_batch 为 ${HYBRID_NUM_BATCH_DEFAULT} 时，短请求用 ${HYBRID_SHORT_WAIT_DEFAULT_S} 秒并重算 ${HYBRID_RECOMPUTE_DEFAULT_MIN} 到 ${HYBRID_RECOMPUTE_DEFAULT_MAX} 个 token。调到 ${HYBRID_NUM_BATCH_TUNED} 后用 ${HYBRID_SHORT_WAIT_TUNED_S} 秒，重算 ${HYBRID_RECOMPUTE_TUNED_MIN} 到 ${HYBRID_RECOMPUTE_TUNED_MAX} 个 token，但冷启动更慢。`)}>
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
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Selected article measurements; not this computer.', '选自原文实测，不是本机实测。')}</text>
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
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .small { font-size: 12px; }
    .batch, .time { font-size: 14px; }
    .result, .cold { font-size: 14px; }
  }
</style>
