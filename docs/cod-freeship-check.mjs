// docs/cod-freeship-check.mjs — «تحصيل الأوردرات COD»: الشحن المجاني (Worker ≥ 3.15.0 · الهب v1.87.0 · 14-11-2026) — S1 + الاسترجاع/الاستبدال
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
// 🆕 Worker 3.15.0 — الاسترجاع/الاستبدال (S2): `feeLeg:'return'` لما رسوم المرتجع على شوبيفاي = 0 والشحن الأصلي = 0
const ret = (id, courier, amount, extra, fs) => ({ ...base(id, courier, amount, '0.00', fs), s2: 'Returned', hasReturn: true, returnShipping: '0.00', orderKind: 'full_return', ...extra });
const refundX = { canMarkAsPaid: false, skipReason: 'مستحق استرداد', saleTransactions: [{ id: 't1', amount: 200 }] };
const LEG = { freeShipping: true, courierFee: 75, courierKind: 'courier', feeLeg: 'return' };
PREV['65620'] = ret('65620', 'Abo Selim', '-200.00', refundX, LEG);                                                       // #65609 الحقيقي: استرجاع كلي بلا رسوم مرتجع
PREV['65621'] = ret('65621', 'Abo Selim', '-125.00', { ...refundX, returnShipping: '75.00' }, {});                         // رسوم مرتجع 75 على شوبيفاي ← الحساب القديم
PREV['65622'] = ret('65622', 'Saif', '100.00', { orderKind: 'exchange' }, LEG);                                            // استبدال بفرق 100 يتحصّل
PREV['65623'] = ret('65623', 'Showroom', '-200.00', refundX, { freeShipping: true, courierFee: 0, courierKind: 'showroom', feeLeg: 'return' });
PREV['65624'] = ret('65624', null, '-200.00', refundX, { freeShipping: true, courierMissing: true, feeLeg: 'return' });
// 🆕 Worker 3.28.0 — «أجر مشوار فقط» (#65513): استبدال بنفس السعر · رصيد صفر · رسوم مرتجع صفر · شحن أصلي 75 والمرتجع اتقفل
PREV['65630'] = { ...ret('65630', 'Saif', '0.00', { canMarkAsPaid: false, skipReason: 'مدفوع بالكامل', financialStatus: 'PAID', orderKind: 'exchange', shippingAmount: '75.00' }, { ...LEG, feeOnly: true, feeReturnId: '37747065154' }) };
PREV['65631'] = { ...ret('65631', 'Saif', '0.00', { canMarkAsPaid: false, skipReason: 'مدفوع بالكامل', financialStatus: 'PAID', orderKind: 'exchange', shippingAmount: '75.00', feeOnlyState: 'trip_pending', feeOnlyMsg: 'x' }, {}) };
PREV['65632'] = { ...ret('65632', 'Saif', '0.00', { canMarkAsPaid: false, skipReason: 'مدفوع بالكامل', financialStatus: 'PAID', orderKind: 'exchange', shippingAmount: '75.00', feeOnlyState: 'already_recorded', feeOnlyMsg: 'x' }, {}) };
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
    if (action === 'refund') out = { success: true, status: 'success', actions: ['استرداد'], logged: true, orderId: body.orderId };
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

