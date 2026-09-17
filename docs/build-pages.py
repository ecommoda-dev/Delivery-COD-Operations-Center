#!/usr/bin/env python3
# ══════════════════════════════════════════════════════════════
# docs/build-pages.py — مولّد صفحتَي الطابور (نسخة واحدة بمعاملين)
#
# 🔴 **الصفحتان متولّدتان من هنا — مش مكتوبتين بالإيد.**
#    `ready-orders.html` و`shipped-orders.html` **متطابقتان بالحرف** فيما عدا
#    المعاملات تحت. ده تطبيق مباشر لدرس R1: نسختان بتتعدّلا بالإيد بيفترقا
#    مع أول تعديل.
# ⛔ **ممنوع تعديل الـ HTML مباشرةً** — التعديل بيضيع في صمت مع أول تشغيل.
#
# التشغيل:  python3 docs/build-pages.py   (من جذر الريبو)
#           وبعده: node docs/rules-check.mjs && node docs/queues-check.mjs
# ══════════════════════════════════════════════════════════════
# ⚠️ الملفين الناتجين **متطابقين بالحرف** فيما عدا المعاملات تحت.
#    أي تعديل على أي واحد فيهم يتعمل في الاتنين في نفس التمريرة (درس R1).
# ══════════════════════════════════════════════════════════════

# دالة خلية العمود الزيادة — **كل صفحة بتاخد بتاعتها بس**.
# ⚠️ دالة بلا مستهلك = كود ميت، مش «احتياط».
WA_FN = '''// 🔴 **بادج مش نص سادة** (v1.6.0 · طلب أحمد 17-09-2026). الطابور ده
//    أوردرات **المفروض طرودها في المكتب**، فالعمود ده سؤال بإجابتين:
//    الطرد مكانه صح (`Office`) ولا لأ. لون بيتقري من بعيد بيخلّي الصف
//    المخالف يبان **قبل** ما الموظف يقرا القيمة.
// 🔴 **و`Office` بالظبط هي الخضرا** — أي قيمة تانية (`Warehouse` ·
//    `Courier` · قيمة بره القايمة) بتاخد **أحمر + ⚠**: الطرد مش في
//    المكتب وهو المفروض يكون، ودي حالة محتاجة تدخّل مش معلومة عابرة.
// 🔴 **والفاضي بيفضل `—` محايد — ⛔ مش أحمر.** «محدش سجّل» **مش** «الطرد
//    في مكان غلط»، والفرق ده هو الفرق بين تحذير حقيقي وتحذير على
//    **أغلب الطابور** (أداة التغليف لسه ما بتكتبش الحقل). أحمر على كل
//    صف بيعلّم الموظف يعدّي على اللون كله — نفس درس `already` الأحمر
//    في سكانرات بوسطة.
// 🔴 **الفاضي `—` مش «لسه مش مسجّلة»** (طلب أحمد 16-09-2026).
//    الجملة كانت **الأغلبية الساحقة** من صفوف العمود (أداة التغليف لسه
//    ما بتكتبش الحقل)، فكانت بتاخد سطرين في كل خلية تقريبًا وبتزاحم
//    القيم الحقيقية القليلة اللي الموظف بيدوّر عليها.
//    ⚠️ والمعنى **مكتوب في «عن الأداة»**: `—` هنا معناها «محدش سجّل»،
//       مش «المخزن». ⛔ ومش مسموح تتشال من هناك.
// 🔴 **خريطة واحدة للعمود وللفلتر** (v1.7.0 · طلب أحمد 17-09-2026).
//    قبل كده العمود كان بيقول «✅ في المكتب» وقايمة الفلتر بتقول
//    `Office`: الموظف بيشوف كلمة في الخلية وبيدوّر عليها في القايمة
//    **ومايلقهاش**، فيفتكر إن القيمة دي مش قابلة للفلترة.
//    ⛔ ونسختان من نفس التسمية بيفترقوا مع أول قيمة جديدة (درس R1) —
//       فالمصدر **واحد** هنا، والعمود والفلتر الاتنين بيقروا منه.
const WA_MAP  = { Warehouse: 'المخزن', Office: 'المكتب', Courier: 'مع المندوب' };
// 🔴 **والفاضي `—` بالحرف — في العمود وفي الفلتر وفي المربع** (v1.8.0 ·
//    طلب أحمد 17-09-2026). قبل كده الفلتر كان بيقول «— مش مسجّل» والخلية
//    بتقول `—`، فالبند في القايمة كان بيتقري **قيمة تانية** غير اللي في
//    الجدول — والموظف بيدوّر على `—` ومايلقهاش.
//    ⛔ ونسختان من نفس التسمية بيفترقوا مع أول تعديل (درس R1)، فالقيمة
//       الخام والليبل بقوا **حاجة واحدة** هنا.
//    ⚠️ **والمعنى مكتوب في «عن الأداة»** — `—` هنا «محدش سجّل» مش
//       «المخزن»، ⛔ ومش مسموح يتشال من هناك: ده المكان الوحيد الباقي
//       اللي بيقول الفرق ده بالنص.
const WA_NONE = '—';
function waText(v) { return WA_MAP[v] || v; }

// 🔴 **`Office` بالظبط هي الحالة السليمة** — والقاعدة دي **مصدر واحد**
//    للعمود وللمربع فوق الطابور. نسختان من الشرط ده كانوا هيفترقوا مع
//    أول قيمة جديدة: خلية حمرا ومربع أخضر على نفس الأوردر.
function waIsOk(v) { return v === 'Office'; }

// 🔴 **ليبل الفلتر == نص البادج في العمود بالحرف** — نفس الرمز ونفس
//    الكلمة. أي فرق بينهم معناه إن الموظف بيتعلّم تسميتين لنفس القيمة.
function waFilterLabel(v) {
  if (v === WA_NONE) return WA_NONE;
  return waIsOk(v) ? '✅ في المكتب' : `⚠ ${waText(v)}`;
}

// ── 🔴 مربعات «موقع الشحنة» فوق الطابور (v1.8.0 · طلب أحمد 17-09-2026) ─
//
// الترتيب **ثابت** زي مربعات المندوب بالظبط — الترتيب بالعدد كان هيرقّص
// المربعات مكانها مع كل تحديث، والموظف بيدوس على **مكان** مش على كلمة.
// ⚠️ **والأربعة بيظهروا حتى بصفر** — مربع بيختفي لما يبقى صفر معناه إن
//    الموظف مش عارف إن القيمة دي موجودة في الأداة أصلاً.
// 🔴 **وأي قيمة بره القايمة بتاخد مربعها** (بتتضاف في الرسم) — من غير
//    كده الصف ده مايكونش ليه مربع، ومجموع المربعات يقلّ عن الطابور
//    **في صمت**.
const WA_CHIP_ORDER = ['Office', 'Warehouse', 'Courier', WA_NONE];

// ⚠️ **نفس ألوان البادج في العمود بالحرف** (`waIsOk`) — مربع بلون وخلية
//    بلون تاني لنفس القيمة بيتقروا حالتين مختلفتين.
function waChipClass(v) {
  if (v === WA_NONE) return 'qc-wa-none';
  return waIsOk(v) ? 'qc-wa-ok' : 'qc-wa-warn';
}

function whereaboutsCell(o) {
  if (!o.whereabouts) return '<span class="flag-ok">—</span>';
  if (waIsOk(o.whereabouts)) return '<span class="wa-badge wa-ok">✅ في المكتب</span>';
  // ⚠️ **القيمة الغلط بتتعرض بالحرف** — «مكان تاني» بتخلّي الموظف يفتح
  //    الأوردر على شوبيفاي عشان يعرف هو فين (قاعدة ١٤).
  return `<span class="wa-badge wa-warn">⚠ ${esc(waText(o.whereabouts))}</span>`;
}'''

# مربعات «موقع الشحنة» فوق الطابور — **صفحة الجاهز بس** (v1.8.0).
# ⚠️ الكتلة دي **مالهاش مكان في صفحة المشحون**: مفيش فيها فلتر `where`
#    أصلاً، و`qMsState.where` مش موجود — فالكود ده هناك كان هيرمي على
#    أول رسم. دالة بلا مستهلك = كود ميت، مش «احتياط».
WA_CHIPS_JS = '''
// ── 🔴 مربعات «موقع الشحنة» (v1.8.0 · طلب أحمد 17-09-2026) ──────
//
// 🔴 **العدّ من `of` بتاعة الفلتر نفسها بالحرف** — مش من `o.whereabouts`
//    مباشرةً. قاعدتان (واحدة للعدّ وواحدة للفلترة) كانوا هيفترقوا مع أول
//    قيمة غريبة: مربع بيقول «٦٤» بيفتح جدول بـ٦٣ صف **بلا أي خطأ**.
// 🔴 **والمربع بيكتب في الفلتر — مش حالة تانية جنبه.** حالتان منفصلتان
//    (مربع فوق وفلتر تحت) كانوا هيفترقوا: الموظف يفلتر من لوحة الفلاتر
//    والمربع فوق يفضل مطفي، فيدوس عليه فيدهس فلتره من غير ما يقصد —
//    نفس قاعدة مربعات المندوب بالحرف.
// ⚠️ **والعدّ من الطابور الكامل مش من المعروض** — العدّ على المفلتر كان
//    هيصفّر باقي المربعات بعد أول ضغطة فالموظف مايقدرش يرجع منها.
function qWaCounts() {
  const of = Q_FILTERS.find(f => f.key === 'where').of;
  // ⚠️ الأربعة المعروفة **بترتيبها الثابت** الأول، وأي قيمة غريبة بتتضاف
  //    بعدهم — `Map` بتحافظ على ترتيب الإدخال، فالمربعات مابترقصش.
  const counts = new Map(WA_CHIP_ORDER.map(v => [v, 0]));
  for (const o of qState.rows) {
    const v = String(of(o));
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return counts;
}
function qWaRender() {
  const box = document.getElementById('qWaChips');
  if (!box) return;
  const sel = qMsState.where.selected;
  box.innerHTML = [...qWaCounts()].map(([v, n]) => {
    const on = sel.has(v);
    // ⚠️ علامة ✕ بتتحط من CSS (`.zchip.on::after`) مش من هنا — زي مربعات
    //    المندوب بالظبط: عنصر زيادة في الماركب بيدخل في `innerText`
    //    وبيكسر أي بند بيقرا العدّ من نص المربع.
    // ⚠️ **والليبل من `msLabel`** — نفس اللي القايمة والشيب بيقروه، فمستحيل
    //    المربع يقول حاجة والقايمة تقول حاجة تانية لنفس القيمة.
    return `<button type="button" class="zchip ${waChipClass(v)}${on ? ' on' : ''}" data-wa="${esc(v)}"`
         + ` aria-pressed="${on ? 'true' : 'false'}"><span>${esc(msLabel('q', 'where', v))}</span>`
         + `<span class="zchip-n">${n}</span></button>`;
  }).join('');
}
document.getElementById('qWaChips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-wa]');
  if (!btn) return;
  const sel = qMsState.where.selected;
  const v = btn.dataset.wa;
  sel.has(v) ? sel.delete(v) : sel.add(v);
  // ⚠️ **القايمة والشيب بيترسموا برضه** — المربع بيكتب في نفس الاختيار،
  //    فلو اتسابوا، لوحة الفلاتر تحت بتقول «الكل» والجدول مفلتر.
  msRenderList('q', 'where'); msRenderChips('q'); qRender();
});
'''

TR_FN = '''// 🔴 رقم التتبع: الجديد أولاً، والقديم بعلامة صريحة. «الرقم ده من حقل
//    متوقّف» معلومة تشغيلية — إخفاؤها بيخلّي الموظف يفتكر إن الحقل الجديد
//    اتملّى وهو لسه فاضي.
function trackingCell(o) {
  if (!o.tracking) return '<span class="flag-ok">—</span>';
  return `<span class="col-num">${esc(o.tracking)}</span>`
       + (o.trackingIsLegacy ? '<span class="cell-sub">من الحقل القديم</span>' : '');
}'''

ADDR_FN = '''// 🔴 **العنوان الكامل في خلية واحدة** (طلب أحمد 16-09-2026).
//    `address1` + `address2` — الشارع هو اللي بيفرّق بين عنوانين، وهو
//    اللي الموظف بيرتّب بيه الدفعة.
// 🔴 **وسطر المدينة/المحافظة اتشال** (طلب أحمد 16-09-2026). القيمة كانت
//    بتتكرّر جوّه نص العنوان نفسه في أغلب الصفوف («… المطرية، القاهرة»
//    وتحتها «Cairo · القاهرة»)، والسطر الرمادي التاني كان بيطوّل كل صف
//    في الجدول **من غير ما يضيف حاجة**.
//    ⚠️ والمعلومة **ما ضاعتش**: `city`/`province` لسه بيرجعوا من الـ Worker
//       ولسه في الكاش الخام، فرجوع السطر تعديل عرض بحت.
// 🔴 **و«بلا عنوان» بتتقال صراحةً** — خانة فاضية بتتقري «الشاشة بايظة»،
//    والحقيقة إن الأوردر ده **فعلاً مالوش عنوان** على شوبيفاي وده شغل
//    محتاج تدخّل (⚠️ مش علامة مراجعة: قايمة العلامات قرار منفصل).
function addressCell(o) {
  const street = [o.address1, o.address2].filter(Boolean).join(' — ').trim();
  return street ? esc(street) : '<span class="flag-ok">بلا عنوان</span>';
}'''

NOTE_FN = '''// 🔴 **عمود «ملحوظات»** (v1.6.0 · طلب أحمد 17-09-2026) — مصدره حقل
//    **Notes** على الأوردر في شوبيفاي (`note` في رد الـ Worker، من
//    `ready-orders-worker` **v1.3.0**).
// 🔴 **واللون بنفسجي عن قصد** — الملحوظة **استثناء**: أوردر واحد من كل
//    عشرين عليه واحدة، والموظف محتاج يشوف **إن فيه ملحوظة** من قبل ما
//    يقرا نصها. نص رمادي زي باقي الجدول معناه إنها بتتلاقى بالصدفة.
//    ⚠️ **ومش أحمر ولا كهرماني** — دول لونين العلامات والتأخير في
//       الجدول ده، والملحوظة **مش شذوذ**: هي معلومة الموظف كتبها بنفسه.
// ⚠️ **والفاضي `—`** — نفس قاعدة باقي الأعمدة: خانة فاضية بتتقري «الشاشة
//    بايظة»، و`—` بتقول «مفيش ملحوظة» بالنص.
function noteCell(o) {
  const t = (o.note || '').trim();
  return t ? `<span class="note-txt">${esc(t)}</span>` : '<span class="flag-ok">—</span>';
}'''

import os
# ══════════════════════════════════════════════════════════════
# §AUDIT — كتل تاب «جرد المكتب» (v1.3.0 · طلب أحمد 16-09-2026)
# ══════════════════════════════════════════════════════════════
# 🔴 **الكتل دي في صفحة «الجاهز للشحن» بس** — صفحة المشحون بتاخد `''` في
#    كل معامل منهم. والسبب مش تنظيمي: الجرد معناه «الطرد المفروض يكون في
#    المكتب»، وأوردر `Shipped` **خرج من المكتب بالتعريف**، فجرده سؤال
#    مالوش معنى. ⛔ ولو اتقرر يوم يتفتح هناك، لازم الأول يتقرر **إيه
#    المفروض يكون موجود** في طابور المشحون — وده قرار أحمد مش قرار كود.
# ⚠️ وكتلة `AUDIT_VIEW` بتنادي `addressCell` و`whereaboutsCell` — الدالتين
#    دول معاملان في الصفحة دي (`__ADDR_FN__` · `__EXTRA_FN__`)، فتشغيل
#    الجرد على صفحة تانية محتاج الدالتين معاه.
AUDIT_CSS   = r'''
/* ── §AUDIT — تاب «جرد المكتب» (v1.3.0) ─────────────────────────
   ⚠️ الكتلة دي **في صفحة الجاهز للشحن بس** — المولّد مابيحقنهاش في صفحة
      المشحون. CSS بلا ماركب بيستهلكه = ضوضاء في ملف بيتقري بالعين. */
.aud-ctl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.aud-title { font-size: 15px; font-weight: 800; color: var(--text-primary); }

/* 🔴 **تحذير العملية — بيفضل قدام العين طول الجرد** (طلب أحمد 16-09-2026).
   السبب مش تنبيه عام: النطاق **لقطة**، فتحديث حالة أي شحنة وسط الجرد
   بيشيلها من الطابور و**مابيشيلهاش من النطاق** — فالصف بيفضل «مفقود» على
   الشاشة وهو اتشحن فعلاً، ورقم غلط شكله سليم هو أسوأ نتيجة ممكنة. */
.aud-warn { font-size: 12.5px; font-weight: 800; color: var(--red-dark); line-height: 1.9; margin-top: 5px; max-width: 620px; }
.aud-btns { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* 🔴 ① لوحة فلاتر الجرد — **خطوة مستقلة قبل البدء** (v1.7.0 · طلب أحمد
   17-09-2026). ⚠️ **مفتوحة دايمًا وبلا طي** — عكس لوحة فلاتر الطابور:
   هناك الفلتر اختياري والطابور هو الشغل، وهنا الفلتر **هو الخطوة الأولى**
   ولوحة مطوية معناها إن الموظف يبدأ الجرد من غير ما يشوف هو داخل على إيه. */
.aud-flt { border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); padding: 12px 14px; margin-bottom: 14px; }
.aud-flt-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.aud-flt-step { font-size: 12.5px; font-weight: 800; color: var(--text-secondary); }
/* ⚠️ سطر القفل بيظهر **بعد البدء بس** — النطاق لقطة، وقايمة شكلها شغّالة
   والاختيار منها مالوش أثر بتخلّي الموظف يفتكر إن النطاق اتغيّر. */
.aud-flt-lock { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-top: 9px; }
.ms-locked .ms-btn { opacity: .55; cursor: not-allowed; }

/* 🔴 مربع السكانر **مقفول بصريًا** قبل بدء الجرد — مربع شكله شغّال والموظف
   بيسكن فيه ومحصلش حاجة هو بالظبط الحالة اللي بتخلّيه يعيد الجرد كله. */
.aud-scan { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border: 2px dashed var(--accent-border); border-radius: var(--radius-sm); background: var(--accent-light); transition: opacity .15s, border-color .15s; }
.aud-scan.inactive { border-color: var(--border-strong); background: var(--surface-2); opacity: .55; }
.aud-scan-lbl { font-size: 13px; font-weight: 800; color: var(--text-primary); white-space: nowrap; }
.aud-scan-input { flex: 1; min-width: 200px; padding: 11px 12px; border: 2px solid var(--accent-border); border-radius: var(--radius-sm); font-family: inherit; font-size: 17px; font-weight: 800; letter-spacing: .5px; direction: ltr; text-align: center; background: var(--surface); color: var(--text-primary); }
.aud-scan-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-hover); }
.aud-scan-input:disabled { background: var(--surface-2); color: var(--text-muted); }
.aud-scan-hint { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }

/* آخر سكانة — بتقول **الكود والنتيجة** مع بعض. التوست بيختفي بعد ٣ ثواني،
   والموظف اللي بيسكن ٥٠ طرد ورا بعض محتاج يشوف آخر واحدة قاعدة قدامه. */
.aud-last { margin-top: 10px; min-height: 22px; font-size: 12.5px; font-weight: 700; line-height: 1.7; }
.aud-last .ok    { color: var(--green-dark); }
.aud-last .dup   { color: var(--text-secondary); }
.aud-last .extra { color: var(--amber-dark); }

.aud-prog-wrap { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.aud-prog { flex: 1; height: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; overflow: hidden; }
.aud-prog-bar { height: 100%; width: 0%; background: var(--green); transition: width .25s; }
.aud-prog-txt { font-size: 12px; font-weight: 800; color: var(--text-secondary); min-width: 38px; text-align: left; direction: ltr; }

.aud-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 10px; margin-top: 14px; }
.aud-card { padding: 12px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); text-align: center; }
.aud-card.clickable { cursor: pointer; }
.aud-card.clickable:hover { background: var(--surface-hover); }
/* 🔴 **المربع المختار لازم يبان** — بعد الإنهاء المربعات بقت فلاتر: ضغطة
   بتفتح قسمها وبتطوي الباقي. قايمة اتقفلت من غير ما المربع يقول إنه هو
   السبب بتتقري «القسم فاضي» — وده رقم غلط شكله سليم. */
.aud-card.active { box-shadow: 0 0 0 2px var(--accent); border-color: var(--accent); }
.aud-card .aud-n { font-size: 24px; font-weight: 800; color: var(--text-primary); direction: ltr; }
.aud-card .aud-l { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-top: 2px; }
.aud-card.ok    { background: var(--green-light); border-color: var(--green-border); }
.aud-card.ok    .aud-n { color: var(--green-dark); }
.aud-card.pend  { background: var(--blue-light);  border-color: var(--blue-border); }
.aud-card.pend  .aud-n { color: var(--accent-dark); }
.aud-card.miss  { background: var(--red-light);   border-color: var(--red-border); }
.aud-card.miss  .aud-n { color: var(--red-dark); }
.aud-card.extra { background: var(--amber-light); border-color: var(--amber-border); }
.aud-card.extra .aud-n { color: var(--amber-dark); }

/* هيدر قسم النتيجة — نفس `.tbl-bar` في الشكل، بلون القسم */
.aud-sec { margin-bottom: 16px; }
.aud-sec-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; cursor: pointer; user-select: none; border-radius: var(--radius) var(--radius) 0 0; }
.aud-sec-bar-right { display: flex; align-items: center; gap: 9px; }
.aud-sec-title { font-size: 13.5px; font-weight: 800; }
.aud-sec.s-ok    .aud-sec-bar { background: var(--green-light); }
.aud-sec.s-ok    .aud-sec-title { color: var(--green-dark); }
.aud-sec.s-miss  .aud-sec-bar { background: var(--red-light); }
.aud-sec.s-miss  .aud-sec-title { color: var(--red-dark); }
.aud-sec.s-extra .aud-sec-bar { background: var(--amber-light); }
.aud-sec.s-extra .aud-sec-title { color: var(--amber-dark); }
.aud-sec-body.collapsed { display: none; }
.aud-toggle { font-size: 11px; color: var(--text-secondary); transition: transform .15s; display: inline-block; }
.aud-toggle.open { transform: rotate(180deg); }

/* 🔴 **«موجودة خطأ» بقى جدول زي الطابور** (طلب أحمد 16-09-2026) — التلات
   أقسام بنفس الأعمدة بالظبط، فالموظف بيقرا الصف بنفس العين في التلاتة.
   ⚠️ **والسبب ما راحش وراء ضغطة** — قاعدة ١٤: بند بيقول «فيه حاجة» وبس
      تكلفته فحص يدوي لكل طرد على شوبيفاي. فالسبب والتفصيل والفعل في
      **صف تاني تحت الصف مباشرةً بعرض الجدول كله** — النص بيلف هناك من
      غير ما يزقّ أي عمود بره الشاشة (وده كان سبب اختيار الكروت أصلاً). */
.aud-x-row > td { background: var(--amber-light); border-top: none; text-align: right; white-space: normal; padding: 10px 16px; }
.aud-x-row.is-scope > td { background: var(--blue-light); }
.aud-x-lbl { font-size: 12.5px; font-weight: 800; color: var(--amber-dark); }
.aud-x-row.is-scope .aud-x-lbl { color: var(--accent-dark); }
.aud-x-det { font-size: 12px; font-weight: 600; color: var(--text-mid); line-height: 1.8; margin-top: 3px; }
.aud-x-act { font-size: 12px; font-weight: 700; color: var(--text-primary); line-height: 1.8; margin-top: 5px; }
.aud-x-dup { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
'''

AUDIT_TABS  = r'''
  <!-- ══ تابين: الأوردرات · الجرد ═════════════════════════════════
       🔴 **«الأوردرات» مش «الطابور»** (v1.7.0 · طلب أحمد 17-09-2026) —
          يطابق تسمية الشاشة الرئيسية («أوردرات جاهزة للشحن»)، والموظف
          بيدوس على الكارت وبيلاقي نفس الكلمة في التاب.
       🔴 **تاب مش صفحة تانية** (قرار 16-09-2026) — الجرد نطاقه هو **نفس
          الصفوف المعروضة** في الطابور، فصفحة مستقلة كانت هتجيب نفس
          الطابور تاني من نفس الـ Worker، والرقمين ممكن يفترقوا لو الجلبتين
          حصلوا في وقتين. تاب واحد = **جلب واحد ومصدر واحد**.
       ⚠️ و`switchMainTab` **في الصفحة مش في الـ shell** — القايمة السودا
          في أول `shared/shell.js` بتسمّيها بالاسم: منطق التابات بيفرق من
          صفحة للتانية فعلاً. -->
  <div class="main-tabs-bar">
    <button class="main-tab-btn active" id="tabQueueBtn" type="button" onclick="switchMainTab('queue')">📋 الأوردرات</button>
    <button class="main-tab-btn" id="tabAuditBtn" type="button" onclick="switchMainTab('audit')">🧮 جرد المكتب</button>
  </div>
'''

