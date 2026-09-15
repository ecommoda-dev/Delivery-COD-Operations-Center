<div dir="rtl" style="text-align: right;">

# مركز عمليات الشحن والتحصيل — Delivery COD Operations Center

![version](https://img.shields.io/badge/version-v1.0.0-blue)

**هب واحد لمحطة الشحن والتحصيل.** الموظف بيدخل مرة واحدة وبيشوف طوابير الشحن.

🔗 **الواجهة:** https://ecommoda-dev.github.io/Delivery-COD-Operations-Center/

## الصفحات

| الصفحة | بتعمل إيه | الـ Worker |
|---|---|---|
| `index.html` | الدخول + الشاشة الرئيسية (الطابورين بأرقامهم) | **`delivery-cod-operations-center-worker`** (في الريبو ده) |
| `ready-orders.html` | **جاهز للشحن** — حالته `Ready` (S1 أو S2) | `ready-orders-worker` |
| `shipped-orders.html` | **مشحون بلا نتيجة** — حالته `Shipped` ولسه بلا `Delivered`/`Returned` | `shipped-orders-worker` |

> 🔴 **الريبو ده فيه النُصّين** — الواجهة على GitHub Pages، و**Worker الدخول**
> (`index.js`) على Cloudflare. ده الشكل القياسي (قرار ٨ في الـ playbook).
> ⛔ **وWorker الدخول دخول/خروج وبس** — أي أداة جديدة تاخد Worker بتاعها في ريبوها.
> 🔴 **والطابورين عرض بحت** — صفر كتابة على شوبيفاي وصفر صف في السجل.

## الملفات

```
index.js              🔴 Worker الدخول (دخول/خروج بس · binding DB)
wrangler.toml         إعدادات الـ Worker
index.html            الدخول + الشاشة الرئيسية
ready-orders.html     طابور الجاهز للشحن
shipped-orders.html   طابور المشحون
shared/shell.css      التوكنز + الـ chrome (نسخة واحدة)
shared/shell.js       الإعدادات + الجلسة + §QUEUE-RULES (مصدر الاشتقاق الوحيد)
docs/build-pages.py   مولّد الصفحتين — 🔴 الـ HTML **متولّد**، عدّل هنا
docs/css-check.js     فحص CSS بـ parser حقيقي
docs/rules-check.mjs  فحص منطق §QUEUE-RULES — ٥٢ بند (بلا تنصيب)
docs/queues-check.mjs فحص متصفح فعلي — ٨٠ بند
```

## الفحوص — قبل أي تسليم

```bash
npm i playwright postcss --no-save
node docs/css-check.js shared/shell.css index.html ready-orders.html shipped-orders.html
node docs/rules-check.mjs
node docs/queues-check.mjs
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

التفاصيل والقرارات والفخاخ → **`CLAUDE.md`**

</div>
