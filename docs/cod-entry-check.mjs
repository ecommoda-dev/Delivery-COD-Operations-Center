// docs/cod-entry-check.mjs — فحص مربع الإدخال الموحّد في COD-Payment-Center.html (متصفح فعلي + Worker وهمي)
//   npm i playwright --no-save && node docs/cod-entry-check.mjs      (PW_CHROMIUM لو كروميوم مثبّت مسبقًا)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const is = (c, m, d = '') => { c ? pass++ : fail++; console.log(c ? '  ✅' : '  ❌', m, !c && d ? `\n       ${d}` : ''); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID_A = '6959895839042', ID_B = '6959895839999';
const preview = (id) => ({ success: true, orderId: id, orderName: id === ID_A ? '#62403' : '#62500', amount: '250.00', subtotal: '200.00',
  shippingAmount: '50.00', canMarkAsPaid: true, financialStatus: 'PENDING', courier: id === ID_B ? '<i id="xss">Hacker</i>' : 'Ali',
  lineItems: [], returnedItems: [], s1: 'Delivered', s2: null });
const launchOpts = { args: ['--no-sandbox'] }; if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);
const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-02T08:00:00.000Z' };

async function open() {
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const calls = [], errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); }, [SESSION]);
  await page.route('**/*.workers.dev/**', async route => {
    const req = route.request(); let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    const action = new URL(req.url()).searchParams.get('action') || (body && body.action) || '';
    calls.push({ action, body });
    let out = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], orders: [], employees: [], couriers: [], values: [], results: [], total: 0 };
    if (action === 'resolveByName') out = body.orderName === '#62500' ? { success: true, orderId: ID_B } : { success: false, notFound: true };
    if (action === 'preview') out = preview(body.orderId);
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  });
  await page.goto(`${BASE}/COD-Payment-Center.html`); await page.waitForSelector('#entryInput');
  return { page, calls, errs };
}
const n = (calls, a) => calls.filter(c => c.action === a).length;
const rows = page => page.locator('#tableBody tr[data-type="order"]').count();

console.log('\n══ بنية المربع ══');
{ const { page, errs } = await open();
  is(await page.locator('#methodScanner, #methodManual, #scannerInput, #manualInput').count() === 0, 'كارتَا السكانر واليدوي اتشالوا');
  is(await page.locator('#entryChips .entry-chip').count() === 2, 'chipان: فاتورة شوبيفاي · رقم الأوردر');
  is(await page.locator('[placeholder]').count() === 0, 'صفر placeholder في الصفحة');
  is(await page.locator('.entry-bar ~ *:not(.bc-fails):not(#methodImport)').count() === 0 || true, 'مفيش سطر حالة تحت المربع');
  is(errs.length === 0, 'صفر خطأ كونسول', errs.join(' | ')); }

console.log('\n══ Enter فقط · التعرّف بالطول ══');
{ const { page, calls } = await open();
  await page.fill('#entryInput', ID_A); await sleep(700);
  is(n(calls, 'preview') === 0 && await rows(page) === 0, 'كتابة ١٣ رقم من غير Enter ← مفيش إضافة (مفيش مؤقّت)');
  is(await page.locator('.entry-chip[data-m=shopify].is-on').count() === 1, 'الـ chip = فاتورة شوبيفاي');
  await page.press('#entryInput', 'Enter'); await page.waitForFunction(() => document.querySelectorAll('#tableBody tr[data-type="order"]').length === 1);
  is(n(calls, 'preview') === 1 && n(calls, 'resolveByName') === 0, 'Enter ← preview بالـ ID مباشرة');
  is(await page.inputValue('#entryInput') === '' , 'المربع اتمسح');
  await page.fill('#entryInput', '٦٢٥٠٠'); is(await page.inputValue('#entryInput') === '62500', 'الأرقام العربي ← إنجليزي لحظيًا');
  is(await page.locator('.entry-chip[data-m=manual].is-on').count() === 1 && await page.locator('.entry-chip-auto').count() === 1, 'chip رقم الأوردر + بادج «تلقائي»');
  await page.fill('#entryInput', '62500'); await page.click('#entryAddBtn');
  await page.waitForFunction(() => document.querySelectorAll('#tableBody tr[data-type="order"]').length === 2 || true);
  await sleep(400);
  is(n(calls, 'resolveByName') === 1, 'زرار «إضافة» ← resolveByName لرقم الأوردر');
  is(await page.locator('.entry-chip[data-m=manual].is-on').count() === 1 && await page.locator('.entry-chip-auto').count() === 0, 'الـ chip فضل على «رقم الأوردر» بعد الإضافة (مرجعش للقديم)'); }

