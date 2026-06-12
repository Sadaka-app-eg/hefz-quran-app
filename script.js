/**
 * تطبيق "حفظ القرآن الكريم" - النسخة الكاملة الشاملة لـ 604 صفحة
 * يعتمد على جلب البيانات ديناميكياً وتخزينها للعمل المستقل بدون إنترنت (Offline-First)
 */

// --- 1. إعدادات الروابط والمحركات الخارجية (APIs) ---
// نستخدم خوادم Alquran Cloud المستقرة والسريعة جداً لجلب النصوص والتفاسير
const QURAN_API_BASE = "https://api.alquran.cloud/v1";

// روابط التلاوات الصوتية (آية آية) للقراء الثلاثة المحددين
const AUDIO_AUDIO_BASES = {
    minshawi: "https://cdn.islamic.network/quran/audio/128/ar.minshawi/", // المنشاوي مرتل
    afasy: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/",     // العفاسي
    hussary: "https://cdn.islamic.network/quran/audio/128/ar.husary/"     // الحصري مرتل
};

// --- 2. إدارة وتخزين الحالة (State Management) ---
let currentState = {
    currentPage: 1,               // البداية من الصفحة الأولى (المصحف كاملاً 1 إلى 604)
    currentReader: 'minshawi',
    isDarkMode: true,
    selectedAyahId: null,
    playingAyahIndex: 0,          // مؤشر الآية الحالية في الصفحة أثناء التلاوة
    pageAyahs: [],                // لتخزين آيات الصفحة الحالية بعد جلبها
    isAudioPlaying: false,
    isRepeatActive: false,
    highlightedAyahs: JSON.parse(localStorage.getItem('saved_highlighted_ayahs')) || [] 
};

// --- 3. جلب عناصر واجهة المستخدم ---
const quranPageDiv = document.getElementById('quran-page');
const pageNumDisplay = document.getElementById('page-number-display');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const themeToggleBtn = document.getElementById('theme-toggle');
const tipsSection = document.getElementById('tips-section');
const mushafSection = document.getElementById('mushaf-section');
const toggleTipsBtn = document.getElementById('toggle-tips-btn');
const closeTipsBtn = document.getElementById('close-tips-btn');

const contextMenu = document.getElementById('ayah-context-menu');
const menuAyahTitle = document.getElementById('menu-ayah-title');
const closeMenuBtn = document.getElementById('close-menu-btn');
const tafsirModal = document.getElementById('tafsir-modal');
const tafsirTitle = document.getElementById('tafsir-title');
const tafsirBody = document.getElementById('tafsir-body');
const closeTafsirBtn = document.getElementById('close-tafsir-btn');

const audioEl = document.getElementById('main-audio');
const playPauseBtn = document.getElementById('btn-play-pause');
const prevAudioBtn = document.getElementById('btn-prev-audio');
const nextAudioBtn = document.getElementById('btn-next-audio');
const readerSelect = document.getElementById('reader-select');
const repeatBtn = document.getElementById('btn-repeat');
const repeatStatusText = document.getElementById('repeat-status');
const playingAyahText = document.getElementById('playing-ayah-text');