AUDIT_LIB   = r'''
  <!-- 🔴 **أول مكتبة خارجية في الهب كله** — تصدير XLSX لنتيجة الجرد
       (قرار أحمد 16-09-2026). ⚠️ والاستخدام كله **محروس بـ
       `typeof ExcelJS === 'undefined'`**: الشبكة اللي بتقع أو CDN محجوب
       بيخلّي الزرار يقول «المكتبة ما اتحمّلتش» بدل ما الضغطة ترمي
       `ReferenceError` و**الصفحة كلها تسكت**. -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js" defer></script>
'''

AUDIT_VIEW  = r'''
<!-- ══════════════════════════════════════════════════════════════
     §AUDIT-VIEW — تاب «جرد المكتب»
     🔴 **الجرد كله محلي على الجهاز** — صفر كتابة على شوبيفاي وصفر صف في
        D1. النداء الوحيد الزيادة هو `lookup_orders` (قراءة) لقسم «موجودة
        خطأ»، وبيتم **بضغطة الموظف** مش تلقائي.
     ══════════════════════════════════════════════════════════════ -->
<div id="viewAudit" style="display:none">

  <div class="card">
    <div class="aud-ctl-head">
      <div>
        <!-- 🔴 **العنوان بيقول النطاق بنفسه** (طلب أحمد 16-09-2026):
             «جرد أوردرات (مناديب ٧٢ + شو روم ١٥)». السطر الشارح القديم
             اتشال بطلب أحمد، والعنوان ده هو اللي بقى بيحمل المعلومة —
             ⚠️ وهو **مشتق من اللقطة نفسها** (`dcoCourierCounts` على
             `audState.scope` بعد البدء)، فلو الموظف بدأ على فلتر، العنوان
             بيقول مجموعاته هو مش مجموعات الطابور كله.
             ⚠️ والفلتر الكامل بالنص **لسه مكتوب في شيت «الملخص»** جوّه
             ملف التصدير — ملف بلا نطاقه بيتقري «الجرد كله» بعد أسبوع. -->
        <div class="aud-title" id="audTitle">جرد أوردرات</div>
        <div class="aud-warn" id="audWarn">⚠ برجاء عدم تحديث حالة أي شحنة أثناء عملية الجرد ⚠</div>
      </div>
      <div class="aud-btns">
        <button class="btn-primary" id="audStartBtn" type="button" onclick="audStart()">▶ بدء الجرد</button>
        <button class="btn-green"   id="audEndBtn"   type="button" onclick="audEnd()"   style="display:none">✔ إنهاء الجرد</button>
        <button class="btn-outline" id="audResetBtn" type="button" onclick="audReset()" style="display:none">↺ جرد جديد</button>
        <button class="btn-outline" id="audExportBtn" type="button" onclick="audExport()" style="display:none">⬇️ تصدير XLSX</button>
      </div>
    </div>

    <!-- ══ ① فلاتر الجرد — 🔴 **مستقلة عن فلاتر تاب «الأوردرات»**
         (v1.7.0 · طلب أحمد 17-09-2026). الشرح الكامل في §AUDIT-JS. ══ -->
    <div class="aud-flt" id="audFltBox">
      <div class="aud-flt-head">
        <span class="aud-flt-step">① اختار الأوردرات اللي هتتجرد</span>
        <!-- ⚠️ `stopPropagation` مش محتاجة هنا — اللوحة مالهاش هيدر بيطوي -->
        <button class="clear-btn inactive" id="audClearBtn" type="button" onclick="audClearFilters()">✕ مسح الفلاتر</button>
      </div>
      <div class="flt-row" id="audMsRow"></div>
      <!-- Chips — سطر لكل فلتر، واسم الفلتر مرة واحدة في أوله (§6) -->
      <div id="audChipsRows"></div>
      <div class="aud-flt-lock" id="audFltLock" style="display:none">🔒 النطاق اتثبّت وقت البدء — الفلاتر مقفولة لحد «جرد جديد».</div>
    </div>

    <!-- السكانر — 🔴 النمط الإلزامي: الـ listener بيعمل `setTimeout` **بس**،
         و`audScan()` هي اللي بتقرا وبتفضّي وبتنفّذ. قراءة القيمة جوّه
         الـ listener بتلزّق باركودين ورا بعض في قيمة واحدة. -->
    <div class="aud-scan inactive" id="audScanArea">
      <label class="aud-scan-lbl" for="audScanInput">📷 سكان باركود الطرد</label>
      <!-- ⚠️ بلا `placeholder` (Step 2 بند ٧) — النص الرمادي جوّه المربع
           بيتقري **قيمة مكتوبة** من بعيد، والليبل جنبه هو الوصف. -->
      <input type="text" id="audScanInput" class="aud-scan-input" autocomplete="off"
             inputmode="numeric" aria-label="سكان باركود الطرد" disabled>
      <span class="aud-scan-hint">السكانر أو اكتب الكود + Enter</span>
    </div>
    <div class="aud-last" id="audLast"></div>

    <div class="aud-prog-wrap" id="audProgWrap" style="display:none">
      <div class="aud-prog"><div class="aud-prog-bar" id="audProgBar"></div></div>
      <span class="aud-prog-txt" id="audProgTxt">0%</span>
    </div>

    <!-- المربعات — الترتيب والأسماء **طلب أحمد 16-09-2026**:
         إجمالي الأوردرات · أوردرات متبقية · حالة سليمة · حالة خطأ.
         🔴 و«أوردرات متبقية» و«مفقودة» لسه **مربعين مختلفين، وواحد بس
            بيتعرض في المرة**: الأول حالة وسط الجرد والتاني نتيجة بعد ما
            يتقفل. مربع «مفقودة» والموظف لسه بيسكن بيقول له إن فيه طرود
            ضايعة وهي لسه في إيده.
         🔴 **وبعد الإنهاء المربعات بتبقى فلاتر** — ضغطة بتفتح قسمها
            وبتطوي الباقي، و«إجمالي الأوردرات» بيفتح التلاتة. -->
    <div class="aud-cards">
      <div class="aud-card"       id="audCardScope" onclick="audCardClick('all')"><div class="aud-n" id="audNScope">—</div><div class="aud-l">إجمالي الأوردرات</div></div>
      <div class="aud-card pend"  id="audCardPend"><div class="aud-n" id="audNPend">—</div><div class="aud-l">أوردرات متبقية</div></div>
      <div class="aud-card miss"  id="audCardMiss" style="display:none" onclick="audCardClick('miss')"><div class="aud-n" id="audNMiss">—</div><div class="aud-l">مفقودة</div></div>
      <div class="aud-card ok"    id="audCardOk" onclick="audCardClick('ok')"><div class="aud-n" id="audNOk">—</div><div class="aud-l">حالة سليمة ✅</div></div>
      <div class="aud-card extra" id="audCardExtra" onclick="audCardClick('extra')"><div class="aud-n" id="audNExtra">—</div><div class="aud-l">حالة خطأ ⛔</div></div>
    </div>
  </div>

  <!-- ══ التلات أقسام — 🔴 **جدول واحد بنفس أعمدة الطابور بالظبط**
       (طلب أحمد 16-09-2026): رقم الأوردر · العميل · العنوان · المندوب ·
       موقع الشحنة · تاريخ الأوردر · تاريخ التغليف · نوع الأوردر · مراجعة.
       ⚠️ **بلا `sortable-th` عن قصد** — رؤوس الطابور بتنادي `qToggleSort`
          وهي بترتّب **الطابور**، فحطّها هنا كان هيرتّب جدول تاني تحت إيد
          الموظف. الشكل واحد والسلوك مفصول.
       ⚠️ **وبلا عدّاد جنب العنوان** (طلب أحمد) — الرقم في المربع فوق،
          وتكراره في مكانين بيخلّي أي فرق بينهم بلا تفسير. ══ -->

  <!-- قسم ① مضبوطة -->
  <div class="unified-section aud-sec s-ok" id="audSecOk" style="display:none">
    <div class="aud-sec-bar" onclick="audToggleSec('Ok')">
      <div class="aud-sec-bar-right">
        <span class="aud-toggle" id="audTogOk">▲</span>
        <span class="aud-sec-title">✅ أوردرات مظبوطة</span>
      </div>
    </div>
    <div class="aud-sec-body collapsed" id="audBodyOk">
      <div class="tbl-scroll"><table class="data-table"><thead><tr>
        <th>رقم الأوردر</th><th class="col-cust">العميل</th><th class="col-addr">العنوان</th><th class="col-note">ملحوظات</th>
        <th>المندوب</th><th>موقع الشحنة</th><th class="col-date">تاريخ الأوردر</th><th class="col-date">تاريخ التغليف</th>
        <th>نوع الأوردر</th><th>مراجعة</th>
      </tr></thead><tbody id="audBodyOkRows"></tbody></table></div>
    </div>
  </div>

  <!-- قسم ② مفقودة -->
  <div class="unified-section aud-sec s-miss" id="audSecMiss" style="display:none">
    <div class="aud-sec-bar" onclick="audToggleSec('Miss')">
      <div class="aud-sec-bar-right">
        <span class="aud-toggle" id="audTogMiss">▲</span>
        <span class="aud-sec-title">❌ أوردرات مفقودة</span>
      </div>
    </div>
    <div class="aud-sec-body collapsed" id="audBodyMiss">
      <div class="tbl-scroll"><table class="data-table"><thead><tr>
        <th>رقم الأوردر</th><th class="col-cust">العميل</th><th class="col-addr">العنوان</th><th class="col-note">ملحوظات</th>
        <th>المندوب</th><th>موقع الشحنة</th><th class="col-date">تاريخ الأوردر</th><th class="col-date">تاريخ التغليف</th>
        <th>نوع الأوردر</th><th>مراجعة</th>
      </tr></thead><tbody id="audBodyMissRows"></tbody></table></div>
    </div>
  </div>

  <!-- قسم ③ موجودة خطأ -->
  <div class="unified-section aud-sec s-extra" id="audSecExtra" style="display:none">
    <div class="aud-sec-bar" onclick="audToggleSec('Extra')">
      <div class="aud-sec-bar-right">
        <span class="aud-toggle" id="audTogExtra">▲</span>
        <span class="aud-sec-title">⚠️ أوردرات موجودة خطأ</span>
      </div>
      <!-- ⚠️ `stopPropagation` إلزامية — من غيرها الضغطة بتطوي القسم -->
      <button class="act-btn" id="audLookupBtn" type="button"
        onclick="event.stopPropagation(); audLookup();">🔍 استعلام عن الحالة الفعلية</button>
    </div>
    <div class="aud-sec-body collapsed" id="audBodyExtra">
      <div class="tbl-scroll"><table class="data-table"><thead><tr>
        <th>رقم الأوردر</th><th class="col-cust">العميل</th><th class="col-addr">العنوان</th><th class="col-note">ملحوظات</th>
        <th>المندوب</th><th>موقع الشحنة</th><th class="col-date">تاريخ الأوردر</th><th class="col-date">تاريخ التغليف</th>
        <th>نوع الأوردر</th><th>مراجعة</th>
      </tr></thead><tbody id="audXList"></tbody></table></div>
    </div>
  </div>

  <div class="q-empty" id="audEmpty"></div>
</div>
'''

