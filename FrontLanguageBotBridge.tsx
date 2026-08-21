import React, { useEffect, useMemo, useState } from 'react';

type PackStrings = { title:string; ready:string; loading:string; bot:string; error:string };
type FrontLanguagePack = {
  ok:boolean;
  schema:string;
  version:string;
  locale:string;
  direction:'ltr'|'rtl';
  strings:PackStrings;
  ui?:Record<string,string>;
  aliases?:Record<string,string>;
  supportedLocales:string[];
};
type TextBinding = { key:string; last:string };
type AttrBinding = { key:string; last:string };

const BOT_BASE='https://bots-git-feat-persona-language-6f0ba9-taedis-projects-5d092fa4.vercel.app';
const SUPPORTED=['ko-KR','en-US','ja-JP','zh-CN','es-ES','de-DE','hi-IN','fr-FR','vi-VN','th-TH','id-ID','pt-BR','ru-RU','ar-SA'];
const PREF_KEY='homedesign.preferred-language';
const TEXT_BINDINGS=new WeakMap<Text,TextBinding>();
const ATTR_BINDINGS=new WeakMap<Element,Map<string,AttrBinding>>();
const ATTRS=['placeholder','title','aria-label'] as const;
const BLOCKED_TAGS=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','OPTION']);

const normalizeLocale=(input?:string|null)=>{
  const raw=String(input||'').trim().replace('_','-');
  const exact=SUPPORTED.find(locale=>locale.toLowerCase()===raw.toLowerCase());
  if(exact)return exact;
  const base=raw.split('-')[0].toLowerCase();
  return SUPPORTED.find(locale=>locale.toLowerCase().startsWith(`${base}-`))||'ko-KR';
};
const cacheKey=(locale:string)=>`homedesign.front-language-pack.${locale}`;
const insideBridge=(element:Element|null)=>!!element?.closest('[data-hd-language-bridge="true"]');

function applyTextNode(node:Text,pack:FrontLanguagePack){
  if(insideBridge(node.parentElement)||!pack.ui||!pack.aliases)return;
  const raw=node.nodeValue||'';
  const core=raw.trim();
  if(!core)return;
  let binding=TEXT_BINDINGS.get(node);
  if(binding&&core!==binding.last){TEXT_BINDINGS.delete(node);binding=undefined;}
  const semanticKey=binding?.key||pack.aliases[core];
  const translated=semanticKey?pack.ui[semanticKey]:undefined;
  if(!semanticKey||!translated)return;
  const leading=raw.match(/^\s*/)?.[0]||'';
  const trailing=raw.match(/\s*$/)?.[0]||'';
  TEXT_BINDINGS.set(node,{key:semanticKey,last:translated});
  const next=`${leading}${translated}${trailing}`;
  if(raw!==next)node.nodeValue=next;
}

function applyElementAttrs(element:Element,pack:FrontLanguagePack){
  if(insideBridge(element)||BLOCKED_TAGS.has(element.tagName)||!pack.ui||!pack.aliases)return;
  let bindings=ATTR_BINDINGS.get(element);
  if(!bindings){bindings=new Map();ATTR_BINDINGS.set(element,bindings);}
  for(const attr of ATTRS){
    const raw=element.getAttribute(attr);
    if(!raw)continue;
    let binding=bindings.get(attr);
    if(binding&&raw.trim()!==binding.last){bindings.delete(attr);binding=undefined;}
    const semanticKey=binding?.key||pack.aliases[raw.trim()];
    const translated=semanticKey?pack.ui[semanticKey]:undefined;
    if(!semanticKey||!translated)continue;
    bindings.set(attr,{key:semanticKey,last:translated});
    if(raw!==translated)element.setAttribute(attr,translated);
  }
}

function applyTree(root:Node,pack:FrontLanguagePack){
  if(root.nodeType===Node.TEXT_NODE){applyTextNode(root as Text,pack);return;}
  if(root instanceof Element)applyElementAttrs(root,pack);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  let current=walker.nextNode();
  while(current){
    if(current.nodeType===Node.TEXT_NODE)applyTextNode(current as Text,pack);
    else if(current instanceof Element)applyElementAttrs(current,pack);
    current=walker.nextNode();
  }
}

