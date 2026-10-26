// ══════════════════════════════════════════════════════════════
// docs/reassign-check.mjs — فحص أداة «تحويل الشحنة إلى بوسطة» (v1.57.0 — سكان متعدد + تاب سجل)
//
// 🔴 بيشغّل الصفحة الفعلية في متصفح على Worker وهمي بيقلّد رد `get_order`/`reassign_to_bosta`/`get_logs*`
//    بنفس الشكل اللي الـ Worker الحقيقي بيرجّعه (الـ Worker نفسه متفحّص في ريبوه:
//    `docs/worker-check.mjs`). **الأهلية بتتحسب في الـ Worker** — فهنا بنقيس إن الصفحة:
//    بترسم حكمه بالظبط · الإضافة بـ Enter بس · الصندوق الأحمر برّه الجدول · الفلاتر في رأس العمود وبتفضل
//    مفتوحة بعد الاختيار · مفيش كتابة من غير تأكيد بالأرقام · لقطة + قفل أثناء الدفعة · الحالات الأربع + مرفوض ·
//    فشل الشبكة «معرفناش» مش «فشل» · السجل server-side (الفلاتر والترتيب والعدّ) · التصدير المقصوص.
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
const DBX = {
  '55001': { order: { ...base, orderId: '6959895839042', orderNumber: '#55001', s1: 'Ready', zone: 'Cairo+Giza', courier: 'Hossam' },
    elig: { eligible: true, already: false, machine: 's1', reasons: [], plan: plan('manual_status', 'Ready', 'Confirmed', 'Cairo+Giza', 'Hossam') } },
  '55002': { order: { ...base, orderId: '6959895839043', orderNumber: '#55002', customer: 'سارة', s1: 'Delivered', s2: 'Ready', zone: 'Show_Room', courier: 'Showroom' },
    elig: { eligible: true, already: false, machine: 's2', reasons: [], plan: plan('status_2_r_e', 'Ready', 'Confirmed + EXCHANGE', 'Show_Room', 'Showroom') } },
  '55003': { order: { ...base, orderId: '6959895839044', orderNumber: '#55003', s1: 'Confirmed', zone: 'Cairo+Giza' },
    elig: { eligible: false, already: false, machine: null, plan: null, reasons: [{ code: 'not_ready', text: 'حالة الأوردر مش Ready — S1 = «Confirmed» · S2 = —' }] } },
  '55004': { order: { ...base, orderId: '6959895839045', orderNumber: '#55004', s1: 'Ready', zone: 'BLANK' },
    elig: { eligible: false, already: false, machine: 's1', plan: null, reasons: [{ code: 'zone_blank', text: 'الزون لسه ما اتحددش («BLANK») — لازم يكون Show_Room أو Cairo+Giza' }, { code: 'cancelled', text: 'الأوردر ملغي' }] } },
  '55005': { order: { ...base, orderId: '6959895839046', orderNumber: '#55005', s1: 'Confirmed', zone: 'Other_Regions', courier: 'Bosta', marker: 'Bosta' },
    elig: { eligible: false, already: true, machine: 's1', plan: null, reasons: [{ code: 'already', text: 'الأوردر اتحوّل لبوسطة قبل كده — الحالة بعد التحويل والزون Other_Regions والمندوب Bosta' }] } },
  '55006': { order: { ...base, orderId: '6959895839047', orderNumber: '#55006', s1: 'Ready', zone: 'Show_Room', courier: 'Showroom' },
    elig: { eligible: true, already: false, machine: 's1', reasons: [], plan: plan('manual_status', 'Ready', 'Confirmed', 'Show_Room', 'Showroom') } },
};
const SESSION = { v: 1, username: 'Ahmed_Ibraheem', displayName: 'Ahmed Ibraheem', loginAt: '2026-10-24T08:00:00.000Z' };
const LOG_ENTRIES = [
  { timestamp: '2026-10-24T08:10:00Z', tool: 're_assign_package_zone_bosta', type: 'reassign_to_bosta', employee: 'Ahmed_Ibraheem', order_id: '6959895839042', order_name: '#55001', notes: '#55001: الحالة (S1) Ready ← Confirmed', extra: JSON.stringify({ result: 'success', machine: 's1' }) },
  { timestamp: '2026-10-24T08:11:00Z', tool: 're_assign_package_zone_bosta', type: 'reassign_to_bosta', employee: 'Sara', order_id: '6959895839043', order_name: '#55002', notes: '#55002: الحالة (S2)', extra: JSON.stringify({ result: 'error', machine: 's2', error: 'الأوردر اتغيّر على شوبيفاي' }) },
  { timestamp: '2026-10-24T08:12:00Z', tool: 're_assign_package_zone_bosta', type: 'rejected', employee: 'Sara', order_id: '6959895839044', order_name: '#55003', notes: 'حالة الأوردر مش Ready', extra: JSON.stringify({ result: 'rejected', stage: 'preflight' }) },
];

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [], calls = [];
  const ctl = { getFail: false, post: null, logTotal: 3, exportBody: null, getDelay: 0, ...opts };
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(([s]) => { try { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'HUB'); } catch {} }, [SESSION]);
  // الشبكة الخارجية (الخط · ExcelJS) مش متاحة في بيئة الفحص — بنقدّم بدائل محلية عشان صفر خطأ كونسول يفضل بند حقيقي
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.ExcelJS={Workbook:class{addWorksheet(){const rows=[];return{views:[],columns:[],addRow:x=>rows.push(x),rows}}get xlsx(){return{writeBuffer:async()=>new Uint8Array([1,2,3])}}}};' }));
  const state = { converted: new Set() };
  await page.route('**/*.workers.dev/**', async route => {
    const req = route.request(); const u = new URL(req.url()); const action = u.searchParams.get('action');
    let body = null; try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch {}
    const params = Object.fromEntries(u.searchParams.entries());
    calls.push({ action, q: params.q, params, method: req.method(), body, auth: req.headers()['authorization'], t: Date.now() });
    const fulfill = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
    if (action === 'get_config') return fulfill({ ok: true, version: '99.0.0' });
    if (action === 'get_log_options') return fulfill({ ok: true, employees: [{ value: 'Ahmed_Ibraheem', count: 2 }, { value: 'Sara', count: 3 }] });
    if (action === 'get_logs') return fulfill({ ok: true, entries: LOG_ENTRIES });
    if (action === 'get_logs_count') return fulfill({ ok: true, total: ctl.logTotal });
    if (action === 'get_logs_export') return fulfill(ctl.exportBody || { ok: true, entries: LOG_ENTRIES, total: 3, cap: 2000, truncated: false });
    if (action === 'get_order') {
      if (ctl.getFail) return route.abort('failed');
      if (ctl.getDelay) await new Promise(r => setTimeout(r, ctl.getDelay));
      const key = (params.q || '').replace(/^#/, '');
      const hit = DBX[key] || Object.values(DBX).find(d => d.order.orderId === key);
      if (!hit) return fulfill({ ok: true, found: false, query: key, queryCost: [] });
      if (state.converted.has(hit.order.orderId)) return fulfill({ ok: true, found: true, matchedBy: 'name', order: { ...hit.order, s1: 'Confirmed', zone: 'Other_Regions', courier: 'Bosta', marker: 'Bosta' }, eligibility: DBX['55005'].elig, queryCost: [] });
      return fulfill({ ok: true, found: true, matchedBy: 'name', order: hit.order, eligibility: hit.elig, queryCost: [] });
    }
    if (action === 'reassign_to_bosta') {
      const out = typeof ctl.post === 'function' ? await ctl.post(body, state) : ctl.post;
      if (out === 'netfail') return route.abort('failed');
      if (!out || out.status === 'success') state.converted.add(body.orderId);
      const hit = Object.values(DBX).find(d => d.order.orderId === body.orderId);
      return fulfill(out || { ok: true, status: 'success', message: 'الأوردر اتحوّل لبوسطة', logged: true, warnings: [],
        changes: hit.elig.plan.changes.map(c => ({ label: c.label, from: c.from, to: c.to })),
        order: { ...hit.order, [hit.elig.machine === 's1' ? 's1' : 's2']: hit.elig.machine === 's1' ? 'Confirmed' : 'Confirmed + EXCHANGE', zone: 'Other_Regions', courier: 'Bosta', marker: 'Bosta' } });
    }
    return fulfill({ ok: true });
  });
  await page.goto(`${BASE}/${PAGE}`);
  await page.waitForTimeout(400);
  return { ctx, page, errs, calls, ctl, state };
}
const enter = async (page, v, wait = 450) => { await page.fill('#rbInput', v); await page.press('#rbInput', 'Enter'); await page.waitForTimeout(wait); };
const paste = async (page, text, wait = 600) => {
  await page.evaluate(t => { const i = document.getElementById('rbInput'); i.focus(); const dt = new DataTransfer(); dt.setData('text', t); i.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, text);
  await page.waitForTimeout(wait);
};
const rowsOf = (page) => page.$$eval('#tb-scan tr[data-rid]', trs => trs.map(tr => ({ cells: [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim()), cb: tr.querySelector('.rb-cb')?.checked, cbDis: tr.querySelector('.rb-cb')?.disabled })));
const rowFor = async (page, no) => (await rowsOf(page)).find(r => r.cells[1].startsWith(`#${no}`) || r.cells[1].includes(no));
const shot = async (page, name) => { if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png`, fullPage: true }); };   // لقطات للمراجعة بالعين (اختياري)
const colIdx = { sel: 0, order: 1, time: 2, customer: 3, zone: 4, courier: 5, s1: 6, s2: 7, verdict: 8, reason: 9 };
const goConfirm = async (page) => { await page.click('#rbGo'); await page.waitForTimeout(200); };

// ══════════════════════════════════════════════════════════════
sec('① الصفحة والشِل');
{
  const { ctx, page, errs, calls } = await open();
  is((await page.title()).includes('تحويل الشحنة إلى بوسطة'), 'عنوان التاب');
  is(await page.evaluate(() => document.activeElement?.id) === 'rbInput', 'حقل الإدخال متركّز (جاهز للسكانر)');
  is(await page.evaluate(() => !!document.querySelector('.app-header') && document.getElementById('verBtn').textContent.includes(TOOL_VERSION)), 'الهيدر المشترك + نسخة الهب');
  is(await page.$$eval('.main-tab-btn', b => b.map(x => x.textContent.trim()).join('|')) === '🚚 التحويل|📜 سجل العمليات', 'تابين بالأسماء المعتمدة: التحويل + سجل العمليات');
  is(await page.evaluate(() => document.getElementById('tabMain').classList.contains('active') && document.getElementById('panelMain').classList.contains('active') && !document.getElementById('panelLog').classList.contains('active')), 'تاب التحويل هو النشط');
  is(await page.evaluate(() => !document.getElementById('rbInput').hasAttribute('placeholder') && !!document.getElementById('rbInput').getAttribute('aria-labelledby')), 'مفيش placeholder على المربع (والوصف في label برّه)');
  is(await page.evaluate(() => !!document.getElementById('stickyWrap').querySelector('.app-header') && !!document.getElementById('stickyWrap').querySelector('.main-tabs-bar') && !!document.getElementById('activeTabChip')), 'الهيدر + شريط التابات جوّه .sticky-header-wrap + chip التاب');
  is(await page.evaluate(() => getComputedStyle(document.getElementById('activeTabChip')).display === 'none'), 'chip التاب مخفي وقت ما الهيدر مش مقفول');
  is(calls.every(c => c.auth === 'Bearer HUB') && !calls.some(c => c.action === 'get_logs'), 'سر الهب على كل نداء · والسجل ما اتحمّلش قبل فتح التاب (lazy)');
  is(await page.evaluate(() => getComputedStyle(document.querySelector('.container')).maxWidth) === '1400px', 'Tier L (1400px) — جدول بعشر أعمدة');
  is(await page.$$eval('#aboutOverlay details.about-sec', d => d.length) === 2 && await page.$$eval('#aboutOverlay details.about-sec[open]', d => d.length) === 1, 'About على قسمين والأول مفتوح');
  is(await page.evaluate(() => /إجراءات كل خيار/.test(document.getElementById('aboutOverlay').textContent)), 'جدول «إجراءات كل خيار» موجود (الأداة بتكتب أكتر من إجراء)');
  is(await page.evaluate(() => [...document.querySelectorAll('.modal-close-x')].length >= 4), 'أزرار ✕ بكلاس .modal-close-x');
  is(errs.length === 0, 'صفر خطأ في الكونسول', errs.join(' | '));
  await ctx.close();
}

sec('② سكان أوردر مؤهل');
{
  const { ctx, page, calls, errs } = await open();
  await enter(page, '55001');
  is(calls.some(c => c.action === 'get_order' && c.q === '#55001'), 'رقم قصير → بحث بالاسم (#55001)');
  const rs = await rowsOf(page), r = rs[0];
  is(rs.length === 1 && r.cells[colIdx.order].startsWith('#55001') && r.cells[colIdx.customer] === 'عميل تجريبي', 'صف الأوردر: الرقم · العميل');
  is(r.cells[colIdx.zone] === 'Cairo+Giza' && r.cells[colIdx.courier] === 'Hossam' && r.cells[colIdx.s1] === 'Ready' && r.cells[colIdx.s2] === '—', 'الزون · المندوب · S1 · S2 (الفاضي —)');
  is(r.cells[colIdx.verdict].includes('مؤهل') && r.cells[colIdx.verdict].includes('S1'), 'الحكم: مؤهل · S1');
  is(r.cells[colIdx.reason].includes('Ready → Confirmed') && r.cells[colIdx.reason].includes('Cairo+Giza → Other_Regions') && r.cells[colIdx.reason].includes('Hossam → Bosta'), 'عمود السبب بيعرض اللي هيتكتب');
  is(r.cb === true && r.cbDis === false, 'المؤهل بيتحدد لوحده');
  is(await page.locator('#tb-scan a.order-link').getAttribute('href') === 'https://admin.shopify.com/store/' + await page.evaluate(() => SHOP_HANDLE) + '/orders/6959895839042', 'رقم الأوردر هايبرلينك بالـ ID الرقمي');
  is(await page.inputValue('#rbInput') === '' && await page.evaluate(() => document.activeElement?.id) === 'rbInput', 'المربع اتفضّى والفوكس رجع (جاهز للسكانة اللي بعدها)');
  is((await page.textContent('#rbCounters')).replace(/\s+/g, ' ').includes('إجمالي 1') && (await page.textContent('#rbCounters')).replace(/\s+/g, ' ').includes('مؤهل 1'), 'العدّادات: إجمالي 1 · مؤهل 1');
  is(await page.textContent('#cnt-scan') === '1', '«النتائج: 1»');
  is(await page.textContent('#rbGo') === '🚚 تحويل 1 أوردر لبوسطة' && await page.isEnabled('#rbGo'), 'زرار التحويل بالعدد');
  await enter(page, '6959895839042');
  is((await rowsOf(page)).length === 1 && calls.some(c => c.action === 'get_order' && c.q === '6959895839042'), 'نفس الأوردر بالـ Order ID (الباركود) → مايتكررش (التفريد على orderId)');
  is(await page.evaluate(() => [...document.querySelectorAll('.toast')].some(t => t.className.includes('toast-dup'))), 'توست أصفر «موجود» للتكرار');
  is(errs.length === 0, 'صفر خطأ كونسول', errs.join(' | '));
  await ctx.close();
}

sec('③ سكان متعدد — لصق قايمة + كل الحالات في جدول واحد');
{
  const { ctx, page, calls } = await open();
  await paste(page, '55001\n55002, 55003 ٥٥٠٠٤;55005');
  const rs = await rowsOf(page);
  is(rs.length === 5, 'اللصق بسطور/مسافات/فاصلة/أرقام عربي = ٥ أوردرات', String(rs.length));
  is(calls.filter(c => c.action === 'get_order').length === 5, 'نداء get_order لكل أوردر');
  const v = async (no) => (await rowFor(page, no)).cells[colIdx.verdict];
  is((await v('55001')).includes('مؤهل') && (await v('55002')).includes('S2'), 'S1 و S2 مؤهلين بماكينتهم');
  is((await v('55003')).includes('غير مؤهل') && (await rowFor(page, '55003')).cells[colIdx.reason].includes('S1 = «Confirmed»'), 'غير مؤهل + السبب بقيمته الحرفية');
  const r4 = await rowFor(page, '55004');
  is(r4.cells[colIdx.reason].includes('«BLANK»') && r4.cells[colIdx.reason].includes('الأوردر ملغي'), 'كل الأسباب بتتعرض (مش أول واحد بس)');
  is((await v('55005')).includes('اتحوّل قبل كده') && await page.locator('#tb-scan tr', { hasText: '#55005' }).locator('.status-badge.neutral').count() === 1, 'اتحوّل قبل كده → بادج محايد مش أحمر');
  is((await rowFor(page, '55002')).cells[colIdx.reason].includes('Confirmed + EXCHANGE'), 'S2: الهدف Confirmed + EXCHANGE ظاهر');
  is((await rowFor(page, '55003')).cb === false && (await rowFor(page, '55003')).cbDis === true && (await rowFor(page, '55005')).cbDis === true, 'غير المؤهل: الـ checkbox مقفول');
  await shot(page, '1-scan-mixed');
  const rr = (await page.textContent('#rbCounters')).replace(/\s+/g, ' ');
  is(rr.includes('إجمالي 5') && rr.includes('مؤهل 2') && rr.includes('غير مؤهل 2') && rr.includes('اتحوّل قبل كده 1'), 'العدّادات: ٥ / ٢ مؤهل / ٢ غير مؤهل / ١ اتحوّل قبل كده', rr);
  is(await page.textContent('#rbGo') === '🚚 تحويل 2 أوردر لبوسطة', 'الزرار بيعدّ المؤهل بس');
  is(await page.locator('#tb-scan tr[data-rid]').first().innerText().then(t => t.includes('#55005')), 'الأحدث فوق (آخر اتضاف في أول الجدول)');
  await ctx.close();
}

sec('④ الإضافة بـ Enter بس — مفيش مؤقّت');
{
  const { ctx, page, calls } = await open();
  await page.fill('#rbInput', '55001');
  await page.waitForTimeout(900);
  is((await rowsOf(page)).length === 0 && !calls.some(c => c.action === 'get_order'), 'رقم مكتوب من غير Enter ≥ ٩٠٠ms = مفيش إضافة ولا نداء');
  await page.fill('#rbInput', '');
  await page.type('#rbInput', '٥٥٠٠١');
  is(await page.inputValue('#rbInput') === '55001', 'الأرقام العربي بتتحوّل لإنجليزي لحظيًا جوّه المربع');
  await page.click('#rbAdd'); await page.waitForTimeout(400);
  is((await rowsOf(page)).length === 1, 'زرار «إضافة» بيضيف');
  await page.fill('#rbInput', '6959895839099');
  await page.waitForTimeout(1900);
  const t = await page.$$eval('.toast', ts => ts.map(x => x.textContent).join('|'));
  is(t.includes('ولسه ماتضافش') && t.includes('13 خانة') && (await rowsOf(page)).length === 1, 'الرقم وصل ومفيش Enter → توست أحمر بعد ١٫٥ث وعمره ما بيضيف');
  await ctx.close();
}

sec('⑤ الصندوق الأحمر — أكواد مش أوردرات');
{
  const { ctx, page } = await open();
  await enter(page, '55001');
  await enter(page, '12345678901', 200);
  is((await rowsOf(page)).length === 1, '١١ رقم مرفوض: صفر صف في الجدول');
  const box = await page.textContent('#rbFails');
  is(!(await page.locator('#rbFails').isHidden()) && box.includes('12345678901') && box.includes('11 خانة') && box.includes('اتقرا ناقص'), 'الصندوق الأحمر: الرقم — السبب القصير (إيه اللي حصل غالبًا)');
  is(await page.isDisabled('#rbGo') && (await page.textContent('#rbWhy')).includes('الصندوق الأحمر'), 'التنفيذ مقفول والسبب مكتوب جنب الزرار');
  await enter(page, '55001234567890123456', 200);
  is((await page.textContent('#rbFails')).includes('باركودين ملزوقين'), '> ١٥ خانة → «باركودين ملزوقين»');
  await enter(page, '5500a', 200);
  is((await page.textContent('#rbFails')).includes('مش رقم أوردر') && (await page.$$('#rbFails .bc-fail')).length === 3, 'حروف → «مش رقم أوردر» وكل سطر بحاله (٣ أسطر)');
  is((await page.textContent('#rbFails')).includes('٣ حاجة') || (await page.textContent('#rbFails')).includes('3 حاجة'), 'عنوان «N حاجة ما اتضافتش» + شيل الكل');
  await page.click('#rbFails [data-fail]');
  is((await page.$$('#rbFails .bc-fail')).length === 2, '✕ بتشيل سطر');
  await page.click('#rbFails [data-failclear]');
  is(await page.locator('#rbFails').isHidden() && await page.isEnabled('#rbGo'), 'شيل الكل → الصندوق يختفي والزرار يتفتح');
  await ctx.close();
}

sec('⑥ مش موجود · فشل الفحص · إعادة الفحص');
{
  const { ctx, page, calls, ctl } = await open();
  await enter(page, '99999');
  const r = await rowFor(page, '99999');
  is(r.cells[colIdx.verdict].includes('مش موجود') && r.cells[colIdx.reason].includes('مفيش أوردر بالرقم ده'), 'مش موجود → صف بسبب (مش بيختفي)');
  ctl.getFail = true;
  await enter(page, '55001', 600);
  const f = await rowFor(page, '55001');
  is(f.cells[colIdx.verdict].includes('تعذّر الفحص') && !f.cells[colIdx.verdict].includes('مش موجود'), 'فشل الشبكة ≠ «مش موجود»');
  is(await page.locator('[data-retry]').count() === 1, 'زرار «إعادة الفحص»');
  ctl.getFail = false;
  await page.click('[data-retry]'); await page.waitForTimeout(500);
  const f2 = await rowFor(page, '55001');
  is(f2.cells[colIdx.verdict].includes('مؤهل') && f2.cb === true, 'إعادة الفحص بتجيب الحكم الصح وتحدد المؤهل');
  const rr = (await page.textContent('#rbCounters')).replace(/\s+/g, ' ');
  is(rr.includes('مش موجود / تعذّر 1'), 'عدّاد «مش موجود / تعذّر»');
  await ctx.close();
}

sec('⑦ الجدول: فلاتر رأس العمود · ترتيب · chips · تولتيب · عرض الأعمدة');
{
  const { ctx, page, errs } = await open();
  await paste(page, '55001\n55002\n55003\n55004\n55005\n55006', 800);
  is(await page.$$eval('#th-scan th', t => t.length) === 10 && await page.$$eval('#th-scan .th-flt', b => b.length) === 8, 'عشر أعمدة · ثماني فلاتر (قمع جنب الاسم)');
  is(await page.evaluate(() => ![...document.querySelectorAll('#panelMain .flt-body, #panelMain .flt-hdr')].length), 'مفيش قسم فلاتر فوق الجدول');
  is(await page.evaluate(() => getComputedStyle(document.querySelector('#th-scan th')).position) === 'sticky' && await page.evaluate(() => getComputedStyle(document.querySelector('#tbl-scan').parentElement).overflowY) === 'auto', 'العناوين sticky جوّه سكرول داخلي');
  is(await page.locator('[data-clearall="scan"]').evaluate(b => b.classList.contains('inactive')) && await page.$$eval('#th-scan th.flt-on', t => t.length) === 0, 'تحميل: «مسح كل الفلاتر» باهت ومفيش عمود ملوّن');
  // قايمة «الحكم»
  await page.click('#th-scan th[data-col="verdict"] .th-flt'); await page.waitForTimeout(100);
  const items = await page.$$eval('.pop .ms-item', i => i.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  is(items.length === 3 && items.some(x => x.startsWith('مؤهل') && x.endsWith('3')) && items.some(x => x.startsWith('غير مؤهل') && x.endsWith('2')), 'قايمة الحكم بعدّاد كل قيمة', items.join(' | '));
  is(await page.evaluate(() => getComputedStyle(document.querySelector('.pop')).position) === 'fixed' && await page.evaluate(() => document.querySelector('.pop').parentElement === document.body), 'القايمة position:fixed على body');
  is(await page.$$eval('.pop .clear-btn', b => b.length) === 1, '«مسح الاختيار» = .clear-btn');
  await page.click('.pop .ms-item:has-text("غير مؤهل")'); await page.waitForTimeout(100);
  is(await page.locator('.pop').count() === 1, 'القايمة بتفضل مفتوحة بعد أول اختيار (حارس document.contains)');
  await page.click('.pop .ms-item:has-text("اتحوّل قبل كده")'); await page.waitForTimeout(100);
  await shot(page, '2-filter-popup');
  is(await page.locator('.pop').count() === 1 && (await rowsOf(page)).length === 3, 'واختيار تاني: لسه مفتوحة · ٣ صفوف (٢ غير مؤهل + ١ اتحوّل)');
  is(await page.textContent('#cnt-scan') === '3', '«النتائج» = المعروض بعد الفلتر');
  is(await page.$$eval('th.flt-on', t => t.length) === 1 && await page.textContent('#th-scan th[data-col="verdict"] .th-cnt') === '2', 'العمود ملوّن بعدّاد ٢');
  is(await page.evaluate(() => !document.querySelector('[data-clearall="scan"]').classList.contains('inactive')), '«مسح كل الفلاتر» اتفعّل');
  const chips = await page.textContent('#chips-scan');
  is(chips.includes('الحكم:') && chips.includes('غير مؤهل') && (chips.match(/الحكم/g) || []).length === 1, 'chips: اسم الفلتر مرة واحدة في أول السطر');
  await page.mouse.click(5, 300);
  is(await page.locator('.pop').count() === 0, 'الضغط برّه بيقفل القايمة');
  await page.hover('#th-scan th[data-col="verdict"] .th-flt'); await page.waitForTimeout(150);
  is((await page.locator('.tip').count()) === 1 && (await page.textContent('.tip')).includes('غير مؤهل'), 'تولتيب بقيم الفلتر المفعّل');
  await page.hover('#th-scan th[data-col="zone"] .th-flt'); await page.waitForTimeout(150);
  is(await page.locator('.tip').count() === 0, 'مفيش تولتيب على فلتر مش مفعّل');
  await page.click('.ms-chip button');
  is((await rowsOf(page)).length === 1 && await page.$$eval('.ms-chip', c => c.length) === 1, '✕ على chip بتشيل قيمة واحدة (الباقي لسه مفلتر)');
  await page.click('[data-clearall="scan"]');
  is((await rowsOf(page)).length === 6 && await page.$$eval('th.flt-on', t => t.length) === 0 && await page.locator('[data-clearall="scan"]').evaluate(b => b.classList.contains('inactive')), 'مسح كل الفلاتر → رجوع للحالة الأولى بالظبط');
  // بحث نصي في السبب
  await page.click('#th-scan th[data-col="reason"] .th-flt'); await page.fill('.pop input[data-q]', 'BLANK'); await page.waitForTimeout(150);
  is((await rowsOf(page)).length === 1 && await page.locator('.pop input.has-value').count() === 1, 'فلتر بحث نصي بيلاقي «BLANK» في السبب (والمربع بيتلوّن)');
  await page.press('.pop input[data-q]', 'Enter');
  is(await page.locator('.pop').count() === 0 && (await rowsOf(page)).length === 1, 'Enter جوّه القايمة بيقفلها والفلتر يفضل');
  await page.click('[data-clearall="scan"]');
  // الترتيب
  await page.click('#th-scan th[data-col="order"] .th-label');
  const asc = (await rowsOf(page)).map(r => r.cells[1].slice(0, 6));
  is(asc.join() === '#55001,#55002,#55003,#55004,#55005,#55006' && await page.textContent('#th-scan th[data-col="order"] .sort-icon') === '▲', 'ترتيب تصاعدي + سهم على العمود المرتّب بس');
  await page.click('#th-scan th[data-col="order"] .th-label');
  is((await rowsOf(page))[0].cells[1].startsWith('#55006') && await page.textContent('#th-scan th[data-col="order"] .sort-icon') === '▼', 'تنازلي');
  await page.click('#th-scan th[data-col="order"] .th-label');
  is((await rowsOf(page))[0].cells[1].startsWith('#55006') && await page.textContent('#th-scan th[data-col="order"] .sort-icon') === '', 'التالتة = بلا ترتيب (الأحدث فوق) والسهم يختفي');
  is(await page.$$eval('.sort-icon', s => s.filter(x => x.textContent).length) === 0, 'مفيش ⇅ ثابتة على الأعمدة');
  // عرض الأعمدة
  const w0 = await page.$eval('#th-scan th[data-col="customer"]', th => th.getBoundingClientRect().width);
  const hb = await page.$eval('#th-scan [data-rz="customer"]', h => { const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(hb.x, hb.y); await page.mouse.down(); await page.mouse.move(hb.x - 80, hb.y, { steps: 5 }); await page.mouse.up();
  const w1 = await page.$eval('#th-scan th[data-col="customer"]', th => th.getBoundingClientRect().width);
  is(Math.abs(w1 - w0 - 80) <= 2, 'سحب المقبض 80px لليسار (RTL) = +80 بالظبط', `${w0} → ${w1}`);
  is(await page.evaluate(() => !!localStorage.getItem('re_assign_bosta_col_widths_v1_scan')), 'العرض اتحفظ بمفتاح الأداة');
  const tw = await page.evaluate(() => ({ t: document.getElementById('tbl-scan').getBoundingClientRect().width, c: document.querySelector('#tbl-scan').closest('.tbl-scroll').clientWidth }));
  is(tw.t >= tw.c - 1, 'الجدول بيملا عرض الكارت (مفيش فراغ بعد آخر عمود)', JSON.stringify(tw));
  await page.reload(); await page.waitForTimeout(500);
  await paste(page, '55001', 500);
  const w2 = await page.$eval('#th-scan th[data-col="customer"]', th => th.getBoundingClientRect().width);
  is(Math.abs(w2 - w1) <= 2, 'العرض بيفضل بعد refresh', `${w1} → ${w2}`);
  is(errs.length === 0, 'صفر خطأ كونسول', errs.join(' | '));
  await ctx.close();
}

sec('⑧ تحديد الكل · شيل صف · مسح القايمة');
{
  const { ctx, page } = await open();
  await paste(page, '55001\n55002\n55006\n55003', 700);
  is(await page.textContent('#rbGo') === '🚚 تحويل 3 أوردر لبوسطة', '٣ مؤهلين محددين');
  await page.uncheck('#rbSelAll'); await page.waitForTimeout(150);
  is(await page.isDisabled('#rbGo') && (await page.textContent('#rbWhy')).includes('مفيش أوردر مؤهل محدد'), 'إلغاء تحديد الكل → الزرار مقفول والسبب مكتوب');
  await page.check('#rbSelAll'); await page.waitForTimeout(150);
  is(await page.textContent('#rbGo') === '🚚 تحويل 3 أوردر لبوسطة', 'تحديد الكل');
  await page.uncheck('#tb-scan tr:has-text("#55001") .rb-cb'); await page.waitForTimeout(100);
  is(await page.textContent('#rbGo') === '🚚 تحويل 2 أوردر لبوسطة' && await page.evaluate(() => document.getElementById('rbSelAll').indeterminate), 'إلغاء صف واحد → ٢ + حالة وسطى للهيدر');
  // تحديد الكل بيشتغل على المعروض بس
  await page.check('#tb-scan tr:has-text("#55001") .rb-cb'); await page.waitForTimeout(100);
  await page.click('#th-scan th[data-col="zone"] .th-flt'); await page.click('.pop .ms-item:has-text("Show_Room")'); await page.mouse.click(5, 300);
  await page.uncheck('#rbSelAll'); await page.waitForTimeout(150);
  is(await page.evaluate(() => RB.rows.find(r => r.display === '#55001').selected === true && RB.rows.filter(r => r.order.zone === 'Show_Room').every(r => !r.selected)), 'تحديد الكل بيشتغل على الصفوف المعروضة (المخفي — #55001 — مابيتلمسش)');
  is(await page.textContent('#rbGo') === '🚚 تحويل 1 أوردر لبوسطة', 'والزرار بيعدّ المحدد كله (حتى المخفي)');
  await page.click('[data-clearall="scan"]');
  await page.click('#tb-scan tr:has-text("#55003") [data-del]'); await page.waitForTimeout(100);
  is((await rowsOf(page)).length === 3, '✕ بتشيل أوردر من القايمة');
  await page.check('#rbSelAll'); await page.waitForTimeout(100);
  await page.click('#rbClearList'); await page.waitForTimeout(150);
  is(await page.locator('#confirmOverlay.open').count() === 1 && (await page.textContent('#confirmLead')).includes('3'), 'مسح قايمة فيها مؤهلين محددين → تأكيد بالعدد');
  await page.click('#confirmOkBtn'); await page.waitForTimeout(200);
  is((await rowsOf(page)).length === 0 && (await page.textContent('#tb-scan')).includes('لسه ما اتعملش سكان'), 'القايمة اتمسحت والجدول بيقول «لسه ما اتعملش سكان»');
  await ctx.close();
}

sec('⑨ التحويل — تأكيد بالأرقام ثم دفعة متتابعة');
{
  const { ctx, page, calls, errs } = await open();
  await paste(page, '55001\n55002\n55003', 700);
  await goConfirm(page);
  is(await page.locator('#confirmOverlay.open').count() === 1 && !calls.some(c => c.action === 'reassign_to_bosta'), 'الضغط بيفتح نافذة تأكيد — ولسه صفر كتابة');
  const lines = (await page.textContent('#confirmLines')).replace(/\s+/g, ' ');
  is((await page.textContent('#confirmLead')).includes('2 أوردر') && lines.includes('1 أوردر S1') && lines.includes('1 أوردر S2') && lines.includes('Confirmed + EXCHANGE') && lines.includes('Other_Regions') && lines.includes('تراجع'), 'النافذة بتسمّي الأرقام: كام S1 وكام S2 + EXCHANGE + «مفيش تراجع»', lines);
  is(await page.evaluate(() => document.activeElement?.id) === 'confirmCancelBtn', 'الزرار المتركّز هو «إلغاء» (Enter من السكانر مايأكّدش)');
  is(await page.evaluate(() => document.getElementById('confirmOkBtn').classList.contains('btn-red')), 'زرار التأكيد .btn-red (فعل مالوش رجعة)');
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  is(await page.locator('#confirmOverlay.open').count() === 0 && !calls.some(c => c.action === 'reassign_to_bosta'), 'Enter على الزرار المتركّز = إلغاء، صفر كتابة');
  await goConfirm(page); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  is(!calls.some(c => c.action === 'reassign_to_bosta') && await page.isEnabled('#rbGo'), 'Esc بيقفل التأكيد من غير كتابة');
  await goConfirm(page);
  await page.click('#confirmOkBtn'); await page.waitForTimeout(150);
  await page.waitForSelector('#summaryOverlay.open', { timeout: 6000 });
  const w = calls.filter(c => c.action === 'reassign_to_bosta');
  is(w.length === 2 && w.every(c => c.method === 'POST' && Object.keys(c.body).sort().join() === 'employee,orderId' && c.body.employee === 'Ahmed_Ibraheem'), 'POST لكل أوردر بالـ orderId والموظف بس — مفيش قيم ميتافيلد من الواجهة', JSON.stringify(w.map(c => c.body)));
  is(w[0].body.orderId === '6959895839043' || w[0].body.orderId === '6959895839042', 'أوردرين مؤهلين بس (غير المؤهل ما اتبعتش)');
  is(w[1].t >= w[0].t, 'متتابعين (أوردر ورا أوردر)');
  const r1 = await rowFor(page, '55001'), r2 = await rowFor(page, '55002'), r3 = await rowFor(page, '55003');
  is(r1.cells[colIdx.verdict].includes('تم التحويل') && r1.cells[colIdx.reason].includes('الحالة (S1)') && r1.cells[colIdx.reason].includes('Ready → Confirmed'), 'نجاح S1: «تم التحويل» + «ما تم فعليًا» بالتغييرات');
  is(r2.cells[colIdx.reason].includes('Confirmed + EXCHANGE') && r2.cells[colIdx.verdict].includes('تم التحويل'), 'نجاح S2');
  is(r1.cells[colIdx.zone] === 'Other_Regions' && r1.cells[colIdx.courier] === 'Bosta' && r1.cells[colIdx.s1] === 'Confirmed', 'الأعمدة اتحدّثت من رد الـ Worker (الزون/المندوب/S1)');
  is(r1.cb === false && r1.cbDis === true && r2.cbDis === true, 'الصف اللي اتنفّذ اتنزع سلاحه: مش محدد ومقفول (مفيش تحويل مرتين)');
  is(r3.cells[colIdx.verdict].includes('غير مؤهل'), 'غير المؤهل فضل زي ما هو');
  is(await page.isDisabled('#rbGo'), 'الزرار رجع مقفول (مفيش حاجة مؤهلة محددة)');
  await shot(page, '3-summary');
  const sum = (await page.textContent('#summaryLines')).replace(/\s+/g, ' ');
  is(sum.includes('اتعالج 2') && sum.includes('تم: 2'), 'نافذة الملخّص الإجبارية: اتعالج ٢ · تم ٢', sum);
  const cc = (await page.textContent('#rbCounters')).replace(/\s+/g, ' ');
  is(cc.includes('تم ✓ 2') && cc.includes('مؤهل 0'), 'العدّادات: تم ✓ ٢ · مؤهل ٠', cc);
  await page.click('#summaryOkBtn');
  await page.check('#rbSelAll').catch(() => {});
  is(await page.isDisabled('#rbGo'), '«تحديد الكل» بعد دفعة ناجحة مابيرجّعش اللي اتنفّذ');
  is(await page.evaluate(() => document.activeElement?.id) === 'rbInput', 'الفوكس رجع للمربع');
  is(errs.length === 0, 'صفر خطأ كونسول', errs.join(' | '));
  await ctx.close();
}

sec('⑩ القفل واللقطة أثناء التنفيذ');
{
  let release; const gate = new Promise(r => { release = r; });
  const { ctx, page, calls } = await open({ post: async (b) => { await gate; return null; } });
  await paste(page, '55001\n55006', 700);
  await goConfirm(page); await page.click('#confirmOkBtn'); await page.waitForTimeout(300);
  is(await page.evaluate(() => window.shellIsBusy()) === true, 'shellIsBusy() = true أثناء التحويل (الخروج التلقائي موقوف)');
  is(await page.evaluate(() => document.getElementById('rbInput').readOnly) && await page.isDisabled('#rbAdd'), 'المربع وزرار الإضافة مقفولين');
  is(await page.evaluate(() => !document.getElementById('rbProg').hidden) && (await page.textContent('#rbProgTxt')).includes('من 2'), 'شريط التقدّم بيقول «N من 2»');
  is(await page.locator('#tb-scan [data-del]:not([disabled])').count() === 0 && await page.isDisabled('#rbClearList') && await page.isDisabled('#rbSelAll'), 'الحذف ومسح القايمة وتحديد الكل مقفولين');
  await page.keyboard.press('Escape');
  await page.focus('#rbInput'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  is((await page.$$eval('.toast', t => t.map(x => x.textContent).join('|'))).includes('الإدخال مقفول'), 'محاولة إدخال → توست «الإدخال مقفول لحد ما يخلص»');
  await page.evaluate(() => rbAddCodes(['55002']));   // نداء برمجي مباشر — القفل البصري لوحده مابيمنعش
  release();
  await page.waitForSelector('#summaryOverlay.open', { timeout: 6000 });
  is(await page.evaluate(() => window.shellIsBusy()) === false && !(await page.evaluate(() => document.getElementById('rbInput').readOnly)), 'القفل اترفع في الآخر');
  is(calls.filter(c => c.action === 'reassign_to_bosta').length === 2, 'اللقطة: ٢ نداء بالظبط (مفيش تكرار ولا تخطّي)');
  await ctx.close();
}

sec('⑪ حالات النتيجة — warning · error · rejected · already · فشل شبكة');
{
  const run = async (out, cls, text, extra) => {
    const { ctx, page } = await open({ post: out });
    await enter(page, '55001', 500); await goConfirm(page); await page.click('#confirmOkBtn');
    await page.waitForSelector('#summaryOverlay.open', { timeout: 6000 }); await page.click('#summaryOkBtn'); await page.waitForTimeout(300);
    const r = await rowFor(page, '55001');
    const ok = r.cells[colIdx.verdict].includes(text) && await page.locator(`#tb-scan tr:has-text("#55001") .status-badge.${cls}`).count() === 1;
    const x = extra ? await extra(page, r) : true;
    await ctx.close(); return ok && x;
  };
  is(await run({ ok: true, status: 'warning', warnings: ['ما قدرناش نتأكد من الميتافيلدز'], changes: [], order: { ...DBX['55001'].order } }, 'warn', 'تم بس مش مؤكَّد',
    (p, r) => r.cells[colIdx.reason].includes('ما قدرناش نتأكد') && r.cbDis), 'warning → أصفر ورسالته · الصف مقفول (ممكن يكون اتنفّذ)');
  is(await run({ ok: false, status: 'error', error: 'الأوردر اتغيّر على شوبيفاي — ما اتكتبش حاجة', warnings: [] }, 'err', 'فشل',
    (p, r) => r.cells[colIdx.reason].includes('الأوردر اتغيّر') && r.cbDis === false && r.cb === false), 'error → أحمر برسالة الـ Worker (STALE) · الصف يفضل قابل لإعادة المحاولة (مش محدد)');
  is(await run({ ok: true, status: 'rejected', message: 'الأوردر مش مؤهل للتحويل — مفيش حاجة اتغيّرت', reasons: [{ code: 'not_ready', text: 'حالة الأوردر مش Ready' }] }, 'err', 'مرفوض عند التنفيذ',
    (p, r) => r.cells[colIdx.reason].includes('حالة الأوردر مش Ready') && r.cbDis), 'rejected (لقطة قديمة) → أحمر + الأسباب · مقفول');
  is(await run({ ok: true, status: 'already', message: 'الأوردر اتحوّل لبوسطة قبل كده' }, 'neutral', 'اتحوّل قبل كده'), 'already → محايد');
  is(await run({ ok: true, status: 'success', logged: false, changes: [{ label: 'الحالة (S1)', from: 'Ready', to: 'Confirmed' }], warnings: [], order: { ...DBX['55001'].order, s1: 'Confirmed' } }, 'ok', 'تم التحويل',
    (p, r) => r.cells[colIdx.reason].includes('ما اتسجّلتش في السجل')), 'logged:false → تنبيه إن السجل ناقص');
  // فشل شبكة بعد الإرسال: الأوردر ما اتنفّذش فعلاً (القراءة بتحسم)
  is(await run('netfail', 'err', 'فشل', (p, r) => r.cells[colIdx.reason].includes('ما اتنفّذش') && r.cbDis === false), 'فشل شبكة + القراءة بتقول لسه Ready → «فشل — ما اتنفّذش» وإعادة المحاولة متاحة');
  // فشل شبكة بعد الإرسال: التعديل اتنفّذ فعلاً
  is(await run(async (b, st) => { st.converted.add(b.orderId); return 'netfail'; }, 'warn', 'تم بس مش مؤكَّد', (p, r) => r.cells[colIdx.reason].includes('اتنفّذ فعلاً')), 'فشل شبكة + القراءة بتقول اتحوّل → «تم بس مش مؤكَّد» (مش «فشل»)');
}