AUDIT_JS    = r'''
// ══════════════════════════════════════════════════════════════
// §AUDIT — جرد المكتب (v1.3.0 · طلب أحمد 16-09-2026)
// ══════════════════════════════════════════════════════════════
//
// 🔴 **صفر قاعدة اشتقاق هنا.** التطبيع (`dcoScanParse`) والمطابقة
//    (`dcoScanFind`) والتلات أقسام (`dcoAuditBuckets`) والسبب
//    (`dcoAuditReason`) كلهم في `shared/shell.js` §AUDIT-RULES — عشان
//    `docs/rules-check.mjs` يقدر يدّيهم **مدخلات باظة**: كود بحروف بس ·
//    صف بلا `orderId` · نفس الأوردر مرتين بصيغتين. الحالات دي مستحيل
//    تتزرع في بيانات وهمية معقولة، وهي بالظبط اللي بتنتج رقم غلط شكله سليم.
//
// 🔴 **الجرد مابيكتبش أي حاجة** — لا على شوبيفاي ولا في D1. النتيجة على
//    الشاشة + XLSX. أي كتابة (سجل جرد مثلاً) محتاجة تسجيل `tool`/`type`
//    في `ecommoda-constants` §7 **قبل** أول `writeLog` (Rule 7).
const AUD_KEY     = DCO_AUDIT_READY;

// حارس معقولية — السكانر اللي بيقطع القراءة بيدّي جزء من الكود، والجزء
// ده ممكن يطابق أوردر تاني بالغلط. أقل من ٤ أرقام **مابيتحسبش سكانة**.
const AUD_MIN_LEN = 4;

// 🔴 عدد أعمدة جدول الجرد — **نفس أعمدة الطابور بالظبط** (طلب أحمد
// 16-09-2026). الرقم ده بيمشي على `colspan` بتاع صف «القسم فاضي» وصف
// السبب تحت كل «موجودة خطأ»: `colspan` أقل من الأعمدة بيسيب خانات فاضية
// على يمين الصف، وأكتر بيكسر عرض الجدول.
const AUD_COLS = 10;

// 🔴 **المربع المختار بعد الإنهاء** — `null` = التلات أقسام مطوية،
// `'all'` = التلاتة مفتوحة، وأي قيمة تانية = قسمها هو المفتوح **لوحده**.
// ⚠️ والحالة دي **مش بتتحفظ في الجلسة** عن قصد: دي حالة عرض لحظية، وحفظها
//    كان معناه إن الموظف يرجع بعد refresh يلاقي قسمين مطويين من غير ما
//    يفتكر إنه هو اللي فلتر.
let audSecFocus = null;

const audState = { phase: 'idle', startedAt: null, endedAt: null,
                   scopeLabel: '', scope: [], scans: [] };
let audResult = dcoAuditBuckets([], []);

// ── التابات — 🔴 في الصفحة مش في الـ shell (القايمة السودا) ──
function switchMainTab(tab) {
  const isAudit = tab === 'audit';
  document.getElementById('viewQueue').style.display = isAudit ? 'none' : '';
  document.getElementById('viewAudit').style.display = isAudit ? '' : 'none';
  document.getElementById('tabQueueBtn').classList.toggle('active', !isAudit);
  document.getElementById('tabAuditBtn').classList.toggle('active', isAudit);
  if (isAudit) { audRender(); audFocus(); }
}
function audFocus() {
  const el = document.getElementById('audScanInput');
  if (el && !el.disabled) el.focus();
}

// ── ① فلاتر الجرد — 🔴 **مستقلة عن فلاتر تاب «الأوردرات»** ────
//
// 🔴 **قرار أحمد 17-09-2026:** النطاق بقى بيتحدد **من جوّه التاب دي**، مش
//    من اللي معروض في تاب «الأوردرات». السبب إن الفلترين مختلفين في
//    وظيفتهم: الموظف بيفلتر الطابور عشان **يقرا**، وبيفلتر الجرد عشان
//    **يمسك السكانر** — وربطهم كان معناه إن ضغطة فلتر للقراءة تحدد نطاق
//    جرد جاي، فقايمة «مفقودة» تطلع غلط **بلا أي تفسير** على الشاشة.
// ⚠️ **والمصدر لسه واحد** (`qState.rows`) — نفس الطابور اللي التاب التانية
//    بتعرضه، فمستحيل الجرد يشوف أوردر مش في «قسم الجاهز للشحن».
// 🔴 **والمندوب هنا مجموعة مش اسم** (طلب أحمد): مناديب · بوسطة · شو روم.
//    جرد المكتب بيتعمل على **رفّ**، والرف مقسوم بالمجموعة مش باسم المندوب —
//    وقايمة بـ٤٠ اسم مندوب كانت هتخلّي الخطوة الأولى أطول من الجرد نفسه.
//    ⚠️ والتجميع من `dcoCourierGroup` في الـ shell — **نفس** الدالة اللي
//       مربعات الطابور وعنوان الجرد بيعدّوا منها، فمستحيل الرقمين يفترقوا.
const AUD_FILTERS = [
  { key: 'cgroup', label: 'المندوب',
    of: o => (DCO_COURIER_GROUPS.find(g => g.key === dcoCourierGroup(o.courier)) || {}).label },
  { key: 'where',  label: 'موقع الشحنة', of: o => o.whereabouts || WA_NONE, labelOf: waFilterLabel },
];
const audMsState = msInit('aud', AUD_FILTERS,
  { rowId: 'audMsRow', chipsId: 'audChipsRows', onChange: () => audRender() });

// 🔴 **نطاق الجرد = الطابور الكامل بعد فلاتر التاب دي** — ⛔ مش `qVisible()`.
// ⚠️ واختيار فاضي = **الكل**، زي أي فلتر في الهب: «ما اخترتش» ≠ «مفيش».
function audVisible() {
  return qState.rows.filter(o => AUD_FILTERS.every(f => {
    const sel = msSel('aud', f.key);
    return !sel.size || sel.has(String(f.of(o)));
  }));
}
function audClearFilters() { msClearAll('aud'); audRender(); }

// ── وصف النطاق — 🔴 بيتكتب بالنص، مش متروك للموظف يفتكره ──────
//
// النطاق **بيتثبّت وقت البدء** (لقطة) عشان ضغطة فلتر وسط الجرد ماتغيّرش
// قايمة المفقود، والسطر ده هو اللي بيقول الموظف اتثبت على إيه — وبيتصدّر
// في شيت «الملخص».
function audFilterDesc() {
  const parts = msDesc('aud');
  return parts.length ? parts.join(' · ') : 'بلا فلتر — كل الأوردرات الجاهزة';
}

// 🔴 **عنوان الجرد = «جرد أوردرات (مناديب N + شو روم M)»** (طلب أحمد
//    16-09-2026). العدّ من `dcoCourierCounts` في الـ shell — **نفس** الدالة
//    اللي مربعات الطابور بتعدّ منها، فالرقمين مايقدروش يفترقوا.
// ⚠️ **والمجموعة الفاضية مابتتكتبش** — «بوسطة 0» في العنوان بتخلّي الموظف
//    يدوّر على طرود بوسطة مش موجودة في النطاق أصلاً.
function audScopeTitle(rows) {
  const cn = dcoCourierCounts(rows || []);
  const parts = DCO_COURIER_GROUPS.filter(g => cn[g.key] > 0)
    .map(g => `${g.label} ${cn[g.key].toLocaleString('en-US')}`);
  return parts.length ? `جرد أوردرات (${parts.join(' + ')})` : 'جرد أوردرات';
}

// ── الحفظ في الجلسة ──────────────────────────────────────────
// 🔴 refresh وسط جرد ١٢٦ طرد كان بيمسح ساعة شغل بلا أي تحذير.
// ⚠️ والفشل بيتبلع بصمت (`cacheSet`) — الحفظ **تحسين مش شرط**، والجرد
//    بيكمّل شغّال في الذاكرة لو التخزين مرفوض.
function audPersist() {
  cacheSet(AUD_KEY, { phase: audState.phase, startedAt: audState.startedAt,
                      endedAt: audState.endedAt, scopeLabel: audState.scopeLabel,
                      scope: audState.scope, scans: audState.scans });
}
function audRestore() {
  const c = cacheGet(AUD_KEY);
  const d = c && c.data;
  // ⚠️ الشكل بيتفحص بند بند — جلسة من نسخة أقدم بشكل مختلف بتترفض
  //    بدل ما تتقري غلط (نفس قاعدة `v` في عقد الجلسة).
  if (!d || (d.phase !== 'running' && d.phase !== 'ended')) return false;
  if (!Array.isArray(d.scope) || !Array.isArray(d.scans) || !d.scope.length) return false;
  audState.phase     = d.phase;
  audState.startedAt = d.startedAt || null;
  audState.endedAt   = d.endedAt   || null;
  audState.scopeLabel = d.scopeLabel || '';
  audState.scope     = d.scope;
  audState.scans     = d.scans;
  return true;
}

// ── دورة الجرد ───────────────────────────────────────────────
function audStart() {
  // 🔴 **ممنوع جرد قبل أول جلب ناجح** — نطاق من طابور ما اتجابش معناه
  //    «كل حاجة مفقودة» على شاشة الموظف، وهي مش مفقودة: إحنا اللي
  //    ماجبناهاش.
  if (!qState.at) { showToast('الطابور لسه ما اتجابش — استنى أول تحديث ناجح', 'warn'); return; }
  // 🔴 **من فلاتر التاب دي** — مش من اللي معروض في تاب «الأوردرات».
  const scope = audVisible();
  if (!scope.length) { showToast('مفيش أوردرات في الفلتر ده — عدّل اختيارك الأول', 'warn'); return; }
  audState.phase      = 'running';
  audState.startedAt  = new Date().toISOString();
  audState.endedAt    = null;
  audState.scopeLabel = audFilterDesc();
  // ⚠️ **لقطة بالقيمة** — `qState.rows` بتتبدل بالكامل مع كل جلب (كل ١٥
  //    دقيقة)، والمرجع كان هيخلّي النطاق يتغيّر تحت إيد الموظف.
  audState.scope      = scope.map(r => ({ ...r }));
  audState.scans      = [];
  audPersist();
  audRender();
  audFocus();
  showToast(`بدأ الجرد على ${scope.length} أوردر — ابدأ السكان 📷`, 'success');
}

function audEnd() {
  if (audState.phase !== 'running') return;
  audState.phase   = 'ended';
  audState.endedAt = new Date().toISOString();
  // 🔴 التلات أقسام بتتقفل مع الإنهاء — النتيجة بتتقرا **من المربعات
  //    الأربعة** الأول، والموظف بيفتح القسم اللي هيشتغل عليه بضغطة.
  audSecFocus = null;
  audPersist();
  audRender();
  const c = audResult.counts;
  showToast(`انتهى الجرد — ✅ ${c.matched} مظبوطة · ❌ ${c.missing} مفقودة · ⚠️ ${c.extra} موجودة خطأ`, 'neutral', 6000);

  // 🔴 **الاستعلام بيشتغل تلقائيًا مع الإنهاء** (طلب أحمد 16-09-2026) —
  //    «الفعل المطلوب» في قسم «موجودة خطأ» كان بيقول للموظف «اضغط استعلام
  //    عن الحالة الفعلية»، يعني **خطوة يدوية بين النتيجة وقراءتها**. دلوقتي
  //    الشاشة بتوصل للحالة الحقيقية لوحدها، والزرار بقى **إعادة محاولة** لو
  //    النداء فشل.
  // ⚠️ **ونداء واحد مجمّع بعد ما السكان يقف — مش نداء لكل سكانة**: القاعدة
  //    القديمة اتكتبت ضد التلقائي **وسط شغل السكان** (نداء شبكة على كل كود
  //    غلط وإيد الموظف على السكانر)، والسبب ده مش موجود هنا.
  // ⚠️ **وبلا `await`** — `audEnd` بتتنادى من `onclick`، والانتظار كان
  //    بيأخّر رسم النتيجة لحد ما شوبيفاي ترد. الأخطاء كلها متمسوكة جوّه
  //    `audLookup` نفسها.
  audLookup({ auto: true });
}

// ⛔ **تأكيد إلزامي** — «جرد جديد» بيمسح كل السكانات، وده فعل **مالوش
//    رجعة**: الطرود اللي اتعمل لها سكان مش هتتعاد بضغطة.
function audReset() {
  if (audState.scans.length && !confirm(`تمسح الجرد الحالي؟ فيه ${audState.scans.length} سكانة وهتضيع.`)) return;
  audState.phase = 'idle'; audState.startedAt = null; audState.endedAt = null;
  audState.scopeLabel = ''; audState.scope = []; audState.scans = [];
  audSecFocus = null;
  audPersist();
  // ⚠️ الفلاتر بتتفك **من غير ما تتمسح** — الموظف اللي بيجرد «بوسطة» رفّ
  //    ورا رفّ عايز اختياره مكانه، مش يعيده كل مرة.
  msSetLocked('aud', false);
  audSetLast('', '');
  audRender();
}

// ── السكان — 🔴 النمط الإلزامي ───────────────────────────────
//   الـ listener بيعمل `setTimeout` **بس**، و`audScan()` هي اللي بتقرا
//   وبتفضّي وبتنفّذ. قراءة القيمة جوّه الـ listener بتلزّق باركودين ورا
//   بعض في قيمة واحدة (`ecommoda-html-builder` §SCAN).
let audTimer;
function audScan() {
  const el  = document.getElementById('audScanInput');
  const raw = el.value.trim();      // ✅ القراءة هنا
  el.value  = '';                   // ✅ والتفضية هنا
  audFocus();
  if (!raw) return;
  if (audState.phase !== 'running') { showToast('ابدأ الجرد الأول', 'warn'); return; }

  // حارس المعقولية — قراءة مقطوعة مش سكانة
  if (raw.replace(/\D/g, '').length < AUD_MIN_LEN) {
    playBeep('fail');
    audSetLast('extra', `«${esc(raw)}» — كود قصير، السكانر قطع القراءة. اعمل سكان تاني.`);
    return;
  }

  const parsed = dcoScanParse(raw);
  if (!parsed) {
    playBeep('fail');
    audSetLast('extra', `«${esc(raw)}» — مش كود أوردر. اعمل سكان تاني.`);
    return;
  }

  // 🔴 **النطاق الأول، وبعده الطابور الكامل.** الفرق بين «بره الفلتر» و
  //    «مش في القسم خالص» هو الفرق بين «الطرد مكانه صح» و«الطرد غلط» —
  //    ودمجهم في سبب واحد كان بيدّي الموظف حكم غلط على طرد سليم.
  const inScope = dcoScanFind(audState.scope, parsed);
  const row     = inScope || dcoScanFind(qState.rows, parsed);
  const orderId = row ? String(row.orderId) : null;
  const key     = dcoScanKey(parsed);

  // ⚠️ التفريد على `orderId` لما نعرفه، وعلى المفتاح لما مانعرفوش — نفس
  //    الأوردر ممكن يتعمله سكان بالاسم مرة وبالـ ID مرة، والعدّ مرتين
  //    كان بيخلّي «مضبوطة» أكبر من النطاق نفسه.
  const dupe = audState.scans.find(s => (orderId && s.orderId === orderId) || (!orderId && s.key === key));
  if (dupe) {
    dupe.count = (dupe.count || 1) + 1;
    dupe.at    = new Date().toISOString();
    // ⚠️ نغمة **محايدة** للمكرر مش نغمة فشل — التكرار حالة عادية في جرد
    //    مئات الطرود، ونغمة إنذار على كل تكرار بتخلّي الموظف يتعلّم
    //    يعدّي على الإنذار كله (نفس درس `already` الأحمر في سكانرات بوسطة).
    playBeep('scan');
    audSetLast('dup', `${esc(dupe.parsed?.display || key)} — اتعمله سكان قبل كده (${dupe.count} مرات)`);
    audPersist(); audRender();
    return;
  }

  const scan = { key, parsed, at: new Date().toISOString(), orderId,
                 hit: inScope ? 'scope' : (row ? 'queue' : 'none'),
                 row: row ? { ...row } : null, count: 1, lookup: null };
  audState.scans.push(scan);

  if (scan.hit === 'scope') {
    playBeep('success');
    audSetLast('ok', `✅ ${esc(row.orderName || parsed.display)} — موجود ومظبوط`);
  } else {
    playBeep('warn');
    audSetLast('extra', `⚠️ ${esc((row && row.orderName) || parsed.display)} — مش في نطاق الجرد`);
  }
  audPersist(); audRender();
}

function audSetLast(cls, html) {
  const el = document.getElementById('audLast');
  if (el) el.innerHTML = html ? `<span class="${cls}">${html}</span>` : '';
}

// ── الرسم ────────────────────────────────────────────────────
function audRender() {
  audResult = dcoAuditBuckets(audState.scope, audState.scans);
  const c        = audResult.counts;
  const idle     = audState.phase === 'idle';
  const running  = audState.phase === 'running';
  const ended    = audState.phase === 'ended';

  // 🔴 **العنوان بيقول اللي بيتجرد بعدده** — «جرد أوردرات (مناديب ٤ +
  //    شو روم ١)». قبل البدء بيتحسب من **المعروض دلوقتي** فالموظف شايف
  //    هو داخل على إيه، وبعد البدء من **اللقطة** فالرقم مابيتغيّرش تحت
  //    إيده مع أي فلتر أو تحديث.
  const titleRows = idle ? (qState.at ? audVisible() : []) : audState.scope;
  document.getElementById('audTitle').textContent = audScopeTitle(titleRows);
  // ⚠️ التحذير بيختفي بعد الإنهاء بس — هو تحذير **عن عملية شغّالة**،
  //    وتحذير قاعد على شاشة نتيجة بيتعلّم الموظف يعدّي عليه.
  document.getElementById('audWarn').style.display = ended ? 'none' : '';

  // 🔴 **الفلاتر مقفولة بعد البدء** — النطاق لقطة، واختيار مالوش أثر
  //    بيخلّي الموظف يفتكر إن النطاق اتغيّر تحت إيده.
  msSetLocked('aud', !idle);
  document.getElementById('audFltLock').style.display = idle ? 'none' : '';
  const audClr = document.getElementById('audClearBtn');
  audClr.disabled = !idle;
  audClr.classList.toggle('inactive', !idle || !msAnyActive('aud'));

  // الزراير والسكانر
  document.getElementById('audStartBtn').style.display  = idle ? '' : 'none';
  document.getElementById('audEndBtn').style.display    = running ? '' : 'none';
  document.getElementById('audResetBtn').style.display  = idle ? 'none' : '';
  document.getElementById('audExportBtn').style.display = ended ? '' : 'none';
  const scanEl = document.getElementById('audScanInput');
  scanEl.disabled = !running;
  document.getElementById('audScanArea').classList.toggle('inactive', !running);

  // المربعات — 🔴 «—» مش «0» قبل البدء: «ما اتجردش» ≠ «مفيش»
  const dash = v => idle ? '—' : String(v);
  document.getElementById('audNScope').textContent = idle ? (qState.at ? String(audVisible().length) : '—') : String(c.scope);
  document.getElementById('audNOk').textContent    = dash(c.matched);
  document.getElementById('audNPend').textContent  = dash(c.pending);
  document.getElementById('audNMiss').textContent  = dash(c.missing);
  document.getElementById('audNExtra').textContent = dash(c.extra);
  // 🔴 مربع واحد بس بيتعرض: «لسه ما اتعملّهاش سكان» وسط الجرد، و«مفقودة»
  //    بعد ما يتقفل. الاتنين نفس الرقم — والاسم هو الفرق.
  document.getElementById('audCardPend').style.display = ended ? 'none' : '';
  document.getElementById('audCardMiss').style.display = ended ? '' : 'none';
  // 🔴 **المربعات بتبقى فلاتر بعد الإنهاء بس** — ضغطة وسط الجرد كانت
  //    هتفتح قسم لسه مش نتيجة. والكلاس هو اللي بيقول للموظف إنها قابلة
  //    للضغط (مؤشر اليد) — مربع بيتضغط من غير أي إشارة محدش بيلاقيه.
  for (const id of ['audCardScope', 'audCardMiss', 'audCardOk', 'audCardExtra'])
    document.getElementById(id).classList.toggle('clickable', ended);
  audSyncCards();

  // التقدم
  const pw = document.getElementById('audProgWrap');
  if (idle || !c.scope) { pw.style.display = 'none'; }
  else {
    pw.style.display = '';
    const pct = Math.round((c.matched / c.scope) * 100);
    document.getElementById('audProgBar').style.width  = pct + '%';
    document.getElementById('audProgTxt').textContent  = pct + '%';
  }

  // رسالة الحالة — ⚠️ **شاشة البدء بلا نص** (طلب أحمد 16-09-2026):
  // العنوان بيقول اللي هيتجرد، والزرار بيقول الخطوة التالية، والشرح
  // الكامل في «عن الأداة». نص شارح بيتقرا **مرة واحدة** وبياخد مساحة كل يوم.
  const emptyEl = document.getElementById('audEmpty');
  if (running) {
    emptyEl.style.display = '';
    emptyEl.innerHTML = `<div class="ico">📷</div><div>الجرد شغّال — <b>${c.matched}</b> من <b>${c.scope}</b>.`
      + '<br>النتيجة التفصيلية بتظهر بعد <b>«إنهاء الجرد»</b>.'
      + '<br>⚠️ <b>«أوردرات متبقية» مش «مفقودة»</b> — لسه بتسكن.</div>';
  } else {
    emptyEl.style.display = 'none';
  }

  audRenderSections(ended);
}

// 🔴 **خلايا صف الجرد == خلايا صف الطابور بالحرف** (طلب أحمد 16-09-2026)
//    — نفس الأعمدة بنفس الترتيب وبنفس الدوال (`addressCell` ·
//    `whereaboutsCell` · `dcoWaiting`). نسخة تانية من منطق الخلية كانت
//    هتخلّي الصف يتقري بشكلين في تابين من نفس الصفحة.
// ⚠️ و`note` بتتلزق جنب رقم الأوردر — قسم «موجودة خطأ» بيستخدمها لعدد
//    السكانات، والباقي بيبعتها فاضية.
function audCells(o, note) {
  const isS2  = o.machine === 's2';
  const since = o.packedAt ? dcoWaiting(o.packedAt, new Date()) : null;
  // ⚠️ الصف اللي جاي من `lookup_orders` مالوش `age` — الحقول هناك أقل من
  //    الطابور عن قصد، والحارس ده بيخلّي الخلية تقول `—` بدل ما ترمي.
  const age = o.age || null;
  return `<td>${orderLink(o.orderName, o.orderId)}${note || ''}</td>
    <td class="cust-cell">${esc(o.customer || '—')}</td>
    <td class="addr-cell">${addressCell(o)}</td>
    <td class="note-cell">${noteCell(o)}</td>
    <td>${esc(o.courier || '—')}</td>
    <td>${whereaboutsCell(o)}</td>
    <td class="date-cell">${o.createdAt
          ? `<span class="cell-date">${esc(formatDate(o.createdAt))}</span>${age ? `<span class="time-badge age-badge ${age.cls}">${esc(age.text)}</span>` : ''}`
          : '<span class="flag-ok">—</span>'}</td>
    <td class="date-cell">${since
          ? `<span class="cell-date">${esc(formatDate(o.packedAt))}</span><span class="time-badge ${since.cls}">${esc(since.text)}</span>`
          : '<span class="flag-ok">—</span>'}</td>
    <td><span class="type-text ${isS2 ? 'type-s2' : 'type-s1'}">${esc(o.machineLabel || (isS2 ? 'استبدال/استرجاع' : 'عادي'))}</span></td>`;
}

function audRowHtml(o, tag, i) {
  return `<tr class="${o.flags && o.flags.length ? 'flagged' : ''}">${audCells(o)}
    <td>${o.flags && o.flags.length
          ? `<button type="button" class="flag-btn" data-aud-flag="${esc(tag)}:${i}">⚠️ ${o.flags.length}</button>`
          : '<span class="flag-ok">—</span>'}</td>
  </tr>`;
}

// ── صف «موجودة خطأ» — صف الجدول + صف السبب تحته ─────────────
//
// 🔴 **قاعدة ١٤ حرفيًا:** «موجود خطأ» لوحدها بند بيقول «فيه حاجة» وبس،
//    وتكلفته **فحص يدوي لكل طرد** على شوبيفاي. فالسبب والتفصيل والفعل
//    بيتكتبوا في **صف تاني تحت الصف مباشرةً** — مش وراء ضغطة ومش في عمود
//    بيقصّ النص.
// ⚠️ **والكود اللي مالوش أوردر بياخد نفس الصف بخانات `—`** — صف بشكل تاني
//    وسط الجدول بيتقري «ده مش من نفس القايمة».
function audExtraRowHtml(s, i) {
  const r    = dcoAuditReason(s);
  const o    = s.row || null;
  const lo   = (s.lookup && s.lookup.order) || null;
  const code = (s.parsed && s.parsed.display) || s.key;
  const cls  = r.code === 'out_of_scope' ? 'is-scope' : '';
  const note = s.count > 1 ? ` <span class="aud-x-dup">(${s.count} سكانات)</span>` : '';
  const dash = '<span class="flag-ok">—</span>';
  // 🔴 الأوردر اللي جه من الاستعلام **بياخد لينك حقيقي** — `orderId` رقمي
  //    (عقد الـ Worker)، والموظف محتاج يفتحه على شوبيفاي من الصف ده بالظبط.
  const head = o
    ? audCells(o, note)
    : `<td>${lo && lo.orderId
             ? orderLink(lo.orderName || code, lo.orderId)
             : `<span class="order-num">${esc(code)}</span>`}${note}</td>
       <td class="cust-cell">${dash}</td>
       <td class="addr-cell">${dash}</td>
       <td class="note-cell">${dash}</td>
       <td>${dash}</td>
       <td>${dash}</td>
       <td>${dash}</td>
       <td>${dash}</td>
       <td>${lo
             ? `<span class="type-text" dir="ltr">S1: ${esc(lo.s1 || '—')} · S2: ${esc(lo.s2 || '—')}</span>`
             : dash}</td>`;
  return `<tr class="aud-x-top ${cls} ${o && o.flags && o.flags.length ? 'flagged' : ''}">${head}
      <td>${o && o.flags && o.flags.length
            ? `<button type="button" class="flag-btn" data-aud-flag="extra:${i}">⚠️ ${o.flags.length}</button>`
            : dash}</td>
    </tr>
    <tr class="aud-x-row ${cls}"><td colspan="${AUD_COLS}">
      <div class="aud-x-lbl">${esc(r.label)}</div>
      <div class="aud-x-det">${esc(r.detail)}</div>
      <div class="aud-x-act">🛠️ <b>المطلوب:</b> ${esc(r.action)}</div>
    </td></tr>`;
}

function audRenderSections(show) {
  for (const s of ['Ok', 'Miss', 'Extra'])
    document.getElementById('audSec' + s).style.display = show ? '' : 'none';
  if (!show) return;

  const { matched, missing, extra } = audResult;

  document.getElementById('audBodyOkRows').innerHTML = matched.length
    ? matched.map((o, i) => audRowHtml(o, 'ok', i)).join('')
    : `<tr><td colspan="${AUD_COLS}" class="q-empty">مفيش أوردر اتعمله سكان</td></tr>`;

  // 🔴 «مفيش مفقود» **بتتقال صراحةً** — قسم فاضي بيتقري «ما اتحسبش».
  document.getElementById('audBodyMissRows').innerHTML = missing.length
    ? missing.map((o, i) => audRowHtml(o, 'miss', i)).join('')
    : `<tr><td colspan="${AUD_COLS}" class="q-empty">✅ ولا أوردر مفقود — كل النطاق اتعمله سكان</td></tr>`;

  document.getElementById('audXList').innerHTML = extra.length
    ? extra.map((s, i) => audExtraRowHtml(s, i)).join('')
    : `<tr><td colspan="${AUD_COLS}" class="q-empty">✅ مفيش أي طرد موجود خطأ</td></tr>`;

  // زرار الاستعلام بيظهر **بس** لما يكون فيه صف محتاجه فعلاً
  const need = extra.filter(s => s.hit === 'none' && !s.lookup).length;
  document.getElementById('audLookupBtn').style.display = need ? '' : 'none';

  // التفويض — نفس سبب جدول الطابور: اسم العميل وسبب العلامة بيتحطّوا في
  // نص HTML، و`onclick` بنص كان بيسرّب أي علامة تنصيص فيهم.
  const map = { ok: matched, miss: missing, extra: extra.map(s => s.row) };
  document.getElementById('viewAudit').querySelectorAll('[data-aud-flag]').forEach(btn => {
    const [tag, idx] = btn.dataset.audFlag.split(':');
    btn.addEventListener('click', () => showFlags(map[tag][Number(idx)]));
  });

  audApplyFocus();
}

// ── المربعات كفلاتر — 🔴 طلب أحمد 16-09-2026 ────────────────
//
// بعد الإنهاء، ضغطة على مربع بتفتح **قسمه لوحده** وبتطوي الباقي، و«إجمالي
// الأوردرات» بيفتح التلاتة. وضغطة تانية على نفس المربع بترجّع كله مطوي.
// ⚠️ **والمربع المختار بياخد إطار** — قايمة اتقفلت من غير ما المربع يقول
//    إنه هو السبب بتتقري «القسم فاضي».
function audCardClick(which) {
  if (audState.phase !== 'ended') return;   // 🔴 فلتر على نتيجة مش على جرد شغّال
  audSecFocus = (audSecFocus === which) ? null : which;
  audApplyFocus();
}

function audSetSec(s, open) {
  document.getElementById('audBody' + s).classList.toggle('collapsed', !open);
  document.getElementById('audTog'  + s).classList.toggle('open', open);
}

function audApplyFocus() {
  const f = audSecFocus;
  audSetSec('Ok',    f === 'all' || f === 'ok');
  audSetSec('Miss',  f === 'all' || f === 'miss');
  audSetSec('Extra', f === 'all' || f === 'extra');
  audSyncCards();
}

function audSyncCards() {
  const on = { all: 'audCardScope', miss: 'audCardMiss', ok: 'audCardOk', extra: 'audCardExtra' };
  for (const id of Object.values(on))
    document.getElementById(id).classList.toggle('active', on[audSecFocus] === id);
}

// ⚠️ الطي اليدوي من هيدر القسم **بيصفّر المربع المختار** — قسم اتفتح
//    بالإيد ومربع تاني لسه مولّع حالتان بتفترقا على نفس الشاشة.
function audToggleSec(s) {
  const wasOpen = !document.getElementById('audBody' + s).classList.contains('collapsed');
  audSetSec(s, !wasOpen);
  audSecFocus = null;
  audSyncCards();
}

// ── الاستعلام عن الحالة الفعلية ──────────────────────────────
//
// 🔴 **بيشتغل تلقائيًا مرة واحدة مع «إنهاء الجرد»** (طلب أحمد 16-09-2026)،
//    والزرار بقى **إعادة محاولة** — لو النداء فشل (Worker أقدم من 1.2.0 أو
//    شبكة واقعة) الزرار بيفضل مكانه والرسالة بتسمّي السبب.
// ⛔ **وممنوع يرجع تلقائي وسط السكان** — القاعدة القديمة اتكتبت ضد ده
//    بالظبط: الجرد بيطلّع عشرات الأكواد الغلط، ونداء شبكة على كل سكانة
//    غلط وإيد الموظف على السكانر بيوقّف الشغل. النداء هنا **واحد مجمّع
//    بعد ما السكان يقف**.
// ⚠️ **و`auto` بيسكّت رسالة «مفيش صفوف محتاجة استعلام»** — دي إجابة على
//    سؤال الموظف لما يضغط، لكن على الإنهاء هي **ضوضاء**: الحالة العادية
//    إن مفيش أكواد غلط أصلاً.
async function audLookup({ auto = false } = {}) {
  const pend = audResult.extra.filter(s => s.hit === 'none' && !s.lookup);
  if (!pend.length) {
    if (!auto) showToast('مفيش صفوف محتاجة استعلام', 'neutral');
    return;
  }
  const btn = document.getElementById('audLookupBtn');
  btn.disabled = true; btn.textContent = '⏳ جاري الاستعلام…';
  try {
    const ids   = pend.filter(s => s.parsed.kind === 'id' && s.parsed.id).map(s => s.parsed.id);
    const names = pend.filter(s => s.parsed.kind !== 'id').map(s => s.parsed.name);
    const data  = await apiPost('lookup_orders', { ids, names });
    // 🔴 الربط **بالمفتاح مش بالترتيب** — الـ Worker بيرجّع مدخل لكل كود
    //    (حتى اللي مالقيناهوش)، بس الربط بالترتيب كان بيزحلق كل النتايج
    //    لو مدخل واحد اتغيّر مكانه: حالة أوردر بتتعرض على أوردر تاني.
    const byKey = {};
    for (const r of (data.results || [])) byKey[`${r.kind}:${r.key}`] = r;
    let hits = 0;
    for (const s of pend) {
      const r = byKey[s.key];
      if (!r) continue;
      s.lookup = { found: !!r.found, order: r.order || null };
      hits++;
    }
    if (data.truncated) showToast('القايمة أطول من سقف الاستعلام — الباقي ما اتستعلمش', 'warn', 6000);
    audPersist(); audRender();
    // ⚠️ الرسالة بتفرّق: التلقائي بيقول **إن الحالة الحقيقية بقت على
    //    الشاشة** (عشان الموظف مايدوّرش على زرار مابقاش ظاهر)، واليدوي
    //    بيقول نتيجة الضغطة.
    showToast(auto
      ? `الحالة الفعلية اتجابت لـ${hits} كود في «حالة خطأ ⛔»`
      : `اتستعلم على ${hits} كود`, 'success');
  } catch (e) {
    // ⚠️ الرسالة **بتسمّي الأداة والنسخة** — «تعذّر الاستعلام» لوحدها
    //    بتخلّي الموظف يدوّر، والسبب الأشهر هنا Worker ما اتعملّهوش Promote.
    if (e.status === 404 || e.status === 405)
      showToast('Worker «قسم الجاهز للشحن» نسخة أقدم من 1.2.0 — الاستعلام محتاج نسخة فيها lookup_orders', 'error', 7000);
    else
      showToast('تعذّر الاستعلام: ' + e.message, 'error', 6000);
  } finally {
    // ⚠️ الزرار بيرجع **بنص «إعادة المحاولة»** لو لسه فيه صفوف محتاجة
    //    استعلام — «استعلام عن الحالة الفعلية» على زرار ظهر بعد محاولة
    //    فاشلة بيتقري «ما اتحاولش»، والموظف مش عارف إن فيه محاولة حصلت.
    btn.disabled = false;
    btn.textContent = audResult.extra.some(s => s.hit === 'none' && !s.lookup)
      ? '🔄 إعادة محاولة الاستعلام'
      : '🔍 استعلام عن الحالة الفعلية';
  }
}

// ── تصدير XLSX ───────────────────────────────────────────────
//
// 🔴 **محروس بـ`typeof ExcelJS`** — CDN محجوب أو شبكة واقعة بتخلّي
//    الضغطة ترمي `ReferenceError`، والرمي ده **بيسكّت باقي السكربت**.
async function audExport() {
  if (typeof ExcelJS === 'undefined') {
    showToast('مكتبة التصدير ما اتحمّلتش — راجع الاتصال وحدّث الصفحة', 'error', 6000);
    return;
  }
  const btn = document.getElementById('audExportBtn');
  btn.disabled = true; btn.textContent = '⏳ جاري التصدير…';
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'EcomModa — مركز عمليات الشحن والتحصيل';
    wb.created  = new Date();
    const head = ['رقم الأوردر', 'العميل', 'العنوان', 'المحافظة', 'ملحوظات', 'المندوب',
                  'موقع الشحنة', 'نوع الأوردر', 'تاريخ التغليف', 'علامات المراجعة'];
    const rowOf = o => [
      o.orderName || '—', o.customer || '—',
      [o.address1, o.address2].filter(Boolean).join(' — ') || 'بلا عنوان',
      o.province || o.city || '—', (o.note || '').trim() || '—', o.courier || '—',
      o.whereabouts || '—', o.machineLabel || '—',
      o.packedAt ? `${formatDateForExport(o.packedAt)} ${formatTimeForExport(o.packedAt)}` : '—',
      (o.flags || []).map(f => f.label).join(' · ') || '—',
    ];
    // ⚠️ `rightToLeft` على كل شيت — شيت عربي بترتيب LTR بيتقري معكوس.
    const sheet = (name, rows) => {
      const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true }] });
      ws.addRow(head);
      ws.getRow(1).font = { bold: true };
      rows.forEach(o => ws.addRow(rowOf(o)));
      ws.columns.forEach(col => { col.width = 20; });
      return ws;
    };
    sheet('مظبوطة', audResult.matched);
    sheet('مفقودة', audResult.missing);

    // شيت «موجودة خطأ» — أعمدة مختلفة تمامًا: ده **كود اتعمله سكان**
    // مش صف طابور، والسبب والفعل هما المحتوى الأساسي.
    const wx = wb.addWorksheet('موجودة خطأ', { views: [{ rightToLeft: true }] });
    wx.addRow(['الكود', 'عدد السكانات', 'السبب', 'التفصيل', 'المطلوب',
               'رقم الأوردر', 'S1', 'S2']);
    wx.getRow(1).font = { bold: true };
    audResult.extra.forEach(s => {
      const r = dcoAuditReason(s);
      const o = (s.row || (s.lookup && s.lookup.order)) || {};
      wx.addRow([s.parsed && s.parsed.display || s.key, s.count || 1,
                 r.label, r.detail, r.action,
                 o.orderName || '—', o.s1 || '—', o.s2 || '—']);
    });
    wx.columns.forEach(col => { col.width = 22; });

    // شيت الملخص — 🔴 النطاق والفلتر **جوّه الملف**: ملف بلا نطاقه
    //    بيتقري «الجرد كله» بعد أسبوع من تصديره.
    const ws = wb.addWorksheet('الملخص', { views: [{ rightToLeft: true }] });
    ws.addRow(['البند', 'القيمة']);
    ws.getRow(1).font = { bold: true };
    const c = audResult.counts;
    [['نطاق الجرد (أوردر)', c.scope], ['مظبوطة', c.matched], ['مفقودة', c.missing],
     ['موجودة خطأ', c.extra], ['الفلتر وقت البدء', audState.scopeLabel || '—'],
     ['بدأ', audState.startedAt ? `${formatDateForExport(audState.startedAt)} ${formatTimeForExport(audState.startedAt)}` : '—'],
     ['انتهى', audState.endedAt ? `${formatDateForExport(audState.endedAt)} ${formatTimeForExport(audState.endedAt)}` : '—'],
     ['الموظف', session.displayName || session.username || '—'],
    ].forEach(r => ws.addRow(r));
    ws.columns.forEach(col => { col.width = 30; });

    const p  = cairoParts(new Date());
    const ts = p ? `${p.year}${p.month}${p.day}_${p.hour}${p.minute}` : 'now';
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `جرد_المكتب_${ts}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('تم التصدير ✅', 'success');
  } catch (e) {
    showToast('تعذّر التصدير: ' + e.message, 'error', 6000);
  } finally {
    btn.disabled = false; btn.textContent = '⬇️ تصدير XLSX';
  }
}

// ── التسليح ──────────────────────────────────────────────────
(function audInit() {
  const el = document.getElementById('audScanInput');
  // 🔴 الـ listener بيعمل `setTimeout` **بس** — الشرح فوق في §AUDIT.
  el.addEventListener('input', () => {
    clearTimeout(audTimer);
    audTimer = setTimeout(audScan, el.value.length > 3 ? 120 : 400);
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { clearTimeout(audTimer); audScan(); }
  });
  // ⚠️ **الترتيب مهم** — صف فلاتر الجرد لازم يتبني قبل أول `audRender`:
  //    دوال الفلتر بتكتب في عناصر جوّاه، ولو اتنادت قبل ما تتخلق بتخرج
  //    **بصمت** (`getElementById` بترجّع `null`).
  msBuildRow('aud');
  if (audRestore()) {
    showToast(`جرد متساب في الجلسة دي اترجع — ${audState.scans.length} سكانة`, 'neutral', 6000);
  }
  audRender();
})();
'''

