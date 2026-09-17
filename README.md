<div dir="rtl" style="text-align: right;">

# مركز عمليات الشحن والتحصيل — Delivery COD Operations Center

![version](https://img.shields.io/badge/version-v1.6.0-blue)

**هب واحد لمحطة الشحن والتحصيل.** الموظف بيدخل مرة واحدة وبيشوف طوابير الشحن —
**وبيشتغل على أدوات المحطة من نفس المكان** (دخول واحد وسر واحد).

🔗 **الواجهة:** https://ecommoda-dev.github.io/Delivery-COD-Operations-Center/

## الصفحات

| الصفحة | بتعمل إيه | الـ Worker |
|---|---|---|
| `index.html` | الدخول + الشاشة الرئيسية (الطابورين بأرقامهم) | **`delivery-cod-operations-center-worker`** (في الريبو ده) |
| `ready-orders.html` | **أوردرات جاهزة للشحن** — حالته `Ready` (S1 أو S2) | `ready-orders-worker` **1.3.0** |
| `shipped-orders.html` | **أوردرات تحت التوصيل** — حالته `Shipped` ولسه بلا `Delivered`/`Returned` | `shipped-orders-worker` |
| `order-status.html` 🔗 | **تحديث حالة الأوردرات** — أداة مدموجة (v1.5.0) | `order-status-updater-worker` (في ريبوه) |
| `cod-payment.html` 🔗 | **تحصيل الأوردرات COD** — أداة مدموجة (v1.5.0) | `cod-payment-center-worker` (في ريبوه) |

> 🔴 **الريبو ده فيه النُصّين** — الواجهة على GitHub Pages، و**Worker الدخول**
> (`index.js`) على Cloudflare. ده الشكل القياسي (قرار ٨ في الـ playbook).
> ⛔ **وWorker الدخول دخول/خروج وبس** — أي أداة جديدة تاخد Worker بتاعها في ريبوها.
> 🔴 **والطابورين عرض بحت** — صفر كتابة على شوبيفاي وصفر صف في السجل.
> ⚠️ **أما الأداتين المدموجتين فبيكتبوا فعلاً** — حالة أوردر على شوبيفاي،
> وصفوف فلوس في D1. وعشان كده هما في قسم «أدوات» في الرئيسية **بلا عدّاد**.
> 🔴 **وصفحتهم متولّدة** من ريبوهاتهم الأصلية (`docs/port-standalone.py`) —
> الروابط القديمة فضلت شغّالة بقرار أحمد، فأي تعديل هناك محتاج تشغيلة هنا.

## الملفات

```
index.js              🔴 Worker الدخول (دخول/خروج بس · binding DB)
wrangler.toml         إعدادات الـ Worker
index.html            الدخول + الشاشة الرئيسية
ready-orders.html     قسم الجاهز للشحن + 🧮 تاب جرد المكتب
shipped-orders.html   طابور المشحون
shared/shell.css      التوكنز + الـ chrome (نسخة واحدة)
shared/shell.js       الإعدادات + الجلسة + §QUEUE-RULES + §AUDIT-RULES (مصدر الاشتقاق الوحيد)
docs/build-pages.py   مولّد الصفحتين — 🔴 الـ HTML **متولّد**، عدّل هنا
docs/css-check.js     فحص CSS بـ parser حقيقي
docs/rules-check.mjs  فحص منطق §QUEUE-RULES و§AUDIT-RULES — ٩٠ بند (بلا تنصيب)
docs/queues-check.mjs فحص متصفح فعلي — ١٩٦ بند
order-status.html     🔗 محدّث حالة الأوردر — 🔴 **متولّدة**، عدّل في ريبوها
cod-payment.html      🔗 مركز التحصيل — 🔴 **متولّدة**، عدّل في ريبوها
docs/port-standalone.py  مولّد صفحتَي الأداتين من ريبوهاتهم
docs/tools-check.mjs  فحص عقد الدمج — ٦٥ بند
```

## الفحوص — قبل أي تسليم

```bash
npm i playwright postcss --no-save
node docs/css-check.js shared/shell.css index.html ready-orders.html shipped-orders.html \
                       order-status.html cod-payment.html
node docs/rules-check.mjs
node docs/queues-check.mjs
node docs/tools-check.mjs
```

🔴 **ولو عدّلت في `Order-Status-Updater` أو `COD-Payment-Center`** — شغّل
المولّد قبل الفحص (لازم الريبوهات تكون جنب بعض):

```bash
python3 docs/port-standalone.py
```

## النشر

```
① GitHub Pages → Settings → Pages → Deploy from a branch → main / (root)
② Workers Builds على الريبو ده → delivery-cod-operations-center-worker
③ Build watch paths = index.js + wrangler.toml   ← 🔴 وقت الإنشاء، chips منفصلة
④ WORKER_SECRET (سر مجموعة delivery_cod_ops) → Promote
```

🔴 **`Build watch paths` إلزامية هنا** لأن الريبو فيه واجهة كمان — من غيرها كل
تعديل HTML بينشر الـ Worker. والحقل **chips مش نص**: الاتنين في سطر واحد =
chip واحد باسم مش موجود، والـ Worker **بيتجمّد على نسخته للأبد بلا أي رسالة**.

🔴 **وخطوات حاجزة في ريبوهات الطابورين**: إنشاء `ready-orders-worker` و
`shipped-orders-worker` · ربط Builds · `WORKER_SECRET` = سر
`delivery_cod_ops` → **Promote** · `CLIENT_ID`/`CLIENT_SECRET` → **Promote**.

🔴 **وحاجز v1.5.0**: `WORKER_SECRET` على `order-status-updater-worker` و
`cod-payment-center-worker` لازم يتدوّر لقيمة مجموعة `delivery_cod_ops` →
**Promote**. قبل كده الصفحتين المدموجتين بيرجّعوا `401`.

🔴 **وحاجز v1.6.0**: `ready-orders-worker` **`1.3.0`** (فيه `note`) لازم
يتنشر ويتعمله **Promote** — قبل كده عمود «ملحوظات» بيقول `—` على كل صف
وحارس النسخة بيقول «Worker قسم الجاهز للشحن نسخة قديمة». ⚠️ والتدهور
**محصور في العمود ده** — الطابور والجرد وباقي الأعمدة شغّالين بالكامل.

التفاصيل والقرارات والفخاخ → **`CLAUDE.md`**

</div>
