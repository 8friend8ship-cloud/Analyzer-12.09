const CANDIDATES = [
  'https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec',
  'https://script.google.com/macros/s/AKfycbxNPNmtCEeIjLJuUnfp-sTdEgQOzUUA_2cMkyqCzhaUJcRvYwppBgtSuPjbezWCn2zKrw/exec'
];

async function probe(url:string){
  const out:any={url};
  try {
    const r=await fetch(url+'?action=health',{redirect:'follow'});
    const t=await r.text();
    out.get={status:r.status,final_url:r.url,text:t.slice(0,1200)};
  } catch(e:any){out.get={error:String(e?.message||e)}}
  try {
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'health'}),redirect:'follow'});
    const t=await r.text();
    out.post={status:r.status,final_url:r.url,text:t.slice(0,1200)};
  } catch(e:any){out.post={error:String(e?.message||e)}}
  return out;
}

export default async function handler(_req:any,res:any){
  const results=[];
  for(const u of CANDIDATES) results.push(await probe(u));
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:true,results,at:new Date().toISOString()});
}