console.log('\n══ ⑦ الاسترجاع/الاستبدال (S2) بلا رسوم مرتجع: نفس التنبيه والتأكيد (Worker ≥ 3.15.0) ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65620'));
await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'refund');
const r1 = await page.evaluate(() => ({
  collect: calcCourierCollect(orders[0]), net: getCourierCollectNet(), rows: document.querySelectorAll('tr.freeship-row').length,
  note: (document.querySelector('tr.freeship-row')?.innerText || '').replace(/\s+/g, ' '), chip: (document.querySelector('.fs-cell')?.innerText || '').replace(/\s+/g, ' '),
  btn: document.getElementById('payBtn').disabled, pending: document.querySelector('tr.order-row').classList.contains('freeship-pending-row'),
}));
is(r1.rows === 1 && /شحن المرتجع\/الاستبدال مجاني/.test(r1.note) && /−200 − 75 = −275/.test(r1.note), 'استرداد: سطر التنبيه بيقول الأرقام (−200 − 75 = −275)', r1.note);
is(/مجاني/.test(r1.chip) && /أجر مرتجع 75/.test(r1.chip), 'خلية «شحن» بتعرض «🆓 مجاني · أجر مرتجع 75»', r1.chip);
is(r1.collect === -275 && r1.net === -275, 'تحصيل المندوب = −275 من أول لحظة (قبل التأكيد)', JSON.stringify([r1.collect, r1.net]));
is(r1.btn && r1.pending, 'زرار التنفيذ مقفول والصف متعلّم «لسه ما اتأكدش»');
await page.click('[data-ptog="cash"]'); await page.click('[data-prest="cash"]');
const r2 = await page.evaluate(() => ({ valid: isPayValid(), cash: document.getElementById('pmCash').value, btn: document.getElementById('payBtn').disabled, hint: document.getElementById('payHint').textContent }));
is(r2.valid && Math.abs(parseFloat(r2.cash)) === 275, 'طرق الدفع على 275 (المطلوب بعد الأجر)', JSON.stringify(r2));
is(r2.btn && /أكّد الشحن المجاني: #65620/.test(r2.hint.replace(/[⁦⁩]/g, '')), 'القفل بسبب التأكيد + الرسالة بتسمّي الأوردر', JSON.stringify(r2));
await page.evaluate(() => confirmBulkPay());
is(!(await page.evaluate(() => document.getElementById('confirmOverlay').classList.contains('open'))), 'نداء confirmBulkPay مباشر على الاسترداد برضه بيتمنع');
await page.click('.fs-btn:not(.fs-undo)');
const r3 = await page.evaluate(() => ({ ok: !!document.querySelector('.fs-note.fs-ok'), btn: document.getElementById('payBtn').disabled, ack: JSON.stringify(freeShipAck(orders[0])) }));
is(r3.ok && !r3.btn, 'بعد «أؤكد»: التنبيه أخضر والزرار اتفتح', JSON.stringify(r3));
await payClick(page);
const dlg7 = await txt(page, '#confirmBody');
is(/شحن مجاني \(1\)/.test(dlg7) && /أجر مرتجع 75/.test(dlg7) && !/خصم 75/.test(dlg7), 'نافذة التأكيد: «🆓 شحن مجاني (1) · أجر مرتجع 75»', dlg7.slice(0, 300));
is(/275/.test(dlg7), 'نافذة التأكيد: الإجمالي المستحق 275', dlg7.slice(0, 300));
calls.length = 0;
await page.click('#confirmOkBtn');
await page.waitForFunction(() => !orders.length || orders.every(o => o.status !== 'loading'));
await page.waitForTimeout(300);
const rf = calls.find(c => c.action === 'refund');
is(!!rf, 'اتبعت refund');
is(rf && rf.body.refundAmount === '200.00', 'مبلغ الاسترداد على شوبيفاي = 200 (مش 275)', rf && rf.body.refundAmount);
is(rf && JSON.stringify(rf.body.orderMeta.freeShipping) === JSON.stringify({ confirmed: true, courierKind: 'courier', courierFee: 75, leg: 'return' }), 'orderMeta.freeShipping فيه leg=return', JSON.stringify(rf && rf.body.orderMeta.freeShipping));
is(rf && rf.body.orderMeta.courierCollect === -275, 'orderMeta.courierCollect = −275', JSON.stringify(rf && rf.body.orderMeta.courierCollect));
is(rf && rf.body.sessionMeta.batchExpected.collect === '-275.00' && rf.body.sessionMeta.batchExpected.net === '-275.00', 'batchExpected.collect/net = −275.00', JSON.stringify(rf && rf.body.sessionMeta.batchExpected));
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));
await page.context().close();

console.log('\n══ ⑦-ب مرتجع برسوم 75 على شوبيفاي: الحساب القديم بلا تنبيه ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65621'));
await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'refund');
const rb = await page.evaluate(() => ({ collect: calcCourierCollect(orders[0]), rows: document.querySelectorAll('tr.freeship-row').length, err: getFreeShipError(), ack: freeShipAck(orders[0]) }));
is(rb.rows === 0 && rb.err === null && rb.ack === null && rb.collect === -200, 'بلا تنبيه ولا قفل والتحصيل = −(125 + 75) = −200', JSON.stringify(rb));
await page.context().close();

