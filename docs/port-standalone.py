#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
════════════════════════════════════════════════════════════════════
 docs/port-standalone.py — مولّد صفحتَي الأداتين المدموجتين (v1.5.0)

 🔴 **ليه السكربت ده موجود أصلاً.**
    أحمد قرر (16-09-2026) إن الروابط القديمة للأداتين **تفضل شغّالة زي ما
    هي** في ريبوهاتها. يعني فيه **نسختين من كل واجهة** على الهوا: الأصلية
    في ريبوها، والمدموجة هنا. ودي بالظبط عيلة درس R1 — «اتصلحت في واحدة
    وفضلت مكسورة في التانية لشهور».
    ✅ **اللي بيقلّل الخطر:** النسخة اللي هنا **متولّدة** من الأصلية مش
       متكتوبة بالإيد. التعديل بيتعمل في الريبو الأصلي، وبعدين السكربت ده
       بيتشغّل فيولّد نسخة الهب من جديد.
    ⛔ **وممنوع تعديل `order-status.html` أو `cod-payment.html` بالإيد** —
       التعديل بيضيع في صمت مع أول تشغيل، وفيه بانر في أول كل ملف بيقول كده.

 🔴 **وكل تحويل هنا مربوط بـ«مرساة» نصّية، والمرساة الغايبة بتوقّف
    السكربت بصوت عالي.** ده مقصود: لو تعديل في الريبو الأصلي حرّك أي كتلة،
    السكربت **بيقف** بدل ما يولّد صفحة ناقصها الجزء ده — صفحة بشاشة دخول
    متشالة نص شيلة أسوأ من سكربت واقف.

 التشغيل — لازم الريبوهات التلاتة تكون جنب بعض:

     ~/Order-Status-Updater/
     ~/COD-Payment-Center/
     ~/Delivery-COD-Operations-Center/     ← من هنا

     python3 docs/port-standalone.py
     node docs/tools-check.mjs
════════════════════════════════════════════════════════════════════
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
HUB  = os.path.dirname(HERE)
SIBL = os.path.dirname(HUB)


# ══════════════════════════════════════════════════════════════
# أدوات التحويل — كل واحدة بترمي لو المرساة مش موجودة أو متكررة
# ══════════════════════════════════════════════════════════════
class Port:
    def __init__(self, name, text):
        self.name = name
        self.s    = text
        self.log  = []

    def _need(self, anchor, what):
        n = self.s.count(anchor)
        if n != 1:
            raise SystemExit(
                f"\n🔴 [{self.name}] {what}\n"
                f"   المرساة اتلاقت {n} مرة (المفروض مرة واحدة):\n"
                f"   ---\n   {anchor[:200]}\n   ---\n"
                f"   ⚠️ يعني الريبو الأصلي اتعدّل وحرّك الكتلة دي. "
                f"عدّل المرساة هنا بعد ما تتأكد إن الكتلة لسه هي هي.\n")

    def sub(self, old, new, what):
        """استبدال نص بنص — مرة واحدة بالظبط."""
        self._need(old, what)
        self.s = self.s.replace(old, new, 1)
        self.log.append(f"↻ {what}")
        return self

    def cut(self, start, end, what):
        """شيل من `start` (مشمول) لحد `end` (مش مشمول)."""
        self._need(start, what + ' — بداية')
        self._need(end,   what + ' — نهاية')
        i = self.s.index(start)
        j = self.s.index(end)
        if j <= i:
            raise SystemExit(f"\n🔴 [{self.name}] {what}: النهاية قبل البداية — الترتيب اتغيّر في المصدر.\n")
        removed = self.s[i:j].count('\n')
        self.s = self.s[:i] + self.s[j:]
        self.log.append(f"✂ {what} ({removed} سطر)")
        return self

    def swap(self, start, end, new, what):
        """شيل من `start` (مشمول) لحد `end` (مش مشمول) وحط `new` مكانهم."""
        self._need(start, what + ' — بداية')
        self._need(end,   what + ' — نهاية')
        i = self.s.index(start)
        j = self.s.index(end)
        if j <= i:
            raise SystemExit(f"\n🔴 [{self.name}] {what}: النهاية قبل البداية — الترتيب اتغيّر في المصدر.\n")
        removed = self.s[i:j].count('\n')
        self.s = self.s[:i] + new + self.s[j:]
        self.log.append(f"⇄ {what} ({removed} سطر اتشالوا)")
        return self

    def cut_block(self, start, end, what):
        """شيل من `start` لحد `end` **مشمولة**."""
        self._need(start, what + ' — بداية')
        self._need(end,   what + ' — نهاية')
        i = self.s.index(start)
        j = self.s.index(end, i) + len(end)
        removed = self.s[i:j].count('\n')
        self.s = self.s[:i] + self.s[j:]
        self.log.append(f"✂ {what} ({removed} سطر)")
        return self

    def forbid(self, pattern, what):
        """حارس بعدي — لازم القيمة دي تكون اختفت خالص من الناتج."""
        hits = len(re.findall(pattern, self.s))
        if hits:
            raise SystemExit(f"\n🔴 [{self.name}] {what}: لسه موجود {hits} مرة بعد التحويل.\n")
        return self

    def replace_all(self, old, new, what):
        n = self.s.count(old)
        if not n:
            raise SystemExit(f"\n🔴 [{self.name}] {what}: مفيش أي حالة من `{old}` — اتشالت من المصدر؟\n")
        self.s = self.s.replace(old, new)
        self.log.append(f"↻ {what} ({n})")
        return self

    def write(self, path):
        io.open(path, 'w', encoding='utf-8').write(self.s)
        print(f"\n✅ {os.path.basename(path)} — {len(self.s.splitlines())} سطر")
        for l in self.log:
            print("   " + l)


def read_source(rel):
    p = os.path.join(SIBL, rel)
    if not os.path.exists(p):
        raise SystemExit(
            f"\n🔴 المصدر مش موجود: {p}\n"
            f"   السكربت ده بيولّد نسخة الهب **من الريبو الأصلي**، فلازم "
            f"الريبوهات تكون جنب بعض:\n"
            f"     {SIBL}/Order-Status-Updater\n"
            f"     {SIBL}/COD-Payment-Center\n"
            f"     {SIBL}/Delivery-COD-Operations-Center\n")
    return io.open(p, encoding='utf-8').read()


# ══════════════════════════════════════════════════════════════
# البانر اللي بيتحط في أول كل ملف متولّد
# ══════════════════════════════════════════════════════════════
def banner(src_repo, worker_key, worker_repo):
    return f"""<!-- ══════════════════════════════════════════════════════════════
     🔴 **الملف ده متولّد من `docs/port-standalone.py`.**
     المصدر: ريبو `{src_repo}` → `index.html`.
     ⛔ **متعدّلش الملف ده بالإيد** — عدّل في الريبو الأصلي وشغّل المولّد:

         python3 docs/port-standalone.py && node docs/tools-check.mjs

     ⚠️ أي تعديل يدوي هنا **بيضيع في صمت** مع أول تشغيل.

     🔴 **وفيه نسختين من الواجهة دي على الهوا** (قرار أحمد 16-09-2026:
        الروابط القديمة تفضل شغّالة). النسخة دي بتاخد **الشِل من الهب**:
        دخول واحد (`dco_session`) · سر واحد (مجموعة `delivery_cod_ops`) ·
        هيدر الهب بزرار رجوع للرئيسية. والنسخة الأصلية في ريبوها لسه
        بشاشة دخولها وسرّها.
     ⚠️ **والـ Worker واحد للاتنين** (`{worker_key}` في ريبو
        `{worker_repo}`) — ما اتلمسش ولا سطر في التمريرة دي.
     ══════════════════════════════════════════════════════════════ -->
"""


