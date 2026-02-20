/* [1] 전역 변수 설정 START */
let selectedLat = 37.5665; let selectedLon = 126.9780;
let globalData = null;
let viewedFortunes = { love: false, money: false, career: false, health: false };
let isSwitching = false; 
let loadingInterval;
const rootStyle = document.documentElement.style;
/* [1] 전역 변수 설정 END */


/* ==========================================
   [2] 부드러운 페이드인/아웃 스토리 엔진 START
   ========================================== */
function playStory(lines, callback) {
    const storyText = document.getElementById('story-text');
    const screen = document.getElementById('screen-story');
    
    // [핵심 해결 1] 화면 전환 전에 텍스트를 즉시 비워서 '잔상 깜빡임' 완벽 차단
    storyText.innerHTML = ''; 
    storyText.style.opacity = '0';

    switchScreen('screen-story');

    let lineIndex = 0;
    let isAnimating = false; // 애니메이션 도중 중복 터치 방지

    const handleNext = () => {
        if (isAnimating) return; 
        isAnimating = true;

        // 1. 터치 시 현재 텍스트가 위로 스르륵 사라짐 (Fade Out)
        storyText.style.transition = "all 0.3s ease";
        storyText.style.opacity = "0";
        storyText.style.transform = "translateY(-20px)";

        // 2. 0.3초 후 다음 대사 준비
        setTimeout(() => {
            lineIndex++;
            showLine();
        }, 300);
    };

    function showLine() {
        if (lineIndex >= lines.length) {
            // 스토리가 끝났으면 클릭 이벤트 지우고 다음 화면으로 이동
            screen.removeEventListener('click', handleNext);
            callback();
            return;
        }

        let lineData = lines[lineIndex];
        let textStr = typeof lineData === 'string' ? lineData : lineData.text;
        let isGlitch = typeof lineData === 'object' && lineData.glitch;

        // 3. 타이핑 없이 완성된 텍스트 즉시 세팅
        storyText.innerHTML = textStr; 
        
        // 하단 터치 안내 문구 추가
        const hint = document.createElement('div');
        hint.className = 'touch-hint'; 
        hint.innerText = "[ 터치하여 계속 ]";
        storyText.appendChild(hint);

        // 4. 글리치 효과 처리 (지지직거리는 효과)
        if (isGlitch) {
            storyText.classList.add('glitch-active');
            storyText.style.color = "#ff00ff"; 
        } else {
            storyText.classList.remove('glitch-active');
            storyText.style.color = "#00ff41"; 
        }

        // 5. 미래의 텍스트를 아래쪽에 투명하게 숨겨둠
        storyText.style.transition = "none"; 
        storyText.style.transform = "translateY(20px)"; 
        
        // 6. 브라우저가 인식할 아주 짧은 시간(50ms) 대기 후, 아래에서 위로 부드럽게 등장 (Fade In)
        setTimeout(() => {
            storyText.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            storyText.style.opacity = "1";
            storyText.style.transform = "translateY(0)";
            isAnimating = false; // 애니메이션이 끝나면 터치 허용
        }, 50);
    }

    // 화면 터치 이벤트 등록
    screen.addEventListener('click', handleNext);

    // 첫 화면 전환 효과(약 450ms)가 끝난 후 첫 대사 등장
    setTimeout(() => {
        showLine();
    }, 600);
}

