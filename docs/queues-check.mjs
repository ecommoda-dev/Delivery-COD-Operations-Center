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
// ⚠️ **وبقى فيه تاب تاني في `ready-orders.html`** — «جرد المكتب» (v1.3.0،
//    وتمريرة شكله في v1.4.0).
//    بنوده في §⑨ تحت، وكلها بتشغّل **الدورة الفعلية**: بدء · سكان · مكرر ·
//    كود غلط · إنهاء · استعلام · refresh. ⛔ وفيه بند بيمنع إن التاب يتحقن
//    في صفحة المشحون «بالقياس».
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

// 🔴 نسخة الهب — **مصدر واحد** (`TOOL_VERSION` في `shared/shell.js`، #24).
const HUB_VERSION = (fs.readFileSync(new URL('../shared/shell.js', import.meta.url), 'utf8')
  .match(/const TOOL_VERSION\s*=\s*'([^']+)'/) || [])[1];
if (!HUB_VERSION) { console.error('🔴 مقدرناش نقرا TOOL_VERSION من shared/shell.js'); process.exit(1); }

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
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'أحمد سمير', address1:'١٢ شارع جامعة الدول العربية', address2:'الدور التالت — شقة ٧', city:'Cairo', province:'Cairo',
    note:'العميل طلب التسليم بعد ٥ العصر',
    itemsQty:2, total:'1000.00', currency:'EGP', zone:'Cairo+Giza', courier:'Saif',
    s1:'Ready', s2:null, packedAtS1:'2026-09-14T10:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:'Warehouse', whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // ✅ سليم — بوسطة
  { orderId:'7212000000002', orderName:'#55002', createdAt:'2026-09-11T08:00:00Z', cancelledAt:null,
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'سارة محمود', address1:'٤٤ شارع الهرم', address2:null, city:'Giza', province:'Giza',
    // ⚠️ **مسافات بس** — لازم تتقري «مفيش ملحوظة» بالظبط زي `null`.
    //    خلية فيها مسافة بتبان «فيها حاجة» وهي فاضية.
    note:'   ',
    itemsQty:1, total:'500.00', currency:'EGP', zone:'Other_Regions', courier:'Bosta',
    s1:'Ready', s2:null, packedAtS1:'2026-09-14T11:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:null, whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // 🔴 ✅ سليم — **دورة استبدال**: S1 = Delivered و S2 = Ready.
  //    وقت تغليف S1 **قديم** (١٢ يوم) و S2 **جديد** — والبند بيقيس إن
  //    الصف أخد **بتاع S2**. لو أخد S1، الشاشة بتقول «متأخر ١٢ يوم» على
  //    طرد اتغلّف امبارح.
  { orderId:'7212000000003', orderName:'#55003', createdAt:'2026-09-09T08:00:00Z', cancelledAt:null,
    fulfillment:'FULFILLED', financial:'PAID', customer:'كريم لطفي', address1:'٩ شارع التحرير', address2:null, city:'Cairo', province:'Cairo',
    itemsQty:1, total:'2000.00', currency:'EGP', zone:'Show_Room', courier:'Show Room',
    s1:'Delivered', s2:'Ready', packedAtS1:'2026-09-01T09:00:00Z', packedAtS2:'2026-09-13T08:00:00Z',
    packedByS1:'Abo Selim', packedByS2:'Marwan Mohammed', whereaboutsS1:null, whereaboutsS2:'Warehouse',
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // ⚠️ شاذ — **ملغي وهو لسه في الطابور**
  { orderId:'7212000000004', orderName:'#55004', createdAt:'2026-09-08T08:00:00Z',
    cancelledAt:'2026-09-14T18:00:00Z',
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'محمد جمال', address1:'٢١ شارع النزهة', address2:'برج النور', city:'Cairo', province:'Cairo',
    itemsQty:1, total:'300.00', currency:'EGP', zone:'Cairo+Giza', courier:'Saif',
    s1:'Ready', s2:null, packedAtS1:'2026-09-13T09:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:'Office', whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // ⚠️ شاذ — **بلا قناة** (`BLANK` مش زون رابع · قاعدة ١٦)
  { orderId:'7212000000005', orderName:'#55005', createdAt:'2026-09-12T08:00:00Z', cancelledAt:null,
    fulfillment:'UNFULFILLED', financial:'PENDING', customer:'هبة علي', address1:null, address2:null, city:'Banha', province:'Qalyubia',
    itemsQty:3, total:'250.00', currency:'EGP', zone:'BLANK', courier:null,
    s1:'Ready', s2:null, packedAtS1:'2026-09-14T12:00:00Z', packedAtS2:null,
    packedByS1:'Abo Selim', packedByS2:null, whereaboutsS1:'Courier', whereaboutsS2:null,
    trackingS1:null, trackingS2:null, trackingLegacy:null },
  // ⚠️ شاذ — دورة استبدال بدري (S1 لسه `Shipped` مش `Delivered`) **وما اتغلّفش**
  { orderId:'7212000000006', orderName:'#55006', createdAt:'2026-09-07T08:00:00Z', cancelledAt:null,
    fulfillment:'FULFILLED', financial:'PENDING', customer:'نهى صبري', address1:'٣ شارع سوريا', address2:null, city:'Cairo', province:'Cairo',
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
// ⚠️ `readyRows` بتتسيب `null` في كل البنود ما عدا بند واحد — بند
//    «المربع اللي عدده صفر بيفضل ظاهر» محتاج طابور **ناقصة منه قيمة**،
//    وده مستحيل على البيانات الأساسية اللي فيها القيم الأربعة كلها.
const state = { readyFail:false, shippedFail:false, truncated:false, calls:[],
                authBodies:[], logoutUrls:[], lookupBodies:[], lookupFail:false,
                readyRows:null,
                // 🔴 أرضية تاريخ الطابور زي ما الـ Worker بيرجّعها (v1.9.0).
                //    `null` = **Worker أقدم من تسليم الأرضية** — البند بيقيس
                //    إن الشاشة ساعتها مابتدّعيش أي نطاق.
                minDay:'2026-04-01' };

function makeStub() {
  return async (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');
    state.calls.push(action);
    let body = { ok:true }, status = 200;
    // 🔴 **نسخة لكل Worker لوحده** — `ready.min` بقى `1.3.0` (عمود
    //    «ملحوظات» بيقرا `note`) و`shipped.min` لسه `1.0.0`. رقم واحد للاتنين كان بيولّع «Worker
    //    نسخة قديمة» على صفحة الجاهز في **كل** بند، فالبنود بتفشل لسبب
    //    مالوش علاقة باللي بتقيسه.
    if (action === 'get_config')
      body = { ok:true, version: url.host.startsWith('ready-orders') ? '1.4.0' : '1.1.0' };
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
    // ⑨ `lookup_orders` — 🔴 **POST**، والجسم بيتسجّل: البند بيقيس إن
    //    الواجهة بعتت الكود في `ids` (الباركود = Order ID) مش في الـ URL.
    else if (action === 'lookup_orders') {
      const b = JSON.parse(route.request().postData() || '{}');
      state.lookupBodies.push(b);
      // 🔴 حالة «الـ Worker أقدم من 1.2.0» — الأكشن مش موجود أصلاً هناك.
      //    بتقيس إن الفشل التلقائي **بيبان**: الزرار بيرجع بنص «إعادة
      //    المحاولة» والرسالة بتسمّي النسخة المطلوبة.
      if (state.lookupFail) {
        await route.fulfill({ status:404, contentType:'application/json',
                              body:JSON.stringify({ ok:false, error:'أكشن مش معروف' }) });
        return;
      }
      const results = [];
      for (const id of (b.ids || []))
        results.push({ key:id, kind:'id', found:true, order:{
          orderId:id, orderName:'#77001', createdAt:'2026-09-01T08:00:00Z', cancelledAt:null,
          fulfillment:'FULFILLED', financial:'PENDING', customer:'عميل بره الطابور',
          city:'Cairo', province:'Cairo', zone:'Cairo+Giza', courier:'Saif',
          s1:'Shipped', s2:null, whereaboutsS1:'Courier', whereaboutsS2:null } });
      for (const nm of (b.names || [])) results.push({ key:nm, kind:'name', found:false, order:null });
      body = { ok:true, results, truncated:false };
    }
    else if (action === 'check_employee') body = { ok:true, exists:true, isActive:true, hasPin:true };
    else if (action === 'get_ready_queue') {
      if (state.readyFail) { status = 500; body = { ok:false, error:'الـ Worker وقع' }; }
      else body = { ok:true, queue:'ready', orders:state.readyRows || READY_RAW,
                    truncated:state.truncated, minCreatedDay:state.minDay || undefined,
                    fetchedAt:new Date().toISOString() };
    }
    else if (action === 'get_shipped_queue') {
      if (state.shippedFail) { status = 500; body = { ok:false, error:'الـ Worker وقع' }; }
      else body = { ok:true, queue:'shipped', orders:SHIPPED_RAW, truncated:false,
                    minCreatedDay:state.minDay || undefined,
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
  is(await page.textContent('.app-title-text h1') === 'قسم الجاهز للشحن', 'الهيدر الموحّد بعنوان الصفحة');
  is(await page.isVisible('.hbtn-home'), 'زرار 🏠 الرئيسية موجود');
  is(await page.getAttribute('#activeUserBtn', 'aria-label') === 'تسجيل الخروج',
     'زرار الموظف عليه aria-label="تسجيل الخروج" (الـ ✕ لوحده مايتقريش)');
  const ver = (await page.textContent('#verBtn')).trim();
  const cl  = (await page.textContent('#clLatestVerBadge')).trim();
  // 🔴 **الرقم بيتقرا من `shared/shell.js` مش مكتوب هنا.** كان مكتوب
  //    حرفيًا، فأي ترفيع نسخة مشروع كان بيفشّل بندين — والبند اللي بيفشل
  //    لسبب مالوش علاقة باللي بيقيسه بيتعلّم الواحد يتجاهله.
  is(ver.startsWith(HUB_VERSION), 'زرار النسخة بيقول نسخة الهب', `${ver} ≠ ${HUB_VERSION}`);
  is(cl === HUB_VERSION, 'بادج سجل التحديثات **مطابق** لزرار النسخة (مصدر واحد · #24)', `${cl} ≠ ${HUB_VERSION}`);
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
  // 🔴 **السيليكتور على `#qTable` مش على `.data-table`** — الصفحة بقى فيها
  //    جداول نتيجة الجرد بنفس الكلاس (والشكل ده مقصود: جدول واحد في الهب
  //    كله). سيليكتور بالكلاس بيجمع أعمدة تلات جداول في مصفوفة واحدة،
  //    والبند بيفشل **لسبب مالوش علاقة باللي بيقيسه**.
  const th = await page.$$eval('#qTable thead th', e => e.length);
  const td = await page.$$eval('#qBody tr:first-child td', e => e.length);
  is(th === td, `خلايا الصف == أعمدة الهيدر (${th})`, `th=${th} td=${td}`);

  // ══ تمريرة الأعمدة (طلب أحمد 16-09-2026) ══════════════════════
  // 🔴 البنود دي بتقرا **الهيدر الفعلي** مش الكود — عمود اتشال من القالب
  //    وفضل في الصفحة (أو العكس) بيعدّي على أي مراجعة كود.
  const heads = await page.$$eval('#qTable thead th', e => e.map(x => x.textContent.trim()));
  is(JSON.stringify(heads) === JSON.stringify(
       ['رقم الأوردر','العميل','العنوان','ملحوظات','المندوب','موقع الشحنة','تاريخ الأوردر',
        'تاريخ التغليف','نوع الأوردر','مراجعة']),
     '🔴 أعمدة الجدول بترتيبها بالحرف — والعنوان **بعد العميل** و«ملحوظات» **بعده**', JSON.stringify(heads));
  // 🔴 «نوع الأوردر» **قبل الأخير** — بند مستقل عن الترتيب الكامل فوق عشان
  //    لو اتضاف عمود جديد يوم، ده يفضل هو الشرط اللي اتطلب بالاسم.
  is(heads[heads.length - 2] === 'نوع الأوردر', '🔴 «نوع الأوردر» هو العمود **قبل الأخير**', heads.at(-2));
  is(heads.at(-1) === 'مراجعة', 'و«مراجعة» آخر عمود');
  // الأعمدة اللي اتشالت — **بالاسم**، مش بالعدّ
  for (const gone of ['القناة','عدد القطع','الإجمالي','عهدة الطرد'])
    is(!heads.includes(gone), `عمود «${gone}» **اتشال**`, JSON.stringify(heads));

  // 🔴 العنوان: الشارع فوق والمدينة/المحافظة تحته
  const addr1 = await page.$$eval('#qBody tr', els => {
    const r = els.find(e => e.textContent.includes('#55001'));
    return r ? r.querySelectorAll('td')[2].innerText.replace(/\s+/g, ' ').trim() : '';
  });
  is(addr1.includes('جامعة الدول العربية') && addr1.includes('الدور التالت'),
     'خلية العنوان فيها `address1` و`address2` مع بعض', addr1);
  // 🔴 سطر المدينة/المحافظة **اتشال** (طلب أحمد 16-09-2026) — القيمة كانت
  //    بتتكرّر جوّه نص العنوان نفسه وبتطوّل كل صف من غير ما تضيف حاجة.
  is(!addr1.includes('Cairo'),
     '🔴 سطر المدينة/المحافظة **اتشال** من خلية العنوان', addr1);
  // 🔴 «بلا عنوان» بتتقال بالنص — خانة فاضية بتتقري عطل في الشاشة
  const addr5 = await page.$$eval('#qBody tr', els => {
    const r = els.find(e => e.textContent.includes('#55005'));
    return r ? r.querySelectorAll('td')[2].innerText.replace(/\s+/g, ' ').trim() : '';
  });
  is(addr5 === 'بلا عنوان',
     '🔴 الأوردر اللي مالوش عنوان بيقول **«بلا عنوان»** بالنص — خانة فاضية بتتقري عطل', addr5);

  // ══ عمود «ملحوظات» (v1.6.0 · طلب أحمد 17-09-2026) ═════════════
  // 🔴 البنود دي بتقرا **الخلية على الشاشة** — مصدرها `note` في رد الـ
  //    Worker، والعمود ده **مالوش وجود** قبل `ready-orders-worker` 1.3.0.
  const noteCells = await page.$$eval('#qBody tr', els => {
    const pick = (name) => {
      const r = els.find(e => e.textContent.includes(name));
      if (!r) return null;
      const td = r.querySelectorAll('td')[3];
      return { text: td.innerText.replace(/\s+/g, ' ').trim(),
               purple: !!td.querySelector('.note-txt'),
               cls: td.className };
    };
    return { withNote: pick('#55001'), blankNote: pick('#55002'), noNote: pick('#55004') };
  });
  is(noteCells.withNote && noteCells.withNote.text === 'العميل طلب التسليم بعد ٥ العصر',
     '🔴 خلية «ملحوظات» فيها نص حقل Notes بتاع الأوردر بالحرف',
     JSON.stringify(noteCells.withNote));
  // 🔴 اللون بيتقرا من **وجود العنصر نفسه** مش من اسم كلاس في الكود —
  //    كلاس اتغيّر من غير CSS وراه بيعدّي على أي grep.
  is(noteCells.withNote && noteCells.withNote.purple,
     '🔴 والنص جوّه `.note-txt` — وجود الملحوظة لازم يتقري من بعيد قبل نصها');
  is(noteCells.withNote && noteCells.withNote.cls.includes('note-cell'),
     '⚠️ والخلية `.note-cell` — بتلفّ زي خلية العنوان بدل ما تزقّ الأعمدة برّه الشاشة');
  // 🔴 **مسافات بس == مفيش ملحوظة** — خلية فيها مسافة بتبان «فيها حاجة»
  //    وهي فاضية، والموظف بيفتح أوردر مالوش ملحوظة.
  is(noteCells.blankNote && noteCells.blankNote.text === '—' && !noteCells.blankNote.purple,
     '🔴 الملحوظة اللي كلها مسافات بتتقري `—` — «فيها مسافة» مش «فيها ملحوظة»',
     JSON.stringify(noteCells.blankNote));
  is(noteCells.noNote && noteCells.noNote.text === '—',
     '⚠️ والصف اللي مالوش `note` خالص بيقول `—` — مش خانة فاضية بتتقري عطل',
     JSON.stringify(noteCells.noNote));
  // ⚠️ والبحث بيدوّر في الملحوظة كمان — عمود معروض ومش قابل للبحث بيخلّي
  //    الموظف يقرا الطابور صف صف.
  // ⚠️ المربع جوّه لوحة الفلاتر المقفولة افتراضيًا — لازم تتفتح الأول.
  await page.click('.flt-header');
  await page.waitForTimeout(200);
  await page.fill('#qSearch', 'العصر');
  await page.waitForTimeout(450);
  const noteHits = await page.$$eval('#qBody tr', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)));
  is(noteHits.length === 1 && noteHits[0].includes('#55001'),
     '🔴 والبحث بيدوّر في نص الملحوظة', JSON.stringify(noteHits));
  await page.fill('#qSearch', '');
  await page.waitForTimeout(450);
  await page.click('.flt-header');
  await page.waitForTimeout(200);

  // ══ «موقع الشحنة» بقى بادج (v1.6.0 · طلب أحمد 17-09-2026) ═════
  const waCells = await page.$$eval('#qBody tr', els => {
    const pick = (name) => {
      const r = els.find(e => e.textContent.includes(name));
      if (!r) return null;
      const td = r.querySelectorAll('td')[5];
      const b  = td.querySelector('.wa-badge');
      return { text: td.innerText.replace(/\s+/g, ' ').trim(),
               ok: !!td.querySelector('.wa-ok'), warn: !!td.querySelector('.wa-warn'),
               badge: !!b };
    };
    // #55004 = `Office` · #55001 = `Warehouse` · #55002 = فاضي · #55005 = `Courier`
    return { office: pick('#55004'), wh: pick('#55001'),
             none: pick('#55002'), courier: pick('#55005') };
  });
  is(waCells.office && waCells.office.ok && waCells.office.text === '✅ في المكتب',
     '🔴 `Office` → **بادج أخضر «✅ في المكتب»**', JSON.stringify(waCells.office));
  is(waCells.wh && waCells.wh.warn && waCells.wh.text.startsWith('⚠') && waCells.wh.text.includes('المخزن'),
     '🔴 وأي مكان تاني → **بادج أحمر بـ⚠ وبالقيمة بالحرف**', JSON.stringify(waCells.wh));
  is(waCells.courier && waCells.courier.warn && waCells.courier.text.includes('مع المندوب'),
     'و`Courier` بنفس البادج الأحمر — مش استثناء', JSON.stringify(waCells.courier));
  // 🔴 **الفاضي محايد** — «محدش سجّل» ≠ «المكان غلط»، وأحمر على أغلب
  //    الطابور بيتعلّم الموظف يعدّي على اللون كله.
  is(waCells.none && !waCells.none.badge && waCells.none.text === '—',
     '🔴 والفاضي `—` **بلا أي بادج** — «محدش سجّل» مش «مكان غلط»', JSON.stringify(waCells.none));

  // ══ بادج الأيام **تحت** التاريخ (v1.6.0 · طلب أحمد) ═══════════
  // 🔴 البند بيقرا `display` **المحسوب** من العنصر نفسه مش اسم الكلاس —
  //    التكديس لازم يبقى مقصود، مش لفّ سطر بيتغيّر مع عرض الشاشة.
  const stacked = await page.$$eval('#qBody tr', els => {
    const r = els.find(e => e.textContent.includes('#55001'));
    if (!r) return null;
    const tds = r.querySelectorAll('td');
    const one = (i) => {
      const d = tds[i].querySelector('.cell-date');
      return d ? getComputedStyle(d).display : null;
    };
    return { created: one(6), packed: one(7) };
  });
  is(stacked && stacked.created === 'block' && stacked.packed === 'block',
     '🔴 بادج الأيام **تحت التاريخ** في العمودين — التاريخ `display:block` مقصود مش لفّ سطر',
     JSON.stringify(stacked));

  // ⚠️ المحافظة **مش مكرّرة** تحت اسم العميل بعد ما نزلت لعمود العنوان
  const custCell = await page.$$eval('#qBody tr', els => {
    const r = els.find(e => e.textContent.includes('#55001'));
    return r ? r.querySelectorAll('td')[1].innerText.replace(/\s+/g, ' ').trim() : '';
  });
  is(custCell === 'أحمد سمير', 'خلية العميل بقت **الاسم وبس** — المحافظة مابقتش مكرّرة عليها', custCell);

  // ⚠️ خلية المندوب: الاسم من غير سطر المجموعة تحته
  const courCell = await page.$$eval('#qBody tr', els => {
    const r = els.find(e => e.textContent.includes('#55002'));
    return r ? r.querySelectorAll('td')[4].innerText.replace(/\s+/g, ' ').trim() : '';
  });
  is(courCell === 'Bosta', 'خلية المندوب = الاسم بس — سطر المجموعة تحته **اتشال**', courCell);

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

  // 🔴 الصف اللي ما اتغلّفش **مالوش بادج خالص** (طلب أحمد 16-09-2026) —
  //    الخلية بتقول `—` وبس. بادج محايد وسط عمود كله بادجات ملوّنة كان
  //    بيسحب العين لأقل صف أهمية.
  const packCell6 = await page.$$eval('#qBody tr', els => {
    const r = els.find(e => e.textContent.includes('#55006'));
    if (!r) return null;
    const tds = r.querySelectorAll('td');
    return { text: tds[7].innerText.trim(), badge: !!tds[7].querySelector('.time-badge') };
  });
  is(packCell6 && packCell6.text === '—' && !packCell6.badge,
     '🔴 الصف اللي ما اتغلّفش خليته `—` **بلا أي بادج**', JSON.stringify(packCell6));

  // 🔴 الشاذ **بيفضل في الطابور** وبياخد علامة
  const flagged = await page.$$eval('#qBody tr.flagged', e => e.length);
  is(flagged === READY_FLAGGED, `${READY_FLAGGED} صفوف عليها علامة مراجعة — و**لسه في الطابور**`, `شفت ${flagged}`);
  const chipFlag = await page.$eval('#qChips', el => {
    const b = [...el.querySelectorAll('[data-fk="flag"]')][0];
    return b ? b.innerText : '';
  });
  is(num(chipFlag) === READY_FLAGGED, 'مربع «محتاجة مراجعة» بعدد الصفوف المعلّمة', chipFlag);

  // 🔴 الكلام اللي كان جنب الأيقونة **اتشال** — والأيقونة فضلت
  is(await page.$('.count-box .cb-title') === null && await page.$('.count-box .cb-sub') === null,
     '🔴 عنوان وشرح صندوق العدّ **اتشالوا** من جنب الأيقونة');
  is(await page.$('.count-box .cb-ico') !== null, '⚠️ والأيقونة فضلت مكانها');

  // 🔴 المربعات بقت **مستطيلة زي `.zchip` في `pack.html`** — والبند بيقرا
  //    `border-radius` **المحسوب من العنصر نفسه**، مش اسم الكلاس: كلاس
  //    اتغيّر من غير CSS وراه بيعدّي على أي grep.
  const chipShape = await page.$eval('#qChips [data-fk]', el => {
    const cs = getComputedStyle(el);
    return { r: parseFloat(cs.borderRadius), h: el.getBoundingClientRect().height,
             cls: el.className, n: !!el.querySelector('.zchip-n') };
  });
  is(chipShape.cls.includes('zchip'), 'مربع الفلتر بياخد `.zchip`', chipShape.cls);
  is(chipShape.r > 0 && chipShape.r <= 12,
     '🔴 مستطيل بـ`--radius-sm` **مش pill** — pill بيبقى نصف الارتفاع',
     `radius=${chipShape.r} height=${chipShape.h}`);
  is(chipShape.n, '⚠️ العدّ في بادج `.zchip-n` جوّه المربع');

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

  // الفلتر بمربع الطابور — و«النتائج» بتتحرك معاه
  await page.click('#qChips [data-fk="bosta"]');
  await page.waitForTimeout(200);
  let shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === READY_COURIER.bosta, 'الفلتر بالمندوب بيفلتر فعلاً', `شفت ${shown}`);
  const note = await page.textContent('#qFilteredCount');
  is(num(note) === READY_COURIER.bosta,
     '🔴 «النتائج» == عدد المعروض بعد الفلتر', note.trim());
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

  // 🔴 والمربع **كتب في فلتر المندوب** — مش حالة تانية جنبه
  const msLabel = await page.textContent('#qMsBtnLabel-courier');
  is(msLabel.trim() === 'Bosta',
     '🔴 مربع الطابور **بيكتب في فلتر المندوب** — حالة واحدة مش اتنين', msLabel.trim());
  is(await page.$eval('#qFltIcon', el => el.classList.contains('active')),
     'أيقونة الفلتر بتولّع لما يبقى فيه فلتر شغّال (§3)');
  is(!(await page.$eval('#qClearAllBtn', el => el.classList.contains('inactive'))),
     'وزرار «مسح كل الفلاتر» بيبطّل يبقى باهت');

  // ضغطة تانية بترجّع الكل
  await page.click('#qChips [data-fk="bosta"]');
  await page.waitForTimeout(200);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === READY_TOTAL, 'ضغطة تانية على نفس المربع بترجّع الكل');

  // البحث — 🔴 المربع جوّه لوحة الفلاتر، فلازم تتفتح الأول
  await page.click('.flt-header');
  await page.waitForTimeout(200);
  is(await page.isVisible('#qSearch'), 'لوحة الفلاتر بتتفتح من الهيدر');
  await page.fill('#qSearch', 'سارة');
  await page.waitForTimeout(450);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === 1, 'البحث باسم العميل بيفلتر', `شفت ${shown}`);
  await page.fill('#qSearch', 'lkjhg');
  await page.waitForTimeout(450);
  is(await page.isVisible('#qEmpty') && (await page.textContent('#qEmpty')).includes('مفيش صفوف مطابقة'),
     '🔴 «مفيش نتيجة للفلتر» ≠ «الطابور فاضي» — رسالتين مختلفتين');

  // 🔴 «مسح كل الفلاتر» بيرجّع كل حاجة لحالتها المحايدة (§3 — الحالة التالتة)
  await page.click('#qClearAllBtn');
  await page.waitForTimeout(300);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === READY_TOTAL, '«مسح كل الفلاتر» بيرجّع الطابور كامل', `شفت ${shown}`);
  is(!(await page.$eval('#qFltIcon', el => el.classList.contains('active')))
     && (await page.$eval('#qClearAllBtn', el => el.classList.contains('inactive'))),
     '🔴 وبيرجّع الأيقونة والزرار لحالتهم المحايدة بالظبط');

  // ══ §SORT — الترتيب مستقل تمامًا عن الفلاتر (المعيار §8) ══════
  // 🔴 دورة تلات حالات، والسهم بيظهر **بس** على العمود المرتَّب عليه.
  const firstCol = () => page.$$eval('#qBody tr td:first-child', e => e.map(x => x.textContent.trim()));
  const before = await firstCol();
  is(before[0] === READY_OLDEST, 'الترتيب الافتراضي: الأقدم فوق', before[0]);
  is((await page.$$eval('#qTable .sort-icon', e => e.map(x => x.textContent).join(''))) === '',
     '🔴 مفيش أي سهم ترتيب قبل أول ضغطة — الأعمدة هادية بصريًا');

  await page.click('#qTable th[data-q-sort="orderName"]');
  await page.waitForTimeout(200);
  const asc = await firstCol();
  is(JSON.stringify(asc) === JSON.stringify([...asc].sort((a,b) => a.localeCompare(b,'ar'))),
     '🔴 ضغطة ① = تصاعدي فعلاً على رقم الأوردر', asc.join(','));
  is(await page.$eval('#qTable th[data-q-sort="orderName"] .sort-icon', el => el.textContent) === '▲',
     'والسهم ▲ ظهر على العمود ده');
  is(await page.$eval('#qTable th[data-q-sort="orderName"]', el => el.classList.contains('sorted')),
     'والعمود اتعلّم `sorted`');

  await page.click('#qTable th[data-q-sort="orderName"]');
  await page.waitForTimeout(200);
  const desc = await firstCol();
  is(JSON.stringify(desc) === JSON.stringify([...asc].reverse()), 'ضغطة ② = تنازلي', desc.join(','));
  is(await page.$eval('#qTable th[data-q-sort="orderName"] .sort-icon', el => el.textContent) === '▼', 'والسهم بقى ▼');

  await page.click('#qTable th[data-q-sort="orderName"]');
  await page.waitForTimeout(200);
  is(JSON.stringify(await firstCol()) === JSON.stringify(before),
     '🔴 ضغطة ③ = **بلا ترتيب** — بترجّع للافتراضي (الأقدم فوق)');
  is((await page.$$eval('#qTable .sort-icon', e => e.map(x => x.textContent).join(''))) === '',
     'والسهم اختفى خالص');

  // 🔴 الترتيب بيفضل شغّال **بعد** «مسح كل الفلاتر» — مش جزء من منظومة الفلاتر
  await page.click('#qTable th[data-q-sort="customer"]');
  await page.waitForTimeout(150);
  await page.click('#qClearAllBtn');
  await page.waitForTimeout(250);
  is(await page.$eval('#qTable th[data-q-sort="customer"]', el => el.classList.contains('sorted')),
     '🔴 الترتيب بيفضل بعد «مسح كل الفلاتر» — عمليتان منفصلتان (§8)');
  await page.click('#qTable th[data-q-sort="customer"]');
  await page.click('#qTable th[data-q-sort="customer"]');
  await page.waitForTimeout(200);

  // ⚠️ الصف اللي مالوش تاريخ تغليف بيروح **الآخر** في الاتجاهين
  await page.click('#qTable th[data-q-sort="packedAt"]');
  await page.waitForTimeout(200);
  const packAsc = await page.$$eval('#qBody tr', e => e.map(r => r.textContent.includes('#55006')));
  is(packAsc[packAsc.length - 1] === true,
     '🔴 الصف اللي ما اتغلّفش بيروح **آخر** الترتيب التصاعدي مش أوله');

  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ── 🔴 ليبل فلتر «موقع الشحنة» == نص البادج في العمود (v1.7.0) ──
//
// 🔴 **العيلة:** العمود كان بيقول «✅ في المكتب» والقايمة بتقول `Office`،
//    فالموظف بيدوّر في القايمة على الكلمة اللي شايفها في الجدول
//    **ومايلقهاش** — فيفتكر إن القيمة دي مش قابلة للفلترة أصلاً.
// ⚠️ والبند بيقرا **نص القايمة ونص الخلية** الاتنين من الشاشة ويقارنهم —
//    مش بيقرا خريطة في الكود.
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  await page.click('.flt-header');
  await page.waitForTimeout(200);
  await page.click('#qMsBtn-where');
  await page.waitForTimeout(200);
  const waItems = await page.$$eval('#qMsList-where .ms-item-label', e => e.map(x => x.textContent.trim()));
  is(waItems.includes('✅ في المكتب') && waItems.includes('⚠ المخزن') && waItems.includes('⚠ مع المندوب'),
     '🔴 قايمة «موقع الشحنة» بنص البادج بالحرف — مش `Office`/`Warehouse`', JSON.stringify(waItems));
  is(!waItems.includes('Office') && !waItems.includes('Warehouse') && !waItems.includes('Courier'),
     '⛔ والقيمة الخام **مش** معروضة — تسميتان لنفس القيمة = الموظف بيتعلّمها مرتين');
  // 🔴 **والفاضي بقى `—` بالحرف** (v1.8.0 · طلب أحمد 17-09-2026) — نفس
  //    اللي مكتوب في الخلية بالظبط. الجملة القديمة («— مش مسجّل») كانت
  //    بتتقري **قيمة تانية** غير اللي في الجدول، فالموظف يدوّر على `—`
  //    في القايمة ومايلقهوش.
  is(waItems.includes('—') && !waItems.some(t => t.includes('مش مسجّل')),
     '🔴 والفاضي بند اسمه `—` بالحرف — نفس نص الخلية، وبلا «مش مسجّل»', JSON.stringify(waItems));
  // ⚠️ نفس النص بالحرف في الخلية
  const waCell = await page.textContent('#qBody tr:has-text("#55004") .wa-badge');
  is(waCell.trim() === '✅ في المكتب', 'ونص الخلية **نفسه بالحرف**', waCell.trim());

  // 🔴 والفلترة لسه على القيمة الخام — الاختيار بيفلتر فعلاً
  await page.click('#qMsList-where .ms-item:has-text("✅ في المكتب")');
  await page.waitForTimeout(250);
  is(await page.$$eval('#qBody tr', e => e.length) === 1,
     '🔴 والاختيار بيفلتر فعلاً — الليبل بيغيّر **العرض** بس، والفلترة على القيمة الخام');
  const waChip = await page.textContent('#qChipsRow-where');
  is(waChip.includes('✅ في المكتب') && !waChip.includes('Office'),
     'والشيب تحت الفلاتر بنفس الليبل — مش بالقيمة الخام', waChip.trim());
  is((await page.textContent('#qMsBtnLabel-where')).trim() === '✅ في المكتب',
     'وزرار الفلتر نفسه كمان');
  await page.click('#qClearAllBtn');
  await page.waitForTimeout(250);

  // ── 🔴 فلتر «التغليف» — قيمتان وبس (v1.7.0 · طلب أحمد) ──
  await page.click('#qMsBtn-packed');
  await page.waitForTimeout(200);
  const pkItems = await page.$$eval('#qMsList-packed .ms-item-label', e => e.map(x => x.textContent.trim()).sort());
  is(JSON.stringify(pkItems) === JSON.stringify(['تم التغليف', 'لم يتم التغليف'].sort()),
     '🔴 فلتر «التغليف» **قيمتان بالظبط** — مش قايمة تواريخ', JSON.stringify(pkItems));
  await page.click('#qMsList-packed .ms-item:has-text("لم يتم التغليف")');
  await page.waitForTimeout(250);
  const notPacked = await page.$$eval('#qBody tr', e => e.map(r => r.textContent));
  is(notPacked.length === 1 && notPacked[0].includes('#55006'),
     '🔴 و«لم يتم التغليف» بيطلّع الصف اللي `packedAt` بتاعه فاضي **بالظبط**', String(notPacked.length));
  // ⚠️ **نفس مصدر العمود بالحرف** — الصف ده هو نفسه اللي بيروح آخر ترتيب
  //    «تاريخ التغليف» فوق، وخلية تاريخه بتقول `—`. فلتر بيقول «ما اتغلّفش»
  //    وعمود بيقول تاريخ على نفس الصف بيخلّي الموظف يشك في الاتنين.
  const packTd = await page.$$eval('#qBody tr td.date-cell', e => e[e.length - 1].textContent.trim());
  is(packTd === '—',
     '⚠️ ونفس الصف عمود «تاريخ التغليف» بتاعه `—` — الفلتر والعمود من نفس الحقل');
  await page.click('#qMsList-packed .ms-item:has-text("لم يتم التغليف")');
  await page.click('#qMsList-packed .ms-item:has-text("تم التغليف")');
  await page.waitForTimeout(250);
  is(await page.$$eval('#qBody tr', e => e.length) === READY_TOTAL - 1,
     'و«تم التغليف» بيطلّع الباقي — الاتنين بيكمّلوا الطابور بالظبط');
  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ── 🔴 مربعات «موقع الشحنة» فوق الطابور (v1.8.0 · طلب أحمد) ──
//
// 🔴 **العيلة اللي البنود دي بتقفلها:** مربع بيقول رقم وبيفتح قايمة برقم
//    تاني. المربع والفلتر لازم يكونوا **حالة واحدة** — مش حالتين جنب
//    بعض بيفترقوا في صمت، فالموظف يدوس على مربع فيدهس فلتره من غير ما
//    يقصد (نفس الباج اللي مربعات المندوب اتكتبت ضده في v1.2.0).
// ⚠️ **وكل بند هنا بيقرا الشاشة** — نص المربع وعدد الصفوف بعد الضغط،
//    مش خريطة في الكود.
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');

  const chipText = () => page.$$eval('#qWaChips .zchip', e => e.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  const labels = (await chipText()).map(t => t.replace(/\s*\d+$/, '').trim());
  is(JSON.stringify(labels) === JSON.stringify(['✅ في المكتب', '⚠ المخزن', '⚠ مع المندوب', '—']),
     '🔴 أربع مربعات **بترتيب ثابت** — الترتيب بالعدد كان بيرقّصهم مكانهم مع كل تحديث',
     JSON.stringify(labels));

  // 🔴 **نفس ليبل القايمة ونفس نص البادج في العمود** — تلات أماكن لنفس
  //    القيمة، وأي فرق بينهم معناه إن الموظف بيتعلّمها أكتر من مرة.
  await page.click('.flt-header');
  await page.click('#qMsBtn-where');
  await page.waitForTimeout(200);
  const msLabels = await page.$$eval('#qMsList-where .ms-item-label', e => e.map(x => x.textContent.trim()));
  is(msLabels.every(l => labels.includes(l)),
     '🔴 وليبل كل مربع == ليبل القايمة بالحرف', JSON.stringify([labels, msLabels]));
  await page.click('#qMsBtn-where');

  // 🔴 **مجموع المربعات == الطابور كله** — قيمة بره القايمة من غير مربع
  //    كانت هتخلّي المجموع يقلّ عن الرقم الكبير **في صمت**.
  const nums = (await chipText()).map(t => Number((t.match(/(\d+)$/) || [])[1]));
  is(nums.reduce((a, b) => a + b, 0) === READY_TOTAL,
     '🔴 ومجموع المربعات == الرقم الكبير بالظبط — مفيش صف بلا مربع', JSON.stringify(nums));

  // 🔴 **رقم المربع == عدد الصفوف اللي بيفتحها بالحرف** — ده البند
  //    الأساسي: رقم بيتقري وعد، والجدول تحته هو الوفاء بيه.
  for (const i of [1, 2, 4]) {
    const t = (await chipText())[i - 1];
    const n = Number((t.match(/(\d+)$/) || [])[1]);
    await page.click(`#qWaChips .zchip:nth-child(${i})`);
    await page.waitForTimeout(220);
    const shown = await page.$$eval('#qBody tr', e => e.length);
    is(shown === n, `🔴 «${t.replace(/\s*\d+$/, '')}»: الرقم على المربع == صفوف الجدول بعد الضغط`, `مربع ${n} · جدول ${shown}`);
    await page.click(`#qWaChips .zchip:nth-child(${i})`);
    await page.waitForTimeout(150);
  }

  // 🔴 **المربع بيكتب في الفلتر نفسه** — مش حالة تانية جنبه
  await page.click('#qWaChips .zchip:nth-child(2)');
  await page.waitForTimeout(220);
  is((await page.textContent('#qMsBtnLabel-where')).trim() === '⚠ المخزن',
     '🔴 والضغطة **بتكتب في فلتر «موقع الشحنة»** نفسه — زرار الفلتر بقى بنفس الليبل');
  is((await page.textContent('#qChipsRow-where')).includes('⚠ المخزن'),
     'وشيب الفلتر تحت اللوحة ظهر بيه — مش حالة مخفية فوق');
  is(await page.$eval('#qWaChips .zchip:nth-child(2)', el => el.classList.contains('on')),
     'والمربع نفسه **مولّع** — حالة واحدة في الاتجاهين');

  // ⚠️ والاتجاه التاني: اختيار من القايمة بيولّع المربع
  await page.click('#qClearAllBtn');
  await page.waitForTimeout(200);
  await page.click('#qMsBtn-where');
  await page.click('#qMsList-where .ms-item:has-text("✅ في المكتب")');
  await page.waitForTimeout(220);
  const onFromList = await page.$$eval('#qWaChips .zchip.on', e => e.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  is(onFromList.length === 1 && onFromList[0].startsWith('✅ في المكتب'),
     '🔴 **وفي الاتجاه التاني كمان** — اختيار من القايمة بيولّع المربع، فمستحيل الضغطة تدهس فلتر شغّال',
     JSON.stringify(onFromList));

  await page.click('#qClearAllBtn');
  await page.waitForTimeout(220);
  is(await page.$$eval('#qWaChips .zchip.on', e => e.length) === 0 &&
     await page.$$eval('#qBody tr', e => e.length) === READY_TOTAL,
     '«مسح كل الفلاتر» بيطفّي المربعات ويرجّع الطابور كامل');

  // ⚠️ **والعدّ من الطابور الكامل مش من المعروض** — العدّ على المفلتر كان
  //    هيصفّر باقي المربعات بعد أول ضغطة فالموظف مايقدرش يرجع منها.
  await page.click('#qWaChips .zchip:nth-child(1)');
  await page.waitForTimeout(220);
  const afterFilter = (await chipText()).map(t => Number((t.match(/(\d+)$/) || [])[1]));
  is(JSON.stringify(afterFilter) === JSON.stringify(nums),
     '🔴 والأعداد **ما اتغيّرتش بعد الفلترة** — العدّ من الطابور الكامل، وإلا مفيش رجوع من أول ضغطة',
     JSON.stringify([nums, afterFilter]));
  await page.click('#qWaChips .zchip:nth-child(1)');

  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ── ⚠️ والمربع بيفضل ظاهر حتى وهو صفر — بطابور ناقصة منه قيمة ──
//
// ⚠️ **مربع بيختفي لما يبقى صفر** معناه إن الموظف مش عارف إن القيمة دي
//    موجودة في الأداة أصلاً، وإن «مفيش ولا طرد مع المندوب» **معلومة** —
//    مش غياب. والبند ده محتاج داتا ناقصة، فبيبدّل الطابور لبند واحد بس.
{
  state.readyRows = READY_RAW.filter(o => o.whereaboutsS1 !== 'Courier');
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  const chips = await page.$$eval('#qWaChips .zchip', e => e.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  is(chips.length === 4 && chips.some(t => t === '⚠ مع المندوب 0'),
     '⚠️ والمربع اللي عدده صفر **بيفضل ظاهر بصفره** — مش بيختفي', JSON.stringify(chips));
  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
  state.readyRows = null;
}

// ── 🔴 خلية التاريخ = **سطران بالظبط** (v1.8.0 · طلب أحمد) ────
//
// 🔴 **العيلة:** `📅 14/09/2026` كان أعرض من جوّه العمود بـ٥px، فالأيقونة
//    كانت بتلفّ **لوحدها في سطر** والخلية تبقى تلات سطور بسطر أول فيه
//    **رمز بلا قيمة**.
// ⚠️ **والبند بيقرا التخطيط الفعلي** (`getClientRects().length`) مش اسم
//    كلاس ولا قيمة CSS — لفّ سطر بيحصل من عرض الشاشة والخط الفعلي،
//    ومقارنة على `white-space` كانت هتعدّي على الحالة اللي بتكسر.
for (const [file, total] of [['ready-orders.html', 'الجاهز'], ['shipped-orders.html', 'المشحون']]) {
  const { page, ctx, errors } = await newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/${file}`);
  await page.waitForSelector('#qBody tr');
  const cells = await page.$$eval('#qBody td.date-cell', tds => tds.map(td => {
    const d = td.querySelector('.cell-date'), b = td.querySelector('.time-badge');
    if (!d) return null;                                   // خلية `—` (ما اتغلّفش)
    const dr = d.getBoundingClientRect(), tr = td.getBoundingClientRect();
    return { lines: d.getClientRects().length, text: d.textContent.trim(),
             display: getComputedStyle(d).display,
             belowBadge: b ? b.getBoundingClientRect().top >= dr.bottom - 1 : null,
             fits: Math.round(dr.width) <= Math.round(tr.width) };
  }).filter(Boolean));
  is(cells.length > 0 && cells.every(c => c.lines === 1),
     `🔴 [${total}] التاريخ وأيقونته على **سطر واحد** — 📅 مش بتنزل لوحدها`,
     JSON.stringify(cells.filter(c => c.lines !== 1).slice(0, 2)));
  is(cells.every(c => c.text.startsWith('📅')),
     `⚠️ [${total}] والأيقونة **لسه مع التاريخ** — الحل مش شيلها`);
  is(cells.every(c => c.display === 'block' && c.belowBadge !== false),
     `🔴 [${total}] والبادج تحته في سطر تاني — التكديس **مقصود** مش لفّ سطر بالصدفة`);
  is(cells.every(c => c.fits),
     `⚠️ [${total}] والسطر جوّه العمود — مش بيزقّ عرض الخانة`);
  is(errors.length === 0, `صفر خطأ في الكونسول [${total}]`, errors.join(' | '));
  await ctx.close();
}

// ── 🔴 مقاسات الأعمدة — طلب أحمد 17-09-2026 ──────────────────
//
// ⚠️ **البند بيقرا العرض المحسوب من العنصر نفسه** مش اسم الكلاس — كلاس
//    اتغيّر من غير CSS وراه بيعدّي على أي grep.
{
  const { page, ctx, errors } = await newPage({ });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  const W = await page.$$eval('#qTable thead th', ths => Object.fromEntries(
    ths.map(t => [t.textContent.trim().replace(/[▲▼]/g, ''), Math.round(t.getBoundingClientRect().width)])));
  is(W['تاريخ الأوردر'] === W['تاريخ التغليف'],
     '🔴 عمودا التاريخ **بنفس العرض بالحرف** — التساوي مقصود مش نتيجة طول النص',
     JSON.stringify([W['تاريخ الأوردر'], W['تاريخ التغليف']]));
  is(W['العميل'] < W['تاريخ الأوردر'],
     '🔴 و«العميل» أضيق من عمود التاريخ — كان أوسع منه بكتير قبل التمريرة', String(W['العميل']));
  is(W['العنوان'] > W['ملحوظات'] && W['ملحوظات'] > 230,
     '🔴 والزيادة راحت لـ«العنوان» و«ملحوظات» — هما العمودان اللي بيتقروا',
     JSON.stringify([W['العنوان'], W['ملحوظات']]));
  is(errors.length === 0, 'وصفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ③-ج عمود «العميل» — سطران بالكتير (v1.9.0 · طلب أحمد 17-09-2026)
// ══════════════════════════════════════════════════════════════
//
// 🔴 **البند بيقيس التخطيط الفعلي مش قيمة CSS** — القص بيحصل من الخط
//    والعرض الفعليين، ومقارنة على `-webkit-line-clamp` كانت هتعدّي على
//    الحالة اللي بتكسر (بنط أكبر من المتوقع → السطرين بيطلعوا أطول من
//    الخلية، أو `display` مش متطبّق فمفيش قص أصلاً).
// ⛔ **وبند العرض جنبه إلزامي** — «الصف بقى أقصر» ممكن يتحقق كمان
//    **بتوسيع العمود**، وده بالظبط اللي اتطلب إنه **مايحصلش**.
console.log('\n══ ③-ج عمود «العميل» — سطران بالكتير ══');
{
  const LONG = 'محمد صبري اسماعيل محمد صبري محمد';
  state.readyRows = READY_RAW.map((r, i) => i === 0 ? { ...r, customer: LONG } : r);
  const { page, ctx, errors } = await newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');

  const m = await page.$$eval('#qBody tr td.cust-cell', tds => {
    const td = tds.find(t => (t.querySelector('.cust-txt')?.title || '') .includes('اسماعيل'));
    if (!td) return null;
    const sp = td.querySelector('.cust-txt');
    const cs = getComputedStyle(sp);
    return { title: sp.title, text: sp.textContent,
             lines: Math.round(sp.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
             font:  parseFloat(cs.fontSize),
             tdFont: parseFloat(getComputedStyle(td).fontSize),
             inside: sp.getBoundingClientRect().width <= td.getBoundingClientRect().width + 1 };
  });
  is(m && m.lines <= 2,
     '🔴 اسم خماسي طويل بيتقص عند **سطرين بالظبط** — كان بيلفّ على ستة ويخلّي الصف ضعف ارتفاع جاره',
     JSON.stringify(m));
  is(m && m.font < m.tdFont,
     '⚠️ وبنط الخلية **أصغر من بنط الجدول** — التصغير هو اللي بيخلّي كلمتين تدخلوا في السطر',
     JSON.stringify([m && m.font, m && m.tdFont]));
  is(m && m.inside,
     '🔴 والاسم **جوّه العمود** — مابيخرجش من حدوده ويزقّ باقي الأعمدة',
     JSON.stringify(m));
  is(m && m.title === LONG && m.text === LONG,
     '🔴 **والاسم الكامل مش ضايع** — في `title` على الخلية وفي نصها، فالقص بصري بس',
     JSON.stringify([m && m.title]));

  // 🔴 العرض ما اتغيّرش — «الصف بقى أقصر» ممكن تتحقق بالتوسيع كمان،
  //    وده اللي اتطلب إنه مايحصلش.
  const W = await page.$$eval('#qTable thead th', ths => Object.fromEntries(
    ths.map(t => [t.textContent.trim().replace(/[▲▼]/g, ''), Math.round(t.getBoundingClientRect().width)])));
  is(W['العميل'] < W['تاريخ الأوردر'] && W['العنوان'] > W['ملحوظات'] && W['ملحوظات'] > 230,
     '⛔ **وبلا أي توسيع للعمود** — «العميل» لسه أضيق من عمود التاريخ، و«العنوان»/«ملحوظات» زي ما هما',
     JSON.stringify(W));

  // ⚠️ البحث بيدوّر في الاسم **كامل** — قص بلا منفذ للقيمة الكاملة كان
  //    هيخلّي الموظف يفتح الأوردر على شوبيفاي عشان يقرا اسم.
  // ⚠️ المربع جوّه لوحة الفلاتر المقفولة افتراضيًا — لازم تتفتح الأول.
  await page.click('.flt-header');
  await page.waitForTimeout(200);
  await page.fill('#qSearch', 'صبري محمد');
  await page.waitForTimeout(450);
  is(await page.$$eval('#qBody tr', r => r.length) === 1,
     '🔴 والبحث بيلاقيه بآخر الاسم — بيدوّر في **الاسم الكامل** مش في المقصوص');
  is(errors.length === 0, 'وصفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
  state.readyRows = null;
}
{
  // ⚠️ **ونفس القاعدة في صفحة المشحون** — جدول واحد بمقاسين في صفحتين
  //    بيتعلّمه الموظف مرتين (نفس سبب بند مقاسات الأعمدة فوق).
  const orig = SHIPPED_RAW[0].customer;
  SHIPPED_RAW[0].customer = 'عبدالرحمن محمود عبدالرحمن محمود السيد';
  const { page, ctx } = await newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/shipped-orders.html`);
  await page.waitForSelector('#qBody tr');
  const m = await page.$$eval('#qBody tr td.cust-cell .cust-txt', sps => {
    const sp = sps.find(x => x.title.includes('عبدالرحمن محمود عبدالرحمن'));
    if (!sp) return null;
    const cs = getComputedStyle(sp);
    return { lines: Math.round(sp.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
             font: parseFloat(cs.fontSize) };
  });
  is(m && m.lines <= 2 && m.font < 14.5,
     '🔴 ونفس القص والبنط في **طابور المشحون** — نفس الجدول ونفس المعيار',
     JSON.stringify(m));
  await ctx.close();
  SHIPPED_RAW[0].customer = orig;
}

// ══════════════════════════════════════════════════════════════
// ③-د أرضية تاريخ الطابور — الاستبعاد مُعلَن (v1.9.0)
// ══════════════════════════════════════════════════════════════
//
// 🔴 **الأرضية بتشيل أوردرات من الطابور** — الـ Worker مابيجيبش اللي أقدم
//    من `01/04/2026`. استبعاد صامت من رقم بيخلّي الفرق بينه وبين الواقع
//    **بلا تفسير**، فالشاشة لازم تقوله.
// 🔴 **والقيمة من رد الـ Worker مش مكتوبة في الصفحة** — والبند التاني
//    (Worker بلا الحقل) هو اللي بيثبت كده: لو التاريخ كان مكتوب في
//    الصفحة، كان هيفضل ظاهر وهو مش مطبّق.
console.log('\n══ ③-د أرضية تاريخ الطابور ══');
for (const [file, label] of [['ready-orders.html', 'الجاهز للشحن'], ['shipped-orders.html', 'المشحون']]) {
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/${file}`);
  await page.waitForSelector('#qBody tr');
  const sc = await page.$eval('#qScope', el => ({ hidden: el.hidden, text: el.textContent.trim() }));
  is(!sc.hidden && sc.text === 'الطابور من 01/04/2026',
     `🔴 «${label}»: الأرضية مكتوبة جنب الرقم بصيغة الجدول (dd/mm/yyyy) — الاستبعاد مُعلَن مش صامت`,
     JSON.stringify(sc));
  await ctx.close();
}
{
  // ⛔ **Worker أقدم من تسليم الأرضية** — الرد بلا `minCreatedDay`.
  //    ادعاء أرضية **مش مطبّقة** أسوأ من مفيش ادعاء: الموظف بيفتكر إن
  //    الطابور مفلتر وهو راجع بالكامل.
  state.minDay = null;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  is(await page.$eval('#qScope', el => el.hidden),
     '⛔ وعلى Worker مابيرجّعش الأرضية الشيب **بيختفي خالص** — التاريخ جاي من الرد مش مكتوب في الصفحة');
  await ctx.close();
  state.minDay = '2026-04-01';
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

  const th = await page.$$eval('#qTable thead th', e => e.length);
  const td = await page.$$eval('#qBody tr:first-child td', e => e.length);
  is(th === td, `خلايا الصف == أعمدة الهيدر (${th})`, `th=${th} td=${td}`);

  // 🔴 **مفيش عمود عنوان هنا** — `shipped-orders-worker` لسه مابيرجّعش
  //    `address1`. العمود اللي بيقول `—` على كل صف بيتقري عطل في الشاشة،
  //    فبيتضاف **في نفس تسليم الـ Worker** مش قبله.
  const shHeads = await page.$$eval('#qTable thead th', e => e.map(x => x.textContent.trim()));
  is(!shHeads.includes('العنوان'),
     '🔴 طابور المشحون **بلا عمود عنوان** لحد ما الـ Worker بتاعه يرجّعه', JSON.stringify(shHeads));
  // 🔴 **وبلا عمود «ملحوظات» لنفس السبب بالظبط** — `note` جه في
  //    `ready-orders-worker` v1.3.0، و`shipped-orders-worker` مابيرجّعهوش.
  //    عمود بيقول `—` على كل صف معناه «مفيش ملحوظات في الطابور كله» —
  //    ادعاء غلط، مش خانة فاضية. والبند ده بيمنع إضافته «بالقياس».
  is(!shHeads.includes('ملحوظات'),
     '🔴 وبلا عمود «ملحوظات» كمان — العمود بيتضاف **في نفس تسليم الـ Worker**', JSON.stringify(shHeads));
  is(shHeads.at(-2) === 'نوع الأوردر' && shHeads.at(-1) === 'مراجعة',
     'ونفس ترتيب آخر عمودين بالحرف زي صفحة الجاهز', JSON.stringify(shHeads.slice(-2)));
  // ⛔ **وبلا صف مربعات «موقع الشحنة»** (v1.8.0) — مفيش فلتر `where` في
  //    الصفحة دي أصلاً (العمود التاني هنا رقم تتبع)، ومربع بيفلتر على
  //    فلتر مش موجود = ضغطة مالهاش أثر. والبند ده بيمنع إضافته «بالقياس».
  is(await page.$('#qWaChips') === null,
     '⛔ وطابور المشحون **بلا صف مربعات «موقع الشحنة»** — مفيش فلتر ورا المربع هنا');

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
  is(diag.includes('قسم الجاهز للشحن') && diag.includes('طابور المشحون'),
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
  is(t.includes('قسم الجاهز للشحن'), 'والتحذير **بيسمّي الأداة**', t.trim());
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

// ══════════════════════════════════════════════════════════════
// ⑨ تاب «جرد المكتب» — الدورة كاملة على الشاشة الفعلية
// ══════════════════════════════════════════════════════════════
//
// 🔴 **العيلات اللي البنود دي بتمسكها — كلها صامتة:**
//    ① «مفقودة» بتتعرض وسط الجرد (والموظف لسه بيسكن) → بيدوّر على طرد
//      في إيده.
//    ② نفس الأوردر بصيغتين بيتعدّ مرتين → «مضبوطة» أكبر من النطاق نفسه.
//    ③ النطاق بيتحسب حيًّا من الفلتر → ضغطة فلتر وسط الجرد تغيّر قايمة
//      المفقود **فجأة**.
//    ④ «موجود خطأ» بلا سبب → بند بيقول «فيه حاجة» وبس (قاعدة ١٤).
//    ⑤ refresh وسط الجرد بيمسح ساعة سكان بلا أي تحذير.
console.log('\n══ ⑨ تاب «جرد المكتب» ══');
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  const scan = async (code) => {
    await page.fill('#audScanInput', code);
    await page.press('#audScanInput', 'Enter');
    await page.waitForTimeout(160);
  };

  is(await page.isVisible('#tabAuditBtn'), 'تاب «جرد المكتب» موجود جنب تاب الأوردرات');
  // 🔴 «الأوردرات» مش «الطابور» (v1.7.0 · طلب أحمد) — يطابق اسم الكارت
  //    في الشاشة الرئيسية («أوردرات جاهزة للشحن»).
  const qTabTxt = (await page.textContent('#tabQueueBtn')).trim();
  is(qTabTxt.includes('الأوردرات') && !qTabTxt.includes('الطابور'),
     '🔴 واسم التاب الأولى **«الأوردرات»** مش «الطابور»', qTabTxt);
  is(await page.isVisible('#viewQueue') && !(await page.isVisible('#viewAudit')),
     'والطابور هو المفتوح افتراضيًا — الجرد جلسة بتبدأ بقرار');
  await page.click('#tabAuditBtn');
  await page.waitForTimeout(250);
  is(!(await page.isVisible('#viewQueue')) && await page.isVisible('#viewAudit'),
     'الضغط على التاب بيبدّل العرض');

  // ── قبل البدء ──
  is((await page.textContent('#audNOk')).trim() === '—',
     '🔴 قبل البدء العدّاد «—» مش «0» — «ما اتجردش» ≠ «مفيش»');
  is(await page.$eval('#audScanInput', el => el.disabled),
     '🔴 والسكانر **معطّل** — مربع شكله شغّال والسكانات بتضيع هو اللي بيخلّي الجرد يتعاد');
  // 🔴 سطر النطاق الشارح اتشال (طلب أحمد 16-09-2026) و**العنوان بقى هو
  //    اللي بيحمل النطاق**: «جرد أوردرات (مناديب ٤ + بوسطة ١ + شو روم ١)».
  //    البند بيقرا العنوان نفسه — نطاق مش مكتوب معناه «مفقودة من إيه؟»
  //    بلا إجابة.
  const t0 = await page.textContent('#audTitle');
  is(t0.includes('جرد أوردرات') && t0.includes(`مناديب ${READY_COURIER.other}`)
     && t0.includes(`بوسطة ${READY_COURIER.bosta}`) && t0.includes(`شو روم ${READY_COURIER.showroom}`),
     '🔴 والعنوان بيقول **اللي هيتجرد بعدده لكل مجموعة** قبل البدء', t0.trim());
  is(num(await page.textContent('#audNScope')) === READY_TOTAL,
     'ومربع «إجمالي الأوردرات» == المعروض دلوقتي');
  is((await page.textContent('#audWarn')).includes('عدم تحديث حالة أي شحنة'),
     '🔴 وتحذير «عدم تحديث حالة أي شحنة أثناء الجرد» على الشاشة — النطاق لقطة');
  // ⚠️ النصوص اللي أحمد شالها **مش موجودة** — البند ده بيمنع رجوعها بالقياس
  const idleTxt = await page.textContent('#viewAudit');
  is(!idleTxt.includes('🧮 جرد المكتب') && !idleTxt.includes('بيتثبّت وقت')
     && !idleTxt.includes('وابدأ سكان باركود الطرود'),
     '⚠️ وشاشة البدء **بلا** العنوان القديم ولا سطر النطاق ولا نص «اضغط بدء الجرد»');
  // 🔴 **حارسان مش واحد:** الـ `disabled` على المربع (فوق) والفحص على
  //    `phase` جوّه `audScan`. البند ده بينادي الدالة **مباشرةً** عشان
  //    يقيس التاني — السكانر بيكتب في المربع بلا حدث `input` في بعض
  //    الموديلات، والحارس الأول لوحده مش كفاية.
  await page.evaluate(() => {
    document.getElementById('audScanInput').value = '7212000000001';
    audScan();
  });
  await page.waitForTimeout(150);
  is((await page.textContent('#audNOk')).trim() === '—',
     '🔴 وسكانة قبل البدء مابتتحسبش — حتى بنداء مباشر على `audScan`');

  // 🔴 **أسماء المربعات وترتيبها** (طلب أحمد 16-09-2026) — البند بيقرا
  //    الليبلات **بترتيبها على الشاشة**: الاسم لوحده بيعدّي لو مربعان
  //    اتبدّلوا مكانهم، والترتيب لوحده بيعدّي لو الاسم اتغيّر.
  const labels = await page.$$eval('.aud-cards .aud-card',
    els => els.filter(e => e.offsetParent !== null).map(e => e.querySelector('.aud-l').textContent.trim()));
  is(JSON.stringify(labels) === JSON.stringify(['إجمالي الأوردرات', 'أوردرات متبقية', 'حالة سليمة ✅', 'حالة خطأ ⛔']),
     '🔴 المربعات بأسمائها الجديدة **وبترتيبها**', JSON.stringify(labels));

  // ── البدء ──
  await page.click('#audStartBtn');
  await page.waitForTimeout(250);
  is(!(await page.$eval('#audScanInput', el => el.disabled)), 'بعد البدء السكانر شغّال');
  is(num(await page.textContent('#audNScope')) === READY_TOTAL,
     'والنطاق == اللي كان معروض وقت البدء', await page.textContent('#audNScope'));
  is(num(await page.textContent('#audNPend')) === READY_TOTAL,
     'و«أوردرات متبقية» == النطاق كله');
  // ⛔ المربعات **مش فلاتر وسط الجرد** — ضغطة على نتيجة لسه ما خلصتش
  await page.click('#audCardOk');
  await page.waitForTimeout(150);
  is(!(await page.isVisible('#audSecOk')),
     '⛔ وضغطة على مربع **وسط الجرد** مابتفتحش أي قسم — الأقسام نتيجة مش حالة');
  is(!(await page.isVisible('#audCardMiss')) && await page.isVisible('#audCardPend'),
     '🔴 مربع «مفقودة» **مخفي** وسط الجرد — الموظف لسه بيسكن');
  is((await page.textContent('#audTitle')).includes(`مناديب ${READY_COURIER.other}`),
     'والعنوان بعد البدء بقى على **اللقطة**');

  // ── السكان ──
  await scan('7212000000001');
  is(num(await page.textContent('#audNOk')) === 1, 'سكان بالـ Order ID بيحسب الأوردر «مظبوط»');
  is((await page.textContent('#audLast')).includes('#55001'),
     'وآخر سكانة بتقول **رقم الأوردر** — الموظف بيسكن ٥٠ طرد ورا بعض والتوست بيختفي');
  is(num(await page.textContent('#audNPend')) === READY_TOTAL - 1, 'و«أوردرات متبقية» نقص واحد');

  await scan('#55001');
  is(num(await page.textContent('#audNOk')) === 1,
     '🔴 نفس الأوردر بالاسم **مابيتعدّش تاني** — التفريد على الأوردر مش على الكود');
  is((await page.textContent('#audLast')).includes('قبل كده'),
     'والشاشة بتقول «اتعمله سكان قبل كده» — مش إنذار');

  await scan('12');
  is(num(await page.textContent('#audNExtra')) === 0,
     '🔴 كود أقل من ٤ أرقام **مابيتحسبش سكانة** — قراءة مقطوعة ممكن تطابق أوردر تاني');
  is((await page.textContent('#audLast')).includes('قصير'), 'والسبب مكتوب: السكانر قطع القراءة');

  await scan('9999000011112');
  is(num(await page.textContent('#audNExtra')) === 1, 'وكود مش في القسم بيروح «موجودة خطأ»');

  // الطابور نفسه مالوش أي علاقة بالجرد
  await page.click('#tabQueueBtn');
  await page.waitForTimeout(200);
  is(num(await page.textContent('#qCount')) === READY_TOTAL,
     '⚠️ والرقم الكبير بتاع الطابور **مابيتأثرش** بالجرد خالص');
  await page.click('#tabAuditBtn');
  await page.waitForTimeout(200);

  // ── الإنهاء ──
  await page.click('#audEndBtn');
  await page.waitForTimeout(300);
  is(await page.isVisible('#audCardMiss') && !(await page.isVisible('#audCardPend')),
     '🔴 بعد الإنهاء «مفقودة» بتظهر و«لسه ما اتعملّهاش سكان» بتختفي — نفس الرقم واسمين مختلفين');
  is(num(await page.textContent('#audNMiss')) === READY_TOTAL - 1,
     'وعدد المفقود == النطاق ناقص المظبوط');
  is(await page.isVisible('#audSecOk') && await page.isVisible('#audSecMiss')
     && await page.isVisible('#audSecExtra'), 'والتلات أقسام بتظهر');

  // ── 🔴 المربعات بقت فلاتر (طلب أحمد 16-09-2026) ──
  const collapsed = s => page.$eval('#audBody' + s, e => e.classList.contains('collapsed'));
  is(await collapsed('Ok') && await collapsed('Miss') && await collapsed('Extra'),
     '🔴 وبعد الإنهاء التلات أقسام **مطوية** — النتيجة بتتقرا من المربعات الأربعة الأول');
  await page.click('#audCardOk');
  await page.waitForTimeout(200);
  is(await page.isVisible('#audBodyOkRows') && !(await page.isVisible('#audBodyMissRows'))
     && !(await page.isVisible('#audXList')),
     '🔴 وضغطة على «حالة سليمة» بتفتح قسمها **وبتطوي الباقي**');
  is(await page.$eval('#audCardOk', e => e.classList.contains('active')),
     'والمربع المختار بياخد إطار — قايمة اتقفلت من غير ما المربع يقول إنه السبب بتتقري «فاضي»');
  await page.click('#audCardExtra');
  await page.waitForTimeout(200);
  is(await page.isVisible('#audXList') && !(await page.isVisible('#audBodyOkRows')),
     'وضغطة على مربع تاني بتنقل الفتح لقسمه');
  await page.click('#audCardScope');
  await page.waitForTimeout(200);
  is(await page.isVisible('#audBodyOkRows') && await page.isVisible('#audBodyMissRows')
     && await page.isVisible('#audXList'),
     '🔴 و«إجمالي الأوردرات» بيفتح التلاتة');

  // ── 🔴 عناوين الأقسام: بلا الجمل الزيادة وبلا عدّاد (طلب أحمد) ──
  const secTitles = await page.$$eval('#viewAudit .aud-sec-title', e => e.map(x => x.textContent.trim()));
  is(JSON.stringify(secTitles) === JSON.stringify(
       ['✅ أوردرات مظبوطة', '❌ أوردرات مفقودة', '⚠️ أوردرات موجودة خطأ']),
     '⚠️ وعناوين الأقسام بلا الجمل الشارحة', JSON.stringify(secTitles));
  is(await page.$$eval('#viewAudit .aud-sec-n', e => e.length) === 0,
     'وبلا عدّاد جنب العنوان — الرقم في المربع فوق، وتكراره في مكانين بيخلّي أي فرق بلا تفسير');

  // ── 🔴 التلات قوايم **جدول زي جدول الطابور بالظبط** (طلب أحمد) ──
  const strip = e => e.map(x => x.textContent.replace(/[⇅▲▼]/g, '').trim());
  const qCols = await page.$$eval('#qTable thead th', strip);
  for (const [sec, lbl] of [['Ok', 'مظبوطة'], ['Miss', 'مفقودة'], ['Extra', 'موجودة خطأ']]) {
    const aCols = await page.$$eval(`#audBody${sec} thead th`, strip);
    is(JSON.stringify(aCols) === JSON.stringify(qCols),
       `🔴 أعمدة قسم «${lbl}» == أعمدة جدول الطابور **بالحرف وبالترتيب**`, JSON.stringify(aCols));
  }
  is(await page.$$eval('#audBodyOkRows tr:first-child td', e => e.length) === qCols.length,
     'وخلايا الصف == عدد الأعمدة — خلية ناقصة بتزحلق كل العمود بعدها');
  is(await page.$$eval('#audXList tr.aud-x-row td[colspan]', e => e.length) > 0,
     '🔴 و«موجودة خطأ» جدول كمان — والسبب في **صف تحت الصف** بعرض الجدول كله (قاعدة ١٤)');
  is(await page.$$eval('#audBodyMissRows tr', e => e.length) === READY_TOTAL - 1,
     '🔴 صفوف قسم «مفقودة» == الرقم اللي المربع بيقوله بالحرف');
  is(await page.$$eval('#audBodyOkRows tr', e => e.length) === 1, 'وصفوف «مظبوطة» == الرقم');
  // الصف الشاذ في الجرد زي أي صف — علّم متشيلش (قاعدة ١٣)
  const missTxt = await page.textContent('#audBodyMissRows');
  is(missTxt.includes('#55004'),
     '🔴 والصف المعلّم (ملغي) **في قايمة المفقود زي أي صف** — الجرد بيقول موجود/مفقود بس');
  is(await page.$$eval('#audBodyMissRows [data-aud-flag]', e => e.length) > 0,
     'وعلامة المراجعة لسه على الصف في جدول الجرد');

  const x = await page.textContent('#audXList');
  is(x.includes('المطلوب'), '🔴 كل «موجود خطأ» بيقول **الفعل المطلوب** (قاعدة ١٤)');
  // ⚠️ **البند القديم «لسه ما استعلمناش حالة صريحة» اتنقل لكتلة الفشل تحت**
  //    — بعد ما الاستعلام بقى تلقائي، الحالة دي **مابتظهرش في المسار
  //    الناجح أصلاً**، وقياسها هنا كان بيقيس تأخير النداء مش القاعدة.

  // ── 🔴 الاستعلام عن الحالة الفعلية — **تلقائي مع الإنهاء** (طلب أحمد) ──
  //    البنود دي **مابتضغطش الزرار خالص**: الضغط كان هيخفي بالظبط اللي
  //    بتقيسه — إن الشاشة وصلت للحالة الحقيقية من غير أي ضغطة.
  await page.waitForTimeout(500);
  is(state.lookupBodies.length === 1 && (state.lookupBodies[0].ids || []).includes('9999000011112'),
     '🔴 `lookup_orders` اتنادى **تلقائيًا مع «إنهاء الجرد»** بـ POST والكود في `ids` — بلا أي ضغطة',
     JSON.stringify(state.lookupBodies));
  const x2 = await page.textContent('#audXList');
  is(x2.includes('Shipped'),
     '🔴 والسبب بقى بيقول **الحالة الحقيقية بالحرف** من غير تدخّل الموظف');
  is(!x2.includes('اضغط «استعلام'),
     '⚠️ و«اضغط استعلام» مابقاش مكتوب على صف اتستعلم فعلاً');
  is(!(await page.isVisible('#audLookupBtn')),
     'والزرار مش ظاهر — مفيش صف محتاج استعلام');
  is(await page.isVisible('#audExportBtn'), 'وزرار تصدير XLSX بيظهر بعد الإنهاء بس');

  // علامة المراجعة جوّه جدول الجرد — 🔴 التفويض شغّال فعلاً
  await page.click('#audBodyMissRows [data-aud-flag]');
  await page.waitForTimeout(250);
  const afb = await page.textContent('#flagsBody');
  is(await page.isVisible('#flagsOverlay .eco-modal') && afb.includes('المطلوب'),
     '🔴 والضغط على علامة الصف في جدول الجرد بيفتح نفس نافذة السبب والفعل');
  await page.click('#flagsOverlay .btn-ghost');
  await page.waitForTimeout(150);

  // 🔴 **حارس المكتبة الخارجية** — CDN محجوب أو شبكة واقعة بيخلّي الضغطة
  //    ترمي `ReferenceError`، والرمي ده **بيسكّت باقي السكربت**: الصفحة
  //    بتفضل مفتوحة وكل زرار بعد كده مابيعملش حاجة.
  await page.evaluate(() => { try { delete window.ExcelJS; } catch { window.ExcelJS = undefined; } });
  await page.click('#audExportBtn');
  await page.waitForTimeout(300);
  const tst = await page.textContent('.toast-container');
  is(tst.includes('ما اتحمّلتش'),
     '🔴 والتصدير بلا مكتبة بيقول «المكتبة ما اتحمّلتش» — مش `ReferenceError` صامت', tst.trim().slice(0,60));

  is(errors.length === 0, 'صفر خطأ في الكونسول في دورة الجرد كلها', errors.join(' | '));
  await ctx.close();
}

// ── 🔴 نطاق الجرد = **فلاتر التاب دي لوحدها** (v1.7.0 · طلب أحمد) ──
//
// 🔴 **العيلة اللي البنود دي بتمسكها:** الجرد كان بياخد نطاقه من فلتر تاب
//    «الأوردرات»، فضغطة فلتر **للقراءة** كانت بتحدد نطاق جرد جاي — والموظف
//    اللي بيسكن مش شايف الفلتر ده أصلاً، فقايمة «مفقودة» بتطلع غلط
//    **بلا أي تفسير على الشاشة**. دلوقتي التاب ليها فلترينها هي.
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  await page.click('#tabAuditBtn');
  await page.waitForTimeout(250);

  // 🔴 **فلترين بالظبط وبأسمائهم** — البند بيقرا الليبلات بترتيبها على
  //    الشاشة: الاسم لوحده بيعدّي لو اتبدّلوا مكانهم، والعدد لوحده بيعدّي
  //    لو فلتر اتشال وفلتر تاني اتضاف مكانه.
  const audLbls = await page.$$eval('#audMsRow .flt-label', e => e.map(x => x.textContent.trim()));
  is(JSON.stringify(audLbls) === JSON.stringify(['المندوب', 'موقع الشحنة']),
     '🔴 تاب الجرد فيه **فلترينه هو**: المندوب · موقع الشحنة', JSON.stringify(audLbls));

  // 🔴 **المندوب هنا مجموعة مش اسم** — «مناديب/بوسطة/شو روم»، مش `Saif`.
  //    قايمة بأسماء المناديب كانت هتخلّي الخطوة الأولى أطول من الجرد نفسه.
  await page.click('#audMsBtn-cgroup');
  await page.waitForTimeout(150);
  const groups = await page.$$eval('#audMsList-cgroup .ms-item-label', e => e.map(x => x.textContent.trim()));
  is(groups.every(g => ['مناديب', 'بوسطة', 'شو روم'].includes(g)) && groups.length === 3,
     '🔴 وقايمة المندوب **مجموعات** (مناديب · بوسطة · شو روم) مش أسماء مناديب', JSON.stringify(groups));

  // ⚠️ اختيار فاضي = الكل
  is(num(await page.textContent('#audNScope')) === READY_TOTAL,
     '⚠️ وبلا أي اختيار النطاق = الطابور كله — «ما اخترتش» ≠ «مفيش»');

  // فلتر «بوسطة» **من جوّه تاب الجرد**
  await page.click(`#audMsList-cgroup .ms-item:has-text("بوسطة")`);
  await page.waitForTimeout(250);
  is(num(await page.textContent('#audNScope')) === READY_COURIER.bosta,
     '🔴 والاختيار من هنا بيغيّر النطاق فورًا — قبل ما الجرد يبدأ',
     await page.textContent('#audNScope'));
  const tf0 = await page.textContent('#audTitle');
  is(tf0.includes(`بوسطة ${READY_COURIER.bosta}`) && !tf0.includes('مناديب'),
     '🔴 والعنوان بيقول النطاق **بمجموعته هي بس**', tf0.trim());

  // 🔴 **فلتر تاب «الأوردرات» مالوش أي أثر هنا** — البند الأهم في الكتلة
  await page.click('#tabQueueBtn');
  await page.waitForTimeout(150);
  await page.click('#qChips [data-fk="showroom"]');
  await page.waitForTimeout(250);
  is(await page.$$eval('#qBody tr', e => e.length) === READY_COURIER.showroom,
     'فلتر «شو روم» اشتغل فعلاً في تاب الأوردرات');
  await page.click('#tabAuditBtn');
  await page.waitForTimeout(250);
  is(num(await page.textContent('#audNScope')) === READY_COURIER.bosta,
     '🔴 **ونطاق الجرد ما اتغيّرش** — الفلترين مستقلين تمامًا (قرار أحمد 17-09-2026)',
     await page.textContent('#audNScope'));

  // ── البدء: الفلاتر بتتقفل والنطاق بيبقى لقطة ──
  await page.click('#audStartBtn');
  await page.waitForTimeout(250);
  is(await page.$eval('#audMsBtn-cgroup', el => el.disabled)
     && await page.$eval('#audMsBtn-where', el => el.disabled),
     '🔴 وبعد البدء الفلاتر **مقفولة** — قايمة شكلها شغّالة واختيار مالوش أثر بتقول إن النطاق اتغيّر وهو ما اتغيّرش');
  is(await page.isVisible('#audFltLock'), 'وسطر «النطاق اتثبّت» بيبان — القفل بيتقال مش بيتخمّن');
  is(await page.evaluate(() => audState.scopeLabel.includes('بوسطة')),
     '⚠️ والفلتر بالنص متسجّل للتصدير (شيت «الملخص») — ملف بلا نطاقه بيتقري «الجرد كله»');
  // نداء مباشر على الفلتر المقفول — الحارس التاني، مش الـ `disabled` بس
  await page.evaluate(() => msToggleItem('aud', 'cgroup', 'مناديب'));
  await page.waitForTimeout(200);
  is(num(await page.textContent('#audNScope')) === READY_COURIER.bosta,
     '🔴 والنطاق **لقطة** — حتى بنداء مباشر على الفلتر بعد البدء');

  // سكان أوردر في الطابور بس بره النطاق → سبب مستقل
  await page.fill('#audScanInput', '7212000000001');
  await page.press('#audScanInput', 'Enter');
  await page.waitForTimeout(200);
  is(num(await page.textContent('#audNExtra')) === 1, 'وأوردر بره النطاق بيروح «موجودة خطأ»');
  await page.click('#audEndBtn');
  await page.waitForTimeout(250);
  const xs = await page.textContent('#audXList');
  is(xs.includes('بره نطاق الجرد'),
     '🔴 «جاهز للشحن بس بره النطاق» **سبب مستقل** — الطرد مكانه صح والفعل مختلف');
  is(!xs.includes('مش المفروض تكون'),
     '⚠️ ومابيتقالش عليه إنه غلط — حكم غلط على طرد سليم أسوأ من مفيش حكم');

  // 🔴 الحفظ في الجلسة — refresh وسط جرد ١٢٦ طرد كان بيمسح ساعة شغل
  await page.reload();
  await page.waitForSelector('#qBody tr');
  await page.click('#tabAuditBtn');
  await page.waitForTimeout(250);
  is(num(await page.textContent('#audNScope')) === READY_COURIER.bosta
     && num(await page.textContent('#audNExtra')) === 1,
     '🔴 الجرد بيرجع بعد refresh — النطاق والسكانات مش بتضيع');
  is(await page.isVisible('#audSecMiss'),
     'وحالة «انتهى» بترجع كما هي — مش بترجع لأول الجرد');
  is(await page.$eval('#audMsBtn-cgroup', el => el.disabled),
     'والفلاتر بترجع **مقفولة** — الجرد لسه مقفول، فالنطاق لسه لقطة');

  // «جرد جديد» بيفك القفل
  page.once('dialog', d => d.accept());
  await page.click('#audResetBtn');
  await page.waitForTimeout(250);
  is(!(await page.$eval('#audMsBtn-cgroup', el => el.disabled)),
     '⚠️ و«جرد جديد» بيفك القفل — الفلاتر بتتفك من غير ما تتمسح');
  is(errors.length === 0, 'وصفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ── 🔴 فشل الاستعلام التلقائي — لازم يبان (طلب أحمد 16-09-2026) ──
//
// الاستعلام بقى **تلقائي** مع «إنهاء الجرد»، والخطر الجديد اللي جه معاه إن
// الفشل يبقى **صامت**: الشاشة بتقول «حالته لسه مش معروفة» والموظف مش عارف
// إن فيه محاولة حصلت أصلاً — فيستنى حاجة مش جاية. أشهر سبب هنا إن
// `ready-orders-worker` لسه أقدم من `1.2.0` (بند مفتوح في `CLAUDE.md`).
{
  const { page, ctx, errors } = await newPage();
  state.lookupFail = true;
  const before = state.lookupBodies.length;
  await page.goto(`${BASE}/ready-orders.html`);
  await page.waitForSelector('#qBody tr');
  await page.click('#tabAuditBtn');
  await page.waitForTimeout(200);
  await page.click('#audStartBtn');
  await page.waitForTimeout(200);
  await page.fill('#audScanInput', '9999000011112');
  await page.press('#audScanInput', 'Enter');
  await page.waitForTimeout(250);
  await page.click('#audEndBtn');
  await page.waitForTimeout(700);
  is(state.lookupBodies.length === before + 1, 'النداء التلقائي اتبعت فعلاً على الإنهاء');
  const ft = await page.textContent('.toast-container');
  is(ft.includes('1.2.0'),
     '🔴 وفشل الاستعلام التلقائي **بيسمّي النسخة المطلوبة** — مش فشل صامت', ft.trim().slice(0, 80));
  const fx = await page.textContent('#audXList');
  is(fx.includes('مش معروفة') && !fx.includes('مالوش أوردر على شوبيفاي'),
     '⚠️ و«لسه ما استعلمناش» حالة صريحة — **مش** «مش موجود على شوبيفاي»: الفرق بين «اسأل تاني» و«الطرد ده مالوش أوردر»');
  is(fx.includes('إعادة محاولة'),
     'و«الفعل المطلوب» على الصف بيقول **إعادة المحاولة** — مش «اضغط استعلام» على شاشة اتستعلمت فعلاً');
  is(await page.isVisible('#audLookupBtn'),
     'والزرار بيفضل ظاهر — هو المخرج الوحيد بعد فشل النداء التلقائي');
  is((await page.textContent('#audLookupBtn')).includes('إعادة محاولة'),
     '🔴 وبنص **«إعادة محاولة»** — «استعلام عن الحالة الفعلية» على زرار بعد محاولة فاشلة بيتقري «ما اتحاولش»');

  // إعادة المحاولة بالإيد — نفس الزرار، والـ Worker بقى بيرد
  state.lookupFail = false;
  await page.click('#audLookupBtn');
  await page.waitForTimeout(600);
  is((await page.textContent('#audXList')).includes('Shipped'),
     'وإعادة المحاولة بتجيب الحالة الحقيقية');
  is(!(await page.isVisible('#audLookupBtn')), 'والزرار بيختفي بعد ما ينجح');
  // ⚠️ رد الـ`404` **المقصود** بيطلّع سطر «Failed to load resource» في
  //    الكونسول — ده الرد اللي البند ده زرعه بنفسه، مش خطأ في الصفحة.
  //    والباقي لازم يفضل **صفر**: استثناء مش متمسوك بيسكّت باقي السكربت.
  const realErr = errors.filter(e => !/Failed to load resource/.test(e));
  is(realErr.length === 0, 'وصفر خطأ حقيقي في الكونسول — غير رد الـ404 المزروع', realErr.join(' | '));
  await ctx.close();
}

// ── صفحة المشحون: ⛔ بلا جرد خالص ────────────────────────────
//
// 🔴 البند ده بيمنع إن التاب يتحقن هناك «بالقياس» — أوردر `Shipped` خرج
//    من المكتب بالتعريف، فجرده سؤال مالوش معنى. ولو اتقرر يوم، لازم الأول
//    يتقرر **إيه المفروض يكون موجود** هناك (قرار أحمد مش قرار كود).
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/shipped-orders.html`);
  await page.waitForSelector('#qBody tr');
  is(!(await page.$('#tabAuditBtn')) && !(await page.$('#viewAudit')),
     '⛔ صفحة المشحون **مالهاش** تاب جرد ولا ماركب جرد');
  is(!(await page.$('#audScanInput')), 'ولا مربع سكان');
  is(await page.evaluate(() => typeof ExcelJS === 'undefined'),
     '⚠️ ومكتبة التصدير مش محمّلة فيها — مكتبة بلا مستهلك تكلفة على كل تحميل');
  is(await page.isVisible('#viewQueue'), 'والطابور ظاهر عادي جوّه غلاف `#viewQueue`');
  is(errors.length === 0, 'وصفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