# ══════════════════════════════════════════════════════════════
# ① order-status.html — من ريبو `Order-Status-Updater`
# ══════════════════════════════════════════════════════════════
def build_order_status():
    p = Port('order-status.html', read_source('Order-Status-Updater/index.html'))

    # ── الرأس — shell.css أولاً، وستايل الصفحة بعده وبيغلب ──────
    p.swap(
        '  <title>Order Status Updater — EcomModa</title>',
        '</head>\n<body>\n',
        '''  <title>تحديث حالة الأوردرات — مركز عمليات الشحن والتحصيل</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- 🔴 قاعدة الأسبقية: الـ shell أولاً، وستايل الصفحة بعده وبيغلب -->
  <link rel="stylesheet" href="shared/shell.css">

  <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js"></script>
</head>
<body>
''' + banner('Order-Status-Updater', 'order-status-updater-worker', 'Order-Status-Updater'),
        'الرأس — حقن shell.css وتغيير العنوان وبانر «الملف متولّد»')

    # ── CSS — الكتلتين اللي الـ shell بيملكهم ───────────────────
    # ⚠️ «Confirm Dialog» **بيفضل في الصفحة**: الـ shell مالوش نافذة تأكيد
    #    خالص (لا CSS ولا `showConfirm`)، والأداة دي بتستخدمها قبل كل فعل
    #    لا رجعة فيه. شيلها كان هيخلّي الزرار يشتغل **بلا أي تأكيد**.
    p.swap(
        '/* ── CSS Variables ──────────────────────────────────────────── */',
        '/* ── Confirm Dialog ────────────────────────────────────────── */',
        '''/* ══════════════════════════════════════════════════════════════
   §STYLES — الصفحة دي بس.
   🔴 **مفيش كتلة توكنز هنا — كلها في `shared/shell.css`.** الكتلة اللي
      كانت في النسخة الأصلية (٤٧ متغيّر) **اتشالت بالكامل**، وقيمها كانت
      متطابقة مع الـ shell ما عدا `--container-max` (تحت).
   ✂️ واللي اتشال كمان لأن الـ shell بيملكه: الـ reset و`body`
      و`.container` · `.app-header*` · `.hbtn` · التوست · مودال
      الإعدادات · `.main-tabs-bar`/`.tab-panel` · `.eco-overlay`/
      `.eco-modal*` · `.about-*` · `.cl-*` · `.order-link`/`.order-num`.
   ✂️ وشاشة الدخول كلها (`.login-*` · `.pin-*`) — الدخول بقى في
      `index.html` مرة واحدة للهب كله.
   ══════════════════════════════════════════════════════════════ */

/* 🔴 **الاستثناء الوحيد من «صفر توكنز في الصفحة»** — الأداة دي فيها تاب
   سجل، يعني Tier M (١٢٠٠) مش Tier L (١٤٠٠) بتاع طوابير الهب. سطر واحد
   بيغلب الـ shell، مش كتلة توكنز. */
:root { --container-max: 1200px; }

/* ⚠️ `.loading-spinner` **مش في الـ shell** — والأداة بتستخدمه في ٣
   أماكن. سايبينه هنا بدل ما يتضاف للـ shell بلا مستهلك تاني. */
.loading-spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
@keyframes spin{to{transform:rotate(360deg)}}
/* `modalIn` بتستخدمها نافذة التأكيد تحت — والـ shell معرّفها لمودالاته هو */
@keyframes modalIn { from { transform: scale(.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

''',
        'CSS — شيل التوكنز والـ chrome اللي الـ shell بيملكه')

    p.swap(
        '/* ── Main Tabs — full width, equal split (UI Standard v2) ───── */',
        '/* ── Card ───────────────────────────────────────────────────── */',
        '',
        'CSS — شيل التابات والمودالات وشاشة الدخول والـ order-link')

    # ── الهيدر → mount بتاع الـ shell ───────────────────────────
    p.swap(
        '<div class="app-header">',
        '<!-- Settings Modal -->',
        '<div id="headerMount"></div>\n\n',
        'الهيدر → dcoHeader')

    # ── مودال الإعدادات → `dcoSharedModals()` ───────────────────
    p.swap(
        '<div class="settings-overlay" id="settingsOverlay" onclick="closeSettingsOnBackdrop(event)">',
        '<!-- Confirm Dialog (generic — irreversible actions) -->',
        '',
        'مودال الإعدادات → dcoSharedModals')

    # ── حاوية التوست + شاشة الدخول ──────────────────────────────
    p.swap(
        '<!-- Toast Container -->',
        '<!-- ══════════════════════════════════════════════════════════════\n     §TOOL — محتوى الأداة',
        '',
        'حاوية التوست + شاشة الدخول كلها')

    p.sub('</div><!-- /.container -->',
          '</div><!-- /.container -->\n\n<!-- مودال الإعدادات + حاوية التوست — بيتحقنوا من الـ shell -->\n<div id="sharedMount"></div>',
          'حقن sharedMount')

    # ── تحميل الـ shell قبل سكربت الصفحة ────────────────────────
    p.sub('\n\n<script>\n// ══════════════════════════════════════════════════════════════\n// §CONFIG — LS keys',
          '\n\n<script src="shared/shell.js"></script>\n<script>document.getElementById(\'sharedMount\').innerHTML = dcoSharedModals();</script>\n\n<script>\n// ══════════════════════════════════════════════════════════════\n// §CONFIG — LS keys',
          'تحميل shared/shell.js قبل سكربت الصفحة')

    # ── سجل التحديثات — بادج الهب فوق، ونسخة الواجهة الأصلية تحته ──
    # 🔴 `renderVersionUI()` في الـ shell بتملا `#clLatestVerBadge` بـ
    #    `TOOL_VERSION` بتاع الهب. سايبين الـ id على بادج الأداة كان هيخلّي
    #    زرار الهيدر يقول `v1.5.0` والبادج يقول `v4.6.0` — رقمين مختلفين
    #    لنفس الحاجة على نفس الشاشة.
    p.sub(
        '      <div class="cl-version-block">\n'
        '        <div class="cl-version-row">\n'
        '          <span class="cl-ver-badge" id="clLatestVerBadge">v4.6.0</span>\n'
        '          <span class="cl-ver-date">16-09-2026</span>\n'
        '        </div>',
        '''      <div class="cl-version-block">
        <div class="cl-version-row">
          <span class="cl-ver-badge" id="clLatestVerBadge">v1.5.0</span>
          <span class="cl-ver-date">16-09-2026</span>
        </div>
        <ul class="cl-items">
          <li class="cl-item"><span class="cl-tag new">جديد</span><span><strong>الأداة دي بقت جوّه مركز عمليات الشحن والتحصيل.</strong> الدخول بقى <strong>مرة واحدة</strong> من الشاشة الرئيسية للمركز، والسر بقى <strong>قيمة واحدة</strong> لكل أدوات المركز (مجموعة <code>delivery_cod_ops</code>) بدل سر لكل أداة. وفيه زرار <strong>🏠 الرئيسية</strong> في الهيدر بيرجّعك للمركز.</span></li>
          <li class="cl-item"><span class="cl-tag change">تغيير</span><span><strong>منطق الأداة ما اتلمسش ولا سطر.</strong> نفس الـ Worker ونفس الخطوات ونفس المانفيست ونفس السجل بالظبط — اللي اتغيّر هو <strong>الإطار</strong> بس: الهيدر والإعدادات والتوست بقوا بتوع المركز.</span></li>
          <li class="cl-item"><span class="cl-tag change">تغيير</span><span>الرابط القديم للأداة <strong>لسه شغّال</strong> بشاشة دخوله وسرّه القديم — بس محتاج السر الجديد بعد ما الـ Worker ينضم لمجموعة المركز.</span></li>
        </ul>
      </div>

      <div class="cl-version-block">
        <div class="cl-version-row">
          <span class="cl-ver-badge old">v4.6.0 — الواجهة الأصلية</span>
          <span class="cl-ver-date">16-09-2026</span>
        </div>''',
        'سجل التحديثات — بند الهب v1.5.0 فوق')

    # ══════════════════════════════════════════════════════════
    # §CONFIG — النداءات بقت على الـ shell
    # ══════════════════════════════════════════════════════════
    p.swap(
        '// §CONFIG — LS keys + getConfig() + apiPost() + apiGet() + orderLink()',
        '// §SHELL-JS — settings, changelog, about, confirm, toast, date utils, sounds',
        '''// §CONFIG — النداءات كلها من الـ shell
// ══════════════════════════════════════════════════════════════
//
// 🔴 **أول سطر في الصفحة — بوابة الجلسة.** `requireSession()` بترمي عن
//    قصد لو مفيش جلسة: من غير الرمي باقي السكربت بيكمّل تنفيذ وبينادي
//    الـ Worker وبيرسم جدول **أثناء** ما التحويل لشاشة الدخول شغّال —
//    نداءات ضايعة ووميض شاشة.
const dcoSession = requireSession();

// 🔴 **الرابط والسر بقوا من الـ shell.** `WORKER_URL` و`LS_SECRET`
//    (`order_status_worker_secret`) **اتشالوا**: الأداة بقت جوّه المركز،
//    والسر قيمة واحدة لمجموعة `delivery_cod_ops`.
//    ⚠️ **وده شرطه مذكور بالاسم:** الـ Worker ده لازم يكون **اتضمّ
//       للمجموعة** (`WORKER_SECRET` اتدوّر لقيمتها من داشبورد كلاودفلير).
//       قبل الضم كل نداء هنا بيرجّع **401**، و`dcoApi` بيسمّي الأداة في
//       الرسالة فالموظف مايدوّرش.
// ⚠️ و`dcoApi` بيجيب معاه حاجة النسخة الأصلية ماكانتش عندها: **مهلة
//    صريحة (٩٠ ثانية)**. من غيرها الـ Worker الواقف كان بيسيب الزرار
//    معطّل والـ spinner بيلف للأبد، والموظف بيفتكر إن الأداة اتعلّقت.
const { apiGet, apiPost } = dcoApi(DCO_WORKERS.orderStatus);

// الفحص الذاتي وحارس النسخة بيمشوا على الـ Worker ده بس — الصفحة
// مابتنادیش غيره (⛔ ومفيش `ADMIN_WORKER_URL` هنا: شاشة الدخول اتشالت،
// وهي كانت المستهلك الوحيد له).
const PAGE_WORKERS = ['orderStatus'];

// ⚠️ **`shopifyOrderUrl`/`orderLink` بتوع الأداة دي متسابين عن قصد** —
//    مش نسخة زيادة من بتوع الـ shell. الفرقين حقيقيين: دي بتشيل
//    `gid://…` من الـ ID قبل ما تبني الرابط، وبتحط `#` قدام رقم الأوردر
//    لو مش موجود. نسخة الـ shell مابتعملش الاتنين، واستخدامها كان
//    بيدّي رابط باظ على أي ID جاي كـ gid.
const SHOP_DOMAIN  = '6c7e1a-53.myshopify.com';      // constant — same value in every tool

function shopifyOrderUrl(orderId) {
  const id = String(orderId).includes('gid://') ? orderId.split('/').pop() : orderId;
  return `https://${SHOP_DOMAIN}/admin/orders/${id}`;
}
function orderLink(orderNumber, orderId) {
  const label = escHtml(String(orderNumber || '').startsWith('#') ? orderNumber : `#${orderNumber || '—'}`);
  if (!orderId) return `<span class="order-num">${label}</span>`;
  return `<a href="${escHtml(shopifyOrderUrl(orderId))}" target="_blank" rel="noopener" class="order-link">${label}</a>`;
}

// ══════════════════════════════════════════════════════════════
''',
        '§CONFIG — dcaApi + requireSession بدل السر والرابط المحليين')

    # ── الشِل المكرر: النسخة · الإعدادات · الفحص · About/Changelog ──
    p.swap(
        '// ─── §SHELL-JS::version — مصدر واحد لرقم النسخة (v3.7.0) ───',
        '// ── Confirm dialog — clone + addEventListener (avoids listener accumulation) ──',
        '''// ⛔ **اتشال من هنا ودلوقتي في `shared/shell.js`:** `TOOL_VERSION`
//    و`MIN_WORKER_VERSION` و`cmpVersion` و`checkWorkerVersion`
//    و`showWorkerStale` و`renderVersionUI` · مودال الإعدادات
//    (`openSettings`/`saveSettings`/`updateSettingsBtn`) · الفحص الذاتي
//    (`runDiag` → `dcoRunDiag`) · `openAbout`/`openChangelog`.
// 🔴 **و«أقل نسخة Worker» بقت في `DCO_WORKERS.orderStatus.min`** —
//    `4.7.0`، والرقم ده **بيمنع ضرر مش بيدّي تحذير**: Worker `4.6.0`
//    بيرجّع **نفس اسم الحقل** (`cod`) بقيمة محسوبة بالصيغة القديمة
//    الغلط، فورقة المانفيست بتخرج من الطابعة بأرقام فلوس غلط و**صفر خطأ
//    في الكونسول**.
// ⚠️ **واللي فضل تحت مقصود:** نافذة التأكيد (`showConfirm`) — الـ shell
//    مالوش واحدة خالص، والأداة دي بتستخدمها قبل كل فعل لا رجعة فيه.

''',
        'شيل الشِل المكرر (نسخة · إعدادات · فحص · About/Changelog)')

    p.swap(
        "function showToast(msg, type = 'neutral', duration = 3000) {",
        'function toggleSearchActiveState(el) {',
        '// ⛔ `showToast` اتشالت — نسخة الـ shell بتكتب في نفس `#toastContainer`.\n\n',
        'شيل showToast المكرر')

    # ── التوقيت — الشِل عنده نسخة أحسن (حارس Invalid Date) ──────
    p.swap(
        "const CAIRO_TZ = 'Africa/Cairo';",
        'function cairoOffsetMinutes(d) {',
        '''// ⛔ `CAIRO_TZ` و`_cairoFmt` و`cairoParts` اتشالوا — في الـ shell بالحرف
//    **وبزيادة مهمة**: نسخة الـ shell فيها حارس `Invalid Date`. النسخة
//    اللي كانت هنا بترمي `RangeError` على تاريخ باظ، وصف واحد بتاريخ غلط
//    كان كفاية **يوقّع رسم الجدول كله**.
// ⚠️ واللي تحت **مالوش مقابل في الـ shell** وبيستخدمه فلتر «فترة سريعة»:
//    `toCairo` بترجّع `Date` **مزحزحة** عمدًا عشان باقي الكود يقرا منها
//    بـ`getUTC*` — نفس العقد القديم بالحرف، فمفيش أي استدعاء اتغيّر.
''',
        'شيل cairoParts المكررة (نسخة الـ shell فيها حارس Invalid Date)')

    p.swap(
        'function formatDateTime(iso) {',
        '// §TOOL-JS — business logic',
        '''// ⛔ `formatDateTime` · `formatDate` · `formatDateForExport` ·
//    `formatTimeForExport` اتشالوا — الأربعة في الـ shell **بنفس صيغة
//    المخرج بالحرف** (`📅 DD/MM/YYYY 🕐 hh:mm صباحاً/مساءً`)، وبحارس
//    `Invalid Date` زيادة.
// ⛔ و`playBeep` اتشالت — نسخة الـ shell بتغطي `success`/`scan`/`warn`،
//    و`error` بتقع على الفرع الافتراضي بنفس النغمة بالظبط.
//    ⚠️ **والفرق الوحيد مُعلَن:** نغمة `warn` في الـ shell أعلى شوية
//       (660→520 بدل 520→420). نفس العيلة، ونسخة واحدة أهم من نغمتين.

// ══════════════════════════════════════════════════════════════
// §SESSION — الهوية جاية من الهب، مفيش شاشة دخول هنا
// ══════════════════════════════════════════════════════════════
//
// 🔴 **§AUTH-JS كلها اتشالت** (قايمة الموظفين · شاشة الـ PIN ·
//    `register_pin` · `verify_employee` · `finishLogin` · `doLogout`).
//    الموظف بيدخل **مرة واحدة** في `index.html` بتاع المركز، والجلسة في
//    `sessionStorage` تحت `dco_session`.
// ⚠️ **والأثر في D1 لازم يتقال:** صف الدخول بقى بيتكتب باسم **الهب**
//    (`delivery_cod_ops_center` · `login`) مش باسم `order_status`. يعني
//    عدّاد `login` بتاع `order_status` **بيقف عند رقمه** من التاريخ ده
//    — مش عطل، بس أي استعلام بيعدّ دخول الأداة دي لازم يعرف.
//    ✅ **وصفوف `update` ما اتغيّرش فيها حاجة**: `employee` لسه بيتبعت
//       باسم الموظف مع كل نداء، والعقد العابر للأدوات
//       (`§CONTRACT::extra` اللي `cod-payment-center-worker` بيقراه)
//       ما اتلمسش ولا مفتاح.
// ⚠️ و`doLogout` بتاعة الـ shell بتنادي `log_logout` على **Worker الهب**
//    مش على Worker الأداة دي — نفس السبب.

// العقد اللي باقي كود الأداة بيقرا منه (`employee` مع كل
// `update_status`) — مصدره بقى الجلسة بدل شاشة الدخول.
let currentEmployee = { username: dcoSession.username, displayName: dcoSession.displayName };

// ══════════════════════════════════════════════════════════════
''',
        'شيل §AUTH-JS كلها + الفورماترز + playBeep، وحط بوابة الجلسة')

    # ── الـ Init ────────────────────────────────────────────────
    p.swap(
        'renderVersionUI();\nrenderStep1Body();',
        '\n</script>\n\n</body>',
        '''document.getElementById('headerMount').innerHTML = dcoHeader({
  icon:     '📦',
  title:    'تحديث حالة الأوردرات',
  subtitle: 'تحديث حالة الأوردرات بالسكانر أو يدوياً — S1/S2 تلقائي',
  session:  dcoSession,
});

renderVersionUI();
renderStep1Body();

// ⚠️ **حارس النسخة بياخد مفاتيح الـ Workers اللي الصفحة بتناديها** —
//    رسالة «الـ Worker نسخة قديمة» من غير اسم الأداة بتخلّي الموظف
//    يدوّر في الخمسة.
checkWorkerVersion(PAGE_WORKERS);

// ⛔ `loadEmployeesList()` و`updateSettingsButtonsState()` اتشالوا مع
//    شاشة الدخول — الأولى كانت بتملا قايمة الدخول، والتانية كانت بتلوّن
//    زرار إعدادات جوّه كارت الدخول اللي مابقاش موجود.

''',
        'الـ Init — حقن الهيدر وحارس النسخة')

    # ── «عن الأداة» — البنود اللي الدمج خلّاها غلط ──────────────
    # ⚠️ بند بيوصف شاشة دخول اتشالت أسوأ من مفيش بند: الموظف بيدوّر على
    #    حاجة مش موجودة، وبيفتكر إن الشاشة بايظة.
    p.sub('      <details class="about-sec" open>\n        <summary>📋 وصف الأداة</summary>',
          '''      <details class="about-sec" open>
        <summary>🏠 الأداة دي جوّه مركز الشحن والتحصيل</summary>
        <div class="about-sec-body">
          <p><strong>الأداة دي بقت صفحة جوّه مركز عمليات الشحن والتحصيل</strong> — مش أداة
             مستقلة بشاشة دخول خاصة بيها. اللي اتغيّر بالظبط:</p>
          <ul>
            <li><strong>الدخول مرة واحدة</strong> من الشاشة الرئيسية للمركز. الجلسة في
                <code>sessionStorage</code> تحت <code>dco_session</code>، وبتموت بقفل التاب
                أو بالخروج. ⚠️ ومعنى كده إن <strong>صف الدخول في D1 بيتكتب باسم المركز</strong>
                (<code>delivery_cod_ops_center</code>) مش باسم <code>order_status</code> —
                لكن كل صف <code>update</code> لسه فيه اسم الموظف زي ما هو.</li>
            <li><strong>سر واحد للمركز كله</strong> (مجموعة <code>delivery_cod_ops</code>) بدل سر
                لكل أداة. الحقل في ⚙️ الإعدادات، والقيمة بتتلزق <strong>مرة واحدة على كل جهاز</strong>.</li>
            <li><strong>🏠 الرئيسية</strong> في الهيدر بترجّعك للمركز.</li>
            <li>🔴 <strong>ومنطق الأداة ما اتلمسش ولا سطر</strong> — نفس الـ Worker
                (<code>order-status-updater-worker</code>) ونفس الخطوات ونفس المانفيست ونفس
                السجل بالظبط.</li>
          </ul>
          <p>⚠️ <strong>والرابط القديم للأداة لسه شغّال</strong> في ريبوه بشاشة دخوله — بس هو
             ونسخة المركز <strong>بينادوا نفس الـ Worker</strong>، فأي فعل بيتعمل من أي نسخة
             بيتسجّل في نفس السجل.</p>
        </div>
      </details>

      <details class="about-sec">
        <summary>📋 وصف الأداة</summary>''',
          'عن الأداة — قسم الدمج فوق')

    p.sub('<li>تسجيل الدخول بالـ PIN — كل عملية تُنسب للموظف الذي نفّذها.</li>',
          '<li>الدخول بيحصل <strong>مرة واحدة في الشاشة الرئيسية للمركز</strong> — وكل عملية هنا '
          'بتتنسب للموظف اللي داخل بيه.</li>',
          'عن الأداة — خطوة الدخول في الـ Workflow')

    p.sub('<li><code>Login (PIN)</code> — HTML §AUTH-JS — <code>verify_employee</code></li>',
          '<li><code>Login (PIN)</code> — <strong>اتشال من الصفحة دي</strong> — بقى في '
          '<code>index.html</code> بتاع المركز (<code>requireSession()</code> في '
          '<code>shared/shell.js</code> §SESSION)</li>',
          'عن الأداة — بند الدخول في تشريح الكود')

    p.sub('<li><code>LS_SECRET = \'order_status_worker_secret\'</code> — <strong>مفتاح الـ localStorage الوحيد الباقي</strong></li>',
          '<li><code>LS_SECRET = \'delivery_cod_ops_worker_secret\'</code> (في '
          '<code>shared/shell.js</code>) — <strong>مفتاح الـ localStorage الوحيد</strong>، '
          'وقيمته سر مجموعة <code>delivery_cod_ops</code> المشترك بين أدوات المركز. '
          '⚠️ المفتاح القديم <code>order_status_worker_secret</code> <strong>ما اتمسحش</strong> '
          'من متصفحات الموظفين — بقى مهمل بس، والصفحة دي مابتقراهوش.</li>',
          'عن الأداة — بند السر')

    p.sub('<li><code>WORKER_URL</code> / <code>ADMIN_WORKER_URL</code> — (v4.4.0) constants ثابتة في <code>§CONFIG</code>.',
          '<li><code>DCO_WORKERS.orderStatus.url</code> (في <code>shared/shell.js</code> §CONFIG) — '
          'بدل <code>WORKER_URL</code> المحلي. و<code>ADMIN_WORKER_URL</code> <strong>اتشال خالص</strong>: '
          'مستهلكه الوحيد كان شاشة الدخول. الرابطين مش سر —',
          'عن الأداة — بند الروابط')

    # ── الأسماء البديلة المهجورة — الـ shell مابيعرفهاش ────────
    # 🔴 النسخة الأصلية كانت معرّفة ٧ أسماء بديلة (`--text-sub` · `--mono` ·
    #    `--accent-b` …) جوّه كتلة التوكنز بتاعتها، كلها `var()` للاسم
    #    الرسمي. الكتلة اتشالت، فلو الاستخدامات فضلت بأسمائها القديمة
    #    المتغيّر بيبقى **غير معرّف**: المتصفح بيتجاهل الخاصية في صمت،
    #    فالخط بيرجع للافتراضي واللون بيرجع أسود — **بلا أي خطأ**.
    #    ✅ ودي بالظبط الحالة اللي `docs/css-check.js` بيمسكها.
    p.replace_all('var(--text-sub)', 'var(--text-secondary)', 'الاسم البديل --text-sub')
    p.replace_all('var(--accent-b)', 'var(--accent-border)',  'الاسم البديل --accent-b')
    p.replace_all('var(--mono)',     'var(--font-mono)',      'الاسم البديل --mono')

    p.forbid(r"localStorage\.(get|set)Item\('order_status", 'السر القديم لازم يكون اختفى')
    p.forbid(r'id="loginOverlay"',                          'شاشة الدخول لازم تكون اختفت')
    p.forbid(r'^\s*:root \{\s*$',                           'كتلة توكنز في الصفحة')
    p.write(os.path.join(HUB, 'order-status.html'))
    return p