// --- 4. جلب بيانات المصحف كاملة ديناميكياً (نص + تفسير) ---
async function loadQuranPage(pageNumber) {
    quranPageDiv.innerHTML = `<div class="loading-spine" style="padding:20px; font-size:1.2rem; text-align:center;">جاري تحميل آيات صفحة ${pageNumber} وتأمين تشغيلها بدون إنترنت...</div>`;
    pageNumDisplay.innerText = `صفحة: ${pageNumber}`;
    
    try {
        // جلب نص الآيات بالرسم العثماني للصفحة المحددة
        const textResponse = await fetch(`${QURAN_API_BASE}/page/${pageNumber}/quran-uthmani`);
        const textData = await textResponse.json();
        
        // جلب التفسير الميسر لنفس الصفحة بالتوازي لضمان السرعة
        const tafsirResponse = await fetch(`${QURAN_API_BASE}/page/${pageNumber}/ar.jalalayn`); // جلالاين أو الميسر المتاح مجاناً وبسرعة
        const tafsirData = await tafsirResponse.json();

        if(textData.code === 200 && textData.data.ayahs) {
            // دمج النص والتفسير في مصفوفة واحدة سهلة التعامل
            currentState.pageAyahs = textData.data.ayahs.map((ayah, index) => {
                return {
                    numberInSurah: ayah.numberInSurah,
                    text: ayah.text,
                    number: ayah.number, // الرقم العالمي للآية (مهم للصوتيات)
                    surah: ayah.surah.name,
                    tafsir: tafsirData.data.ayahs[index] ? tafsirData.data.ayahs[index].text : "التفسير غير متوفر حالياً لهذه الآية."
                };
            });
            
            renderPageContents();
        } else {
            throw new Error("خطأ في بنية البيانات");
        }
    } catch (error) {
        quranPageDiv.innerHTML = `
            <div style="padding:20px; text-align:center; color:red;">
                <p>تطلب هذه الصفحة اتصالاً بالشبكة لأول مرة فقط ليتم حفظها في جهازك.</p>
                <button onclick="loadQuranPage(${pageNumber})" class="btn" style="margin-top:10px;">إعادة المحاولة</button>
            </div>`;
    }
}

// عرض محتوى الصفحة بعد جلب البيانات
function renderPageContents() {
    quranPageDiv.innerHTML = '';
    let currentSurahName = "";

    currentState.pageAyahs.forEach((ayah, index) => {
        // إظهار اسم السورة كتروئيسة مميزة عند بداية السورة أو تغيرها داخل الصفحة
        if (ayah.surah !== currentSurahName) {
            currentSurahName = ayah.surah;
            const surahHeader = document.createElement('div');
            surahHeader.className = 'surah-header-title';
            surahHeader.style.cssText = "color: var(--accent-color); font-weight: bold; margin: 25px 0 15px 0; border-bottom: 2px dashed var(--border-color); padding-bottom: 5px; font-size:1.4rem;";
            surahHeader.innerText = `﴿ ${currentSurahName} ﴾`;
            
            // إضافة البسملة إذا كانت بداية السورة (وليست التوبة والفاتحة)
            if (ayah.numberInSurah === 1 && ayah.surah !== "سُورَةُ الْفَاتِحَةِ" && ayah.surah !== "سُورَةُ التَّوْبَةِ") {
                // إزالة البسملة المدمجة أول آية إن وجدت لمنع التكرار البصري
                if (ayah.text.startsWith("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")) {
                    ayah.text = ayah.text.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
                }
                const bismillahDiv = document.createElement('div');
                bismillahDiv.style.cssText = "font-size: 1.5rem; margin-bottom: 15px; color: var(--text-primary);";
                bismillahDiv.innerText = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
                surahHeader.appendChild(bismillahDiv);
            }
            quranPageDiv.appendChild(surahHeader);
        }

        // بناء عنصر الآية
        const ayahSpan = document.createElement('span');
        ayahSpan.className = 'ayah-span';
        ayahSpan.id = `ayah-${ayah.number}`;
        ayahSpan.innerHTML = ` ${ayah.text} <span class="ayah-number">${ayah.numberInSurah}</span>`;
        
        // إعادة تطبيق التظليل المخزن
        if (currentState.highlightedAyahs.includes(ayah.number)) {
            ayahSpan.classList.add('selected-ayah');
        }
        
        // التحقق من الآية الجاري تشغيلها
        if (currentState.selectedAyahId === ayah.number) {
            ayahSpan.classList.add('currently-playing');
        }

        // تفاعل الضغط
        ayahSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            openAyahContextMenu(ayah, index, e.clientX, e.clientY);
        });

        quranPageDiv.appendChild(ayahSpan);
    });
}

