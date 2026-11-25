// ══════════════════════════════════════════════════════════════
// docs/showroom-check.mjs — تاب «الشو روم» في Order-Status-Updater.html (v2.17.0)
// متصفح فعلي + Worker وهمي: التاب · زرارين الحالة · نافذة الأوردرات المؤهلة · «+ إضافة» · المندوب الثابت ·
// حكم الأهلية في الجدول · payload التحديث (flow:'showroom') · تأكيد مسح القايمة عند تبديل التاب.
// التشغيل:  node docs/showroom-check.mjs   (PW_CHROMIUM=… لو لزم · محتاج playwright)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const is = (c, m, d = '') => { c ? pass++ : fail++; console.log(c ? '  ✅' : '  ❌', m, c ? '' : d); };
const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });

const SR = id => ({ orderId: String(id), name: '#' + id, s1: 'Ready', s2: null, courier: 'Showroom', zone: 'Show_Room', isCancelled: false });
const SEARCH = [SR(67094), SR(67083), SR(67075)];
const STATES = { 67094: SR(67094), 67083: SR(67083), 67075: SR(67075),
  70001: { orderId: '70001', name: '#70001', s1: 'Ready', s2: null, courier: 'Sobhy', zone: 'Cairo+Giza', isCancelled: false },
  70002: { orderId: '70002', name: '#70002', s1: 'Shipped', s2: null, courier: 'Showroom', zone: 'Show_Room', isCancelled: false } };