# ══════════════════════════════════════════════════════════════
# ② cod-payment.html — من ريبو `COD-Payment-Center`
# ══════════════════════════════════════════════════════════════
def build_cod_payment():
    p = Port('cod-payment.html', read_source('COD-Payment-Center/index.html'))

    # ── الرأس + كتلة الستايل الأولى (كلها chrome بتاع الـ shell) ─
    # ⚠️ الكتلة دي (١٧٠ سطر) كانت **توكنز + شِل بالكامل**: reset · `body` ·
    #    `.container` · الهيدر · `.hbtn` · الإعدادات · `.eco-*` · `.about-*`
    #    · `.cl-*` · `.order-link` · التوست. اللي مش شِل فيها تلات حاجات بس،
    #    وهي اللي فضلت تحت.
    p.swap(
        '<title>COD Payment Center</title>',
        '</head>\n<style>\n',
        '''<title>تحصيل الأوردرات COD — مركز عمليات الشحن والتحصيل</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

<!-- 🔴 قاعدة الأسبقية: الـ shell أولاً، وستايل الصفحة بعده وبيغلب -->
<link rel="stylesheet" href="shared/shell.css">

<script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js"></script>
</head>
<style>
/* ══════════════════════════════════════════════════════════════
   §STYLES — الصفحة دي بس.
   🔴 **مفيش كتلة توكنز هنا — كلها في `shared/shell.css`.** كتلة الـ ٥٦
      متغيّر اتشالت: معظمهم كانوا **نفس القيمة بالحرف** في الـ shell،
      و١١ اتضافوا للـ shell (عيلة cyan/rose)، والباقي اتوصّل لتوكن موجود
      بنفس القيمة بالظبط (`--neutral-tint` → `--surface-hover` ·
      `--surface-head` → `--border`).
   ⚠️ **وتلات قيم اتوحّدت على قيمة الـ shell وفرقها غير محسوس** —
      `--red-dark` (#be123c → #b91c1c، استخدام واحد جوّه تدرّج لوني) ·
      `--surface-hover` (#f3f4f6 → #f0f4f8، استخدام واحد) · `--shadow-md`
      (استخدام واحد). نسختين من نفس التوكن أغلى من فرق مش باين.
   ✂️ واللي اتشال كمان لأن الـ shell بيملكه: الـ reset و`body`
      و`.container` · `.app-header*` · `.hbtn` · مودال الإعدادات ·
      `.eco-*` · `.about-*` · `.cl-*` · `.order-link`/`.order-num` ·
      التوست · `.main-tabs-bar`/`.main-tab-btn`/`.tab-panel`.
   ✂️ وشاشة الدخول كلها (`.login-*` · `.pin-*`).
   ══════════════════════════════════════════════════════════════ */

/* 🔴 **الاستثناء الوحيد من «صفر توكنز في الصفحة»** — الأداة دي فيها تاب
   سجل، يعني Tier M (١٢٠٠) مش Tier L (١٤٠٠) بتاع طوابير الهب. */
:root { --container-max: 1200px; }

/* ⚠️ التلاتة دول **مش في الـ shell** وليهم مستهلك هنا. */
.log-miss { display:inline-block; margin-right:5px; padding:1px 6px; border-radius:4px; background:var(--red-light); border:1px solid var(--red-border); color:var(--red); font-size:10px; font-weight:800; white-space:nowrap; }
.log-miss-banner { margin:0 0 10px; padding:9px 13px; border-radius:var(--radius-sm); background:var(--red-light); border:1.5px solid var(--red-border); color:var(--red); font-size:12px; font-weight:600; line-height:1.8; }
.spinner { width:12px; height:12px; border:2px solid transparent; border-top-color:currentColor; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; vertical-align:middle; }
@keyframes spin { to{transform:rotate(360deg)} }
/* بتستخدمها نافذة التأكيد تحت — والـ shell معرّفها لمودالاته هو */
@keyframes modalIn { from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }

''',
        'الرأس + كتلة الستايل الأولى (توكنز + شِل)')

    # ── شاشة الدخول: CSS ──────────────────────────────────────
    p.swap('.login-overlay { position:fixed;', '.card { background:var(--surface);', '', 'CSS شاشة الدخول')

    # ── الجسم: التوست + شاشة الدخول ────────────────────────────
    p.swap(
        '<body>\n<div class="toast-container" id="toastContainer"></div>',
        '<div class="container">',
        '<body>\n' + banner('COD-Payment-Center', 'cod-payment-center-worker', 'COD-Payment-Center') + '\n',
        'الجسم — شيل التوست وشاشة الدخول وحط البانر')

    # ── الهيدر → mount ────────────────────────────────────────
    p.swap('  <div class="app-header">', '  <div class="main-tabs-bar">',
           '  <div id="headerMount"></div>\n\n', 'الهيدر → dcoHeader')

    # ── مودال الإعدادات → dcoSharedModals ─────────────────────
    p.swap('<div class="settings-overlay" id="settingsOverlay" onclick="closeSettingsOnBackdrop(event)">',
           '<div class="eco-overlay" id="changelogOverlay"', '', 'مودال الإعدادات → dcoSharedModals')

    # ── حقن الـ shell قبل سكربت الصفحة ────────────────────────
    p.sub('</body>\n</html>\n<script>\n// ══════════════════════════════════════════════════════════════\n// §CONFIG',
          '<!-- مودال الإعدادات + حاوية التوست — بيتحقنوا من الـ shell -->\n'
          '<div id="sharedMount"></div>\n\n'
          '</body>\n</html>\n'
          '<script src="shared/shell.js"></script>\n'
          "<script>document.getElementById('sharedMount').innerHTML = dcoSharedModals();</script>\n"
          '<script>\n// ══════════════════════════════════════════════════════════════\n// §CONFIG',
          'حقن sharedMount و shared/shell.js')

    # ══════════════════════════════════════════════════════════
    # §CONFIG — بوابة الجلسة + نداءات الـ shell
    # ══════════════════════════════════════════════════════════
    p.sub("const SHOP_DOMAIN = '6c7e1a-53.myshopify.com';",
          '''// 🔴 **أول سطر في الصفحة — بوابة الجلسة.** `requireSession()` بترمي عن
//    قصد لو مفيش جلسة: من غير الرمي باقي السكربت بيكمّل تنفيذ وبينادي
//    الـ Worker **أثناء** ما التحويل لشاشة الدخول شغّال. وفي أداة فلوس
//    النداء الضايع ده مش مجرد ضوضاء.
const dcoSession = requireSession();

const SHOP_DOMAIN = '6c7e1a-53.myshopify.com';''',
          'بوابة الجلسة في أول السكربت')

    p.swap(
        "const WORKER_URL       = 'https://cod-payment-center-worker",
        'const $ = id => document.getElementById(id);',
        '''// 🔴 **الرابط والسر بقوا من الـ shell.** `WORKER_URL` و`LS_SECRET`
//    (`cod_payment_center_worker_secret`) و`ADMIN_WORKER_URL`
//    **اتشالوا**: الأداة بقت جوّه المركز، والسر قيمة واحدة لمجموعة
//    `delivery_cod_ops`. (`ADMIN_WORKER_URL` مستهلكه الوحيد كان شاشة
//    الدخول اللي اتشالت.)
//    ⚠️ **وشرطه مذكور بالاسم:** الـ Worker ده لازم يكون **اتضمّ
//       للمجموعة** (`WORKER_SECRET` اتدوّر لقيمتها من داشبورد
//       كلاودفلير). قبل الضم كل نداء هنا بيرجّع **401**.
// 🔴 **و`TOOL_NAME = 'cod_payment'` اتشال من هنا** — كان **توثيق بس**،
//    الواجهة عمرها ما بعتته: قيمة `tool` في D1 متحدّدة في كود الـ Worker.
//    وده مقصود: قيمة جاية من العميل معناها أي طلب معاه السر يقدر يكتب
//    صفوف بأي اسم أداة في جدول `logs` المشترك.
//
// ⚠️ **و`apiPostRoot` هي `apiPostLegacy` القديمة بالحرف** — الراوتينج
//    المختلط بتاع الـ Worker ده (GET + `?action=` للأوث والسجل · POST +
//    `action` في **الجسم** لـ`pay`/`refund`/`preview`/`getCourierOrders`)
//    **ما اتغيّرش ولا حرف**. اللي اتغيّر إنها بقت جوّه `dcoApi` فبقى ليها
//    **مهلة صريحة (٩٠ ثانية)** ورسايل فشل بتسمّي الأداة.
//    ⛔ وممنوع «نتوحّد» بتحويل نداء منها لـ`apiPost` — الـ Worker بيقرا
//       `action` من الجسم في المسار ده، والتحويل بيرجّع «action غير
//       معروف» على **فعل مالي**.
const { apiGet, apiPost, apiPostRoot: apiPostLegacy } = dcoApi(DCO_WORKERS.codPayment);

// الفحص الذاتي وحارس النسخة بيمشوا على الـ Worker ده بس.
const PAGE_WORKERS = ['codPayment'];

''',
        '§CONFIG — dcoApi بدل السر والرابط المحليين')

    # ── الشِل المكرر ───────────────────────────────────────────
    p.swap(
        '// §SHELL-JS\n',
        '// ── Cairo time (UTC+3). Egypt DST ends 29-10-2026 → change to 2 ──',
        '''// §SHELL-JS — اللي فضل بعد ما الـ shell خد الباقي
// ══════════════════════════════════════════════════════════════
//
// ⛔ **اتشال من هنا ودلوقتي في `shared/shell.js`:** `TOOL_VERSION` ·
//    `MIN_WORKER_VERSION` (بقت `DCO_WORKERS.codPayment.min` = `3.5.0`) ·
//    `cmpVersion` · `checkWorkerVersion` · `showWorkerStale` ·
//    `renderVersionUI` · مودال الإعدادات (`openSettings`/`saveSettings`/
//    `updateSettingsBtn`) · `diagRows`/`runDiag` (→ `dcoRunDiag`) ·
//    `openAbout`/`openChangelog` · `showToast`.
// ⚠️ **واللي فضل تحت مقصود:** بانر «الأداة غير مضبوطة». الـ shell
//    مالوش واحد (صفحاته بتفتح شاشة الإعدادات لوحدها عند أول نداء بلا
//    سر)، وهنا البانر بيتعرض **جوّه الشاشة** قبل أي نداء — يعني الموظف
//    بيعرف إن الأداة مش مضبوطة **قبل** ما يمسك السكانر.

function updateConfigBanner() { $('notConfigBanner')?.classList.toggle('show', !isConfigured()); }

// 🔴 `onSettingsSaved` هو الخطّاف اللي الـ shell بينده عليه بعد حفظ السر —
//    الـ shell مابيعرفش شغل الصفحة. من غيره البانر كان هيفضل مولّع بعد
//    ما الموظف يحفظ السر فعلاً.
function onSettingsSaved() {
  updateConfigBanner();
  loadLogCourierFilter();
  loadLogEmployeeFilter();
}

''',
        'شيل الشِل المكرر (نسخة · إعدادات · فحص · توست · About/Changelog)')

    # ── التوقيت — 🔴 إصلاح حقيقي مش نقل ─────────────────────────
    p.swap(
        '// ── Cairo time (UTC+3). Egypt DST ends 29-10-2026 → change to 2 ──',
        'function fmt(n){',
        '''// ══════════════════════════════════════════════════════════════
// ⏰ التوقيت — 🔴 **ده إصلاح عطل، مش نقل**
// ══════════════════════════════════════════════════════════════
//
// النسخة الأصلية كانت شايلة `const CAIRO_OFFSET_HOURS = 3;` — إزاحة
// **ثابتة**، وهي النمط اللي `ecommoda-constants` §13 بيسمّيه **كاسر**:
// مصر بترجع UTC+2 يوم **29-10-2026**، وساعتها كل وقت معروض في السجل، وكل
// حدود «فترة سريعة»، وكل حساب «اليوم/أمس» بيغلط **بساعة** — والأداة
// **مابتشتكيش**. الكومنت اللي كان فوق الثابت بيقول حرفيًا «change to 2»،
// يعني الإصلاح كان **خطوة يدوية متعلّمة على تاريخ**.
// ✅ دلوقتي محسوب بـ`Intl` على `Africa/Cairo` من `shared/shell.js` —
//    الصفحة دي **خرجت من نطاق بند 29-10-2026** خالص.
//
// ⚠️ **و`toCairo` لسه بترجّع `Date` مزحزحة عمدًا** عشان `cairoDateStr`
//    و`addDays` يقروا منها بـ`getUTC*` — نفس العقد بالحرف، فمفيش أي
//    استدعاء اتغيّر. (نفس الحل بالظبط اللي `Order-Status-Updater` عملته
//    في v4.5.0.)
function cairoOffsetMinutes(d) {
  const p = cairoParts(d);
  if (!p) return 0;
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - d.getTime()) / 60000);
}
function toCairo(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return new Date(NaN);
  return new Date(d.getTime() + cairoOffsetMinutes(d) * 60000);
}
function cairoNow() { return toCairo(new Date().toISOString()); }
function cairoDateStr(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return cairoDateStr(d);
}

// ⛔ `formatDateTime` · `formatDate` · `formatTimeOnly` ·
//    `formatDateForExport` · `formatTimeForExport` اتشالوا — كلهم في
//    الـ shell، وبحارس `Invalid Date` زيادة (`formatToParts` بترمي
//    `RangeError` على تاريخ باظ، وصف واحد كان كفاية يوقّع رسم الجدول كله).
// ⚠️ **وفرق واحد مُعلَن:** نسخة الـ shell من `formatDate` بتحط `📅`
//    ونسخة `formatTimeOnly` بتحط `🕐` **جوّه** القيمة، والنسخة القديمة
//    كانت بترجّعهم بلا رموز والرموز متكتوبة في الـ HTML. الخليتين
//    الوحيدتين اللي كانت بتعمل كده اتعدّلوا في نفس التمريرة، فالمخرج على
//    الشاشة **نفسه بالحرف**.

''',
        'التوقيت — إصلاح الإزاحة الثابتة (بند 29-10-2026)')

    p.sub('      <td>📅 ${formatDate(g.timestamp)}</td>\n      <td>🕐 ${formatTimeOnly(g.timestamp)}</td>',
          '      <td>${formatDate(g.timestamp)}</td>\n      <td>${formatTimeOnly(g.timestamp)}</td>',
          'خليتَي التاريخ والوقت — الرمز بقى جوّه الدالة')

    # ── طبقة الـ API + §AUTH-JS كلها ───────────────────────────
    p.swap(
        '// ── API Helpers ───────────────────────────────────────────────',
        '// §SHELL-JS — Main Tabs',
        '''// ⛔ `apiRequest`/`apiPost`/`apiGet`/`apiPostLegacy` اتشالوا — بقوا من
//    `dcoApi` فوق. الفرق الوحيد في السلوك إنهم بقى ليهم **مهلة صريحة**
//    ورسايل فشل بتسمّي الأداة؛ نفس الأشكال التلاتة بنفس المسارات بالحرف.
</script>
<script>
// ══════════════════════════════════════════════════════════════
// §SESSION — الهوية جاية من الهب، مفيش شاشة دخول هنا
// ══════════════════════════════════════════════════════════════
//
// 🔴 **§AUTH-JS كلها اتشالت** (قايمة الموظفين · شاشة الـ PIN ·
//    `register_pin` · `verify_employee` · `finishLogin` · `doLogout` ·
//    `playBeep`). الموظف بيدخل **مرة واحدة** في `index.html` بتاع المركز،
//    والجلسة في `sessionStorage` تحت `dco_session`.
// ⚠️ **والأثر في D1 لازم يتقال:** صف الدخول بقى بيتكتب باسم **الهب**
//    (`delivery_cod_ops_center` · `login`) مش باسم `cod_payment`. يعني
//    عدّاد `login` بتاع `cod_payment` **بيقف عند رقمه** من التاريخ ده.
//    ✅ **وصفوف `payment`/`refund` ما اتغيّرش فيها حاجة** — `employee`
//       و`employeeDisplayName` لسه بيتبعتوا مع كل نداء زي ما هم.
// ⛔ `playBeep` اتشالت كمان — نسخة الـ shell بتغطي `success` بنفس النغمة
//    بالحرف، و`error` بتقع على الفرع الافتراضي بنفس النغمة بالظبط. (دول
//    النوعين الوحيدين اللي الصفحة دي بتناديهم.)

// العقد اللي باقي كود الأداة بيقرا منه (`employee` مع كل `pay`/`refund`).
let currentEmployee = { username: dcoSession.username, displayName: dcoSession.displayName };

// ══════════════════════════════════════════════════════════════
''',
        'شيل طبقة الـ API القديمة و§AUTH-JS كلها')

    # ── الـ Init ───────────────────────────────────────────────
    p.sub(
        'renderVersionUI();\n'
        'updateSettingsButtonsState();\n'
        'checkWorkerVersion();     // محميّ جوّاه\n'
        'loadEmployeesList();      // محميّ جوّاه (بيعرض رسالة حالة بدل ما ينده)\n'
        'initLogTypeFilter();      // قايمة ثابتة — مفيش نداء شبكة\n'
        'loadLogCourierFilter();   // محميّ جوّاه\n'
        'loadLogEmployeeFilter();  // محميّ جوّاه',
        '''document.getElementById('headerMount').innerHTML = dcoHeader({
  icon:     '💳',
  title:    'تحصيل الأوردرات COD',
  subtitle: 'تحصيل واسترداد مدفوعات الدفع عند الاستلام',
  session:  dcoSession,
});

renderVersionUI();
updateConfigBanner();

// ⚠️ **حارس النسخة بياخد مفاتيح الـ Workers اللي الصفحة بتناديها** —
//    رسالة «الـ Worker نسخة قديمة» من غير اسم الأداة بتخلّي الموظف
//    يدوّر في الخمسة.
checkWorkerVersion(PAGE_WORKERS);   // محميّ جوّاه بـ isConfigured()

initLogTypeFilter();      // قايمة ثابتة — مفيش نداء شبكة
loadLogCourierFilter();   // محميّ جوّاه
loadLogEmployeeFilter();  // محميّ جوّاه

// ⛔ `loadEmployeesList()` اتشالت مع شاشة الدخول — كانت بتملا قايمة الدخول.''',
        'الـ Init — حقن الهيدر وحارس النسخة')

    # ── سجل التحديثات + «عن الأداة» ────────────────────────────
    p.sub('          <span class="cl-ver-badge" id="clVerBadge">v3.4.0</span>\n'
          '          <span class="cl-ver-date">06-09-2026</span>\n'
          '        </div>',
          '''          <span class="cl-ver-badge" id="clLatestVerBadge">v1.5.0</span>
          <span class="cl-ver-date">16-09-2026</span>
        </div>
        <ul class="cl-items">
          <li class="cl-item"><span class="cl-tag new">جديد</span><span><strong>الأداة دي بقت جوّه مركز عمليات الشحن والتحصيل.</strong> الدخول بقى <strong>مرة واحدة</strong> من الشاشة الرئيسية للمركز، والسر بقى <strong>قيمة واحدة</strong> لكل أدوات المركز (مجموعة <code>delivery_cod_ops</code>). وفيه زرار <strong>🏠 الرئيسية</strong> في الهيدر.</span></li>
          <li class="cl-item"><span class="cl-tag fix">إصلاح</span><span>🔴 <strong>الساعة كانت هتغلط بساعة من 29-10-2026 — من غير ما يتغيّر سطر في الكود.</strong> الأداة كانت شايلة إزاحة <strong>ثابتة</strong> (+٣ ساعات) ومعاها كومنت بيقول «غيّرها لـ٢ يوم ٢٩-١٠»، يعني الإصلاح كان خطوة يدوية متعلّمة على تاريخ. دلوقتي الوقت <strong>محسوب</strong> على <code>Africa/Cairo</code>، والغلط ده مابقاش ممكن — في السجل، وفي حدود «فترة سريعة»، وفي حساب «اليوم/أمس».</span></li>
          <li class="cl-item"><span class="cl-tag new">جديد</span><span><strong>مهلة صريحة (٩٠ ثانية) على كل نداء.</strong> قبل كده الـ Worker الواقف كان بيسيب الزرار معطّل والدايرة بتلف <strong>للأبد</strong>، والموظف بيفتكر إن الأداة اتعلّقت فيعمل refresh — وده بالظبط اللي بينتج «فشل كذّاب» على تحصيل اتنفّذ فعلاً.</span></li>
          <li class="cl-item"><span class="cl-tag change">تغيير</span><span><strong>منطق التحصيل ما اتلمسش ولا سطر</strong> — نفس الـ Worker ونفس <code>pay</code>/<code>refund</code> ونفس توزيع طرق الدفع ونفس السجل بالظبط.</span></li>
        </ul>
      </div>

      <div class="cl-version-block">
        <div class="cl-version-row">
          <span class="cl-ver-badge old">v3.4.0 — الواجهة الأصلية</span>
          <span class="cl-ver-date">06-09-2026</span>
        </div>''',
          'سجل التحديثات — بند الهب v1.5.0 فوق')

    p.sub('      <details class="about-sec" open>\n        <summary>📋 وصف الأداة</summary>',
          '''      <details class="about-sec" open>
        <summary>🏠 الأداة دي جوّه مركز الشحن والتحصيل</summary>
        <div class="about-sec-body">
          <p><strong>الأداة دي بقت صفحة جوّه مركز عمليات الشحن والتحصيل</strong> — مش أداة
             مستقلة بشاشة دخول خاصة بيها. اللي اتغيّر بالظبط:</p>
          <ul>
            <li><strong>الدخول مرة واحدة</strong> من الشاشة الرئيسية للمركز. الجلسة في
                <code>sessionStorage</code> تحت <code>dco_session</code>، وبتموت بقفل التاب
                أو بالخروج. ⚠️ ومعنى كده إن <strong>صف الدخول في D1 بيتكتب باسم المركز</strong>
                (<code>delivery_cod_ops_center</code>) مش باسم <code>cod_payment</code> —
                لكن كل صف <code>payment</code>/<code>refund</code> لسه فيه اسم الموظف زي ما هو.</li>
            <li><strong>سر واحد للمركز كله</strong> (مجموعة <code>delivery_cod_ops</code>) بدل سر
                لكل أداة، وبيتلزق <strong>مرة واحدة على كل جهاز</strong>.</li>
            <li><strong>🏠 الرئيسية</strong> في الهيدر بترجّعك للمركز.</li>
            <li>🔴 <strong>ومنطق التحصيل ما اتلمسش ولا سطر</strong> — نفس الـ Worker
                (<code>cod-payment-center-worker</code>) ونفس <code>pay</code>/<code>refund</code>
                ونفس توزيع طرق الدفع ونفس السجل.</li>
            <li>✅ <strong>وحاجتين اتصلحوا في نفس التمريرة:</strong> الساعة بقت محسوبة على
                <code>Africa/Cairo</code> بدل إزاحة ثابتة كانت هتغلط بساعة من 29-10-2026،
                وكل نداء بقى عليه <strong>مهلة ٩٠ ثانية</strong>.</li>
          </ul>
          <p>⚠️ <strong>والرابط القديم للأداة لسه شغّال</strong> في ريبوه بشاشة دخوله — بس هو
             ونسخة المركز <strong>بينادوا نفس الـ Worker</strong>، فأي تحصيل من أي نسخة
             بيتسجّل في نفس السجل.</p>
        </div>
      </details>

      <details class="about-sec">
        <summary>📋 وصف الأداة</summary>''',
          'عن الأداة — قسم الدمج فوق')

    p.sub("<li><code>TOOL_NAME = 'cod_payment'</code> — قيمة <code>tool</code> في جدول logs بـ D1</li>",
          "<li><code>TOOL_NAME</code> — <strong>اتشال من الواجهة</strong>. قيمة <code>tool</code> "
          "في جدول logs (<code>cod_payment</code>) متحدّدة في كود الـ Worker ومابتتبعتش من "
          "العميل — قيمة جاية من العميل معناها أي طلب معاه السر يقدر يكتب صفوف بأي اسم أداة "
          "في الجدول المشترك.</li>",
          'عن الأداة — بند TOOL_NAME')

    p.sub('<li><code>currentEmployee</code> — { username, displayName } في الذاكرة فقط، أبداً في localStorage</li>',
          '<li><code>currentEmployee</code> — { username, displayName }، مصدره '
          '<code>dco_session</code> في <code>sessionStorage</code> (جلسة المركز) — '
          'أبداً في <code>localStorage</code></li>',
          'عن الأداة — بند currentEmployee')

    p.sub("<li><code>LS_SECRET = 'cod_payment_center_worker_secret'</code> — المفتاح الوحيد في localStorage. المفتاح القديم <code>..._worker_url</code> اتساب في مكانه ومابيتقراش</li>",
          "<li><code>LS_SECRET = 'delivery_cod_ops_worker_secret'</code> (في "
          "<code>shared/shell.js</code>) — <strong>المفتاح الوحيد في localStorage</strong>، "
          "وقيمته سر مجموعة <code>delivery_cod_ops</code> المشترك بين أدوات المركز. "
          "⚠️ المفتاح القديم <code>cod_payment_center_worker_secret</code> "
          "<strong>ما اتمسحش</strong> من متصفحات الموظفين — بقى مهمل بس.</li>",
          'عن الأداة — بند السر')

    # ── توكنان اتوصّلوا لتوكن الـ shell بنفس القيمة بالظبط ──────
    # 🔴 `--neutral-tint` كان `#f0f4f8` وده **نفس** قيمة `--surface-hover`
    #    في الـ shell بالحرف، و`--surface-head` كان `#e5e7eb` وده **نفس**
    #    `--border`. إضافتهم للـ shell كانت هتبقى توكنين بقيم مكررة —
    #    والتكرار ده هو اللي بيخلّي حد يغيّر واحد وينسى التاني.
    # ⚠️ **صفر تغيير بصري** — نفس الـ hex بالظبط.
    p.replace_all('var(--neutral-tint)',  'var(--surface-hover)', 'التوكن --neutral-tint')
    p.replace_all('var(--surface-head)',  'var(--border)',        'التوكن --surface-head')

    p.forbid(r"CAIRO_OFFSET_HOURS \* 60",                       'الإزاحة الثابتة لازم تكون اختفت')
    p.forbid(r"localStorage\.getItem\(LS_SECRET\)",              'قراءة السر القديم لازم تكون اختفت')
    p.forbid(r'id="loginOverlay"',                               'شاشة الدخول لازم تكون اختفت')
    p.write(os.path.join(HUB, 'cod-payment.html'))
    return p


# ══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    build_order_status()
    build_cod_payment()
    print()