// 처음 접속 시 초기화
function initTerminal() {
    playStory([
        { text: "지직... 지직..", glitch: true },
        "나는 플루토야. 저 멀리서 너를 도와주기 위해서 왔지!"
    ], () => {
        switchScreen('screen-input');
        setTimeout(() => { map.invalidateSize(); }, 500);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTerminal);
} else {
    initTerminal();
}
/* [2] 스토리 엔진 END */


/* [3] 기타 초기화 및 유틸리티 로직 START */
// 시간 모름 체크박스 로직
document.addEventListener('DOMContentLoaded', () => {
    const noTimeBox = document.getElementById('noTime');
    const timeInput = document.getElementById('birthTime');
    if(noTimeBox && timeInput) {
        noTimeBox.addEventListener('change', (e) => {
            if(e.target.checked) {
                timeInput.value = "";     
                timeInput.disabled = true; 
            } else {
                timeInput.disabled = false; 
            }
        });
    }
});

// 지도 초기화
const map = L.map('map', { zoomControl: false }).setView([selectedLat, selectedLon], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let marker = L.marker([selectedLat, selectedLon]).addTo(map);
map.on('click', (e) => { selectedLat = e.latlng.lat; selectedLon = e.latlng.lng; marker.setLatLng(e.latlng); });
setTimeout(() => { map.invalidateSize(); }, 500);

// 화면 색상 제어 함수
function setScreenColor(center, edge) {
    rootStyle.setProperty('--screen-bg-center', center);
    rootStyle.setProperty('--screen-bg-edge', edge);
}

// 화면 전환 기능
function switchScreen(id) {
    if (isSwitching) return;
    isSwitching = true;

    const content = document.getElementById('content');
    const container = document.getElementById('container'); 
    
    content.classList.add('glitch-active');
    if (container) container.classList.add('warping-bg');
    content.classList.add('warping-content');

    content.scrollTop = 0; // 스크롤 맨 위로 초기화

    setTimeout(() => {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => s.classList.remove('active'));

        const target = document.getElementById(id);
        if (target) {
            target.classList.add('active');
        }
    }, 150);

    setTimeout(() => {
        content.classList.remove('glitch-active', 'warping-content');
        if (container) container.classList.remove('warping-bg');
        isSwitching = false;
    }, 450);
}
/* [3] 기타 초기화 및 유틸리티 로직 END */


/* [4] 데이터 통신 및 애니메이션 제어 START */
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
        document.getElementById('res-personality').innerText = data.personality;
        document.getElementById('res-pros').innerText = data.pros;
        document.getElementById('res-cons').innerText = data.cons;

        const resultBoxes = document.querySelectorAll('#screen-personality .result-box');
        resultBoxes.forEach(box => {
            box.style.opacity = "0";
            box.style.transform = "translateY(20px)";
            box.style.transition = "none";
        });

        playStory([
            "내가 너의 성격과 장단점을 알아왔어!"
        ], () => {
            switchScreen('screen-personality');
            setTimeout(() => { displayResultsSequentially(resultBoxes); }, 500);
        });
    })
    .catch(err => { 
        stopLoadingAnimation(); 
        console.error("Analysis Error:", err);
        alert("별과의 연결이 불안정하거나 서버 응답이 없습니다."); 
        switchScreen('screen-input'); 
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
    
    // [핵심 해결 2] 통신이 너무 빨리 끝나서 화면 전환 락이 안 풀려버리는 버그 수정
    isSwitching = false; 
}
/* [4] 데이터 통신 및 애니메이션 제어 END */


/* [5] 운세별 테마 및 스토리 표시 START */
function showFortune(type) {
    const bgColors = { 
        'love': ['#3a0d2e', '#1a0515'], 'money': ['#0d3a1a', '#051a0d'], 
        'career': ['#0d2e3a', '#05151a'], 'health': ['#3a3a0d', '#1a1a05'],
        'monthly': ['#1a0414', '#0a0208']
    };
    const box = document.getElementById('fortune-box');
    const t = document.getElementById('fortune-title');
    const st = document.getElementById('fortune-sub-title');
    const c = document.getElementById('res-fortune-content');
    box.className = 'result-box';

    if(type !== 'monthly') {
        viewedFortunes[type] = true;
        document.querySelectorAll('#screen-selection .cyber-btn').forEach(btn => {
            if (btn.id !== `btn-${type}`) btn.classList.add('hidden-btn'); 
        });
        setScreenColor(bgColors[type][0], bgColors[type][1]);
        if (type === 'love') { box.classList.add('theme-love'); t.innerText = "2026_LOVE"; st.innerText = "[♥] LOVE_SIGNAL"; c.innerText = globalData.fortune_2026.love; }
        else if (type === 'money') { box.classList.add('theme-money'); t.innerText = "2026_MONEY"; st.innerText = "[$] WEALTH_STATUS"; c.innerText = globalData.fortune_2026.money; }
        else if (type === 'career') { box.classList.add('theme-career'); t.innerText = "2026_CAREER"; st.innerText = "[!] CAREER_UPDATE"; c.innerText = globalData.fortune_2026.career; }
        else if (type === 'health') { box.classList.add('theme-health'); t.innerText = "2026_HEALTH"; st.innerText = "[+] VITALITY_LOG"; c.innerText = globalData.fortune_2026.health; }
        switchScreen('screen-fortune-detail');
    } else {
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

// 성격 결과 후 선택 화면 전 스토리
function goToSelectionStory() {
    playStory([
        "자 그럼 이제 진짜 너가 궁금해할만한거 4개 준비해왔어"
    ], () => { switchScreen('screen-selection'); });
}

// 최종 리포트 전 스토리
function showFinalReport() {
    playStory([
        "어떤거같아? 올해가 이제 기대되지?",
        "내가 한번에 정리해주고 내가 꼭 너에게 해주고싶은 말도 적어봤어! 한번 버튼눌러볼래?"
    ], () => {
        const summaryBox = document.querySelector('#screen-final-advice .result-box:nth-child(2)');
        const whisperBox = document.querySelector('#screen-final-advice .result-box:nth-child(3)');
        if (summaryBox) summaryBox.className = 'result-box theme-purple';
        if (whisperBox) whisperBox.className = 'result-box theme-whisper';
        document.getElementById('res-summary').innerText = globalData.fortune_2026.summary;
        document.getElementById('res-final-advice').innerText = globalData.fortune_2026.final_advice;
        switchScreen('screen-final-advice');
    });
}

// 이번 달 운세 전 스토리
function goToMonthlyStory() {
    playStory([
        "모든 운세는 그냥 흐름이니까 가장 중요한건 너의 의지인거 알지?",
        "꼭 잘되길 바랄게! 마지막으로 이번달 운세 알려줄게!"
    ], () => { showFortune('monthly'); });
}
/* [5] 운세별 테마 및 스토리 표시 END */
