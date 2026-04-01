/* [1] 전역 변수 설정 START */
let selectedLat = 37.5665; let selectedLon = 126.9780;
let globalData = null;
let viewedFortunes = { love: false, money: false, career: false, health: false };
let isSwitching = false;
let loadingInterval;
const rootStyle = document.documentElement.style;
/* [1] 전역 변수 설정 END */


/* ==========================================
   [2] 페이드인/아웃 스토리 엔진 START
   ========================================== */
function playStory(lines, callback) {
    const storyText = document.getElementById('story-text');
    const screen = document.getElementById('screen-story');

    storyText.innerHTML = '';
    storyText.style.opacity = '0';

    switchScreen('screen-story');

    let lineIndex = 0;
    let isAnimating = false;

    const handleNext = () => {
        if (isAnimating) return;
        isAnimating = true;

        storyText.style.transition = "all 0.3s ease";
        storyText.style.opacity = "0";
        storyText.style.transform = "translateY(-20px)";

        setTimeout(() => {
            lineIndex++;
            showLine();
        }, 300);
    };

    function showLine() {
        if (lineIndex >= lines.length) {
            screen.removeEventListener('click', handleNext);
            callback();
            return;
        }

        let lineData = lines[lineIndex];
        let textStr = typeof lineData === 'string' ? lineData : lineData.text;
        let isGlitch = typeof lineData === 'object' && lineData.glitch;

        // 텍스트만 넣고 커서는 CSS ::after 로 처리
        storyText.innerHTML = textStr;

        if (isGlitch) {
            storyText.classList.add('glitch-active');
            storyText.style.color = "#ff00ff";
            sfx.glitch();
        } else {
            storyText.classList.remove('glitch-active');
            storyText.style.color = "#00ff41";
            sfx.textAppear();
        }

        storyText.style.transition = "none";
        storyText.style.transform = "translateY(20px)";

        setTimeout(() => {
            storyText.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            storyText.style.opacity = "1";
            storyText.style.transform = "translateY(0)";
            isAnimating = false;
        }, 50);
    }

    screen.addEventListener('click', handleNext);
    setTimeout(() => { showLine(); }, 600);
}

