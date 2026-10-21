// ══════════════════════════════════════════════════════════════
// shared/dco-rules.js — قواعد الطوابير والجرد والـ webhook (مجال الشحن والتحصيل)
// ══════════════════════════════════════════════════════════════
//
// §QUEUE-RULES · §AUDIT-RULES · ملخّصات «مستقبل حالة بوسطة» و«متابعة التأجيلات» وكاش «رفع بوسطة».
// 🔴 ملف المجال **خاص بالهب ده بس** — مالوش مقابل في الريبو التاني، والـ core
//    (`core.js`) مايعرفش عنه. ترتيب التحميل: `hub-config.js` ← `core.js` ← ده.
// ══════════════════════════════════════════════════════════════


// ── كاش «رفع بوسطة» — عدّاد لكل وضع لوحده (v1.38.0) ─────────────
// 🔴 **بيتخزّن العدد بس مش الصفوف** — صفوف التلات أوضاع تقيلة (عنوان ومطابقة
//    لكل أوردر)، والرئيسية محتاجة رقم «لم يتم الرفع» لكل وضع وبس.
// 🔴 **ولكل وضع وقته** — صفحة الأداة بتجيب وضع واحد في المرة (`loadOrders`)
//    والتانيين في الخلفية (`fetchJobCount`)، فكل واحد بيكتب خانته لوحده.
//    والرئيسية بتاخد **أقدم** وقت فيهم: رقم إجمالي عمره «دقيقتين» وواحد من
//    التلاتة عمره ساعة كان هيبقى ادعاء كاذب.
// ⚠️ الرقم = `!alreadyUploaded` — **نفس** شرط تاب «الرفع» (`UPLOAD_TABS.main`).
const ECO_BOSTA_MODES = ['s1', 'return', 'exchange'];
function bostaCacheSet(mode, n) {
  if (!ECO_BOSTA_MODES.includes(mode) || typeof n !== 'number') return;
  try {
    const raw = sessionStorage.getItem(ECO_CACHE_BOSTA);
    const c = raw ? JSON.parse(raw) : {};
    c[mode] = { at: new Date().toISOString(), n };
    sessionStorage.setItem(ECO_CACHE_BOSTA, JSON.stringify(c));
  } catch {}
}
// بترجّع `null` لو أي وضع ناقص — رقم إجمالي ناقص وضع شكله سليم وهو أقل من الحقيقة.
function bostaCacheGet() {
  try {
    const c = JSON.parse(sessionStorage.getItem(ECO_CACHE_BOSTA) || 'null');
    if (!c || !ECO_BOSTA_MODES.every(m => c[m] && typeof c[m].n === 'number' && c[m].at)) return null;
    const oldest = Math.min(...ECO_BOSTA_MODES.map(m => new Date(c[m].at).getTime()));
    if (isNaN(oldest)) return null;
    return { at: new Date(oldest).toISOString(), ageMs: Date.now() - oldest,
             counts: Object.fromEntries(ECO_BOSTA_MODES.map(m => [m, c[m].n])) };
  } catch { return null; }
}

// ── ملخّص «مستقبل حالة بوسطة» (v1.39.0) ────────────────────────
// 🔴 **الرقم = أرقام التتبع «تحت التوصيل»** — نفس تعريف تاب «🚚 الأوردرات تحت التوصيل» في
//    `Bosta-Webhook-Status-Receiver.html`: آخر حدث لكل رقم تتبع، وأي رقم وصله 45/46/48 ولو مرة
//    أو حدث RTO مش بيتعدّ (RTO بيروح لـ In-Return). الرئيسية بتاخده من `queue_summary` (SQL
//    مجمّع في الـ Worker)، والصفحة بتحسبه من أحداثها وتكتب **نفس الشكل** في الكاش.
// 🔴 **الشكل الخام `{ main:{ total, attempts:{'0','1','2','null'} }, inReturn }`** — `2` = «٢ فأكتر».
//    و`derive` واحدة هنا للشبكة وللكاش وللصفحة — نسختين كانوا هيخلّوا الرقم يخالف نفسه (درس R1).
const ECO_WEBHOOK_ATT = [
  { k: '2',    label: 'محاولتين فأكتر', cls: 'qc-att-2' },
  { k: '1',    label: 'محاولة واحدة',   cls: 'qc-att-1' },
  { k: '0',    label: '0 محاولات',      cls: 'qc-att-0' },
  { k: 'null', label: 'بدون محاولات',   cls: '' },
];
function ecoWebhookDerive(d) {
  const a = d?.main?.attempts || {};
  const chips = ECO_WEBHOOK_ATT.filter(x => a[x.k]).map(x => ({ grp: true, cls: x.cls, label: x.label, n: a[x.k] }));
  if (d?.inReturn) chips.push({ cls: 'qc-job-return', label: '🔁 In-Return', n: d.inReturn, row: 1 });   // سطر لوحده تحت المحاولات
  return { total: d?.main?.total || 0, chips };
}
// الصفحة بتبني نفس الشكل من صفوف تابَيها (صف لكل رقم تتبع)
function ecoWebhookSummaryFromRows(mainRows, inReturnRows) {
  const attempts = {};
  mainRows.forEach(ev => {
    const k = ev.number_of_attempts == null ? 'null' : String(Math.min(Number(ev.number_of_attempts) || 0, 2));
    attempts[k] = (attempts[k] || 0) + 1;
  });
  return { main: { total: mainRows.length, attempts }, inReturn: inReturnRows.length };
}

