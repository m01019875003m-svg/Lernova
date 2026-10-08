# تشغيل Lernova

## التشغيل على الكمبيوتر أو الهاتف

1. فك ضغط المشروع كاملًا وافتح مجلد `Lernova` في VS Code.
2. شغّل `index.html` عبر Live Server. استخدام خادم محلي مطلوب لتثبيت التطبيق والعمل دون اتصال.
3. على الهاتف افتح رابط الخادم من المتصفح، ثم اختر **إضافة إلى الشاشة الرئيسية**.
4. حمّل الكلمات والصوت أول مرة وأنت متصل بالإنترنت؛ بعد ذلك تبقى الصفحات والبيانات مخزنة محليًا.

## الحساب والمزامنة

التطبيق يعمل محليًا دون إعداد حساب. لتشغيل الحسابات ومزامنة التقدم:

1. إعداد عنوان مشروع Supabase ومفتاح النشر العام موجود بالفعل في `js/config.js`.
2. في Supabase افتح SQL Editor ونفّذ `supabase/schema.sql` مرة واحدة لتفعيل الملف الشخصي وسياسات RLS. السكربت يحتفظ بتقدم المستخدم الموجود ويضيف الأعمدة الناقصة فقط.
3. تأكد أن جدول `user_progress` يستخدم صفًا واحدًا لكل مستخدم، ومفتاحه `user_id`، وبه أعمدة `xp`, `streak`, `last_activity`, `known_words`, `review_words`, `updated_at`.
4. افتح `pages/signup.html` لإنشاء حساب، ثم سجّل الدخول. يعمل التطبيق محليًا حتى قبل تسجيل الدخول.
5. لا تضع مفتاح `secret/service_role` في ملفات المتصفح. التطبيق يستخدم مفتاح النشر العام وسياسات RLS.

## أقسام Lernova A1

- الفصول 1–12 والكلمات والفئات والبحث والفرز.
- جملة ألمانية وترجمتها العربية لكل مدخل، مع Artikel والجمع.
- نطق المتصفح، اختيار Kapitel أو كل الفصول في الاستماع والتحدث، وتدريب محادثة قصيرة.
- اختبارات بفلتر الفصل، نوع السؤال، والعدد المطلوب أو كل الأسئلة المتاحة، مع اختبار قواعد لكل Kapitel.
- القواعد في Kapitel 1–6 مرتبة حسب الملخصات المصورة المرسلة من الكتاب.
- المراجعة المتباعدة، الاختبارات، XP، Streak وإحصاءات الفصول.
- يعمل التقدم محليًا أولًا؛ المزامنة السحابية تحتاج إعداد Supabase الخاص بك.

التحدث عبر الميكروفون يعتمد على دعم المتصفح وإذن الميكروفون. إذا لم يدعم المتصفح التعرف على الصوت، استخدم التدريب بالتكرار الذاتي.


### Profile photo and account header

The account page now stores the username in Supabase Auth metadata and the `profiles` row. Profile photos upload to the public `avatars` Storage bucket, with authenticated upload/update/delete restricted to each user’s own UUID folder. After updating, run the full `supabase/schema.sql` again in Supabase SQL Editor; the script is safe to rerun and does not delete progress.
