// docs/cod-pay-ui-check.mjs — فحص واجهة «تحصيل الأوردرات COD» v1.75.0 (متصفح فعلي + Worker وهمي)
//   شريط المناديب (§COURIER-STRIP) · طرق الدفع بلاطات (§PAY-TILES) · زرار التسجيل بثلاث خانات (§PAY-BAR)
//   npm i playwright --no-save && node docs/cod-pay-ui-check.mjs      (PW_CHROMIUM لو كروميوم مثبّت مسبقًا)
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

const COURIERS = ['Kareem', 'Abo Yassin', 'Bosta', '3laa'];
const imp = (id, name) => ({ id, orderName: name, customerName: 'عميل', amount: '300.00', shippingAmount: '50.00', createdAt: '2026-11-01T10:00:00Z', s1: 'Delivered', s2: null, preRegistered: false });
const TODAY = { Kareem: [imp('111', '#70001'), imp('222', '#70002')] };            // Abo Yassin / 3laa: فاضية
const SHOP = { 'Abo Yassin': [imp('333', '#70003'), imp('444', '#70004'), imp('555', '#70005')], Kareem: [imp('111', '#70001'), imp('222', '#70002'), imp('666', '#70006')] };
const COURIER_OF = { 111: 'Kareem', 222: 'Kareem', 666: 'Kareem', 333: 'Abo Yassin', 444: 'Abo Yassin', 555: 'Abo Yassin' };
const preview = (id) => ({ success: true, orderId: id, orderName: '#' + id, amount: '300.00', subtotal: '250.00', shippingAmount: '50.00', canMarkAsPaid: true,
  financialStatus: 'PENDING', courier: COURIER_OF[id] || 'Kareem', lineItems: [], returnedItems: [], s1: 'Delivered', s2: null });
const launchOpts = { args: ['--no-sandbox'] }; if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);
const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-03T08:00:00.000Z' };

async function open(viewport) {
  const ctx = await browser.newContext(viewport ? { viewport } : {}); const page = await ctx.newPage(); const calls = [], errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'S'); }, [SESSION]);
  await page.route('**/*.workers.dev/**', async route => {
    const req = route.request(); let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    const action = new URL(req.url()).searchParams.get('action') || (body && body.action) || '';
    calls.push({ action, body });
    let out = { ok: true, success: true, version: '99.0.0', checks: [], entries: [], orders: [], employees: [], couriers: [], values: [], results: [], total: 0 };
    if (action === 'getCourierValues') out = { success: true, values: COURIERS };
    if (action === 'getCourierOrdersToday') out = { success: true, orders: TODAY[body.courier] || [] };
    if (action === 'getCourierOrders') out = { success: true, orders: SHOP[body.courier] || [] };
    if (action === 'preview') out = preview(String(body.orderId));
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  });
  await page.goto(`${BASE}/COD-Payment-Center.html`); await page.waitForSelector('#entryInput');
  await page.waitForSelector('#courierChips .courier-chip');
  return { page, calls, errs };
}
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s)?.innerText || '').replace(/\s+/g, ' ').trim(), sel);
const names = calls => calls.map(c => c.action);

// ───────────────────────────────────────────────────────────────
console.log('\n══ ① الإدخال المضغوط + شريط المناديب ══');
let { page, calls, errs } = await open();
is(!/إضافة أوردرات/.test(await txt(page, '#panelScan .card')), 'عنوان «إضافة أوردرات» اتشال من مربع الإدخال');
is(await page.evaluate(() => !document.getElementById('importOverlay') && !document.getElementById('methodImport')), 'نافذة الاستيراد وكارت «البحث عن أوردرات المندوب» اتشالوا');
const chipNames = await page.$$eval('#courierChips .courier-chip', els => els.map(e => e.textContent.trim()));
is(JSON.stringify(chipNames) === JSON.stringify(COURIERS), 'كل المناديب ظاهرين في الصفحة بترتيب الـ Worker', JSON.stringify(chipNames));
is(!/اضغط على اسم المندوب/.test(await txt(page, '#courierCard')), 'مفيش جملة «اضغط على اسم المندوب لاستيراد أوردراته»');
is(await page.evaluate(() => document.getElementById('courierPanel').hidden), 'لوحة الاستيراد مخفية قبل اختيار مندوب');
is(await page.evaluate(() => !document.querySelector('.courier-chip .n, .courier-chip .count, .courier-chip small')), 'مفيش عدّاد على الشرايح');

