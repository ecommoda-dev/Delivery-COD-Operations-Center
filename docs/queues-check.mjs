// ══════════════════════════════════════════════════════════════
// docs/queues-check.mjs — فحص متصفح فعلي للهب كله
// (`index.html` · `ready-orders.html` · `shipped-orders.html`)
//
// 🔴 **ليه ملف واحد للتلاتة هنا؟** عكس قرار هب المخزن (خمس ملفات) — وده
//    مقصود: التلات صفحات دي بيقروا **نفس شكل الرد بالحرف** (طابور أوردرات
//    خام بنفس المفاتيح)، وبيشتقّوا منه بـ**نفس الدوال** في `shared/shell.js`.
//    Worker وهمي واحد هنا مش تبسيط — هو **جزء من البند نفسه**: البند الأهم
//    في الملف ده إن **الرقم في الرئيسية == عدد صفوف الصفحة**، ومستحيل
//    تقيسه لو كل صفحة بتشوف بيانات مختلفة.
//
// 🔴 **عيلات الفشل اللي الملف ده اتكتب عشانها — كلها صامتة:**
//    ① قاعدة اشتقاق اتكتبت في صفحة بدل الـ shell → الرئيسية بتقول رقم
//      والصفحة بتفتح على رقم تاني، **وصفر خطأ في الكونسول**
//      (درس R1 · v1.11.0 في هب المخزن: ٦٦ مقابل ٦).
//    ② صف S2 بياخد بيانات S1 (وقت تغليف · رقم تتبع) → **بيانات شحنة تانية
//      على نفس الأوردر**: رقم غلط شكله سليم.
//    ③ الصف الشاذ بيتفلتر بدل ما يتعلّم → الأوردر بيختفي من الطابور
//      والموظف بيسأل «فين؟» ومفيش إجابة (قاعدة ١٣: علّم متحركش).
//    ④ «مستحق التحصيل» بيجمع المدفوع مقدمًا → **رقم فلوس غلط**.
//    الأربعة **مستحيل يتمسكوا بمراجعة كود**.
//
// التشغيل:  npm i playwright postcss --no-save && node docs/queues-check.mjs
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  ✅', m); };
const bad = (m, d='') => { fail++; console.log('  ❌', m, d ? `\n       ${d}` : ''); };
const is  = (cond, m, d='') => cond ? ok(m) : bad(m, d);

const launchOpts = { args: ['--no-sandbox'] };
if (process.env.PW_CHROMIUM) launchOpts.executablePath = process.env.PW_CHROMIUM;
const browser = await chromium.launch(launchOpts);

