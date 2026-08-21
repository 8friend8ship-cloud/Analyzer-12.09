export default async function handler(_req:any,res:any){
  const event={
    EVENT_ID:'EVT_WRITEBUS_E2E_20260821_1505',
    PRODUCER_APP_ID:'APP_AGENT_CORE',
    DATA_STAGE:'SEED',
    ENTITY_TYPE:'WRITEBUS_TEST',
    ENTITY_ID:'SEED_WRITEBUS_E2E_20260821_1505',
    KEYWORD:'중앙 쓰기 버스 E2E 테스트',
    LOCALE:'ko-KR',
    SUMMARY:'TEST_ONLY central intelligence write bus end-to-end verification',
    KEYWORDS:'TEST_ONLY|WRITEBUS|CENTRAL_INTELLIGENCE',
    TAGS:'TEST_ONLY|E2E',
    SOURCE_URL:'https://contents-os.com/writebus-selftest/EVT_WRITEBUS_E2E_20260821_1505',
    LINEAGE_IDS:'TEST_ONLY',
    CONFIDENCE:1,
    STATUS:'TEST_ONLY',
    CONSUMER_SCOPE:'APP_TRAVEL|APP_ANALYZER',
    MEMO:'Delete after Drive URL_Inbox readback.'
  };
  const r=await fetch('https://contents-os.com/api/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),redirect:'follow'});
  const text=await r.text();
  let body:any; try{body=JSON.parse(text)}catch{body={raw:text.slice(0,1000)}}
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:r.ok,post_status:r.status,response:body,event});
}