console.log('\n══ ② الضغط على المندوب = بحث تلقائي في تسليمات اليوم ══');
calls.length = 0;
await page.click('[data-courier="Kareem"]'); await page.waitForSelector('#importTableBody tr');
is(names(calls).includes('getCourierOrdersToday') && !names(calls).includes('getCourierOrders'), 'اتنادى getCourierOrdersToday بس (مفيش نداء شوبيفاي)', JSON.stringify(names(calls)));
let info = await txt(page, '#importInfo');
is(/عدد 2 أوردرات/.test(info) && /المصدر: تسليمات اليوم المسجّلة/.test(info), 'شريط المصدر: «عدد 2 أوردرات» + «المصدر: تسليمات اليوم المسجّلة»', info);
is(await page.evaluate(() => document.querySelectorAll('.import-row-cb:checked').length === 2), 'تسليمات اليوم المسجّلة: كل الصفوف المؤهلة متحدّدة تلقائيًا');
is(/ابحث عن كل أوردرات المندوب من شوبيفاي مباشرة/.test(info), 'زرار «ابحث عن كل أوردرات المندوب من شوبيفاي مباشرة»');
is(await page.evaluate(() => document.querySelector('[data-courier="Kareem"]').classList.contains('on')), 'شريحة المندوب المختار مميّزة');

console.log('\n══ ③ البحث اليدوي في شوبيفاي والرجوع ══');
calls.length = 0;
await page.click('[data-iact="shop"]'); await page.waitForFunction(() => /شوبيفاي مباشرة/.test(document.getElementById('importInfo').innerText) && document.querySelectorAll('#importTableBody tr').length === 3);
info = await txt(page, '#importInfo');
is(names(calls).includes('getCourierOrders'), 'اتنادى getCourierOrders');
is(/عدد 3 أوردرات/.test(info) && /المصدر: شوبيفاي مباشرة/.test(info) && /رجوع لتسليمات اليوم/.test(info), 'عدد + المصدر + زرار الرجوع', info);
is(await page.evaluate(() => document.querySelectorAll('.import-row-cb:checked').length === 0), 'مصدر شوبيفاي: الاختيار صريح (مفيش تحديد تلقائي)');
await page.click('[data-iact="osu"]'); await page.waitForFunction(() => /تسليمات اليوم المسجّلة/.test(document.getElementById('importInfo').innerText));
is(true, 'الرجوع لتسليمات اليوم شغّال');

console.log('\n══ ④ تسليمات اليوم فاضية = تحويل تلقائي لشوبيفاي مع رسالة واضحة ══');
calls.length = 0;
await page.click('[data-courier="Abo Yassin"]'); await page.waitForFunction(() => document.querySelectorAll('#importTableBody tr').length === 3);
is(JSON.stringify(names(calls).filter(a => a.startsWith('getCourier'))) === JSON.stringify(['getCourierOrdersToday', 'getCourierOrders']), 'نداءان بالترتيب: اليوم ثم شوبيفاي', JSON.stringify(names(calls)));
info = await txt(page, '#importInfo');
is(/لا توجد تسليمات مسجّلة اليوم للمندوب Abo Yassin - المصدر: شوبيفاي مباشرة/.test(info), 'الرسالة: «لا توجد تسليمات مسجّلة اليوم للمندوب فلان - المصدر: شوبيفاي مباشرة»', info);
is(/عدد 3 أوردرات/.test(info), 'وعدد الأوردرات ظاهر');

