// ══════════════════════════════════════════════════════════════
// docs/queues-check.mjs — فحص متصفح فعلي للهب كله
// (`index.html` · `Ready-Orders.html` · `Shipped-Orders.html`)
//
// 🔴 **ليه ملف واحد للتلاتة هنا؟** عكس قرار هب المخزن (خمس ملفات) — وده
//    مقصود: التلات صفحات دي بيقروا **نفس شكل الرد بالحرف** (طابور أوردرات
//    خام بنفس المفاتيح)، وبيشتقّوا منه بـ**نفس الدوال** في `shared/dco-rules.js`.
//    Worker وهمي واحد هنا مش تبسيط — هو **جزء من البند نفسه**: البند الأهم
//    في الملف ده إن **الرقم في الرئيسية == عدد صفوف الصفحة**، ومستحيل
//    تقيسه لو كل صفحة بتشوف بيانات مختلفة.
//
// ⚠️ **وبقى فيه تاب تاني في `Ready-Orders.html`** — «جرد المكتب» (v1.3.0،
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

// 🔴 **البحث بقى في رأس عمود «رقم الأوردر»** (v1.33.0 · Standards #47) —
//    القمع بيفتح قايمة عائمة فيها المربع، والكتابة بتعدّي على نفس الـ
//    debounce (٣٠٠ms)، و`Enter` بيقفل القايمة والفلتر بيفضل.
async function hsearch(page, v) {
  await page.click('#qTableWrap th[data-fk="search"] .th-flt');
  await page.fill('#hSearchInput', v);
  await page.waitForTimeout(450);
  await page.keyboard.press('Enter');
}

// 🔴 نسخة الهب — **مصدر واحد** (`TOOL_VERSION` في `shared/hub-config.js`، #24).
const HUB_VERSION = (fs.readFileSync(new URL('../shared/hub-config.js', import.meta.url), 'utf8')
  .match(/const TOOL_VERSION\s*=\s*'([^']+)'/) || [])[1];