AUDIT_ABOUT = r'''      <details class="about-sec">
        <summary>تاب «جرد المكتب» — إزاي بيشتغل</summary>
        <div class="about-sec-body">
          <p>الجرد بيجاوب على سؤال واحد: <b>كل طرد المفروض يكون في المكتب — موجود فعلاً؟</b>
             الموظف بيعمل سكان لباركود كل طرد، والنتيجة <b>تلات أقسام</b>.</p>
          <p>⚠️ <b>وممنوع تحديث حالة أي شحنة أثناء الجرد</b> — النطاق <b>لقطة</b> بتتثبّت وقت
             البدء، فالأوردر اللي حالته اتغيّرت وسط الجرد بيفضل في قايمة النطاق
             و<b>بيتعدّ «مفقود»</b> وهو مش مفقود. التحذير ده مكتوب فوق الجرد طول ما هو شغّال.</p>
          <ul>
            <li><b>أوردرات مظبوطة</b> — في نطاق الجرد واتعمل لها سكان.</li>
            <li><b>أوردرات مفقودة</b> — في النطاق و<b>ما اتعملّهاش سكان</b>: الطرد ده
                المفروض في المكتب ومش لاقيينه. ⚠️ وهي نفسها <b>«أوردرات متبقية»</b>
                وانت لسه بتسكن — <b>نفس الرقم واسمين</b>، والاسم بيتغيّر بعد «إنهاء الجرد».</li>
            <li><b>أوردرات موجودة خطأ</b> — اتعمل لها سكان و<b>مش في النطاق</b>. وكل
                واحدة بتقول <b>السبب والفعل المطلوب</b>: يا إما الأوردر جاهز للشحن فعلاً
                بس <b>بره فلاتر الجرد</b> اللي بدأت بيهم (الطرد مكانه صح)، يا إما مش في القسم
                خالص — وساعتها <b>الشاشة بتجيب حالته الحقيقية من شوبيفاي تلقائيًا</b>
                (S1 · S2 · الإلغاء) <b>بمجرد «إنهاء الجرد»</b>، بلا أي ضغطة.
                ⚠️ والزرار بيفضل ظاهر <b>بس لو النداء فشل</b> — وساعتها بيقول
                <b>«إعادة محاولة الاستعلام»</b>، وأشهر سبب إن الـ Worker أقدم من
                <code>1.2.0</code>.</li>
            <li>والتلات أقسام <b>جداول بنفس أعمدة تاب «الأوردرات» بالظبط</b>. وفي قسم
                «موجودة خطأ» السبب والفعل المطلوب مكتوبين في <b>صف تحت الصف مباشرةً</b>
                — مش وراء ضغطة.</li>
          </ul>
          <h4>المربعات الأربعة — وبعد الإنهاء بتبقى فلاتر</h4>
          <ul>
            <li><b>إجمالي الأوردرات</b> · <b>أوردرات متبقية</b> (وبعد الإنهاء «مفقودة») ·
                <b>حالة سليمة ✅</b> · <b>حالة خطأ ⛔</b>.</li>
            <li>🔴 <b>بعد «إنهاء الجرد» كل مربع بقى فلتر</b> — ضغطة بتفتح قسمه
                <b>وبتطوي الباقي</b>، و«إجمالي الأوردرات» بيفتح التلاتة. والمربع المختار
                بياخد إطار عشان القايمة المقفولة ماتتقريش «القسم فاضي».</li>
            <li>⚠️ وقبل البدء العدّادات <b>«—» مش «0»</b> — «ما اتجردش» ≠ «مفيش».</li>
          </ul>
          <h4>النطاق — ① خطوة الفلاتر</h4>
          <ul>
            <li>🔴 التاب دي ليها <b>فلترينها هي</b> فوق مربع السكان: <b>المندوب</b>
                (مناديب · بوسطة · شو روم) و<b>موقع الشحنة</b>. اللي بتختاره هنا هو
                <b>نطاق الجرد</b> — وده <b>مستقل تمامًا</b> عن أي فلتر في تاب
                «الأوردرات» (قرار أحمد 17-09-2026).</li>
            <li>⚠️ <b>بلا أي اختيار = الكل</b> — «ما اخترتش» مش «مفيش».</li>
            <li>⚠️ والمندوب هنا <b>مجموعة مش اسم</b>: الجرد بيتعمل على رفّ، والرف
                مقسوم بالمجموعة.</li>
            <li>🔴 والنطاق <b>بيتثبّت لقطة وقت البدء</b>: الفلاتر بتتقفل مع «بدء الجرد»
                وبتتفك مع «جرد جديد»، وأي تحديث للطابور بعد كده <b>مالوش أي أثر</b>
                على قايمة المفقود.</li>
            <li>وعنوان الجرد بيقول النطاق بنفسه — <b>«جرد أوردرات (مناديب ٧٢ + شو روم ١٥)»</b>
                — والفلتر الكامل بالنص مكتوب في <b>شيت «الملخص»</b> جوّه ملف التصدير.</li>
            <li>⚠️ <b>«لسه ما اتعملّهاش سكان» مش «مفقودة»</b> — الأولى حالة وانت لسه
                بتسكن، والتانية نتيجة بعد «إنهاء الجرد».</li>
          </ul>
          <h4>الباركود</h4>
          <ul>
            <li>الباركود على الطرد فيه <b>Order ID الطويل</b> (١٣ رقم). والمربع بياخد كمان
                <b>رقم الأوردر</b> (<code>#55001</code>) والـ <code>gid</code> الكامل
                ورقم التتبع لو مسجّل على الصف.</li>
            <li>الأوردر اللي اتعمله سكان مرتين <b>بيتعدّ مرة واحدة</b> — والشاشة بتقول
                «اتعمله سكان قبل كده» بنغمة محايدة، مش إنذار.</li>
            <li>كود أقل من ٤ أرقام <b>مابيتحسبش سكانة</b> — دي قراءة مقطوعة من السكانر،
                وجزء من الكود ممكن يطابق أوردر تاني بالغلط.</li>
          </ul>
          <h4>الحفظ والتصدير</h4>
          <ul>
            <li>الجرد <b>محفوظ في الجلسة</b> — refresh وسط الجرد مابيضيّعش السكانات.
                ⚠️ بس <b>قفل التاب بيمسحه</b> (نفس عقد الجلسة — مفيش تخزين دائم غير السر).</li>
            <li>🔴 الجرد <b>مابيكتبش أي حاجة</b>: لا على شوبيفاي ولا في سجل D1. النتيجة
                على الشاشة + <b>تصدير XLSX</b> بأربع شيتات (مظبوطة · مفقودة · موجودة خطأ ·
                الملخص).</li>
          </ul>
        </div>
      </details>
'''

# بنود سجل التحديثات — **لكل صفحة بتاعها**. بادج النسخة في أول الكتلة
# بيتكتب من `TOOL_VERSION` (مصدر واحد · #24)، فالبنود اللي تحته لازم تكون
# بنود **النسخة الحالية** فعلاً.
# ⚠️ وصفحة المشحون بتقول «بلا تغيير» صراحةً — كتلة نسخة بلا بنود بتتقري
#    «السجل ناقص».
CL_READY   = r'''          <li class="cl-item"><span class="cl-tag new">جديد</span><span>🔴 <b>صف مربعات «موقع الشحنة» فوق الطابور</b> — تحت مربعات المندوب بالظبط، وبنفس شكلها: <b>✅ في المكتب</b> · <b>⚠ المخزن</b> · <b>⚠ مع المندوب</b> · <b>—</b> (محدش سجّل)، كل واحد بعدده. ضغطة عليه <b>بتكتب في نفس فلتر «موقع الشحنة»</b> اللي في اللوحة تحت — مش حالة تانية جنبه.</span></li>
          <li class="cl-item"><span class="cl-tag change">تعديل</span><span>🔴 <b>خلية التاريخ بقت سطرين بالظبط</b> في العمودين (تاريخ الأوردر · تاريخ التغليف): سطر للتاريخ <b>بأيقونته معاه</b>، وسطر للبادج. الأيقونة 📅 كانت بتنزل <b>لوحدها في سطر</b> لأن النص أعرض من العمود بـ٥px — وسطر فيه رمز بلا قيمة بيتقري خانة تانية فاضية.</span></li>
          <li class="cl-item"><span class="cl-tag change">تعديل</span><span><b>وبند «موقع الشحنة» الفاضي في قايمة الفلتر بقى <code>—</code></b> بدل «— مش مسجّل» — نفس اللي مكتوب في الخلية بالحرف. ⚠️ ومعناها («محدش سجّل» مش «المخزن») مكتوب هنا في «عن الأداة».</span></li>
'''

CL_SHIPPED = r'''          <li class="cl-item"><span class="cl-tag change">تعديل</span><span>🔴 <b>خلية التاريخ بقت سطرين بالظبط</b> في العمودين (تاريخ الأوردر · تاريخ التغليف): سطر للتاريخ <b>بأيقونته معاه</b>، وسطر للبادج. الأيقونة 📅 كانت بتنزل <b>لوحدها في سطر</b> لأن النص أعرض من العمود بـ٥px — وسطر فيه رمز بلا قيمة بيتقري خانة تانية فاضية.</span></li>
          <li class="cl-item"><span class="cl-tag change">تعديل</span><span>⚠️ <b>وباقي تحديث v1.8.0 في «قسم الجاهز للشحن»</b> (صف مربعات «موقع الشحنة» · وبند <code>—</code> في قايمة فلترها) — الطابور ده مالوش العمود ده ولا فلتره. والنسخة <b>واحدة للهب كله</b> (مصدر واحد · #24)، فالرقم بيترفع هنا كمان.</span></li>
          <li class="cl-item"><span class="cl-tag change">تعديل</span><span>⚠️ <b>وباقي تحديث v1.7.0 في «قسم الجاهز للشحن»</b> (فلاتر تاب الجرد · ليبلات «موقع الشحنة») — ومقاسات الأعمدة وفلتر «التغليف» اتعملوا هنا كمان في نفس التمريرة.</span></li>
'''

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# بنود «الأعمدة» في نافذة «عن الأداة» — **لكل صفحة بتاعها بس**.
# ⚠️ بند بيوصف عمود مش موجود في الصفحة أسوأ من مفيش بند.
READY_ABOUT_COLS = '''            <li><b>العنوان</b> — <code>address1</code> و<code>address2</code> في السطر
                الأول، والمدينة والمحافظة تحتهم. الأوردر اللي مالوش عنوان على
                شوبيفاي بيقول <b>«بلا عنوان»</b> بالنص — خانة فاضية كانت هتتقري
                عطل في الشاشة.</li>
            <li><b>ملحوظات</b> — حقل <b>Notes</b> على الأوردر في شوبيفاي، بالنص
                وبلا قص. 🔴 <b>لونه بنفسجي عشان وجود الملحوظة نفسه يبان من بعيد</b>
                — الملحوظة استثناء مش قاعدة، والموظف محتاج يعرف إن فيه واحدة قبل
                ما يقرا نصها. و<code>—</code> معناها <b>مفيش ملحوظة</b>.
                ⚠️ والعمود ده محتاج <code>ready-orders-worker</code>
                <b>1.3.0</b> — على Worker أقدم بيقول <code>—</code> على كل صف،
                وحارس النسخة فوق بيقول كده بالاسم.</li>
            <li><b>موقع الشحنة</b> — <code>package_whereabouts_s1</code> (أو
                <code>…_s2</code> لصف الاستبدال): الطرد قاعد فين دلوقتي.
                🔴 <b><code>Office</code> بادج أخضر (✅ في المكتب)</b>، وأي قيمة
                تانية (<code>Warehouse</code> · <code>Courier</code> · قيمة بره
                القايمة) <b>بادج أحمر بـ⚠</b> — الطابور ده أوردرات المفروض
                طرودها في المكتب، فأي مكان تاني محتاج تدخّل.
                ⚠️ <b>والفاضي <code>—</code> محايد مش أحمر</b>: «محدش سجّل» ≠
                «المكان غلط» — أداة التغليف لسه ما بتكتبش الحقل ده، وأحمر على
                أغلب الطابور بيتعلّم الموظف يعدّي على اللون كله.
                🔴 <b>وفوق الطابور صف مربعات بنفس القيم بعددها</b> — ضغطة على
                مربع بتفلتر عليه، وتانية بترجّع الكل، وهي <b>بتكتب في نفس فلتر
                «موقع الشحنة»</b> اللي في اللوحة تحت (مش حالة تانية جنبه).
                ⚠️ و<code>—</code> في المربع وفي قايمة الفلتر معناها <b>«محدش
                سجّل»</b> — مش «المخزن».</li>'''

SHIPPED_ABOUT_COLS = '''            <li><b>رقم التتبع</b> — الجديد أولاً (<code>…_s1</code>/<code>…_s2</code> حسب
                ماكينة الصف)، والقديم بعلامة <b>«من الحقل القديم»</b>. ⚠️ العلامة
                دي مش تزويق: من غيرها الموظف بيفتكر إن الحقول الجديدة اتملّت وهي
                لسه فاضية على كل الأوردرات.</li>'''

PAGES = [
  dict(
    file='ready-orders.html', key='ready', status='Ready', action='get_ready_queue',
    worker='ready', cache='DCO_CACHE_READY',
    # 🔴 «قسم» مش «طابور» (طلب أحمد 16-09-2026) — يطابق تسمية المحطة
    #    التانية («قسم التغليف» · «قسم الطباعة» · «قسم تسليمات بوسطة»)،
    #    والموظف بيتنقّل بين الهبين طول اليوم.
    #    ⚠️ والاسم ده **في تلات أماكن لازم يفضلوا متطابقين**: هنا ·
    #       `DCO_WORKERS.ready.label` في `shared/shell.js` (حارس النسخة
    #       بيسمّي الأداة بيه) · وصف الشاشة الرئيسية في `index.html`.
    icon='📋', title='قسم الجاهز للشحن', subtitle='مركز عمليات الشحن والتحصيل',
    emptyOk='مفيش أوردرات جاهزة للشحن دلوقتي',
    packCol='تاريخ التغليف',
    # 🔴 «موقع الشحنة» بدل «عهدة الطرد» (طلب أحمد 16-09-2026) — نفس الحقل
    #    بالحرف (`package_whereabouts_s1`/`_s2`) ونفس القيم؛ الاسم بس هو
    #    اللي اتغيّر. «عهدة» كلمة محاسبية، و«موقع الشحنة» بيقول اللي
    #    الخانة بتقوله فعلاً: الطرد قاعد فين دلوقتي.
    extraHead='<th class="sortable-th" data-q-sort="whereabouts" onclick="qToggleSort(\'whereabouts\')">موقع الشحنة<span class="sort-icon" data-q-sort="whereabouts"></span></th>',
    # ⚠️ «موقع الشحنة» فلتر حقيقي هنا: «وَرّيني اللي لسه في المخزن» سؤال
    #    الموظف بيسأله كل يوم. وعلى صفحة المشحون **مفيش** — العمود التاني
    #    هناك رقم تتبع، وفلتر على رقم فريد لكل صف بادچ بلا معنى.
    # 🔴 **`labelOf` مش `of`** — الفلترة بتفضل على القيمة **الخام**
    #    (`Office`) والعرض بس هو اللي بيتغيّر. فلترة على النص المعروض
    #    كانت بتربط الفلتر بشكل البادج: أي تعديل في نص البادج بيفضّي
    #    الجدول **في صمت**.
    extraFilter="  { key: 'where',    label: 'موقع الشحنة',  of: o => o.whereabouts || WA_NONE, labelOf: waFilterLabel },\n",
    extraCell="""      <td>${whereaboutsCell(o)}</td>\n""",
    extraFn=WA_FN,
    # 🔴 **صف مربعات «موقع الشحنة» تحت صف المندوب** (v1.8.0 · طلب أحمد
    #    17-09-2026) — «وَرّيني اللي مش في المكتب» بقى **ضغطة واحدة** فوق
    #    الطابور بدل فتح لوحة الفلاتر واختيار من قايمة.
    # ⚠️ والتلات معاملات **بيروحوا مع بعض**: الصندوق في الماركب · نداء
    #    الرسم جوّه `qRenderChips` · والدوال. واحد من غير التاني معناه
    #    صندوق فاضي على الشاشة أو نداء لدالة مش موجودة.
    waChipsBox='      <div class="fchips" id="qWaChips"></div>\n',
    waChipsCall='  qWaRender();\n',
    waChipsJs=WA_CHIPS_JS,
    # 🔴 **عمود العنوان لصفحة «الجاهز للشحن» بس دلوقتي** — `ready-orders-worker`
    #    v1.1.0 بيرجّع `address1`/`address2`، و`shipped-orders-worker` **لسه
    #    مابيرجّعهمش**. عمود بيقول `—` على كل صف بيتقري عطل في الشاشة مش
    #    «الحقل مش موجود»، فالعمود بيتضاف هناك **في نفس تسليم الـ Worker**
    #    (بند مفتوح في `CLAUDE.md`) — بتغيير المعاملين دول بس.
    addrHead='<th class="sortable-th col-addr" data-q-sort="address" onclick="qToggleSort(\'address\')">العنوان<span class="sort-icon" data-q-sort="address"></span></th>',
    addrCell="""      <td class="addr-cell">${addressCell(o)}</td>\n""",
    addrFn=ADDR_FN,
    # 🔴 **عمود «ملحوظات» — صفحة «الجاهز للشحن» بس** (v1.6.0 · طلب أحمد
    #    17-09-2026). مصدره `note` في رد `get_ready_queue`، و
    #    `ready-orders-worker` **v1.3.0** هو اللي بيرجّعه —
    #    و`shipped-orders-worker` **لسه مابيرجّعهوش**.
    # ⛔ **وممنوع يتضاف في صفحة المشحون قبل الـ Worker** — عمود بيقول `—`
    #    على كل صف بيتقري **عطل في الشاشة** مش «الحقل مش موجود» (نفس
    #    قاعدة عمود العنوان بالظبط، وفيه بند في `queues-check.mjs` بيقفلها).
    noteHead='<th class="sortable-th col-note" data-q-sort="note" onclick="qToggleSort(\'note\')">ملحوظات<span class="sort-icon" data-q-sort="note"></span></th>',
    noteCell="""      <td class="note-cell">${noteCell(o)}</td>\n""",
    noteFn=NOTE_FN,
    aboutCols=READY_ABOUT_COLS,
    cols=10,
    # 🔴 تاب «جرد المكتب» — الصفحة دي بس (الشرح فوق عند الكتل)
    auditCss=AUDIT_CSS, auditTabs=AUDIT_TABS, auditLib=AUDIT_LIB,
    auditView=AUDIT_VIEW, auditJs=AUDIT_JS, auditAbout=AUDIT_ABOUT,
    # ⚠️ `apiPost` **بس للصفحة اللي بتناديه** — دالة بلا مستهلك = كود ميت،
    #    وصفحة المشحون مالهاش أي endpoint بـ POST.
    apiFns='apiGet, apiPost',
    clItems=CL_READY,
    aboutWhat='''الأوردرات اللي حالتها <code>Ready</code> — يعني اتأكدت وجاهزة تخرج،
             ولسه ما اتسجّلش عليها شحن.''',
  ),
  dict(
    file='shipped-orders.html', key='shipped', status='Shipped', action='get_shipped_queue',
    worker='shipped', cache='DCO_CACHE_SHIPPED',
    icon='🚚', title='طابور المشحون', subtitle='مركز عمليات الشحن والتحصيل',
    emptyOk='مفيش شحنات مفتوحة دلوقتي',
    packCol='تاريخ التغليف',
    extraHead='<th class="sortable-th" data-q-sort="tracking" onclick="qToggleSort(\'tracking\')">رقم التتبع<span class="sort-icon" data-q-sort="tracking"></span></th>',
    extraFilter='',
    extraCell="""      <td>${trackingCell(o)}</td>\n""",
    extraFn=TR_FN,
    # ⛔ بلا مربعات «موقع الشحنة» — مفيش فلتر `where` في الصفحة دي أصلاً،
    #    ومربع بيفلتر على فلتر مش موجود = ضغطة مالهاش أثر.
    waChipsBox='', waChipsCall='', waChipsJs='',
    # ⚠️ بلا عمود عنوان — الـ Worker بتاع الطابور ده مابيرجّعش `address1`.
    #    ⚠️ وبلا عمود ملحوظات لنفس السبب بالظبط — `note` جه في
    #       `ready-orders-worker` v1.3.0 وبس.
    addrHead='', addrCell='', addrFn='',
    noteHead='', noteCell='', noteFn='',
    aboutCols=SHIPPED_ABOUT_COLS,
    cols=8,
    # ⛔ بلا جرد — أوردر `Shipped` خرج من المكتب بالتعريف، فجرده سؤال
    #    مالوش معنى (الشرح كامل فوق عند الكتل).
    auditCss='', auditTabs='', auditLib='', auditView='', auditJs='', auditAbout='',
    apiFns='apiGet',
    clItems=CL_SHIPPED,
    aboutWhat='''الأوردرات اللي حالتها <code>Shipped</code> — خرجت من المخزن
             و<b>محدش سجّل لها نتيجة نهائية</b> لسه. ⚠️ <code>In-Return</code>
             <b>مش داخلة</b> في الطابور ده (بند مفتوح).''',
  ),
]

TPL = r'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<!-- skills: html-builder v6.6.0 · worker-builder v3.3.0 · constants v2.6.0 · order-lifecycle v1.8.0 — 15-09-2026 -->
<!-- ══════════════════════════════════════════════════════════════
     🔴 **الملف ده متولّد من `docs/build-pages.py`.**
     الصفحتان (`ready-orders.html` · `shipped-orders.html`) **متطابقتان
     بالحرف** فيما عدا المعاملات في أول المولّد (الحالة · الـ endpoint ·
     العمود الزيادة). ده تطبيق مباشر لدرس R1: نسختان بتتعدّلا بالإيد
     بيفترقا مع أول تعديل، واتصلح في واحدة وفضل مكسور في التانية لشهور.
     ⛔ **متعدّلش الملف ده** — عدّل المولّد وشغّله، وبعدها شغّل
        `docs/rules-check.mjs` و`docs/queues-check.mjs`.
     ⚠️ أي تعديل يدوي هنا **بيضيع في صمت** مع أول تشغيل للمولّد.
     ══════════════════════════════════════════════════════════════ -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>__TITLE__ — مركز عمليات الشحن والتحصيل</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- 🔴 قاعدة الأسبقية: الـ shell أولاً، وستايل الصفحة بعده وبيغلب -->
  <link rel="stylesheet" href="shared/shell.css">
__AUDIT_LIB__
<style>
/* ══════════════════════════════════════════════════════════════
   §STYLES — الصفحة دي بس. مفيش كتلة توكنز هنا (كلها في الـ shell).
   ⚠️ الملفين (`ready-orders.html` · `shipped-orders.html`) **متطابقين
      بالحرف** في الكتلة دي — أي تعديل يتعمل في الاتنين في نفس التمريرة
      (درس R1).
   ══════════════════════════════════════════════════════════════ */

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 14px; }
.card-body { padding: 14px 16px; }

/* ── صندوق العدّ — نسخة من `.count-box` بتاعة هب المخزن بالحرف ──
   الموظف بيتنقّل بين الهبين، ولوحة بشكلين مختلفين لنفس المعلومة
   معناها إنه يتعلّمها مرتين. */
.count-box { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 13px 16px; }
.cb-ico { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; font-size: 24px; background: var(--accent-light); border: 1px solid var(--accent-border); flex-shrink: 0; }
.cb-num { font-family: var(--font-mono); font-size: 38px; font-weight: 900; line-height: 1; color: var(--accent); direction: ltr; font-variant-numeric: tabular-nums; }
.cb-num.pending { color: var(--text-muted); }
.cb-num.failed  { color: var(--red); font-size: 22px; }
.cb-unit { font-size: 11.5px; font-weight: 700; color: var(--text-muted); }
/* ⚠️ `.cb-title` و`.cb-sub` **اتشالوا** مع الكلام اللي كان جنب الأيقونة —
   قاعدة CSS بلا مستهلك = كود ميت، مش «احتياط». */
.cb-mid { flex: 1 1 260px; min-width: 240px; display: flex; flex-direction: column; gap: 9px; align-items: center; }
/* ⚠️ `flex:1` على `.cb-mid` بس — لو اتحطّت على منطقة تانية، منطقة الأكشن
   بتتزحلق من `margin-inline-start:auto` وبتقع في نص الصندوق. */
.cb-act { margin-inline-start: auto; display: flex; align-items: stretch; gap: 9px; flex-wrap: wrap; }

