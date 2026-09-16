// ══════════════════════════════════════════════════════════════
// docs/rules-check.mjs — فحص منطق `shared/shell.js` §QUEUE-RULES و§HELPERS
//
// 🔴 **ليه ملف تاني غير فحص المتصفح؟** الاتنين بيمسكوا عيلتين مختلفتين:
//    · `queues-check.mjs` بيشغّل الصفحة على **بيانات كاملة سليمة** — بيمسك
//      الربط (الرقم في الرئيسية == القايمة في الصفحة · الصف المعلّم لسه
//      في الطابور · الفلتر بيفلتر).
//    · الملف ده بيدّي للدوال **مدخلات باظة وحدّية** — `null` · تاريخ غلط ·
//      قيمة بره القايمة · تحوّل التوقيت الشتوي. دي حالات **مستحيل تتزرع في
//      بيانات وهمية معقولة**، وهي بالظبط اللي بتنتج «رقم غلط شكله سليم».
//
// 🔴 **وبندان هنا مسكوا عطلين حقيقيين وقت البناء:**
//    ① `new Date(null)` بيرجّع **1970-01-01 صالح** مش `Invalid Date` — فأوردر
//      مالوش تاريخ كان بياخد بادج أحمر «متأخر ٢٠٬٧٠٠ يوم».
//    ② `Number(null)` بيرجّع **0** — فخانة فلوس مالهاش قيمة كانت بتقول
//      «0 ج» بدل «—»، يعني «مفيش فلوس» على أوردر إحنا مش عارفين قيمته.
//    الاتنين **عدّوا** على فحص المتصفح، لأن بياناته الوهمية كلها كاملة.
//
// التشغيل:  node docs/rules-check.mjs
// ══════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// ⚠️ الـ shell سكربت متصفح (مش module) — بيتقيّم في سياق فيه أقل تشكيل
//    ممكن للـ DOM. أي دالة بتلمس الـ DOM مش في نطاق الملف ده أصلاً.
globalThis.window = {};
globalThis.document = { getElementById: () => null, addEventListener: () => {} };
globalThis.localStorage = { getItem: () => '', setItem: () => {}, removeItem: () => {} };
globalThis.sessionStorage = globalThis.localStorage;

const src = fs.readFileSync(path.join(ROOT, 'shared/shell.js'), 'utf8');
const API = [
  'cairoParts', 'cairoDayStr', 'cairoDayIndex', 'formatDate', 'formatTimeOnly', 'formatDateTime',
  'dcoDayDiff', 'dcoDayLevel', 'dcoOrderAge', 'dcoWaiting', 'dcoMoney', 'dcoCod',
  'dcoMachineOf', 'dcoFlags', 'dcoShapeRow', 'dcoQueueRows', 'dcoCourierGroup',
  'dcoCourierCounts', 'dcoChips', 'dcoFlaggedCount', 'cmpVersion', 'esc',
  // §AUDIT-RULES — جرد المكتب (v1.3.0)
  'dcoScanParse', 'dcoScanKey', 'dcoScanFind', 'dcoAuditBuckets', 'dcoAuditReason',
];
const T = eval(`${src}\n;({ ${API.join(', ')} })`);

let pass = 0, fail = 0;
const is = (cond, m, d = '') => cond ? (pass++, console.log('  ✅', m))
                                     : (fail++, console.log('  ❌', m, d ? `\n       ${d}` : ''));

// ══ ① التوقيت — `Africa/Cairo` يتحسب، مايتكتبش ثابت ══════════
console.log('\n══ ① التوقيت ══');
is(T.cairoDayStr('2026-09-12T22:30:00Z') === '2026-09-13',
   'صيفًا: UTC 22:30 = اليوم اللي بعده بالقاهرة', T.cairoDayStr('2026-09-12T22:30:00Z'));
is(T.cairoDayStr('2026-09-12T20:00:00Z') === '2026-09-12',
   'وUTC 20:00 لسه نفس اليوم');