sec('⑫ تاب سجل العمليات — server-side');
{
  const { ctx, page, calls, ctl, errs } = await open({ logTotal: 250 });
  await page.click('#tabLog'); await page.waitForTimeout(600);
  const c1 = calls.filter(c => c.action === 'get_logs'), c2 = calls.filter(c => c.action === 'get_logs_count');
  is(c1.length === 1 && c2.length === 1 && calls.some(c => c.action === 'get_log_options'), 'فتح التاب بيحمّل الصفحة + العدّ + قايمة الموظفين');
  is(c1[0].params.limit === '100' && c1[0].params.offset === '0', 'صفحة ١٠٠ صف');
  const th = await page.$$eval('#th-log th', t => t.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  is(th.join('|') === 'التاريخ|الوقت|الموظف|الأوردر|نوع العملية|النتيجة|الماكينة|التفاصيل|ملاحظة النتيجة', 'أعمدة السجل: التاريخ والوقت منفصلين + الباقي', th.join('|'));
  is(await page.$$eval('#th-log .th-flt', b => b.length) === 6, 'ست فلاتر في رؤوس الأعمدة');
  const rows = await page.$$eval('#tb-log tr', trs => trs.map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())));
  is(rows.length === 3 && rows[0][3] === '#55001' && rows[0][4] === 'تحويل' && rows[0][5] === 'تم' && rows[0][6] === 'S1', 'الصف: أوردر · نوع بالعربي · نتيجة «تم» · ماكينة S1');
  is(rows[1][5] === 'فشل' && rows[1][8].includes('الأوردر اتغيّر') && rows[2][5] === 'مرفوض' && rows[2][4] === 'مرفوض قبل الكتابة', 'فشل بسببه · مرفوض');
  is(rows[0][0].includes('📅') && rows[0][1].includes('🕐'), 'التاريخ 📅 والوقت 🕐 بالصيغة الموحّدة');
  await shot(page, '4-log');
  is(await page.textContent('#cnt-log') === '250', '«النتائج» = العدّ من السيرفر (٢٥٠) مش طول الصفحة (٣)');
  is(await page.evaluate(() => !document.getElementById('paginationRow').hidden) && (await page.textContent('#pageInfo')).includes('صفحة 1 من 3'), 'ترقيم: صفحة 1 من 3');
  await page.click('#btnNextPage'); await page.waitForTimeout(400);
  const last = calls.filter(c => c.action === 'get_logs').pop();
  is(last.params.offset === '100', 'التالي → offset=100');
  // فلتر الموظف
  await page.click('#th-log th[data-col="employee"] .th-flt'); await page.waitForTimeout(100);
  const emp = await page.$$eval('.pop .ms-item', i => i.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  is(emp.join('|') === 'Ahmed_Ibraheem 2|Sara 3', 'قايمة الموظفين من get_log_options بعدّادهم', emp.join('|'));
  await page.click('.pop .ms-item:has-text("Sara")'); await page.waitForTimeout(500);
  const g = calls.filter(c => c.action === 'get_logs').pop(), n = calls.filter(c => c.action === 'get_logs_count').pop();
  is(g.params.employees === 'Sara' && g.params.offset === '0' && n.params.employees === 'Sara', 'فلتر الموظف بيروح للسيرفر (employees) ويرجّع صفحة ١ — ونفس الفلتر في get_logs_count');
  is(await page.locator('.pop').count() === 1, 'القايمة مفتوحة بعد الاختيار');
  await page.click('.pop .ms-item:has-text("Ahmed")'); await page.waitForTimeout(500);
  is(calls.filter(c => c.action === 'get_logs').pop().params.employees === 'Sara,Ahmed_Ibraheem', 'اختيار متعدد → CSV');
  await page.mouse.click(5, 400);
  // النتيجة + النوع
  await page.click('#th-log th[data-col="result"] .th-flt'); await page.waitForTimeout(100);
  const res = await page.$$eval('.pop .ms-item span:nth-child(2)', i => i.map(x => x.textContent));
  is(res.join('|') === 'تم|تم جزئيًا|فشل|مرفوض|اتحوّل قبل كده', 'قايمة النتيجة بالعربي من نفس القاموس', res.join('|'));
  await page.click('.pop .ms-item:has-text("فشل")'); await page.waitForTimeout(500);
  is(calls.filter(c => c.action === 'get_logs').pop().params.results === 'error', 'النتيجة → results=error (قيمة الـ Worker مش العربي)');
  await page.mouse.click(5, 400);
  // بحث الأوردر والتفاصيل
  await page.click('#th-log th[data-col="order"] .th-flt'); await page.fill('.pop input[data-q]', '#55002'); await page.waitForTimeout(700);
  is(calls.filter(c => c.action === 'get_logs').pop().params.orderName === '55002', 'بحث الأوردر → orderName (بلا #) — بعد debounce');
  await page.press('.pop input[data-q]', 'Enter');
  await page.click('#th-log th[data-col="notes"] .th-flt'); await page.fill('.pop input[data-q]', 'Ready'); await page.waitForTimeout(700);
  is(calls.filter(c => c.action === 'get_logs').pop().params.notes === 'Ready', 'بحث التفاصيل → notes');
  await page.press('.pop input[data-q]', 'Enter');
  // التاريخ
  await page.click('#th-log th[data-col="date"] .th-flt'); await page.waitForTimeout(100);
  const popW = await page.$eval('.pop', p => p.getBoundingClientRect().width);
  const inside = await page.$$eval('.pop input[type=date]', ins => { const p = document.querySelector('.pop').getBoundingClientRect(); return ins.every(i => { const r = i.getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1; }); });
  is(popW === 340 && inside, 'قايمة التاريخ ٣٤٠px وحقلا من/إلى جوّه حدودها');
  await page.click('.pop [data-preset="today"]'); await page.waitForTimeout(500);
  const gd = calls.filter(c => c.action === 'get_logs').pop().params;
  is(/^\d{4}-\d\d-\d\d$/.test(gd.dateFrom) && gd.dateFrom === gd.dateTo, 'فترة سريعة «اليوم» → dateFrom=dateTo (YYYY-MM-DD)');
  is((await page.textContent('#chips-log')).includes('اليوم'), 'chip التاريخ باسم الفترة السريعة');
  await page.mouse.click(5, 400);
  // ترتيب server-side
  await page.click('#th-log th[data-col="employee"] .th-label'); await page.waitForTimeout(500);
  let gs = calls.filter(c => c.action === 'get_logs').pop().params;
  is(gs.sortBy === 'employee' && gs.sortDir === 'asc' && gs.offset === '0', 'الترتيب server-side (sortBy/sortDir) + رجوع لصفحة ١');
  await page.click('#th-log th[data-col="order"] .th-label'); await page.waitForTimeout(400);
  gs = calls.filter(c => c.action === 'get_logs').pop().params;
  is(gs.sortBy === 'orderName', 'مفتاح الترتيب = مفتاح الـ Worker (orderName)');
  await page.click('#th-log th[data-col="order"] .th-label'); await page.click('#th-log th[data-col="order"] .th-label'); await page.waitForTimeout(400);
  is(!('sortBy' in calls.filter(c => c.action === 'get_logs').pop().params), 'الضغطة التالتة = بلا ترتيب (مابيتبعتش)');
  await page.click('[data-clearall="log"]'); await page.waitForTimeout(500);
  const gc = calls.filter(c => c.action === 'get_logs').pop().params;
  is(!('employees' in gc) && !('results' in gc) && !('orderName' in gc) && !('notes' in gc) && !('dateFrom' in gc), 'مسح كل الفلاتر → ولا باراميتر');
  is(await page.$$eval('#th-log th.flt-on', t => t.length) === 0, 'الأعمدة رجعت من غير تلوين');
  // نفس الفلاتر في التلات نداءات (مصدر واحد)
  await page.click('#th-log th[data-col="type"] .th-flt'); await page.click('.pop .ms-item:has-text("مرفوض قبل الكتابة")'); await page.mouse.click(5, 400); await page.waitForTimeout(400);
  const ex = calls.filter(c => c.action === 'get_logs').pop().params, cn = calls.filter(c => c.action === 'get_logs_count').pop().params;
  is(ex.types === 'rejected' && cn.types === 'rejected', 'types بيتبعت في get_logs وget_logs_count');
  is(errs.length === 0, 'صفر خطأ كونسول', errs.join(' | '));
  await ctx.close();
}

