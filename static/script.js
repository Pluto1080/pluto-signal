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

         let words = textStr.split(' '); // 대사를 띄어쓰기 기준으로 나눕니다.
        let lastWord = words.pop();     // 가장 마지막 단어만 쏙 뽑아냅니다 (예: "행운인걸?").
        
        // 마지막 단어와 커서를 <span style="white-space: nowrap;">으로 묶어서 절대 줄바꿈이 일어나지 않게 용접합니다.
        storyText.innerHTML = words.join(' ') + ' <span style="white-space: nowrap;">' + lastWord + '<span class="cursor-blink">▮</span></span>';
       
        if (isGlitch) {
            storyText.classList.add('glitch-active');
            storyText.style.color = "#ff00ff";
        } else {
            storyText.classList.remove('glitch-active');
            storyText.style.color = "#00ff41";
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
        { text: "...ㅇ..어 됐다!!!",   glitch: true },
        "안녕!",
        "나는 저 먼 플루라는 행성에서 지금 시그널을 보내고있는 플루토라해",
        "나를 만났다니... 너 정말 행운인걸?",
        "왜냐면 난 별을 측정하면서, 너의 미래를 조금 볼 수 있거든!",
        "너랑 나랑 이렇게 닿은 건 운명이니까!<br/>한번 내가 봐줄게!",
        { text: "너의 탄생을 확인해 보자!",   glitch: true } 
    ], () => {
        switchScreen('screen-input');
        setTimeout(() => { map.invalidateSize(); }, 500);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // TV를 먼저 켜고, 다 켜지면(callback) 인트로 스토리를 시작합니다.
        triggerTVOn(() => {
            initTerminal();
        });
    });
} else {
    triggerTVOn(() => {
        initTerminal();
    });
}
/* [2] 스토리 엔진 END */


/* [3] 초기화 및 유틸리티 START */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // [추가] 초기화: 브라운관 void 상태를 유지하기 위해 내용물을 숨깁니다.
        const content = document.getElementById('content');
        if (content) content.style.visibility = 'hidden';

        // TV를 먼저 켜고, 다 켜지면 인트로 스토리를 시작합니다.
        triggerTVOn(() => {
            initTerminal();
        });
    });
} else {
    // [추가] 초기화
    const content = document.getElementById('content');
    if (content) content.style.visibility = 'hidden';
    
    triggerTVOn(() => {
        initTerminal();
    });
}

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

    if (!name || !date) { alert("데이터를 입력하라."); return; }

    startLoadingAnimation();

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
            alert(data.error);
            switchScreen('screen-input');
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
        stopLoadingAnimation();
        console.error("Analysis Error:", err);
        alert("별과의 연결이 불안정하거나 서버 응답이 없습니다.");
        switchScreen('screen-input');
    });
}

