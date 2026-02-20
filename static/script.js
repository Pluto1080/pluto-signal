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

/* [5] 데이터 분석 및 통신 START */
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
        // HTTP 상태 코드가 정상이 아닐 경우 에러 투척
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    })
    .then(data => {
        stopLoadingAnimation();
        
        // 백엔드에서 전달한 로직 에러 처리 (API 키 미설정, 데이터 오류 등)
        if(data.error) { 
            alert(data.error); 
            switchScreen('screen-input'); 
            return; 
        }
        
        // 데이터 정상 수신 시 UI 업데이트
        globalData = data;
        document.getElementById('res-personality').innerText = data.personality;
        document.getElementById('res-pros').innerText = data.pros;
        document.getElementById('res-cons').innerText = data.cons;
        switchScreen('screen-personality');
    })
    .catch(err => { 
        // 3번 수정 사항: 통신 실패 시 사용자 알림 추가
        stopLoadingAnimation(); 
        console.error("Analysis Error:", err);
        alert("별과의 연결이 불안정하거나 서버 응답이 없습니다. 통신 상태를 확인하고 다시 시도해줘."); 
        switchScreen('screen-input'); 
    });
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

/* [7] 운세별 테마 및 상세 표시 START */
function showFortune(type) {
    const bgColors = { 
        'love': ['#3a0d2e', '#1a0515', '#ff00ff'], 
        'money': ['#3a2e0d', '#1a1505', '#ffd700'], 
        'career': ['#0d2e3a', '#05151a', '#00ffff'],
        'health': ['#0d3a2e', '#051a14', '#00ff41'],
        'monthly': ['#1a0414', '#0a0208', '#ffffff']
    };
    
    if(type !== 'monthly') {
        viewedFortunes[type] = true;

        // [수정] 클릭한 버튼 외의 모든 버튼을 즉시 숨겨서 빨려 들어갈 때 지저분함 방지
        const allButtons = document.querySelectorAll('#screen-selection .cyber-btn');
        allButtons.forEach(btn => {
            if (btn.id !== `btn-${type}`) {
                btn.classList.add('hidden-btn'); 
            }
        });

        setScreenColor(bgColors[type][0], bgColors[type][1]);
        
        const t = document.getElementById('fortune-title'), 
              st = document.getElementById('fortune-sub-title'), 
              c = document.getElementById('res-fortune-content'), 
              box = document.getElementById('fortune-box');
        
        box.style.borderColor = bgColors[type][2];
        box.style.color = bgColors[type][2];

        if (type === 'love') { t.innerText = "2026_LOVE"; st.innerText = "[♥] RELATIONSHIP_LOG"; c.innerText = globalData.fortune_2026.love; }
        else if (type === 'money') { t.innerText = "2026_MONEY"; st.innerText = "[$] WEALTH_STATUS"; c.innerText = globalData.fortune_2026.money; }
        else if (type === 'career') { t.innerText = "2026_CAREER"; st.innerText = "[!] CAREER_UPDATE"; c.innerText = globalData.fortune_2026.career; }
        else if (type === 'health') { t.innerText = "2026_HEALTH"; st.innerText = "[+] VITALITY_LOG"; c.innerText = globalData.fortune_2026.health; }
        
        switchScreen('screen-fortune-detail');
    } else {
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

    // [추가] 돌아왔을 때, 아직 관측하지 않은(안 본) 버튼들만 다시 표시
    const fortuneTypes = ['love', 'money', 'career', 'health'];
    fortuneTypes.forEach(type => {
        const btn = document.getElementById(`btn-${type}`);
        if (btn) {
            if (viewedFortunes[type]) {
                btn.classList.add('hidden-btn'); // 이미 본 건 숨김 유지
            } else {
                btn.classList.remove('hidden-btn'); // 안 본 건 다시 보여줌
            }
        }
    });

    switchScreen('screen-selection');
}

function showFinalReport() {
    document.getElementById('res-summary').innerText = globalData.fortune_2026.summary;
    document.getElementById('res-final-advice').innerText = globalData.fortune_2026.final_advice;
    switchScreen('screen-final-advice');
}
/* [7] 운세별 테마 및 상세 표시 END */
