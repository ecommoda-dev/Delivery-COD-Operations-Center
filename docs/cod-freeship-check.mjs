// docs/cod-freeship-check.mjs — «تحصيل الأوردرات COD»: الشحن المجاني (Worker ≥ 3.14.0 · الهب v1.86.0 · 14-11-2026)
//   تنبيه + تأكيد موظف التحصيل + خصم رسوم المندوب (75 ثابتة · Showroom بلا خصم) + قفل زرار التسجيل — متصفح فعلي + Worker وهمي.
//   npm i playwright --no-save && node docs/cod-freeship-check.mjs      (PW_CHROMIUM لو كروميوم مثبّت مسبقًا)
//   SHOT_DIR=/tmp/shots node docs/cod-freeship-check.mjs                 ← بيحفظ لقطات الشاشة كمان (2x)
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
const SHOT_DIR = process.env.SHOT_DIR || '';
if (SHOT_DIR) fs.mkdirSync(SHOT_DIR, { recursive: true });
let pass = 0, fail = 0;
const is = (c, m, d = '') => { c ? pass++ : fail++; console.log(c ? '  ✅' : '  ❌', m, !c && d ? `\n       ${d}` : ''); };

const COURIERS = ['Abo Selim', 'Mohamed Torky', 'instapay', '3laa', 'Showroom', 'Bosta'];
const imp = (id, name, amount = '200.00') => ({ id, orderName: name, customerName: 'عميل', amount, shippingAmount: '0.00', createdAt: '2026-11-13T10:00:00Z', s1: 'Delivered', s2: null, preRegistered: false });
const TODAY = { 'Abo Selim': [imp('65609', '#65609')] };
// فهرس أوردرات الـ preview الوهمي — freeShipping/courierFee/... هما اللي الـ Worker 3.14.0 بيرجّعهم
const base = (id, courier, amount, ship, fs) => ({ success: true, orderId: id, orderName: '#' + id, amount, subtotal: amount, shippingAmount: ship, canMarkAsPaid: true,
  financialStatus: 'PENDING', courier, lineItems: [], returnedItems: [], s1: 'Delivered', s2: null, orderKind: 'normal',
  freeShipping: false, courierFee: null, courierKind: null, courierMissing: false, flatFee: 75, ...fs });
const PREV = {
  '65609': base('65609', 'Abo Selim', '200.00', '0.00', { freeShipping: true, courierFee: 75, courierKind: 'courier' }),
  '65610': base('65610', 'Showroom', '3000.00', '0.00', { freeShipping: true, courierFee: 0, courierKind: 'showroom' }),
  '65611': base('65611', null, '2500.00', '0.00', { freeShipping: true, courierMissing: true }),
  '65612': base('65612', 'Abo Selim', '300.00', '75.00', {}),
  '65613': base('65613', 'Mohamed Torky', '4150.00', '0.00', { freeShipping: true, courierFee: 75, courierKind: 'courier' }),
};
const launchOpts = { args: ['--no-sandbox'] }; if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);
const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-14T08:00:00.000Z' };

async function open(viewport = { width: 1600, height: 1000 }, scale = 1) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale }); const page = await ctx.newPage(); const calls = [], errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); }, [SESSION]);
  await page.route('**/*.workers.dev/**', async route => {
    const req = route.request(); let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    const action = new URL(req.url()).searchParams.get('action') || (body && body.action) || '';
    calls.push({ action, body });
    let out = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], orders: [], employees: [], couriers: [], values: [], results: [], total: 0 };
    if (action === 'getCourierValues') out = { success: true, values: COURIERS };
    if (action === 'getCourierOrdersToday') out = { success: true, orders: TODAY[body.courier] || [] };
    if (action === 'getCourierOrders') out = { success: true, orders: [] };
    if (action === 'preview') out = PREV[String(body.orderId)] || { success: false, notFound: true };
    if (action === 'pay') out = { success: true, status: 'success', actions: ['تحصيل'], logged: true, orderId: body.orderId };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  });
  await page.goto(`${BASE}/COD-Payment-Center.html`); await page.waitForSelector('#entryInput'); await page.waitForSelector('#courierChips .courier-chip');
  return { page, calls, errs };
}
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const waitReady = (page, n) => page.waitForFunction(k => orders.length === k && orders.every(o => o.status === 'ready'), n);
async function shot(page, name) {
  if (!SHOT_DIR) return;
  await page.evaluate(() => { document.querySelectorAll('.toast-container .toast, .toast').forEach(t => t.remove()); });
  await page.waitForTimeout(250);
  const clip = await page.evaluate(() => {
    const a = document.getElementById('courierCard').getBoundingClientRect(), b = document.getElementById('tableWrap').getBoundingClientRect();
    const top = Math.max(0, a.top + scrollY - 12), bottom = b.bottom + scrollY + 12;
    return { x: Math.max(0, a.left - 12), y: top, width: a.width + 24, height: bottom - top };
  });
  await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true, clip });
}
const payClick = async page => { await page.click('#payBtn'); await page.waitForSelector('#confirmOverlay.open'); };