console.log('\n══ ⑤ الإضافة = قفل باقي المناديب + «تغيير المندوب» في نفس الصف ══');
calls.length = 0;
await page.click('#importHeadCb'); await page.click('#importAddBtn');
await page.waitForFunction(() => orders.length === 3 && orders.every(o => o.status === 'ready'));
const lock = await page.evaluate(() => {
  const chips = [...document.querySelectorAll('.courier-chip')];
  return { disabledOthers: chips.filter(c => !/Abo Yassin/.test(c.textContent)).every(c => c.disabled), active: chips.find(c => /Abo Yassin/.test(c.textContent)),
    lockIcon: /🔒/.test(document.querySelector('[data-courier="Abo Yassin"]').textContent), activeEnabled: !document.querySelector('[data-courier="Abo Yassin"]').disabled,
    sameRow: !!document.querySelector('#courierChips > [data-cact="change"]'), panelHidden: document.getElementById('courierPanel').hidden,
    sentences: /تحصيل جلسة واحدة|باقي المناديب مقفولين|هيتم مسح/.test(document.getElementById('courierCard').innerText) };
});
is(lock.disabledOthers, 'باقي المناديب Inactive بعد الإضافة');
is(lock.lockIcon && lock.activeEnabled, 'المندوب المختار ظاهر بعلامة 🔒 وشغّال');
is(lock.sameRow, '«تغيير المندوب» في نفس صف المناديب (مش صف جديد)');
is(!lock.sentences, 'الجملتان اتحذفوا');
is(lock.panelHidden, 'لوحة الاستيراد اتقفلت بعد الإضافة');
await page.click('[data-cact="change"]');
const conf = await page.evaluate(() => ({ yes: !!document.querySelector('#courierChips > [data-cact="change-yes"]'), no: !!document.querySelector('#courierChips > [data-cact="change-no"]'), msg: /هيتم مسح/.test(document.getElementById('courierCard').innerText) }));
is(conf.yes && conf.no && !conf.msg, '«تأكيد التغيير» و«إلغاء» في نفس الصف وبدون جملة');
await page.click('[data-cact="change-no"]');
is(await page.evaluate(() => orders.length === 3 && !!document.querySelector('[data-cact="change"]')), 'الإلغاء بيرجّع الزرار ومابيمسحش حاجة');

console.log('\n══ ⑥ طرق الدفع: بلاطات + حسابات + عدّاد «المتبقي/الإجمالي» ══');
const target = await page.evaluate(() => Math.abs(getCourierCollectNet()));
is(target > 0, 'صافي الجلسة موجب', String(target));
const ui0 = await page.evaluate(() => ({ cols: document.querySelectorAll('.pay-col').length, tiles: document.querySelectorAll('.pay-tile').length,
  accounts: [...document.querySelectorAll('.pay-col-instapay .pay-tile-name, .pay-col-wallet .pay-tile-name')].map(e => e.textContent.trim()), checkCircle: document.querySelectorAll('.pay-tile .ind, .pay-tile .pay-check').length,
  banner: !!document.querySelector('.courier-banner'), grid: !!document.querySelector('.pay-grid') }));