const calls = [];
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } }); const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR|Failed to load resource/.test(m.text())) errs.push('c:' + m.text()); });
await page.addInitScript(() => {
  sessionStorage.setItem('dco_session', JSON.stringify({ v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-11-25T08:00:00.000Z' }));
  localStorage.setItem('delivery_cod_ops_worker_secret', 'test-secret');
});
await page.route('**/*.workers.dev/**', async route => {
  const req = route.request(); const u = new URL(req.url()); const a = u.searchParams.get('action');
  let post = null; try { post = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
  calls.push({ a, post });
  let body = { ok: true, version: '99.0.0', checks: [], entries: [], employees: [], total: 0 };
  if (a === 'search_showroom_orders') body = { ok: true, orders: SEARCH, truncated: false, cap: 1000 };
  if (a === 'order_statuses') body = { ok: true, statuses: Object.fromEntries((post?.orderIds || []).filter(i => STATES[i]).map(i => [i, STATES[i]])) };
  if (a === 'courier_values') body = { ok: true, values: ['Abo Yassin', 'Showroom'] };
  if (a === 'reason_values') body = { ok: true, cancelReasons: ['x'], returnReasons: ['رفض الاستلام'] };
  if (a === 'update_status') body = { ok: true, batchId: 'b1', results: (post.orderIds || []).map(id => ({ orderId: id, status: 'success', warnings: [], logged: true })) };
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
});
await page.goto(BASE + '/Order-Status-Updater.html');
await page.waitForSelector('#tabShow'); await page.waitForTimeout(500);
const settle = ms => page.waitForTimeout(ms || 400);
const ordersNow = () => page.evaluate(() => orders.slice());
const confirmOk = async () => { await page.click('#confirmOkBtn'); await settle(); };

console.log('\n── التاب والبانر وزرارين الحالة ──');
is(await page.$eval('#tabShow', e => e.textContent.includes('الشو روم')), 'تاب «الشو روم» موجود');
is(await page.$eval('#showroomBanner', e => e.hidden), 'البانر مخفي في التاب العادي');
is((await page.$$eval('#statusGrid .status-btn', b => b.length)) === 5, 'التاب العادي: ٥ حالات زي ما هي');
await page.click('#tabShow'); await settle();
is(await page.$eval('#tabShow', e => e.classList.contains('active')) && !(await page.$eval('#tabMain', e => e.classList.contains('active'))), 'تاب الشو روم active');
is(!(await page.$eval('#showroomBanner', e => e.hidden)), 'البانر ظاهر');
const btns = await page.$$eval('#statusGrid .status-btn', b => b.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
is(btns.length === 2 && /Shipped \+ Delivered/.test(btns[0] + btns[1]) && /Shipped \+ Returned/.test(btns[0] + btns[1]), 'زرارين: Shipped + Delivered · Shipped + Returned', btns.join('|'));
is(await page.$eval('#statusGrid .status-btn.c-green', () => true).catch(() => false) && await page.$eval('#statusGrid .status-btn.c-amber', () => true).catch(() => false), 'نفس ألوان Delivered (أخضر) و Returned');

console.log('\n── الضغط على الحالة يفتح قايمة الشو روم + «+ إضافة» ──');
await page.click('#statusGrid .status-btn.c-green'); await settle(600);
is(calls.some(c => c.a === 'search_showroom_orders'), 'اتنده search_showroom_orders');
is(!calls.some(c => c.a === 'search_courier_orders'), 'مفيش بحث مندوب عادي');
is(await page.$eval('#csmOverlay', e => e.classList.contains('open')), 'نافذة الأوردرات اتفتحت تلقائيًا');
is((await page.$$eval('#csmBody tr', r => r.length)) === 3, '٣ أوردرات مؤهلة في القايمة');
is((await page.$$eval('#csmBody .csm-add', r => r.length)) === 3, 'زرار «+ إضافة» جنب كل أوردر');
await page.click('#csmBody tr:nth-child(1) .csm-add'); await settle(500);
is(JSON.stringify(await ordersNow()) === JSON.stringify(['67094']), '«+ إضافة» ضاف الأوردر الأول', JSON.stringify(await ordersNow()));
is(await page.$eval('#csmOverlay', e => e.classList.contains('open')), 'النافذة فضلت مفتوحة بعد «+ إضافة»');
is((await page.$eval('#csmAct-67094', e => e.textContent)).includes('مضاف'), 'الصف اتعلّم «✓ مضاف»');
is(await page.$eval('#csmBody tr:nth-child(1) .csm-cb', e => e.disabled), 'الـ checkbox بتاعه اتقفل');
await page.check('#csmBody tr:nth-child(2) .csm-cb'); await page.check('#csmBody tr:nth-child(3) .csm-cb');
await page.click('#csmOverlay .btn-modal-save'); await settle(700);
is(JSON.stringify(await ordersNow()) === JSON.stringify(['67094', '67083', '67075']), '«إضافة المحدد» لسه شغّال', JSON.stringify(await ordersNow()));
is(!(await page.$eval('#csmOverlay', e => e.classList.contains('open'))), '«إضافة المحدد» بيقفل النافذة');

console.log('\n── المندوب ثابت + حكم الأهلية + التحديث ──');
is(await page.$eval('#wizStep3', e => getComputedStyle(e).display) === 'none', 'خطوة المندوب مخفية');
is(await page.evaluate(() => currentCourier === 'Showroom' && courierConfirmed), 'المندوب ثابت Showroom ومؤكَّد');
is(await page.$eval('#altSearchToggle', e => getComputedStyle(e).display) === 'none', 'زرار «أوردرات مندوب» مخفي');
is(await page.$eval('#showSearchWrap', e => getComputedStyle(e).display) !== 'none', 'زرار «أوردرات الشو روم» ظاهر لإعادة الفتح');
is(await page.evaluate(() => orders.every(id => !orderIsBlocked(id))), 'الأوردرات المؤهلة مش محظورة');
is(!(await page.$eval('#updateBtn', e => e.disabled)), 'زرار التحديث شغّال (Delivered مفيش سبب)');
// أوردر غير مؤهل: منطقة تانية + حالة Shipped
await page.evaluate(() => { addOrders(['70001', '70002']); }); await settle(700);
const flags = await page.evaluate(() => ({ a: orderIsBlocked('70001'), b: orderIsBlocked('70002'), fa: orderFlags('70001').map(f => f.t + ' ' + f.d), fb: orderFlags('70002').map(f => f.d) }));
is(flags.a && flags.b, 'أوردر منطقته Cairo+Giza أو حالته Shipped = محظور', JSON.stringify(flags));
is(/المنطقة/.test(flags.fa.join()) && /Ready/.test(flags.fb.join()), 'السبب مكتوب في المراجعة', JSON.stringify(flags));
is(await page.$eval('#updateBtn', e => e.disabled), 'التحديث مقفول طول ما فيه أوردر غير مؤهل');
await page.evaluate(() => removeOrder('70001')); await page.evaluate(() => removeOrder('70002')); await settle();
is(!(await page.$eval('#updateBtn', e => e.disabled)), 'بعد حذفهم التحديث بيفتح');
await page.click('#updateBtn'); await settle(500);
is(await page.$eval('#confirmMsg', e => e.textContent.includes('مسار الشو روم')), 'نافذة التأكيد بتذكر مسار الشو روم');
await confirmOk(); await settle(900);
const upd = calls.filter(c => c.a === 'update_status').pop();
is(upd && upd.post.flow === 'showroom' && upd.post.targetLabel === 'Delivered' && upd.post.courier === 'Showroom' && upd.post.orderIds.length === 3, 'payload التحديث: flow=showroom · Delivered · Showroom · ٣ أوردرات', JSON.stringify(upd?.post));
is(await page.$eval('#summaryOverlay', e => e.classList.contains('open')), 'نافذة الملخص ظهرت');
await page.click('#summaryOverlay .btn-sum.primary'); await settle(500);
is(await page.evaluate(() => flowMode === 'showroom' && orders.length === 0 && currentTargetLabel === ''), 'بعد «أوردرات جديدة» بنفضل في تاب الشو روم والقايمة فاضية');
is(await page.$eval('#tabShow', e => e.classList.contains('active')), 'التاب لسه الشو روم');

console.log('\n── Returned: السبب إلزامي ──');
await page.click('#statusGrid .status-btn.c-amber'); await settle(700);
await page.click('#csmBody tr:nth-child(1) .csm-add'); await settle(600);
await page.click('#csmOverlay .btn-modal-cancel'); await settle();
is(await page.$eval('#updateBtn', e => e.disabled), 'Returned: التحديث مقفول لحد ما السبب يتختار');
is(await page.evaluate(() => orderReasonMissing(orders[0])), 'سبب الإرجاع ناقص');
is(await page.$eval('.s1-chip', e => e.textContent.includes('Shipped + Returned')), 'شريط الحالة بيقول Shipped + Returned');

console.log('\n── تبديل التاب والقايمة مليانة ──');
await page.click('#tabMain'); await settle();
is(await page.$eval('#confirmOverlay', e => e.classList.contains('open')) && (await page.$eval('#confirmMsg', e => e.textContent)).includes('هتتمسح'), 'ظهر تأكيد «القايمة هتتمسح»');
await page.click('#confirmCancelBtn'); await settle();
is(await page.evaluate(() => flowMode === 'showroom' && orders.length === 1), 'الإلغاء: القايمة والتاب زي ما هم');
await page.click('#tabMain'); await settle(); await confirmOk();
is(await page.evaluate(() => flowMode === 'normal' && orders.length === 0 && currentTargetLabel === ''), 'التأكيد: القايمة اتمسحت والمسار رجع عادي');
is(await page.$eval('#showroomBanner', e => e.hidden) && (await page.$$eval('#statusGrid .status-btn', b => b.length)) === 5, 'البانر اختفى وخمس حالات رجعوا');
await page.click('#tabShow'); await settle();
is(await page.evaluate(() => flowMode === 'showroom'), 'قايمة فاضية: التبديل من غير تأكيد');
is(!(await page.$eval('#confirmOverlay', e => e.classList.contains('open'))), 'مفيش نافذة تأكيد على قايمة فاضية');

is(errs.length === 0, 'صفر أخطاء كونسول', errs.join(' | '));
await browser.close(); server.close();
console.log(fail ? `\n❌ ${fail} فشل · ${pass} عدّى` : `\n✅ ${pass} بند عدّى`);
process.exit(fail ? 1 : 0);