sec('⑬ تصدير السجل — التقصّ لازم يبان (Standards #30)');
{
  const { ctx, page, calls, ctl } = await open();
  await page.click('#tabLog'); await page.waitForTimeout(500);
  await page.click('#logExport'); await page.waitForTimeout(700);
  is(calls.some(c => c.action === 'get_logs_export') && await page.locator('#logExportWarn').isHidden(), 'التصدير بينادي get_logs_export — وغير مقصوص = مفيش بانر');
  is((await page.$$eval('.toast', t => t.map(x => x.textContent).join('|'))).includes('تم تصدير 3 عملية'), 'رسالة النجاح في فرع else بس');
  ctl.exportBody = { ok: true, entries: LOG_ENTRIES, total: 5000, cap: 2000, truncated: true };
  await page.click('#logExport'); await page.waitForTimeout(700);
  const w = await page.textContent('#logExportWarn');
  is(!(await page.locator('#logExportWarn').isHidden()) && w.includes('التصدير اتقص') && w.includes('5,000'), 'مقصوص → بانر ثابت بالرقمين (المصدَّر / الإجمالي)');
  is(!(await page.$$eval('.toast', t => t.slice(-1).map(x => x.textContent).join('|'))).includes('تم تصدير'), 'ومفيش «تم تصدير ✓» على ملف ناقص');
  await page.click('#th-log th[data-col="employee"] .th-flt'); await page.click('.pop .ms-item >> nth=0'); await page.waitForTimeout(500);
  is(await page.locator('#logExportWarn').isHidden(), 'البانر بيتمسح مع أي تغيير في الفلاتر');
  await ctx.close();
}