// 🔴 البند ده هو اللي بيثبت إن الأداة **مش في نطاق 29-10-2026**: نفس الكود
//    بلا أي تعديل بيدّي إزاحة صح قبل التحويل وبعده.
is(T.cairoDayStr('2026-11-05T22:30:00Z') === '2026-11-06',
   'شتاءً (بعد 29-10): UTC 22:30 = اليوم اللي بعده', T.cairoDayStr('2026-11-05T22:30:00Z'));
is(T.cairoDayStr('2026-11-05T21:30:00Z') === '2026-11-05',
   '🔴 وشتاءً UTC 21:30 لسه نفس اليوم — بإزاحة ثابتة (+3) كان هيطلع اليوم اللي بعده',
   T.cairoDayStr('2026-11-05T21:30:00Z'));
is(T.cairoParts('مش تاريخ') === null, 'تاريخ باظ بيرجّع `null` — مابيرميش');
is(T.formatDate('مش تاريخ') === '—', 'والعرض بيقول «—»');
is(T.formatDate(null) === '—' && T.formatTimeOnly(null) === '—',
   '🔴 `null` بيرجّع «—» — `new Date(null)` بيرجّع 1970 صالح، فالفحص بـ`isNaN` لوحده مابيمسكهوش');
is(T.dcoDayDiff(null, new Date()) === null, 'وفرق الأيام على `null` = `null`');

// ══ ② بادجات الوقت ══════════════════════════════════════════
console.log('\n══ ② بادجات الوقت ══');
const now = new Date('2026-09-15T12:00:00Z');
is(T.dcoOrderAge(null, now).cls === 'tb-none' && T.dcoOrderAge(null, now).text === '—',
   '🔴 أوردر بلا تاريخ = بادج رمادي بشرطة — مش «متأخر ٢٠٬٧٠٠ يوم»',
   JSON.stringify(T.dcoOrderAge(null, now)));
is(T.dcoOrderAge('2026-09-15T06:00:00Z', now).text === 'اليوم', 'النهاردة = «اليوم»');
is(T.dcoOrderAge('2026-09-14T06:00:00Z', now).text === 'منذ أمس', 'امبارح = «منذ أمس»');
is(T.dcoOrderAge('2026-09-13T06:00:00Z', now).text === 'منذ يومين', 'والجمع العربي صح («يومين» مش «2 يوم»)');
is(T.dcoDayLevel(0) === 'tb-d0' && T.dcoDayLevel(1) === 'tb-d1' && T.dcoDayLevel(2) === 'tb-d2'
   && T.dcoDayLevel(6) === 'tb-d3' && T.dcoDayLevel(7) === 'tb-d7',
   'سلّم الدرجات كامل (٠ · ١ · ٢ · <٧ · ≥٧)');
is(T.dcoWaiting(null, now).cls === 'tb-none' && T.dcoWaiting('xx', now).cls === 'tb-none',
   '«قاعد من إمتى» على قيمة باظة = بادج محايد');
// ⚠️ الأوردر اللي اتعمل ١١ مساءً بيبقى «متأخر يوم» الساعة ١ صباحًا — وده
//    الصح: «عدّى اليوم» معناها **التاريخ اتغيّر**، مش إن ٢٤ ساعة عدّت.
is(T.dcoWaiting('2026-09-14T20:00:00Z', new Date('2026-09-14T22:30:00Z')).cls === 'tb-d1',
   '🔴 فرق الأيام **تقويمي** مش ٢٤ ساعة — ساعتين ونص عبر منتصف الليل = «متأخر يوم»');

// ══ ③ الفلوس ════════════════════════════════════════════════
console.log('\n══ ③ الفلوس ══');
is(T.dcoMoney('2750') === '2,750 ج', 'فواصل آلاف', T.dcoMoney('2750'));
is(T.dcoMoney('1825.50') === '1,825.50 ج', 'والكسور بتفضل لما تكون موجودة');
is(T.dcoMoney(null) === '—' && T.dcoMoney(undefined) === '—' && T.dcoMoney('') === '—',
   '🔴 قيمة مش معروفة = «—» مش «0 ج» — `Number(null)` بيرجّع صفر، و«مفيش فلوس» ≠ «مش عارفين»');