is(ui0.cols === 3 && ui0.tiles === 7, '٣ أعمدة و٧ بلاطات (نقدي + ٣ انستاباي + ٣ محفظة)', JSON.stringify(ui0));
is(JSON.stringify(ui0.accounts) === JSON.stringify(['فادي', 'مُرسل', 'إسلام', 'فادي', 'مُرسل', 'إسلام']), 'حسابات انستاباي والمحفظة: فادي · مُرسل · إسلام');
is(ui0.checkCircle === 0, 'مفيش دايرة علامة صح');
is(!ui0.banner && !ui0.grid, 'بانر «المندوب:» وشبكة الحقول القديمة اتشالوا');
await page.click('[data-ptog="instapay:فادي"]');
const t1 = await page.evaluate(() => { const i = document.querySelector('[data-pin="instapay:فادي"]'); return { exists: !!i, empty: i && i.value === '', focused: document.activeElement === i, compact: i && i.closest('.pay-tile').getBoundingClientRect().height }; });
is(t1.exists && t1.empty && t1.focused, 'الضغط على الحساب بيفتح خانة فاضية وفيها الفوكس', JSON.stringify(t1));
is(t1.compact < 60, 'البلاطة compact (سطر واحد)', String(t1.compact));
await page.fill('[data-pin="instapay:فادي"]', '100');
let m = await page.evaluate(() => ({ hid: document.getElementById('pmInstapay').value, rem: document.getElementById('pmRem').textContent, sum: document.getElementById('pmSum').textContent, lbl: document.getElementById('pmLbl').textContent }));
is(m.hid === '100' && /100/.test(m.sum) && m.lbl === 'المتبقي', 'الكتابة بتحدّث المجموع المخفي والإجمالي', JSON.stringify(m));
await page.click('[data-ptog="wallet:مُرسل"]'); await page.click('[data-prest="wallet:مُرسل"]');
m = await page.evaluate(() => ({ hidW: document.getElementById('pmWallet').value, ok: document.getElementById('payMeter').classList.contains('ok'), btn: !document.getElementById('payBtn').disabled, valid: isPayValid() }));
is(m.hidW === String(target - 100) && m.ok && m.btn && m.valid, '«الباقي» بيملا المتبقي، العدّاد أخضر، والتسجيل اتفتح', JSON.stringify(m));
await page.fill('[data-pin="instapay:فادي"]', '20');
m = await page.evaluate(() => ({ btnDisabled: document.getElementById('payBtn').disabled, hint: document.getElementById('payHint').textContent, lbl: document.getElementById('pmLbl').textContent }));
is(m.btnDisabled && /المتبقي/.test(m.hint), 'نقص المبلغ ← الزرار مقفول والرسالة بتقول المتبقي', JSON.stringify(m));
await page.fill('[data-pin="instapay:فادي"]', String(target));
m = await page.evaluate(() => ({ lbl: document.getElementById('pmLbl').textContent, over: document.getElementById('payMeter').classList.contains('over'), dis: document.getElementById('payBtn').disabled }));
is(m.over && m.lbl === 'زيادة' && m.dis, 'زيادة ← العدّاد أحمر بكلمة «زيادة» والزرار مقفول', JSON.stringify(m));
await page.fill('[data-pin="instapay:فادي"]', '100');
const words = await page.evaluate(() => (document.getElementById('payMethodsCard').innerText + ' ' + document.getElementById('payHint').innerText + ' ' + document.getElementById('payMeter').innerHTML));
is(!/توزيع|موزّع|موزع|وزّع|وزع/.test(words), 'مفيش أي كلمة «توزيع/موزّع/وزّع» في مربع الدفع');
await page.click('[data-ptog="instapay:فادي"]');
is(await page.evaluate(() => document.getElementById('pmInstapay').value === ''), 'الضغط على الاسم تاني بيلغي الحساب ويصفّر مجموعه');

console.log('\n══ ⑦ زرار التسجيل بثلاث خانات ══');
await page.click('[data-ptog="instapay:فادي"]'); await page.fill('[data-pin="instapay:فادي"]', '100');
const bar = await page.evaluate(() => ({ cells: document.querySelectorAll('#payBtn .pb-cell').length, courier: document.getElementById('payBarCourier').textContent, net: document.getElementById('payBarNet').textContent, label: document.getElementById('payBarLabel').textContent, expected: fmtSigned(getCourierCollectNet()) }));
is(bar.cells === 2 && bar.courier === 'Abo Yassin' && bar.net === bar.expected && /تسجيل الدفع على شوبيفاي/.test(bar.label), 'المندوب · صافي التحصيل · الإجراء داخل الزرار', JSON.stringify(bar));
await page.click('#payBtn'); await page.waitForSelector('#confirmOverlay.open');
const dlg = await txt(page, '#confirmBody');
is(/انستاباي/.test(dlg) && /↳ فادي/.test(dlg) && /محفظة/.test(dlg) && /↳ مُرسل/.test(dlg), 'نافذة التأكيد بتفصّل حسابات انستاباي والمحفظة', dlg.slice(0, 240));
await page.evaluate(() => closeConfirm());

