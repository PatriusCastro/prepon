// Kept out of Permit.tsx so the site shell can title permit pages without loading the whole demo.
import { STEPS, type StepSlug } from './data';
import { STRINGS, type Lang } from './i18n';

export const BASE = '/demo/permit';
export const LANG_KEY = 'marilag-permit-lang';

export const loadLang = (): Lang => (localStorage.getItem(LANG_KEY) === 'fil' ? 'fil' : 'en');

export function permitTitle(path: string) {
  const t = STRINGS[loadLang()];
  const slug = path.slice(BASE.length + 1) as StepSlug;
  const i = STEPS.indexOf(slug);
  const title = i >= 0 ? `${t.steps[slug]} (${t.stepOf(i + 1, STEPS.length)})` : (slug as string) === 'done' ? t.pageTitle.done : t.pageTitle.start;
  return `${title} · ${t.pageTitle.suffix}`;
}