is(T.dcoMoney(0) === '0 ج', 'وصفر **حقيقي** بيفضل «0 ج»');
const cod = T.dcoCod([
  { financial: 'PENDING', total: '100.00', currency: 'EGP' },
  { financial: 'PENDING', total: '50.50',  currency: 'EGP' },
  { financial: 'PAID',    total: '900.00', currency: 'EGP' },
  { financial: null,      total: '70.00',  currency: 'EGP' },
  { financial: 'PENDING', total: null,     currency: 'EGP' },
]);
is(cod.due === 150.5 && cod.dueCount === 2,
   '🔴 «مستحق التحصيل» = الـ PENDING بس', JSON.stringify(cod));
is(cod.prepaidCount === 1, 'والمدفوع مقدمًا **بيتعدّ** — استبعاد مُعلَن مش صامت');
is(cod.unknownCount === 2, 'والمجهول (بلا حالة مالية أو بلا مبلغ) ليه عدّاده هو كمان');

// ══ ④ الماكينة — كل صف بياخد بيانات ماكينته ═════════════════
console.log('\n══ ④ الماكينة ══');
is(T.dcoMachineOf({ s1: 'Ready', s2: null }, 'Ready') === 's1', 'S1 على القيمة → s1');
is(T.dcoMachineOf({ s1: 'Delivered', s2: 'Ready' }, 'Ready') === 's2', 'S2 لوحده → s2');
is(T.dcoMachineOf({ s1: 'Ready', s2: 'Ready' }, 'Ready') === 's1',
   '🔴 الاتنين على القيمة → **S1 مرة واحدة** — مش صفّين لنفس الأوردر');
const row = T.dcoShapeRow({
  orderId: '1', orderName: '#1', createdAt: '2026-09-10T00:00:00Z',
  s1: 'Delivered', s2: 'Ready',
  packedAtS1: '2026-09-01T00:00:00Z', packedAtS2: '2026-09-13T00:00:00Z',
  packedByS1: 'A', packedByS2: 'B',
  whereaboutsS1: 'Office', whereaboutsS2: 'Warehouse',
  trackingS1: '111', trackingS2: '222', trackingLegacy: '999',
}, 'Ready', 'ready', now);
is(row.packedAt === '2026-09-13T00:00:00Z' && row.packedBy === 'B',
   '🔴 صف S2 بياخد **وقت واسم تغليف S2** — أخد S1 معناه بيانات شحنة تانية');
is(row.whereabouts === 'Warehouse', 'وعهدة الطرد بتاعة S2 كمان');
is(row.tracking === '222' && row.trackingIsLegacy === false,
   'ورقم تتبع S2 — والجديد بيغلب القديم');
const legacy = T.dcoShapeRow({ orderId:'2', orderName:'#2', s1:'Shipped',
  trackingS1: null, trackingS2: null, trackingLegacy: '999' }, 'Shipped', 'shipped', now);
is(legacy.tracking === '999' && legacy.trackingIsLegacy === true,
   '🔴 ولما الجديد فاضي: القديم بيتعرض **وبعلامة** — «الرقم ده من حقل متوقّف» معلومة');

// ══ ⑤ العلامات — علّم، متشيلش ═══════════════════════════════
console.log('\n══ ⑤ العلامات ══');
const codes = (o, st, q) => T.dcoFlags(o, st, q).map(f => f.code).sort().join(',');
is(codes({ s1:'Ready', zone:'Cairo+Giza', cancelledAt:'2026-09-01T00:00:00Z' }, 'Ready', 'ready') === 'cancelled',
   'الملغي بياخد علامة (من حدث شوبيفاي)');
