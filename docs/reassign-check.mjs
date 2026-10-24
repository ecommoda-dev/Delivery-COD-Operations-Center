// ══════════════════════════════════════════════════════════════
// docs/reassign-check.mjs — فحص أداة «تحويل الشحنة إلى بوسطة» (v1.54.0)
//
// 🔴 بيشغّل الصفحة الفعلية في متصفح على Worker وهمي بيقلّد رد `get_order`/`reassign_to_bosta`
//    بنفس الشكل اللي الـ Worker الحقيقي بيرجّعه (الـ Worker نفسه متفحّص في ريبوه:
//    `docs/worker-check.mjs`). **الأهلية بتتحسب في الـ Worker** — فهنا بنقيس إن الصفحة:
//    بترسم حكمه بالظبط · الزرار مقفول لما مش مؤهل · مفيش كتابة من غير تأكيد · الطلب بيتبعت بالـ
//    orderId الرقمي · أربع حالات نتيجة + مرفوض · فشل الشبكة «معرفناش» مش «فشل».
// ⚠️ وعلى بيانات وهمية — أول تحويل حقيقي بعد النشر هو الاختبار الفعلي.
// التشغيل:  npm i playwright --no-save && node docs/reassign-check.mjs
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAGE = 'Re-Assign-Package-Zone-BOSTA.html';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const is = (c, m, d = '') => { c ? pass++ : fail++; console.log(c ? '  ✅' : '  ❌', m, c || !d ? '' : `\n       ${d}`); };
const sec = (t) => console.log(`\n══ ${t} ══`);

const launch = { args: ['--no-sandbox'] };
if (process.env.PW_CHROMIUM) launch.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launch);

// ── الأوردرات الوهمية (بنفس شكل رد الـ Worker) ──
const base = { createdAt: '2026-10-20T09:00:00Z', cancelledAt: null, financial: 'PENDING', fulfillment: 'UNFULFILLED', total: 2675, currency: 'EGP',
  customer: 'عميل تجريبي', city: 'Cairo', province: 'Cairo', items: [{ title: 'قميص', variant: 'M', sku: 'SH-1', qty: 2 }],
  s1: null, s2: null, zone: null, courier: null, whereS1: null, whereS2: null, trackS1: null, trackS2: null, marker: null };
const plan = (statusKey, from, to, zFrom, cFrom) => ({ changes: [
  { key: statusKey, alias: statusKey === 'manual_status' ? 's1' : 's2', label: statusKey === 'manual_status' ? 'الحالة (S1)' : 'الحالة (S2)', from, to },
  { key: 'zone', alias: 'zone', label: 'الزون', from: zFrom, to: 'Other_Regions' },
  { key: 'courier', alias: 'courier', label: 'المندوب', from: cFrom, to: 'Bosta' },
  { key: 'package_shipping_re_assign', alias: 'marker', label: 'علامة التحويل', from: null, to: 'Bosta' } ] });
const DB = {
  '55001': { order: { ...base, orderId: '6959895839042', orderNumber: '#55001', s1: 'Ready', zone: 'Cairo+Giza' },
    elig: { eligible: true, already: false, machine: 's1', reasons: [], plan: plan('manual_status', 'Ready', 'Confirmed', 'Cairo+Giza', null) } },
  '55002': { order: { ...base, orderId: '6959895839043', orderNumber: '#55002', s1: 'Delivered', s2: 'Ready', zone: 'Show_Room', courier: 'Showroom' },
    elig: { eligible: true, already: false, machine: 's2', reasons: [], plan: plan('status_2_r_e', 'Ready', 'Confirmed + EXCHANGE', 'Show_Room', 'Showroom') } },
  '55003': { order: { ...base, orderId: '6959895839044', orderNumber: '#55003', s1: 'Confirmed', zone: 'Cairo+Giza' },
    elig: { eligible: false, already: false, machine: null, plan: null, reasons: [{ code: 'not_ready', text: 'حالة الأوردر مش Ready — S1 = «Confirmed» · S2 = —' }] } },
  '55004': { order: { ...base, orderId: '6959895839045', orderNumber: '#55004', s1: 'Ready', zone: 'BLANK' },
    elig: { eligible: false, already: false, machine: 's1', plan: null, reasons: [{ code: 'zone_blank', text: 'الزون لسه ما اتحددش («BLANK») — لازم يكون Show_Room أو Cairo+Giza' }, { code: 'cancelled', text: 'الأوردر ملغي' }] } },
  '55005': { order: { ...base, orderId: '6959895839046', orderNumber: '#55005', s1: 'Confirmed', zone: 'Other_Regions', courier: 'Bosta', marker: 'Bosta' },
    elig: { eligible: false, already: true, machine: 's1', plan: null, reasons: [{ code: 'already', text: 'الأوردر اتحوّل لبوسطة قبل كده — الحالة بعد التحويل والزون Other_Regions والمندوب Bosta' }] } },
};
const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-10-24T08:00:00.000Z' };