// ─────────────────────────────────────────────────────────────────
console.log('\n══ ① مندوب عادي + شحن مجاني: تنبيه + قفل + خصم 75 ══');
let { page, calls, errs } = await open({ width: 1600, height: 1000 }, SHOT_DIR ? 2 : 1);
await page.click('[data-courier="Abo Selim"]'); await page.waitForSelector('#importTableBody tr'); await page.click('#importAddBtn');
await waitReady(page, 1);
const st = await page.evaluate(() => ({
  net: getCourierCollectNet(), collect: calcCourierCollect(orders[0]), noteRows: document.querySelectorAll('tr.freeship-row').length,
  note: (document.querySelector('tr.freeship-row')?.innerText || '').replace(/\s+/g, ' '), chip: (document.querySelector('.fs-cell')?.innerText || '').replace(/\s+/g, ' '),
  btn: document.getElementById('payBtn').disabled, hint: document.getElementById('payHint').textContent, pending: document.querySelector('tr.order-row').classList.contains('freeship-pending-row'),
  detailAfterMain: document.querySelector('tr.order-row').nextElementSibling.classList.contains('detail-row'),
}));
is(st.noteRows === 1 && /شحن مجاني/.test(st.note) && /75/.test(st.note) && /200 − 75 = 125/.test(st.note), 'سطر التنبيه بيقول الأرقام (200 − 75 = 125)', st.note);
is(/مجاني/.test(st.chip) && /خصم 75/.test(st.chip), 'خلية «شحن» بتعرض «🆓 مجاني · خصم 75»', st.chip);
is(st.collect === 125 && st.net === 125, 'تحصيل المندوب = 125 من أول لحظة (قبل التأكيد)', JSON.stringify([st.collect, st.net]));
is(st.pending, 'الصف متعلّم «شحن مجاني لسه ما اتأكدش» (حافة كهرماني)');
is(st.detailAfterMain, 'صف التفاصيل لسه تحت صف الأوردر مباشرةً (toggleRow سليم)');
await page.click('[data-ptog="cash"]'); await page.click('[data-prest="cash"]');
const st2 = await page.evaluate(() => ({ valid: isPayValid(), btn: document.getElementById('payBtn').disabled, hint: document.getElementById('payHint').textContent, cash: document.getElementById('pmCash').value }));
is(st2.valid && st2.cash === '125', 'طرق الدفع على 125 (المطلوب بعد الخصم)', JSON.stringify(st2));
is(st2.btn && /أكّد الشحن المجاني: #65609/.test(st2.hint.replace(/[\u2066\u2069]/g, '')), 'زرار التسجيل مقفول بسبب التأكيد + الرسالة بتسمّي الأوردر', JSON.stringify(st2));
await shot(page, '1-before-confirm.png');
calls.length = 0;
try { await page.evaluate(() => document.getElementById('payBtn').click()); } catch {}
await page.waitForTimeout(150);
is(!(await page.evaluate(() => document.getElementById('confirmOverlay').classList.contains('open'))), 'الضغط على الزرار المقفول مابيفتحش نافذة التأكيد');
await page.evaluate(() => confirmBulkPay());
is(/أكّد الشحن المجاني/.test(await txt(page, '#resultBox, .result-box, #resultCard') + await txt(page, 'body')) && !(await page.evaluate(() => document.getElementById('confirmOverlay').classList.contains('open'))), 'نداء confirmBulkPay مباشر برضه بيتمنع');
await page.click('.fs-btn:not(.fs-undo)');
is(await page.evaluate(() => !document.querySelector('#resultBox.show, .result-box.show')), 'التأكيد بيمسح رسالة المنع القديمة');
const st3 = await page.evaluate(() => ({ conf: orders[0].freeShipConfirmed, ok: !!document.querySelector('.fs-note.fs-ok'), undo: !!document.querySelector('.fs-undo'), btn: document.getElementById('payBtn').disabled,
  pending: document.querySelector('tr.order-row').classList.contains('freeship-pending-row'), hint: document.getElementById('payHint').textContent }));
is(st3.conf && st3.ok && st3.undo && !st3.btn && !st3.pending && st3.hint === '', 'بعد «أؤكد»: التنبيه أخضر + «تراجع» + الزرار اتفتح', JSON.stringify(st3));
await shot(page, '2-after-confirm.png');
await page.click('.fs-undo');
is(await page.evaluate(() => !orders[0].freeShipConfirmed && document.getElementById('payBtn').disabled), '«تراجع» بيرجّع القفل');
await page.click('.fs-btn:not(.fs-undo)');
await payClick(page);
const dlg = await txt(page, '#confirmBody');
is(/شحن مجاني \(1\)/.test(dlg) && /خصم 75/.test(dlg), 'نافذة التأكيد النهائية فيها سطر «🆓 شحن مجاني (1) · خصم 75»', dlg.slice(0, 260));
calls.length = 0;
await page.click('#confirmOkBtn');
await page.waitForFunction(() => !orders.length || orders.every(o => o.status !== 'loading'));
await page.waitForTimeout(300);
const pay = calls.find(c => c.action === 'pay');
is(!!pay, 'اتبعت pay');
is(pay && pay.body.amount === '200.00', 'المبلغ المسجّل على شوبيفاي = 200 (الإجمالي مش المخصوم)', pay && pay.body.amount);
is(pay && pay.body.orderMeta.courierCollect === 125, 'orderMeta.courierCollect = 125', JSON.stringify(pay && pay.body.orderMeta.courierCollect));
is(pay && JSON.stringify(pay.body.orderMeta.freeShipping) === JSON.stringify({ confirmed: true, courierKind: 'courier', courierFee: 75 }), 'orderMeta.freeShipping = تأكيد بنوع المندوب والأجر', JSON.stringify(pay && pay.body.orderMeta.freeShipping));
is(pay && pay.body.sessionMeta.batchExpected.collect === '125.00' && pay.body.sessionMeta.batchExpected.net === '125.00', 'batchExpected.collect/net = 125.00', JSON.stringify(pay && pay.body.sessionMeta.batchExpected));
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));
await page.context().close();