// --- 5. التحكم بالقائمة المنبثقة للآيات والتفاعل ---
function openAyahContextMenu(ayah, index, x, y) {
    menuAyahTitle.innerText = `${ayah.surah} - آية (${ayah.numberInSurah})`;
    contextMenu.classList.remove('hidden');
    
    // تموضع ذكي داخل الشاشة (خصوصاً للموبايل)
    const menuWidth = 220;
    let leftPos = x;
    if (x + menuWidth > window.innerWidth) {
        leftPos = window.innerWidth - menuWidth - 20;
    }
    contextMenu.style.top = `${y + window.scrollY}px`;
    contextMenu.style.left = `${leftPos}px`;

    // ربط مهام القائمة بالبيانات الديناميكية الجديدة
    document.getElementById('opt-tafsir').onclick = () => { showTafsir(ayah); closeMenu(); };
    document.getElementById('opt-play').onclick = () => { playAudio(index); closeMenu(); };
    document.getElementById('opt-copy').onclick = () => { copyAyahToClipboard(ayah); closeMenu(); };
    document.getElementById('opt-select').onclick = () => { toggleAyahHighlight(ayah.number); closeMenu(); };
}

function closeMenu() { contextMenu.classList.add('hidden'); }

function showTafsir(ayah) {
    tafsirTitle.innerText = `${ayah.surah} - آية [ ${ayah.numberInSurah} ]`;
    tafsirBody.innerText = ayah.tafsir;
    tafsirModal.classList.remove('hidden');
}

function copyAyahToClipboard(ayah) {
    const text = `﴿${ayah.text}﴾ [${ayah.surah}: ${ayah.numberInSurah}]`;
    navigator.clipboard.writeText(text).then(() => {
        alert('تم نسخ الآية الكريمة بنجاح لمشاركتها.');
    });
}

function toggleAyahHighlight(ayahNumber) {
    const idx = currentState.highlightedAyahs.indexOf(ayahNumber);
    if (idx > -1) {
        currentState.highlightedAyahs.splice(idx, 1);
        document.getElementById(`ayah-${ayahNumber}`)?.classList.remove('selected-ayah');
    } else {
        currentState.highlightedAyahs.push(ayahNumber);
        document.getElementById(`ayah-${ayahNumber}`)?.classList.add('selected-ayah');
    }
    localStorage.setItem('saved_highlighted_ayahs', JSON.stringify(currentState.highlightedAyahs));
}

// --- 6. نظام إدارة الصوتيات المطور آية بآية (Audio Engine) ---
function playAudio(index) {
    if (index < 0 || index >= currentState.pageAyahs.length) return;
    
    // إزالة التظليل الصوتي السابق
    if (currentState.selectedAyahId) {
        document.getElementById(`ayah-${currentState.selectedAyahId}`)?.classList.remove('currently-playing');
    }

    currentState.playingAyahIndex = index;
    const currentAyah = currentState.pageAyahs[index];
    currentState.selectedAyahId = currentAyah.number;

    // إضافة تأثير التظليل للآية النشطة
    document.getElementById(`ayah-${currentAyah.number}`)?.classList.add('currently-playing');
    playingAyahText.innerText = `جاري تلاوة: ${currentAyah.surah} (${currentAyah.numberInSurah})`;

    // تركيب رابط الآية الصوتي المباشر والفريد للـ API
    const baseUrl = AUDIO_AUDIO_BASES[currentState.currentReader];
    audioEl.src = `${baseUrl}${currentAyah.number}.mp3`;
    
    audioEl.play();
    currentState.isAudioPlaying = true;
    playPauseBtn.innerText = "⏸️";
}

// التحكم بأزرار التشغيل السفلية
playPauseBtn.addEventListener('click', () => {
    if (currentState.pageAyahs.length === 0) return;
    
    if (currentState.isAudioPlaying) {
        audioEl.pause();
        currentState.isAudioPlaying = false;
        playPauseBtn.innerText = "▶️";
    } else {
        if (!currentState.selectedAyahId) {
            playAudio(0); // البدء من أول آية في الصفحة إن لم يتم الاختيار
        } else {
            audioEl.play();
            currentState.isAudioPlaying = true;
            playPauseBtn.innerText = "⏸️";
        }
    }
});

// التنقل الصوتي اليدوي بين الآيات
nextAudioBtn.addEventListener('click', () => {
    if (currentState.playingAyahIndex < currentState.pageAyahs.length - 1) {
        playAudio(currentState.playingAyahIndex + 1);
    } else {
        // إذا انتهت الصفحة ينتقل تلقائياً للصفحة التالية ويبدأ تلاوتها
        goToNextPage();
        setTimeout(() => { playAudio(0); }, 1500); // مهلة صغيرة لحين تحميل الصفحة الجديدة
    }
});