// ══════════════════════════════════════════════════════════════
// البيانات الوهمية — **خام زي الـ Worker الحقيقي بالظبط**
// ══════════════════════════════════════════════════════════════
//
// ⚠️ القايمة فيها **سليم وشاذ مع بعض عن قصد**. الـ Worker الحقيقي بيرجّع
//    كل اللي حالته `Ready`/`Shipped` بلا أي فلترة، والبند اللي بيتقفل هنا
//    إن الواجهة **بتعلّم على الشاذ وبتسيبه في الطابور** — مش بتشيله.
const READY_RAW = [
  // ✅ سليم — مندوب داخلي، تحصيل
  { orderId:'7212000000001', orderName:'#55001', createdAt:'2026-09-10T08:00:00Z', cancelledAt:null,
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'أحمد سمير', province:'Cairo',
    itemsQty:2, total:'1000.00', currency:'EGP', zone:'Cairo+Giza', courier:'Saif',
    s1:'Ready', s2:null, packedAtS1:'2026-09-14T10:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:'Warehouse', whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // ✅ سليم — بوسطة
  { orderId:'7212000000002', orderName:'#55002', createdAt:'2026-09-11T08:00:00Z', cancelledAt:null,
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'سارة محمود', province:'Giza',
    itemsQty:1, total:'500.00', currency:'EGP', zone:'Other_Regions', courier:'Bosta',
    s1:'Ready', s2:null, packedAtS1:'2026-09-14T11:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:null, whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // 🔴 ✅ سليم — **دورة استبدال**: S1 = Delivered و S2 = Ready.
  //    وقت تغليف S1 **قديم** (١٢ يوم) و S2 **جديد** — والبند بيقيس إن
  //    الصف أخد **بتاع S2**. لو أخد S1، الشاشة بتقول «متأخر ١٢ يوم» على
  //    طرد اتغلّف امبارح.
  { orderId:'7212000000003', orderName:'#55003', createdAt:'2026-09-09T08:00:00Z', cancelledAt:null,
    fulfillment:'FULFILLED', financial:'PAID', customer:'كريم لطفي', province:'Cairo',
    itemsQty:1, total:'2000.00', currency:'EGP', zone:'Show_Room', courier:'Show Room',
    s1:'Delivered', s2:'Ready', packedAtS1:'2026-09-01T09:00:00Z', packedAtS2:'2026-09-13T08:00:00Z',
    packedByS1:'Abo Selim', packedByS2:'Marwan Mohammed', whereaboutsS1:null, whereaboutsS2:'Warehouse',
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // ⚠️ شاذ — **ملغي وهو لسه في الطابور**
  { orderId:'7212000000004', orderName:'#55004', createdAt:'2026-09-08T08:00:00Z',
    cancelledAt:'2026-09-14T18:00:00Z',
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'محمد جمال', province:'Cairo',
    itemsQty:1, total:'300.00', currency:'EGP', zone:'Cairo+Giza', courier:'Saif',
    s1:'Ready', s2:null, packedAtS1:'2026-09-13T09:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:'Warehouse', whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // ⚠️ شاذ — **بلا قناة** (`BLANK` مش زون رابع · قاعدة ١٦)
  { orderId:'7212000000005', orderName:'#55005', createdAt:'2026-09-12T08:00:00Z', cancelledAt:null,
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'هبة علي', province:'Qalyubia',
    itemsQty:3, total:'250.00', currency:'EGP', zone:'BLANK', courier:null,
    s1:'Ready', s2:null, packedAtS1:'2026-09-14T12:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:'Courier', whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // ⚠️ شاذ — دورة استبدال بدري (S1 لسه `Shipped` مش `Delivered`) **وما اتغلّفش**
  { orderId:'7212000000006', orderName:'#55006', createdAt:'2026-09-07T08:00:00Z', cancelledAt:null,
    fulfillment:'FULFILLED', financial:'PENDING', customer:'نهى صبري', province:'Cairo',
    itemsQty:1, total:'700.00', currency:'EGP', zone:'Cairo+Giza', courier:'Saif',
    s1:'Shipped', s2:'Ready', packedAtS1:'2026-09-06T09:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:null, whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
];
// الأرقام المتوقعة — **محسوبة بالإيد هنا عن قصد**. لو الاختبار حسبها
// بنفس دوال الـ shell، كان هيعدّي على أي منطق حتى الغلط (نفس درس
// `includes()` في فحص الباركود بتاع هب المخزن).
const READY_TOTAL     = 6;
const READY_FLAGGED   = 3;                    // #55004 · #55005 · #55006
const READY_COD_DUE   = 1000 + 500 + 300 + 250 + 700;   // = 2750 — من غير #55003 (PAID)
const READY_COD_COUNT = 5;
const READY_PREPAID   = 1;
const READY_OLDEST    = '#55006';             // 07-09 — الأقدم فوق
const READY_COURIER   = { other: 4, bosta: 1, showroom: 1 };

const SHIPPED_RAW = [
  // ✅ سليم — بوسطة، رقم تتبع S1
  { orderId:'7212000000011', orderName:'#56001', createdAt:'2026-09-05T08:00:00Z', cancelledAt:null,
    fulfillment:'FULFILLED', financial:'PENDING', customer:'ماهر رشدي', province:'Alexandria',
    itemsQty:1, total:'900.00', currency:'EGP', zone:'Other_Regions', courier:'Bosta',
    s1:'Shipped', s2:null, packedAtS1:'2026-09-06T09:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:null, whereaboutsS2:null,
    trackingS1:'1234567', trackingS2:null, trackingLegacy:null },
  // ⚠️ شاذ — `Shipped` و شوبيفاي بتقول `UNFULFILLED`
  { orderId:'7212000000012', orderName:'#56002', createdAt:'2026-09-06T08:00:00Z', cancelledAt:null,
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'ريم عادل', province:'Cairo',
    itemsQty:2, total:'400.00', currency:'EGP', zone:'Cairo+Giza', courier:'Saif',
    s1:'Shipped', s2:null, packedAtS1:'2026-09-07T09:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:null, whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // 🔴 **دورة استبدال**: رقم التتبع لازم ييجي من `…_s2` مش `…_s1`.
  //    و`UNFULFILLED` هنا **ما ياخدش علامة** — حارس الفلفلمنت على S1 بس.
  { orderId:'7212000000013', orderName:'#56003', createdAt:'2026-09-04T08:00:00Z', cancelledAt:null,
    fulfillment:'UNFULFILLED', financial:'PAID', customer:'ليلى حسن', province:'Cairo',
    itemsQty:1, total:'1500.00', currency:'EGP', zone:'Cairo+Giza', courier:'Show Room',
    s1:'Delivered', s2:'Shipped', packedAtS1:'2026-09-01T09:00:00Z', packedAtS2:'2026-09-12T09:00:00Z',
    packedByS1:'Abo Selim', packedByS2:'Marwan Mohammed', whereaboutsS1:null, whereaboutsS2:null,
    trackingS1:'1110000', trackingS2:'7654321', trackingLegacy:null },
  // ⚠️ رقم التتبع من **الحقل القديم المتوقّف** — لازم يتقال
  { orderId:'7212000000014', orderName:'#56004', createdAt:'2026-09-03T08:00:00Z', cancelledAt:null,
    fulfillment:'FULFILLED', financial:'PENDING', customer:'طارق فهمي', province:'Giza',
    itemsQty:1, total:'600.00', currency:'EGP', zone:'Other_Regions', courier:'Bosta',
    s1:'Shipped', s2:null, packedAtS1:'2026-09-04T09:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:null, whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:'999888' },
  // ⚠️ شاذ — الماكينتين على `Shipped` مع بعض
  { orderId:'7212000000015', orderName:'#56005', createdAt:'2026-09-07T08:00:00Z', cancelledAt:null,
    fulfillment:'FULFILLED', financial:'PENDING', customer:'ولاء سعيد', province:'Cairo',
    itemsQty:1, total:'800.00', currency:'EGP', zone:'Cairo+Giza', courier:'Saif',
    s1:'Shipped', s2:'Shipped', packedAtS1:'2026-09-08T09:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:null, whereaboutsS2:null,
    trackingS1:'2220000', trackingS2:null, trackingLegacy:null },
];
const SHIPPED_TOTAL   = 5;
const SHIPPED_FLAGGED = 2;                       // #56002 (بلا فلفلمنت) · #56005 (الماكينتين)
const SHIPPED_COD_DUE = 900 + 400 + 600 + 800;   // = 2700 — من غير #56003 (PAID)

const DIAG = { ok:false, version:'1.0.0', checks:[
  { ok:true,  label:'متغيرات وأسرار الـ Worker', detail:'SHOP_DOMAIN=22 حرف · WORKER_SECRET=40 حرف' },
  { ok:true,  label:'بصمة WORKER_SECRET', detail:'بصمة a3f19c47 · مجموعة warehouse_ops' },
  { ok:false, label:'صلاحية read_all_orders', detail:'ناقصة',
    hint:'أي شحنة أقدم من ٦٠ يوم مش بتظهر في الطابور' },
]};

// حالة قابلة للتبديل من كل اختبار — عشان نقيس الفشل والاقتطاع كمان
const state = { readyFail:false, shippedFail:false, truncated:false, calls:[],
                authBodies:[], logoutUrls:[] };

function makeStub() {
  return async (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');
    state.calls.push(action);
    let body = { ok:true }, status = 200;
    if (action === 'get_config')      body = { ok:true, version:'1.0.0' };
    else if (action === 'diag')       body = DIAG;
    else if (action === 'get_employees')
      body = { ok:true, employees:[{ username:'tester', display_name:'الموظف التجريبي' }] };
    else if (action === 'verify_employee') {
      // 🔴 **جسم الطلب بيتسجّل عشان بند `appId`** — القيمة دي هي اللي
      //    بتحدد `tool` في صف الدخول في D1. غيابها = الصف بيتكتب
      //    `pack_checker` **من غير أي خطأ**.
      state.authBodies.push({ host: url.host, body: JSON.parse(route.request().postData() || '{}') });
      body = { ok:true, displayName:'الموظف التجريبي', logged:true };
    }
    else if (action === 'log_logout') { state.logoutUrls.push(url.toString()); body = { ok:true }; }
    else if (action === 'check_employee') body = { ok:true, exists:true, isActive:true, hasPin:true };
    else if (action === 'get_ready_queue') {
      if (state.readyFail) { status = 500; body = { ok:false, error:'الـ Worker وقع' }; }
      else body = { ok:true, queue:'ready', orders:READY_RAW, truncated:state.truncated,
                    fetchedAt:new Date().toISOString() };
    }
    else if (action === 'get_shipped_queue') {
      if (state.shippedFail) { status = 500; body = { ok:false, error:'الـ Worker وقع' }; }
      else body = { ok:true, queue:'shipped', orders:SHIPPED_RAW, truncated:false,
                    fetchedAt:new Date().toISOString() };
    }
    await route.fulfill({ status, contentType:'application/json', body:JSON.stringify(body) });
  };
}

// ⚠️ الجلسة بتتزرع بـ `addInitScript` — `requireSession()` بترمي وبتحوّل
//    لـ`index.html` من غير جلسة، فالاختبار كان هيقيس **صفحة الدخول**.
async function newPage({ withSession = true } = {}) {
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR_/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript((sess) => {
    try {
      localStorage.setItem('delivery_cod_ops_worker_secret', 'test-secret-0123456789');
      if (sess) sessionStorage.setItem('dco_session', JSON.stringify(
        { v:1, username:'tester', displayName:'الموظف التجريبي', loginAt:new Date().toISOString() }));
    } catch {}
  }, withSession);
  await page.route('**/*.workers.dev/**', makeStub());
  return { page, ctx, errors };
}

const num = (s) => Number(String(s ?? '').replace(/[^\d.]/g, ''));

// ══════════════════════════════════════════════════════════════
// ① الجلسة والهيدر وحارس النسخة
// ══════════════════════════════════════════════════════════════
console.log('\n══ ① الجلسة والهيدر ══');
{
  // بلا جلسة → تحويل لشاشة الدخول ومعاها وجهة الرجوع
  const { page, ctx } = await newPage({ withSession:false });
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForTimeout(700);
  const u = new URL(page.url());
  is(u.pathname.endsWith('index.html') && u.searchParams.get('next') === 'ready-orders.html',
     'بلا جلسة → تحويل لـ index.html بـ ?next=', page.url());
  await ctx.close();
}
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForTimeout(900);
  is(await page.textContent('.app-title-text h1') === 'طابور الجاهز للشحن', 'الهيدر الموحّد بعنوان الصفحة');
  is(await page.isVisible('.hbtn-home'), 'زرار 🏠 الرئيسية موجود');
  is(await page.getAttribute('#activeUserBtn', 'aria-label') === 'تسجيل الخروج',
     'زرار الموظف عليه aria-label="تسجيل الخروج" (الـ ✕ لوحده مايتقريش)');
  const ver = (await page.textContent('#verBtn')).trim();
  const cl  = (await page.textContent('#clLatestVerBadge')).trim();
  is(ver.startsWith('v1.0.0'), 'زرار النسخة بيقول نسخة الهب', ver);
  is(cl === 'v1.0.0', 'بادج سجل التحديثات **مطابق** لزرار النسخة (مصدر واحد · #24)', cl);
  is(!(await page.isVisible('#verStaleBtn')), 'مفيش تحذير نسخة قديمة والـ Worker مطابق للحد الأدنى');
  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ② طابور «جاهز للشحن» — العدّ والاشتقاق
// ══════════════════════════════════════════════════════════════
console.log('\n══ ② ready-orders.html ══');
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr', { timeout: 5000 });

  const rows = await page.$$eval('#qBody tr', els => els.length);
  is(rows === READY_TOTAL, `صفوف الجدول == اللي رجع من الـ Worker بالحرف (${READY_TOTAL}) — صفر فلترة في الصفحة`, `شفت ${rows}`);

  const cnt = (await page.textContent('#qCount')).trim();
  is(num(cnt) === READY_TOTAL, 'الرقم الكبير == صفوف الجدول', cnt);
  const badge = (await page.textContent('#qBadge')).trim();
  is(num(badge) === READY_TOTAL, 'بادج زرار التحديث == الرقم الكبير', badge);

  // خلايا الصف == أعمدة الهيدر — صف بخلية ناقصة بيزحلق كل القيم عمود ورا
  // التاني **من غير أي خطأ**
  const th = await page.$$eval('.data-table thead th', e => e.length);
  const td = await page.$$eval('#qBody tr:first-child td', e => e.length);
  is(th === td, `خلايا الصف == أعمدة الهيدر (${th})`, `th=${th} td=${td}`);

  // الترتيب — الأقدم فوق
  const first = (await page.textContent('#qBody tr:first-child td:first-child')).trim();
  is(first === READY_OLDEST, 'الترتيب: الأقدم فوق', first);

  // 🔴 صف الاستبدال بياخد **وقت تغليف S2** مش S1
  const s2row = await page.$$eval('#qBody tr', els => {
    const r = els.find(e => e.textContent.includes('#55003'));
    return r ? { html: r.innerHTML, text: r.innerText } : null;
  });
  is(!!s2row && s2row.text.includes('استبدال'), 'صف S2 بيقول «استبدال/استرجاع»');
  is(!!s2row && s2row.html.includes('data-q-pack="2026-09-13T08:00:00Z"'),
     '🔴 صف S2 أخد **وقت تغليف S2** مش S1 (بيانات ماكينته هو)',
     s2row ? (s2row.html.match(/data-q-pack="[^"]*"/) || [''])[0] : 'مفيش صف');

  // الصف اللي ما اتغلّفش بيقول كده صراحةً
  const r6 = await page.$$eval('#qBody tr', els =>
    (els.find(e => e.textContent.includes('#55006')) || {}).innerText || '');
  is(r6.includes('ما اتغلّفش'), 'الصف اللي مالوش وقت تغليف بيقول «ما اتغلّفش» مش خانة فاضية');

  // 🔴 الشاذ **بيفضل في الطابور** وبياخد علامة
  const flagged = await page.$$eval('#qBody tr.flagged', e => e.length);
  is(flagged === READY_FLAGGED, `${READY_FLAGGED} صفوف عليها علامة مراجعة — و**لسه في الطابور**`, `شفت ${flagged}`);
  const chipFlag = await page.$eval('#qChips', el => {
    const b = [...el.querySelectorAll('[data-fk="flag"]')][0];
    return b ? b.innerText : '';
  });
  is(num(chipFlag) === READY_FLAGGED, 'مربع «محتاجة مراجعة» بعدد الصفوف المعلّمة', chipFlag);

  // مربعات المندوب
  const chips = await page.$$eval('#qChips [data-fk]', els =>
    Object.fromEntries(els.map(e => [e.dataset.fk, Number((e.innerText.match(/\d+/) || [0])[0])])));
  is(chips.other === READY_COURIER.other && chips.bosta === READY_COURIER.bosta && chips.showroom === READY_COURIER.showroom,
     'مربعات المندوب بتعدّ صح (والفاضي بيقع في «مناديب»)', JSON.stringify(chips));

  // 🔴 الفلوس — المدفوع مقدمًا **مستبعَد ومُعلَن**
  const money = await page.textContent('#qMoney');
  is(money.includes(READY_COD_DUE.toLocaleString('en-US')),
     `«مستحق التحصيل» = مجموع الـ PENDING بس (${READY_COD_DUE})`, money.replace(/\s+/g,' ').trim());
  is(money.includes(`${READY_COD_COUNT} أوردر`), 'المستحق بيقول **كام أوردر** مش المبلغ بس');
  is(/مدفوع مقدمًا/.test(money) && num(money.split('مدفوع مقدمًا')[1]) === READY_PREPAID,
     'المدفوع مقدمًا **بيتقال بعدده** — مش استبعاد صامت من رقم الفلوس');

  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ③ نافذة المراجعة · الفلتر · البحث
// ══════════════════════════════════════════════════════════════
console.log('\n══ ③ المراجعة والفلتر والبحث ══');
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');

  // نافذة العلامات — **السبب والفعل**، مش «فيه حاجة»
  await page.click('#qBody tr:has-text("#55004") .flag-btn');
  await page.waitForTimeout(250);
  is(await page.isVisible('#flagsOverlay .eco-modal'), 'نافذة المراجعة بتفتح من علامة الصف');
  const fb = await page.textContent('#flagsBody');
  is(fb.includes('ملغي'), 'النافذة بتقول **السبب** بالاسم', fb.slice(0,80));
  is(fb.includes('المطلوب'), 'النافذة بتقول **الفعل المطلوب** (قاعدة ١٤)');
  is(fb.includes('لسه في الطابور'), 'النافذة بتقول إن الصف **لسه بيتعدّ** — العلامة مش رفض');
  await page.click('#flagsOverlay .btn-ghost');
  await page.waitForTimeout(150);

  // الفلتر — أحادي، وبيقول «معروض N من M»
  await page.click('#qChips [data-fk="bosta"]');
  await page.waitForTimeout(200);
  let shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === READY_COURIER.bosta, 'الفلتر بالمندوب بيفلتر فعلاً', `شفت ${shown}`);
  const note = await page.textContent('#qShown');
  is(note.includes(String(READY_COURIER.bosta)) && note.includes(String(READY_TOTAL)),
     '«معروض N من M» بتظهر وقت الفلتر', note.replace(/\s+/g,' ').trim());
  // 🔴 والرقم الكبير **مابيتغيّرش** — هو رقم الطابور مش رقم المعروض
  is(num(await page.textContent('#qCount')) === READY_TOTAL,
     'الرقم الكبير مابيتغيّرش بالفلتر (هو عدد الطابور)');
  // المربعات لسه بتعدّ من الكامل
  const chipsAfter = await page.$$eval('#qChips [data-fk]', els =>
    Object.fromEntries(els.map(e => [e.dataset.fk, Number((e.innerText.match(/\d+/) || [0])[0])])));
  is(chipsAfter.other === READY_COURIER.other,
     '🔴 المربعات بتعدّ من **القايمة الكاملة** — ضغطة واحدة ماتصفّرش الباقي', JSON.stringify(chipsAfter));
  // الفلوس بتتحسب على المعروض ومعلّمة «مفلتر»
  const m2 = await page.textContent('#qMoney');
  is(m2.includes('مفلتر'), 'الفلوس بتقول «(مفلتر)» لما الفلتر شغّال — الرقم بقى عن المعروض');

  // ضغطة تانية بترجّع الكل
  await page.click('#qChips [data-fk="bosta"]');
  await page.waitForTimeout(200);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === READY_TOTAL, 'ضغطة تانية على نفس المربع بترجّع الكل');

  // البحث
  await page.fill('#qSearch', '55002');
  await page.waitForTimeout(250);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === 1, 'البحث برقم الأوردر بيفلتر', `شفت ${shown}`);
  await page.fill('#qSearch', 'سارة');
  await page.waitForTimeout(250);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === 1, 'البحث باسم العميل بيفلتر', `شفت ${shown}`);
  await page.fill('#qSearch', 'zzzz');
  await page.waitForTimeout(250);
  const empty = await page.textContent('#qEmpty');
  is(empty.includes('مفيش صفوف مطابقة'), 'مفيش نتيجة للفلتر ≠ الطابور فاضي — الرسالتين مختلفتين', empty.trim());

  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ④ الفشل والاقتطاع — بانرين منفصلين
// ══════════════════════════════════════════════════════════════
console.log('\n══ ④ الفشل والاقتطاع ══');
{
  state.readyFail = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForTimeout(900);
  is(await page.isVisible('#qFail'), 'فشل الجلب بيطلّع بانر أحمر');
  is((await page.textContent('#qCount')).includes('تعذّر'),
     'بلا أي جلب ناجح: الرقم «تعذّر» **مش 0** — «ما اتحدّثش» ≠ «مفيش شغل»');
  is((await page.textContent('#qAgo')).includes('لسه ما اتحدّثش'), 'الختم مابيتغيّرش في الفشل');
  await ctx.close();
  state.readyFail = false;
}
{
  state.truncated = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  is(await page.isVisible('#qTrunc'), 'الاقتطاع بيطلّع بانر **منفصل** عن بانر الفشل');
  is(!(await page.isVisible('#qFail')), 'وبانر الفشل مابيظهرش مع الاقتطاع — دول حالتين مختلفتين');
  await ctx.close();
  state.truncated = false;
}

// ══════════════════════════════════════════════════════════════
// ⑤ طابور «مشحون» — رقم التتبع وحارس الفلفلمنت
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑤ shipped-orders.html ══');
{
  const { page, ctx, errors } = await newPage();
  state.calls.length = 0;
  await page.goto(`${BASE}/shipped-orders.html`);
  await page.waitForSelector('#qBody tr');

  is(state.calls.includes('get_shipped_queue'), 'الصفحة بتنادي `get_shipped_queue`');
  const rows = await page.$$eval('#qBody tr', e => e.length);
  is(rows === SHIPPED_TOTAL, `صفوف الجدول == اللي رجع (${SHIPPED_TOTAL})`, `شفت ${rows}`);

  const th = await page.$$eval('.data-table thead th', e => e.length);
  const td = await page.$$eval('#qBody tr:first-child td', e => e.length);
  is(th === td, `خلايا الصف == أعمدة الهيدر (${th})`, `th=${th} td=${td}`);

  // 🔴 رقم التتبع بتاع صف S2 من `…_s2`
  const s2 = await page.$$eval('#qBody tr', els =>
    (els.find(e => e.textContent.includes('#56003')) || {}).innerText || '');
  is(s2.includes('7654321') && !s2.includes('1110000'),
     '🔴 صف S2 أخد **رقم تتبع S2** مش S1 (رقم S1 = شحنة تانية على نفس الأوردر)', s2.replace(/\s+/g,' ').slice(0,120));

  // الحقل القديم بيتقال
  const legacy = await page.$$eval('#qBody tr', els =>
    (els.find(e => e.textContent.includes('#56004')) || {}).innerText || '');
  is(legacy.includes('999888') && legacy.includes('من الحقل القديم'),
     'رقم من الحقل المتوقّف بيتعرض **وبعلامة صريحة**');

  // حارس الفلفلمنت — S1 بس
  const flagged = await page.$$eval('#qBody tr.flagged', e => e.length);
  is(flagged === SHIPPED_FLAGGED, `${SHIPPED_FLAGGED} صفوف معلّمة`, `شفت ${flagged}`);
  const s1bad = await page.$$eval('#qBody tr', els =>
    (els.find(e => e.textContent.includes('#56002')) || {}).className || '');
  is(s1bad.includes('flagged'), 'صف S1 بحالة UNFULFILLED **بياخد علامة**');
  const s2ok = await page.$$eval('#qBody tr', els =>
    (els.find(e => e.textContent.includes('#56003')) || {}).className || '');
  is(!s2ok.includes('flagged'),
     '🔴 وصف S2 بنفس الحالة **مابياخدش علامة** — عُرف الفلفلمنت في S2 مش مؤكَّد، وعلامة غلط بتخلّي الموظف يعدّي على التحذير كله');

  const money = await page.textContent('#qMoney');
  is(money.includes(SHIPPED_COD_DUE.toLocaleString('en-US')),
     `«مستحق التحصيل» للمشحون = ${SHIPPED_COD_DUE}`, money.replace(/\s+/g,' ').trim());

  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ⑥ 🔴 الشاشة الرئيسية — **الرقم هنا == القايمة هناك**
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑥ index.html — مصدر واحد للرقم ══');
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1400);

  is(await page.isVisible('#appRoot'), 'الجلسة الموجودة بتفتح الشاشة الرئيسية على طول (الريفريش مابيطلّعش)');
  is(!(await page.isVisible('#loginOverlay .login-card')), 'شاشة الدخول مخفية والجلسة شغّالة');

  const cr = num(await page.textContent('#cntReady'));
  const cs = num(await page.textContent('#cntShipped'));
  is(cr === READY_TOTAL,   `🔴 «جاهز للشحن» في الرئيسية == صفوف الصفحة (${READY_TOTAL})`, `شفت ${cr}`);
  is(cs === SHIPPED_TOTAL, `🔴 «مشحون» في الرئيسية == صفوف الصفحة (${SHIPPED_TOTAL})`, `شفت ${cs}`);
  is(num(await page.textContent('#badgeReady')) === READY_TOTAL, 'بادج زرار التحديث == العدّاد');

  // الطابور التاني اتجاب كمان — القايمة بتتبني من `homeQ` مش بالإيد
  is(!(await page.textContent('#cntShipped')).includes('—'),
     '🔴 كل صف في الرئيسية اتجاب فعلاً — مفيش صف عدّاده فضل «—» للأبد');

  const mr = await page.textContent('#moneyReady');
  is(mr.includes(READY_COD_DUE.toLocaleString('en-US')), 'المستحق في الرئيسية == المستحق في الصفحة', mr.replace(/\s+/g,' ').trim());

  const chipsR = await page.textContent('#chipsReady');
  is(chipsR.includes('محتاجة مراجعة'), 'مربع «محتاجة مراجعة» بيظهر في الرئيسية لما يكون فيه فعلاً');

  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}
{
  // 🔴 فشل طابور **مايخفيش** التاني (`allSettled` مش `all`)
  state.shippedFail = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1400);
  is(num(await page.textContent('#cntReady')) === READY_TOTAL,
     '🔴 فشل طابور مايخفيش التاني — «جاهز للشحن» لسه برقمه');
  is((await page.textContent('#cntShipped')).includes('تعذّر'), 'والطابور الواقع بيقول «تعذّر» مش 0');
  is(await page.isVisible('#failShipped'), 'وبيطلّع سطر الفشل جوّه صفه');
  await ctx.close();
  state.shippedFail = false;
}

// ══════════════════════════════════════════════════════════════
// ⑦ الفحص الذاتي وحارس النسخة
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑦ الفحص الذاتي ══');
{
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1000);
  await page.click('#settingsBtn');
  await page.waitForTimeout(200);
  await page.click('#diagBtn');
  await page.waitForTimeout(900);
  const diag = await page.textContent('#diagResult');
  is(diag.includes('طابور الجاهز للشحن') && diag.includes('طابور المشحون'),
     'الفحص بيسمّي كل Worker **بالاسم** — رسالة بلا اسم بتخلّي الموظف يدوّر في التلاتة');
  is(diag.includes('read_all_orders'), 'بنود الـ Worker بتتعرض');
  is(diag.includes('أي شحنة أقدم من ٦٠ يوم'),
     '`hint` بيتعرض تحت الفحص **الفاشل**');
  is(!diag.includes('test-secret-0123456789'),
     '🔴 صفر قيمة سر في الفحص — الأسماء والأطوال والبصمة بس');
  await ctx.close();
}
{
  // حارس النسخة بيسمّي الأداة
  const { page, ctx } = await newPage();
  await page.route('**/*.workers.dev/**', async (route) => {
    const a = new URL(route.request().url()).searchParams.get('action');
    if (a === 'get_config')
      return route.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ ok:true, version:'0.9.0' }) });
    return makeStub()(route);
  });
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForTimeout(1200);
  is(await page.isVisible('#verStaleBtn'), 'Worker أقدم من الحد الأدنى → تحذير النسخة بيظهر');
  const t = await page.textContent('#verStaleBtn');
  is(t.includes('طابور الجاهز للشحن'), 'والتحذير **بيسمّي الأداة**', t.trim());
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ⑧ الدخول — والقيمة اللي بتتكتب في D1
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑧ الدخول ══');
{
  state.authBodies.length = 0;
  const { page, ctx, errors } = await newPage({ withSession:false });
  await page.goto(`${BASE}/index.html?next=shipped-orders.html`);
  await page.waitForTimeout(800);
  is(await page.isVisible('#loginOverlay .login-card'), 'بلا جلسة → شاشة الدخول');
  const opts = await page.$$eval('#loginSelect option', e => e.length);
  is(opts === 2, 'قائمة الموظفين اتملّت من `get_employees`', `${opts} خيار`);

  await page.selectOption('#loginSelect', 'tester');
  await page.waitForTimeout(500);
  is(await page.isVisible('#pinZone.visible'), 'اختيار الموظف بيفتح مربع الـ PIN');
  for (const d of ['1','2','3','4']) { await page.click(`.pin-key:has-text("${d}")`); }
  await page.waitForTimeout(900);

  const call = state.authBodies[0] || { host:'', body:{} };
  // 🔴 الدخول لازم يروح لـ **Worker الهب نفسه** — مش لأي Worker أداة تانية
  is(call.host.startsWith('delivery-cod-operations-center-worker.'),
     '🔴 الدخول راح لـ Worker الهب نفسه', call.host);
  // 🔴 و**بلا `appId`** — الاسم متحدّد في كود الـ Worker، وقيمة جاية من
  //    العميل معناها أي طلب معاه السر يكتب صفوف بأي اسم أداة
  is(!('appId' in call.body),
     '🔴 `appId` **ما اتبعتش** — اسم الأداة في D1 متحدّد في الـ Worker مش في العميل',
     JSON.stringify(call.body));
  is(call.body.pin === '1234' && !('pin' in new URL(page.url()).searchParams),
     'الـ PIN في الـ body مش في الـ URL (Standards #5)');

  // 🔴 `?next=` بيحوّل للوجهة بعد الدخول — وبيتفحص بـ regex قبل التحويل
  await page.waitForTimeout(700);
  is(page.url().endsWith('shipped-orders.html'), '`?next=` بيرجّع الموظف لوجهته بعد الدخول', page.url());
  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}
{
  // 🔴 `next` خارجي **مايتبعش** — من غير الفحص ده `?next=https://evil…`
  //    بيحوّل الموظف لبرّه الهب.
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/index.html?next=${encodeURIComponent('https://evil.example/x')}`);
  await page.waitForTimeout(900);
  is(new URL(page.url()).host === new URL(BASE).host,
     '🔴 `?next=` لدومين برّه الهب **بيترفض** — الموظف بيفضل جوّه', page.url());
  await ctx.close();
}
{
  // الخروج بيبعت `appId` كمان — الزوج (دخول/خروج) لازم يتقفل تحت نفس الاسم
  state.logoutUrls.length = 0;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  await page.click('#activeUserBtn');
  await page.waitForTimeout(900);
  const hit = state.logoutUrls.find(u => new URL(u).host.startsWith('delivery-cod-operations-center-worker.'));
  is(!!hit, 'الخروج راح لنفس Worker الدخول — الزوج بيتقفل تحت اسم واحد', state.logoutUrls[0] || 'مفيش نداء');
  is(!!hit && !hit.includes('appId'),
     'و**بلا `appId`** — نفس قاعدة الدخول');
  is(page.url().endsWith('index.html'), 'وبعد الخروج بيرجع لشاشة الدخول');
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