// ── ملخّص «متابعة التأجيلات» (v1.44.0 · اتغيّر في v1.45.0) ─────────────────────────
// 🔴 **الرقم الكبير = «محتاجين رسالة»** = شحنات تحت التوصيل عليها محاولة توصيل أو أكتر **ولسه ما اتبعتلهاش ولا
//    رسالة** (`unsent`). المربعات = «اتبعتلهم رسالة» (`sent`) و«إجمالي الشحنات» (`total`).
//    (v1.44.0 كان «مستنيين رد» و«محتاجين تصرّف» — الحالات دي اتشالت مع التابات.)
// 🔴 التعريف الوحيد في `openListCTE()` بتاع `bosta-delivery-follow-up-worker` — الرئيسية بتاخد
//    `queue_summary` (SQL مجمّع) والصفحة بتكتب **نفس الشكل الخام** `{ total, unsent, sent }`
//    في نفس مفتاح الكاش بعد كل تحميل. `derive` واحدة هنا للشبكة وللكاش (درس R1).
// ⚠️ الوحدة «شحنة» مش «عميل»: التجميع بالتليفون في الصفحة بس (التليفون من شوبيفاي، والـ SQL مايشوفوش).
function ecoFollowUpDerive(d) {
  const chips = [];
  if (d?.total) {
    chips.push({ cls: 'qc-att-0', label: 'اتبعتلهم رسالة', n: d.sent || 0 });
    chips.push({ cls: '',        label: 'إجمالي الشحنات', n: d.total });
  }
  return { total: d?.unsent || 0, chips };
}

// «قاعد من إمتى» — نفس درجات بادج العمر، بنغمة تأخير.
// ⚠️ الدرجة من `ecoDayLevel` — نفس مصدر بادج العمر — فمستحيل يفترقوا.
function ecoWaiting(iso, now = new Date()) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return { cls: 'tb-none', text: '—' };
  const days = ecoDayDiff(iso, now);
  if (days === null) return { cls: 'tb-none', text: '—' };
  if (days <= 0) {
    const mins = Math.max(0, Math.floor((now.getTime() - t) / 60000));
    return { cls: 'tb-d0', text: mins < 60
      ? `🟢 منذ ${arMin(mins)}`
      : `🟢 منذ ${arHour(Math.floor(mins / 60))}${mins % 60 ? ` و${arMin(mins % 60)}` : ''}` };
  }
  if (days === 1) return { cls: 'tb-d1', text: '🟡 متأخر يوم — منذ أمس' };
  if (days === 2) return { cls: 'tb-d2', text: '🟠 متأخر يومين' };
  if (days <  7)  return { cls: 'tb-d3', text: `🔴 متأخر ${arDay(days)}` };
  return { cls: 'tb-d7', text: `⛔ متأخر ${arDay(days)}` };
}

// ══════════════════════════════════════════════════════════════
// §QUEUE-RULES — 🔴 **المصدر الوحيد لكل اشتقاق في الهب ده**
// ══════════════════════════════════════════════════════════════
//
// 🔴 **ليه مكانها هنا مش في الصفحة:** الشاشة الرئيسية بتعرض **رقم** كل
//    طابور، والصفحة بتعرض **قايمته**. لو القاعدة اتكتبت في الصفحة، الرقمين
//    بيفترقوا **في صمت** — وده حصل فعلاً في هب المخزن v1.11.0: الرئيسية
//    قالت «بوسطة ٦٦» والصفحة فتحت على **٦**، لأن البوابة كانت مكتوبة في
//    `print.html` لوحدها (درس R1).
//    ⛔ ممنوع أي صفحة تعرّف أي حاجة من الكتلة دي تاني. تعريف في صفحة
//       **بيغلب** الـ shell (بيتحمّل قبلها) والقاعدتين هيفترقوا في صمت.
//
// 🔴 **والقاعدة الحاكمة: علّم، متشيلش.** (`ecommoda-order-lifecycle`
//    قاعدة ١٣ و١٤.) الصف الشاذ **بيفضل في الطابور وبيتعدّ في الرقم**، وبياخد
//    علامة بسبب مكتوب وفعل مقترح. إخفاؤه بيغيّر أرقام — وده قرار أحمد مش
//    قرار الكود — وبيخلّي سؤال «الأوردر ده فين؟» بلا إجابة.