console.log('\n══ ⑧ الصافي السالب: المبالغ بالسالب وبالأحمر ══');
await page.evaluate(() => {
  orders = [{ id: '19096316641602', orderName: '#63578', status: 'refund', amount: -250, refundAmount: 250, returnShipping: '0.00', hasReturn: true, courier: 'Abo Yassin',
    lineItems: [{ sku: 'x', quantity: 1 }], returnedItems: [{ sku: 'x', quantity: 1, discountedUnitPrice: '250.00' }], saleTransactions: [{ id: 't', amount: 250 }], orderKind: 'partial_return', multiCycle: false }];
  renderTable(); updatePayMethodsCard(); updateStats(); payReset();
});
is(await page.evaluate(() => getCourierCollectNet() < 0), 'الصافي بقى سالب');
await page.click('[data-ptog="cash"]'); await page.fill('[data-pin="cash"]', '50');
const neg = await page.evaluate(() => { const i = document.querySelector('[data-pin="cash"]'); const c = getComputedStyle(i).color.match(/\d+/g).map(Number); return { val: i.value, red: c[0] > 150 && c[1] < 80 && c[2] < 80, hid: document.getElementById('pmCash').value, rem: document.getElementById('pmRem').textContent, rec: document.getElementById('payMethodsCard').classList.contains('pay-neg') }; });
is(neg.val === '-50' && neg.red, 'الرقم بيتكتب بالسالب وبالأحمر (50 ← -50)', JSON.stringify(neg));
is(neg.hid === '50', 'والقيمة المخزّنة للمنطق موجبة (الاتجاه من نوع الأوردر)', neg.hid);
is(/^[−-]\s?200/.test(neg.rem.replace(/\s/g, ' ')) || /−\s?200/.test(neg.rem), 'المتبقي بالسالب كمان', neg.rem);
await page.fill('[data-pin="cash"]', '-70');
is(await page.evaluate(() => document.querySelector('[data-pin="cash"]').value === '-70' && document.getElementById('pmCash').value === '70'), 'كتابة «-» بنفسك ما بتتكررش');
await page.click('[data-prest="cash"]');
const full = await page.evaluate(() => ({ v: document.querySelector('[data-pin="cash"]').value, ok: isPayValid(), label: document.getElementById('payBarLabel').textContent, net: document.getElementById('payBarNet').textContent }));
is(full.v === '-250' && full.ok && /تنفيذ الاسترداد/.test(full.label) && /^[−-]250$/.test(full.net), 'الباقي = -250، والزرار «تنفيذ الاسترداد» وصافيه -250', JSON.stringify(full));

console.log('\n══ ⑨ فك القفل ══');
await page.evaluate(() => { orders = []; extraEntries = []; renderTable(); updateStats(); updatePayBtn(); updatePayMethodsCard(); updateImportBtn(); });
is(await page.evaluate(() => [...document.querySelectorAll('.courier-chip')].every(c => !c.disabled) && !document.querySelector('[data-cact="change"]')), 'لما الجدول يفضى كل المناديب بيتفتحوا');
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));
await page.context().close();

console.log('\n══ ⑩ «تغيير المندوب» بتأكيد بيمسح الأوردرات ══');
({ page, calls, errs } = await open());
await page.click('[data-courier="Kareem"]'); await page.waitForSelector('#importTableBody tr'); await page.click('#importAddBtn');
await page.waitForFunction(() => orders.length === 2 && orders.every(o => o.status === 'ready'));
await page.click('[data-cact="change"]'); await page.click('[data-cact="change-yes"]');
const after = await page.evaluate(() => ({ n: orders.length, enabled: [...document.querySelectorAll('.courier-chip')].every(c => !c.disabled), table: document.getElementById('tableWrap').classList.contains('show'), tiles: document.querySelectorAll('.pay-tile.sel').length }));
is(after.n === 0 && after.enabled && !after.table && after.tiles === 0, 'التأكيد بيمسح الأوردرات ويفك القفل ويصفّر الدفع', JSON.stringify(after));
await page.context().close();

console.log('\n══ ⑪ الموبايل (390px) ══');
({ page, calls, errs } = await open({ width: 390, height: 800 }));
await page.click('[data-courier="Kareem"]'); await page.waitForSelector('#importTableBody tr'); await page.click('#importAddBtn');
await page.waitForFunction(() => orders.length === 2 && orders.every(o => o.status === 'ready'));
await page.click('[data-ptog="cash"]');
const mob = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > window.innerWidth + 1, cols: getComputedStyle(document.getElementById('payTiles')).gridTemplateColumns.split(' ').length }));
is(!mob.overflow && mob.cols === 1, 'مفيش سكرول أفقي والأعمدة بتتكدّس', JSON.stringify(mob));
is(errs.length === 0, 'صفر خطأ كونسول', errs.slice(0, 3).join(' || '));
await page.context().close();

