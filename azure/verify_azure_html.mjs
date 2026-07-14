import { chromium } from 'playwright';
const browser = await chromium.launch({ headless:true });
const page = await browser.newPage();
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); page.on('pageerror',e=>errs.push(String(e)));
await page.goto('file://'+process.cwd()+'/calculadora_azure_teste.html',{waitUntil:'networkidle'});
await page.waitForTimeout(800);
console.log('kMes =', await page.locator('#kMes').innerText());
console.log('kAno =', await page.locator('#kAno').innerText());
console.log('kQtd =', await page.locator('#kQtd').innerText());
console.log('tTotal =', await page.locator('#tTotal').innerText());
console.log('linhas de serviço =', await page.locator('#body tr:not(.cat)').count());
console.log('categorias =', await page.locator('#body tr.cat').count());
// testa interatividade: muda a 1a qtd e vê se recalcula
const firstQty=page.locator('#body tr:not(.cat) input').first();
await firstQty.fill('22'); await page.waitForTimeout(300);
console.log('apos dobrar 1a qtd -> kMes =', await page.locator('#kMes').innerText());
console.log('JS errors =', JSON.stringify(errs));
await browser.close();
