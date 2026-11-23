// Site language. English is the original; Chinese is an added layer, toggled in the sidebar.
// The inline script in Chapter.astro sets html[data-lang] before first paint for the static text;
// this store carries the same choice into the Svelte components after hydration.
import { writable } from 'svelte/store';

export type Lang = 'en' | 'zh';
export const lang = writable<Lang>('en');

// Called once after hydration (same pattern as ?step=), so server HTML still matches.
export function syncLang() {
  lang.set(document.documentElement.dataset.lang === 'zh' ? 'zh' : 'en');
}

if (typeof window !== 'undefined') {
  window.addEventListener('langchange', (e) => lang.set((e as CustomEvent<Lang>).detail));
}