is(codes({ s1:'Cancelled', s2:'Ready', zone:'Cairo+Giza' }, 'Ready', 'ready').includes('cancelled'),
   'والملغي بالميتافيلد كمان (المصدر الثانوي · قاعدة ٢)');
is(codes({ s1:'Ready', s2:'Ready', zone:'Cairo+Giza' }, 'Ready', 'ready') === 'both_machines',
   'الماكينتين على نفس القيمة');
is(codes({ s1:'Shipped', s2:'Ready', zone:'Cairo+Giza' }, 'Ready', 'ready') === 's2_before_delivered',
   'دورة استبدال والشحنة الأصلية لسه مش Delivered');
is(codes({ s1:'Ready', zone:'BLANK' }, 'Ready', 'ready') === 'zone_missing',
   '🔴 `BLANK` = «لسه ما اتقررش» مش زون رابع (قاعدة ١٦)');
is(codes({ s1:'Ready', zone:'Mars' }, 'Ready', 'ready') === 'zone_unknown', 'وزون بره القايمة ليه كوده');
is(codes({ s1:'Redy', zone:'Cairo+Giza' }, 'Ready', 'ready').includes('s1_unknown'),
   '🔴 حالة بره قايمة الاختيار بتتعلّم (قاعدة ١٣) — «Redy» مش «Ready»');
is(codes({ s1:'Ready', zone:'Cairo+Giza', whereaboutsS1:'Courier' }, 'Ready', 'ready') === 'at_courier',
   'جاهز: الطرد مع المندوب والحالة لسه Ready');
is(codes({ s1:'Shipped', zone:'Cairo+Giza', fulfillment:'UNFULFILLED' }, 'Shipped', 'shipped') === 'not_fulfilled',
   'مشحون: S1 بلا فلفلمنت');
is(codes({ s1:'Delivered', s2:'Shipped', zone:'Cairo+Giza', fulfillment:'UNFULFILLED' }, 'Shipped', 'shipped') === '',
   '🔴 وصف S2 بنفس الحالة **مابياخدش علامة** — عُرف الفلفلمنت في S2 مش مؤكَّد، وعلامة غلط بتدرّب الموظف يعدّي على التحذير كله');
is(codes({ s1:'Shipped', zone:'Cairo+Giza', fulfillment:'PARTIALLY_FULFILLED' }, 'Shipped', 'shipped') === '',
   'و`PARTIALLY_FULFILLED` حالة حقيقية مش شذوذ');
const one = T.dcoFlags({ s1:'Ready', zone:'BLANK' }, 'Ready', 'ready')[0];
is(!!one.label && !!one.detail && !!one.action,
   '🔴 كل علامة بتقول: إيه · **القيمة الغلط** · **الفعل المطلوب** (قاعدة ١٤)');
is(one.detail.includes('BLANK'), 'والقيمة الغلط بتتقال بالحرف', one.detail);

// ══ ⑥ الطابور — صفر فلترة، والأقدم فوق ══════════════════════
console.log('\n══ ⑥ الطابور ══');
const raw = [
  { orderId:'1', orderName:'#1', createdAt:'2026-09-10T00:00:00Z', s1:'Ready', zone:'Cairo+Giza', courier:'Saif',    financial:'PENDING', total:'100' },
  { orderId:'2', orderName:'#2', createdAt:'2026-09-08T00:00:00Z', s1:'Ready', zone:'Other_Regions', courier:'Bosta', financial:'PENDING', total:'200', cancelledAt:'2026-09-09T00:00:00Z' },
  { orderId:'3', orderName:'#3', createdAt:'2026-09-09T00:00:00Z', s1:'Ready', zone:'Show_Room', courier:'Show Room', financial:'PAID',    total:'300' },
];
const rows = T.dcoQueueRows(raw, 'Ready', 'ready', now);
is(rows.length === 3, '🔴 كل اللي رجع بيدخل الطابور — **صفر فلترة** (الملغي جوّه وعليه علامة)');
is(rows[0].orderName === '#2', 'الترتيب: الأقدم فوق', rows.map(r => r.orderName).join(' '));
is(T.dcoFlaggedCount(rows) === 1, 'وعدّاد المعلّم بيعدّ **الصفوف** مش العلامات');
const counts = T.dcoCourierCounts(rows);
is(counts.other === 1 && counts.bosta === 1 && counts.showroom === 1,
   'تقسيمة المندوب صح', JSON.stringify(counts));