/* ── مربعات الفلترة — 🔴 **نسخة من `.zchip` في `pack.html` بالحرف** ────
   نفس المقاس ونفس الحشو ونفس نصف القطر ونفس بادج العدّ ونفس علامة ✕
   على المختار. الموظف بيتنقّل بين هب المخزن وهب الشحن طول اليوم، ومربع
   فلتر بشكلين مختلفين لنفس الفعل معناه إنه يتعلّمه مرتين (درس R1).
   ⚠️ **مستطيل (`--radius-sm`) مش pill** عن قصد: ده **هدف ضغط** لموظف
      بإيد مشغولة، مش علامة للقراءة — فمقاسه أكبر من نص الجدول.
   ⚠️ أي تعديل هنا يتعمل في `pack.html` في نفس التمريرة.
   🔴 **وبتعدّ من القايمة الكاملة مش المفلترة.** لو العدّ على المفلتر،
      أول ضغطة كانت هتصفّر باقي المربعات فما حدش يقدر يرجّع منها. */
.fchips { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; flex: 1; min-width: 0; justify-content: center; }
.fchips:empty { display: none; }
.zchip { display: inline-flex; align-items: center; gap: 9px; padding: 9px 15px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--surface-2); color: var(--text-secondary); font-family: var(--font-body); font-size: 13px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: filter .12s, transform .1s, box-shadow .15s; }
.zchip:hover  { filter: brightness(.97); }
.zchip:active { transform: translateY(1px); }
/* ⚠️ بادج العدّ **جوّه المربع** بحد من `currentColor` — من غيره الرقم
   بيلزق في الليبل والعين بتلف تدوّر عليه. */
.zchip-n { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 22px; padding: 0 7px; border-radius: 20px; background: var(--surface); border: 1px solid currentColor; font-family: var(--font-mono); font-size: 12.5px; font-weight: 800; line-height: 1; direction: ltr; font-variant-numeric: tabular-nums; }
.zchip.qc-bosta    { background: var(--red-light);    color: var(--red-dark);    border-color: var(--red-border); }
.zchip.qc-showroom { background: var(--teal-light);   color: var(--teal-dark);   border-color: var(--teal-border); }
.zchip.qc-courier  { background: var(--accent-light); color: var(--accent-dark); border-color: var(--accent-border); }
.zchip.qc-flag     { background: var(--amber-light);  color: var(--amber-dark);  border-color: var(--amber-border); }
/* 🔴 مربعات «موقع الشحنة» (v1.8.0) — **نفس ألوان البادج في العمود بالحرف**:
   أخضر للمكتب · أحمر لأي مكان تاني · ورمادي محايد للفاضي.
   ⛔ **والفاضي مايتلوّنش** — «محدش سجّل» مش «الطرد في مكان غلط»، وأداة
      التغليف لسه ما بتكتبش الحقل فالمربع ده بيبقى أكبر واحد في الطابور:
      لون تحذير عليه بيعلّم الموظف يعدّي على اللون كله. */
.zchip.qc-wa-ok    { background: var(--green-light);  color: var(--green-dark);  border-color: var(--green-border); }
.zchip.qc-wa-warn  { background: var(--red-light);    color: var(--red-dark);    border-color: var(--red-border); }
.zchip.qc-wa-none  { background: var(--surface-2);    color: var(--text-secondary); border-color: var(--border); }
/* المختار = فلتر شغّال. العلامة لازم تبان من بعيد — الموظف اللي مش فاهم
   ليه الجدول ناقص بيدوّر على المربع المولّع ده.
   ⚠️ الفلتر **أحادي**: مربع واحد مختار على الأكثر. فلتر مركّب على
   مربعات متلاصقة بيخلّي الموظف مش عارف هو شايف إيه بالظبط. */
.zchip.on { box-shadow: 0 0 0 2px currentColor inset; }
.zchip.on::after { content: '✕'; font-size: 12px; font-weight: 800; opacity: .75; }

/* ⚠️ `.fchip` فضل **للبادجات الصغيّرة اللي جنب الفلوس بس** (مدفوع مقدمًا ·
   حالة مالية مش معروفة) — دي **بتتقري مابتتضغطش**، فمقاسها لازم يفضل
   أصغر من مربعات الفلتر. توحيدهم كان هيخلّي بادج قراءة يبان هدف ضغط. */
.fchip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 20px; border: 1.5px solid var(--border); background: var(--surface-2); font-family: var(--font-body); font-size: 11.5px; font-weight: 800; color: var(--text-secondary); }
.fchip b { font-family: var(--font-mono); font-variant-numeric: tabular-nums; direction: ltr; }
.fchip.qc-flag { background: var(--amber-light); color: var(--amber-dark); border-color: var(--amber-border); }

.cb-money { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

/* ══════════════════════════════════════════════════════════════
   §TABLE — القسم الموحّد (فلاتر + جدول)
   🔴 **المعيار: `ecommoda-html-builder` → `references/data-table-standard.md`**،
      والتنفيذ **نسخة من `pack.html` في هب المخزن بالحرف** — نفس أسماء
      الكلاسات ونفس المقاسات ونفس السلوك. الموظف بيتنقّل بين الهبين طول
      اليوم، وجدول بيتفلتر ويترتّب بطريقة في شاشة وبطريقة تانية في شاشة
      جنبها معناه إنه يتعلّمه مرتين (درس R1).
   ⛔ **وممنوع `overflow:hidden` على `.unified-section`** — بيقص أي
      `.ms-menu` بتفتح وتطلع برّه حدود الكارت (باج حقيقي · 20-08-2026).
      الزوايا بتتحقق بـ`border-radius` على الهيدر وآخر عنصر، مش بالقص.
   ══════════════════════════════════════════════════════════════ */
.unified-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 16px; }
.section-divider { border-top: 1px solid var(--border); }

/* ── هيدر الفلاتر — أيقونة بس، من غير كلمة «الفلاتر» ─────────── */
.flt-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--surface-2); cursor: pointer; user-select: none; transition: background .12s; border-radius: var(--radius) var(--radius) 0 0; }
.flt-header:hover { background: var(--surface-hover); }
.flt-header-right { display: flex; align-items: center; gap: 10px; }
.flt-icon { width: 34px; height: 22.5px; color: var(--text-muted); transition: color .2s; flex-shrink: 0; }
.flt-icon.active { color: var(--accent); }
.flt-toggle { font-size: 13px; color: var(--text-muted); transition: transform .25s; }
.flt-toggle.open { transform: rotate(180deg); }
.flt-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.flt-body.collapsed { display: none; }
.flt-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.flt-g { display: flex; flex-direction: column; gap: 3px; }
.flt-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); letter-spacing: .4px; white-space: nowrap; }

/* 🔴 حالتان إلزاميتان — الباهت معناه «مفيش فلتر شغّال» */
.clear-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: var(--radius-sm); font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; white-space: nowrap; height: 34px; border: 1px solid var(--red-border); color: var(--red); background: var(--red-light); }
.clear-btn:hover { background: var(--red); color: var(--on-accent); border-color: var(--red); }
.clear-btn.inactive { border-color: var(--border); color: var(--text-muted); background: var(--surface-2); cursor: not-allowed; opacity: .6; }
.clear-btn.inactive:hover { background: var(--surface-2); color: var(--text-muted); border-color: var(--border); }

/* ── البحث — 🔴 الأيقونة **شمال** إلزاميًا ───────────────────────
   أيقونة 🔍 على اليمين بتعمل overlap مع الكتابة العربية، و`padding-left`
   هو اللي بيفتح لها مساحة. */
.search-wrap { position: relative; max-width: 300px; flex: 1; min-width: 210px; }
.search-input { width: 100%; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 8px 12px 8px 34px; font-family: inherit; font-size: 13.5px; height: 36px; box-sizing: border-box; outline: none; background: var(--surface); color: var(--text-primary); transition: border-color .15s, background .15s; }
.search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--focus-ring); }
.search-input.has-value { border-color: var(--accent); background: var(--accent-light); }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--text-muted); pointer-events: none; }

/* ── التاريخ — 🔴 بلا فترة افتراضية ──────────────────────────── */
.date-wrap { position: relative; display: flex; align-items: center; }
.date-wrap input[type=date] { width: 160px; height: 34px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 6px 10px; font-family: inherit; font-size: 12.5px; color: var(--text-primary); background: var(--surface); outline: none; box-sizing: border-box; cursor: pointer; }
.date-wrap input[type=date]:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--focus-ring); }
.date-wrap input[type=date].empty::-webkit-datetime-edit { color: var(--text-secondary); }
.range-preset-wrap { position: relative; align-self: flex-end; }
.range-preset-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--text-secondary); background: var(--surface); cursor: pointer; transition: all .15s; height: 34px; white-space: nowrap; }
.range-preset-btn:hover, .range-preset-btn.has-preset { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.range-preset-btn .pr-arrow { font-size: 10px; transition: transform .2s; }
.range-preset-btn.open .pr-arrow { transform: rotate(180deg); }
.range-preset-menu { position: absolute; top: calc(100% + 4px); right: 0; background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); box-shadow: 0 4px 20px rgba(0,0,0,.12); z-index: 200; min-width: 190px; padding: 4px; display: none; }
.range-preset-menu.open { display: block; }
.range-preset-item { padding: 7px 12px; font-size: 12.5px; font-weight: 500; border-radius: 6px; cursor: pointer; color: var(--text-primary); transition: background .1s; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.range-preset-item:hover { background: var(--surface-2); }
.range-preset-item.active { background: var(--accent-light); color: var(--accent); }
.range-preset-item .pr-check { font-size: 11px; color: var(--accent); display: none; }
.range-preset-item.active .pr-check { display: block; }
.range-preset-clear { color: var(--red); font-weight: 700; }
.range-preset-clear:hover { background: var(--red-light); }
.range-preset-sep { height: 1px; background: var(--border); margin: 3px 4px; }

/* ── الاختيار المتعدد — ⚠️ مفيش `<select>` قيمة واحدة في أي فلتر ── */
.ms-wrap { position: relative; }
.ms-btn { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 190px; height: 34px; padding: 6px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--surface); font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: all .15s; white-space: nowrap; }
.ms-btn:hover { border-color: var(--accent); }
.ms-btn.has-selection { border-color: var(--accent); color: var(--accent-dark); background: var(--accent-light); }
.ms-btn.open { border-color: var(--accent); box-shadow: 0 0 0 3px var(--focus-ring); }
.ms-btn .ms-count { font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; color: var(--on-accent); background: var(--accent); border-radius: 20px; padding: 1px 7px; min-width: 18px; text-align: center; }
.ms-btn .ms-arrow { font-size: 9px; color: var(--text-muted); transition: transform .2s; flex-shrink: 0; }
.ms-btn.open .ms-arrow { transform: rotate(180deg); }
.ms-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 200; width: 260px; max-width: 80vw; background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); box-shadow: 0 8px 28px rgba(0,0,0,.14); display: none; flex-direction: column; overflow: hidden; }
.ms-menu.open { display: flex; }
.ms-ftr-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 7px 10px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
.ms-ftr-clear { font-size: 11.5px; font-weight: 700; color: var(--red); background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 5px; font-family: inherit; }
.ms-ftr-clear:hover { background: var(--red-light); }
.ms-ftr-count { font-size: 11px; color: var(--text-muted); }
.ms-selectall-row { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-bottom: 1px solid var(--border); background: var(--surface-2); font-size: 12.5px; font-weight: 700; cursor: pointer; user-select: none; }
.ms-selectall-row:hover { background: var(--surface-hover); }
.ms-list { max-height: 220px; overflow-y: auto; padding: 4px; }
.ms-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 6px; font-size: 13px; cursor: pointer; user-select: none; transition: background .1s; }
.ms-item:hover { background: var(--surface-2); }
.ms-item.checked { background: var(--accent-light); }
.ms-item input[type=checkbox], .ms-selectall-row input[type=checkbox] { width: 15px; height: 15px; cursor: pointer; accent-color: var(--accent); flex-shrink: 0; }
.ms-item .ms-item-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-empty { padding: 18px; text-align: center; font-size: 12.5px; color: var(--text-muted); }

/* ── Chips — سطر لكل فلتر، واسم الفلتر مرة واحدة في أول السطر ── */
.ms-chips-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ms-chips-row:empty { display: none; }
.chips-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); white-space: nowrap; }
.ms-chip { display: flex; align-items: center; gap: 5px; background: var(--accent-light); color: var(--accent-dark); border: 1px solid var(--accent-border); border-radius: 20px; padding: 3px 6px 3px 10px; font-size: 12px; font-weight: 600; }
.ms-chip button { border: none; background: rgba(37,99,235,.15); color: var(--accent-dark); width: 16px; height: 16px; border-radius: 50%; font-size: 11px; cursor: pointer; line-height: 1; font-family: inherit; }
.ms-chip button:hover { background: var(--accent); color: var(--on-accent); }

/* ── صف الجدول — النتائج + الأكشن + الطي ─────────────────────── */
.tbl-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; background: var(--surface-2); cursor: pointer; user-select: none; transition: background .12s; flex-wrap: wrap; }
.tbl-bar:hover { background: var(--surface-hover); }
.tbl-bar-right, .tbl-bar-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tbl-toggle { font-size: 13px; color: var(--text-muted); transition: transform .25s; }
.tbl-toggle.open { transform: rotate(180deg); }
.results-wrap { display: flex; align-items: center; gap: 8px; }
.results-label { font-size: 14px; font-weight: 800; color: var(--text-primary); white-space: nowrap; }
.results-count { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 34px; padding: 0 10px; font-family: var(--font-mono); font-size: 17px; font-weight: 800; color: var(--purple); background: var(--purple-light); border: 1.5px solid var(--purple-border); border-radius: var(--radius-sm); }
.act-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--text-secondary); background: var(--surface); cursor: pointer; transition: all .15s; white-space: nowrap; height: 34px; }
.act-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.tbl-body-wrap { border-radius: 0 0 var(--radius) var(--radius); }
.tbl-body-wrap.collapsed { display: none; }
.tbl-scroll { overflow-x: auto; border-radius: 0 0 var(--radius) var(--radius); }

/* ── الجدول — 🔴 **نسخة من `.data-table` بتاعة `pack.html`** ─────
   🔴 **والمقاسات هنا أكبر من نسخة التغليف عن قصد** (طلب أحمد 16-09-2026):
      الجدول ده بيتقرا من على بُعد على شاشة محطة الشحن، وصف كامل على
      `12.5px` رمادي كان **مرهق للعين**. اللي اتغيّر: مقاس الخلية
      `13 → 14.5px` · الترويسة `11 → 12.5px` · والسطر التانى في الخلية
      (`.cell-sub`) بقى `--text-secondary` بدل الرمادي الباهت.
   ⛔ وممنوع تصغيرهم تاني من غير قرار — ده كان **طلب صريح**. */
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { background: var(--surface-2); padding: 10px 11px; text-align: center; font-weight: 800; font-size: 12.5px; color: var(--text-primary); border-bottom: 2px solid var(--border-strong); border-inline-start: 1px solid var(--border); white-space: nowrap; }
.data-table td { padding: 11px 11px; border-bottom: 1px solid var(--border); border-inline-start: 1px solid var(--border); text-align: center; vertical-align: middle; font-size: 14.5px; font-weight: 600; color: var(--text-primary); }
.data-table th:first-child, .data-table td:first-child { border-inline-start: none; }
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background: var(--surface-2); }

/* ── الترتيب — 🔴 السهم بيظهر **بس** على العمود المرتَّب عليه ──── */
.sortable-th { cursor: pointer; user-select: none; transition: background .12s, color .12s; }
.sortable-th:hover { background: var(--accent-light); color: var(--accent-dark); }
.sortable-th.sorted { background: var(--accent-light); color: var(--accent-dark); }
.sort-icon { display: inline-block; font-size: 10px; color: var(--accent); font-weight: 900; }
.sort-icon.active { margin-inline-start: 4px; }
/* صف عليه علامة مراجعة — خلفية خفيفة جدًا.
   ⚠️ **خفيفة عن قصد**: الصف ده **مش مرفوض** — هو في الطابور وبيتعدّ،
      والعلامة معناها «راجعه» مش «تجاهله». لون قوي كان هيخلّيه يتقري رفض. */
.data-table tbody tr.flagged { background: color-mix(in srgb, var(--amber-light) 55%, transparent); }
.data-table tbody tr.flagged:hover { background: var(--amber-light); }
.col-num  { font-family: var(--font-mono); direction: ltr; white-space: nowrap; font-variant-numeric: tabular-nums; }

/* ── 🔴 مقاسات الأعمدة — طلب أحمد 17-09-2026 ────────────────────
   الجدول `table-layout:auto`، فالمتصفح كان بيوزّع الفراغ الزيادة
   **بالتناسب مع المحتوى**: «العميل» (اسم واحد) كان بياخد نفس حجم
   «ملحوظات» تقريبًا، و«تاريخ التغليف» بياخد أعرض من «تاريخ الأوردر»
   لأن نص بادج التأخير أطول من نص العمر. والنتيجة إن العمودين اللي
   الموظف **بيقرا** منهم (العنوان والملحوظات) هما أضيق اتنين نسبةً
   لمحتواهم.
   🔴 **`width` مع `max-width` مع بعض** — `max-width` لوحدها في التخطيط
      التلقائي **تلميح بيتجاهَل** لما يبقى فيه فراغ زيادة يتوزّع؛
      و`width` لوحدها بتتزوّد بنفس التوزيع. الاتنين مع بعض هما اللي
      بيثبّتوا العمود فعلاً.
   ⚠️ **والعمودان بنفس المقاس بالحرف** (`col-date`) — التساوي بقى
      **مقصود** مش نتيجة طول النص، فمستحيل يفترقوا مع بيانات تانية.
   ⚠️ ومقاسات «العميل» و«التاريخ» على **الصفحتين** — نفس الجدول ونفس
      المعيار، وجدول بيتقري بمقاسين في صفحتين بيتعلّمه الموظف مرتين.
      اللي في صفحة «الجاهز للشحن» لوحدها هو «العنوان» و«ملحوظات»
      (العمودان مش موجودين في المشحون أصلاً). */
.data-table th.col-cust, .data-table td.cust-cell { width: 90px;  max-width: 90px; }
/* 🔴 `min-width` هنا **مش تزويق** — على شاشة أضيق من الكارت، المتصفح
   بيضغط الأعمدة المرنة وبيسيب اللي محتواه مش قابل للضغط: عمود «تاريخ
   الأوردر» كان بينزل تحت الـ112 و«تاريخ التغليف» بيقف عندها (بادجه
   أطول)، فالعمودان يفترقوا تاني من ورا عرض الشاشة — وده بالظبط اللي
   التمريرة دي اتعملت ضده. */
.data-table th.col-date, .data-table td.date-cell { width: 112px; min-width: 112px; max-width: 112px; }
/* 🔴 **حشو أضيق في خلية التاريخ بس** (v1.8.0 · طلب أحمد 17-09-2026) —
   الحشو العام (11px × ٢) كان بيسيب **٩٠px** جوّه عمود عرضه 112px،
   و`📅 14/09/2026` عرضه **٩٥px**. الشرح الكامل تحت عند `.cell-date`.
   ⚠️ والخلية متوسّطة فالفرق **مش بيبان** — اللي بيبان هو الأيقونة لما
      كانت بتنزل سطر لوحدها. */
.data-table td.date-cell { padding-inline: 6px; }
.data-table th.col-addr, .data-table td.addr-cell { width: 320px; max-width: 320px; }
.data-table th.col-note, .data-table td.note-cell { width: 250px; max-width: 250px; }

/* ── العنوان — 🔴 **العمود الوحيد اللي بيلفّ، وعن قصد** ──────────
   باقي الخلايا سطر واحد متوسّط؛ العنوان نص حر ممكن يبقى ٨٠ حرف.
   ⚠️ `text-align:right` (بداية السطر في RTL) مش `center` — عنوان متوسّط
      على سطرين بيخلّي العين تدوّر على أول كل سطر في مكان مختلف.
   ⚠️ و`max-width` مع `white-space:normal` هما اللي بيمنعوا العمود إنه
      ياكل عرض الجدول كله ويزقّ باقي الأعمدة برّه الشاشة. */
.addr-cell { text-align: right; white-space: normal; line-height: 1.6; }
.cell-sub { display: block; font-size: 10.5px; color: var(--text-muted); font-weight: 700; margin-top: 2px; }

/* «نوع الأوردر» — نسخة طبق الأصل من صفحة التغليف في هب المخزن بالحرف:
   نص عادي بلون بدل بادج (عادي = أزرق التفاعل · استبدال = بنفسجي). */
.type-text { font-weight: 800; white-space: nowrap; }
.type-text.type-s1 { color: var(--accent-dark); }
.type-text.type-s2 { color: var(--purple-dark); }

/* بادج الوقت — الدرجة بتيجي من `dcoDayLevel` في الـ shell فمستحيل تفترق
   بين الصفحتين؛ **اللون هو اللي مكرّر** هنا. */
.time-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 800; white-space: nowrap; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-secondary); }
.time-badge.tb-d0 { background: var(--green-light);  color: var(--green-dark);  border-color: var(--green-border); }
.time-badge.tb-d1 { background: var(--amber-light);  color: var(--amber-dark);  border-color: var(--amber-border); }
.time-badge.tb-d2 { background: var(--orange-light); color: var(--orange-dark); border-color: var(--orange-border); }
.time-badge.tb-d3 { background: var(--red-light);    color: var(--red-dark);    border-color: var(--red-border); }
.time-badge.tb-d7 { background: var(--crit);         color: var(--on-accent);   border-color: var(--crit); }
.time-badge.tb-none { background: var(--surface-2);  color: var(--text-muted); }

/* الحالة المالية — `PENDING` هي اللي معناها «تحصيل»، وأي قيمة تانية
   معناها الفلوس اتدفعت (أو اترجعت) و**مش** داخلة في المستحق. */
.fin { display: inline-block; font-size: 10.5px; font-weight: 800; padding: 1px 7px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-secondary); margin-top: 3px; }
.fin.fin-cod  { background: var(--green-light); color: var(--green-dark); border-color: var(--green-border); }
.fin.fin-paid { background: var(--accent-light); color: var(--accent-dark); border-color: var(--accent-border); }

/* زرار علامة المراجعة — بيفتح نافذة بالسبب والفعل المطلوب */
.flag-btn { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; border: 1.5px solid var(--amber-border); background: var(--amber-light); color: var(--amber-dark); font-family: var(--font-body); font-size: 11px; font-weight: 800; cursor: pointer; white-space: nowrap; }
.flag-btn:hover { border-color: var(--amber); }
.flag-ok { color: var(--text-muted); font-size: 12px; }

/* 🔴 «موقع الشحنة» — بادجان وبس (v1.6.0 · طلب أحمد 17-09-2026).
   الطابور ده أوردرات المفروض طرودها **في المكتب**، فالعمود سؤال بإجابتين:
   مكانه صح (أخضر) ولا لأ (أحمر + ⚠). ⛔ والفاضي **مايتلوّنش** — «محدش
   سجّل» مش «مكان غلط»، وأحمر على أغلب الطابور بيتعلّم الموظف يعدّي عليه. */
.wa-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 800; white-space: nowrap; border: 1.5px solid var(--border); }
.wa-badge.wa-ok   { background: var(--green-light); color: var(--green-dark); border-color: var(--green-border); }
.wa-badge.wa-warn { background: var(--red-light);   color: var(--red-dark);   border-color: var(--red-border); }

/* 🔴 عمود «ملحوظات» — بنفسجي عشان وجود الملحوظة نفسه يتقري **من بعيد**
   قبل نصها. ⚠️ والخلية بتلفّ زي خلية العنوان بالظبط — نص طويل على سطر
   واحد كان بيزقّ باقي الأعمدة برّه الشاشة. */
.note-cell { text-align: right; white-space: normal; line-height: 1.6; }
.note-txt  { color: var(--purple-dark); font-weight: 700; }

/* 🔴 خلايا التاريخ — **البادج تحت التاريخ** (v1.6.0 · طلب أحمد).
   العمودان (تاريخ الأوردر · تاريخ التغليف) كانوا بيعتمدوا على **لفّ
   السطر بالصدفة**: على شاشة عريضة البادج بيقعد جنب التاريخ وعلى ضيّقة
   بينزل تحته، فالعمودان كانوا بيتقروا بشكلين مختلفين في نفس الجدول.
   ⚠️ `display:block` على التاريخ بيخلّي التكديس **مقصود ومتطابق** في
      الاتنين — مش نتيجة عرض الشاشة. */
