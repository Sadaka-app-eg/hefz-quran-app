let currentPage = 1;

const pageImage = document.getElementById("pageImage");
const mushaf = document.getElementById("mushaf");
const menu = document.getElementById("ayahMenu");

mushaf.onclick = () => {
  menu.classList.toggle("hidden");
};

// تغيير الصفحات بالسحب
let startX = 0;

mushaf.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

mushaf.addEventListener("touchend", e => {
  let endX = e.changedTouches[0].clientX;

  if (endX < startX) {
    nextPage();
  } else {
    prevPage();
  }
});

function nextPage() {
  currentPage++;
  updatePage();
}

function prevPage() {
  if (currentPage > 1) currentPage--;
  updatePage();
}

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