const chips = T.dcoChips(rows);
is(chips.length === 4 && chips[3].cls === 'qc-flag' && chips[3].n === 1,
   'مربع «محتاجة مراجعة» بيتضاف **بس لما يكون فيه فعلاً**');
is(T.dcoChips(T.dcoQueueRows([raw[0]], 'Ready', 'ready', now)).length === 3,
   'ومابيظهرش وهو صفر — تحذير دايم بيتحوّل لديكور');
is(T.dcoQueueRows(null, 'Ready', 'ready', now).length === 0, 'و`null` بيرجّع طابور فاضي مش رمي');


// ══ ⑧ §AUDIT-RULES — جرد المكتب ═════════════════════════════
//
// 🔴 **العيلة اللي البنود دي بتمسكها:** جرد بيقول «مظبوط» على طرد غلط، أو
//    «مفقود» على طرد اتعمله سكان فعلاً. الاتنين **رقم غلط شكله سليم** —
//    الشاشة بتفتح، والكونسول نضيف، والموظف بيدوّر على طرد موجود.
console.log('\n══ ⑧ جرد المكتب ══');

// ── التطبيع ──
is(T.dcoScanParse('6959895839042')?.kind === 'id',
   '🔴 الكود الطويل (١٣ رقم) = **Order ID** — ده اللي في الباركود',
   JSON.stringify(T.dcoScanParse('6959895839042')));
is(T.dcoScanParse('#55001')?.kind === 'name' && T.dcoScanParse('#55001')?.name === '#55001',
   'و`#55001` = رقم أوردر');
is(T.dcoScanParse('55001')?.name === '#55001',
   'والرقم القصير بلا `#` بياخد `#` — الموظف بيكتبه من غيرها');
is(T.dcoScanParse('gid://shopify/Order/6959895839042')?.id === '6959895839042',
   'والـ `gid` الكامل بيطلّع الرقم منه');
// 🔴 التفسيرين مع بعض — العتبة لوحدها كانت بتضيّع أوردر اسمه رقم طويل
const long = T.dcoScanParse('6959895839042');
is(long?.id === '6959895839042' && long?.name === '#6959895839042',
   '🔴 التفسيرين (`id` و`name`) بيرجعوا **مع بعض** — عتبة لوحدها كانت بتضيّع أوردر اسمه رقم طويل');
is(T.dcoScanParse('55001')?.id === null,
   '⚠️ و`id` بيتساب `null` تحت ٦ أرقام — الـ Worker بيرفضه أصلاً، فإرساله استعلام مضمون إنه بلا نتيجة');
// المدخلات الباظة
is(T.dcoScanParse(null) === null && T.dcoScanParse('') === null && T.dcoScanParse('   ') === null,
   '`null` و الفاضي بيرجّعوا `null` — مابيرميش');
is(T.dcoScanParse('ABC-XYZ') === null,
   'وكود بلا أي رقم بيرجّع `null` — مش سكانة');
is(T.dcoScanParse('  #55001\n')?.name === '#55001',
   '⚠️ ورموز السكانر (Enter · مسافات · شرطة) بتتشال', JSON.stringify(T.dcoScanParse('  #55001\n')));

// ── المفتاح ──
is(T.dcoScanKey(T.dcoScanParse('6959895839042')) === 'id:6959895839042'
   && T.dcoScanKey(T.dcoScanParse('#55001')) === 'name:#55001',
   'المفتاح بيقول الصيغة والقيمة — والـ Worker بيرجّع بنفس الشكل');