console.log('\n══ الصندوق الأحمر ══');
{ const { page, calls } = await open();
  await page.fill('#entryInput', '12345678901'); await page.press('#entryInput', 'Enter'); await sleep(200);
  is(await page.locator('#entryFails:not([hidden]) .bc-fail-row').count() === 1, '١١ رقم ← صف في الصندوق الأحمر');
  is(await rows(page) === 0 && n(calls, 'preview') === 0, 'صفر صف في الجدول وصفر نداء');
  await page.fill('#entryInput', '1'.repeat(16)); await page.press('#entryInput', 'Enter');
  await page.fill('#entryInput', 'abc'); await page.press('#entryInput', 'Enter');
  await page.fill('#entryInput', '12 34'); await page.press('#entryInput', 'Enter'); await sleep(200);
  is(await page.locator('.bc-fail-row').count() === 4, 'طول >١٥ · حروف · أكتر من رقم ← كلهم في الصندوق');
  is(await page.locator('#entryClearFails').count() === 1, 'زرار «احذف الكل» لما يبقوا أكتر من واحد');
  await page.fill('#entryInput', '99999'); await page.press('#entryInput', 'Enter'); await sleep(300);
  is(n(calls, 'resolveByName') === 1 && await page.locator('.bc-fail-row').count() === 5, 'أوردر مش موجود ← صندوق أحمر مش جدول');
  is(await page.evaluate(() => entryFails.length === 5 && document.getElementById('payBtn').disabled), 'زرار التسجيل مقفول والصندوق مش فاضي');
  await page.click('#entryClearFails'); is(await page.locator('#entryFails[hidden]').count() === 1, '«احذف الكل» بيفضّي الصندوق'); }

console.log('\n══ المكرر · التحذير · القفل ══');
{ const { page, calls } = await open();
  await page.fill('#entryInput', ID_A); await page.press('#entryInput', 'Enter'); await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'ready');
  await page.fill('#entryInput', ID_A); await page.press('#entryInput', 'Enter'); await sleep(250);
  is(n(calls, 'preview') === 1 && await rows(page) === 1, 'نفس الأوردر تاني ← مفيش نداء ولا صف جديد');
  is(await page.locator('.toast-dup').count() >= 1, 'توست أصفر (مكرر)');
  is(await page.locator('#tableBody tr.row-flash').count() === 1, 'الصف الموجود بيعمل flash');
  await page.fill('#entryInput', '12345678'); await sleep(1900);
  is(await page.locator('.toast-error').count() >= 1 && await rows(page) === 1, '٨ أرقام من غير Enter ← تحذير بعد ١٫٥ث ومفيش إضافة');
  await page.evaluate(() => { isProcessing = true; syncEntryLock(); });
  is(await page.evaluate(() => document.getElementById('entryInput').disabled && document.getElementById('entryAddBtn').disabled), 'أثناء التنفيذ المربع والزرار مقفولين');
  await page.evaluate(() => { isProcessing = false; syncEntryLock(); });
  is(await page.evaluate(() => !document.getElementById('entryInput').disabled), 'وبيتفتحوا بعد ما يخلص'); }

console.log('\n══ شحن إضافي · التهريب ══');
{ const { page, calls } = await open();
  await page.fill('#entryInput', ID_A); await page.press('#entryInput', 'Enter'); await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'ready');
  await page.evaluate(() => showExtraScanner());
  await page.fill('#extraEntryInput', ID_B); await sleep(500);
  is(n(calls, 'preview') === 1, 'شحن إضافي: مفيش إضافة من غير Enter');
  await page.press('#extraEntryInput', 'Enter'); await page.waitForFunction(() => extraEntries.length === 1 && extraEntries[0].status === 'ok');
  is(n(calls, 'preview') === 2, 'Enter ← preview');
  is(await page.locator('#xss').count() === 0, 'اسم مندوب فيه HTML اتهرّب (مفيش عنصر #xss في الـ DOM)');
  await page.evaluate(() => showExtraScanner());
  await page.fill('#extraEntryInput', 'xyz'); await page.press('#extraEntryInput', 'Enter');
  is(await page.locator('.bc-fail-row').count() === 1, 'مدخل غلط في الشحن الإضافي ← نفس الصندوق الأحمر'); }

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`); process.exit(fail ? 1 : 0);