if (!HUB_VERSION) { console.error('🔴 مقدرناش نقرا TOOL_VERSION من shared/hub-config.js'); process.exit(1); }

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
    // v1.39.0 — ملخّص «مستقبل حالة بوسطة» (Worker ≥ 1.9.0)
    else if (action === 'queue_summary') {
      // v1.44.0 — «متابعة التأجيلات» ليها Worker تاني بنفس الـ action وشكل رد مختلف
      if (url.hostname.startsWith('bosta-delivery-follow-up-worker')) {
        if (state.followUpFail) { status = 500; body = { ok:false, error:'الـ Worker وقع' }; }
        else body = { ok:true, windowDays:60, total:6, unsent:4, sent:2 };   // v1.45.0 — unsent/sent/total (التابات اتشالت)
      }
      else if (state.webhookFail) { status = 500; body = { ok:false, error:'الـ Worker وقع' }; }
      else body = { ok:true, main:{ total:7, attempts:{ '0':3, '1':2, '2':2 } }, inReturn:4 };
    }
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
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForTimeout(700);
  const u = new URL(page.url());
  is(u.pathname.endsWith('index.html') && u.searchParams.get('next') === 'Ready-Orders.html',
     'بلا جلسة → تحويل لـ index.html بـ ?next=', page.url());
  await ctx.close();
}
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForTimeout(900);
  is(await page.textContent('.app-title-text h1') === 'قسم الجاهز للشحن', 'الهيدر الموحّد بعنوان الصفحة');
  is(await page.isVisible('.hbtn-home'), 'زرار 🏠 الرئيسية موجود');
  is(await page.getAttribute('#activeUserBtn', 'aria-label') === 'تسجيل الخروج',
     'زرار الموظف عليه aria-label="تسجيل الخروج" (الـ ✕ لوحده مايتقريش)');
  const ver = (await page.textContent('#verBtn')).trim();
  const cl  = (await page.textContent('#clLatestVerBadge')).trim();
  // 🔴 **الرقم بيتقرا من `shared/hub-config.js` مش مكتوب هنا.** كان مكتوب
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
console.log('\n══ ② Ready-Orders.html ══');
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await hsearch(page, 'العصر');
  await page.waitForTimeout(450);
  const noteHits = await page.$$eval('#qBody tr', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)));
  is(noteHits.length === 1 && noteHits[0].includes('#55001'),
     '🔴 والبحث بيدوّر في نص الملحوظة', JSON.stringify(noteHits));
  await hsearch(page, '');
  await page.waitForTimeout(450);

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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  const msLabel = await page.$eval('#qChipsRow-courier .ms-chip', e => e.firstChild.textContent);
  is(msLabel.trim() === 'Bosta',
     '🔴 مربع الطابور **بيكتب في فلتر المندوب** — حالة واحدة مش اتنين', msLabel.trim());
  // ⚠️ أيقونة لوحة الفلاتر اتشالت مع اللوحة (v1.33.0) — الحالة بقت **في رأس
  //    العمود**: القمع بيتلوّن وعليه عدّاد.
  is(await page.$eval('#qTableWrap th[data-fk="courier"]', el => el.classList.contains('flt-on')),
     'قمع عمود «المندوب» بيولّع لما يبقى فيه فلتر شغّال (§3)');
  is(!(await page.$eval('#qClearAllBtn', el => el.classList.contains('inactive'))),
     'وزرار «مسح كل الفلاتر» بيبطّل يبقى باهت');

  // ضغطة تانية بترجّع الكل
  await page.click('#qChips [data-fk="bosta"]');
  await page.waitForTimeout(200);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === READY_TOTAL, 'ضغطة تانية على نفس المربع بترجّع الكل');

  // البحث — 🔴 من قمع رأس عمود «رقم الأوردر» (مفيش لوحة فلاتر)
  is(!(await page.$('#viewQueue .flt-header')) && !(await page.isVisible('#qFltState')),
     '⛔ مفيش لوحة فلاتر فوق جدول الطابور — الفلاتر في رؤوس الأعمدة (§47)');
  await hsearch(page, 'سارة');
  await page.waitForTimeout(450);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === 1, 'البحث باسم العميل بيفلتر', `شفت ${shown}`);
  await hsearch(page, 'lkjhg');
  await page.waitForTimeout(450);
  is(await page.isVisible('.q-none-row') && (await page.textContent('.q-none-row')).includes('مفيش صفوف مطابقة'),
     '🔴 «مفيش نتيجة للفلتر» ≠ «الطابور فاضي» — رسالتين مختلفتين');

  // 🔴 «مسح كل الفلاتر» بيرجّع كل حاجة لحالتها المحايدة (§3 — الحالة التالتة)
  await page.click('#qClearAllBtn');
  await page.waitForTimeout(300);
  shown = await page.$$eval('#qBody tr', e => e.length);
  is(shown === READY_TOTAL, '«مسح كل الفلاتر» بيرجّع الطابور كامل', `شفت ${shown}`);
  is((await page.$$eval('#qTableWrap th.flt-on', e => e.length)) === 0
     && (await page.$eval('#qClearAllBtn', el => el.classList.contains('inactive'))),
     '🔴 وبيرجّع القمعات والزرار لحالتهم المحايدة بالظبط');

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
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForSelector('#qBody tr');
  await page.click('#qTableWrap th[data-fk="where"] .th-flt');
  await page.waitForTimeout(200);
  const waItems = await page.$$eval('.hpop .hpop-item span', e => e.map(x => x.textContent.trim()));
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
  await page.click('.hpop .hpop-item:has-text("✅ في المكتب")');
  await page.waitForTimeout(250);
  is(await page.$$eval('#qBody tr', e => e.length) === 1,
     '🔴 والاختيار بيفلتر فعلاً — الليبل بيغيّر **العرض** بس، والفلترة على القيمة الخام');
  const waChip = await page.textContent('#qChipsRow-where');
  is(waChip.includes('✅ في المكتب') && !waChip.includes('Office'),
     'والشيب تحت الفلاتر بنفس الليبل — مش بالقيمة الخام', waChip.trim());
  is((await page.$eval('#qChipsRow-where .ms-chip', e => e.firstChild.textContent)).trim() === '✅ في المكتب',
     'وأول chip في سطر الفلتر بنفس الليبل كمان');
  await page.click('#qClearAllBtn');
  await page.waitForTimeout(250);

  // ── 🔴 فلتر «التغليف» — قيمتان وبس (v1.7.0 · طلب أحمد) ──
  await page.click('#qTableWrap th[data-fk="packed"] .th-flt');
  await page.waitForTimeout(200);
  const pkItems = await page.$$eval('.hpop .hpop-item span', e => e.map(x => x.textContent.trim()).sort());
  is(JSON.stringify(pkItems) === JSON.stringify(['تم التغليف', 'لم يتم التغليف'].sort()),
     '🔴 فلتر «التغليف» **قيمتان بالظبط** — مش قايمة تواريخ', JSON.stringify(pkItems));
  await page.click('.hpop .hpop-item:has-text("لم يتم التغليف")');
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
  await page.click('.hpop .hpop-item:has-text("لم يتم التغليف")');
  await page.click('.hpop .hpop-item:has-text("تم التغليف")');
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
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForSelector('#qBody tr');

  const chipText = () => page.$$eval('#qWaChips .zchip', e => e.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  const labels = (await chipText()).map(t => t.replace(/\s*\d+$/, '').trim());
  is(JSON.stringify(labels) === JSON.stringify(['✅ في المكتب', '⚠ المخزن', '⚠ مع المندوب', '—']),
     '🔴 أربع مربعات **بترتيب ثابت** — الترتيب بالعدد كان بيرقّصهم مكانهم مع كل تحديث',
     JSON.stringify(labels));

  // 🔴 **نفس ليبل القايمة ونفس نص البادج في العمود** — تلات أماكن لنفس
  //    القيمة، وأي فرق بينهم معناه إن الموظف بيتعلّمها أكتر من مرة.
  await page.click('#qTableWrap th[data-fk="where"] .th-flt');
  await page.waitForTimeout(200);
  const msLabels = await page.$$eval('.hpop .hpop-item span', e => e.map(x => x.textContent.trim()));
  is(msLabels.every(l => labels.includes(l)),
     '🔴 وليبل كل مربع == ليبل القايمة بالحرف', JSON.stringify([labels, msLabels]));
  await page.click('#qTableWrap th[data-fk="where"] .th-flt');

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
  is((await page.$eval('#qChipsRow-where .ms-chip', e => e.firstChild.textContent)).trim() === '⚠ المخزن',
     '🔴 والضغطة **بتكتب في فلتر «موقع الشحنة»** نفسه — الـ chip بقى بنفس الليبل');
  is((await page.textContent('#qChipsRow-where')).includes('⚠ المخزن'),
     'وشيب الفلتر تحت اللوحة ظهر بيه — مش حالة مخفية فوق');
  is(await page.$eval('#qWaChips .zchip:nth-child(2)', el => el.classList.contains('on')),
     'والمربع نفسه **مولّع** — حالة واحدة في الاتجاهين');

  // ⚠️ والاتجاه التاني: اختيار من القايمة بيولّع المربع
  await page.click('#qClearAllBtn');
  await page.waitForTimeout(200);
  await page.click('#qTableWrap th[data-fk="where"] .th-flt');
  await page.click('.hpop .hpop-item:has-text("✅ في المكتب")');
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
for (const [file, total] of [['Ready-Orders.html', 'الجاهز'], ['Shipped-Orders.html', 'المشحون']]) {
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await hsearch(page, 'صبري محمد');
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
  await page.goto(`${BASE}/Shipped-Orders.html`);
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
for (const [file, label] of [['Ready-Orders.html', 'الجاهز للشحن'], ['Shipped-Orders.html', 'المشحون']]) {
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForSelector('#qBody tr');
  is(await page.isVisible('#qTrunc'), 'الاقتطاع بيطلّع بانر **منفصل** عن بانر الفشل');
  is(!(await page.isVisible('#qFail')), 'وبانر الفشل مابيظهرش مع الاقتطاع — دول حالتين مختلفتين');
  await ctx.close();
  state.truncated = false;
}

// ══════════════════════════════════════════════════════════════
// ⑤ طابور «مشحون» — رقم التتبع وحارس الفلفلمنت
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑤ Shipped-Orders.html ══');
{
  const { page, ctx, errors } = await newPage();
  state.calls.length = 0;
  await page.goto(`${BASE}/Shipped-Orders.html`);
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
  // v1.38.0 — زرار التحديث من غير بادج الرقم، والعدد من غير كلمة «أوردر»
  is(!(await page.$('#badgeReady')) && (await page.textContent('#btnReady')).replace(/\s+/g,'') === '↻تحديث',
     'زرار التحديث = ↻ + «تحديث» وبس — مفيش بادج يكرر الرقم', (await page.textContent('#btnReady')).trim());
  is(!(await page.textContent('#rowReady .eco-row-num')).includes('أوردر')
     && (await page.getAttribute('#cntReady', 'aria-label')) === `${READY_TOTAL} أوردر`,
     'كلمة «أوردر» اتشالت من جنب العدد — ولسه في `aria-label` لقارئ الشاشة');

  // الطابور التاني اتجاب كمان — القايمة بتتبني من `homeQ` مش بالإيد
  is(!(await page.textContent('#cntShipped')).includes('—'),
     '🔴 كل صف في الرئيسية اتجاب فعلاً — مفيش صف عدّاده فضل «—» للأبد');

  // 🔴 v1.40.0 — «مستحق التحصيل» اتشال من الرئيسية (طلب أحمد) — في الصفّين
  is((await page.textContent('#moneyReady')).trim() === '' && (await page.textContent('#moneyShipped')).trim() === ''
     && (await page.locator('.eco-money').count()) === 0,
     '⛔ مفيش «مستحق التحصيل» ولا «مدفوع مقدمًا» في صفّي الجاهز والمشحون');

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
// ⑪ 🔴 الرئيسية بلا تحديث تلقائي — الكاش الأول والصف بيقول عمره (v1.38.0)
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑪ الرئيسية: الكاش الأول · بلا تايمر · عمر الرقم ══');
{
  const { page, ctx, errors } = await newPage();
  // ① صفحة الطابور جابت ← الرئيسية بتاخد رقمها من الكاش بصفر نداء
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForTimeout(1200);
  await page.goto(`${BASE}/Shipped-Orders.html`);
  await page.waitForTimeout(1000);
  state.calls.length = 0;
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1400);
  is(!state.calls.includes('get_ready_queue') && !state.calls.includes('get_shipped_queue'),
     '🔴 فتح الصفحتين كتب الكاش ← الرئيسية رسمت الطابورين **بصفر نداء**', state.calls.join(','));
  is(num(await page.textContent('#cntReady')) === READY_TOTAL && num(await page.textContent('#cntShipped')) === SHIPPED_TOTAL,
     'والأرقام من الكاش == الأرقام من الشبكة');
  is(state.calls.includes('get_orders') && state.calls.filter(a => a === 'fetch_candidates').length === 2,
     '«رفع بوسطة» مالوش كاش لسه ← اتجاب (التلات أوضاع)', state.calls.join(','));
  const bc = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_bosta') || 'null'));
  is(bc && ['s1','return','exchange'].every(m => typeof bc[m]?.n === 'number' && bc[m].at),
     'جلب «رفع بوسطة» كتب عدّاد كل وضع في الكاش', JSON.stringify(bc));

  // ② رجوع للرئيسية (زي 🏠) ← صفر نداء خالص
  state.calls.length = 0;
  await page.reload();
  await page.waitForTimeout(1200);
  const dataCalls = state.calls.filter(a => ['get_ready_queue','get_shipped_queue','get_orders','fetch_candidates'].includes(a));
  is(dataCalls.length === 0, '🔴 الرجوع للرئيسية والكاش أحدث من ١٠ دقايق = **صفر نداء بيانات**', state.calls.join(','));
  is(num(await page.textContent('#cntBosta')) === 0 && !(await page.textContent('#cntBosta')).includes('—'),
     '«رفع بوسطة» اترسم من الكاش برقمه');

  // ③ كاش أقدم من ١٠ دقايق ← جلب جديد
  await page.evaluate(() => {
    for (const k of ['dco_queue_ready']) {
      const c = JSON.parse(sessionStorage.getItem(k));
      c.at = new Date(Date.now() - 11 * 60000).toISOString();
      sessionStorage.setItem(k, JSON.stringify(c));
    }
  });
  state.calls.length = 0;
  await page.reload();
  await page.waitForTimeout(1200);
  is(state.calls.includes('get_ready_queue') && !state.calls.includes('get_shipped_queue'),
     'كاش «الجاهز» عمره ١١ دقيقة ← اتجاب لوحده، و«المشحون» لسه من الكاش', state.calls.join(','));

  // ④ مفيش تايمر ولا جلب عند الرجوع للتاب
  is(await page.evaluate(() => typeof armAuto === 'undefined' && typeof ECO_AUTO_REFRESH_MS === 'undefined'),
     '🔴 مفيش تحديث تلقائي في الرئيسية (`armAuto`/`ECO_AUTO_REFRESH_MS` اتشالوا)');
  state.calls.length = 0;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(500);
  is(state.calls.length === 0, '⛔ الرجوع للتاب (`visibilitychange`) مابيعملش أي نداء', state.calls.join(','));

  // ⑤ الصف بيقول عمره — نفس سلّم `agoInfo`
  // ⚠️ الألوان عليها `transition` — القراءة الفورية بتجيب لون البداية، فبنقفل
  //    الحركة في الاختبار بس.
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' });
  const look = async (mins) => page.evaluate((m) => {
    homeQ.ready.at = new Date(Date.now() - m * 60000);
    renderFreshness();
    const row = document.getElementById('rowReady'), btn = document.getElementById('btnReady');
    return { cls: [...row.classList].find(c => c.startsWith('age-')),
             fill: row.style.getPropertyValue('--fill'),
             val: document.getElementById('agoReady').innerText.replace(/\s+/g, ' ').trim(),
             btnBg: getComputedStyle(btn).backgroundColor,
             edge: getComputedStyle(row, '::before').content, bg: getComputedStyle(row).backgroundColor,
             box: getComputedStyle(row.querySelector('.eco-agebox')).backgroundColor };
  }, mins);
  const css = await page.evaluate(() => {
    const v = n => { const d = document.createElement('i'); d.style.color = `var(${n})`; document.body.append(d);
                     const c = getComputedStyle(d).color; d.remove(); return c; };
    return { green: v('--green'), accent: v('--accent'), amber: v('--amber'), red: v('--red') };
  });
  const a2 = await look(2), a10 = await look(10), a35 = await look(35), a130 = await look(130);
  is(a2.cls === 'age-fresh' && a10.cls === 'age-ok' && a35.cls === 'age-warn' && a130.cls === 'age-stale',
     'مرحلة الصف بتمشي مع `agoInfo`: ٢ د أخضر · ١٠ د أزرق · ٣٥ د كهرماني · ساعتين أحمر',
     [a2.cls, a10.cls, a35.cls, a130.cls].join(' · '));
  is(a2.btnBg === css.green && a10.btnBg === css.accent && a35.btnBg === css.amber && a130.btnBg === css.red,
     '🔴 لون زرار التحديث == لون المرحلة (بعد ساعة أحمر)', [a2.btnBg, a10.btnBg, a35.btnBg, a130.btnBg].join(' · '));
  is(a130.edge === 'none' && a35.edge === 'none', '⛔ مفيش حافة جانبية ملوّنة على الصف (قرار أحمد 22-10-2026) — لون العمر على الخلفية والمربع والزرار بس', a130.edge);
  is(a10.bg !== a35.bg && a35.bg !== a130.bg, '🔴 والخلفية لسه بتتلوّن بالعمر (هي اللي شالت دور الحافة)', [a10.bg, a35.bg, a130.bg].join(' · '));
  is(Number(a10.fill) < Number(a35.fill) && Number(a130.fill) === 1,
     'الخلفية والشريط بيتملوا تدريجيًا (`--fill`) وبيقفوا عند ساعة', [a10.fill, a35.fill, a130.fill].join(' · '));
  is(a35.box !== a130.box, 'مربع «آخر تحديث منذ:» بيتلوّن مع المرحلة');
  is(/^35\s*دقيقة$/.test(a35.val) && /^10\s*دقايق$/.test(a10.val),
     'المدة بالدقايق بس — من غير «يفضّل تحدّث»', [a10.val, a35.val].join(' · '));
  is(a130.val === 'ساعتين' && !a130.val.includes('قديم'), 'بعد الساعة: «ساعتين» من غير «الرقم قديم»', a130.val);
  is((await page.textContent('#rowReady .eco-agebox-lbl')).trim() === 'آخر تحديث منذ:', 'العنوان «آخر تحديث منذ:»');
  // 🕐 v1.47.0: الساعة بس جنب العنوان (صباحاً/مساءً)، والتاريخ اتشال (طلب أحمد) وبقى في `title` الصندوق
  const stamp = (await page.textContent('#stampReady')).replace(/\s+/g, ' ').trim();
  is(/^\d{2}:\d{2} (صباحاً|مساءً)$/.test(stamp), '🕐 الساعة بس بالشكل hh:mm صباحاً/مساءً (مش ص/م)، بلا تاريخ', stamp);
  is(await page.evaluate(() => !document.querySelector('#rowReady .eco-stamp-chip')), '⛔ chip التاريخ والوقت اتشال من صندوق «آخر تحديث»');
  is(await page.evaluate(() => /\d{2}\/\d{2}\/\d{4}/.test(document.querySelector('#rowReady .eco-agebox').title)),
     'والتاريخ لسه متاح في `title` الصندوق (تلميح عند التمرير)');

  // ⑥ وقت التحديث: الرقم بيتبدّل بـ ↻ بتلف، والزرار «جاري التحديث»
  await page.route('**/ready-orders-worker*/**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('action') === 'get_ready_queue')
      await new Promise(r => setTimeout(r, 1500));
    return route.fallback();
  });
  await page.click('#btnReady');
  await page.waitForTimeout(300);
  const ld = await page.evaluate(() => {
    const row = document.getElementById('rowReady'), btn = document.getElementById('btnReady');
    return { loading: row.classList.contains('is-loading'),
             countHidden: getComputedStyle(document.getElementById('cntReady')).display === 'none',
             spinShown: getComputedStyle(row.querySelector('.eco-count-spin')).display !== 'none',
             btnDisabled: btn.disabled, btnTx: btn.innerText.replace(/\s+/g, ''),
             val: document.getElementById('agoReady').innerText.trim() };
  });
  is(ld.loading && ld.countHidden && ld.spinShown, '🔴 وقت التحديث الرقم الكبير بيتبدّل بأيقونة ↻ بتلف', JSON.stringify(ld));
  is(ld.btnDisabled && ld.btnTx === '↻جاري' && ld.val === 'جاري التحديث…',
     'والزرار النحيف مقفول ومكتوب «جاري»، والمربع بيقول «جاري التحديث…»', JSON.stringify(ld));
  await page.waitForTimeout(1800);
  const done = await page.evaluate(() => ({
    loading: document.getElementById('rowReady').classList.contains('is-loading'),
    cls: [...document.getElementById('rowReady').classList].find(c => c.startsWith('age-')),
    txt: document.getElementById('btnReady').innerText.replace(/\s+/g, '') }));
  is(!done.loading && done.cls === 'age-fresh' && done.txt === '↻تحديث',
     'بعد التحديث الصف رجع أخضر والزرار «تحديث»', JSON.stringify(done));

  // ⑦ صفحة «رفع بوسطة» بتكتب كاش الرئيسية
  await page.evaluate(() => sessionStorage.removeItem('dco_queue_bosta'));
  await page.goto(`${BASE}/Bosta-Orders-Upload.html`);
  await page.waitForTimeout(2500);
  const bc2 = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_bosta') || 'null'));
  is(bc2 && ['s1','return','exchange'].every(m => typeof bc2[m]?.n === 'number'),
     '🔴 فتح «رفع بوسطة» كتب عدّاد التلات أوضاع في كاش الرئيسية', JSON.stringify(bc2));

  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ⑪-ب «مستقبل حالة بوسطة» — الصف الرابع في الحالات الانتقالية (v1.39.0)
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑪-ب صف «مستقبل حالة بوسطة» ══');
{
  const { page, ctx, errors } = await newPage();
  state.calls.length = 0;
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1400);
  is(state.calls.includes('queue_summary'), 'الصف بينادي `queue_summary` (مش `list_events`)', state.calls.join(','));
  is(!state.calls.includes('list_events'), '⛔ والرئيسية ما سحبتش الأحداث', state.calls.join(','));
  const secs = await page.evaluate(() => [...document.querySelectorAll('.eco-home-sec')].map(sec => ({
    title: sec.querySelector('.eco-home-sec-title')?.textContent.trim(),
    rows: [...sec.querySelectorAll('.eco-qrow')].map(r => r.id) })));
  is(secs[0].title === 'أوردرات بوسطة' && JSON.stringify(secs[0].rows) === '["rowBosta","rowWebhook","rowFollowUp"]',
     '🔴 «أوردرات بوسطة» أول قسم وفيه «رفع بوسطة» و«متابعة شحنات بوسطة» و«متابعة التأجيلات»', JSON.stringify(secs));
  is(secs[1].title === 'الحالات الانتقالية' && JSON.stringify(secs[1].rows) === '["rowReady","rowShipped"]',
     'و«الحالات الانتقالية» فيه الجاهز والمشحون بس');
  is((await page.textContent('#rowWebhook .eco-card-name')).trim() === 'متابعة شحنات بوسطة', 'الاسم «متابعة شحنات بوسطة»');
  is(num(await page.textContent('#cntWebhook')) === 7, 'الرقم الكبير == عدد أرقام التتبع تحت التوصيل', await page.textContent('#cntWebhook'));
  const chips = (await page.textContent('#chipsWebhook')).replace(/\s+/g, ' ');
  is(chips.includes('محاولتين فأكتر 2') && chips.includes('محاولة واحدة 2') && chips.includes('0 محاولات 3') && chips.includes('In-Return 4'),
     'المربعات: المحاولات + In-Return بأعدادها', chips);
  const lines = await page.$$eval('#chipsWebhook .eco-chips-line', ls => ls.map(l => ({ t: l.textContent.replace(/\s+/g, ' '), y: l.getBoundingClientRect().top })));
  is(lines.length === 2 && lines[0].t.includes('محاولات') && !lines[0].t.includes('In-Return')
     && lines[1].t.includes('In-Return') && !lines[1].t.includes('محاولة') && lines[1].y > lines[0].y,
     '🔴 «In-Return» في سطر لوحده **تحت** مربعات المحاولات', JSON.stringify(lines));
  is((await page.textContent('#moneyWebhook')).trim() === '', 'بلا سطر «مستحق التحصيل»');
  is(!(await page.textContent('#agoWebhook')).includes('ما اتحدّثش'), 'مربع «آخر تحديث منذ:» اتملّى');
  const wc = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_webhook') || 'null'));
  is(wc && wc.data.main.total === 7, 'الكاش اتكتب بالرد الخام', JSON.stringify(wc));
  is(await page.evaluate(() => document.querySelectorAll('.eco-tools-grid a[href="Bosta-Webhook-Status-Receiver.html"]').length === 0),
     '⛔ ومفيش كارت مكرّر في «أدوات أخرى»');

  // الرجوع بالكاش = صفر نداء
  state.calls.length = 0;
  await page.reload();
  await page.waitForTimeout(1200);
  is(!state.calls.includes('queue_summary') && num(await page.textContent('#cntWebhook')) === 7,
     '🔴 الرجوع للرئيسية والكاش جديد = صفر نداء والرقم من الكاش', state.calls.join(','));

  // زرار التحديث اليدوي
  state.calls.length = 0;
  await page.click('#btnWebhook');
  await page.waitForTimeout(700);
  is(state.calls.filter(a => a === 'queue_summary').length === 1, 'زرار «تحديث» الصف بيجيب من الشبكة');

  // صفحة الأداة بتكتب نفس الكاش
  await page.evaluate(() => sessionStorage.removeItem('dco_queue_webhook'));
  await page.goto(`${BASE}/Bosta-Webhook-Status-Receiver.html`);
  await page.waitForTimeout(1500);
  const pc = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_webhook') || 'null'));
  is(pc && typeof pc.data.main?.total === 'number' && typeof pc.data.inReturn === 'number',
     '🔴 فتح صفحة الأداة كتب كاش الرئيسية بنفس الشكل الخام', JSON.stringify(pc));
  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}
{
  // فشل الـ Worker: «تعذّر» مش صفر، وباقي الصفوف مش متأثرة
  state.webhookFail = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1400);
  is((await page.textContent('#cntWebhook')).trim() === 'تعذّر', '🔴 فشل الـ Worker = «تعذّر» مش `0`');
  is(await page.isVisible('#failWebhook'), 'ورسالة الفشل ظاهرة');
  is(num(await page.textContent('#cntReady')) === READY_TOTAL, 'وفشله ما خبّاش باقي الطوابير (`allSettled`)');
  state.webhookFail = false;
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ⑬ الرئيسية: صف «متابعة التأجيلات» (v1.44.0 · اتعدّل v1.45.0) — Worker `bosta-delivery-follow-up-worker`
// 🔴 الرقم الكبير = «محتاجين رسالة» (`unsent`)، والمربعات = اتبعتلهم رسالة · إجمالي الشحنات.
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑬ الرئيسية: متابعة التأجيلات ══');
{
  state.calls.length = 0;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1400);
  is((await page.textContent('#rowFollowUp .eco-card-name')).trim() === 'متابعة التأجيلات', 'الاسم «متابعة التأجيلات»');
  is(num(await page.textContent('#cntFollowUp')) === 4, '🔴 الرقم الكبير = محتاجين رسالة (`unsent`) مش الإجمالي', await page.textContent('#cntFollowUp'));
  const chips = await page.$$eval('#chipsFollowUp .eco-chip', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  is(chips.length === 2 && chips[0].includes('اتبعتلهم رسالة') && chips[0].includes('2') && chips[1].includes('إجمالي الشحنات') && chips[1].includes('6'),
     'المربعين: اتبعتلهم رسالة (2) · إجمالي الشحنات (6)', JSON.stringify(chips));
  is(!chips.some(c => c.includes('مستنيين رد') || c.includes('محتاجين تصرّف')), '⛔ مربعات «مستنيين رد» و«محتاجين تصرّف» اتشالت (الحالات دي مابقتش موجودة)');
  is((await page.getAttribute('#rowFollowUp', 'href')) === 'Bosta-Delivery-Follow-Up.html', 'الصف بيفتح صفحة الأداة');
  const fc = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dco_queue_followup') || 'null'));
  is(fc && fc.data.unsent === 4 && fc.data.sent === 2 && fc.data.total === 6, 'الكاش اتكتب بالرد الخام (total · unsent · sent)', JSON.stringify(fc));
  is(!(await page.textContent('#agoFollowUp')).includes('ما اتحدّثش'), 'مربع «آخر تحديث منذ:» اتملّى');
  state.calls.length = 0;
  await page.reload();
  await page.waitForTimeout(1200);
  is(!state.calls.includes('queue_summary') && num(await page.textContent('#cntFollowUp')) === 4,
     '🔴 الرجوع بالكاش الجديد = صفر نداء والرقم من الكاش', state.calls.join(','));
  await ctx.close();
}
{
  state.followUpFail = true;
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1400);
  is((await page.textContent('#cntFollowUp')).trim() === 'تعذّر', '🔴 فشل الـ Worker = «تعذّر» مش `0`');
  is(await page.isVisible('#failFollowUp'), 'ورسالة الفشل ظاهرة');
  is(num(await page.textContent('#cntWebhook')) === 7, 'وفشله ما خبّاش صف «متابعة شحنات بوسطة» (`allSettled`)');
  state.followUpFail = false;
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════
// ⑫ الرئيسية: هوية الصفوف · حاويات الأقسام · شارة «أقدم رقم» · أيقونات الأدوات (v1.43.0)
// 🔴 والبند الأهم: **سلّم العمر ما اتلمسش** — الهوية بتتحط على الأيقونة والاسم
//    والكود والرقم بس، وبألوان بعيدة عن الأخضر والأزرق والكهرماني والأحمر.
// ══════════════════════════════════════════════════════════════
console.log('\n══ ⑫ الرئيسية: هوية الصفوف وحاويات الأقسام والأدوات ══');
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/index.html`);
  await page.waitForTimeout(1400);
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' });
  if (process.env.ECO_SHOT) await page.screenshot({ path: process.env.ECO_SHOT, fullPage: true });

  // ① الحاويات
  const secs = await page.evaluate(() => [...document.querySelectorAll('.eco-home-sec')].map(sec => {
    const cs = getComputedStyle(sec);
    return { cls: [...sec.classList].filter(c => c.startsWith('sec-')).join(), title: sec.querySelector('.eco-home-sec-title')?.textContent.trim(),
             sub: sec.querySelector('.eco-home-sec-sub')?.textContent.trim(), svg: !!sec.querySelector('.eco-home-sec-ico svg'),
             bg: cs.backgroundColor, bw: parseFloat(cs.borderTopWidth),
             tsize: parseFloat(getComputedStyle(sec.querySelector('.eco-home-sec-title')).fontSize) };
  }));
  is(secs.length === 4 && secs.map(x => x.cls).join('|') === 'sec-bosta|sec-flow|sec-tools|sec-tools',
     '🎨 أربع حاويات: بوسطة · الحالات · أدوات العمليات · أدوات أخرى', JSON.stringify(secs.map(x => x.cls)));
  is(secs.map(x => x.title).join('|') === 'أوردرات بوسطة|الحالات الانتقالية|أدوات العمليات|أدوات أخرى', 'عناوين الحاويات بالاسم المعتمد', secs.map(x => x.title).join('|'));
  is(secs.every(x => x.svg && x.sub && x.tsize >= 17), 'كل حاوية: أيقونة SVG + عنوان فرعي + عنوان ١٧px', JSON.stringify(secs));
  // 🎨 v1.47.0: بلا إطار — الحاوية مجرد عنوان بخطين وصفوف
  is(secs.every(x => x.bg === 'rgba(0, 0, 0, 0)' && x.bw === 0), '🎨 بلا إطار ولا خلفية (الإطار والخلفية الملوّنة اتشالوا)', JSON.stringify(secs.map(x => [x.bg, x.bw])));
  const hd = await page.evaluate(() => [...document.querySelectorAll('.eco-home-sec')].map(sec => {
    const h = sec.querySelector('.eco-home-sec-hd'), r = h.getBoundingClientRect(), m = sec.querySelector('.eco-sec-mid').getBoundingClientRect();
    return { off: Math.abs((m.left + m.right) / 2 - (r.left + r.right) / 2), lns: [...h.querySelectorAll('.eco-sec-ln')].map(l => l.getBoundingClientRect().width),
             role: h.getAttribute('role'), exp: h.getAttribute('aria-expanded'), chev: !!h.querySelector('.eco-sec-chev svg'),
             open: !sec.classList.contains('is-collapsed') };
  }));
  is(hd.every(x => x.off < 3 && x.lns.length === 2 && x.lns.every(w => w > 20)), '🎨 العنوان في النص بخطين على الجانبين', JSON.stringify(hd.map(x => [x.off, x.lns])));
  is(hd.every(x => x.role === 'button' && x.exp === 'true' && x.chev && x.open), '🔴 الهيدر زرار طي (`aria-expanded`) فيه سهم، وكله **مفتوح عند الفتح**');

  // ② هوية الصفوف — أيقونة SVG بمربع مصمت
  const ids = ['rowBosta', 'rowWebhook', 'rowReady', 'rowShipped'];
  const idv = await page.evaluate((ids) => ids.map(id => {
    const row = document.getElementById(id), ico = row.querySelector('.eco-card-ico');
    return { id, svg: !!ico.querySelector('svg'), txt: ico.textContent.trim(), img: !!ico.querySelector('img'),
             icoBg: getComputedStyle(ico).backgroundColor, icoSize: ico.getBoundingClientRect().width,
             name: getComputedStyle(row.querySelector('.eco-card-name')).color,
             code: getComputedStyle(row.querySelector('.eco-card-code')).color,
             cnt: getComputedStyle(row.querySelector('.eco-count')).color };
  }), ids);
  is(idv.every(r => r.svg && r.txt === '' && !r.img), '🔴 أيقونات الصفوف الأربعة SVG (مفيش إيموجي ولا صورة)', JSON.stringify(idv.map(r => [r.id, r.svg, r.txt])));
  is(await page.evaluate(() => !document.querySelector('img[src*="bosta-logo"]')), '⛔ لوجو بوسطة اتشال من الرئيسية');
  is(idv.every(r => r.icoSize === 42), 'مربع الأيقونة 42px (كثافة مضغوطة)', idv.map(r => r.icoSize).join());
  is(new Set(idv.map(r => r.icoBg)).size === 4, 'أربع ألوان هوية مختلفة', idv.map(r => r.icoBg).join(' | '));
  is(idv.every(r => r.icoBg === r.name && r.name === r.code && r.code === r.cnt),
     'الأيقونة والاسم والكود والرقم بلون الصف نفسه', JSON.stringify(idv.map(r => [r.icoBg, r.name, r.code, r.cnt])));
  const ageCols = await page.evaluate(() => ['--green', '--accent', '--amber', '--red'].map(n => {
    const d = document.createElement('i'); d.style.color = `var(${n})`; document.body.append(d);
    const c = getComputedStyle(d).color; d.remove(); return c; }));
  is(idv.every(r => !ageCols.includes(r.icoBg)), '🔴 وألوان الهوية **بعيدة** عن سلّم العمر (أخضر · أزرق · كهرماني · أحمر)', ageCols.join(' | '));

  // ③ سلّم العمر ما اتغيّرش جوّه الحاوية
  const look = await page.evaluate(() => {
    homeQ.ready.at = new Date(Date.now() - 35 * 60000); renderFreshness();
    const row = document.getElementById('rowReady');
    return { edge: getComputedStyle(row, '::before').content, box: getComputedStyle(row.querySelector('.eco-agebox')).backgroundColor,
             btn: getComputedStyle(document.getElementById('btnReady')).backgroundColor,
             num: getComputedStyle(row.querySelector('.eco-count')).color };
  });
  is(look.edge === 'none' && look.btn === ageCols[2],
     '🔴 صف عمره ٣٥ د: الزرار **كهرماني** (لون العمر) وبلا حافة — والرقم لسه بلون هويته', JSON.stringify(look));
  is(look.num !== ageCols[2], 'والرقم مش كهرماني');

  // ④ شارة «أقدم رقم» اتشالت (قرار أحمد 21-10-2026) — الملخّص المطوي بيقول عمر كل صف لوحده
  is(await page.evaluate(() => !document.querySelector('.eco-worst, #worstBosta, #worstFlow')), '⛔ شارة «أقدم رقم» اتشالت من عناوين الحاويات');

  // ④-ب الصف المضغوط: زرار نحيف بنفس ارتفاع الصندوق، والصندوق بالساعة جنب العنوان
  const cmp = await page.evaluate(() => {
    const row = document.getElementById('rowReady'), box = row.querySelector('.eco-agebox').getBoundingClientRect(),
          btn = document.getElementById('btnReady').getBoundingClientRect();
    return { rowH: Math.round(row.getBoundingClientRect().height), btnW: Math.round(btn.width), btnH: Math.round(btn.height), boxH: Math.round(box.height),
             top: !!row.querySelector('.eco-agebox-top .eco-agebox-lbl') && !!row.querySelector('.eco-agebox-top .eco-agebox-time'),
             cntFs: parseFloat(getComputedStyle(row.querySelector('.eco-count')).fontSize), edge: getComputedStyle(row, '::before').content };
  });
  is(cmp.btnW === 48 && Math.abs(cmp.btnH - cmp.boxH) <= 1, '🔴 زرار التحديث نحيف 48px وبنفس ارتفاع صندوق «آخر تحديث» (أرفع مش أصغر)', JSON.stringify(cmp));
  is(cmp.top, 'اللافتة والساعة في سطر واحد فوق المدة');
  is(cmp.cntFs === 34 && cmp.edge === 'none' && cmp.rowH <= 96, 'الصف مضغوط: عدّاد ٣٤px · بلا حافة · ارتفاع ≤ ٩٦px', JSON.stringify(cmp));

  // ⑤ الأدوات
  const tools = await page.evaluate(() => [...document.querySelectorAll('.eco-home-sec.sec-tools')].map(sec => {
    const grid = sec.querySelector('.eco-tools-grid');
    return { cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
             cards: [...grid.querySelectorAll('.eco-tool')].map(a => ({ href: a.getAttribute('href'), name: a.querySelector('.eco-card-name').textContent.trim(),
               svg: !!a.querySelector('.eco-card-ico svg'), txt: a.querySelector('.eco-card-ico').textContent.trim(),
               w: Math.round(a.getBoundingClientRect().width), ico: a.querySelector('.eco-card-ico').getBoundingClientRect().width,
               d: a.querySelector('.eco-card-ico svg').innerHTML.replace(/\s+/g, ' ') })) };
  }));
  is(tools[0].cols === 3 && tools[0].cards.length === 3 && tools[1].cols === 3 && tools[1].cards.length === 1,
     '🎨 الأدوات في ٣ أعمدة ثابتة (٣ كروت + كارت «أسماء المناديب»)', JSON.stringify(tools.map(t => t.cols)));
  is(tools[1].cards[0].w === tools[0].cards[0].w, '🔴 كارت «أسماء المناديب» **بنفس عرض** كروت أدوات العمليات (مش عرض الصف كله)', `${tools[1].cards[0].w} vs ${tools[0].cards[0].w}`);
  const allTools = [...tools[0].cards, ...tools[1].cards];
  is(allTools.every(c => c.svg && c.txt === '' && c.ico === 46), 'كل أيقونات الأدوات SVG بمربع ٤٦px (مفيش إيموجي)', JSON.stringify(allTools.map(c => [c.name, c.svg, c.txt, c.ico])));
  is(new Set(allTools.map(c => c.d)).size === 4, 'أربع أيقونات مختلفة');
  const [updI, codI, partI] = tools[0].cards.map(c => c.d);
  is(updI.includes('M20 11a8 8 0 0 0-14.5-4.5') && updI.includes('M12 7.5l4 2v5'), '«تحديث حالة الأوردرات»: صندوق جوّه سهمين دائريين (الصندوق ٨px عرض)');
  is(codI.includes('rx="2"') && codI.includes('M5 5h14M7 2h10'), '«تحصيل COD»: رزمة أوراق نقدية');
  is(partI.includes('M10 2.5L4 5v6.5') && partI.includes('M14 2.5l6 2.5v6.5') && partI.includes('M12 17l-4.5 4.5M12 17l4.5 4.5'),
     '«التسليم الجزئي»: صندوق متقسّم نصّين **+ سهم بيتفرّع**');
  is(tools[0].cards.map(c => c.href).join() === 'Order-Status-Updater.html,COD-Payment-Center.html,Partial-Delivery.html'
     && tools[1].cards[0].href === 'Courier-Names.html', 'روابط الكروت زي ما هي');

  // ⑤-ب طي الأقسام (v1.47.0): شريط ملوّن + ملخّص (اسم + رقم + المدة بلون العمر)، وكله مفتوح عند الفتح
  await page.evaluate(() => {
    const now = Date.now(), at = m => new Date(now - m * 60000);
    homeQ.bosta.at = at(2); homeQ.webhook.at = at(12); homeQ.followUp.at = at(31); homeQ.ready.at = at(75); homeQ.shipped.at = at(4);
    renderFreshness(now);
  });
  const readSec = (id, rows) => page.evaluate(([id, rows]) => {
    const v = n => { const d = document.createElement('i'); d.style.color = `var(${n})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
    const sec = document.getElementById(id), hd = sec.querySelector('.eco-home-sec-hd');
    return { cls: sec.classList.contains('is-collapsed'), exp: hd.getAttribute('aria-expanded'),
      bodyH: Math.round(sec.querySelector('.eco-sec-body').getBoundingClientRect().height),
      vis: getComputedStyle(sec.querySelector('.eco-sec-in')).visibility,
      sum: sec.querySelector('.eco-sum') ? getComputedStyle(sec.querySelector('.eco-sum')).display !== 'none' : null,
      pills: [...sec.querySelectorAll('.eco-smw')].map((w, i) => ({ name: w.querySelector('.eco-sm-n').textContent.trim(), n: w.querySelector('.eco-sm em').textContent.trim(),
        cap: w.querySelector('.eco-smcap').textContent.trim(), capCol: getComputedStyle(w.querySelector('.eco-smcap')).color,
        pillCol: getComputedStyle(w.querySelector('.eco-sm')).color, rowName: getComputedStyle(document.getElementById(rows[i]).querySelector('.eco-card-name')).color })),
      hdBg: getComputedStyle(hd).backgroundColor, hdBd: getComputedStyle(hd).borderTopColor, hdBw: getComputedStyle(hd).borderTopWidth,
      secFg: v('--sec-' + (id === 'secBosta' ? 'bosta' : id === 'secFlow' ? 'flow' : 'tools') + '-fg'), lines: [...hd.querySelectorAll('.eco-sec-ln')].some(l => getComputedStyle(l).display !== 'none'),
      sub: getComputedStyle(sec.querySelector('.eco-home-sec-sub')).display !== 'none',
      secBg: v('--sec-' + (id === 'secBosta' ? 'bosta' : id === 'secFlow' ? 'flow' : 'tools') + '-bg'),
      green: v('--green-dark'), accent: v('--accent-dark'), amber: v('--amber-dark'), red: v('--red-dark') };
  }, [id, rows]);
  is(await page.evaluate(() => ['secBosta', 'secFlow'].every(id => { const s = document.getElementById(id), c = getComputedStyle(s.querySelector('.eco-home-sec-title')).color;
    return [...s.querySelectorAll('.eco-sec-ln')].every(l => getComputedStyle(l).backgroundColor === c); })),
     '🎨 خطين العنوان على الجانبين **بنفس لون العنوان** (أغمق من الحدود — قرار أحمد 22-10-2026)');
  await page.click('#secBosta .eco-home-sec-hd');
  await page.waitForTimeout(450);
  const cb = await readSec('secBosta', ['rowBosta', 'rowWebhook', 'rowFollowUp']);
  is(cb.cls && cb.exp === 'false' && cb.bodyH < 2 && cb.vis === 'hidden', '🔴 الضغط على العنوان بيطوي القسم: الصفوف اتخفت (`visibility:hidden` فمفيش تاب عليها)', JSON.stringify([cb.cls, cb.exp, cb.bodyH, cb.vis]));
  is(cb.sum === true && cb.pills.map(p => p.name).join('|') === 'رفع بوسطة|متابعة شحنات بوسطة|متابعة التأجيلات',
     '🔴 المطوي بيعرض ملخّص: اسم كل صف (من الصف نفسه)', cb.pills.map(p => p.name).join('|'));
  is(cb.pills.every(p => /^\d+$/.test(p.n)), 'والرقم جنب الاسم (رقم مش `—` لأن الجلب نجح)', cb.pills.map(p => p.n).join());
  is(cb.pills.map(p => p.cap).join('|') === '2 دقيقة|12 دقيقة|31 دقيقة', '🔴 المدة تحت الكبسولة بالكلمة: «N دقيقة» (الرقم الأول)', cb.pills.map(p => p.cap).join('|'));
  is(cb.pills[0].capCol === cb.green && cb.pills[1].capCol === cb.accent && cb.pills[2].capCol === cb.amber,
     '🔴 لون المدة بلون العمر (نفس سلّم `agoInfo`): أخضر · أزرق · كهرماني', cb.pills.map(p => p.capCol).join(' | '));
  is(cb.pills.every(p => p.pillCol === p.rowName), 'الكبسولة بلون هوية صفها', cb.pills.map(p => p.pillCol).join(' | '));
  is(cb.hdBg === cb.secBg && cb.hdBg !== 'rgba(0, 0, 0, 0)' && !cb.lines, '🎨 المطوي شريط ملوّن بلون عيلة القسم والخطين اتشالوا', JSON.stringify([cb.hdBg, cb.secBg, cb.lines]));
  is(cb.hdBd === cb.secFg && parseFloat(cb.hdBw) >= 2, '🎨 والمطوي له **إطار محدد بنفس لون العنوان** (قرار أحمد 22-10-2026)', JSON.stringify([cb.hdBd, cb.secFg, cb.hdBw]));
  is(cb.sub === false, 'والعنوان الفرعي بيختفي وهو مطوي (الملخّص مكانه)');
  await page.click('#secFlow .eco-home-sec-hd');
  await page.waitForTimeout(450);
  const cf = await readSec('secFlow', ['rowReady', 'rowShipped']);
  if (process.env.ECO_SHOT2) await page.screenshot({ path: process.env.ECO_SHOT2, fullPage: true });
  is(cf.pills.map(p => p.cap).join('|') === '1 ساعة|4 دقيقة' && cf.pills[0].capCol === cf.red && cf.pills[1].capCol === cf.green,
     'القسم التاني: ٧٥ د ← «1 ساعة» بالأحمر · ٤ د ← «4 دقيقة» بالأخضر', cf.pills.map(p => p.cap + ':' + p.capCol).join(' | '));
  await page.click('#secTools .eco-home-sec-hd');
  await page.waitForTimeout(450);
  const ct = await readSec('secTools', []);
  is(ct.cls && ct.bodyH < 2 && ct.sum === null && ct.sub, 'أقسام الأدوات بتتطوي كمان — بلا ملخّص (مفيش أرقام) والعنوان الفرعي بيفضل', JSON.stringify([ct.bodyH, ct.sum, ct.sub]));
  // فتح تاني + كيبورد
  await page.click('#secBosta .eco-home-sec-hd');
  await page.focus('#secFlow .eco-home-sec-hd');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(450);
  const re = await page.evaluate(() => ({ b: document.getElementById('secBosta').classList.contains('is-collapsed'), f: document.getElementById('secFlow').classList.contains('is-collapsed'),
    bh: Math.round(document.querySelector('#secBosta .eco-sec-body').getBoundingClientRect().height), vis: getComputedStyle(document.querySelector('#secBosta .eco-sec-in')).visibility }));
  is(!re.b && !re.f && re.bh > 100 && re.vis === 'visible', 'الضغطة التانية بتفتح القسم · و`Enter` على الهيدر بيفتح كمان', JSON.stringify(re));
  await page.reload();
  await page.waitForTimeout(1200);
  is(await page.evaluate(() => document.querySelectorAll('.is-collapsed').length === 0 && document.querySelectorAll('.eco-home-sec-hd[aria-expanded="true"]').length === 4),
     '🔴 الحالة مابتتخزّنش: الريفريش بيرجّع كل الأقسام **مفتوحة**');

  // ⑥ موبايل — الحاويات مابتعملش سكرول أفقي والأدوات عمود واحد
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(300);
  const mob = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth,
    cols: getComputedStyle(document.querySelector('.eco-tools-grid')).gridTemplateColumns.split(' ').length }));
  is(mob.sw <= mob.iw && mob.cols === 1, 'موبايل ٣٩٠px: صفر سكرول أفقي والأدوات عمود واحد', JSON.stringify(mob));
  is(errors.length === 0, 'صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await page.goto(`${BASE}/index.html?next=Shipped-Orders.html`);
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
  // ⚠️ على المسار (pathname) مش على نهاية الـ URL: `index.html?next=Shipped-Orders.html`
  //    بتنتهي بنفس النص حتى لو التحويل ما حصلش — البند القديم كان بيعدّي على باج `NEXT_RE`
  //    (`[a-z]+` كانت بترفض أي اسم صفحة فيه حرف كبير أو شرطة) وهو مش بيقيس حاجة.
  is(new URL(page.url()).pathname.endsWith('/Shipped-Orders.html'), '`?next=` بيرجّع الموظف لوجهته بعد الدخول (المسار مش الـ query)', page.url());
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await page.goto(`${BASE}/Ready-Orders.html`);
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
  await page.goto(`${BASE}/Shipped-Orders.html`);
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

// ══════════════════════════════════════════════════════════════
// ⑩ فلاتر رأس العمود والجدول (v1.33.0 · Standards #47 · #49 · #51 · v8.3.1)
// ══════════════════════════════════════════════════════════════
//
// 🔴 كل البنود دي بتشغّل **الشاشة الفعلية** — القمع بيكتب في نفس حالة
//    §MULTISELECT اللي المربعات فوق الطابور بتكتب فيها، فأخطر فشل هنا إن
//    الاتنين يفترقوا **في صمت** (المربع مطفي والقمع مولّع والعكس).
console.log('\n══ ⑩-أ قمع رأس العمود × مربعات المندوب ══');
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForSelector('#qBody tr');
  const funnel = '#qTableWrap th[data-fk="courier"] .th-flt';
  const cnt    = () => page.$eval('#qTableWrap th[data-fk="courier"] .th-cnt', e => e.textContent.trim());
  const thOn   = () => page.$eval('#qTableWrap th[data-fk="courier"]', e => e.classList.contains('flt-on'));
  const tileOn = (k) => page.$eval(`#qChips [data-fk="${k}"]`, e => e.classList.contains('on'));
  const rowsN  = () => page.$$eval('#qBody tr', e => e.length);
  const total  = await rowsN();

  // 🔴 باج `!!value` / `!== null` — القمع **مطفي** من أول تحميل
  is(!(await thOn()) && (await cnt()) === '', '🔴 أول تحميل: القمع مش مولّع والعدّاد فاضي');
  const fks = await page.$$eval('#qTableWrap th[data-fk]', e => e.map(x => x.dataset.fk));
  is(JSON.stringify(fks) === JSON.stringify(['search', 'courier', 'where', 'date', 'packed', 'type', 'flag']),
     '🔴 القمعات على الأعمدة الصح بالترتيب — ومفيش قمع على عمود مالوش فلتر', JSON.stringify(fks));

  await page.click('#qChips [data-fk="other"]'); await page.waitForTimeout(200);
  is(await tileOn('other') && await thOn() && (await cnt()) === '2',
     '🔴 مربع «مناديب» كتب أسماء المجموعة في الفلتر → القمع مولّع وعدّاده ٢', await cnt());
  await page.click(funnel); await page.waitForTimeout(150);
  is(await page.$$eval('.hpop .hpop-item.on', e => e.length) === 2, 'والقايمة العائمة فيها الاسمين مختارين');

  const items = await page.$$('.hpop .hpop-item');
  await items[0].click(); await page.waitForTimeout(150);
  is(!!(await page.$('.hpop')), '🔴 القايمة لسه مفتوحة بعد أول اختيار (حارس `document.contains` · #32)');
  is(!(await tileOn('other')), 'اختيار جزئي من المجموعة → المربع **مطفي** مش مضغوط');
  is((await cnt()) === '●', 'والعدّاد على القمع `●` (اسم واحد)', await cnt());
  const items2 = await page.$$('.hpop .hpop-item');
  await items2[0].click(); await page.waitForTimeout(150);
  is(!!(await page.$('.hpop')) && await tileOn('other'), 'رجّعت الاسم → المربع اتولّع تاني، والقايمة لسه مفتوحة');

  const chipTxt = await page.$$eval('#qChips [data-fk]', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  await page.click('.hpop [data-hact="clear"]'); await page.waitForTimeout(200);
  const chipTxt2 = await page.$$eval('#qChips [data-fk]', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  is(JSON.stringify(chipTxt) === JSON.stringify(chipTxt2), 'أعداد المربعات ما اتغيّرتش بين «مفلتر» و«بلا فلتر»');
  is(!(await tileOn('other')) && !(await thOn()) && (await cnt()) === '' && (await rowsN()) === total,
     '«✕ مسح الاختيار» من القمع → المربع مطفي والقمع مطفي والطابور كامل');

  await page.click('.hpop [data-hact="all"]'); await page.waitForTimeout(200);
  is(await tileOn('other') && await tileOn('bosta') && await tileOn('showroom'),
     '«تحديد الكل» من القمع → مربعات المجموعات التلاتة مولّعة');
  await page.click('.hpop [data-hact="clear"]'); await page.waitForTimeout(150);

  const sortBefore = await page.$eval('#qTableWrap th[data-q-sort="courier"] .sort-icon', e => e.textContent);
  await page.keyboard.press('Escape');
  await page.click(funnel); await page.waitForTimeout(100);
  const sortAfter = await page.$eval('#qTableWrap th[data-q-sort="courier"] .sort-icon', e => e.textContent);
  is(sortBefore === sortAfter, '🔴 ضغطة القمع ما رتّبتش العمود — اسم العمود = ترتيب، والقمع = فلتر');

  await page.mouse.click(5, 5); await page.waitForTimeout(120);
  is(!(await page.$('.hpop')), 'ضغطة بره القايمة بتقفلها');
  await page.click(funnel); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  is(!(await page.$('.hpop')), 'و`Escape` بيقفلها');

  // ⚠️ مندوب جديد ظهر بعد التحديث والموظف مختار «مناديب» — السلوك القايم
  //    من قبل الترحيل: المربع **بيطفي** (مش كل أسماء المجموعة مختارة)،
  //    والاسم الجديد بيظهر في القايمة **غير مختار** — مش مخفي.
  await page.click('#qChips [data-fk="other"]'); await page.waitForTimeout(150);
  await page.evaluate(() => {
    const r = JSON.parse(JSON.stringify(qState.rows[0]));
    r.courier = 'Ali'; r.orderId = '7212000099999'; r.orderName = '#59999';
    qState.rows = qState.rows.concat([r]); qSyncMsItems(); qRender();
  });
  await page.waitForTimeout(250);
  is(!(await tileOn('other')), 'مندوب جديد وأنا مختار «مناديب» → المربع اتطفى (اختيار جزئي)');
  await page.click(funnel); await page.waitForTimeout(120);
  is(!(await page.$eval('.hpop .hpop-item:has-text("Ali")', e => e.classList.contains('on'))),
     'والاسم الجديد ظاهر في القايمة العائمة **غير مختار** — مش مخفي');
  await page.keyboard.press('Escape');

  await page.evaluate(() => { qRender(); qRender(); });
  is(await page.$$eval('#qTableWrap th[data-fk="courier"] .th-flt', e => e.length) === 1,
     'إعادة الرسم أكتر من مرة ما كرّرتش زرار القمع');
  is(errors.length === 0, 'وصفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

console.log('\n══ ⑩-ب البحث والتاريخ في رأس العمود + الـ chips ══');
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForSelector('#qBody tr');
  const rowsN = () => page.$$eval('#qBody tr', e => e.length);
  const total = await rowsN();
  const S = '#qTableWrap th[data-fk="search"]', D = '#qTableWrap th[data-fk="date"]';
  const on   = (sel) => page.$eval(sel, e => e.classList.contains('flt-on'));
  const open = async (sel) => { await page.click(sel + ' .th-flt'); await page.waitForTimeout(120); };
  const type = async (v) => { await page.fill('#hSearchInput', v); await page.waitForTimeout(450); };
  const special = () => page.$eval('#qChipsSpecial', e => e.innerText.replace(/\s+/g, ' ').trim());

  is(!(await on(S)) && !(await on(D)), 'أول تحميل: قمعا البحث والتاريخ مطفيين');
  is(!(await page.isVisible('#qFltState')), '⛔ حامل الحالة القديم مخفي — مفيش لوحة فلاتر ظاهرة');
  await open(S);
  await type('سارة');  is(await rowsN() === 1 && await on(S), 'بحث بالعميل بيفلتر والقمع بيولّع');
  await type('الهرم'); is(await rowsN() >= 1 && await rowsN() < total, 'بحث بالعنوان');
  await type('العصر'); is(await rowsN() === 1, 'بحث بالملحوظة');
  await type('#55002'); is(await rowsN() === 1, 'بحث برقم الأوردر بـ`#`');
  await type('55002');  is(await rowsN() === 1, 'ونفس الرقم من غير `#`');
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  is(!(await page.$('.hpop')) && await on(S) && await rowsN() === 1, '🔴 `Enter` بيقفل القايمة والفلتر بيفضل (#50)');
  is((await special()).includes('بحث:') && (await special()).includes('55002'),
     '🔴 chip البحث ظاهر تحت صف النتائج بالنص المكتوب', await special());
  await open(S);
  is(await page.inputValue('#hSearchInput') === '55002', 'القيمة محفوظة عند إعادة فتح القمع');
  await page.click('.hpop [data-hact="sclear"]'); await page.waitForTimeout(450);
  is(await rowsN() === total && !(await on(S)) && !(await special()).includes('بحث:'),
     '«✕ مسح الاختيار» بيرجّع الكل ويطفّي القمع ويشيل الـ chip');
  await page.keyboard.press('Escape');

  // 🔴 كتابة وقفل أسرع من مهلة الـ debounce → المربع بيتفتح بالمكتوب والفلتر مطبّق
  //    (اتمسك في المراجعة: كان بيتفتح فاضي والفلتر شغّال)
  await open(S); await page.fill('#hSearchInput', '55002');
  await page.mouse.click(5, 5); await page.waitForTimeout(50);
  is(await rowsN() === 1, '🔴 قفل القايمة على طول بعد الكتابة → البحث اتثبّت فورًا');
  await open(S);
  is(await page.inputValue('#hSearchInput') === '55002', '🔴 وإعادة الفتح بتعرض المكتوب — مش مربع فاضي على فلتر شغّال');
  // ⚠️ ✕ الـ chip والقايمة مفتوحة → البحث مايرجعش من مربع القايمة
  await page.click('#qChipsSpecial .ms-chip button'); await page.waitForTimeout(450);
  is(await rowsN() === total && !(await on(S)), '🔴 ✕ الـ chip والقايمة مفتوحة → البحث اتمسح وماترجعش');
  // ⚠️ القايمة ممكن تفضل مفتوحة (الـ chip اتعاد رسمه — حارس #32)، بس مربعها لازم يبقى فاضي
  is(!(await page.$('#hSearchInput')) || (await page.inputValue('#hSearchInput')) === '', 'ومربع البحث في القايمة اتفضّى معاه');
  await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  is(await rowsN() === total && !(await on(S)), 'وقفلها بعدها مارجّعش البحث');

  // 🔴 ✕ على chip البحث = نفس المسح بالظبط
  await open(S); await type('سارة'); await page.keyboard.press('Enter');
  await page.click('#qChipsSpecial .ms-chip button'); await page.waitForTimeout(200);
  is(await rowsN() === total && !(await on(S)), '✕ على chip البحث بيمسحه زي القمع بالظبط');

  // 🔴 مسح كل الفلاتر وسط مهلة الـ debounce — البحث مايرجعش بعد المسح
  await open(S); await page.fill('#hSearchInput', 'سارة');
  await page.click('#qClearAllBtn'); await page.waitForTimeout(500);
  is(await rowsN() === total && !(await on(S)), '🔴 «مسح كل الفلاتر» وسط مهلة البحث — البحث مارجعش بعد المسح');

  // التاريخ
  await open(D);
  is(await page.$$eval('.hpop [data-hpreset]', e => e.length) === 5, 'خمس فترات سريعة في قايمة التاريخ');
  is(await page.$eval('.hpop', e => e.getBoundingClientRect().width) >= 330, 'عرض قايمة التاريخ ٣٤٠ (#50)');
  await page.fill('.hpop [data-hdate="qDateFrom"]', '2026-09-10');
  await page.fill('.hpop [data-hdate="qDateTo"]', '2026-09-10');
  await page.waitForTimeout(250);
  is(await rowsN() === 1 && await on(D), 'من/إلى = يوم واحد بيطلّع صف واحد (يوم القاهرة)', String(await rowsN()));
  is((await special()).includes('من 📅 10/09/2026 إلى 📅 10/09/2026'),
     '🔴 chip التاريخ بصيغة `من 📅 dd/mm/yyyy إلى 📅 dd/mm/yyyy`', await special());
  await page.fill('.hpop [data-hdate="qDateTo"]', '2026-09-11'); await page.waitForTimeout(250);
  is(await rowsN() === 2, 'المدى يومين = صفّين');
  await page.click('.hpop [data-hact="dclear"]'); await page.waitForTimeout(250);
  is(await rowsN() === total && !(await on(D)) && !(await special()).includes('تاريخ'), 'مسح التاريخ بيرجّع الكل ويشيل الـ chip');
  await page.click('.hpop [data-hpreset="last30"]'); await page.waitForTimeout(250);
  is(await page.evaluate(() => qActivePreset) === 'last30' && await on(D), 'الفترة السريعة اتسجّلت والقمع ولّع');
  is((await special()).includes('آخر 30 يوم'), 'و chip التاريخ بيقول اسم الفترة', await special());
  await page.fill('.hpop [data-hdate="qDateFrom"]', '2026-09-01'); await page.waitForTimeout(250);
  is(!(await page.evaluate(() => qActivePreset)), 'تعديل يدوي في «من» بيشيل الفترة السريعة');
  await page.keyboard.press('Escape');

  await open(S); await type('سارة'); await page.keyboard.press('Escape');
  await page.click('#qClearAllBtn'); await page.waitForTimeout(450);
  is(await rowsN() === total && !(await on(S)) && !(await on(D)) && (await special()) === '',
     '🔴 «مسح كل الفلاتر» بيطفّي القمعين ويرجّع الكل ويشيل كل الـ chips');
  await open(S);
  is(await page.inputValue('#hSearchInput') === '', 'ومربع البحث فاضي بعد المسح');
  await page.keyboard.press('Escape');
  is(errors.length === 0, 'وصفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

console.log('\n══ ⑩-ج الجدول الفاضي · #49 خط وتثبيت العناوين · #51 عرض الأعمدة ══');
{
  const { page, ctx, errors } = await newPage();
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto(`${BASE}/Ready-Orders.html`);
  await page.waitForSelector('#qBody tr');
  await page.waitForTimeout(200);

  // ── 🔴 صفر نتائج = الجدول والقمعات بيفضلوا
  await hsearch(page, 'zzzz');
  is(await page.isVisible('#qTableWrap') && await page.isVisible('#qTableWrap th[data-fk="search"] .th-flt'),
     '🔴 صفر نتائج: الجدول والقمع لسه ظاهرين');
  is(await page.isVisible('.q-none-row') && !(await page.isVisible('#qEmpty')), 'ورسالة «مفيش صفوف» صف جوّه الجدول');
  is(await page.$eval('.q-none-row td', e => e.colSpan) === await page.$$eval('#qTable thead th', e => e.length),
     'والصف بعرض كل الأعمدة (`colspan`)');
  await page.click('#qTableWrap th[data-fk="search"] .th-flt'); await page.waitForTimeout(100);
  is(await page.inputValue('#hSearchInput') === 'zzzz', '🔴 أقدر أفتح القمع تاني وأعدّل من غير «مسح الكل»');
  await page.fill('#hSearchInput', ''); await page.waitForTimeout(500); await page.keyboard.press('Escape');
  is(!(await page.$('.q-none-row')), 'ومسح البحث بيرجّع الصفوف');

  // ── #49
  const thS = await page.$eval('#qTable thead th', e => { const c = getComputedStyle(e); return [c.fontSize, c.fontWeight, c.position, c.backgroundColor]; });
  is(thS[0] === '12px' && thS[1] === '700' && thS[2] === 'sticky', '#49 — العنوان 12px / 700 / sticky', JSON.stringify(thS));
  is(thS[3] !== 'rgba(0, 0, 0, 0)', '🔴 والعنوان الثابت **ليه خلفية** — شفاف بيخلّي الصفوف تتقري فوقه', thS[3]);
  is(await page.$eval('#qTable tbody td:nth-child(3)', e => getComputedStyle(e).fontSize) === '12.5px', '#49 — الخلية 12.5px');
  const scrollOk = await page.evaluate(() => {
    const w = document.getElementById('qTableWrap'), c = getComputedStyle(w);
    return c.overflowY === 'auto' && c.maxHeight !== 'none';
  });
  is(scrollOk, '#49 — سكرول داخلي بسقف ارتفاع (العناوين بتثبت جوّاه)');

  // ── #51 — 🔴 القياس التلقائي مش متثبّت على أول شاشة (اتمسك في المراجعة)
  const fitsCard = async () => (await page.$eval('#qTable', e => e.getBoundingClientRect().width)) <= (await page.$eval('#qTableWrap', e => e.clientWidth)) + 0.5;
  is(await fitsCard(), '🔴 أول قياس مابيعدّيش عرض الكارت ولا بـ١px (floor مش round)');
  await page.setViewportSize({ width: 1100, height: 900 }); await page.waitForTimeout(400);
  is(await fitsCard(), '🔴 تصغير الشباك (بلا أي سحب) → الأعمدة اتقاست تاني ومفيش سكرول أفقي');
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(400);
  is(await fitsCard(), 'وعلى 1280 كمان');
  await page.setViewportSize({ width: 1500, height: 900 }); await page.waitForTimeout(400);
  is(Math.abs(await page.$eval('#qTable', e => e.getBoundingClientRect().width) - await page.$eval('#qTableWrap', e => e.clientWidth)) < 2,
     'والتكبير تاني بيملا الكارت');
  // ⚠️ وتغيير الشاشة والتاب التانية ظاهرة → الرجوع بيعيد القياس
  await page.evaluate(() => switchMainTab('audit'));
  await page.setViewportSize({ width: 1100, height: 900 }); await page.waitForTimeout(400);
  await page.evaluate(() => switchMainTab('queue')); await page.waitForTimeout(150);
  is(await fitsCard(), 'تصغير الشباك وتاب الجرد ظاهرة → الرجوع للطابور بيعيد القياس');
  await page.setViewportSize({ width: 1500, height: 900 }); await page.waitForTimeout(400);

  const w0 = await page.$$eval('#qTable colgroup col', e => e.map(c => parseFloat(c.style.width)));
  is(w0.length === await page.$$eval('#qTable thead th', e => e.length) && w0.every(x => x >= 64),
     '#51 — `colgroup` بعرض لكل عمود', JSON.stringify(w0));
  is(await page.$$eval('#qTable thead th .col-rz', e => e.length) === w0.length, 'ومقبض سحب على كل عنوان');
  is(Math.abs(await page.$eval('#qTable', e => e.getBoundingClientRect().width) - await page.$eval('#qTableWrap', e => e.clientWidth)) < 2,
     '🔴 الجدول بيملا عرض الكارت (v8.3.1)');
  const dates = await page.$$eval('#qTable thead th.col-date', e => e.map(x => Math.round(x.getBoundingClientRect().width)));
  is(dates.length === 2 && dates[0] === dates[1], '🔴 عمودا التاريخ لسه بنفس العرض بعد التثبيت', JSON.stringify(dates));
  const hnd = await page.$('#qTable thead th:nth-child(3) .col-rz'); const bb = await hnd.boundingBox();
  const sortBefore = await page.evaluate(() => JSON.stringify(qSortState));
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x - 60, bb.y + 5, { steps: 6 }); await page.mouse.up();
  const w1 = await page.$$eval('#qTable colgroup col', e => e.map(c => parseFloat(c.style.width)));
  is(Math.round(w1[2] - w0[2]) >= 50, '#51 — السحب لليسار وسّع العمود (RTL)', `${w0[2]} → ${w1[2]}`);
  is(sortBefore === await page.evaluate(() => JSON.stringify(qSortState)), '🔴 والسحب ما رتّبش العمود');
  is(Math.abs(await page.$eval('#qTable', e => e.getBoundingClientRect().width) - w1.reduce((a, b) => a + b, 0)) < 2,
     'وعرض الجدول = مجموع الأعمدة');
  is(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('dco_col_widths')).length) === 1,
     'والعرض اتحفظ (مفتاح واحد للصفحة)');
  await page.reload(); await page.waitForSelector('#qBody tr'); await page.waitForTimeout(300);
  const w2 = await page.$$eval('#qTable colgroup col', e => e.map(c => parseFloat(c.style.width)));
  is(Math.abs(w2[2] - w1[2]) <= 1, '🔴 بعد refresh العرض رجع زي ما هو', `${w1[2]} vs ${w2[2]}`);
  await page.dblclick('#qTable thead th:nth-child(3) .col-rz'); await page.waitForTimeout(100);
  const w3 = await page.$$eval('#qTable colgroup col', e => e.map(c => parseFloat(c.style.width)));
  is(w3[2] !== w2[2], 'دبل كليك = ضبط تلقائي على أطول محتوى', `${w2[2]} → ${w3[2]}`);
  // 🔴 والضبط **بيصغّر كمان** — مش بيكبّر بس: عمود «رقم الأوردر» اتوسّع
  //    بالسحب ١٢٠px، والدبل كليك لازم يرجّعه لعرض محتواه.
  const h1 = await page.$('#qTable thead th:nth-child(1) .col-rz'); const b1 = await h1.boundingBox();
  await page.mouse.move(b1.x + b1.width / 2, b1.y + 5); await page.mouse.down();
  await page.mouse.move(b1.x - 120, b1.y + 5, { steps: 6 }); await page.mouse.up();
  const wide = (await page.$$eval('#qTable colgroup col', e => e.map(c => parseFloat(c.style.width))))[0];
  await page.dblclick('#qTable thead th:nth-child(1) .col-rz'); await page.waitForTimeout(100);
  const fit1 = (await page.$$eval('#qTable colgroup col', e => e.map(c => parseFloat(c.style.width))))[0];
  is(fit1 < wide - 60, '🔴 والدبل كليك **بيصغّر** العمود اللي اتوسّع لعرض محتواه', `${wide} → ${fit1}`);
  const fitsAll = await page.$$eval('#qTable tbody tr td:first-child', e => e.every(td => td.scrollWidth <= td.clientWidth + 1));
  is(fitsAll, 'وبعد الضبط محتوى العمود كله ظاهر — مفيش خلية مقصوصة');
  const lastH = await page.$('#qTable thead th:last-child .col-rz'); const lb = await lastH.boundingBox();
  await page.mouse.move(lb.x + lb.width / 2, lb.y + 5); await page.mouse.down();
  await page.mouse.move(lb.x + 120, lb.y + 5, { steps: 6 }); await page.mouse.up();
  is(await page.$eval('#qTable', e => e.getBoundingClientRect().width) >= await page.$eval('#qTableWrap', e => e.clientWidth) - 2,
     '🔴 تصغير آخر عمود ما سابش فراغ بعد آخر عمود (v8.3.1)');
  is(await page.evaluate(() => Object.keys(localStorage).filter(k => k !== 'delivery_cod_ops_worker_secret' && !k.startsWith('dco_col_widths')).length) === 0,
     '⚠️ مفيش أي مفتاح `localStorage` جديد غير السر وعروض الأعمدة');

  // 🔴 التاب المخفية — الرجوع للطابور بعد ما الأعمدة اتقاست بيعيد العرض صح
  await page.evaluate(() => switchMainTab('audit'));
  await page.evaluate(() => switchMainTab('queue'));
  await page.waitForTimeout(150);
  is(Math.abs(await page.$eval('#qTable', e => e.getBoundingClientRect().width) - await page.$eval('#qTableWrap', e => e.clientWidth)) < 2
     || await page.$eval('#qTable', e => e.getBoundingClientRect().width) > await page.$eval('#qTableWrap', e => e.clientWidth),
     'الرجوع من تاب الجرد: الجدول لسه بيملا الكارت');
  is(errors.length === 0, 'وصفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

// ⚠️ صفحة المشحون — نفس المكوّن (متولّدة من نفس القالب)، وبيتأكد إنه بيشتغل
//    على أعمدتها هي (رقم تتبع بدل العنوان/الملحوظة) من غير خطأ.
{
  const { page, ctx, errors } = await newPage();
  await page.goto(`${BASE}/Shipped-Orders.html`);
  await page.waitForSelector('#qBody tr');
  await page.waitForTimeout(200);
  const fks = await page.$$eval('#qTableWrap th[data-fk]', e => e.map(x => x.dataset.fk));
  is(fks.includes('search') && fks.includes('courier') && fks.includes('date') && !fks.includes('where'),
     'المشحون: القمعات على أعمدته — ⛔ ومفيش «موقع الشحنة»', JSON.stringify(fks));
  await hsearch(page, 'zzzz');
  is(await page.isVisible('.q-none-row') && await page.isVisible('#qTableWrap th[data-fk="search"] .th-flt'),
     'المشحون: صفر نتائج والجدول والقمع ظاهرين');
  is(await page.$$eval('#qTable colgroup col', e => e.length) === await page.$$eval('#qTable thead th', e => e.length),
     'المشحون: `colgroup` لكل عمود');
  is(errors.length === 0, 'المشحون: صفر خطأ في الكونسول', errors.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