prevAudioBtn.addEventListener('click', () => {
    if (currentState.playingAyahIndex > 0) {
        playAudio(currentState.playingAyahIndex - 1);
    }
});

// إدارة انتهاء تلاوة الآية ودعم التكرار للحفظ
audioEl.addEventListener('ended', () => {
    if (currentState.isRepeatActive) {
        audioEl.currentTime = 0;
        audioEl.play();
    } else {
        nextAudioBtn.click(); // الانتقال التلقائي للآية التالية
    }
});

repeatBtn.addEventListener('click', () => {
    currentState.isRepeatActive = !currentState.isRepeatActive;
    if (currentState.isRepeatActive) {
        repeatBtn.classList.add('active');
        repeatStatusText.innerText = "مفعّل";
    } else {
        repeatBtn.classList.remove('active');
        repeatStatusText.innerText = "مغلق";
    }
});

readerSelect.addEventListener('change', (e) => {
    currentState.currentReader = e.target.value;
    if (currentState.selectedAyahId) {
        playAudio(currentState.playingAyahIndex); // إعادة تشغيل الآية بصوت القارئ الجديد فوراً
    }
});

// --- 7. التصفح وسحب الصفحات اللمسي (Swipe) ---
function goToNextPage() {
    if (currentState.currentPage < 604) { // الحد الأقصى لصفحات المصحف
        currentState.currentPage++;
        loadQuranPage(currentState.currentPage);
    }
}

function goToPrevPage() {
    if (currentState.currentPage > 1) {
        currentState.currentPage--;
        loadQuranPage(currentState.currentPage);
    }
}

prevPageBtn.addEventListener('click', goToPrevPage);
nextPageBtn.addEventListener('click', goToNextPage);

// دعم إيماءات السحب (Swipe) للشاشات اللمسية
let touchStartX = 0;
let touchEndX = 0;
document.getElementById('mushaf-wrapper').addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
document.getElementById('mushaf-wrapper').addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 60) goToNextPage();  // سحب لليسار
    if (touchEndX - touchStartX > 60) goToPrevPage();  // سحب لليمين
});

// --- 8. إدارة المظهر العام والوضع الليلي وباقي النوافذ ---
themeToggleBtn.addEventListener('click', () => {
    currentState.isDarkMode = !currentState.isDarkMode;
    if (currentState.isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerText = "☀️";
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.innerText = "🌙";
    }
});

toggleTipsBtn.addEventListener('click', () => { mushafSection.classList.add('hidden-section'); tipsSection.classList.remove('hidden-section'); });
closeTipsBtn.addEventListener('click', () => { tipsSection.classList.add('hidden-section'); mushafSection.classList.remove('hidden-section'); });
closeMenuBtn.addEventListener('click', closeMenu);
closeTafsirBtn.addEventListener('click', () => tafsirModal.classList.add('hidden'));
window.addEventListener('click', closeMenu);

// التشغيل الأولي المباشر عند تحميل التطبيق
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    loadQuranPage(currentState.currentPage);
});

// تسجيل الـ Service Worker لتمكين حفظ كافة الصفحات المستدعاة لتصبح Offline بالكامل
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log(err));
    });
}
    currentReader: 'minshawi',
    isDarkMode: true,
    selectedAyahId: null,
    playingAyahId: null,
    isAudioPlaying: false,
    isRepeatActive: false,
    highlightedAyahs: JSON.parse(localStorage.getItem('saved_highlighted_ayahs')) || [] // الحفظ المحلي للإشارات المرجعية
};

// --- 3. جلب عناصر واجهة المستخدم الإلكترونية ---
const quranPageDiv = document.getElementById('quran-page');
const pageNumDisplay = document.getElementById('page-number-display');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const themeToggleBtn = document.getElementById('theme-toggle');
const tipsSection = document.getElementById('tips-section');
const mushafSection = document.getElementById('mushaf-section');
const toggleTipsBtn = document.getElementById('toggle-tips-btn');
const closeTipsBtn = document.getElementById('close-tips-btn');