is(T.dcoScanKey(null) === '', 'ومفتاح `null` نص فاضي مش رمي');

// ── المطابقة ──
const AR = [
  { orderId: '7212000000001', orderName: '#55001', tracking: null },
  { orderId: '7212000000002', orderName: '#55002', tracking: '1234567' },
  { orderId: '7212000000003', orderName: '6959895839042', tracking: null },
];
is(T.dcoScanFind(AR, T.dcoScanParse('7212000000001'))?.orderName === '#55001',
   'المطابقة بالـ ID');
is(T.dcoScanFind(AR, T.dcoScanParse('#55002'))?.orderId === '7212000000002',
   'والمطابقة بالاسم');
// 🔴 الترتيب: الـ ID الأول
is(T.dcoScanFind(AR, T.dcoScanParse('6959895839042'))?.orderName === '6959895839042',
   '⚠️ كود مالوش ID مطابق بيقع على **الاسم** — فأوردر اسمه رقم طويل مايضيعش');
// 🔴 البند ده مسك عطل حقيقي وقت البناء: المقارنة كانت حرفية على `#`.
is(T.dcoScanFind([{ orderId: 'x', orderName: '#55001' }], T.dcoScanParse('55001'))?.orderName === '#55001',
   '🔴 و`55001` (بلا `#`) بيطابق `#55001` — نفس قاعدة مربع البحث بالحرف');
is(T.dcoScanFind(AR, T.dcoScanParse('1234567'))?.orderId === '7212000000002',
   'ورقم التتبع بيطابق لما يكون مسجّل على الصف');
is(T.dcoScanFind(AR, T.dcoScanParse('123'))  === null,
   '🔴 و`123` **مابيطابقش** `1234567` — المطابقة بالتساوي الكامل مش `includes`');
is(T.dcoScanFind(null, T.dcoScanParse('#55001')) === null
   && T.dcoScanFind(AR, null) === null,
   'و`null` في أي طرف بيرجّع `null`');
is(T.dcoScanFind([null, undefined, { orderName: '#55009' }], T.dcoScanParse('#55009'))?.orderName === '#55009',
   '⚠️ وصف `null` جوّه القايمة مابيوقّعش المطابقة');

// ── التلات أقسام ──
const SC = [
  { orderId: '1', orderName: '#1' },
  { orderId: '2', orderName: '#2' },
  { orderId: '3', orderName: '#3' },
];
const b1 = T.dcoAuditBuckets(SC, [{ orderId: '1', key: 'id:1', hit: 'scope' }]);
is(b1.counts.scope === 3 && b1.counts.matched === 1 && b1.counts.missing === 2 && b1.counts.extra === 0,
   'سكانة واحدة في النطاق: ١ مظبوط · ٢ مفقود · ٠ خطأ', JSON.stringify(b1.counts));
is(b1.counts.pending === b1.counts.missing,
   '⚠️ «لسه ما اتعملّهاش سكان» **نفس الرقم** بالظبط — الاسم هو الفرق مش الحساب');
// 🔴 نفس الأوردر مرتين بصيغتين
const b2 = T.dcoAuditBuckets(SC, [
  { orderId: '1', key: 'id:1', hit: 'scope' },
  { orderId: '1', key: 'name:#1', hit: 'scope' },
]);
is(b2.counts.matched === 1,
   '🔴 نفس الأوردر بصيغتين بيتعدّ **مرة واحدة** — وإلا «مضبوطة» بتبقى أكبر من النطاق');
// موجود خطأ
const b3 = T.dcoAuditBuckets(SC, [
  { orderId: '9', key: 'id:9', hit: 'queue', row: { orderId: '9', orderName: '#9' } },
  { orderId: null, key: 'id:6959895839042', hit: 'none' },
]);
is(b3.counts.extra === 2 && b3.counts.matched === 0 && b3.counts.missing === 3,
   'السكانة اللي مش في النطاق بتروح «موجودة خطأ» — والنطاق مايتأثرش', JSON.stringify(b3.counts));