console.log('\n══ ② حارس وقت التنفيذ: الجدول اتغيّر بعد التأكيد ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65609')); await waitReady(page, 1);
await page.click('[data-ptog="cash"]'); await page.click('[data-prest="cash"]'); await page.click('.fs-btn:not(.fs-undo)');
await payClick(page);
await page.evaluate(() => { orders[0].freeShipConfirmed = false; });   // «تراجع» حصل والنافذة مفتوحة
calls.length = 0;
await page.click('#confirmOkBtn'); await page.waitForTimeout(400);
is(!calls.some(c => c.action === 'pay'), 'مفيش أي نداء pay اتبعت (إعادة التحقق قبل أول كتابة)');
is(/الجدول اتغيّر بعد التأكيد/.test(await txt(page, 'body')) || (await page.evaluate(() => !!document.querySelector('.result-box, #resultBox'))), 'رسالة «الجدول اتغيّر بعد التأكيد»');
await page.context().close();

console.log('\n══ ③ Showroom: تأكيد بلا خصم ══');
({ page, calls, errs } = await open({ width: 1600, height: 1000 }, SHOT_DIR ? 2 : 1));
await page.evaluate(() => addOrder('65610')); await waitReady(page, 1);
const sh = await page.evaluate(() => ({ net: getCourierCollectNet(), note: (document.querySelector('tr.freeship-row')?.innerText || '').replace(/\s+/g, ' '), chip: (document.querySelector('.fs-cell')?.innerText || '').replace(/\s+/g, ' '),
  btnLabel: document.querySelector('.fs-btn')?.textContent }));
