/* [1] 전역 변수 설정 START */
let selectedLat = 37.5665; let selectedLon = 126.9780;
let globalData = null;
let viewedFortunes = { love: false, money: false, career: false, health: false };
let isSwitching = false; 
let loadingInterval;
const rootStyle = document.documentElement.style;
/* [1] 전역 변수 설정 END */

// [추가] 시간 모름 체크박스 로직
document.addEventListener('DOMContentLoaded', () => {
    const noTimeBox = document.getElementById('noTime');
    const timeInput = document.getElementById('birthTime');
    
    if(noTimeBox && timeInput) {
        noTimeBox.addEventListener('change', (e) => {
            if(e.target.checked) {
                timeInput.value = "";     // 값 초기화
                timeInput.disabled = true; // 입력 막기
            } else {
                timeInput.disabled = false; // 입력 풀기
            }
        });
    }
});

/* [2] 지도 초기화 START */
const map = L.map('map', { zoomControl: false }).setView([selectedLat, selectedLon], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let marker = L.marker([selectedLat, selectedLon]).addTo(map);
map.on('click', (e) => { selectedLat = e.latlng.lat; selectedLon = e.latlng.lng; marker.setLatLng(e.latlng); });
setTimeout(() => { map.invalidateSize(); }, 500);
/* [2] 지도 초기화 END */

/* [3] 화면 색상 제어 함수 START */
function setScreenColor(center, edge) {
    rootStyle.setProperty('--screen-bg-center', center);
    rootStyle.setProperty('--screen-bg-edge', edge);
}
/* [3] 화면 색상 제어 함수 END */

/* [4] 화면 전환 기능 수정 (강화 버전) */
function switchScreen(id) {
    if (isSwitching) return;
    isSwitching = true;

    const content = document.getElementById('content');
    const container = document.getElementById('container'); // 배경 애니메이션용
    
    // 1. 효과 시작: 글리치 + 워프(빨려들어가는 느낌) 클래스 추가
    content.classList.add('glitch-active');
    // container가 있다면 배경 워프 효과를 위해 추가 (CSS에 warping-bg 정의 필요)
    if (container) container.classList.add('warping-bg');
    content.classList.add('warping-content');

    // 2. 중요: 새 화면으로 넘어가기 전 스크롤 위치를 맨 위로 리셋
    content.scrollTo({ top: 0, behavior: 'instant' });

    setTimeout(() => {
        // 3. 화면 교체
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => s.classList.remove('active'));

        const target = document.getElementById(id);
        if (target) {
            target.classList.add('active');
        }
    }, 150); // 전환 타이밍을 150ms로 약간 늘려 효과를 인지하게 함

    setTimeout(() => {
        // 4. 효과 제거 및 상태 해제
        content.classList.remove('glitch-active', 'warping-content');
        if (container) container.classList.remove('warping-bg');
        isSwitching = false;
    }, 450);
}

/* [4] 화면 전환 기능 END */

/* [5] 데이터 분석 및 통신 START (수정본) */
function startAnalysis() {
    const name = document.getElementById('userName').value;
    const date = document.getElementById('birthDate').value;
    const time = document.getElementById('birthTime').value || "12:00";
    
    // 기본 입력 검증
    if(!name || !date) { 
        alert("데이터를 입력하라."); 
        return; 
    }
    
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
        
        if(data.error) { 
            alert(data.error); 
            switchScreen('screen-input'); 
            return; 
        }
        
        globalData = data;

        // 1. 데이터를 먼저 채워넣습니다.
        document.getElementById('res-personality').innerText = data.personality;
        document.getElementById('res-pros').innerText = data.pros;
        document.getElementById('res-cons').innerText = data.cons;

        // 2. [추가] 결과 박스들을 미리 투명하게 숨깁니다.
        const resultBoxes = document.querySelectorAll('#screen-personality .result-box');
        resultBoxes.forEach(box => {
            box.style.opacity = "0";
            box.style.transform = "translateY(20px)"; // 아래에서 위로 올라오는 효과
            box.style.transition = "none"; // 초기화 시에는 애니메이션 차단
        });

        // 3. 화면은 전환하되, 박스들은 아직 숨겨진 상태입니다.
        switchScreen('screen-personality');

        // 4. [추가] 박스들을 하나씩 글리치와 함께 등장시키는 함수 실행
        setTimeout(() => {
            displayResultsSequentially(resultBoxes);
        }, 500); // 화면 전환 애니메이션 직후 시작
    })
    .catch(err => { 
        stopLoadingAnimation(); 
        console.error("Analysis Error:", err);
        alert("별과의 연결이 불안정하거나 서버 응답이 없습니다."); 
        switchScreen('screen-input'); 
    });
}

// [신규 함수] 박스를 하나씩 순차적으로 글리치 효과와 함께 표시
async function displayResultsSequentially(boxes) {
    for (let i = 0; i < boxes.length; i++) {
        // 각 박스 사이의 등장 간격 (0.8초)
        await new Promise(resolve => setTimeout(resolve, 800)); 
        
        const box = boxes[i];
        
        // 지지직거리는 글리치 효과 클래스 추가
        box.classList.add('glitch-active');
        
        // 박스 서서히 보이기
        box.style.transition = "all 0.4s ease";
        box.style.opacity = "1";
        box.style.transform = "translateY(0)";

        // 0.4초 후 글리치 효과 제거 (가독성 유지)
        setTimeout(() => {
            box.classList.remove('glitch-active');
        }, 400);
    }
}
/* [5] 데이터 분석 및 통신 END */