.date-cell { white-space: normal; line-height: 1.6; }
/* 🔴 **سطران بالظبط: سطر للتاريخ بأيقونته وسطر للبادج** (v1.8.0 · طلب
   أحمد 17-09-2026). قبل كده الخلية كانت **تلات سطور**: 📅 لوحدها،
   والتاريخ تحتها، والبادج تحتهم — لأن `📅 14/09/2026` عرضه **٩٥px** على
   بنط الجدول (14.5px) والخانة بتسيب **٩٠px** جوّه الـ112px. وسطر فيه
   **رمز بلا قيمة** بيتقري خانة تانية فاضية.
   🔴 **والتلات تعديلات لازمين مع بعض**:
     ① `white-space:nowrap` — يمنع اللفّ.
     ② الحشو الأضيق (فوق) — بيوسّع الجوّه لـ**١٠٠px**.
     ③ البنط **13.5px** — بيرجّع العرض لـ**٨٨px**.
   ⛔ **و`nowrap` لوحده كان بيكسر حاجة تانية**: المحتوى اللي مش بيلفّ
      بيرفع **أقل عرض** للعمود، فالمتصفح بيوسّع عمودَي التاريخ فوق الـ112
      **بعرض محتواهم** — وبادج «متأخر ١٦ يوم» أطول من «منذ ٣ أيام»،
      فالعمودان يفترقوا تاني. وده بالظبط اللي تمريرة v1.7.0 اتعملت ضده.
   ⚠️ **والفسحة ١٢px مقصودة** — رمز 📅 بيترسم من خط النظام (Noto Color
      Emoji هنا · Segoe UI Emoji على ويندوز) وعرضه بيفرق ٢-٤px من جهاز
      للتاني. فسحة ٥px كانت هتخلّي السطر الواحد **مضمون على الجهاز ده بس**.
   ⚠️ و`display:block` (v1.6.0) لسه هو اللي بيخلّي التكديس **مقصود
      ومتطابق** في العمودين — مش نتيجة لفّ سطر حسب عرض الشاشة. */
.date-cell .cell-date { display: block; white-space: nowrap; font-size: 13.5px; margin-bottom: 4px; }

/* نافذة تفاصيل العلامات */
.fl-item { border: 1px solid var(--amber-border); background: var(--amber-light); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 9px; }
.fl-item:last-child { margin-bottom: 0; }
.fl-lbl { font-size: 13px; font-weight: 800; color: var(--amber-dark); }
.fl-det { font-size: 12px; font-weight: 700; color: var(--text-primary); margin-top: 4px; line-height: 1.7; }
.fl-act { font-size: 12px; color: var(--text-secondary); margin-top: 5px; line-height: 1.7; }
.fl-act b { color: var(--text-primary); }

/* بانرات — الفشل والاقتطاع **منفصلين عن بعض عن قصد**:
   «الطابور ما اتجابش» حاجة، و«الطابور أطول من اللي بيتعرض» حاجة تانية خالص. */
.q-fail { margin: 0 16px 12px; padding: 10px 14px; border-radius: var(--radius-sm); background: var(--red-light); border: 1px solid var(--red-border); color: var(--red-dark); font-size: 12.5px; font-weight: 700; line-height: 1.7; }
.q-warn { margin: 0 16px 12px; padding: 10px 14px; border-radius: var(--radius-sm); background: var(--amber-light); border: 1px solid var(--amber-border); color: var(--amber-dark); font-size: 12.5px; font-weight: 700; line-height: 1.7; }
.q-empty { padding: 30px 16px; text-align: center; color: var(--text-muted); font-size: 13.5px; }
.q-empty .ico { font-size: 28px; margin-bottom: 7px; }
__AUDIT_CSS__
</style>
</head>
<body>

<div class="container">
  <div id="headerMount"></div>
__AUDIT_TABS__
  <!-- 🔴 **الغلاف ده هو اللي التاب بيخفيه/بيظهره** — والطابور جوّه بالكامل
       (صندوق العدّ + القسم الموحّد). ⚠️ وفي صفحة بلا تابات الغلاف موجود
       برضه ومفتوح دايمًا: غلاف بيتحقن في صفحة وميتشقنش في التانية معناه
       ملفين مختلفين في البنية، وده بالظبط اللي المولّد اتعمل ضده. -->
  <div id="viewQueue">

  <!-- ══ صندوق العدّ ══════════════════════════════════════════
       🔴 **الرقم الكبير = عدد الصفوف اللي رجعت من الطابور بالحرف**، وهو
          **نفس** رقم الصف على الشاشة الرئيسية لأن الاتنين بيعدّوا من
          `dcoQueueRows` في الـ shell على نفس الرد.
          ⛔ رقمان مختلفان على شاشتين للموظف الواحد = الرقم بيفقد معناه
             (باج v1.11.0 في هب المخزن · درس R1).
       ⚠️ وقبل أول جلب ناجح الرقم **`—` مش `0`** — «ما اتحدّثش» ≠ «مفيش شغل». -->
  <div class="card count-box">
    <!-- 🔴 **الكلام اللي كان جنب الأيقونة اتشال** (طلب أحمد 16-09-2026) —
         عنوان الصفحة في الهيدر بيقول نفس الحاجة، وسطر الشرح كان بيوصف
         **قاعدة الاستعلام** (`Ready` · الماكينتين) وهي معلومة بتتقرا مرة
         واحدة وبعدين بتاخد مساحة فوق الطابور كل يوم. مكانها الباقي نافذة
         «عن الأداة» — ⛔ ومش مسموح تتشال من هناك كمان.
         ⚠️ والأيقونة فضلت: هي اللي بتفرّق الصندوق ده عن أي كارت تاني
            في الشاشة من غير ما تاخد سطر. -->
    <span class="cb-ico">__ICON__</span>
    <div style="display:flex;align-items:baseline;gap:8px">
      <span class="cb-num pending" id="qCount">—</span><span class="cb-unit">أوردر</span>
    </div>
    <div class="cb-mid">
      <div class="fchips" id="qChips"></div>
<!-- 🔴 **صف تاني من المربعات — «موقع الشحنة»** (v1.8.0 · طلب أحمد
     17-09-2026). ⚠️ **تحت صف المندوب مش جنبه** — الصفان فلترين مختلفين
     تمامًا، وواحد ورا التاني في سطر واحد كان بيخلّيهم يتقروا **مجموعة
     واحدة** والموظف يفتكر إن ضغطتين منهم بتضيّقوا نفس السؤال.
     ⚠️ وصفحة المشحون **مالهاش الصف ده** — مفيش فيها فلتر «موقع الشحنة»
        أصلاً (العمود التاني هناك رقم تتبع)، وصف مربعات بلا فلتر تحته
        معناه ضغطة مالهاش أثر. -->
__WA_CHIPS__      <div class="cb-money" id="qMoney"></div>
    </div>
    <div class="cb-act">
      <div class="dco-fresh">
        <div class="dco-fresh-row">
          <span class="dco-fresh-lbl">آخر تحديث</span>
          <span class="dco-ago" id="qAgo">لسه ما اتحدّثش</span>
        </div>
        <div class="dco-fresh-row" id="qStamp"><span class="dco-stamp-chip">—</span></div>
      </div>
      <button class="dco-rbtn" id="qBtn" type="button" onclick="qLoad(false)">
        <span class="dco-rbtn-ico">↺</span><span>تحديث</span>
        <span class="dco-rbtn-badge" id="qBadge">—</span>
      </button>
    </div>
  </div>

  <!-- ══ القسم الموحّد — فلاتر + جدول في كارت واحد ═══════════════
       🔴 `data-table-standard.md` §1: **كارت واحد بإطار واحد وظل واحد**،
          بينهم `.section-divider` بس. ⛔ ممنوع كارتين بينهم فراغ.
       ⛔ **وممنوع `overflow:hidden` عليه** — بيقص قوايم الفلاتر. -->
  <div class="unified-section">

    <!-- هيدر الفلاتر — 🔴 سهم الطي **أول عنصر أقصى اليمين**، ومفيش
         كلمة «الفلاتر»: الدلالة بلون الأيقونة وزرار المسح بس (§2). -->
    <div class="flt-header" onclick="qToggleFilters()">
      <div class="flt-header-right">
        <span class="flt-toggle" id="qFltToggleIcon">▲</span>
        <svg class="flt-icon" id="qFltIcon" viewBox="0 0 36 24" fill="none"
             stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
             role="img" aria-label="فلاتر">
          <polygon points="2 3 13 3 8.3 10.2 8.3 19 6.7 19 6.7 10.2 2 3"></polygon>
          <line x1="18" y1="5"  x2="33" y2="5"></line>
          <line x1="18" y1="11" x2="29" y2="11"></line>
          <line x1="18" y1="17" x2="25" y2="17"></line>
        </svg>
      </div>
      <button class="clear-btn inactive" id="qClearAllBtn" type="button"
        onclick="event.stopPropagation(); qClearAllFilters();">✕ مسح كل الفلاتر</button>
    </div>

    <!-- ⚠️ مقفول افتراضيًا — لازم يفضل متطابق مع `qFltOpen = false` في الـ JS،
         وإلا أول ضغطة على الهيدر مابتعملش حاجة ظاهرة. والانحراف ده عن
         «مفتوح افتراضيًا» في §2 **نفس انحراف `pack.html` و`print.html`**:
         الطابور هو الشغل، والفلاتر كانت هتاخد نص الشاشة الأولى قبل أول صف. -->
    <div class="flt-body collapsed" id="qFltBody">

      <!-- صف ١ — كل فلاتر الاختيار المتعدد (§4: مفيش `<select>` قيمة واحدة) -->
      <div class="flt-row" id="qMsRow"></div>

      <!-- صف ٢ — بحث ← فترة سريعة ← من ← إلى (الترتيب إلزامي · §5) -->
      <div class="flt-row">
        <div class="flt-g" style="flex:1;min-width:210px">
          <span class="flt-label">بحث برقم الأوردر أو اسم العميل</span>
          <!-- ⚠️ من غير `placeholder` — النص الرمادي جوّه المربع بيتقري
               **قيمة مكتوبة** من بعيد (Step 2 بند ٧)، والليبل فوقه هو
               الوصف. و🔍 **على الشمال** إلزاميًا: على اليمين بتعمل
               overlap مع الكتابة العربية. -->
          <div class="search-wrap">
            <input type="text" class="search-input" id="qSearch" autocomplete="off"
                   aria-label="بحث برقم الأوردر أو اسم العميل" oninput="qOnSearchInput(this)">
            <span class="search-icon" aria-hidden="true">🔍</span>
          </div>
        </div>

        <div class="flt-g">
          <span class="flt-label">فترة سريعة (تاريخ الأوردر)</span>
          <div class="range-preset-wrap" id="qRangePresetWrap">
            <button class="range-preset-btn" id="qRangePresetBtn" type="button" onclick="qTogglePresetMenu(event)">
              <span id="qRangePresetLabel">⚡ اختار فترة</span><span class="pr-arrow">▾</span>
            </button>
            <div class="range-preset-menu" id="qRangePresetMenu">
              <!-- 🔴 «مسح الاختيار» إلزامي في **أعلى** القايمة — الحالة
                   المحايدة هي «بلا فلتر تاريخ»، مش «اليوم» (§5). -->
              <div class="range-preset-item range-preset-clear" onclick="qClearRangePreset()"><span>✕ مسح الاختيار</span></div>
              <div class="range-preset-sep"></div>
              <div class="range-preset-item" data-preset="today"     onclick="qApplyPreset('today')"><span>اليوم</span><span class="pr-check">✓</span></div>
              <div class="range-preset-item" data-preset="yesterday" onclick="qApplyPreset('yesterday')"><span>أمس</span><span class="pr-check">✓</span></div>
              <div class="range-preset-sep"></div>
              <div class="range-preset-item" data-preset="last7"     onclick="qApplyPreset('last7')"><span>آخر 7 أيام</span><span class="pr-check">✓</span></div>
              <div class="range-preset-item" data-preset="last30"    onclick="qApplyPreset('last30')"><span>آخر 30 يوم</span><span class="pr-check">✓</span></div>
              <div class="range-preset-sep"></div>
              <div class="range-preset-item" data-preset="thisMonth" onclick="qApplyPreset('thisMonth')"><span>الشهر الحالي</span><span class="pr-check">✓</span></div>
            </div>
          </div>
        </div>

        <div class="flt-g">
          <span class="flt-label">من تاريخ</span>
          <div class="date-wrap">
            <input type="date" id="qDateFrom" class="empty" aria-label="من تاريخ"
              onchange="qOnDateInputChange(this)" onclick="this.showPicker&&this.showPicker();">
          </div>
        </div>

        <div class="flt-g">
          <span class="flt-label">إلى تاريخ</span>
          <div class="date-wrap">
            <input type="date" id="qDateTo" class="empty" aria-label="إلى تاريخ"
              onchange="qOnDateInputChange(this)" onclick="this.showPicker&&this.showPicker();">
          </div>
        </div>
      </div>

      <!-- Chips — 🔴 **سطر منفصل لكل فلتر**، واسم الفلتر مرة واحدة في
           أول السطر (§6). والسطر بيختفي لوحده لو فاضي. -->
      <div id="qChipsRows"></div>
    </div>

    <div class="section-divider"></div>

    <!-- صف الجدول — 🔴 «النتائج» = **عدد المعروض بعد الفلتر**، والرقم
         الكبير فوق = **عدد الطابور كله**. الاتنين مقصودين: الأول بيقول
         «انت شايف كام» والتاني «الطابور فيه كام». -->
    <div class="tbl-bar" onclick="qToggleTable()">
      <div class="tbl-bar-right">
        <span class="tbl-toggle open" id="qTblToggleIcon">▲</span>
        <div class="results-wrap">
          <span class="results-label">النتائج:</span>
          <span class="results-count" id="qFilteredCount">—</span>
        </div>
      </div>
      <div class="tbl-bar-left">
        <!-- ⚠️ `stopPropagation` إلزامية — من غيرها الضغطة بتطوي الجدول -->
        <button class="act-btn" type="button" onclick="event.stopPropagation(); qLoad(false);">↺ تحديث</button>
      </div>
    </div>

    <div class="tbl-body-wrap" id="qTblBodyWrap">
      <div id="qFail" class="q-fail" style="display:none;"></div>
      <div id="qTrunc" class="q-warn" style="display:none;"></div>
      <div id="qEmpty" class="q-empty"><div class="ico">⏳</div><div>جاري تحميل الطابور…</div></div>
      <div class="tbl-scroll" id="qTableWrap" style="display:none;">
        <table class="data-table" id="qTable">
          <thead>
            <tr>
              <!-- 🔴 الترتيب: `data-q-sort` لازم يطابق مفاتيح `Q_SORT_CONFIG`
                   في الـ JS بالحرف — مفتاح مش في القايمة بيرجع للافتراضي
                   **في صمت**، فالعمود يبان إنه اترتّب وهو مااترتّبش. -->
              <th class="sortable-th" data-q-sort="orderName" onclick="qToggleSort('orderName')">رقم الأوردر<span class="sort-icon" data-q-sort="orderName"></span></th>
              <th class="sortable-th col-cust" data-q-sort="customer"  onclick="qToggleSort('customer')">العميل<span class="sort-icon" data-q-sort="customer"></span></th>
              __ADDR_HEAD____NOTE_HEAD__<th class="sortable-th" data-q-sort="courier" onclick="qToggleSort('courier')">المندوب<span class="sort-icon" data-q-sort="courier"></span></th>
              __EXTRA_HEAD__
              <th class="sortable-th col-date" data-q-sort="createdAt" onclick="qToggleSort('createdAt')">تاريخ الأوردر<span class="sort-icon" data-q-sort="createdAt"></span></th>
              <!-- ⚠️ الاسم **«تاريخ التغليف»** مش «الوقت منذ التغليف» — الخلية
                   فيها التاريخ **والبادج** مع بعض، بالظبط زي عمود «تاريخ
                   الأوردر» اللي جنبه. اسم العمود لازم يوصف اللي جوّاه، والبادج
                   هو اللي بيقول «قاعد من إمتى» في العمودين. -->
              <th class="sortable-th col-date" data-q-sort="packedAt" onclick="qToggleSort('packedAt')">__PACK_COL__<span class="sort-icon" data-q-sort="packedAt"></span></th>
              <!-- 🔴 «نوع الأوردر» **قبل الأخير** (طلب أحمد 16-09-2026) — الأعمدة
                   اللي الموظف بيدوّر بيها على الصف (رقم · عميل · عنوان · مندوب)
                   بقت مجمّعة في أول الجدول، والنوع صفة بيتأكد منها **بعد** ما
                   يلاقي الصف. ⚠️ ولسه **قبل** «مراجعة» عن قصد: العلامة آخر
                   حاجة تتقرا لأنها هي اللي بتوقف الشغل. -->
              <th class="sortable-th" data-q-sort="machineLabel" onclick="qToggleSort('machineLabel')">نوع الأوردر<span class="sort-icon" data-q-sort="machineLabel"></span></th>
              <th class="sortable-th" data-q-sort="flagCount" onclick="qToggleSort('flagCount')">مراجعة<span class="sort-icon" data-q-sort="flagCount"></span></th>
            </tr>
          </thead>
          <tbody id="qBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  </div><!-- /#viewQueue -->
__AUDIT_VIEW__
</div>

<!-- نافذة تفاصيل علامات المراجعة -->
<div class="eco-overlay" id="flagsOverlay">
  <div class="eco-modal">
    <div class="eco-modal-hdr"><span id="flagsTitle">⚠️ محتاج مراجعة</span><button class="modal-close-x" onclick="closeFlags()">✕</button></div>
    <div class="eco-modal-body" id="flagsBody"></div>
    <div class="eco-modal-ftr"><button class="btn-ghost" onclick="closeFlags()">إغلاق</button></div>
  </div>
</div>

<div class="eco-overlay" id="aboutOverlay">
  <div class="eco-modal">
    <div class="eco-modal-hdr"><span>ℹ️ عن __TITLE__</span><button class="modal-close-x" onclick="closeAbout()">✕</button></div>
    <div class="eco-modal-body">
      <details class="about-sec" open>
        <summary>الصفحة بتعرض إيه</summary>
        <div class="about-sec-body">
          <p>__ABOUT_WHAT__</p>
          <p>🔴 <b>عرض بحت</b> — الصفحة دي <b>مابتكتبش أي حاجة</b>: لا على شوبيفاي ولا
             في السجل. الـ Worker بتاعها قراءة بحتة ومالوش <code>[[d1_databases]]</code>.</p>
          <h4>الـ Workers</h4>
          <div id="aboutWorkers"></div>
          <h4>الأعمدة</h4>
          <ul>
            <li><b>نوع الأوردر</b> — «عادي» يعني الشحنة الأصلية (S1)، و«استبدال/استرجاع»
                يعني دورة الـ R/E (S2). الصف بياخد <b>بيانات ماكينته هو</b>: وقت التغليف
                واسم اللي غلّف ورقم التتبع كلهم من حقول الماكينة الصح.</li>
            <li><b>مستحق التحصيل</b> (فوق الطابور، مش عمود) — مجموع
                <code>currentTotalPriceSet</code> للأوردرات اللي حالتها المالية
                <code>PENDING</code> بس: الرقم بعد أي تعديل أو مرتجع، وهو اللي
                المندوب بيحصّله فعلاً. 🔴 والمدفوع مقدمًا <b>مستبعَد ومُعلَن بعدده</b>
                جنبه — استبعاد صامت من رقم فلوس بيخلّي الفرق بين المجموع والواقع
                بلا تفسير. ⚠️ ولما يبقى فيه فلتر أو بحث، الرقم بيتحسب على
                <b>المعروض</b> وبيقول «(مفلتر)» صراحةً.</li>
__ABOUT_COLS__
            <li><b>مراجعة</b> — الصف اللي عليه شذوذ بياخد علامة، والضغط عليها بيفتح
                <b>السبب والقيمة الغلط والفعل المطلوب</b>. 🔴 والصف <b>بيفضل في الطابور
                وبيتعدّ في الرقم</b> — علّم عليه متشيلوش (قاعدة ١٣).</li>
          </ul>
          <h4>الترتيب والتحديث</h4>
          <ul>
            <li>الترتيب <b>الأقدم فوق</b> — الأوردر اللي قاعد من أطول مدة هو اللي محتاج
                تحرّك دلوقتي.</li>
            <li>التحديث التلقائي كل ١٥ دقيقة، <b>بيقف والتاب مقفول</b>، وعدّاد «منذ كام»
                بيتحدّث كل نص دقيقة <b>بلا أي نداء شبكة</b>.</li>
            <li>مربعات الفلترة فوق الطابور <b>بتعدّ من القايمة الكاملة</b> مش
                المفلترة — ضغطة عليها بتفلتر، وضغطة تانية بترجّع الكل، وهي
                <b>بتكتب في نفس فلاتر اللوحة تحت</b>: مربع مولّع وفلتر مطفي
                (أو العكس) كانوا هيخلّوا الضغطة تدهس فلتر الموظف من غير ما يقصد.</li>
          </ul>
        </div>
      </details>
__AUDIT_ABOUT__
    </div>
    <div class="eco-modal-ftr"><button class="btn-ghost" onclick="closeAbout()">إغلاق</button></div>
  </div>
</div>