console.log('\n══ ⑫ الإرسال للـ Worker: تفصيل الحسابات في sessionMeta و orderMeta (Worker ≥ 3.10.0) ══');
({ page, calls, errs } = await open());
await page.click('[data-courier="Kareem"]'); await page.waitForSelector('#importTableBody tr'); await page.click('#importAddBtn');
await page.waitForFunction(() => orders.length === 2 && orders.every(o => o.status === 'ready'));
const tgt = await page.evaluate(() => Math.abs(getCourierCollectNet()));
await page.click('[data-ptog="instapay:فادي"]'); await page.fill('[data-pin="instapay:فادي"]', '100');
await page.click('[data-ptog="instapay:مُرسل"]'); await page.fill('[data-pin="instapay:مُرسل"]', '50');
await page.click('[data-ptog="wallet:إسلام"]'); await page.click('[data-prest="wallet:إسلام"]');
is(await page.evaluate(() => isPayValid()), 'المجموع مظبوط (انستاباي فادي 100 + مُرسل 50 + محفظة إسلام بالباقي)');
await page.click('#payBtn'); await page.waitForSelector('#confirmOverlay.open'); await page.click('#confirmOkBtn');
await page.waitForFunction(() => orders.length === 0, null, { timeout: 8000 });
const pays = calls.filter(c => c.action === 'pay').map(c => c.body);
const num = v => Math.round(parseFloat(v) * 100);
is(pays.length === 2, 'نداءين pay', String(pays.length));
const wTot = ((tgt - 150) * 100) / 100;
is(JSON.stringify(pays[0].sessionMeta.paymentAccounts) === JSON.stringify({ instapay: { 'فادي': '100.00', 'مُرسل': '50.00' }, wallet: { 'إسلام': wTot.toFixed(2) } }), 'sessionMeta.paymentAccounts = إجمالي الحسابات كما دخّلها الموظف', JSON.stringify(pays[0].sessionMeta.paymentAccounts));
is(pays.every(b => b.orderMeta.paymentAccounts && num(b.orderMeta.paymentSplit.instapay) === Object.values(b.orderMeta.paymentAccounts.instapay || {}).reduce((a, v) => a + num(v), 0)
   && num(b.orderMeta.paymentSplit.wallet) === Object.values(b.orderMeta.paymentAccounts.wallet || {}).reduce((a, v) => a + num(v), 0)), 'كل أوردر: حصة انستاباي والمحفظة == مجموع حسابات الصف بالمليم');
const sumAcc = (m, k) => pays.reduce((a, b) => a + num((b.orderMeta.paymentAccounts[m] || {})[k] || 0), 0);
is(sumAcc('instapay', 'فادي') === 10000 && sumAcc('instapay', 'مُرسل') === 5000 && sumAcc('wallet', 'إسلام') === Math.round(wTot * 100), 'مجموع حصص الأوردرات لكل حساب == إجمالي الحساب بالمليم', JSON.stringify([sumAcc('instapay', 'فادي'), sumAcc('instapay', 'مُرسل'), sumAcc('wallet', 'إسلام')]));
is(pays.every(b => num(b.sessionMeta.paymentMethods.instapay) === 15000 && num(b.sessionMeta.paymentMethods.wallet) === Math.round(wTot * 100)), 'paymentMethods (المجاميع التلاتة) زي ما هي');
await page.context().close();

console.log('\n══ ⑬ مدخل مباشر على الحاملات (بلا حسابات) = من غير تفصيل ══');
({ page, calls, errs } = await open());
const nd = await page.evaluate(() => { payReset(); document.getElementById('pmInstapay').value = '120'; return payAccountTotals(); });
is(JSON.stringify(nd) === '{}', 'مجموع انستاباي بلا حسابات ← payAccountTotals فاضية (مش بتخمّن)', JSON.stringify(nd));
await page.context().close();

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