// القيم الحرفية — منسوخة من `ecommoda-order-lifecycle` Step 2 بالحرف.
// ⚠️ فرق حرف واحد = مقارنة بترجّع `false` **من غير أي خطأ**.
const ECO_S1_VALUES = [
  'New Order', 'Confirmed', 'WhatsApp-Confirmed', 'WhatsApp-CANCELLED',
  'Confirmed + Edit', 'Pending Edit', 'Ready', 'Shipped',
  'In-Return', 'Delivered', 'Returned', 'Cancelled',
];
const ECO_S2_VALUES = [
  'Confirmed + RETURN', 'Confirmed + EXCHANGE', 'Ready', 'Shipped',
  'In-Return', 'Returned',
];
// 🔴 `Cairo+Giza` فيها `+` والتانيين فيهم `_` (`ecommoda-constants` §1).
//    و`BLANK` **مش زون** — دي «لسه ما اتقررش» (قاعدة ١٦)، فبتتعلّم عليها
//    علامة مراجعة بدل ما تتحسب قناة رابعة.
const ECO_ZONES = ['Cairo+Giza', 'Other_Regions', 'Show_Room'];

// ── العلامات — سبب + القيمة الغلط + الفعل المطلوب ─────────────
//
// 🔴 **قاعدة ١٤: بند مراجعة لازم يقول «ليه»، مش «فيه حاجة».** بند بيقول
//    «فيه مشكلة» وبس تكلفته **فحص يدوي لكل صف**: تفتح الأوردر على شوبيفاي
//    وتقارن `cancelledAt` و S1 و S2 بإيدك. فكل علامة هنا بتحمل:
//    `code` (للتشخيص) · `label` (اللي بيتعرض) · `detail` (القيمة الغلط
//    بالحرف) · `action` (اللي المفروض يتعمل).
function ecoFlags(o, status, queue) {
  const f = [];
  const machine = ecoMachineByStatus(o, status);

  // ① ملغي وهو لسه في الطابور — **أول واحدة، وده مقصود**
  // القاعدة ٢ في `order-lifecycle`: الإلغاء بييجي من **حدث شوبيفاي**
  // (`cancelledAt`)، والميتافيلد مصدر ثانوي بيتقرا بس لما شوبيفاي ما سجّلتش
  // إلغاء. الاتنين بيتفحصوا هنا لأن أي واحد فيهم معناه إن الصف ده مش شغل.
  if (o.cancelledAt || o.s1 === 'Cancelled') {
    f.push({ code: 'cancelled', label: 'ملغي',
      detail: o.cancelledAt ? `اتلغى على شوبيفاي (${formatDate(o.cancelledAt)})` : 'حالة S1 = Cancelled',
      action: queue === 'shipped'
        ? 'شحنة خرجت على أوردر ملغي — راجعها مع المندوب فورًا'
        : 'اقفل الشحنة ورجّع المنتجات على الرف' });
  }

  // ② الماكينتين على نفس القيمة
  if (o.s1 === status && o.s2 === status) {
    f.push({ code: 'both_machines', label: 'الماكينتين مع بعض',
      detail: `S1 و S2 الاتنين = «${status}»`,
      action: 'الصف محسوب على الشحنة الأصلية (S1) — اتأكد إيه اللي فعلاً في الطريق' });
  }

  // ③ دورة استبدال/استرجاع والشحنة الأصلية لسه ما اتسلّمتش
  // 🔴 القاعدة: S2 مابيبدأش غير بعد `S1 = Delivered` (`order-lifecycle`
  //    Step 2 — `Delivered` نهائية في S1 وكل اللي بعدها في S2).
  if (machine === 's2' && o.s1 !== 'Delivered') {
    f.push({ code: 's2_before_delivered', label: 'دورة استبدال بدري',
      detail: `S2 = «${status}» والشحنة الأصلية S1 = «${o.s1 || 'فاضي'}» مش Delivered`,
      action: 'راجع حالة الأوردر — دورة الاستبدال المفروض تبدأ بعد التسليم' });
  }

  // ④ حالة بره قايمة الاختيار (قاعدة ١٣ — علّم، متحركهاش)
  if (o.s1 && !ECO_S1_VALUES.includes(o.s1)) {
    f.push({ code: 's1_unknown', label: 'حالة S1 مش معروفة',
      detail: `«${o.s1}» مش من القايمة المعتمدة`,
      action: 'القيمة اتكتبت غلط أو من Flow قديم — صحّحها من أدمن شوبيفاي' });
  }
  if (o.s2 && !ECO_S2_VALUES.includes(o.s2)) {
    f.push({ code: 's2_unknown', label: 'حالة S2 مش معروفة',
      detail: `«${o.s2}» مش من القايمة المعتمدة`,
      action: 'القيمة اتكتبت غلط أو من Flow قديم — صحّحها من أدمن شوبيفاي' });
  }

  // ⑤ الزون — «فاضي/BLANK» و«قيمة غريبة» **حالتين مختلفتين**
  // ⚠️ `BLANK` معناها «لسه ما اتقررش» مش زون رابع (قاعدة ١٦). وأوردر
  //    وصل `Ready`/`Shipped` وزونه لسه غير محدّد معناه إن قرار القناة
  //    ما اتاخدش وهو **بيشحن دلوقتي**.
  if (!o.zone || o.zone === 'BLANK') {
    f.push({ code: 'zone_missing', label: 'بلا قناة',
      detail: `custom.zone = «${o.zone || 'فاضي'}»`,
      action: 'حدّد القناة (قاهرة+جيزة · بوسطة · شو روم) قبل ما الشحنة تتحرّك' });
  } else if (!ECO_ZONES.includes(o.zone)) {
    f.push({ code: 'zone_unknown', label: 'قناة مش معروفة',
      detail: `custom.zone = «${o.zone}»`,
      action: 'القيمة بره قايمة الاختيار — صحّحها من أدمن شوبيفاي' });
  }

  // ⑥ خاص بكل طابور
  if (queue === 'ready') {
    // الطرد مع المندوب والحالة لسه «جاهز» — يعني اتسلّم ومحدش سجّل الشحن
    const wa = machine === 's2' ? o.whereaboutsS2 : o.whereaboutsS1;
    if (wa === 'Courier') {
      f.push({ code: 'at_courier', label: 'الطرد مع المندوب',
        detail: 'عهدة الطرد = Courier والحالة لسه Ready',
        action: 'الشحنة خرجت — لازم حالتها تتحوّل لـ Shipped' });
    }
  } else if (queue === 'shipped') {
    // 🔴 **الحارس ده على S1 بس — والقصر مقصود.** أداة الشحن بتقفل الحالة
    //    على `Shipped` **وبتعمل فلفلمنت** في نفس الخطوة، فـ`UNFULFILLED`
    //    على صف S1 معناه إن الشحنة مش مسجّلة على شوبيفاي أصلاً.
    //    ⛔ أما صفوف S2 فعُرف الفلفلمنت فيها **مش مؤكَّد عندنا** — وعلامة
    //       غلط على كل صف استبدال أسوأ من مفيش علامة: الموظف بيتعلّم
    //       يعدّي على التحذير كله (نفس درس `already` الأحمر).
    //    ⚠️ والفحص على `UNFULFILLED` **بالظبط** — `PARTIALLY_FULFILLED`
    //       حالة حقيقية على أوردر اتشحن جزئيًا، ومش شذوذ.
    if (machine === 's1' && o.fulfillment === 'UNFULFILLED') {
      f.push({ code: 'not_fulfilled', label: 'بلا فلفلمنت',
        detail: 'الحالة Shipped بس شوبيفاي مسجّلة الأوردر UNFULFILLED',
        action: 'الشحنة مش مسجّلة على شوبيفاي — راجع خطوة الشحن' });
    }
  }

  return f;
}

