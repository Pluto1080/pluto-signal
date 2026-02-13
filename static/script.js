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

/* [4] 화면 전환 기능 수정 */
function switchScreen(id) {
    if (isSwitching) return;
    isSwitching = true;

    const content = document.getElementById('content');
    content.classList.add('glitch-active');

    // [수정] 화면 교체 타이밍을 100ms -> 50ms로 더 빠르게
    setTimeout(() => {
        const screens = document.querySelectorAll('.screen');
        const target = document.getElementById(id);
        if (target) {
            screens.forEach(s => { 
                if(s !== target) s.classList.remove('active'); 
            });
            target.classList.add('active');
        }
    }, 50);

    // [수정] 전체 전환 완료 시간도 300ms -> 250ms로 단축
    setTimeout(() => {
        content.classList.remove('glitch-active');
        isSwitching = false;
    }, 250);
}
/* [4] 화면 전환 기능 END */

/* [5] 데이터 분석 및 통신 START */
function startAnalysis() {
    const name = document.getElementById('userName').value;
    const date = document.getElementById('birthDate').value;
    const time = document.getElementById('birthTime').value || "12:00";
    if(!name || !date) { alert("데이터를 입력하라."); return; }
    
    startLoadingAnimation();

    fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, time, lat: selectedLat, lon: selectedLon })
    })
    .then(res => res.json())
    .then(data => {
        stopLoadingAnimation();
        if(data.error) { alert(data.error); switchScreen('screen-input'); return; }
        globalData = data;
        document.getElementById('res-personality').innerText = data.personality;
        document.getElementById('res-pros').innerText = data.pros;
        document.getElementById('res-cons').innerText = data.cons;
        switchScreen('screen-personality');
    })
    .catch(err => { stopLoadingAnimation(); switchScreen('screen-input'); });
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
        if(document.getElementById(`btn-${type}`)) document.getElementById(`btn-${type}`).classList.add('hidden-btn');
        setScreenColor(bgColors[type][0], bgColors[type][1]);
        
        const t = document.getElementById('fortune-title'), st = document.getElementById('fortune-sub-title'), c = document.getElementById('res-fortune-content'), box = document.getElementById('fortune-box');
        
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
    switchScreen('screen-selection');
}

function showFinalReport() {
    document.getElementById('res-summary').innerText = globalData.fortune_2026.summary;
    document.getElementById('res-final-advice').innerText = globalData.fortune_2026.final_advice;
    switchScreen('screen-final-advice');
}
/* [7] 운세별 테마 및 상세 표시 END */