is(sh.net === 3000, 'Showroom: التحصيل 3000 كامل (مفيش خصم)', String(sh.net));
is(/Showroom/.test(sh.note) && /مفيش خصم/.test(sh.note), 'التنبيه بيقول «Showroom: مفيش خصم»', sh.note);
is(/بلا خصم/.test(sh.chip) && /بدون خصم/.test(sh.btnLabel), 'الخلية والزرار «بلا/بدون خصم»', JSON.stringify([sh.chip, sh.btnLabel]));
await page.click('[data-ptog="cash"]'); await page.click('[data-prest="cash"]');
is(await page.evaluate(() => document.getElementById('payBtn').disabled), 'برضه مقفول لحد ما الموظف يأكّد');
await shot(page, '3-showroom.png');
await page.click('.fs-btn:not(.fs-undo)'); await payClick(page);
is(/بدون خصم/.test(await txt(page, '#confirmBody')), 'نافذة التأكيد: «بدون خصم (Showroom)»');
calls.length = 0; await page.click('#confirmOkBtn'); await page.waitForTimeout(400);
const p3 = calls.find(c => c.action === 'pay');
is(p3 && p3.body.orderMeta.courierCollect === 3000 && p3.body.orderMeta.freeShipping.courierKind === 'showroom' && p3.body.orderMeta.freeShipping.courierFee === 0, 'pay: courierCollect = 3000 + تأكيد Showroom بأجر 0', JSON.stringify(p3 && p3.body.orderMeta));
await page.context().close();

console.log('\n══ ④ شحن مجاني بلا مندوب: ممنوع ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65611')); await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'ready');
const mi = await page.evaluate(() => ({ err: !!document.querySelector('.fs-note.fs-err'), noBtn: !document.querySelector('.fs-btn'), dis: document.getElementById('payBtn').disabled,
  note: (document.querySelector('tr.freeship-row')?.innerText || '').replace(/\s+/g, ' '), fsErr: getFreeShipError(), collect: calcCourierCollect(orders[0]) }));
is(mi.err && mi.noBtn && mi.dis && /حدد المندوب/.test(mi.note), 'بلا مندوب: تنبيه أحمر بلا زرار تأكيد + التسجيل مقفول', JSON.stringify(mi));
is(/حدد المندوب/.test(mi.fsErr) && mi.collect === 2500, 'مفيش خصم بيتخمّن (التحصيل 2500 زي ما هو) والرسالة «حدد المندوب»', JSON.stringify(mi));
await page.context().close();

console.log('\n══ ⑤ أوردر بشحن على شوبيفاي: مفيش أي تغيير ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65612')); await waitReady(page, 1);
const nm = await page.evaluate(() => ({ rows: document.querySelectorAll('tr.freeship-row').length, chip: !!document.querySelector('.fs-chip'), net: getCourierCollectNet(), err: getFreeShipError() }));
is(nm.rows === 0 && !nm.chip && nm.net === 225 && nm.err === null, 'بلا تنبيه ولا قفل والتحصيل = 300 − 75 = 225 (الحساب القديم)', JSON.stringify(nm));
await page.click('[data-ptog="cash"]'); await page.click('[data-prest="cash"]');
is(await page.evaluate(() => !document.getElementById('payBtn').disabled), 'الزرار بيفتح من غير تأكيد');
calls.length = 0; await payClick(page); await page.click('#confirmOkBtn'); await page.waitForTimeout(400);
const p5 = calls.find(c => c.action === 'pay');
is(p5 && p5.body.orderMeta.freeShipping === null && p5.body.orderMeta.courierCollect === 225, 'pay: freeShipping = null و courierCollect = 225', JSON.stringify(p5 && p5.body.orderMeta));
await page.context().close();

console.log('\n══ ⑥ جلسة فيها أوردرين مجانيين + عادي: كل واحد بتأكيده ══');
({ page, calls, errs } = await open());
await page.evaluate(async () => { await addOrder('65613'); await addOrder('65612'); await addOrder('65609'); });
await page.waitForFunction(() => orders.length === 3 && orders.every(o => o.status === 'ready'));
// (المندوبين مختلفين في الفيكسشر — بنركّز على التأكيد)
const six = await page.evaluate(() => ({ rows: document.querySelectorAll('tr.freeship-row').length, err: getFreeShipError() }));
is(six.rows === 2 && /#65613/.test(six.err) && /#65609/.test(six.err) && !/#65612/.test(six.err), 'تنبيهين بس، والرسالة بتسمّي الأوردرين المجانيين', JSON.stringify(six));
await page.evaluate(() => confirmFreeShip(orders.findIndex(o => o.id === '65613')));
is(await page.evaluate(() => /#65609/.test(getFreeShipError()) && !/#65613/.test(getFreeShipError())), 'تأكيد أوردر واحد بيسيب التاني ممنوع');
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));
await page.context().close();

console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