<div class="eco-overlay" id="changelogOverlay">
  <div class="eco-modal">
    <div class="eco-modal-hdr"><span>📋 سجل التحديثات</span><button class="modal-close-x" onclick="closeChangelog()">✕</button></div>
    <div class="eco-modal-body">
      <!-- ⚠️ بادج أول كتلة **بيتكتب من `TOOL_VERSION`** (مصدر واحد · #24)،
           فالبنود اللي تحته لازم تكون بنود النسخة الحالية فعلاً — كتلة
           بنسخة جديدة وبنود قديمة أسوأ من مفيش سجل. -->
      <div class="cl-version-block">
        <div class="cl-version-row">
          <span class="cl-ver-badge" id="clLatestVerBadge">v1.3.0</span>
          <span class="cl-ver-date">17-09-2026</span>
        </div>
        <ul class="cl-items">
__CL_ITEMS__        </ul>
      </div>

      <div class="cl-version-block">
        <div class="cl-version-row">
          <span class="cl-ver-badge">v1.0.0</span>
          <span class="cl-ver-date">15-09-2026</span>
        </div>
        <ul class="cl-items">
          <li class="cl-item"><span class="cl-tag new">جديد</span><span>أول إصدار — <b>__TITLE__</b> جوّه مركز عمليات الشحن والتحصيل.</span></li>
        </ul>
      </div>
    </div>
    <div class="eco-modal-ftr"><button class="btn-ghost" onclick="closeChangelog()">إغلاق</button></div>
  </div>
</div>

<div id="sharedMount"></div>

<!-- 🔴 نسخة واحدة مضمّنة — ممنوع محتوى الملف ده يتنسخ هنا -->
<script src="shared/shell.js"></script>
<script>document.getElementById('sharedMount').innerHTML = dcoSharedModals();</script>
<script>
// ══════════════════════════════════════════════════════════════
// §INIT — الجلسة أولاً، قبل أي حاجة تانية
// ══════════════════════════════════════════════════════════════
// 🔴 `requireSession()` **بترمي** لو مفيش جلسة — من غير الرمي، باقي
//    السكربت بيكمّل تنفيذ وبينادي الـ Worker وبيرسم جدول **أثناء** ما
//    التحويل لشاشة الدخول شغّال.
const session = requireSession();

const { __API_FNS__ } = dcoApi(DCO_WORKERS.__WORKER__);
const PAGE_WORKERS = ['__WORKER__'];

// ══════════════════════════════════════════════════════════════
// §QUEUE-JS — الطابور
// ══════════════════════════════════════════════════════════════
//
// 🔴 **صفر قاعدة اشتقاق في الملف ده.** الماكينة والعلامات والمربعات
//    والفلوس كلهم من `shared/shell.js` §QUEUE-RULES — **نفس** الدوال اللي
//    الشاشة الرئيسية بتعدّ بيها. ⛔ أي شرط أهلية يتكتب هنا بيخلّي الرقم في
//    الصفحة يخالف الرقم في الرئيسية **في صمت** (درس R1 · v1.11.0).
//
// ⚠️ **التحديث التلقائي بنفس حراس الشاشة الرئيسية التلاتة** — التسليح بعد
//    كل جلب ناجح، و`document.hidden` = صفر استعلام، والنبضة بتحدّث «منذ
//    كام» بلا أي نداء شبكة.
const Q_STATUS          = '__STATUS__';
const Q_KIND            = '__KEY__';
const Q_AUTO_REFRESH_MS = 15 * 60 * 1000;
const Q_TICK_MS         = 30 * 1000;

const qState = { rows: [], at: null, loading: false, dirty: false, timer: null,
                 failed: false, truncated: false };

// ══════════════════════════════════════════════════════════════
// §FILTERS — القسم الموحّد (`data-table-standard.md`)
// ══════════════════════════════════════════════════════════════
//
// 🔴 **كل الفلاتر اختيار متعدد** (§4) — مفيش `<select>` قيمة واحدة، حتى لو
//    القايمة عنصرين. والقايمة الأحادية القديمة (مربع واحد مختار على الأكثر)
//    **اتلغت**: الموظف اللي عايز «بوسطة + مناديب» كان مضطر يشيل الفلتر خالص.
//
// ⚠️ **ترتيب المفاتيح هنا هو ترتيب الفلاتر في الشاشة وترتيب صفوف الشيبس**،
//    والمندوب الأول عن قصد — مربعات الطابور فوق بتكتب فيه.
// ── §MULTISELECT — مكوّن واحد لكل قوايم الاختيار المتعدد ──────
//
// 🔴 **نسخة واحدة بتخدم الطابور والجرد** (v1.7.0 · طلب أحمد 17-09-2026).
//    تاب «جرد المكتب» بقى له **فلاتره المستقلة**، ونسخة تانية من نفس
//    المنطق كانت هتبقى **درس R1 حرفيًا**: حارس `document.contains` يتصلح
//    في واحدة ويفضل مكسور في التانية، والفلتر يبقى multi-select بالاسم
//    بس **بلا أي رسالة خطأ**.
// ⚠️ المكوّن بياخد **نطاق** (`ns`) وبيولّد منه مفاتيح الـ DOM
//    (`${ns}MsBtn-${key}`) — ومفاتيح نطاق `q` **ما اتغيّرتش بحرف**.
const MS = {};

function msInit(ns, filters, opts) {
  const reg = { filters, state: {}, rowId: opts.rowId, chipsId: opts.chipsId,
                onChange: opts.onChange || (() => {}), locked: false };
  filters.forEach(f => { reg.state[f.key] = { items: [], selected: new Set() }; });
  MS[ns] = reg;
  return reg.state;
}
function msSel(ns, key) { return MS[ns].state[key].selected; }

// 🔴 **فحص truthy مش مقارنة بـ`null`** (§3 — أخطر باج في المعيار):
//    `undefined !== null` بترجّع `true`، فأي خاصية مش موجودة على فلتر كانت
//    هتخلّي أيقونة الفلتر **مولّعة من أول تحميل وللأبد**.
function msAnyActive(ns) {
  return MS[ns].filters.some(f => MS[ns].state[f.key].selected.size > 0);
}

// 🔴 **الليبل غير القيمة** — الفلترة كلها بتشتغل على `of(o)` الخام
//    (`Office`)، و`labelOf` بتغيّر **العرض بس** (✅ في المكتب). فلترة على
//    النص المعروض كانت هتربط الفلتر بشكل البادج: أي تعديل في نص البادج
//    بيفضّي الجدول **في صمت**.
// ⚠️ والقراءة من البنود المبنية الأول — القيمة اللي اتشالت من الطابور
//    مابقاش ليها بند، والرجوع لـ`labelOf` بيمنع شيب بلا اسم.
function msLabel(ns, key, value) {
  const it = MS[ns].state[key].items.find(x => x.value === value);
  if (it) return it.label;
  const f = MS[ns].filters.find(x => x.key === key);
  return f && f.labelOf ? String(f.labelOf(value)) : String(value);
}

// ── بناء صف الفلاتر — مرة واحدة عند التحميل ──────────────────
function msBuildRow(ns) {
  const reg = MS[ns];
  const row = document.getElementById(reg.rowId);
  if (row) row.innerHTML = reg.filters.map(f => `
    <div class="flt-g">
      <span class="flt-label">${esc(f.label)}</span>
      <div class="ms-wrap" id="${esc(ns)}MsWrap-${esc(f.key)}">
        <button class="ms-btn" type="button" id="${esc(ns)}MsBtn-${esc(f.key)}" data-default-label="الكل"
                onclick="msToggle('${esc(ns)}','${esc(f.key)}')">
          <span id="${esc(ns)}MsBtnLabel-${esc(f.key)}">الكل</span><span class="ms-arrow">▾</span>
        </button>
        <div class="ms-menu" id="${esc(ns)}MsMenu-${esc(f.key)}">
          <!-- 🔴 «مسح الاختيار» **فوق** مش في الفوتر (§4) -->
          <div class="ms-ftr-top">
            <button class="ms-ftr-clear" type="button" onclick="msClear('${esc(ns)}','${esc(f.key)}')">مسح الاختيار</button>
            <span class="ms-ftr-count" id="${esc(ns)}MsFtrCount-${esc(f.key)}"></span>
          </div>
          <div class="ms-selectall-row" onclick="msToggleSelectAll('${esc(ns)}','${esc(f.key)}')">
            <input type="checkbox" id="${esc(ns)}MsSelectAll-${esc(f.key)}"
              onclick="event.stopPropagation()" onchange="msToggleSelectAll('${esc(ns)}','${esc(f.key)}', this.checked)">
            <span>تحديد الكل</span>
          </div>
          <div class="ms-list" id="${esc(ns)}MsList-${esc(f.key)}"></div>
        </div>
      </div>
    </div>`).join('');
  const chips = document.getElementById(reg.chipsId);
  if (chips) chips.innerHTML =
    reg.filters.map(f => `<div class="ms-chips-row" id="${esc(ns)}ChipsRow-${esc(f.key)}"></div>`).join('');
}

// 🔴 **بنود كل فلتر بتتبني من القايمة الكاملة** — مش من المعروض. بناؤها
//    من المفلتر كان هيخلّي أول اختيار **يشيل باقي الخيارات من القايمة**،
//    فالموظف مايقدرش يرجع منها (نفس قاعدة مربعات الطابور).
// ⚠️ والاختيار القديم بيتشال لو قيمته مابقتش موجودة بعد التحديث — فلتر
//    على قيمة مختفية معناه جدول فاضي بلا سبب ظاهر.
function msSyncItems(ns, rows) {
  const reg = MS[ns];
  reg.filters.forEach(f => {
    const vals = [...new Set((rows || []).map(f.of).filter(v => v !== null && v !== undefined))].map(String);
    // ⚠️ الترتيب **بالليبل** مش بالقيمة الخام — القايمة بتتقرا بالليبل،
    //    وترتيب `Office`/`Warehouse` تحت أسماء عربية بيبان عشوائي.
    reg.state[f.key].items = vals
      .map(v => ({ value: v, label: String(f.labelOf ? f.labelOf(v) : v) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    [...reg.state[f.key].selected].forEach(v => {
      if (!vals.includes(v)) reg.state[f.key].selected.delete(v);
    });
    msRenderList(ns, f.key);
  });
  msRenderChips(ns);
}

function msRenderList(ns, key) {
  const st = MS[ns].state[key];
  const listEl = document.getElementById(`${ns}MsList-${key}`);
  if (!listEl) return;
  listEl.innerHTML = !st.items.length
    ? '<div class="ms-empty">لا توجد عناصر</div>'
    : st.items.map(it => {
        const checked = st.selected.has(it.value);
        return `<div class="ms-item ${checked ? 'checked' : ''}" onclick="msToggleItem('${esc(ns)}','${esc(key)}','${esc(it.value)}')">
          <input type="checkbox" ${checked ? 'checked' : ''} onclick="event.stopPropagation(); msToggleItem('${esc(ns)}','${esc(key)}','${esc(it.value)}')">
          <span class="ms-item-label">${esc(it.label)}</span>
        </div>`;
      }).join('');
  const sa = document.getElementById(`${ns}MsSelectAll-${key}`);
  if (sa) sa.checked = st.items.length > 0 && st.items.every(it => st.selected.has(it.value));
  const cnt = document.getElementById(`${ns}MsFtrCount-${key}`);
  if (cnt) cnt.textContent = `${st.selected.size} مختار`;
  msUpdateButtonLabel(ns, key);
}

function msUpdateButtonLabel(ns, key) {
  const st  = MS[ns].state[key];
  const btn = document.getElementById(`${ns}MsBtn-${key}`);
  const lbl = document.getElementById(`${ns}MsBtnLabel-${key}`);
  if (!btn || !lbl) return;
  const n = st.selected.size;
  btn.classList.toggle('has-selection', n > 0);
  if (n === 0)      lbl.textContent = btn.dataset.defaultLabel || 'الكل';
  // ⚠️ **الليبل مش القيمة الخام** — زرار بيقول `Office` والخلية تحته
  //    بتقول «✅ في المكتب» بيتقروا حاجتين مختلفتين.
  else if (n === 1) lbl.textContent = msLabel(ns, key, [...st.selected][0]);
  else              lbl.innerHTML   = `${n} محددين <span class="ms-count">${n}</span>`;
}

function msToggle(ns, key) {
  if (MS[ns].locked) return;
  const menu = document.getElementById(`${ns}MsMenu-${key}`), btn = document.getElementById(`${ns}MsBtn-${key}`);
  const willOpen = !menu.classList.contains('open');
  MS[ns].filters.forEach(f => {
    const m = document.getElementById(`${ns}MsMenu-${f.key}`), b = document.getElementById(`${ns}MsBtn-${f.key}`);
    if (m) m.classList.remove('open');
    if (b) b.classList.remove('open');
  });
  if (willOpen) { menu.classList.add('open'); btn.classList.add('open'); }
}

// ⚠️ الاختيار **مابيقفلش القايمة** — الموظف بيختار كذا قيمة ورا بعض.
function msToggleItem(ns, key, value) {
  if (MS[ns].locked) return;
  const st = MS[ns].state[key];
  st.selected.has(value) ? st.selected.delete(value) : st.selected.add(value);
  msAfterChange(ns, key);
}
function msToggleSelectAll(ns, key, forceState) {
  if (MS[ns].locked) return;
  const st = MS[ns].state[key];
  const allChecked = st.items.length > 0 && st.items.every(it => st.selected.has(it.value));
  const shouldCheck = forceState !== undefined ? forceState : !allChecked;
  st.items.forEach(it => shouldCheck ? st.selected.add(it.value) : st.selected.delete(it.value));
  msAfterChange(ns, key);
}
function msClear(ns, key) {
  if (MS[ns].locked) return;
  MS[ns].state[key].selected.clear();
  msAfterChange(ns, key);
}
function msAfterChange(ns, key) {
  msRenderList(ns, key); msRenderChips(ns); MS[ns].onChange();
}
// ⚠️ **بلا `onChange`** — المستدعي بيمسح حاجات تانية معاها (بحث · تاريخ)
//    وبيرسم **مرة واحدة** في الآخر.
function msClearAll(ns) {
  MS[ns].filters.forEach(f => { MS[ns].state[f.key].selected.clear(); msRenderList(ns, f.key); });
  msRenderChips(ns);
}

// 🔴 **قفل الفلاتر** — نطاق الجرد **لقطة وقت البدء**، فالقوايم بتتقفل مع
//    البدء. قايمة شكلها شغّالة والاختيار منها مالوش أثر هي بالظبط اللي
//    بتخلّي الموظف يفتكر إن النطاق اتغيّر وهو ما اتغيّرش.
function msSetLocked(ns, locked) {
  const reg = MS[ns];
  reg.locked = !!locked;
  reg.filters.forEach(f => {
    const btn = document.getElementById(`${ns}MsBtn-${f.key}`);
    if (btn) btn.disabled = reg.locked;
    const menu = document.getElementById(`${ns}MsMenu-${f.key}`);
    if (menu && reg.locked) menu.classList.remove('open');
  });
  const row = document.getElementById(reg.rowId);
  if (row) row.classList.toggle('ms-locked', reg.locked);
}

// 🔴 **الحارس الأول إلزامي** (`multi-select-filter.md` §8) — من غيره
//    القايمة بتتقفل بعد **أول** اختيار: `msRenderList` بتشيل العنصر
//    المضغوط من الـ DOM قبل ما الحدث يوصل هنا، و`wrap.contains(detached)`
//    بترجّع `false` فالكود بيفتكر الضغطة برّه.
document.addEventListener('click', (e) => {
  if (!document.contains(e.target)) return;
  for (const ns of Object.keys(MS)) {
    MS[ns].filters.forEach(f => {
      const wrap = document.getElementById(`${ns}MsWrap-${f.key}`);
      if (wrap && !wrap.contains(e.target)) {
        const m = document.getElementById(`${ns}MsMenu-${f.key}`), b = document.getElementById(`${ns}MsBtn-${f.key}`);
        if (m) m.classList.remove('open');
        if (b) b.classList.remove('open');
      }
    });
  }
});

// 🔴 سطر لكل فلتر، واسم الفلتر **مرة واحدة** في أول السطر (§6).
function msRenderChips(ns) {
  MS[ns].filters.forEach(f => {
    const row = document.getElementById(`${ns}ChipsRow-${f.key}`);
    if (!row) return;
    const chips = [...MS[ns].state[f.key].selected].map(val =>
      `<span class="ms-chip">${esc(msLabel(ns, f.key, val))}<button type="button" onclick="msToggleItem('${esc(ns)}','${esc(f.key)}','${esc(val)}')">✕</button></span>`
    ).join('');
    row.innerHTML = chips ? `<span class="chips-label">${esc(f.label)}:</span>${chips}` : '';
  });
}

// وصف الاختيار بالنص — بيتكتب في ملخّص تصدير الجرد.
// ⚠️ **بالليبلات مش بالقيم الخام** — ملف بيقول `Office` بعد أسبوع محتاج
//    حد يترجمه.
function msDesc(ns) {
  const parts = [];
  for (const f of MS[ns].filters) {
    const sel = MS[ns].state[f.key].selected;
    if (sel.size) parts.push(`${f.label}: ${[...sel].map(v => msLabel(ns, f.key, v)).join(' + ')}`);
  }
  return parts;
}

//
// 🔴 **`labelOf` اختيارية — بتغيّر العرض بس** (v1.7.0). القيمة اللي
//    الفلترة بتشتغل عليها هي `of(o)` **الخام**، والليبل مجرد اللي
//    الموظف بيقراه في القايمة وفي الشيب. الفلترة على النص المعروض كانت
//    هتربط الفلتر بشكل البادج، وأي تعديل في النص كان هيفضّي الجدول
//    **في صمت**.
const Q_FILTERS = [
  { key: 'courier',  label: 'المندوب',      of: o => o.courier || '— بلا مندوب' },
  { key: 'type',     label: 'نوع الأوردر',  of: o => o.machineLabel },
__EXTRA_FILTER__  // 🔴 **فلتر التغليف — قيمتان وبس** (v1.7.0 · طلب أحمد 17-09-2026).
  //    «وَرّيني اللي لسه ما اتغلّفش» سؤال يومي، وقبل كده الإجابة الوحيدة
  //    كانت **ترتيب** عمود تاريخ التغليف وقراءة الصفوف بالعين.
  // ⚠️ **المصدر `packedAt` نفسه** — نفس الحقل اللي العمود بيعرضه وبيترتّب
  //    بيه بالحرف، فمستحيل صف يتقري «اتغلّف» في العمود و«ما اتغلّفش» في
  //    الفلتر. ⛔ وممنوع يتحسب من `packedByS1`/`packedByS2`: أوردر اتغلّف
  //    والاسم ما اتسجّلش بيبقى «ما اتغلّفش» وهو اتغلّف.
  { key: 'packed',   label: 'التغليف',      of: o => o.packedAt ? 'تم التغليف' : 'لم يتم التغليف' },
  { key: 'flag',     label: 'المراجعة',     of: o => o.flags.length ? 'محتاجة مراجعة' : 'سليم' },
];
// ⚠️ `qMsState` بقى **مرجع لحالة نطاق `q`** جوّه المكوّن — الاسم اتساب
//    زي ما هو لأن `qChipValues`/`qChipActive`/`qVisible` بيقروا منه.
const qMsState = msInit('q', Q_FILTERS,
  { rowId: 'qMsRow', chipsId: 'qChipsRows', onChange: () => qRender() });

let qSearchTerm = '';
let qDateFrom = null, qDateTo = null, qDateFilterActive = false, qActivePreset = '';

// ⚠️ مقفول افتراضيًا — لازم يفضل متطابق مع `class="flt-body collapsed"` في
//    الـ HTML، وإلا أول ضغطة على الهيدر مابتعملش حاجة ظاهرة.
let qFltOpen = false;
function qToggleFilters() {
  qFltOpen = !qFltOpen;
  document.getElementById('qFltBody').classList.toggle('collapsed', !qFltOpen);
  document.getElementById('qFltToggleIcon').classList.toggle('open', qFltOpen);
}
let qTblOpen = true;
function qToggleTable() {
  qTblOpen = !qTblOpen;
  document.getElementById('qTblBodyWrap').classList.toggle('collapsed', !qTblOpen);
  document.getElementById('qTblToggleIcon').classList.toggle('open', qTblOpen);
}

function qAnyFilterActive() {
  return msAnyActive('q') || qSearchTerm.trim().length > 0 || qDateFilterActive;
}
function qUpdateFilterIconState() {
  const active = qAnyFilterActive();
  document.getElementById('qFltIcon').classList.toggle('active', active);
  document.getElementById('qClearAllBtn').classList.toggle('inactive', !active);
}

// ── غلاف نطاق `q` فوق المكوّن ────────────────────────────────
function qBuildMsRow()  { msBuildRow('q'); }
// ⚠️ **وفلاتر الجرد بتتبني من نفس الطابور** — بنودها مستقلة عن اختيار
//    تاب «الأوردرات»، بس مصدر القيم واحد. و`MS.aud` موجود في صفحة
//    «الجاهز للشحن» بس، فالسطر ده بيتخطّى لوحده في صفحة المشحون.
function qSyncMsItems() {
  msSyncItems('q', qState.rows);
  if (MS.aud) { msSyncItems('aud', qState.rows); audRender(); }
}

// ── البحث ─────────────────────────────────────────────────────// ── البحث ─────────────────────────────────────────────────────
let qSearchTimer = null;
function qOnSearchInput(el) {
  el.classList.toggle('has-value', el.value.trim().length > 0);
  clearTimeout(qSearchTimer);
  qSearchTimer = setTimeout(() => { qSearchTerm = el.value; qRender(); }, 300);
}

// ── التاريخ — 🔴 بلا فترة افتراضية (§5) ───────────────────────
function qTogglePresetMenu(e) {
  e.stopPropagation();
  document.getElementById('qRangePresetMenu').classList.toggle('open');
}
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('qRangePresetWrap');
  if (wrap && !wrap.contains(e.target)) document.getElementById('qRangePresetMenu').classList.remove('open');
});
const Q_PRESET_LABELS = { today:'اليوم', yesterday:'أمس', last7:'آخر 7 أيام', last30:'آخر 30 يوم', thisMonth:'الشهر الحالي' };
// 🔴 **اليوم بتوقيت القاهرة مش بتوقيت الجهاز** — `cairoDayStr` هي نفس
//    الدالة اللي العمود بيتقارن بيها تحت، ولابتوب بتوقيت غلط كان هيفلتر
//    على يوم تاني **في صمت**.
function qPresetRange(preset) {
  const now = new Date();
  const day = (d) => cairoDayStr(d.toISOString());
  const from = new Date(now), to = new Date(now);
  if      (preset === 'yesterday') { from.setDate(now.getDate() - 1); to.setDate(now.getDate() - 1); }
  else if (preset === 'last7')     { from.setDate(now.getDate() - 6); }
  else if (preset === 'last30')    { from.setDate(now.getDate() - 29); }
  else if (preset === 'thisMonth') { return { from: day(to).slice(0, 8) + '01', to: day(to) }; }
  return { from: day(from), to: day(to) };
}
function qApplyPreset(preset) {
  qActivePreset = preset;
  const r = qPresetRange(preset);
  qDateFrom = r.from; qDateTo = r.to;
  qDateFilterActive = true;   // أي فترة يختارها الموظف — حتى «اليوم» — فلتر مفعّل
  const fEl = document.getElementById('qDateFrom'), tEl = document.getElementById('qDateTo');
  fEl.value = r.from; fEl.classList.remove('empty');
  tEl.value = r.to;   tEl.classList.remove('empty');
  document.getElementById('qRangePresetLabel').textContent = `⚡ ${Q_PRESET_LABELS[preset]}`;
  document.getElementById('qRangePresetBtn').classList.add('has-preset');
  document.querySelectorAll('#qRangePresetMenu .range-preset-item')
    .forEach(el => el.classList.toggle('active', el.dataset.preset === preset));
  document.getElementById('qRangePresetMenu').classList.remove('open');
  qRender();
}
function qOnDateInputChange(el) {
  el.classList.toggle('empty', !el.value);
  qActivePreset = '';
  qDateFrom = document.getElementById('qDateFrom').value || null;
  qDateTo   = document.getElementById('qDateTo').value   || null;
  qDateFilterActive = !!(qDateFrom || qDateTo);
  document.getElementById('qRangePresetLabel').textContent = '⚡ اختار فترة';
  document.getElementById('qRangePresetBtn').classList.toggle('has-preset', qDateFilterActive);
  document.querySelectorAll('#qRangePresetMenu .range-preset-item').forEach(x => x.classList.remove('active'));
  qRender();
}
function qResetDateFilter() {
  qActivePreset = ''; qDateFrom = null; qDateTo = null; qDateFilterActive = false;
  ['qDateFrom', 'qDateTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.add('empty'); }
  });
  const lbl = document.getElementById('qRangePresetLabel');
  if (lbl) lbl.textContent = '⚡ اختار فترة';
  const btn = document.getElementById('qRangePresetBtn');
  if (btn) btn.classList.remove('has-preset');
  document.querySelectorAll('#qRangePresetMenu .range-preset-item').forEach(el => el.classList.remove('active'));
}
function qClearRangePreset() {
  qResetDateFilter();
  document.getElementById('qRangePresetMenu').classList.remove('open');
  qRender();
}
function qClearAllFilters() {
  msClearAll('q');
  const si = document.getElementById('qSearch');
  si.value = ''; si.classList.remove('has-value'); qSearchTerm = '';
  qResetDateFilter();
  qRender();
}

// ══════════════════════════════════════════════════════════════
// §SORT — 🔴 **مستقل تمامًا عن الفلاتر** (§8)
// ══════════════════════════════════════════════════════════════
//
// الفلاتر بتحدد **مين** يظهر، والترتيب بيحدد **بأي شكل** يتعرض. الترتيب
// بيشتغل سواء فيه فلتر ولا لأ، وبيفضل شغّال بعد «مسح كل الفلاتر».
//
// ⚠️ **مفاتيح `data-q-sort` في الـ HTML لازم تطابق المفاتيح دي بالحرف** —
//    مفتاح مش في القايمة بيرجع للافتراضي **في صمت**، فالعمود يبان إنه
//    اترتّب وهو مااترتّبش.
const Q_SORT_CONFIG = {
  orderName:{ type:'string' }, customer:{ type:'string' }, address:{ type:'string' },
  note:{ type:'string' },      courier:{ type:'string' },     whereabouts:{ type:'string' },
  tracking:{ type:'string' },
  createdAt:{ type:'date' },   packedAt:{ type:'date' },
  machineLabel:{ type:'string' }, flagCount:{ type:'number' },
};
let qSortState = { key: null, dir: null };

// 🔴 دورة تلات حالات: تصاعدي ▲ → تنازلي ▼ → **بلا ترتيب**.
//    والتالتة بترجّع للترتيب الافتراضي (الأقدم فوق) مش لترتيب الـ Worker.
function qToggleSort(key) {
  if (qSortState.key !== key)        { qSortState.key = key; qSortState.dir = 'asc'; }
  else if (qSortState.dir === 'asc') { qSortState.dir = 'desc'; }
  else                               { qSortState.key = null; qSortState.dir = null; }
  qUpdateSortHeaderUI();
  qRender();
}
function qUpdateSortHeaderUI() {
  document.querySelectorAll('#qTable .sort-icon').forEach(el => {
    const on = qSortState.key === el.dataset.qSort;
    el.textContent = on ? (qSortState.dir === 'asc' ? '▲' : '▼') : '';
    el.classList.toggle('active', on);
  });
  document.querySelectorAll('#qTable .sortable-th').forEach(th => {
    th.classList.toggle('sorted', th.dataset.qSort === qSortState.key);
  });
}
// ⚠️ قيمة الترتيب بتتاخد من **الصف المشتق** (`machineLabel` · `whereabouts` ·
//    `tracking` · `address`) — يعني بيانات ماكينة الصف نفسه، مش حقل S1 خام.
function qSortValue(o, key) {
  if (key === 'address')   return [o.address1, o.address2].filter(Boolean).join(' ');
  if (key === 'flagCount') return o.flags.length;
  return o[key];
}
// 🔴 `[...rows].sort()` مش `rows.sort()` — التانية بتعدّل المصفوفة الأصلية،
//    فحالة «بلا ترتيب» ماكانتش هترجع للترتيب الافتراضي أبدًا.
function qApplySort(rows) {
  if (!qSortState.key) return rows;   // الافتراضي: الأقدم فوق — من `dcoQueueRows`
  const cfg = Q_SORT_CONFIG[qSortState.key];
  const dir = qSortState.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = qSortValue(a, qSortState.key), bv = qSortValue(b, qSortState.key);
    if (cfg.type === 'date') {
      // ⚠️ الصف اللي مالوش تاريخ بيروح **الآخر في الاتجاهين** — `-Infinity`
      //    كان بيحطّه فوق في التصاعدي وكأنه أقدم صف في الطابور.
      const at = av ? Date.parse(av) : NaN, bt = bv ? Date.parse(bv) : NaN;
      if (isNaN(at) && isNaN(bt)) return 0;
      if (isNaN(at)) return 1;
      if (isNaN(bt)) return -1;
      return (at - bt) * dir;
    }
    if (cfg.type === 'number') return ((av ?? 0) - (bv ?? 0)) * dir;
    return String(av ?? '').localeCompare(String(bv ?? ''), 'ar') * dir;
  });
}

// ─── الرسم ───
function qSetFresh() {
  const info  = agoInfo(qState.at, Date.now());
  const agoEl = document.getElementById('qAgo');
  const btn   = document.getElementById('qBtn');
  if (agoEl) { agoEl.className = 'dco-ago ' + info.cls; agoEl.textContent = info.text; }
  if (btn)   btn.classList.toggle('is-stale', info.stale);
  const stamp = document.getElementById('qStamp');
  if (stamp) {
    stamp.innerHTML = qState.at
      ? `<span class="dco-stamp-chip">${esc(formatDate(qState.at.toISOString()))}</span>` +
        `<span class="dco-stamp-chip">${esc(formatTimeOnly(qState.at.toISOString()))}</span>`
      : '<span class="dco-stamp-chip">—</span>';
  }
}

