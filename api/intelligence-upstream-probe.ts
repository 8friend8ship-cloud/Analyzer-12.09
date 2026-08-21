const COLLECTOR='https://script.google.com/macros/s/AKfycbx5WTegTKUnyvFZC_qOaGBPlmKANLwXyNue19jLkFhdFwHnnp1E6_trZeVGdIg7B3GA/exec';
const TEST={
  source_id:'TEST_WRITEBUS_20260821_1455',source_type:'TEST_ONLY',platform:'CENTRAL_INTELLIGENCE',category:'TEST',
  title:'Central write bus probe',summary:'TEST_ONLY safe probe for existing Common Library Collector',
  keywords:'TEST_ONLY|CENTRAL_WRITE_BUS',source_url:'https://example.com/central-writebus-probe-20260821',
  verified_status:'TEST_ONLY',status:'TEST_ONLY'
};

async function call(method:string, action:string, body?:any){
  try{
    const url=method==='GET'?COLLECTOR+'?action='+encodeURIComponent(action):COLLECTOR;
    const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:method==='POST'?JSON.stringify({action,...(body||{})}):undefined,redirect:'follow'});
    return {action,method,status:r.status,final_url:r.url,text:(await r.text()).slice(0,2000)};
  }catch(e:any){return {action,method,error:String(e?.message||e)}}
}

export default async function handler(_req:any,res:any){
  const results:any[]=[];
  for(const a of ['health','status','info','search']) results.push(await call('GET',a));
  for(const a of ['enqueue','submit','add','addUrl','collect','event.publish']) results.push(await call('POST',a,TEST));
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:true,results,at:new Date().toISOString()});
}