/* [컷 1] 인트로 스토리 — 8개 대사 */
function initTerminal() {
    playStory([
        { text: "...",          glitch: true },
        { text: ".....지직",    glitch: true },
        { text: "...ㅇ..!!",   glitch: true },
        "안녕!! 나는 저 먼 플루라는 행성에서 지금 시그널을 보내고있는 플루토라해",
        "나를 만났다니... 너 정말 행운인걸?",
        "나는 너의 미래를 아주 조금! 볼 수 있거든!",
        "너랑 나랑 이어진건 운명이니까! 한번 내가 봐줄게!",
        "너의 탄생을 한번 확인해볼까?"
    ], () => {
        switchScreen('screen-input');
        setTimeout(() => { map.invalidateSize(); }, 500);
    });
}
function bootScreen() {
    const container = document.getElementById('container');
    const content   = document.getElementById('content');

    const onDone = () => {
        setScreenColor('#2a2a2a', '#111111');
        content.style.visibility = 'visible';
        initTerminal();
    };

    container.style.animation = 'tv-on 1.4s cubic-bezier(0.23, 1, 0.32, 1) forwards';
    try { sfx.tvOn(); } catch (_) {}

    // animationend 안 오면 1.6초 후 강제 실행
    const fallback = setTimeout(onDone, 1600);
    container.addEventListener('animationend', () => {
        clearTimeout(fallback);
        onDone();
    }, { once: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootScreen);
} else {
    bootScreen();
}
/* [2] 스토리 엔진 END */


/* [3] 초기화 및 유틸리티 START */
document.addEventListener('DOMContentLoaded', () => {
    const noTimeBox = document.getElementById('noTime');
    const timeInput = document.getElementById('birthTime');
    if (noTimeBox && timeInput) {
        noTimeBox.addEventListener('change', (e) => {
            if (e.target.checked) {
                timeInput.value = "";
                timeInput.disabled = true;
            } else {
                timeInput.disabled = false;
            }
        });
    }
});

const map = L.map('map', { zoomControl: false }).setView([selectedLat, selectedLon], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let marker = L.marker([selectedLat, selectedLon]).addTo(map);
map.on('click', (e) => { selectedLat = e.latlng.lat; selectedLon = e.latlng.lng; marker.setLatLng(e.latlng); });
setTimeout(() => { map.invalidateSize(); }, 500);

function setScreenColor(center, edge) {
    rootStyle.setProperty('--screen-bg-center', center);
    rootStyle.setProperty('--screen-bg-edge', edge);
}

function switchScreen(id) {
    if (isSwitching) return;
    isSwitching = true;

    const content = document.getElementById('content');
    const container = document.getElementById('container');

    content.classList.add('glitch-active');
    if (container) container.classList.add('warping-bg');
    content.classList.add('warping-content');
    sfx.transition();

    content.scrollTop = 0;

    setTimeout(() => {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => s.classList.remove('active'));

        const target = document.getElementById(id);
        if (target) target.classList.add('active');
    }, 150);

    setTimeout(() => {
        content.classList.remove('glitch-active', 'warping-content');
        if (container) container.classList.remove('warping-bg');
        isSwitching = false;
    }, 450);
}
/* [3] 초기화 및 유틸리티 END */


/* [4] 데이터 통신 및 로딩 애니메이션 START */
function startAnalysis() {
    const name = document.getElementById('userName').value;
    const date = document.getElementById('birthDate').value;
    const time = document.getElementById('birthTime').value || "12:00";

    if (!name || !date) { showError("데이터를 입력하라."); return; }

    startLoadingAnimation();
    sfx.startLoading();

    fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, time, lat: selectedLat, lon: selectedLon })
    })
    .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    })
    .then(data => {
        stopLoadingAnimation();

        if (data.error) {
            showError(data.error);
            return;
        }

        globalData = data;

        document.getElementById('res-personality').innerText = data.personality;
        document.getElementById('res-pros').innerText = data.pros;
        document.getElementById('res-cons').innerText = data.cons;

        const resultBoxes = document.querySelectorAll('#screen-personality .result-box');
        resultBoxes.forEach(box => {
            box.style.opacity = "0";
            box.style.transform = "translateY(20px)";
            box.style.transition = "none";
        });

        showAnimalResult(data);
    })
    .catch(err => {
        console.error("Analysis Error:", err);
        showError("별과의 연결이 불안정하거나 서버 응답이 없습니다.");
    });
}

/* [컷 3] 로딩 애니메이션 */
function startLoadingAnimation() {
    switchScreen('screen-loading');
    setScreenColor('#08081a', '#020208');
    const screen = document.getElementById('container');

    for (let i = 0; i < 12; i++) {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        star.style.left  = `${Math.random() * 85}%`;
        star.style.top   = `${Math.random() * 80}%`;
        star.style.animationDuration  = `${Math.random() * 1.5 + 1.2}s`;
        star.style.animationDelay     = `${Math.random() * 4}s`;
        screen.appendChild(star);
    }

    for (let i = 0; i < 25; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 1;
        star.style.width  = star.style.height = `${size}px`;
        star.style.left   = `${Math.random() * 95}%`;
        star.style.top    = `${Math.random() * 95}%`;
        star.style.animationDuration = `${Math.random() * 1.8 + 0.8}s`;
        star.style.animationDelay    = `${Math.random() * 2}s`;
        screen.appendChild(star);
    }

    let dots = 1;
    loadingInterval = setInterval(() => {
        dots = (dots % 3) + 1;
        document.getElementById('loading-text').innerText = "별의 소리를 듣는중" + ".".repeat(dots);
    }, 600);
}

function stopLoadingAnimation() {
    clearInterval(loadingInterval);
    setScreenColor('#444444', '#111111');
    document.querySelectorAll('.star, .shooting-star').forEach(s => s.remove());
    isSwitching = false;
    sfx.stopLoading();
}

function showError(msg) {
    stopLoadingAnimation();
    const el = document.getElementById('error-msg');
    if (el) {
        el.textContent = '⚠ ' + msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 6000);
    }
    switchScreen('screen-input');
}
/* [4] 데이터 통신 및 로딩 애니메이션 END */