// ── شكل الصف المعروض ──────────────────────────────────────────
//
// ⚠️ **الاختيار بماكينة الصف مش ثابت على S1.** صف الاستبدال بياخد
//    `s2_packing_date_time` و`s2_packed_by` و`…_s2` — أخد قيمة S1 لصف S2
//    معناه **بيانات شحنة تانية** على نفس الأوردر: رقم غلط شكله سليم.
//    (نفس الفخ المقيس في `package-transfer-to-office`: ٦ من ٦ صفوف S2
//    كانت هتعدّي بفحص S1، والصح ٢.)
function ecoShapeRow(o, status, queue, now = new Date()) {
  const machine = ecoMachineByStatus(o, status);
  const isS2 = machine === 's2';
  const tracking = isS2 ? (o.trackingS2 || null) : (o.trackingS1 || null);
  return {
    ...o,
    machine,
    machineLabel: isS2 ? 'استبدال/استرجاع' : 'عادي',
    packedAt: isS2 ? o.packedAtS2 : o.packedAtS1,
    packedBy: isS2 ? o.packedByS2 : o.packedByS1,
    whereabouts: isS2 ? o.whereaboutsS2 : o.whereaboutsS1,
    // 🔴 الجديد أولاً، والقديم **fallback مُعلَن**: `trackingLegacy` بيقول
    //    إن الرقم جه من `custom.bosta_tracking_number` المتوقّف، عشان
    //    «الرقم ده من حقل قديم» تبقى معلومة ظاهرة مش تخمين.
    tracking: tracking || o.trackingLegacy || null,
    trackingIsLegacy: !tracking && !!o.trackingLegacy,
    courierGroup: ecoCourierGroup(o.courier),
    flags: ecoFlags(o, status, queue),
    age: ecoOrderAge(o.createdAt, now),
  };
}

