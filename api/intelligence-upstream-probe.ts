const COLLECTOR='https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';

async function post(body:any){
  try{
    const r=await fetch(COLLECTOR,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'follow'});
    return {status:r.status,text:(await r.text()).slice(0,2500)};
  }catch(e:any){return {error:String(e?.message||e)}}
}

export default async function handler(_req:any,res:any){
  const base:any={
    action:'enqueue',asset_type:'TEXT',source_id:'TEST_WRITEBUS_20260821_1500',source_type:'TEST_ONLY',platform:'CENTRAL_INTELLIGENCE',category:'TEST',
    title:'Central write bus probe',summary:'TEST_ONLY safe probe for existing Common Library Collector',keywords:'TEST_ONLY|CENTRAL_WRITE_BUS',
    source_url:'https://example.com/central-writebus-probe-20260821',verified_status:'TEST_ONLY',status:'TEST_ONLY',target_apps:'APP_TRAVEL',use_case:'CENTRAL_INTELLIGENCE_WRITE_BUS'
  };
  const payloads=[
    base,
    {...base,url:base.source_url},
    {...base,url:base.source_url,text:base.summary,content:base.summary},
    {...base,url:base.source_url,text:base.summary,content:base.summary,source:'CENTRAL_INTELLIGENCE',source_name:'CENTRAL_INTELLIGENCE'}
  ];
  const results=[];
  for(const p of payloads) results.push({keys:Object.keys(p),result:await post(p)});
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:true,results,at:new Date().toISOString()});
}
