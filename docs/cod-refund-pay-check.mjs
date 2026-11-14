// docs/cod-refund-pay-check.mjs — فحص «جلسة الاسترداد البحتة لازم طرق دفع تساوي الصافي» (v1.88.0 · متصفح فعلي + Worker وهمي)
//   #65609: استرداد −200 −75 أجر = −275 اتسجّل بطرق دفع صفر ← «فرق طرق الدفع عن الصافي» = 275 في شيت «الإجمالي».
//   A استرداد بحت (فاضي · ناقص · زيادة · مظبوط · استدعاء مباشر) · B حسابات انستاباي/محفظة · C شحن إضافي
//   D الجلسة المختلطة والتحصيل البحت ما اتغيّروش · E فشل جزئي وإعادة محاولة
//   npm i playwright --no-save && node docs/cod-refund-pay-check.mjs      (PW_CHROMIUM لو كروميوم مثبّت مسبقًا)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = process.env.PAGE || 'COD-Payment-Center.html';
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
const launchOpts = { args: ['--no-sandbox'] }; if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);
const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-03T08:00:00.000Z' };
let failIds = new Set();

async function open() {
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const calls = [], errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); }, [SESSION]);
  await page.route('**/*.workers.dev/**', async route => {
    const req = route.request(); let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    const action = new URL(req.url()).searchParams.get('action') || (body && body.action) || '';
    calls.push({ action, body });
    let out = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], orders: [], employees: [], couriers: [], values: [], results: [], total: 0 };
    if (action === 'getCourierValues') out = { success: true, values: ['Abo Selim', 'Showroom', 'Bosta'] };
    if (action === 'refund') out = failIds.has(String(body.orderId)) ? { success: false, error: 'فشل تجريبي' } : { success: true, status: 'success', actions: ['استرداد'], logged: true, orderId: body.orderId };
    if (action === 'pay') out = { success: true, status: 'success', actions: ['تحصيل'], logged: true, orderId: body.orderId };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  });
  await page.goto(`${BASE}/${FILE}`); await page.waitForSelector('#entryInput');
  return { page, calls, errs };
}
const refundOrd = (over = {}) => Object.assign({ id: '1', orderName: '#1', status: 'refund', amount: -200, refundAmount: 200, returnShipping: '0.00', hasReturn: true, courier: 'Abo Selim',
  lineItems: [], returnedItems: [], saleTransactions: [{ id: 't', amount: 200 }], orderKind: 'full_return', multiCycle: false,
  freeShipping: true, courierFee: 75, courierKind: 'courier', feeLeg: 'return', freeShipConfirmed: true }, over);
const readyOrd = (over = {}) => Object.assign({ id: '9', orderName: '#9', status: 'ready', amount: 300, subtotal: 250, shippingAmount: 50, courier: 'Abo Selim', financialStatus: 'PENDING', lineItems: [], returnedItems: [], s1: 'Delivered', s2: null }, over);
const setSession = (page, list, extra = []) => page.evaluate(([l, x]) => { orders = l; extraEntries = x; payReset(); renderTable(); renderExtraEntries(); updateStats(); updatePayMethodsCard(); updatePayBtn(); }, [list, extra]);
const st = page => page.evaluate(() => ({ dis: document.getElementById('payBtn').disabled, hint: document.getElementById('payHint').textContent, net: getCourierCollectNet(), valid: isPayValid() }));
const setCash = async (page, v) => { await page.click('[data-ptog="cash"]'); await page.fill('[data-pin="cash"]', String(v)); };
const confirmOpen = page => page.evaluate(() => document.getElementById('confirmOverlay').classList.contains('open'));

console.log('\n══ A: استرداد بحت (#65609: −200 −75 = −275) ══');
let { page, calls, errs } = await open();
await setSession(page, [refundOrd()]);
let s = await st(page);
is(s.net === -275, 'الصافي −275', JSON.stringify(s));
is(s.dis === true, 'A1: طرق الدفع فاضية ← الزرار مقفول', JSON.stringify(s));
is(/أدخل مبالغ/.test(s.hint), 'A2: الرسالة تقول أدخل المبالغ', s.hint);
calls.length = 0; await page.evaluate(() => confirmBulkPay());
is(!(await confirmOpen(page)), 'A3: confirmBulkPay مباشر بلا طرق دفع ← نافذة التأكيد ما فتحتش');
await page.evaluate(() => closeConfirm());
await page.evaluate(() => doBulkPayAndRefund()); await page.waitForTimeout(400);
is(!calls.some(c => c.action === 'refund'), 'A4: doBulkPayAndRefund مباشر بلا طرق دفع ← صفر نداء refund', JSON.stringify(calls.map(c => c.action)));
await setCash(page, 200);
s = await st(page);
is(s.dis && /المتبقي 75/.test(s.hint), 'A5: 200 بدل 275 ← مقفول «المتبقي 75»', JSON.stringify(s));
await page.fill('[data-pin="cash"]', '300'); s = await st(page);
is(s.dis && /زيادة 25/.test(s.hint), 'A6: 300 ← مقفول «زيادة 25»', JSON.stringify(s));
await page.fill('[data-pin="cash"]', '275'); s = await st(page);
is(!s.dis && s.valid, 'A7: 275 بالظبط ← مفتوح', JSON.stringify(s));
calls.length = 0; await page.click('#payBtn'); await page.waitForSelector('#confirmOverlay.open'); await page.click('#confirmOkBtn');
await page.waitForFunction(() => orders.length === 0, null, { timeout: 8000 });
const rf = calls.find(c => c.action === 'refund');
is(rf && rf.body.orderMeta.paymentSplit.cash === '275.00' && rf.body.orderMeta.courierCollect === -275, 'A8: refund اتبعت بـ paymentSplit.cash = 275.00 و courierCollect −275', JSON.stringify(rf && rf.body.orderMeta.paymentSplit));
is(errs.length === 0, 'صفر pageerror', errs.join('|'));
await page.context().close();

