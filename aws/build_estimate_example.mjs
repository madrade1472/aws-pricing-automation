// ---------------------------------------------------------------------------
// Exemplo: automação do AWS Pricing Calculator via Playwright headless.
//
// Fluxo demonstrado:
//   1. Abre uma estimativa pública read-only (SRC)
//   2. Clica "Atualizar estimativa" -> cópia editável (localStorage do SPA)
//   3. Escala os serviços de maior alavancagem (S3, Glue, DMS, CloudWatch,
//      EventBridge, Data Transfer)
//   4. Usa o Amazon Athena como "dial" de fechamento: lê o total real
//      acumulado e calcula o GB/consulta exato para cravar o TARGET
//   5. Renomeia a estimativa e gera o link compartilhável anônimo (Share)
//
// Uso:  node aws/build_estimate_example.mjs
// Ajuste SRC / NAME / TARGET e os valores de cada editService() conforme o caso.
// ---------------------------------------------------------------------------
import { chromium } from 'playwright';
import fs from 'fs';
const SRC='https://calculator.aws/#/estimate?id=ad34b0ffc8336cf84ff69a5eeedf485e5842d1c2';
const NAME='Demo Estimate';
const TARGET=4500;
const browser = await chromium.launch({ headless:true });
const page = await browser.newPage({ viewport:{width:1440,height:1800} });
const log=(...a)=>console.log(...a);
async function dc(){
  for(const re of [/^Accept$/,/Accept all/i,/Aceitar/i]){ const b=page.getByRole('button',{name:re}).first(); if(await b.count()&&await b.isVisible().catch(()=>0)){await b.click().catch(()=>{});await page.waitForTimeout(300);} }
}
const vis=(sel)=>page.locator(sel+':visible');
function parseBR(s){ if(!s) return NaN; return parseFloat(String(s).replace(/\./g,'').replace(',','.')); }
async function readTotal(){
  for(let i=0;i<12;i++){
    await page.waitForTimeout(700);
    const t=await page.locator('body').innerText().catch(()=>'');
    const m=t.match(/Custo mensal\s*([\d.,]+)\s*USD/i);
    if(m) return parseBR(m[1]);
  }
  return NaN;
}
async function ensureEstimate(){
  for(let i=0;i<12;i++){ if(await page.getByRole('button',{name:/Adicionar serviço|Add service/i}).first().count()) return true; await page.waitForTimeout(600); }
  return false;
}
async function openEdit(ariaRe){
  for(let a=0;a<5;a++){
    await ensureEstimate();
    const b=page.getByRole('button',{name:ariaRe}).first();
    if(!(await b.count())){ await page.waitForTimeout(800); continue; }
    await b.scrollIntoViewIfNeeded().catch(()=>{}); await b.click().catch(()=>{});
    await page.waitForTimeout(4000); await dc();
    if(page.url().includes('/createCalculator')) return true;
    const c=page.getByRole('button',{name:/^Cancelar$|^Cancel$/i}).first();
    if(await c.count()){ await c.click().catch(()=>{}); await page.waitForTimeout(2500); }
    await page.waitForTimeout(800);
  }
  return false;
}
async function setField(aria,val){
  const sel=`input[aria-label="${aria}"], textarea[aria-label="${aria}"]`;
  for(let i=0;i<6;i++){
    const el=vis(sel).first();
    if(!(await el.count())){ await page.waitForTimeout(500); continue; }
    await el.scrollIntoViewIfNeeded().catch(()=>{});
    await el.click().catch(()=>{}); await el.fill('').catch(()=>{}); await el.fill(String(val)).catch(()=>{});
    await page.keyboard.press('Tab').catch(()=>{}); await page.waitForTimeout(500);
    const got=(await el.inputValue().catch(()=>'')).replace(/,/g,'');
    if(got===String(val)) return true;
  }
  log('   !! falha campo:',aria,'=',val); return false;
}
async function setByCurrentVal(curr,val){ // p/ campos com aria ambíguo (Data Transfer)
  const inputs=await vis('input').all();
  for(const el of inputs){ const v=await el.inputValue().catch(()=>''); if(v===String(curr)){ await el.scrollIntoViewIfNeeded().catch(()=>{}); await el.click().catch(()=>{}); await el.fill('').catch(()=>{}); await el.fill(String(val)).catch(()=>{}); await page.keyboard.press('Tab').catch(()=>{}); await page.waitForTimeout(500); return true; } }
  log('   !! nao achei input com valor',curr); return false;
}
function readFormCost(t){ const m=t.match(/Custo mensal total:\s*([\d.,]+)\s*USD/i); return m?parseBR(m[1]):NaN; }
async function saveEdit(){
  await dc();
  const save=page.getByRole('button',{name:/^Atualizar$|^Salvar$|Save changes|^Save$/i}).first();
  for(let i=0;i<5;i++){
    if(!(await save.count())) break;
    await save.evaluate(el=>el.scrollIntoView({block:'center'})).catch(()=>{});
    await page.waitForTimeout(300);
    try{ await save.click({timeout:8000}); }catch{ await dc(); }
    await page.waitForTimeout(2500);
    if(!page.url().includes('/createCalculator')) return true;
  }
  return !page.url().includes('/createCalculator');
}
async function editService(ariaRe, fills, label){
  log(`\n=== editando ${label} ===`);
  const ok=await openEdit(ariaRe);
  if(!ok){ log(`   !! nao abriu ${label}`); return false; }
  for(const f of fills){ await f(); }
  await page.waitForTimeout(1200);
  const saved=await saveEdit();
  log(`   salvo=${saved}`);
  await ensureEstimate();
  return saved;
}