is(T.dcoAuditBuckets([{ orderName: '#x' }], []).counts.scope === 0,
   '🔴 الصف اللي مالوش `orderId` **مابيدخلش النطاق** — كان بيبقى مفقود للأبد (مفيش كود يطابقه)');
is(T.dcoAuditBuckets(null, null).counts.scope === 0,
   'و`null` في الطرفين بيرجّع أصفار مش رمي');
is(T.dcoAuditBuckets(SC, [{ orderId: 1, key: 'id:1', hit: 'scope' }]).counts.matched === 1,
   '⚠️ و`orderId` رقمي بيطابق النصّي — الـ Worker بيرجّع نص، والكاش بيرجّع اللي اتخزّن');

// ── السبب ──
const r1 = T.dcoAuditReason({ hit: 'queue', row: { orderName: '#9' }, parsed: { display: '#9' } });
is(r1.code === 'out_of_scope' && /Ready/.test(r1.detail) && r1.action.length > 10,
   '🔴 «بره الفلتر» سبب **مستقل** — الطرد مكانه صح، والفعل مختلف تمامًا', JSON.stringify(r1));
const r2 = T.dcoAuditReason({ hit: 'none', parsed: { display: '695' } });
is(r2.code === 'unknown' && /مش معروفة/.test(r2.detail),
   '⚠️ و«لسه ما استعلمناش» حالة صريحة — مش «مش موجود على شوبيفاي»');
const r3 = T.dcoAuditReason({ hit: 'none', parsed: { display: '695' }, lookup: { found: false } });
is(r3.code === 'not_found', 'وبعد الاستعلام الفاشل بتبقى «مالوش أوردر على شوبيفاي»');
const r4 = T.dcoAuditReason({ hit: 'none', parsed: { display: '695' },
  lookup: { found: true, order: { s1: 'Shipped', s2: null } } });
is(r4.code === 'already_shipped' && /Shipped/.test(r4.detail),
   'وحالة `Shipped` بتقول إن الشحنة مسجّلة إنها خرجت وهي في المكتب');
const r5 = T.dcoAuditReason({ hit: 'none', parsed: { display: '695' },
  lookup: { found: true, order: { s1: 'Ready', s2: null, cancelledAt: '2026-09-14T18:00:00Z' } } });
is(r5.code === 'cancelled',
   '🔴 والإلغاء **بيغلب** أي حالة تانية — طرد أوردره ملغي مش شغل شحن');
const r6 = T.dcoAuditReason({ hit: 'none', parsed: { display: '695' },
  lookup: { found: true, order: { s1: 'Confirmed', s2: null } } });
is(r6.code === 'not_ready' && /Confirmed/.test(r6.detail),
   'وأي حالة تانية بتتعرض **بالحرف** في السبب — بند بيقول «فيه حاجة» تكلفته فحص يدوي');
for (const r of [r1, r2, r3, r4, r5, r6])
  is(!!(r.label && r.detail && r.action), `وكل سبب بيقول التلاتة (label · detail · action) — ${r.code}`);

// ══ ⑦ متفرقات ══════════════════════════════════════════════
console.log('\n══ ⑦ متفرقات ══');
is(T.cmpVersion('1.0.0', '1.0.0') === 0 && T.cmpVersion('0.9.9', '1.0.0') < 0
   && T.cmpVersion('1.10.0', '1.9.0') > 0,
   'مقارنة النسخة **رقمية** مش نصّية (1.10 > 1.9)');
is(T.esc('<img src=x onerror=1>') === '&lt;img src=x onerror=1&gt;', 'تهريب HTML شغّال');
is(T.esc(null) === '', 'و`null` بيرجّع نص فاضي مش «null»');

console.log(`\n${fail ? '❌' : '✅'} النتيجة: ${pass} عدّى · ${fail} فشل`);
process.exit(fail ? 1 : 0);