// عناصر القائمة المنبثقة والنوافذ
const contextMenu = document.getElementById('ayah-context-menu');
const menuAyahTitle = document.getElementById('menu-ayah-title');
const closeMenuBtn = document.getElementById('close-menu-btn');
const tafsirModal = document.getElementById('tafsir-modal');
const tafsirTitle = document.getElementById('tafsir-title');
const tafsirBody = document.getElementById('tafsir-body');
const closeTafsirBtn = document.getElementById('close-tafsir-btn');

// عناصر مشغل الصوت
const audioEl = document.getElementById('main-audio');
const playPauseBtn = document.getElementById('btn-play-pause');
const readerSelect = document.getElementById('reader-select');
const repeatBtn = document.getElementById('btn-repeat');
const repeatStatusText = document.getElementById('repeat-status');
const playingAyahText = document.getElementById('playing-ayah-text');

// --- 4. معالجة وتوليد صفحة المصحف ---
function renderMushafPage(pageNumber) {
    quranPageDiv.innerHTML = '';
    const pageData = mockQuranData.pages[pageNumber];

    if (!pageData) {
        quranPageDiv.innerHTML = `<div style="padding:20px; font-size:1.2rem;">نعمل حالياً على إضافة باقي الصفحات بجودة ومساحة مثالية لتشغيلها بالكامل دون إنترنت...</div>`;
        pageNumDisplay.innerText = `صفحة: ${pageNumber}`;
        return;
    }

    pageNumDisplay.innerText = `صفحة: ${pageNumber}`;
    let currentSurahName = "";

    pageData.forEach(ayah => {
        // إذا تغيرت السورة داخل نفس الصفحة، يتم طباعة ترويسة السورة أولاً
        if (ayah.surah !== currentSurahName) {
            currentSurahName = ayah.surah;
            const surahHeader = document.createElement('div');
            surahHeader.className = 'surah-header-title';
            surahHeader.style.cssText = "color: var(--accent-color); font-weight: bold; margin: 20px 0; border-bottom: 2px dashed var(--border-color); padding-bottom: 5px;";
            surahHeader.innerText = `﴿ سُورَةُ ${currentSurahName} ﴾`;
            quranPageDiv.appendChild(surahHeader);
        }

        // إنشاء العنصر النصي للآية
        const ayahSpan = document.createElement('span');
        ayahSpan.className = 'ayah-span';
        ayahSpan.id = `ayah-${ayah.id}`;
        ayahSpan.innerHTML = `${ayah.text} <span class="ayah-number">${ayah.number}</span> `;
        
        // التحقق إن كانت مضللة سابقاً (تم الحفظ للحفظ والمراجعة)
        if (currentState.highlightedAyahs.includes(ayah.id)) {
            ayahSpan.classList.add('selected-ayah');
        }
        
        // التحقق إن كانت هي الآية التي تتلى حالياً
        if (currentState.playingAyahId === ayah.id) {
            ayahSpan.classList.add('currently-playing');
        }

        // حدث الضغط على الآية لإظهار قائمة الخيارات (Context Menu)
        ayahSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            openAyahContextMenu(ayah, e.clientX, e.clientY);
        });

        quranPageDiv.appendChild(ayahSpan);
    });
}

// --- 5. التعامل مع القائمة المنبثقة للتفاعل (Context Menu) ---
function openAyahContextMenu(ayah, x, y) {
    currentState.selectedAyahId = ayah.id;
    menuAyahTitle.innerText = `${ayah.surah} - آية (${ayah.number})`;
    
    contextMenu.classList.remove('hidden');
    
    // ضبط موقع القائمة بشكل ذكي بناءً على إحداثيات الضغط لمنع خروجها عن الشاشة
    contextMenu.style.top = `${y + window.scrollY}px`;
    contextMenu.style.left = `${x}px`;

    // ربط المهام بالأزرار داخل القائمة
    document.getElementById('opt-tafsir').onclick = () => { showTafsir(ayah); closeMenu(); };
    document.getElementById('opt-play').onclick = () => { playAudioFromAyah(ayah); closeMenu(); };
    document.getElementById('opt-copy').onclick = () => { copyAyahToClipboard(ayah); closeMenu(); };
    document.getElementById('opt-select').onclick = () => { toggleAyahHighlight(ayah.id); closeMenu(); };
}