function installAutoReflect(pack:FrontLanguagePack,appId:string){
  document.documentElement.lang=pack.locale;
  document.documentElement.dir=pack.direction||(pack.locale.startsWith('ar')?'rtl':'ltr');
  (window as any).homedesignI18n={
    appId,locale:pack.locale,version:pack.version,
    t:(key:string,fallback='')=>pack.ui?.[key]||fallback||key
  };
  if(document.body)applyTree(document.body,pack);
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='characterData')applyTextNode(record.target as Text,pack);
      for(const node of Array.from(record.addedNodes))applyTree(node,pack);
      if(record.type==='attributes'&&record.target instanceof Element)applyElementAttrs(record.target,pack);
    }
  });
  if(document.body)observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...ATTRS]});
  window.dispatchEvent(new CustomEvent('homedesign:language-pack-active',{detail:{appId,locale:pack.locale,version:pack.version,autoReflect:Boolean(pack.ui&&pack.aliases)}}));
  return()=>observer.disconnect();
}

export default function FrontLanguageBotBridge({appId}:{appId:string}){
  const initialLocale=useMemo(()=>normalizeLocale(typeof window==='undefined'?'ko-KR':window.localStorage.getItem(PREF_KEY)||navigator.language),[]);
  const [locale,setLocale]=useState(initialLocale);
  const [pack,setPack]=useState<FrontLanguagePack|null>(null);
  const [source,setSource]=useState<'REMOTE'|'CACHE'|'NONE'>('NONE');
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    const apply=(next:FrontLanguagePack,nextSource:'REMOTE'|'CACHE')=>{
      if(!active)return;
      setPack(next);setSource(nextSource);setError('');
      window.localStorage.setItem(PREF_KEY,next.locale);
    };
    (async()=>{
      const normalized=normalizeLocale(locale);
      const cachedRaw=window.localStorage.getItem(cacheKey(normalized));
      try{
        const response=await fetch(`${BOT_BASE}/api/front-language-pack?locale=${encodeURIComponent(normalized)}`,{cache:'no-store'});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const next=await response.json() as FrontLanguagePack;
        if(!next.ok||!next.locale||!next.strings)throw new Error('INVALID_LANGUAGE_PACK');
        window.localStorage.setItem(cacheKey(next.locale),JSON.stringify(next));
        apply(next,'REMOTE');
      }catch(remoteError){
        if(cachedRaw){try{apply(JSON.parse(cachedRaw) as FrontLanguagePack,'CACHE');return;}catch{}}
        if(active){setPack(null);setSource('NONE');setError(remoteError instanceof Error?remoteError.message:'LANGUAGE_PACK_UNAVAILABLE');}
      }
    })();
    return()=>{active=false;};
  },[locale]);

  useEffect(()=>pack?installAutoReflect(pack,appId):undefined,[appId,pack]);

  const strings=pack?.strings||{title:'Language pack',ready:'Applied',loading:'Loading',bot:'Open bot',error:'Language pack unavailable'};
  const botUrl=`${BOT_BASE}/?appId=${encodeURIComponent(appId)}&locale=${encodeURIComponent(pack?.locale||locale)}&packVersion=${encodeURIComponent(pack?.version||'unknown')}`;
  return <aside data-hd-language-bridge="true" style={{position:'fixed',right:12,bottom:12,zIndex:2147483000,display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:12,background:'rgba(17,24,39,.92)',color:'#fff',font:'12px/1.2 system-ui,sans-serif',boxShadow:'0 6px 20px rgba(0,0,0,.22)'}} aria-label="Local language pack bot bridge"><strong>{strings.title}</strong><select aria-label="Language" value={locale} onChange={event=>setLocale(event.target.value)} style={{maxWidth:104}}>{SUPPORTED.map(item=><option key={item} value={item}>{item}</option>)}</select><span title={error||source}>{error?strings.error:pack?`${strings.ready} · ${source}`:strings.loading}</span><a href={botUrl} target="_blank" rel="noreferrer" style={{color:'#fff',textDecoration:'underline',whiteSpace:'nowrap'}}>{strings.bot}</a></aside>;
}