console.log('\n══ ⑦-ج استبدال بفرق 100 يتحصّل ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65622'));
await waitReady(page, 1);
const ex = await page.evaluate(() => ({ collect: calcCourierCollect(orders[0]), note: (document.querySelector('tr.freeship-row')?.innerText || '').replace(/\s+/g, ' '), btn: document.getElementById('payBtn').disabled }));
is(ex.collect === 25 && /100 − 75 = 25/.test(ex.note) && ex.btn, 'فرق الاستبدال 100 − 75 = 25 والزرار مقفول لحد التأكيد', JSON.stringify(ex));
await page.click('.fs-btn:not(.fs-undo)');
await page.click('[data-ptog="cash"]'); await page.click('[data-prest="cash"]');
calls.length = 0; await payClick(page); await page.click('#confirmOkBtn'); await page.waitForTimeout(400);
const px = calls.find(c => c.action === 'pay');
is(px && px.body.amount === '100.00' && px.body.orderMeta.courierCollect === 25 && px.body.orderMeta.freeShipping && px.body.orderMeta.freeShipping.leg === 'return', 'pay: المبلغ 100 · courierCollect 25 · leg=return', JSON.stringify(px && px.body.orderMeta));
await page.context().close();

console.log('\n══ ⑦-د Showroom مرتجع: تأكيد بلا أجر · وبلا مندوب: ممنوع ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65623'));
await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'refund');
const shw = await page.evaluate(() => ({ collect: calcCourierCollect(orders[0]), note: (document.querySelector('tr.freeship-row')?.innerText || '').replace(/\s+/g, ' '), chip: (document.querySelector('.fs-cell')?.innerText || '').replace(/\s+/g, ' '), btn: (document.querySelector('.fs-btn')?.innerText || '') }));
is(shw.collect === -200 && /مفيش أجر/.test(shw.note) && /بلا أجر/.test(shw.chip) && /بدون أجر/.test(shw.btn), 'Showroom: −200 كما هو + «مفيش أجر» + زرار «بدون أجر»', JSON.stringify(shw));
await page.context().close();
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65624'));
await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'refund');
const nm7 = await page.evaluate(() => ({ rows: document.querySelectorAll('tr.freeship-row').length, btns: document.querySelectorAll('.fs-btn').length, err: getFreeShipError(), btn: document.getElementById('payBtn').disabled }));
is(nm7.rows === 1 && nm7.btns === 0 && /حدد المندوب/.test(nm7.err) && nm7.btn, 'مرتجع بلا مندوب: تنبيه أحمر بلا زرار + التنفيذ مقفول', JSON.stringify(nm7));
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));
await page.context().close();