function closeMenu() {
    contextMenu.classList.add('hidden');
}

function showTafsir(ayah) {
    tafsirTitle.innerText = `تفسير آية رقم (${ayah.number}) من سورة ${ayah.surah}`;
    tafsirBody.innerText = ayah.tafsir;
    tafsirModal.classList.remove('hidden');
}

function copyAyahToClipboard(ayah) {
    const textToCopy = ` قال تعالى: { ${ayah.text} } [${ayah.surah}: آية ${ayah.number}] - تم النسخ من تطبيق حفظ القرآن.`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('تم نسخ الآية الكريمة والتشكيل إلى الحافظة بنجاح.');
    });
}

function toggleAyahHighlight(ayahId) {
    const index = currentState.highlightedAyahs.indexOf(ayahId);
    if (index > -1) {
        currentState.highlightedAyahs.splice(index, 1);
        document.getElementById(`ayah-${ayahId}`)?.classList.remove('selected-ayah');
    } else {
        currentState.highlightedAyahs.push(ayahId);
        document.getElementById(`ayah-${ayahId}`)?.classList.add('selected-ayah');
    }
    // حفظ التحديث في المتصفح للعودة إليه بدون إنترنت
    localStorage.setItem('saved_highlighted_ayahs', JSON.stringify(currentState.highlightedAyahs));
}