// 🔴 **المربعات بتعدّ من `qState.rows` الكاملة** — مش من المعروض.
//    العدّ على المفلتر كان هيصفّر باقي المربعات بعد أول ضغطة، فالموظف
//    مايقدرش يرجع منها.
function qRenderChips() {
  const box = document.getElementById('qChips');
  if (!box) return;
  const chips = dcoChips(qState.rows);
  box.innerHTML = chips.map(ch => {
    const key = ch.cls === 'qc-flag' ? 'flag'
      : (DCO_COURIER_GROUPS.find(g => g.cls === ch.cls)?.key || '');
    const on = qChipActive(key);
    // ⚠️ علامة ✕ بتتحط من CSS (`.zchip.on::after`) مش من هنا — زي
    //    `pack.html` بالحرف. عنصر زيادة في الماركب كان بيدخل في
    //    `innerText` وبيكسر البنود اللي بتقرا العدّ من نص المربع.
    return `<button type="button" class="zchip ${esc(ch.cls)}${on ? ' on' : ''}" data-fk="${esc(key)}"`
         + ` aria-pressed="${on ? 'true' : 'false'}"><span>${esc(ch.label)}</span>`
         + `<span class="zchip-n">${ch.n}</span></button>`;
  }).join('');
__WA_CHIPS_CALL__
  // ⚠️ الفلوس **بتتحسب على المعروض**، مش على القايمة الكاملة — الموظف
  //    اللي فلتر على «بوسطة» عايز يعرف بوسطة عليها كام، مش المتجر كله.
  //    والفرق ده لازم يبان، فالليبل بيقول «(مفلتر)» لما الفلتر شغّال.
  const shown = qVisible();
  const cod = dcoCod(shown);
  const filtered = qAnyFilterActive() ? ' <span style="opacity:.7">(مفلتر)</span>' : '';
  const parts = [`<span class="dco-money${cod.due ? '' : ' is-zero'}">💰 مستحق التحصيل <b>${esc(dcoMoney(cod.due, cod.currency))}</b>`
               + ` <span style="opacity:.7">(${cod.dueCount} أوردر)</span>${filtered}</span>`];
  if (cod.prepaidCount) parts.push(`<span class="fchip" style="cursor:default">مدفوع مقدمًا <b>${cod.prepaidCount}</b></span>`);
  if (cod.unknownCount) parts.push(`<span class="fchip qc-flag" style="cursor:default">حالة مالية مش معروفة <b>${cod.unknownCount}</b></span>`);
  document.getElementById('qMoney').innerHTML = parts.join('');
}

// ── اللي بيتعرض فعلاً بعد كل الفلاتر ──────────────────────────
//
// ⚠️ **مصدر واحد للفلترة** — العرض و«النتائج» وحساب الفلوس التلاتة بيعدّوا
//    من هنا. تعريف تاني معناه رقم على الشاشة مايطابقش الجدول تحته.
// 🔴 **والبحث بيشيل `#`** — الموظف بيكتب `55001` والباركود بيدّي `#55001`،
//    والمطابقة الحرفية كانت بترجّع صفر نتايج على أوردر قدامه في الجدول.
function qVisible() {
  const term = qSearchTerm.trim().toLowerCase().replace(/^#/, '');
  return qState.rows.filter(o => {
    for (const f of Q_FILTERS) {
      const sel = qMsState[f.key].selected;
      if (sel.size && !sel.has(String(f.of(o)))) return false;
    }
    // 🔴 المقارنة على **يوم القاهرة** — `createdAt` بتوقيت UTC، ويوم
    //    القاهرة بيبدأ `D-1T21:00Z`/`22:00Z`. المقارنة على أول ١٠ حروف من
    //    الـ ISO كانت هتحطّ أوردر الساعة ١١ بالليل في اليوم اللي بعده.
    if (qDateFrom || qDateTo) {
      const d = o.createdAt ? cairoDayStr(o.createdAt) : null;
      if (!d) return false;
      if (qDateFrom && d < qDateFrom) return false;
      if (qDateTo   && d > qDateTo)   return false;
    }
    if (!term) return true;
    return String(o.orderName || '').toLowerCase().replace(/^#/, '').includes(term)
        || String(o.customer  || '').toLowerCase().includes(term)
        || [o.address1, o.address2].filter(Boolean).join(' ').toLowerCase().includes(term)
        // ⚠️ **والملحوظة داخلة في البحث** — عمود معروض ومش قابل للبحث
        //    بيخلّي الموظف يقرا الطابور بعينه صف صف عشان يلاقي «تأجيل».
        || String(o.note || '').toLowerCase().includes(term);
  });
}

// المربع مولّع لما **كل** قيم مجموعته مختارة — نفس منطق `pack.html`.
function qChipValues(key) {
  if (key === 'flag') return ['محتاجة مراجعة'];
  const g = DCO_COURIER_GROUPS.find(x => x.key === key);
  if (!g) return [];
  return qMsState.courier.items.map(i => i.value)
    .filter(v => dcoCourierGroup(v === '— بلا مندوب' ? null : v) === key);
}
function qChipFilterKey(key) { return key === 'flag' ? 'flag' : 'courier'; }
function qChipActive(key) {
  const vals = qChipValues(key);
  const sel  = qMsState[qChipFilterKey(key)].selected;
  return vals.length > 0 && vals.every(v => sel.has(v));
}
// 🔴 **المربع بيكتب في الفلتر — مش حالة تانية جنبه.** حالتان منفصلتان
//    (مربع أحادي فوق + فلتر متعدد تحت) كانوا هيفترقوا: الموظف يفلتر من
//    تحت والمربع فوق يفضل مطفي، فيدوس عليه فيدهس فلتره من غير ما يقصد.
function qChipClick(key) {
  const vals = qChipValues(key);
  if (!vals.length) return;
  const sel = qMsState[qChipFilterKey(key)].selected;
  const on  = vals.every(v => sel.has(v));
  vals.forEach(v => on ? sel.delete(v) : sel.add(v));
  msRenderList('q', qChipFilterKey(key)); msRenderChips('q'); qRender();
}

// ⚠️ **`financeCell` اتشالت** مع عمود «الإجمالي» (طلب أحمد 16-09-2026) —
//    دالة بلا مستهلك = كود ميت، مش «احتياط».
//    🔴 **والفلوس ما ضاعتش**: «مستحق التحصيل» فوق الطابور لسه بيتحسب من
//       `dcoCod` على **نفس** `o.total`/`o.financial`، وبيقول المدفوع
//       مقدمًا والحالة المالية المجهولة بعددهم. اللي اتشال هو **العمود**
//       — الرقم اللي المحطة بتشتغل عليه لسه معروض.
__ADDR_FN__
__NOTE_FN__
__EXTRA_FN__
__WA_CHIPS_JS__
function qRender() {
  const rows  = qApplySort(qVisible());
  const tbody = document.getElementById('qBody');
  const wrap  = document.getElementById('qTableWrap');
  const empty = document.getElementById('qEmpty');
  if (!tbody) return;

  // 🔴 **حالة الرقم الكبير تتحسب هنا لوحدها.** الفرع ده كان مكتوب جوّه
  //    `catch` بتاع `qLoad`، و`qRender()` اللي في `finally` كانت **بتدهسه
  //    بعده بجزء من الثانية** — فالفشل كان بيتحوّل لـ«—» في صمت.
  //    اتمسك في `docs/queues-check.mjs` (بند «الرقم تعذّر مش 0»)، **مش**
  //    في مراجعة كود: الشاشة كانت بتفتح والكونسول نضيف.
  //    ⚠️ والتلات حالات مختلفة فعلاً: «ما اتحدّثش» (—) · «اتحدّث» (رقم) ·
  //       **«حاولنا وما عرفناش»** (تعذّر). دمج التالتة في الأولى بيخلّي
  //       الفشل يبان زي أول تحميل.
  const cEl = document.getElementById('qCount');
  const total = qState.at ? String(qState.rows.length) : (qState.failed ? 'تعذّر' : '—');
  cEl.textContent = total;
  cEl.classList.toggle('pending', !qState.at && !qState.failed);
  cEl.classList.toggle('failed',  !qState.at && qState.failed);
  // ⚠️ بادج الزرار **مايقولش «تعذّر»** — رقم على زرار بيتقرا وعد بشغل،
  //    و«تعذّر» على بادج صغير بتتقص. الرقم الكبير هو اللي بيحمل الحالة.
  document.getElementById('qBadge').textContent = qState.at ? String(qState.rows.length) : '—';

  // 🔴 **«النتائج» = عدد المعروض بعد الفلتر** (§7) — والرقم الكبير فوق
  //    = عدد الطابور كله. الاتنين على الشاشة عن قصد: ده بيقول «انت شايف
  //    كام» وده بيقول «الطابور فيه كام»، والفرق بينهم هو أثر الفلتر.
  //    ⚠️ وقبل أول جلب ناجح بيقول `—` زي الرقم الكبير — صفر بيتقري
  //       «مفيش شغل» وإحنا لسه ماجبناش حاجة.
  document.getElementById('qFilteredCount').textContent =
    qState.at ? rows.length.toLocaleString('en-US') : '—';
  qUpdateFilterIconState();

  qRenderChips();

  if (!rows.length) {
    wrap.style.display  = 'none';
    empty.style.display = '';
    empty.innerHTML = !qState.at
      ? (qState.failed ? '<div class="ico">⚠️</div><div>تعذّر تحميل الطابور — اضغط «تحديث»</div>'
                       : '<div class="ico">⏳</div><div>جاري تحميل الطابور…</div>')
      : (qState.rows.length
          ? '<div class="ico">🔎</div><div>مفيش صفوف مطابقة للفلتر — امسح الفلتر أو البحث</div>'
          : '<div class="ico">✅</div><div>__EMPTY_OK__</div>');
    return;
  }

  empty.style.display = 'none';
  wrap.style.display  = '';
  const now = new Date();
  tbody.innerHTML = rows.map((o, i) => {
    const isS2  = o.machine === 's2';
    // 🔴 **الصف اللي ما اتغلّفش مالوش بادج خالص** (طلب أحمد 16-09-2026) —
    //    الخلية بتقول `—` وبس. البادج القديم («— ما اتغلّفش») كان **بادج
    //    محايد بيقول نفس اللي التاريخ الفاضي جنبه بيقوله**، وبادج بلا
    //    درجة وسط عمود كله بادجات ملوّنة بيسحب العين لأقل صف أهمية.
    //    ⚠️ والمعلومة ما ضاعتش: الخلية كلها بقت `—`.
    const since = o.packedAt ? dcoWaiting(o.packedAt, now) : null;
    // ⚠️ **اسم المندوب زي ما هو من غير سطر المجموعة تحته** (طلب أحمد
    //    16-09-2026). المجموعة (بوسطة/شو روم/مناديب) بقت معروضة في
    //    **مربعات الفلتر فوق الطابور** بعددها، وتكرارها تحت كل اسم كان
    //    بيطوّل الصف من غير ما يضيف حاجة الموظف بيتصرّف عليها.
    //    ⚠️ و`courierGroup` **لسه بيتحسب** في الـ shell — المربعات بتعدّ
    //       منه والفلتر بيشتغل بيه؛ اللي اتشال هو **عرضه في الخلية** بس.
    return `<tr class="${o.flags.length ? 'flagged' : ''}">
      <td>${orderLink(o.orderName, o.orderId)}</td>
      <td class="cust-cell">${esc(o.customer || '—')}</td>
__ADDR_CELL____NOTE_CELL__      <td>${esc(o.courier || '—')}</td>
__EXTRA_CELL__      <td class="date-cell"><span class="cell-date">${esc(formatDate(o.createdAt))}</span><span class="time-badge age-badge ${o.age.cls}" data-q-age="${esc(o.createdAt || '')}">${esc(o.age.text)}</span></td>
      <td class="date-cell">${since
            ? `<span class="cell-date">${esc(formatDate(o.packedAt))}</span><span class="time-badge ${since.cls}" data-q-pack="${esc(o.packedAt)}">${esc(since.text)}</span>`
            : '<span class="flag-ok">—</span>'}</td>
      <td><span class="type-text ${isS2 ? 'type-s2' : 'type-s1'}">${esc(isS2 ? 'استبدال/استرجاع' : 'عادي')}</span></td>
      <td>${o.flags.length
            ? `<button type="button" class="flag-btn" data-flag-idx="${i}">⚠️ ${o.flags.length}</button>`
            : '<span class="flag-ok">—</span>'}</td>
    </tr>`;
  }).join('');

  // ⚠️ **التفويض بدل `onclick` بنص** — اسم الأوردر وسبب العلامة بيتحطّوا
  //    في نص HTML، و`onclick="showFlags('...')"` كان بيسرّب أي علامة
  //    تنصيص فيهم. والصف بيتربط بـ**فهرس المعروض** مش بالاسم.
  tbody.querySelectorAll('[data-flag-idx]').forEach(btn => {
    btn.addEventListener('click', () => showFlags(rows[Number(btn.dataset.flagIdx)]));
  });
}

// ─── نافذة العلامات ───
// 🔴 كل علامة بتقول **تلات حاجات**: إيه اللي حصل · القيمة الغلط بالحرف ·
//    الفعل المطلوب. بند مراجعة بيقول «فيه مشكلة» وبس تكلفته فحص يدوي لكل
//    صف على شوبيفاي (`ecommoda-order-lifecycle` قاعدة ١٤).
function showFlags(o) {
  if (!o) return;
  document.getElementById('flagsTitle').textContent = `⚠️ ${o.orderName || 'الأوردر'} — محتاج مراجعة`;
  document.getElementById('flagsBody').innerHTML = o.flags.map(f => `
    <div class="fl-item">
      <div class="fl-lbl">${esc(f.label)}</div>
      <div class="fl-det">${esc(f.detail)}</div>
      <div class="fl-act">🛠️ <b>المطلوب:</b> ${esc(f.action)}</div>
    </div>`).join('')
    + `<p style="font-size:12px;color:var(--text-secondary);line-height:1.8;margin-top:10px">
         ℹ️ الصف ده <b>لسه في الطابور وبيتعدّ في الرقم</b> — العلامة معناها «راجعه»، مش «اتشال».
       </p>`;
  document.getElementById('flagsOverlay').classList.add('open');
}
function closeFlags() { document.getElementById('flagsOverlay').classList.remove('open'); }

// ─── الجلب ───
// ⚠️ `loading` بيمنع نداءين متوازيين (ضغطة + نبضة)، و`dirty` مابيتصفّرش
//    غير بعد جلب ناجح — لو الجلب فشل، أول رجوع تاني للتاب بيحاول.
async function qLoad(silent) {
  if (qState.loading) return;
  qState.loading = true;
  const btn = document.getElementById('qBtn');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  try {
    const data = await apiGet('__ACTION__');
    // 🔴 **المصدر الوحيد للاشتقاق** — الـ shell، مش الصفحة.
    qState.rows      = dcoQueueRows(data.orders || [], Q_STATUS, Q_KIND);
    qState.at        = new Date();
    qState.dirty     = false;
    qState.failed    = false;
    qState.truncated = !!data.truncated;
    cacheSet(__CACHE__, data);
    // 🔴 **بنود الفلاتر بتتبني من الطابور الجديد بعد كل جلب** — بناؤها مرة
    //    واحدة عند التحميل كان هيخلّي مندوب جديد يدخل الطابور **ومايظهرش
    //    في الفلتر أبدًا**، ومفيش أي خطأ يقول كده.
    qSyncMsItems();
    document.getElementById('qFail').style.display = 'none';

    // ⚠️ الاقتطاع بانر **منفصل** عن بانر الفشل — «الطابور أطول من اللي
    //    بيتعرض» حاجة تانية خالص عن «الطابور ما اتجابش»، والخلط بينهم
    //    بيخلّي الموظف يفتكر إن القايمة كاملة.
    const trunc = document.getElementById('qTrunc');
    trunc.style.display = qState.truncated ? '' : 'none';
    if (qState.truncated) trunc.textContent =
      '⚠️ الطابور أطول من الحد المعروض — فيه أوردرات مش ظاهرة في القايمة دي. الرقم فوق بيعدّ المعروض بس.';
  } catch (err) {
    // 🔴 **الفشل بيتقال، والرقم القديم بيفضل معروض لو كان فيه واحد.**
    //    و«تعذّر» بتتعرض بس لو مافيش أي جلب ناجح قبل كده.
    qState.failed = true;
    const fail = document.getElementById('qFail');
    fail.style.display = '';
    fail.textContent = `⚠️ تعذّر تحميل الطابور — ${err.message}`;
    // ⚠️ **الرقم مابيتكتبش هنا** — `qRender()` في الـ `finally` هي اللي
    //    بتحسب حالته من `qState.failed`. كتابته هنا كانت بتتدهس بعدها
    //    على طول (الباج اللي فحص المتصفح مسكه).
    if (!silent) showToast(err.message, 'error', 6000);
  } finally {
    qState.loading = false;
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    qRender();
    qSetFresh();
    qArmAuto();
  }
}

// التسليح **بعد كل جلب** — «١٥ دقيقة من آخر تحديث فعلي» مش من فتح الصفحة
function qArmAuto() {
  if (qState.timer) clearTimeout(qState.timer);
  qState.timer = setTimeout(() => {
    if (document.hidden) { qState.dirty = true; return; }   // مخفي = صفر استعلام
    qLoad(true);
  }, Q_AUTO_REFRESH_MS);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && qState.dirty) qLoad(true);
});

// ─── الفلتر والبحث ───
// ⚠️ الفلتر **أحادي**: ضغطة على مربع تانية بتبدّل، وضغطة على نفس المربع
//    بترجّع الكل. فلتر مركّب على مربعات متلاصقة بيخلّي الموظف مش عارف
//    هو شايف إيه بالظبط.
document.getElementById('qChips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fk]');
  if (!btn) return;
  qChipClick(btn.dataset.fk);
});
document.getElementById('qSearch').addEventListener('input', (e) => {
  qState.search = e.target.value || '';
  qRender();
});

// ─── النبضة — عرض بحت، **صفر نداء شبكة** ───
// ⚠️ إعادة رسم الجدول كل نص دقيقة كانت هتصفّر التمرير تحت إيد الموظف،
//    فالبادجات بتتحدّث **في مكانها** بالـ ISO المخزّن على الخلية نفسها
//    (مش بترتيب الصفوف — الترتيب بيتغيّر مع الفلتر).
setInterval(() => {
  qSetFresh();
  const now = new Date();
  document.querySelectorAll('#qBody [data-q-age]').forEach(el => {
    const iso = el.dataset.qAge;
    if (!iso) return;
    const age = dcoOrderAge(iso, now);
    el.className = `time-badge age-badge ${age.cls}`;
    el.textContent = age.text;
  });
  document.querySelectorAll('#qBody [data-q-pack]').forEach(el => {
    const iso = el.dataset.qPack;
    if (!iso) return;
    const s = dcoWaiting(iso, now);
    el.className = `time-badge ${s.cls}`;
    el.textContent = s.text;
  });
}, Q_TICK_MS);

// ⚠️ مكرّرة في التلات صفحات عن قصد — فحص Step 9 بيطلب وجود الاسمين في كل
//    صفحة، والقايمة (`PAGE_WORKERS`) بتفرق من صفحة للتانية.
async function renderAboutWorkers() {
  const box = document.getElementById('aboutWorkers');
  if (!box) return;
  const rows = await Promise.all(PAGE_WORKERS.map(async k => {
    const w = DCO_WORKERS[k];
    let got = '—', mark = '⏳';
    try {
      const cfg = await dcoApi(w).apiGet('get_config');
      got = cfg.version || cfg.WORKER_VERSION || '—';
      mark = cmpVersion(got, w.min) < 0 ? '⚠️' : '✅';
    } catch { mark = '❌'; got = 'تعذّر الوصول'; }
    return `<tr><td>${mark} ${esc(w.label)}</td><td><code>${esc(got)}</code></td><td><code>${esc(w.min)}</code></td></tr>`;
  }));
  box.innerHTML =
    `<table><tr><th>الأداة</th><th>نسخة الـ Worker</th><th>الحد الأدنى</th></tr>${rows.join('')}</table>
     <p>نسخة الواجهة (الهب كله): <code>${esc(TOOL_VERSION)}</code></p>`;
}

__AUDIT_JS__
// ══════════════════════════════════════════════════════════════
// §INIT — التحميل (الجلسة اتأكدت فوق)
// ══════════════════════════════════════════════════════════════
document.getElementById('headerMount').innerHTML = dcoHeader({
  icon: '__ICON__', title: '__TITLE__', subtitle: '__SUBTITLE__', session,
});
renderVersionUI();                 // بعد ما الهيدر يتحقن — زرار النسخة جوّاه
checkWorkerVersion(PAGE_WORKERS);  // حارس نسخة الـ Worker (حد أدنى، مش تطابق)
renderAboutWorkers();

// ⚠️ **الكاش بيترسم قبل الجلب** — الشاشة الفاضية أسوأ من شاشة قديمة
//    **مختومة بوقتها**. والختم بيقول عمرها الحقيقي، فالموظف عارف إنها قديمة.
(function drawFromCache() {
  const c = cacheGet(__CACHE__);
  if (!c || !c.data || !Array.isArray(c.data.orders)) return;
  qState.rows      = dcoQueueRows(c.data.orders, Q_STATUS, Q_KIND);
  qState.at        = new Date(c.at);
  qState.truncated = !!c.data.truncated;
  qRender();
  qSetFresh();
})();

// ⚠️ **الترتيب مهم:** صف الفلاتر لازم يتبني **قبل** أول `qLoad` — دوال
//    الفلتر بتكتب في عناصر جوّاه، ولو اتنادت قبل ما تتخلق بتقع بصمت
//    (`getElementById` بترجّع `null` والدالة بتخرج من غير ما تعمل حاجة).
qBuildMsRow();
qUpdateSortHeaderUI();
qLoad(true);
</script>
</body>
</html>
'''

for p in PAGES:
    out = TPL
    out = out.replace('__TITLE__', p['title']).replace('__SUBTITLE__', p['subtitle'])
    out = out.replace('__ICON__', p['icon'])
    out = out.replace('__EMPTY_OK__', p['emptyOk'])
    out = out.replace('__PACK_COL__', p['packCol'])
    out = out.replace('__EXTRA_HEAD__', p['extraHead'])
    out = out.replace('__EXTRA_CELL__', p['extraCell'])
    out = out.replace('__EXTRA_FN__', p['extraFn'])
    out = out.replace('__ADDR_HEAD__', p['addrHead'])
    out = out.replace('__ADDR_CELL__', p['addrCell'])
    out = out.replace('__ADDR_FN__', p['addrFn'])
    out = out.replace('__NOTE_HEAD__', p['noteHead'])
    out = out.replace('__NOTE_CELL__', p['noteCell'])
    out = out.replace('__NOTE_FN__', p['noteFn'])
    out = out.replace('__EXTRA_FILTER__', p['extraFilter'])
    out = out.replace('__WA_CHIPS__',      p['waChipsBox'])
    out = out.replace('__WA_CHIPS_CALL__', p['waChipsCall'])
    out = out.replace('__WA_CHIPS_JS__',   p['waChipsJs'])
    out = out.replace('__ABOUT_COLS__', p['aboutCols'])
    out = out.replace('__STATUS__', p['status']).replace('__KEY__', p['key'])
    out = out.replace('__ACTION__', p['action']).replace('__WORKER__', p['worker'])
    out = out.replace('__CACHE__', p['cache'])
    out = out.replace('__ABOUT_WHAT__', p['aboutWhat'])
    out = out.replace('__AUDIT_CSS__',   p['auditCss'])
    out = out.replace('__AUDIT_TABS__',  p['auditTabs'])
    out = out.replace('__AUDIT_LIB__',   p['auditLib'])
    out = out.replace('__AUDIT_VIEW__',  p['auditView'])
    out = out.replace('__AUDIT_JS__',    p['auditJs'])
    out = out.replace('__AUDIT_ABOUT__', p['auditAbout'])
    out = out.replace('__API_FNS__',     p['apiFns'])
    out = out.replace('__CL_ITEMS__',    p['clItems'])
    assert '__' not in out.replace('__', '', 0) or True
    # 🔴 الحارس ده بيمسك **معامل اتضاف في المولّد وما اتسبدلش** — القالب
    #    بيتكتب في الحالة دي بنص `__ADDR_CELL__` حرفي جوّه الصفحة، وهي
    #    بتفتح عادي والكونسول نضيف.
    left = [t for t in ['__TITLE__','__ICON__','__ACTION__','__CACHE__','__EXTRA_CELL__',
                        '__EXTRA_FN__','__ADDR_HEAD__','__ADDR_CELL__','__ADDR_FN__',
                        '__NOTE_HEAD__','__NOTE_CELL__','__NOTE_FN__',
                        '__ABOUT_COLS__','__EXTRA_FILTER__','__AUDIT_CSS__','__AUDIT_TABS__',
                        '__WA_CHIPS__','__WA_CHIPS_CALL__','__WA_CHIPS_JS__',
                        '__AUDIT_LIB__','__AUDIT_VIEW__','__AUDIT_JS__','__AUDIT_ABOUT__',
                        '__API_FNS__','__CL_ITEMS__'] if t in out]
    assert not left, f"unreplaced {left}"
    out_path = os.path.join(REPO, p['file'])
    open(out_path, 'w').write(out)
    print('wrote', out_path, len(out.splitlines()), 'lines')