// ── بناء الطابور كامل ─────────────────────────────────────────
//
// 🔴 **الترتيب: الأقدم فوق.** الأوردر اللي قاعد من أطول مدة هو اللي محتاج
//    تحرّك دلوقتي — سواء كان مستني يخرج (جاهز) أو خارج ومحدش قافله
//    (مشحون). الترتيب بالأحدث كان هيدفن بالظبط الصفوف اللي الأداة اتعملت
//    عشانها تحت صفوف النهاردة.
// ⚠️ **وصفر فلترة هنا.** كل أوردر رجع من الـ Worker بيدخل الطابور — اللي
//    عليه شذوذ بياخد علامة وبيفضل. ⛔ أي `filter` في الدالة دي بيحوّلها من
//    «عرض» لـ«حكم»، والحكم ده مش بتاعنا (قاعدة ١٣).
function ecoQueueRows(orders, status, queue, now = new Date()) {
  const rows = (orders || []).map(o => ecoShapeRow(o, status, queue, now));
  rows.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  return rows;
}

// ── الفلوس — «مستحق التحصيل» ──────────────────────────────────
//
// 🔴 **`currentTotalPriceSet` مش `totalPriceSet`** — التاني بيمسك القيمة
//    الأصلية وبيفضل زي ما هو بعد أي تعديل أو مرتجع (`order-lifecycle`
//    قاعدة ٣)، يعني رقم أكبر من اللي المندوب هيحصّله فعلاً.
//
// 🔴 **و`PENDING` بالظبط.** الأوردر المدفوع أونلاين مش تحصيل، وجمعه في
//    الرقم بيخلّي «المستحق» أكبر من الحقيقة. والاستبعاد ده **مش صامت** —
//    بيرجع بعدده عشان الشاشة تقوله (`prepaidCount`).
// ⚠️ والقيمة بتتقرا من `displayFinancialStatus` اللي بييجي من شوبيفاي —
//    مش من ميتافيلد. صف مالوش القيمة دي بيتعدّ في `unknownCount` **ولا
//    بيتجمع ولا بيتستبعد في صمت**.
function ecoCod(rows) {
  let due = 0, dueCount = 0, prepaidCount = 0, unknownCount = 0, currency = null;
  for (const r of rows || []) {
    // 🔴 **`Number(null)` بيرجّع 0** — فأوردر `PENDING` مالوش مبلغ كان بيتعدّ
    //    **أوردر مستحق بصفر جنيه**: عدّاد الأوردرات بيكبر والمجموع مابيزيدش،
    //    فالرقم بيقلّ **من غير أي إشارة**. الفحص لازم يبقى على القيمة قبل
    //    التحويل مش بعده.
    const raw = r.total;
    const amt = (raw === null || raw === undefined || raw === '') ? NaN : Number(raw);
    if (!r.financial) { unknownCount++; continue; }
    if (r.financial === 'PENDING') {
      if (Number.isFinite(amt)) { due += amt; dueCount++; if (!currency) currency = r.currency; }
      else unknownCount++;   // ⚠️ مستحق بلا مبلغ = **مجهول**، مش صفر
    } else {
      prepaidCount++;
    }
  }
  return { due, dueCount, prepaidCount, unknownCount, currency: currency || 'EGP' };
}

