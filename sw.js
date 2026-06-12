// اسم الكاش الخاص بنسخة التطبيق الحالية
const CACHE_NAME = 'quran-app-v1';

// الملفات الأساسية (App Shell) التي يجب توفرها فوراً لفتح التطبيق بدون شبكة
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// 1. حدث التثبيت (Install): يتم حفظ الواجهات الأساسية في الكاش
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('جاري حفظ الملفات الهيكلية للتطبيق في ذاكرة التخزين المؤقت الدائمة...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. حدث التفعيل (Activate): تنظيف الملفات القديمة من الكاش عند التحديث
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('جاري إزالة الكاش القديم المتهالك:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. استراتيجية جلب البيانات (Fetch Strategy): "الاستجابة من الكاش أولاً، مع جلب وتخزين الملف الجديد"
// هذه الإستراتيجية مثالية لملفات التلاوات الصوتية والصور عالية الجودة؛ يتم تحميلها مرة واحدة من الإنترنت ثم تؤخذ من الجهاز للأبد
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // وجد الملف في الكاش، أرسله فوراً دون استخدام إنترنت
            }

            // إذا لم يجد الملف (مثل سورة جديدة أو تلاوة مسموعة لأول مرة)، اطلبه من الشبكة
            return fetch(event.request).then((networkResponse) => {
                // التحقق من صلاحية الاستجابة
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // نقوم بنسخ الاستجابة لحفظها في الكاش لتعمل "بدون إنترنت" في المرة القادمة
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // في حالة انقطاع الإنترنت التام وطلب ملف غير متوفر في الكاش
                console.log('هذا الملف غير متوفر في وضع عدم الاتصال حالياً.');
            });
        })
    );
});

