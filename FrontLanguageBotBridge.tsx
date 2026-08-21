import React, { useEffect, useMemo, useState } from 'react';

type PackStrings = {
  title: string;
  ready: string;
  loading: string;
  bot: string;
  error: string;
};

type FrontLanguagePack = {
  ok: boolean;
  schema: string;
  version: string;
  locale: string;
  direction: 'ltr' | 'rtl';
  strings: PackStrings;
  supportedLocales: string[];
};

const BOT_BASE = 'https://bots-git-feat-persona-language-6f0ba9-taedis-projects-5d092fa4.vercel.app';
const SUPPORTED = ['ko-KR','en-US','ja-JP','zh-CN','es-ES','de-DE','hi-IN','fr-FR','vi-VN','th-TH','id-ID','pt-BR','ru-RU','ar-SA'];
const PREF_KEY = 'homedesign.preferred-language';

const normalizeLocale = (input?: string | null) => {
  const raw = String(input || '').trim().replace('_', '-');
  const exact = SUPPORTED.find(locale => locale.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const base = raw.split('-')[0].toLowerCase();
  return SUPPORTED.find(locale => locale.toLowerCase().startsWith(`${base}-`)) || 'ko-KR';
};

const cacheKey = (locale: string) => `homedesign.front-language-pack.${locale}`;

export default function FrontLanguageBotBridge({ appId }: { appId: string }) {
  const initialLocale = useMemo(() => normalizeLocale(
    typeof window === 'undefined' ? 'ko-KR' : window.localStorage.getItem(PREF_KEY) || navigator.language
  ), []);
  const [locale, setLocale] = useState(initialLocale);
  const [pack, setPack] = useState<FrontLanguagePack | null>(null);
  const [source, setSource] = useState<'REMOTE' | 'CACHE' | 'NONE'>('NONE');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const apply = (next: FrontLanguagePack, nextSource: 'REMOTE' | 'CACHE') => {
      if (!active) return;
      setPack(next);
      setSource(nextSource);
      setError('');
      window.localStorage.setItem(PREF_KEY, next.locale);
      document.documentElement.lang = next.locale;
      document.documentElement.dir = next.direction || (next.locale.startsWith('ar') ? 'rtl' : 'ltr');
      window.dispatchEvent(new CustomEvent('homedesign:language-pack-active', {
        detail: { appId, locale: next.locale, version: next.version, source: nextSource }
      }));
    };

    const load = async () => {
      const normalized = normalizeLocale(locale);
      const cachedRaw = window.localStorage.getItem(cacheKey(normalized));
      try {
        const response = await fetch(`${BOT_BASE}/api/front-language-pack?locale=${encodeURIComponent(normalized)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = await response.json() as FrontLanguagePack;
        if (!next.ok || !next.locale || !next.strings) throw new Error('INVALID_LANGUAGE_PACK');
        window.localStorage.setItem(cacheKey(next.locale), JSON.stringify(next));
        apply(next, 'REMOTE');
      } catch (remoteError) {
        if (cachedRaw) {
          try {
            apply(JSON.parse(cachedRaw) as FrontLanguagePack, 'CACHE');
            return;
          } catch {
            // Ignore invalid cache and show connection state below.
          }
        }
        if (active) {
          setPack(null);
          setSource('NONE');
          setError(remoteError instanceof Error ? remoteError.message : 'LANGUAGE_PACK_UNAVAILABLE');
        }
      }
    };

    load();
    return () => { active = false; };
  }, [appId, locale]);

  const strings = pack?.strings || { title: 'Language pack', ready: 'Applied', loading: 'Loading', bot: 'Open bot', error: 'Language pack unavailable' };
  const botUrl = `${BOT_BASE}/?appId=${encodeURIComponent(appId)}&locale=${encodeURIComponent(pack?.locale || locale)}&packVersion=${encodeURIComponent(pack?.version || 'unknown')}`;

  return (
    <aside style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 2147483000, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: 'rgba(17,24,39,.92)', color: '#fff', font: '12px/1.2 system-ui,sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,.22)' }} aria-label="Local language pack bot bridge">
      <strong>{strings.title}</strong>
      <select aria-label="Language" value={locale} onChange={event => setLocale(event.target.value)} style={{ maxWidth: 104 }}>
        {SUPPORTED.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
      <span title={error || source}>{error ? strings.error : pack ? `${strings.ready} · ${source}` : strings.loading}</span>
      <a href={botUrl} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline', whiteSpace: 'nowrap' }}>{strings.bot}</a>
    </aside>
  );
}