const results={};
try{
  await page.goto(SRC,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(7000); await dc();
  const upd=page.getByRole('button',{name:/Atualizar estimativa|Update estimate/i}).first();
  if(await upd.count()){ await upd.click().catch(()=>{}); await page.waitForTimeout(6000); await dc(); }
  await ensureEstimate();
  log('estimativa editável pronta. total inicial=', await readTotal());

  // ---- EDIÇÕES não-Athena (tier maior) ----
  await editService(/^edit Amazon Simple Storage Service \(S3\)$/i,
    [()=>setField('Armazenamento S3 Standard Valor','15000')], 'S3 (15 TB)');

  await editService(/^edit AWS Glue$/i,
    [()=>setField('Número de DPUs para trabalho do Apache Spark Inserir quantidade','32')], 'Glue Spark (32 DPU)');

  await editService(/^edit AWS Database Migration Service$/i,
    [()=>setField('Número de instâncias','6'), ()=>setField('Quantidade de armazenamento (Single-AZ) Valor','1500')], 'DMS (6x + 1.5TB)');

  await editService(/^edit Amazon CloudWatch$/i,
    [()=>setField('Número de métricas (inclui métricas detalhadas e personalizadas) Insira a quantidade','900')], 'CloudWatch (900 metrics)');

  await editService(/^edit Amazon EventBridge$/i,
    [()=>setField('Número de eventos personalizados Valor','60')], 'EventBridge (60M)');

  await editService(/^edit AWS Data Transfer$/i,
    [()=>setByCurrentVal('100','6000')], 'DataTransfer (6 TB out)');

  // total antes da Athena
  await ensureEstimate();
  const T1=await readTotal();
  log(`\n>>> total apos nao-Athena = ${T1} USD (Athena ainda ~22,33)`);

  // ---- ATHENA como dial de fechamento ----
  const athenaOld=22.33, sparkPart=21.35; // scan antigo ~0.98
  const athenaNewCost = TARGET - (T1 - athenaOld);
  const scanCost = Math.max(0, athenaNewCost - sparkPart);
  let gb = Math.round(scanCost * 1024 / (5*200)); // scan=GB*200/1024*5
  if(gb<1) gb=1;
  log(`   Athena alvo custo=${athenaNewCost.toFixed(2)} -> GB/consulta=${gb}`);
  await editService(/^edit Amazon Athena$/i,
    [()=>setField('Quantidade de dados verificados por consulta Valor',String(gb))], `Athena (${gb} GB/consulta)`);

  // ---- total final ----
  await ensureEstimate();
  const TF=await readTotal();
  log(`\n=== TOTAL FINAL = ${TF} USD/mês (alvo ${TARGET}) ===`);
  await page.screenshot({path:'c2-final.png',fullPage:true});
  fs.writeFileSync('claude2-summary.txt', await page.locator('body').innerText());

  // ---- RENOMEAR p/ "claude 2.0" (antes de compartilhar) ----
  try{
    const ed=page.getByRole('link',{name:/Edit My Estimate|Editar/i}).first();
    if(await ed.count()){ await ed.click().catch(()=>{}); await page.waitForTimeout(1800);
      const nmeInput=vis('input[type="text"]').first();
      if(await nmeInput.count()){ await nmeInput.click().catch(()=>{}); await nmeInput.fill('').catch(()=>{}); await nmeInput.fill(NAME).catch(()=>{}); await page.waitForTimeout(400);
        const ok=page.getByRole('button',{name:/^Salvar$|^Save$|Aplicar|Apply|^Atualizar$|Confirmar|OK/i}).first();
        if(await ok.count()){ await ok.click().catch(()=>{}); } else { await page.keyboard.press('Enter').catch(()=>{}); }
        await page.waitForTimeout(2500);
      }
    }
    await ensureEstimate();
    await page.screenshot({path:'c2-after-rename.png',fullPage:true});
    const nm=await page.locator('h1, h2').allInnerTexts().catch(()=>[]);
    log('titulo apos rename:', JSON.stringify(nm.slice(0,4)));
  }catch(e){ log('rename err', String(e).split('\n')[0]); }

  // ---- COMPARTILHAR ----
  log('=== gerando URL pública ===');
  const share=page.getByRole('button',{name:/^Compartilhar$|^Share$/i}).first();
  await share.scrollIntoViewIfNeeded().catch(()=>{}); await share.click({timeout:15000}).catch(()=>{}); await page.waitForTimeout(3000); await dc();
  const agree=page.getByRole('button',{name:/Concordar e continuar|Agree and continue|Concordar|Agree|Continuar|Continue/i}).first();
  if(await agree.count()){ await agree.click().catch(()=>{}); await page.waitForTimeout(6000); }
  await page.screenshot({path:'c2-share.png',fullPage:true});
  const urls=await page.locator('input').evaluateAll(els=>els.map(e=>e.value).filter(v=>v&&v.includes('calculator.aws/#/estimate')));
  log('URL_PUBLICA:', JSON.stringify(urls));
  fs.writeFileSync('claude2-result.json', JSON.stringify({name:NAME, total_final:TF, T1_sem_athena:T1, athena_gb:gb, urls}, null, 2));
}catch(e){ log('ERRO GERAL:', String(e)); }
finally{ await browser.close(); }