// عرض الفلوس — بلا كسور لما تكون صفر، وبفواصل آلاف.
// ⚠️ `en-US` عن قصد: الأرقام في الشاشة كلها لاتينية (`direction:ltr`)،
//    وخلط الأرقام العربية-الهندية مع اللاتينية في نفس العمود بيصعّب
//    المقارنة بالعين.
function ecoMoney(n, currency = 'EGP') {
  // 🔴 **«مش معروف» ≠ «صفر»** — و`Number(null)` بيرجّع **0**، يعني خانة فلوس
  //    مالهاش قيمة كانت هتقول «0 ج» بدل «—». صفر حقيقي معناه «مفيش فلوس»،
  //    و«—» معناها «إحنا مش عارفين» — والفرق ده هو الفرق بين رقم صحيح ورقم
  //    غلط شكله سليم. (نفس قاعدة «العدّاد `—` مش `0` قبل أول جلب».)
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const s = v % 1 === 0
    ? v.toLocaleString('en-US')
    : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${s} ${currency === 'EGP' ? 'ج' : esc(currency)}`;
}

// عدد الصفوف اللي عليها علامة — للمربع الكهرماني.
function ecoFlaggedCount(rows) {
  return (rows || []).reduce((n, r) => n + ((r.flags && r.flags.length) ? 1 : 0), 0);
}

// المربعات اللي بتتعرض تحت الرقم الكبير — **مصدر واحد للرئيسية وللصفحتين**.
// ⚠️ مربع «محتاجة مراجعة» بيظهر **بس لما يكون فيه فعلاً** — تحذير دايم
//    على الشاشة بيتحوّل لديكور والموظف بيبطّل يشوفه.
function ecoChips(rows) {
  const cn = ecoCourierCounts(rows);
  const chips = ECO_COURIER_GROUPS.map(g => ({ grp: true, cls: g.cls, label: g.label, n: cn[g.key] }));   // 🎨 مجموعة موصولة (§HOME-CHIPS)
  const flagged = ecoFlaggedCount(rows);
  if (flagged) chips.push({ cls: 'qc-flag', label: '⚠️ محتاجة مراجعة', n: flagged });
  return chips;
}

// ══════════════════════════════════════════════════════════════
// §AUDIT-RULES — 🔴 قواعد «جرد المكتب» (v1.3.0 · طلب أحمد 16-09-2026)
// ══════════════════════════════════════════════════════════════
//
// الجرد بيجاوب على سؤال واحد: **كل طرد المفروض يكون في المكتب — موجود
// فعلاً؟** الموظف بيعمل سكان لباركود كل طرد، والنتيجة تلات أقسام:
//   ① **مضبوطة**    — في النطاق واتعمل لها سكان
//   ② **مفقودة**    — في النطاق و**ما اتعملّهاش سكان** (الطرد مش في المكتب)
//   ③ **موجودة خطأ** — اتعمل لها سكان و**مش في النطاق**
//
// 🔴 **ليه القواعد دي هنا مش في الصفحة:** نفس سبب §QUEUE-RULES — الدوال
//    دي بتتقاس في `docs/rules-check.mjs` على **مدخلات باظة** (`null` ·
//    كود بحروف · سكانة مكررة · صف بلا `orderId`)، وده مستحيل على قاعدة
//    مكتوبة جوّه سكربت صفحة. ⛔ وممنوع أي صفحة تعرّف أي واحدة منهم تاني.
//
// ⚠️ **بس الجرد نفسه مالوش رقم على الشاشة الرئيسية** — عكس الطابور. الرقم
//    الوحيد اللي بيتعرض فوق هو عدد الطابور، والجرد جلسة **محلية على جهاز
//    الموظف** (مافيش D1 ولا أي كتابة — الأداة عرض بحت، وأي كتابة محتاجة
//    تسجيل `tool`/`type` في `ecommoda-constants` §7 **قبلها** · Rule 7).

// 🔴 **حالة الجرد في `sessionStorage`** — refresh وسط جرد ١٢٦ طرد كان
//    بيمسح ساعة شغل **بلا أي تحذير**. المفتاح مستقل عن كاش الطابور:
//    الطابور بيتجدّد مع كل جلب والجرد **لازم يفضل مثبّت**.
// ⚠️ ومقصود إنه `sessionStorage` مش `localStorage`: السر هو **الحاجة
//    الوحيدة** في التخزين الدائم في الريبو كله (#28 · #39). والثمن مُعلَن:
//    قفل التاب = الجرد ضاع، وده مكتوب في «عن الأداة».
const ECO_AUDIT_READY = 'dco_audit_ready';

// ── ① تطبيع الكود اللي جاي من السكانر ────────────────────────
//
// 🔴 **الباركود على الطرد فيه Order ID الطويل** (قرار أحمد 16-09-2026) —
//    مش رقم الأوردر المعروض. عشان كده الرقم الطويل بيتفسّر `id` والقصير
//    `name`.
// ⚠️ **والتفسيرين بيرجعوا مع بعض عن قصد** (`id` و`name` في نفس الكائن):
//    المطابقة بتجرّب الاتنين، فكود على حدّ العتبة مايضيعش. العتبة وحدها
//    كانت بتخلّي أوردر اسمه رقم طويل (وده موجود فعلاً في المتجر — نفس
//    الحالة اللي `Ready-to-Ship` القديمة عالجتها) يتقري «مش موجود».
// ⚠️ **والسكانر بيحقن رموز** (Enter · Tab · شرطة) — التنضيف بيسيب الأرقام
//    و`#` بس. و`raw` بيتحفظ زي ما هو لمطابقة رقم التتبع تحت.
function ecoScanParse(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  // GID كامل — `gid://shopify/Order/6959895839042`
  const gid = s.match(/Order\/(\d+)/);
  const digits = gid ? gid[1] : s.replace(/[^\d]/g, '');
  if (!digits) return null;

  // 🔴 عتبة ١٠ أرقام: الـ Order ID في شوبيفاي ١٣ رقم، ورقم الأوردر المعروض
  //    في المتجر ٥ (`#55001`). أي حاجة ≥ ١٠ بتتعامل `id` **أولاً**.
  const looksId = digits.length >= 10;
  return {
    raw: s,
    kind: looksId ? 'id' : 'name',
    // ⚠️ `id` بيتساب `null` تحت ٦ أرقام — الـ Worker بيرفض أي أقل من كده
    //    أصلاً، وإرساله معناه استعلام مضمون إنه بلا نتيجة.
    id:   digits.length >= 6 ? digits : null,
    name: '#' + digits,
    display: looksId ? digits : '#' + digits,
  };
}

// مفتاح السكانة — للتفريد **قبل** ما نعرف الأوردر.
// ⚠️ بعد المطابقة التفريد بيبقى على `orderId` مش على المفتاح ده: نفس
//    الأوردر ممكن يتعمله سكان بالاسم مرة وبالـ ID مرة، والعدّ مرتين كان
//    بيخلّي «مضبوطة» أكبر من النطاق نفسه.
function ecoScanKey(p) {
  if (!p) return '';
  return p.kind === 'id' && p.id ? `id:${p.id}` : `name:${p.name}`;
}

// ── ② مطابقة الكود على صفوف موجودة ──────────────────────────
//
// 🔴 **الترتيب هو القرار:** الـ ID أولاً (هو اللي في الباركود)، بعده الاسم،
//    وآخر حاجة رقم التتبع. لو الاسم اتفحص الأول، كود `#123456789012` كان
//    بيقع على أوردر اسمه كده لو موجود بدل الأوردر اللي الـ ID بتاعه.
// ⚠️ ومطابقة رقم التتبع **بالتساوي الكامل** على `raw` — مش `includes`.
//    `includes` على رقم تتبع بيخلّي `123` تطابق `1234567`، والفخ ده مقيس
//    في فحص الباركود بتاع هب المخزن.
function ecoScanFind(rows, p) {
  if (!p) return null;
  const list = rows || [];
  if (p.id) {
    for (const r of list) if (r && String(r.orderId) === p.id) return r;
  }
  // 🔴 **المقارنة بعد شيل `#`** — نفس قاعدة مربع البحث في الصفحة: الباركود
  //    بيدّي `55001` والاسم على شوبيفاي `#55001` (والعكس موجود كمان —
  //    أوردر اسمه رقم طويل بلا `#`). المطابقة الحرفية كانت بترجّع «مش
  //    موجود» على أوردر قدام الموظف في الجدول.
  if (p.name) {
    const want = p.name.replace(/^#/, '');
    for (const r of list) if (r && String(r.orderName || '').replace(/^#/, '') === want) return r;
  }
  const t = String(p.raw || '').trim();
  if (t) {
    for (const r of list) if (r && r.tracking && String(r.tracking).trim() === t) return r;
  }
  return null;
}

// ── ③ التلات أقسام ──────────────────────────────────────────
//
// 🔴 **النطاق لقطة (snapshot) بيتثبّت وقت «بدء الجرد»** — مش بيتحسب من
//    الفلتر الحالي. أحمد اختار «المعروض بعد الفلتر» نطاقًا (16-09-2026)،
//    والحساب الحيّ من الفلتر كان معناه إن أي ضغطة فلتر وسط الجرد **تغيّر
//    قايمة المفقود فجأة** — رقم غلط شكله سليم. فالفلتر بيحدد النطاق **مرة
//    واحدة** عند البدء، والشاشة بتقول الفلتر اللي اتثبت بيه بالنص.
// ⚠️ والصف الشاذ (ملغي · بلا قناة · مع المندوب) **في النطاق زي أي صف** —
//    قاعدة ١٣: علّم، متشيلش. الجرد بيقول «موجود/مفقود» بس، والعلامة
//    بتفضل على الصف.
function ecoAuditBuckets(scope, scans) {
  const rows     = (scope || []).filter(r => r && r.orderId != null);
  const scopeIds = new Set(rows.map(r => String(r.orderId)));
  const list     = scans || [];

  // ⚠️ السكانة اللي طابقت صف في النطاق هي الوحيدة اللي بتعدّ «مضبوط» —
  //    والباقي كله «موجودة خطأ» بسبب مسمّى (تحت).
  const hitIds = new Set(
    list.filter(s => s && s.orderId != null && scopeIds.has(String(s.orderId)))
        .map(s => String(s.orderId))
  );

  const matched = rows.filter(r => hitIds.has(String(r.orderId)));
  const missing = rows.filter(r => !hitIds.has(String(r.orderId)));
  const extra   = list.filter(s => !(s && s.orderId != null && scopeIds.has(String(s.orderId))));

  return {
    matched, missing, extra,
    counts: {
      scope:   rows.length,
      matched: matched.length,
      missing: missing.length,
      extra:   extra.length,
      // ⚠️ «لسه ما اتعملّهاش سكان» **مش** «مفقودة» — الأولى حالة وسط الجرد
      //    والتانية نتيجة بعد ما يتقفل. نفس الرقم واسمين مختلفين، والخلط
      //    بينهم بيخلّي الموظف يفتكر إن فيه طرد ضايع وهو لسه بيسكن.
      pending: missing.length,
    },
  };
}

// ── ④ سبب «موجودة خطأ» — لازم يقول ليه والفعل المطلوب ───────
//
// 🔴 **قاعدة ١٤ حرفيًا:** «موجود خطأ» لوحدها بند بيقول «فيه حاجة» وبس،
//    وتكلفته فحص يدوي لكل طرد على شوبيفاي. فكل مدخل هنا بيحمل:
//    `label` (اللي حصل) · `detail` (القيمة بالحرف) · `action` (المطلوب).
// ⚠️ **وحالة «لسه ما استعلمناش» حالة صريحة** — مش بتتقري «مش موجود على
//    شوبيفاي». الفرق بين «مش عارفين» و«مش موجود» هو الفرق بين «اسأل» و
//    «الطرد ده مالوش أوردر خالص».
function ecoAuditReason(s) {
  const code = s?.parsed?.display || s?.key || '؟';

  // ① الأوردر في الطابور فعلاً — بس بره نطاق الجرد (الفلتر اللي اتثبت)
  if (s?.hit === 'queue' && s.row) {
    return { code: 'out_of_scope', label: 'جاهز للشحن — بس بره نطاق الجرد',
      detail: `الأوردر ${s.row.orderName || code} حالته Ready فعلاً، بس الفلتر اللي بدأت بيه الجرد مش شامله`,
      action: 'الطرد مكانه صح — وسّع نطاق الجرد (امسح الفلتر وابدأ من جديد) لو عايز تعدّه' };
  }

  // ② استعلمنا والأوردر مش موجود على شوبيفاي خالص
  if (s?.lookup && s.lookup.found === false) {
    return { code: 'not_found', label: 'مالوش أوردر على شوبيفاي',
      detail: `الكود «${code}» ما رجّعش أي أوردر`,
      action: 'اتأكد من الباركود — ممكن يكون طرد أداة تانية أو ملصق قديم' };
  }

  // ③ استعلمنا ولقيناه — الحالة الحقيقية هي السبب
  if (s?.lookup && s.lookup.order) {
    const o = s.lookup.order;
    const st = [`S1 = «${o.s1 || 'فاضي'}»`, `S2 = «${o.s2 || 'فاضي'}»`].join(' · ');
    if (o.cancelledAt) {
      return { code: 'cancelled', label: 'أوردر ملغي',
        detail: `اتلغى على شوبيفاي (${formatDate(o.cancelledAt)}) — ${st}`,
        action: 'رجّع المنتجات على الرف — الطرد ده مش شغل شحن' };
    }
    if (o.s1 === 'Shipped' || o.s2 === 'Shipped') {
      return { code: 'already_shipped', label: 'مسجّل إنه خرج',
        detail: `${st} — يعني الشحنة مسجّلة إنها خرجت وهي لسه في المكتب`,
        action: 'الطرد في المكتب والحالة بتقول اتشحن — راجع خطوة الشحن' };
    }
    if (o.s1 === 'Delivered' || o.s1 === 'Returned' || o.s2 === 'Returned') {
      return { code: 'closed', label: 'أوردر مقفول',
        detail: `${st} — الأوردر خلص دورته`,
        action: 'راجع الطرد — ممكن يكون مرتجع محتاج يتفتح أو ملصق قديم' };
    }
    return { code: 'not_ready', label: 'حالته مش Ready',
      detail: `${st} — الأوردر ده مش في قسم الجاهز للشحن`,
      action: 'الطرد ده مش المفروض يكون مع الجاهز للشحن — حدّد حالته الصح أو رجّعه مكانه' };
  }

  // ④ لسه ما استعلمناش
  // ⚠️ **الحالة دي بقت استثناء مش قاعدة** (v1.4.1): الاستعلام بيشتغل
  //    **تلقائيًا مع «إنهاء الجرد»**، فالصف اللي لسه بيقولها معناه إن
  //    النداء التلقائي **فشل** (Worker أقدم من 1.2.0 أو شبكة واقعة) —
  //    والفعل بقى «إعادة المحاولة» مش «ابدأ الاستعلام».
  // ⛔ والفرق مهم: «اضغط استعلام» على شاشة **اتستعلمت فعلاً** بتخلّي
  //    الموظف يدوّر على زرار، ولو لقاه يضغطه ويستنى نفس الفشل بلا تفسير.
  return { code: 'unknown', label: 'مش في قسم الجاهز للشحن',
    detail: `الكود «${code}» ما طابقش أي أوردر في القسم — وحالته الحقيقية لسه مش معروفة`,
    action: 'الاستعلام بيتم تلقائي مع إنهاء الجرد — لو لسه مش معروفة يبقى النداء فشل، اضغط «إعادة محاولة الاستعلام»' };
}