async function open({ post = null, getFail = false } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [], calls = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(([s]) => { try { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'HUB'); } catch {} }, [SESSION]);
  const state = { converted: new Set() };
  await page.route('**/*.workers.dev/**', async route => {
    const req = route.request(); const u = new URL(req.url()); const action = u.searchParams.get('action');
    let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    calls.push({ action, q: u.searchParams.get('q'), method: req.method(), body, auth: req.headers()['authorization'] });
    const fulfill = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
    if (action === 'get_config') return fulfill({ ok: true, version: '99.0.0' });
    if (action === 'get_logs') return fulfill({ ok: true, entries: [{ timestamp: '2026-10-24T08:10:00Z', tool: 're_assign_package_zone_bosta', type: 'reassign_to_bosta', employee: 'Ahmed_Ibraheem', order_id: '6959895839042', order_name: '#55001', notes: '#55001: الحالة (S1) Ready ← Confirmed', extra: JSON.stringify({ result: 'success' }) }] });
    if (action === 'get_order') {
      if (getFail) return route.abort('failed');
      const key = (u.searchParams.get('q') || '').replace(/^#/, '');
      const hit = DB[key] || Object.values(DB).find(d => d.order.orderId === key);
      if (!hit) return fulfill({ ok: true, found: false, query: key, queryCost: [] });
      // بعد تحويل ناجح الأوردر بيبقى «اتحوّل قبل كده»
      if (state.converted.has(hit.order.orderId)) return fulfill({ ok: true, found: true, matchedBy: 'name', order: { ...hit.order, s1: 'Confirmed', zone: 'Other_Regions', courier: 'Bosta', marker: 'Bosta' }, eligibility: DB['55005'].elig, queryCost: [] });
      return fulfill({ ok: true, found: true, matchedBy: 'name', order: hit.order, eligibility: hit.elig, queryCost: [] });
    }
    if (action === 'reassign_to_bosta') {
      if (post === 'netfail') return route.abort('failed');
      const out = typeof post === 'function' ? await post(body) : post;
      if (!out || out.status === 'success') state.converted.add(body.orderId);
      return fulfill(out || { ok: true, status: 'success', message: 'الأوردر اتحوّل لبوسطة', changes: [{ label: 'الحالة (S1)', from: 'Ready', to: 'Confirmed' }], logged: true, warnings: [] });
    }
    return fulfill({ ok: true });
  });
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForTimeout(500);
  return { ctx, page, errs, calls };
}
const search = async (page, v) => { await page.fill('#rbInput', v); await page.press('#rbInput', 'Enter'); await page.waitForTimeout(350);
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/search-${v.replace(/\W/g, '')}.png`, fullPage: true }); };   // لقطات للمراجعة بالعين (اختياري)

sec('① الصفحة والشِل');
{
  const { ctx, page, errs, calls } = await open();
  is((await page.title()).includes('تحويل الشحنة إلى بوسطة'), 'عنوان التاب');
  is(await page.evaluate(() => document.activeElement?.id) === 'rbInput', 'حقل البحث متركّز (جاهز للسكانر)');
  is(await page.evaluate(() => !!document.querySelector('.app-header') && document.getElementById('verBtn').textContent.includes(TOOL_VERSION)), 'الهيدر المشترك + نسخة الهب');
  is(calls.some(c => c.action === 'get_logs') && calls.every(c => c.auth === 'Bearer HUB'), 'سر الهب على كل نداء · وجدول آخر العمليات اتحمّل');
  is((await page.textContent('#rbLogBody')).includes('#55001') && (await page.textContent('#rbLogBody')).includes('success'), 'جدول آخر التحويلات بيرسم الصف');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

sec('② مؤهل S1');
{
  const { ctx, page, calls, errs } = await open();
  await search(page, '55001');
  is(calls.some(c => c.action === 'get_order' && c.q === '#55001'), 'رقم قصير → بحث بالاسم (#55001)');
  const txt = await page.textContent('#rbOrder');
  is(txt.includes('#55001') && txt.includes('عميل تجريبي') && txt.includes('2,675') && txt.includes('EGP'), 'بيانات الأوردر: الرقم · العميل · الإجمالي');
  is(await page.locator('#rbOrder a.order-link').getAttribute('href') === 'https://admin.shopify.com/store/' + await page.evaluate(() => SHOP_HANDLE) + '/orders/6959895839042', 'رقم الأوردر هايبرلينك لشوبيفاي بالـ ID الرقمي');
  is(txt.includes('مؤهل للتحويل') && txt.includes('Other_Regions') && txt.includes('Bosta') && txt.includes('Confirmed'), 'حكم «مؤهل» + جدول التغييرات');
  is(await page.locator('#rbPlanRows, .rb-plan tbody tr').count() === 4, 'أربع تغييرات معروضة (الحالة · الزون · المندوب · العلامة)');
  is(await page.isEnabled('#rbGo'), 'الزرار شغّال');
  is(await page.textContent('#rbGo') === '🚚 تحويل الشحنة إلى بوسطة', 'نص الزرار');
  is(!txt.includes('EXCHANGE'), 'مفيش تحذير EXCHANGE على S1');
  is(errs.length === 0, 'صفر خطأ كونسول', errs.join(' | '));
  await ctx.close();
}

sec('③ مؤهل S2');
{
  const { ctx, page } = await open();
  await search(page, '#55002');
  const txt = await page.textContent('#rbOrder');
  is(txt.includes('(S2)') && txt.includes('Confirmed + EXCHANGE') && txt.includes('Showroom'), 'S2: الهدف Confirmed + EXCHANGE والمندوب الحالي Showroom');
  is(txt.includes('دايمًا «Confirmed + EXCHANGE»'), 'تنبيه إن S2 دايمًا EXCHANGE');
  await ctx.close();
}

sec('④ مش مؤهل — السبب والزرار مقفول');
{
  const { ctx, page, calls } = await open();
  await search(page, '55003');
  let txt = await page.textContent('#rbOrder');
  is(txt.includes('غير مؤهل') && txt.includes('S1 = «Confirmed»'), 'سبب «مش Ready» بالقيمة الحرفية');
  is(await page.isDisabled('#rbGo'), 'الزرار Inactive');
  is(txt.includes('الزرار مقفول'), 'سطر بيقول إن الزرار مقفول والسبب فوق');
  await page.click('#rbGo', { force: true, timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(250);
  is(!await page.locator('#confirmOverlay.open').count() && !calls.some(c => c.action === 'reassign_to_bosta'), 'الضغط على الزرار المقفول مابيفتحش تأكيد ومابيبعتش حاجة');
  await search(page, '55004');
  txt = await page.textContent('#rbOrder');
  is(txt.includes('«BLANK»') && txt.includes('الأوردر ملغي') && (txt.match(/<li>/g) || []).length === 0 && await page.locator('.rb-verdict.no li').count() === 2, 'كل الأسباب بتتعرض (مش أول واحد بس)');
  is(await page.isDisabled('#rbGo'), 'مقفول');
  await search(page, '55005');
  txt = await page.textContent('#rbOrder');
  is(await page.locator('.rb-verdict.already').count() === 1 && txt.includes('اتحوّل لبوسطة قبل كده') && await page.locator('.rb-verdict.no').count() === 0, 'already: لون محايد مش أحمر');
  is(await page.isDisabled('#rbGo'), 'مقفول');
  await ctx.close();
}

sec('⑤ البحث: مش موجود · فشل · باركود · كود باظ');
{
  const { ctx, page, calls } = await open();
  await search(page, '99999');
  is((await page.textContent('#rbOrder')).includes('مفيش أوردر بالرقم'), 'مش موجود → رسالة «مفيش أوردر»');
  await search(page, '6959895839042');
  is(calls.some(c => c.action === 'get_order' && c.q === '6959895839042') && (await page.textContent('#rbOrder')).includes('#55001'), 'باركود Order ID الطويل → بحث بالـ ID');
  await search(page, 'abc');
  is((await page.textContent('#rbOrder')).includes('الكود مش صالح'), 'كود مفيهوش أرقام → رسالة');
  await ctx.close();
  const f = await open({ getFail: true });
  await search(f.page, '55001');
  const t = await f.page.textContent('#rbOrder');
  is(t.includes('تعذّر البحث') && !t.includes('مفيش أوردر'), 'فشل الشبكة ≠ «مش موجود»');
  await f.ctx.close();
}

sec('⑥ التحويل — تأكيد ثم كتابة');
{
  const { ctx, page, calls, errs } = await open();
  await search(page, '55001');
  await page.click('#rbGo');
  await page.waitForTimeout(200);
  is(await page.locator('#confirmOverlay.open').count() === 1 && !calls.some(c => c.action === 'reassign_to_bosta'), 'الضغط بيفتح نافذة تأكيد — ولسه صفر كتابة');
  const lines = await page.textContent('#confirmLines');
  is(lines.includes('Cairo+Giza') && lines.includes('Other_Regions') && lines.includes('Bosta') && lines.includes('تراجع'), 'نافذة التأكيد بتعرض التغييرات وتنبيه «مفيش تراجع»');
  await page.click('#confirmOverlay .btn-ghost');
  await page.waitForTimeout(150);
  is(!calls.some(c => c.action === 'reassign_to_bosta') && await page.isEnabled('#rbGo'), 'إلغاء التأكيد = صفر كتابة والزرار لسه شغّال');
  await page.click('#rbGo'); await page.waitForTimeout(150);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  is(!calls.some(c => c.action === 'reassign_to_bosta'), 'Esc بيقفل التأكيد من غير كتابة');
  await page.click('#rbGo'); await page.waitForTimeout(150);
  await page.click('#confirmOkBtn'); await page.waitForTimeout(700);
  const w = calls.filter(c => c.action === 'reassign_to_bosta');
  is(w.length === 1 && w[0].method === 'POST' && w[0].body.orderId === '6959895839042' && w[0].body.employee === 'Ahmed_Ibraheem', 'POST واحد بالـ orderId الرقمي واسم الموظف', JSON.stringify(w));
  is(Object.keys(w[0].body).sort().join() === 'employee,orderId', 'الطلب مفيهوش أي قيم ميتافيلد — الـ Worker هو اللي بيحدد الأهداف');
  const res = await page.textContent('#rbResult');
  is(await page.locator('.rb-result.success').count() === 1 && res.includes('تم التحويل') && res.includes('Confirmed'), 'بانر نجاح أخضر بالتغييرات');
  const after = await page.textContent('#rbOrder');
  is(await page.locator('.rb-verdict.already').count() === 1 && await page.isDisabled('#rbGo') && after.includes('Other_Regions'), 'الأوردر اتعاد قراءته: بقى «اتحوّل قبل كده» والزرار مقفول (مفيش تحويل مرتين)');
  is(await page.evaluate(() => document.activeElement?.id) === 'rbInput' && await page.inputValue('#rbInput') === '', 'الحقل اتفضّى ومتركّز للأوردر اللي بعده');
  is(calls.filter(c => c.action === 'get_logs').length >= 2, 'جدول آخر التحويلات اتحدّث');
  is(errs.length === 0, 'صفر خطأ كونسول', errs.join(' | '));
  await ctx.close();
}

sec('⑦ حالات النتيجة');
{
  const run = async (out, cls, text) => {
    const { ctx, page } = await open({ post: out });
    await search(page, '55001'); await page.click('#rbGo'); await page.waitForTimeout(150); await page.click('#confirmOkBtn'); await page.waitForTimeout(600);
    const ok = await page.locator(`.rb-result.${cls}`).count() === 1 && (await page.textContent('#rbResult')).includes(text);
    await ctx.close(); return ok;
  };
  is(await run({ ok: true, status: 'warning', warnings: ['ما قدرناش نتأكد'], changes: [], order: {} }, 'warning', 'ما قدرناش نتأكد'), 'warning → أصفر ورسالته');
  is(await run({ ok: false, status: 'error', error: 'الأوردر اتغيّر على شوبيفاي', warnings: [] }, 'error', 'الأوردر اتغيّر'), 'error → أحمر برسالة الـ Worker (STALE)');
  is(await run({ ok: true, status: 'rejected', message: 'الأوردر مش مؤهل', reasons: [{ code: 'not_ready', text: 'حالة الأوردر مش Ready' }] }, 'rejected', 'حالة الأوردر مش Ready'), 'rejected (لقطة قديمة) → محايد + الأسباب');
  is(await run({ ok: true, status: 'already', message: 'اتحوّل قبل كده' }, 'already', 'اتحوّل قبل كده'), 'already → محايد');
  is(await run({ ok: true, status: 'success', logged: false, changes: [], warnings: [] }, 'success', 'ما اتسجّلتش في السجل'), 'logged:false → تحذير إن السجل ناقص');
  const { ctx, page } = await open({ post: 'netfail' });
  await search(page, '55001'); await page.click('#rbGo'); await page.waitForTimeout(150); await page.click('#confirmOkBtn'); await page.waitForTimeout(800);
  const t = await page.textContent('#rbResult');
  is(t.includes('ما قدرناش نتأكد') && !t.includes('✗ فشل —') && await page.locator('.rb-result.error').count() === 1, 'فشل الشبكة بعد الإرسال = «ما قدرناش نتأكد» مش «فشل»');
  is(await page.locator('#rbOrder .rb-verdict').count() === 1, 'والأوردر اتعاد قراءته من الـ Worker');
  await ctx.close();
}

sec('⑧ حارس الدفعة');
{
  const { ctx, page } = await open({ post: () => new Promise(() => {}) });   // الرد مش بيرجع
  await search(page, '55001'); await page.click('#rbGo'); await page.waitForTimeout(150); await page.click('#confirmOkBtn'); await page.waitForTimeout(300);
  is(await page.evaluate(() => window.shellIsBusy()) === true, 'shellIsBusy() = true أثناء التحويل (الخروج التلقائي موقوف)');
  await ctx.close();
}

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