/* [6] 로딩 및 별똥별 애니메이션 START */
function startLoadingAnimation() {
    switchScreen('screen-loading');
    setScreenColor('#1a0414', '#0a0208'); 
    const screen = document.getElementById('content');
    for(let i=0; i<35; i++) {
        let star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 4 + 2;
        star.style.width = star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 90 + 5}%`; 
        star.style.top = `${Math.random() * 90 + 5}%`;
        star.style.animationDuration = `${Math.random() * 1.5 + 0.8}s`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        screen.appendChild(star);
    }
    let dots = 0;
    loadingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        document.getElementById('loading-text').innerText = "별의 소리를 관측하는 중" + ".".repeat(dots);
    }, 500);
}

function stopLoadingAnimation() {
    clearInterval(loadingInterval);
    setScreenColor('#444444', '#111111');
    document.querySelectorAll('.star').forEach(s => s.remove());
}
/* [6] 로딩 및 별똥별 애니메이션 END */

/* [7] 운세별 테마 및 상세 표시 START (수정본) */
function showFortune(type) {
    // 배경색 설정 (화면 글로우 효과)
    const bgColors = { 
        'love': ['#3a0d2e', '#1a0515'], 
        'money': ['#0d3a1a', '#051a0d'], 
        'career': ['#0d2e3a', '#05151a'],
        'health': ['#3a3a0d', '#1a1a05'],
        'monthly': ['#1a0414', '#0a0208']
    };
    
    const box = document.getElementById('fortune-box');
    const t = document.getElementById('fortune-title');
    const st = document.getElementById('fortune-sub-title');
    const c = document.getElementById('res-fortune-content');

    // 1. 기존 테마 클래스 초기화
    box.className = 'result-box';

    if(type !== 'monthly') {
        viewedFortunes[type] = true;

        // 버튼 숨김 처리 로직 (기존 유지)
        const allButtons = document.querySelectorAll('#screen-selection .cyber-btn');
        allButtons.forEach(btn => {
            if (btn.id !== `btn-${type}`) btn.classList.add('hidden-btn'); 
        });

        setScreenColor(bgColors[type][0], bgColors[type][1]);
        
        // 2. 카테고리에 맞는 테마 클래스 및 텍스트 적용
        if (type === 'love') { 
            box.classList.add('theme-love'); // 핑크
            t.innerText = "2026_LOVE"; 
            st.innerText = "[♥] LOVE_SIGNAL"; 
            c.innerText = globalData.fortune_2026.love; 
        }
        else if (type === 'money') { 
            box.classList.add('theme-money'); // 초록
            t.innerText = "2026_MONEY"; 
            st.innerText = "[$] WEALTH_STATUS"; 
            c.innerText = globalData.fortune_2026.money; 
        }
        else if (type === 'career') { 
            box.classList.add('theme-career'); // 하늘
            t.innerText = "2026_CAREER"; 
            st.innerText = "[!] CAREER_UPDATE"; 
            c.innerText = globalData.fortune_2026.career; 
        }
        else if (type === 'health') { 
            box.classList.add('theme-health'); // 노랑
            t.innerText = "2026_HEALTH"; 
            st.innerText = "[+] VITALITY_LOG"; 
            c.innerText = globalData.fortune_2026.health; 
        }
        
        switchScreen('screen-fortune-detail');
    } else {
        // 월별 운세: 무지개 테마
        const monthlyBox = document.querySelector('#screen-monthly-final .result-box');
        monthlyBox.className = 'result-box theme-rainbow';
        
        setScreenColor(bgColors.monthly[0], bgColors.monthly[1]);
        document.getElementById('res-monthly-content').innerText = globalData.fortune_2026.monthly;
        switchScreen('screen-monthly-final');
    }

    if(viewedFortunes.love && viewedFortunes.money && viewedFortunes.career && viewedFortunes.health) {
        document.getElementById('btn-final-report').classList.remove('hidden-btn');
    }
}

function returnToSelection() {
    setScreenColor('#444444', '#111111');

    const fortuneTypes = ['love', 'money', 'career', 'health'];
    fortuneTypes.forEach(type => {
        const btn = document.getElementById(`btn-${type}`);
        if (btn) {
            if (viewedFortunes[type]) btn.classList.add('hidden-btn');
            else btn.classList.remove('hidden-btn');
        }
    });

    switchScreen('screen-selection');
}

function showFinalReport() {
    // 최종 리포트 화면의 박스들 타겟팅
    const summaryBox = document.querySelector('#screen-final-advice .result-box:nth-child(2)');
    const whisperBox = document.querySelector('#screen-final-advice .result-box:nth-child(3)');

    // 3. 요약(보라) 및 속삭임(흑백반전) 테마 클래스 적용
    if (summaryBox) summaryBox.className = 'result-box theme-purple';
    if (whisperBox) whisperBox.className = 'result-box theme-whisper';

    document.getElementById('res-summary').innerText = globalData.fortune_2026.summary;
    document.getElementById('res-final-advice').innerText = globalData.fortune_2026.final_advice;
    switchScreen('screen-final-advice');
}
/* [7] 운세별 테마 및 상세 표시 END */