console.log('\n══ B: استرداد بحت + انستاباي بحسابين ══');
({ page, calls, errs } = await open());
await setSession(page, [refundOrd()]);
await page.click('[data-ptog="instapay:فادي"]'); await page.fill('[data-pin="instapay:فادي"]', '100');
await page.click('[data-ptog="wallet:إسلام"]'); await page.fill('[data-pin="wallet:إسلام"]', '175');
s = await st(page);
is(!s.dis && s.valid, 'B1: 100 انستاباي + 175 محفظة = 275 ← مفتوح', JSON.stringify(s));
await page.context().close();

console.log('\n══ C: استرداد بحت + شحن إضافي ══');
({ page, calls, errs } = await open());
await setSession(page, [refundOrd()], [{ id: '8', orderName: '#8', amount: '75', status: 'ok', courier: 'Abo Selim' }]);
s = await st(page);
is(s.net === -350, 'C1: الصافي −350 (−275 − 75 شحن إضافي)', JSON.stringify(s));
is(s.dis, 'C2: فاضي ← مقفول', JSON.stringify(s));
await page.click('[data-ptog="cash"]'); await page.fill('[data-pin="cash"]', '350'); s = await st(page);
is(!s.dis, 'C3: 350 ← مفتوح', JSON.stringify(s));
await page.context().close();

console.log('\n══ D: جلسة مختلطة (ما اتغيّرتش) ══');
({ page, calls, errs } = await open());
await setSession(page, [readyOrd(), refundOrd({ id: '2', orderName: '#2' })]);   // +250 − 275 = −25
s = await st(page);
is(s.net === -25 && s.dis, 'D1: مختلطة صافيها −25 وطرق فاضية ← مقفول', JSON.stringify(s));
await page.click('[data-ptog="cash"]'); await page.fill('[data-pin="cash"]', '25'); s = await st(page);
is(!s.dis, 'D2: 25 ← مفتوح', JSON.stringify(s));
await setSession(page, [readyOrd({ amount: 275, shippingAmount: 0, subtotal: 275, id: '9', freeShipping: true, courierFee: 0, courierKind: 'showroom', freeShipConfirmed: true }), refundOrd({ id: '2', orderName: '#2', courierFee: 75 })]);
s = await st(page);
is(s.net === 0 && !s.dis, 'D3: مختلطة صافيها صفر وطرق فاضية ← مفتوح (isZeroNetSession)', JSON.stringify(s));
await setSession(page, [readyOrd()]);
s = await st(page);
is(s.dis, 'D4: تحصيل بحت فاضي ← مقفول (زي الأول)', JSON.stringify(s));
await page.context().close();

console.log('\n══ E: فشل جزئي في جلسة استرداد بحتة ثم إعادة المحاولة ══');
failIds = new Set(['2']);
({ page, calls, errs } = await open());
await setSession(page, [refundOrd(), refundOrd({ id: '2', orderName: '#2' })]);   // −550
await setCash(page, 550);
s = await st(page);
is(s.net === -550 && !s.dis, 'E1: جلستين استرداد 550 ← مفتوح', JSON.stringify(s));
await page.click('#payBtn'); await page.waitForSelector('#confirmOverlay.open'); await page.click('#confirmOkBtn');
await page.waitForTimeout(800);
const after = await page.evaluate(() => ({ n: orders.length, st: orders.map(o => o.status), cash: document.getElementById('pmCash').value }));
is(after.n === 1 && after.st[0] === 'refund-error' && after.cash === '550', 'E2: الأوردر الفاشل فضل refund-error وطرق الدفع فضلت 550 (مش متصفّرة)', JSON.stringify(after));
// الموظف بيحذف الفاشل ويعيد إضافته → status refund بصافي −275 وطرق الدفع لسه 550
await page.evaluate(() => { orders = [Object.assign({}, orders[0], { status: 'refund', error: null })]; renderTable(); updatePayMethodsCard(); updatePayBtn(); });
failIds = new Set();
s = await st(page);
is(s.net === -275 && s.dis && /زيادة 275/.test(s.hint), 'E3: إعادة المحاولة لأوردر واحد: لازم يعدّل المبلغ لـ 275 («زيادة 275»)', JSON.stringify(s));
await page.fill('[data-pin="cash"]', '275'); s = await st(page);
is(!s.dis, 'E4: بعد التعديل لـ 275 ← مفتوح', JSON.stringify(s));
await page.context().close();

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