console.log('\n══ ⑧ v2.7.0 — «أجر مشوار فقط» (#65513): استبدال بنفس السعر · رصيد صفر ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65630'));
await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'refund');
const fo = await page.evaluate(() => ({
  st: orders[0].status, fo: orders[0].feeOnly, ra: orders[0].refundAmount, collect: calcCourierCollect(orders[0]), net: getCourierCollectNet(),
  note: (document.querySelector('tr.freeship-row')?.innerText || '').replace(/\s+/g, ' '), chip: (document.querySelector('.fs-cell')?.innerText || '').replace(/\s+/g, ' '),
  badge: (document.querySelector('tr.order-row .badge')?.innerText || '').trim(), btn: document.getElementById('payBtn').disabled,
  pay: (document.querySelector('tr.order-row')?.innerText || '').replace(/\s+/g, ' '),
}));
is(fo.st === 'refund' && fo.fo === true && fo.ra === 0, 'الأوردر دخل الجلسة كصف «أجر مشوار فقط» (refund بمبلغ 0)', JSON.stringify([fo.st, fo.fo, fo.ra]));
is(fo.collect === -75 && fo.net === -75, 'تحصيل المندوب = −75 (من أول لحظة)', JSON.stringify([fo.collect, fo.net]));
is(/مشوار المرتجع\/الاستبدال بلا تحصيل ولا استرداد/.test(fo.note) && /0 − 75 = −75/.test(fo.note) && /من غير أي تسجيل على شوبيفاي/.test(fo.note), 'سطر التنبيه: الأرقام (0 − 75 = −75) وإنه بلا تسجيل على شوبيفاي', fo.note);
is(/أجر مشوار 75/.test(fo.chip) && /أجر مشوار/.test(fo.badge) && /أجر مشوار فقط/.test(fo.pay), 'خلية «شحن» وبادج الصف وحالة الدفع بيقولوا «أجر مشوار»', JSON.stringify([fo.chip, fo.badge]));
is(fo.btn, 'زرار التنفيذ مقفول لحد التأكيد');
await page.click('[data-ptog="cash"]'); await page.click('[data-prest="cash"]');
const fo2 = await page.evaluate(() => ({ valid: isPayValid(), cash: document.getElementById('pmCash').value }));
is(fo2.valid && Math.abs(parseFloat(fo2.cash)) === 75, 'طرق الدفع على 75 (نقدي — الخزنة بتدفع للمندوب)', JSON.stringify(fo2));
await page.click('.fs-btn:not(.fs-undo)');
const fo3 = await page.evaluate(() => ({ ok: !!document.querySelector('.fs-note.fs-ok'), btn: document.getElementById('payBtn').disabled, ack: freeShipAck(orders[0]) }));
is(fo3.ok && !fo3.btn && fo3.ack && fo3.ack.feeOnly === true && fo3.ack.leg === 'return' && fo3.ack.courierFee === 75, 'بعد «أؤكد»: الزرار اتفتح والتأكيد فيه feeOnly + leg=return', JSON.stringify(fo3));
await payClick(page);
const dlgF = await txt(page, '#confirmBody');
is(/75/.test(dlgF) && /أجر مرتجع 75/.test(dlgF), 'نافذة التأكيد: أجر 75 والإجمالي المستحق', dlgF.slice(0, 260));
calls.length = 0;
await page.click('#confirmOkBtn');
await page.waitForFunction(() => !orders.length || orders.every(o => o.status !== 'loading'));
await page.waitForTimeout(300);
const rfF = calls.find(c => c.action === 'refund');
is(!!rfF && rfF.body.feeOnly === true, 'اتبعت refund بـ feeOnly:true', JSON.stringify(rfF && Object.keys(rfF.body)));
is(rfF && rfF.body.refundAmount === undefined && rfF.body.saleTransactions === undefined, 'من غير refundAmount ولا saleTransactions (مفيش استرداد على شوبيفاي)');
is(rfF && rfF.body.orderMeta.courierCollect === -75 && JSON.stringify(rfF.body.orderMeta.freeShipping) === JSON.stringify({ confirmed: true, courierKind: 'courier', courierFee: 75, leg: 'return', feeOnly: true }), 'orderMeta: courierCollect −75 + تأكيد feeOnly/leg', JSON.stringify(rfF && rfF.body.orderMeta));
is(rfF && rfF.body.sessionMeta.batchExpected.collect === '-75.00' && rfF.body.sessionMeta.batchExpected.net === '-75.00' && rfF.body.sessionMeta.batchExpected.refundOrders === 1, 'batchExpected: collect/net = −75.00 · refundOrders 1', JSON.stringify(rfF && rfF.body.sessionMeta.batchExpected));
is(!calls.some(c => c.action === 'pay'), 'مفيش pay');
const afterF = await page.evaluate(() => orders.length);
is(afterF === 0, 'الصف اتشال بعد النجاح');
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));
await page.context().close();

console.log('\n══ ⑧-ب أجر المشوار مش متاح (المرتجع مفتوح · اتسجّل قبل كده) ══');
({ page, calls, errs } = await open());
await page.evaluate(() => addOrder('65631'));
await page.waitForFunction(() => orders.length === 1 && orders[0].status === 'skipped');
await page.evaluate(() => addOrder('65632'));
await page.waitForFunction(() => orders.length === 2 && orders.every(o => o.status === 'skipped'));
const sk = await page.evaluate(() => ({ r: orders.map(o => o.skipReason), rows: document.querySelectorAll('tr.freeship-row').length, btn: document.getElementById('payBtn').disabled }));
is(/لسه ما خلصش/.test(sk.r[1]) && /اتسجّل قبل كده/.test(sk.r[0]) && sk.rows === 0, 'الاتنين متخطّيين بسبب مكتوب وبلا تنبيه تأكيد', JSON.stringify(sk));
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));
await page.context().close();

console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
