type Lang = 'bn' | 'en';
const dict = {
  home: ['হোম', 'Home'] as const,
  stepAddTitle: ['সদস্য যোগ করুন', 'Add your people'] as const,
} as const;
type TKey = keyof typeof dict;
function useStore(){ return { settings: { language: 'bn' as Lang } } as any; }
function useStore2(){}
import { useStore } from './store';
function useT() {
  const lang = useStore((s) => s.settings.language);
  return (k: TKey) => dict[k][lang === 'bn' ? 0 : 1];
}
const t = useT();
const steps = [
  { title: t('stepAddTitle'), desc: t('stepAddDesc'), icon: 'Plus' },
];
console.log(steps.map(s => s.title));