// --- 6. منطق عمل وإدارة الصوتيات والتكرار ---
function playAudioFromAyah(ayah) {
    // إزالة التظليل الصوتي السابق إن وجد
    if (currentState.playingAyahId) {
        document.getElementById(`ayah-${currentState.playingAyahId}`)?.classList.remove('currently-playing');
    }

    currentState.playingAyahId = ayah.id;
    currentState.isAudioPlaying = true;
    document.getElementById(`ayah-${ayah.id}`)?.classList.add('currently-playing');
    
    playingAyahText.innerText = `جاري تلاوة: سورة ${ayah.surah} - آية (${ayah.number})`;
    playPauseBtn.innerText = "⏸️";

    // تركيب مسار الملف الصوتي الفعلي (نظام الترقيم الثلاثي في خوادم القرآن مثلاً: سورة 001، آية 002)
    // لتسهيل المحاكاة، سنحاكي المسار الصوتي، وفي النسخة الكاملة يُربط بالـ Service Worker لتحميل الملف
    // سنستخدم ملف صوتي محاكي، أو نقوم بتوليد ملف ناطق افتراضي إذا تعذر التوصيل
    audioEl.src = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`; // رابط تجريبي للتحقق من هندسة الصوت
    audioEl.play().catch(err => console.log("تحذير تشغيل الصوت: يتطلب تفعيل الإذن من المتصفح أولاً."));
}

// معالجة الضغط على زر تشغيل / إيقاف الرئيسي السفلي
playPauseBtn.addEventListener('click', () => {
    if (!currentState.playingAyahId) {
        // إذا لم يختر آية معينة، يبدأ من أول آية في الصفحة الحالية
        const firstAyah = mockQuranData.pages[currentState.currentPage]?.[0];
        if (firstAyah) playAudioFromAyah(firstAyah);
        return;
    }

    if (currentState.isAudioPlaying) {
        audioEl.pause();
        currentState.isAudioPlaying = false;
        playPauseBtn.innerText = "▶️";
    } else {
        audioEl.play();
        currentState.isAudioPlaying = true;
        playPauseBtn.innerText = "⏸️";
    }
});

// ميزة التكرار المستمر لآية معينة بغرض الحفظ والمراجعة
repeatBtn.addEventListener('click', () => {
    currentState.isRepeatActive = !currentState.isRepeatActive;
    if (currentState.isRepeatActive) {
        repeatBtn.classList.add('active');
        repeatStatusText.innerText = "مفعّل";
    } else {
        repeatBtn.classList.remove('active');
        repeatStatusText.innerText = "مغلق";
    }
});

// عند انتهاء الملف الصوتي الحالي للآية
audioEl.addEventListener('ended', () => {
    if (currentState.isRepeatActive && currentState.playingAyahId) {
        // إعادة تشغيل نفس الآية فوراً إذا كان خيار التكرار مفعلاً
        audioEl.currentTime = 0;
        audioEl.play();
    } else {
        // الانتقال للآية التالية تلقائياً
        handleNextAudio();
    }
});

function handleNextAudio() {
    // الكود البرمجي للانتقال للآية التالية في مصفوفة البيانات
    alert("التنقل التلقائي أو اليدوي بين ملفات المقاطع الصوتية للآيات المفردة.");
}

// --- 7. إدارة السحب والتنقل اللمسي (Swipe Controls) لدعم الـ Mobile الفوري ---
let touchStartX = 0;
let touchEndX = 0;
const mushafWrapper = document.getElementById('mushaf-wrapper');

mushafWrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

mushafWrapper.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
});

function handleSwipeGesture() {
    // إذا سحب المستخدم لليسار (التنقل لصفحة قادمة) ولليمين (لصفحة سابقة) متوافقاً مع اتجاه النص العربي
    if (touchStartX - touchEndX > 60) {
        // سحب لليسار -> الصفحة التالية
        goToNextPage();
    }
    if (touchEndX - touchStartX > 60) {
        // سحب لليمين -> الصفحة السابقة
        goToPrevPage();
    }
}

function goToNextPage() {
    if (mockQuranData.pages[currentState.currentPage + 1]) {
        currentState.currentPage++;
        renderMushafPage(currentState.currentPage);
    }
}

function goToPrevPage() {
    if (currentState.currentPage > 1) {
        currentState.currentPage--;
        renderMushafPage(currentState.currentPage);
    }
}

prevPageBtn.addEventListener('click', goToPrevPage);
nextPageBtn.addEventListener('click', goToNextPage);

// --- 8. التحكم في القوائم والوضع الليلي (Dark Mode) ---
themeToggleBtn.addEventListener('click', () => {
    currentState.isDarkMode = !currentState.isDarkMode;
    if (currentState.isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerText = "☀️";
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleBtn.innerText = "🌙";
    }
});

// فتح وإغلاق صفحة نصائح الحفظ
toggleTipsBtn.addEventListener('click', () => {
    mushafSection.classList.add('hidden-section');
    tipsSection.classList.remove('hidden-section');
});
closeTipsBtn.addEventListener('click', () => {
    tipsSection.classList.add('hidden-section');
    mushafSection.classList.remove('hidden-section');
});

// إغلاق النوافذ عند الضغط في أي مكان خارجي
closeMenuBtn.addEventListener('click', closeMenu);
closeTafsirBtn.addEventListener('click', () => tafsirModal.classList.add('hidden'));
window.addEventListener('click', () => { closeMenu(); });

// تغيير القارئ المفضل
readerSelect.addEventListener('change', (e) => {
    currentState.currentReader = e.target.value;
    if (currentState.playingAyahId) {
        // إعادة التلاوة بالقارئ الجديد
        alert(`تم تغيير القارئ، سيتم جلب تلاوة الشيخ المختار.`);
    }
});

// التفعيل الأولي عند فتح التطبيق لأول مرة
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-theme', 'dark'); // تفعيل الوضع الليلي افتراضياً
    renderMushafPage(currentState.currentPage);
});

function updatePage() {
  pageImage.src = `pages/${currentPage}.png`;
  document.getElementById("pageNumber").innerText = "صفحة " + currentPage;
}

// وظائف الأزرار
function showTafsir() {
  alert("سيتم إضافة التفسير لاحقًا");
}

function playAudio() {
  alert("تشغيل التلاوة قريبًا");
}

function shareAyah() {
  alert("مشاركة الآية قريبًا");
}

function toggleSettings() {
  document.getElementById("settingsPanel").classList.toggle("hidden");
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
}
// تسجيل الـ Service Worker لتمكين العمل دون إنترنت وخصائص الـ PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('تم تسجيل الـ Service Worker بنجاح والجاهزية للعمل Offline المطلق!', reg.scope))
            .catch(err => console.log('فشل تسجيل الـ Service Worker:', err));
    });
}