/* [5] 컷별 스토리 전환 및 화면 제어 START */

/* [컷 4] 동물 결과 표시 */
function showAnimalResult(data) {
    const animal = data.animal;
    if (!animal) {
        playStory(["내가 너의 성격과 장단점을 알아왔어!"], () => {
            switchScreen('screen-personality');
            const boxes = document.querySelectorAll('#screen-personality .result-box');
            setTimeout(() => { displayResultsSequentially(boxes); }, 500);
        });
        return;
    }

    document.getElementById('animal-box-title').innerText  = `[TYPE] ${animal.name.toUpperCase()}_SIGNAL`;
    document.getElementById('animal-name').innerText        = animal.name;
    document.getElementById('animal-keyword').innerText     = `# ${animal.keyword}`;
    document.getElementById('animal-description').innerText = animal.description;

    playStory([
        `오 너는 ${animal.name}과 같은 느낌이야`
    ], () => {
        switchScreen('screen-animal');
    });
}

/* [컷 5] 동물 → 상세 성격 스토리 */
function goToPersonalityStory() {
    playStory([
        "하지만 동물이 전부는 아니야",
        "사자도 어떤 사자는 소심할 수 있잖아?",
        "어떤 고양이도 개냥이일 수 있고!",
        "너는 어떤 성격인지 알려줄게"
    ], () => {
        switchScreen('screen-personality');
        const boxes = document.querySelectorAll('#screen-personality .result-box');
        setTimeout(() => { displayResultsSequentially(boxes); }, 500);
    });
}

async function displayResultsSequentially(boxes) {
    for (let i = 0; i < boxes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const box = boxes[i];
        box.classList.add('glitch-active');
        box.style.transition = "all 0.4s ease";
        box.style.opacity = "1";
        box.style.transform = "translateY(0)";
        sfx.reveal();
        setTimeout(() => { box.classList.remove('glitch-active'); }, 400);
    }
}

/* [컷 6] 성격 → 운세 선택 스토리 */
function goToSelectionStory() {
    const yr = (globalData && globalData.fortune_year) ? globalData.fortune_year : new Date().getFullYear();
    playStory([
        "어때 좀 맞는거같아?",
        "이번엔 너가 궁금해할만한걸 가져왔어!",
        `${yr}년 올해의 운세지!`
    ], () => { switchScreen('screen-selection'); });
}

/* [컷 6] 운세 상세 표시 */
function showFortune(type) {
    const bgColors = {
        'love':   ['#3a0d2e', '#1a0515'],
        'money':  ['#0d3a1a', '#051a0d'],
        'career': ['#0d2e3a', '#05151a'],
        'health': ['#3a3a0d', '#1a1a05']
    };
    const box = document.getElementById('fortune-box');
    const t   = document.getElementById('fortune-title');
    const st  = document.getElementById('fortune-sub-title');
    const c   = document.getElementById('res-fortune-content');
    box.className = 'result-box';

    viewedFortunes[type] = true;
    document.querySelectorAll('#screen-selection .cyber-btn').forEach(btn => {
        if (btn.id !== `btn-${type}`) btn.classList.add('hidden-btn');
    });
    setScreenColor(bgColors[type][0], bgColors[type][1]);

    const yr = globalData.fortune_year || new Date().getFullYear();
    const f  = globalData.fortune || globalData.fortune_2026 || {};
    if      (type === 'love')   { box.classList.add('theme-love');   t.innerText = `${yr}_LOVE`;   st.innerText = "[♥] LOVE_SIGNAL";  c.innerText = f.love; }
    else if (type === 'money')  { box.classList.add('theme-money');  t.innerText = `${yr}_MONEY`;  st.innerText = "[$] WEALTH_STATUS"; c.innerText = f.money; }
    else if (type === 'career') { box.classList.add('theme-career'); t.innerText = `${yr}_CAREER`; st.innerText = "[!] CAREER_UPDATE"; c.innerText = f.career; }
    else if (type === 'health') { box.classList.add('theme-health'); t.innerText = `${yr}_HEALTH`; st.innerText = "[+] VITALITY_LOG";  c.innerText = f.health; }

    switchScreen('screen-fortune-detail');

    if (viewedFortunes.love && viewedFortunes.money && viewedFortunes.career && viewedFortunes.health) {
        document.getElementById('btn-final-report').classList.remove('hidden-btn');
    }
}