/* [컷 3] 로딩 애니메이션 */
function startLoadingAnimation() {
    switchScreen('screen-loading');
    setScreenColor('#08081a', '#020208');
    const screen = document.getElementById('content');

    for (let i = 0; i < 12; i++) {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        star.style.left  = `${Math.random() * 55 + 5}%`;
        star.style.top   = `${Math.random() * 55 + 5}%`;
        star.style.animationDuration  = `${Math.random() * 1.5 + 1.2}s`;
        star.style.animationDelay     = `${Math.random() * 4}s`;
        screen.appendChild(star);
    }

    for (let i = 0; i < 25; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 1;
        star.style.width  = star.style.height = `${size}px`;
        star.style.left   = `${Math.random() * 88 + 6}%`;
        star.style.top    = `${Math.random() * 88 + 6}%`;
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
}
/* [4] 데이터 통신 및 로딩 애니메이션 END */


/* [5] 컷별 스토리 전환 및 화면 제어 START */

/* [컷 4] 동물 결과 표시 */
function showAnimalResult(data) {
    const animal = data.animal;
    if (!animal) {
        // ... (생략)
        return;
    }

    // 화면에는 수식어 없이 기본 동물만 출력
    document.getElementById('animal-box-title').innerText  = `[TYPE] ${animal.name.toUpperCase()}_SIGNAL`;
    document.getElementById('animal-name').innerText        = animal.name;
    document.getElementById('animal-keyword').innerText     = `# ${animal.keyword}`;
    document.getElementById('animal-description').innerText = animal.description;

    playStory([
        `오 너는...`,
        `${animal.name}이구나!`
    ], () => {
        switchScreen('screen-animal');
    });
}

/* [컷 5] 동물 → 상세 성격 스토리 (수식어 공개!) */
function goToPersonalityStory() {
    // AI가 만들어둔 수식어 가져오기
    const modifier = globalData.animal_modifier ? globalData.animal_modifier : "특별한";
    const animalName = globalData.animal.name;

    playStory([
        "하지만 이런 진부한 동물 이야기를 하려고 너랑 말하는게 아니라구~",
        `너는 그냥 평범한 ${animalName}이(가) 아니라...`,
        `바로 [ ${modifier} ] 타입이야!`,
        "너의 진짜 성격을 알려줄게"
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
        setTimeout(() => { box.classList.remove('glitch-active'); }, 400);
    }
}

/* [컷 6] 성격 → 운세 선택 스토리 */
function goToSelectionStory() {
    playStory([
        "어때 좀 맞는거같아?",
        "이번엔 너가 궁금해할만한걸 가져왔어!",
        "2026년 올해의 운세지!"
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

    if      (type === 'love')   { box.classList.add('theme-love');   t.innerText = "2026_LOVE";   st.innerText = "[♥] LOVE_SIGNAL";  c.innerText = globalData.fortune_2026.love; }
    else if (type === 'money')  { box.classList.add('theme-money');  t.innerText = "2026_MONEY";  st.innerText = "[$] WEALTH_STATUS"; c.innerText = globalData.fortune_2026.money; }
    else if (type === 'career') { box.classList.add('theme-career'); t.innerText = "2026_CAREER"; st.innerText = "[!] CAREER_UPDATE"; c.innerText = globalData.fortune_2026.career; }
    else if (type === 'health') { box.classList.add('theme-health'); t.innerText = "2026_HEALTH"; st.innerText = "[+] VITALITY_LOG";  c.innerText = globalData.fortune_2026.health; }

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
        document.getElementById('res-summary').innerText      = globalData.fortune_2026.summary;
        document.getElementById('res-final-advice').innerText = globalData.fortune_2026.final_advice;
        switchScreen('screen-final-advice');
    });
}

/* [컷 8] 엔딩 시퀀스 */
function startEnding() {
    playStory([
        { text: "엇! 나 지금 ㅜㅜ 연..ㄱㄹ..이 끈ㅎ기기 직전이야!!", glitch: true },
        { text: "하지만 이제 너가 어디있는지 아니까! 금방 다시 볼 수 있을거야!", glitch: true }, // <-- 여기 쉼표 추가!
        { text: "조금만 기다려!", glitch: true }
    ], () => {
        triggerTVOff();
    });
}

/* script.js의 triggerTVOn 함수를 이 내용으로 교체하세요 */
function triggerTVOn(callback) {
    const container = document.getElementById('container');
    const content = document.getElementById('content');
    
    // 1. 시작할 때는 화면을 검은색으로 강제 설정
    setScreenColor('#000000', '#000000'); 
    
    // 2. 켜지는 애니메이션(tv-on) 실행
    container.style.transformOrigin = 'center center';
    container.style.animation = 'tv-on 1.2s cubic-bezier(0.15, 0.85, 0.35, 1) forwards';
    
    // 3. 애니메이션 중간에 숨겨놨던 내용물(#content)을 가시화
    setTimeout(() => {
        if (content) content.style.visibility = 'visible';
    }, 1000);

    // 4. [중요] 애니메이션이 끝나는 시점에 원래의 모니터 회색으로 복구
    setTimeout(() => {
        setScreenColor('#444444', '#111111'); // 원래의 배경색 변수값
        if (callback) callback();
    }, 1200);
}

/* [컷 8] 브라운관 TV 꺼지는 효과 */
function triggerTVOff() {
    const content    = document.getElementById('content');
    const container  = document.getElementById('container');
    const endOverlay = document.getElementById('end-overlay');

    content.classList.add('ending-glitch');

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