sec('⑭ Freeze on Scroll + سلّم الـ z-index');
{
  const { ctx, page } = await open();
  await paste(page, '55001\n55002\n55003\n55004\n55005\n55006', 700);
  await page.evaluate(() => { document.body.style.minHeight = '3000px'; });
  await page.mouse.wheel(0, 700); await page.waitForTimeout(500);
  is(await page.evaluate(() => document.getElementById('stickyWrap').classList.contains('stuck')), 'السكرول بيقفل الهيدر (stuck)');
  is(await page.evaluate(() => getComputedStyle(document.getElementById('activeTabChip')).display) === 'flex' && await page.evaluate(() => document.getElementById('mainTabsBar').offsetHeight) === 0 || await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('mainTabsBar')).maxHeight) === 0), 'شريط التابات اتقفل وظهر chip التاب');
  await page.click('#activeTabChip'); await page.click('.tab-chip-item[data-tab="log"]'); await page.waitForTimeout(500);
  is(await page.evaluate(() => document.getElementById('panelLog').classList.contains('active')) && await page.evaluate(() => window.scrollY) > 100, 'التبديل من chip من غير scrollTo');
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
  is(await page.evaluate(() => !document.getElementById('stickyWrap').classList.contains('stuck')), 'الرجوع لفوق بيفتح الهيدر');
  const z = await page.evaluate(() => ({ wrap: getComputedStyle(document.getElementById('stickyWrap')).zIndex, ov: getComputedStyle(document.getElementById('aboutOverlay')).zIndex, cf: getComputedStyle(document.getElementById('confirmOverlay')).zIndex, sm: getComputedStyle(document.getElementById('summaryOverlay')).zIndex }));
  is(z.wrap === '300' && z.ov === '600' && z.cf === '600' && z.sm === '600', 'z-index: الهيدر 300 · كل المودالات 600', JSON.stringify(z));
  await ctx.close();
}

sec('⑮ موبايل ٤٠٠px');
{
  const ctx = await browser.newContext({ viewport: { width: 400, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(([s]) => { try { sessionStorage.setItem('dco_session', JSON.stringify(s)); localStorage.setItem('delivery_cod_ops_worker_secret', 'HUB'); } catch {} }, [SESSION]);
  await page.route('**/*.workers.dev/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, version: '99.0.0' }) }));
  await page.goto(`${BASE}/${PAGE}`); await page.waitForTimeout(500);
  is(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'صفر scroll أفقي للصفحة');
  await ctx.close();
}

await browser.close(); server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