function returnToSelection() {
    setScreenColor('#444444', '#111111');
    ['love', 'money', 'career', 'health'].forEach(type => {
        const btn = document.getElementById(`btn-${type}`);
        if (btn) {
            if (viewedFortunes[type]) btn.classList.add('hidden-btn');
            else btn.classList.remove('hidden-btn');
        }
    });
    switchScreen('screen-selection');
}

/* [컷 7] 최종 리포트 전 스토리 */
function showFinalReport() {
    playStory([
        "어때? 올해 좀 설레는 일이 있었으면 좋겠다!",
        "그럼 마지막으로 내가 너한테 해주고 싶은말이 있어"
    ], () => {
        const summaryBox = document.querySelector('#screen-final-advice .result-box:nth-child(2)');
        const whisperBox = document.querySelector('#screen-final-advice .result-box:nth-child(3)');
        if (summaryBox) summaryBox.className = 'result-box theme-purple';
        if (whisperBox) whisperBox.className = 'result-box theme-whisper';
        const f = globalData.fortune || globalData.fortune_2026 || {};
        document.getElementById('res-summary').innerText      = f.summary;
        document.getElementById('res-final-advice').innerText = f.final_advice;
        switchScreen('screen-final-advice');
    });
}

/* [컷 8] 엔딩 — 지직 후 TV 꺼짐 */
function startEnding() {
    playStory([
        { text: "엇! 나 지금 ㅜㅜ 연..ㄱㄹ..이 끈ㅎ기기 직전이야!!", glitch: true },
        { text: "하지만 내가 너가 어디있는지 아니까! 내 친구들을 보내줄게!! 조금만 기다려!", glitch: true }
    ], () => {
        triggerTVOff();
    });
}

function showCompatScreen() {
    const compat = globalData.compatibility || { good: [], bad: [] };

    const goodEl = document.getElementById('compat-good');
    const badEl  = document.getElementById('compat-bad');

    goodEl.innerHTML = compat.good.map(a =>
        `<span class="compat-tag compat-good">${a}</span>`
    ).join('');
    badEl.innerHTML = compat.bad.map(a =>
        `<span class="compat-tag compat-bad">${a}</span>`
    ).join('');

    switchScreen('screen-compat');
}

async function shareResult() {
    const animal  = globalData.animal?.name || '?';
    const keyword = globalData.animal?.keyword || '';
    const fortune = globalData.fortune || globalData.fortune_2026 || {};
    const summary = fortune.summary || '';
    const good    = (globalData.compatibility?.good || []).join(', ');

    const text = `✦ PLUTO SIGNAL ✦\n나의 수호동물: ${animal} (${keyword})\n\n${summary}\n\n잘 맞는 동물: ${good}\n\n나의 운세 보러가기 →`;

    if (navigator.share) {
        try {
            await navigator.share({ title: 'PLUTO SIGNAL', text, url: window.location.href });
        } catch (_) {}
    } else {
        try {
            await navigator.clipboard.writeText(`${text} ${window.location.href}`);
            const btn = document.querySelector('#screen-compat .cyber-btn');
            const orig = btn.innerText;
            btn.innerText = 'COPIED ✓';
            setTimeout(() => { btn.innerText = orig; }, 2000);
        } catch (_) {}
    }
}

/* [컷 8] 브라운관 TV 꺼지는 효과 */
function triggerTVOff() {
    const content    = document.getElementById('content');
    const container  = document.getElementById('container');
    const endOverlay = document.getElementById('end-overlay');

    content.classList.add('ending-glitch');
    sfx.tvOff();

    setTimeout(() => {
        content.classList.remove('ending-glitch');
        container.style.transformOrigin = 'center center';
        container.style.animation = 'tv-off 1.2s cubic-bezier(0.5, 0, 1, 0.5) forwards';

        setTimeout(() => {
            content.style.visibility = 'hidden';
            endOverlay.classList.add('active');
        }, 1200);
    }, 900);
}
/* [5] 컷별 스토리 전환 및 화면 제어 END */
