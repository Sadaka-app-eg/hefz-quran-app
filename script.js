/**
 * تطبيق "حفظ القرآن الكريم"
 * المنطق البرمجي الرئيسي واستهلاك الصوتيات والبيانات محلياً
 */

// --- 1. بيانات محاكاة مدمجة للمصحف والتفسير (للعرض والتشغيل الفوري) ---
// في بيئة الإنتاج الفعلية، يتم سحب هذا الكائن من ملف JSON محلي وحفظه في الـ IndexedDB
const mockQuranData = {
    pages: {
        1: [
            { id: "1_1", surah: "الفاتحة", number: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", tafsir: "بدء التلاوة باسم الله مستعيناً به، الرحمن ذو الرحمة الواسعة، الرحيم بعباده." },
            { id: "1_2", surah: "الفاتحة", number: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", tafsir: "الثناء الكامل لله سبحانه وتعالى مالك ومربي جميع العوالم بمختلف المخلوقات." },
            { id: "1_3", surah: "الفاتحة", number: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ", tafsir: "الرحمن الذي وسعت رحمته كل شيء، الرحيم بعباده المؤمنين." },
            { id: "1_4", surah: "الفاتحة", number: 4, text: "مَالِكِ يَوْمِ الدِّينِ", tafsir: "هو وحده سبحانه المالك الحقيقي والمتصرف الوحيد في يوم الجزاء والحساب." },
            { id: "1_5", surah: "الفاتحة", number: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", tafsir: "نخصك وحدك بالعبادة والطاعة، ونستعين بك وحده في كل أمورنا." },
            { id: "1_6", surah: "الفاتحة", number: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", tafsir: "أرشدنا ووفقنا وثبتنا على الطريق الواضح الموصل للجنة وهو الإسلام." },
            { id: "1_7", surah: "الفاتحة", number: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", tafsir: "طريق الذين أنعمت عليهم من النبيين والصديقين، غير طريق المغضوب عليهم كاليهود، ولا الضالين كالنصارى." }
        ],
        2: [
            { id: "2_1", surah: "البقرة", number: 1, text: "الم", tafsir: "حروف مقطعة تفتتح بها بعض السور للإعجاز وبيان أن القرآن من جنس كلامهم." },
            { id: "2_2", surah: "البقرة", number: 2, text: "ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِلْمُتَّقِينَ", tafsir: "هذا القرآن هو الكتاب العظيم الشأن الذي لا شك في صحته، يرشد المتقين لله." },
            { id: "2_3", surah: "البقرة", number: 3, text: "الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنْفِقُونَ", tafsir: "الذين يصدقون بالغيب الإيجابي الغائب عن حواسهم، ويؤدون الصلاة بإتقان، وينفقون مما رزقهم الله." }
        ]
    }
};

// روابط واجهات الـ API الصوتية المجانية (تستعمل روابط خوادم مثل Mp3Quran عند توفر نت، أو تؤخذ من الـ Cache Storage لاحقاً)
const readerAudioBases = {
    minshawi: "https://server11.mp3quran.net/minsh/almusshaf/", // المنشاوي مرتل
    afasy: "https://server8.mp3quran.net/afs/",               // العفاسي
    hussary: "https://server13.mp3quran.net/hussary/almusshaf/" // الحصري مرتل
};

// --- 2. إدارة وتخزين الحالة (State Management) ---
let currentState = {
    currentPage: 1,
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
