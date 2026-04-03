/* =============================================
   PLUTO SIGNAL — Web Audio Synthesizer
   ============================================= */

const sfx = (() => {
    let ctx = null;
    let loadingOscs  = [];
    let loadingGains = [];

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function noise(duration) {
        const ac  = getCtx();
        const len = Math.ceil(ac.sampleRate * duration);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    /* ── 1. 지직 글리치 — 핑크 텍스트 전용 ── */
    function glitch() {
        const ac  = getCtx();
        const dur = 0.2;
        const t   = ac.currentTime;

        const src  = ac.createBufferSource();
        src.buffer = noise(dur);
        const filt = ac.createBiquadFilter();
        filt.type  = 'bandpass';
        filt.frequency.value = 1800;
        filt.Q.value = 0.4;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(filt); filt.connect(g); g.connect(ac.destination);
        src.start(); src.stop(t + dur);

        const osc = ac.createOscillator();
        const og  = ac.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + dur);
        og.gain.setValueAtTime(0.08, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(og); og.connect(ac.destination);
        osc.start(); osc.stop(t + dur);
    }

    /* ── 2. 텍스트 등장 — 부드러운 우웅~ ── */
    function textAppear() {
        const ac  = getCtx();
        const t   = ac.currentTime;
        const dur = 0.28;

        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.linearRampToValueAtTime(130, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(70, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.13, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + dur);

        // 배음 — 살짝 따뜻하게
        const harm = ac.createOscillator();
        const hg   = ac.createGain();
        harm.type  = 'triangle';
        harm.frequency.setValueAtTime(180, t);
        harm.frequency.exponentialRampToValueAtTime(140, t + dur);
        hg.gain.setValueAtTime(0.04, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + dur);
        harm.connect(hg); hg.connect(ac.destination);
        harm.start(); harm.stop(t + dur);
    }

    /* ── 3. 화면 전환 — 깊은 우웅 스윕 ── */
    function transition() {
        const ac  = getCtx();
        const t   = ac.currentTime;
        const dur = 0.35;

        // 저음 하강 스윕
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + dur);

        // 중음 레이어
        const mid = ac.createOscillator();
        const mg  = ac.createGain();
        mid.type  = 'triangle';
        mid.frequency.setValueAtTime(320, t);
        mid.frequency.exponentialRampToValueAtTime(110, t + dur);
        mg.gain.setValueAtTime(0.06, t);
        mg.gain.exponentialRampToValueAtTime(0.001, t + dur);
        mid.connect(mg); mg.connect(ac.destination);
        mid.start(); mid.stop(t + dur);
    }

    /* ── 4. 결과창 등장 — 따뜻한 우웅 상승 ── */
    function reveal() {
        const ac  = getCtx();
        const t   = ac.currentTime;
        const dur = 0.3;

        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.linearRampToValueAtTime(160, t + 0.12);
        osc.frequency.exponentialRampToValueAtTime(220, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.11, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + dur);

        const harm = ac.createOscillator();
        const hg   = ac.createGain();
        harm.type  = 'triangle';
        harm.frequency.setValueAtTime(160, t);
        harm.frequency.linearRampToValueAtTime(440, t + dur);
        hg.gain.setValueAtTime(0.03, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + dur);
        harm.connect(hg); hg.connect(ac.destination);
        harm.start(); harm.stop(t + dur);
    }

    /* ── 5. 버튼 클릭 — 짧은 웅 ── */
    function click() {
        const ac  = getCtx();
        const t   = ac.currentTime;
        const dur = 0.12;

        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.14, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + dur);
    }

    /* ── 6. 로딩 앰비언트 — 깊은 드론 우웅~ ── */
    function startLoading() {
        stopLoading();
        const ac = getCtx();
        const t  = ac.currentTime;

        // 베이스 드론
        const drone = ac.createOscillator();
        const dg    = ac.createGain();
        drone.type  = 'sine';
        drone.frequency.value = 50;
        dg.gain.setValueAtTime(0, t);
        dg.gain.linearRampToValueAtTime(0.09, t + 1.0);
        drone.connect(dg); dg.connect(ac.destination);
        drone.start();
        loadingOscs.push(drone); loadingGains.push(dg);

        // 중음 우웅 — LFO로 떨림
        const mid = ac.createOscillator();
        const mg  = ac.createGain();
        mid.type  = 'triangle';
        mid.frequency.value = 110;

        const lfo = ac.createOscillator();
        const lg  = ac.createGain();
        lfo.frequency.value = 0.5;
        lg.gain.value = 0.025;
        lfo.connect(lg); lg.connect(mg.gain);
        lfo.start();

        mg.gain.setValueAtTime(0, t);
        mg.gain.linearRampToValueAtTime(0.05, t + 1.2);
        mid.connect(mg); mg.connect(ac.destination);
        mid.start();
        loadingOscs.push(mid, lfo); loadingGains.push(mg);

        // 느린 우웅 진동 레이어
        const swell = ac.createOscillator();
        const sg    = ac.createGain();
        swell.type  = 'sine';
        swell.frequency.value = 75;

        const lfo2 = ac.createOscillator();
        const lg2  = ac.createGain();
        lfo2.frequency.value = 0.3;
        lg2.gain.value = 0.03;
        lfo2.connect(lg2); lg2.connect(sg.gain);
        lfo2.start();

        sg.gain.setValueAtTime(0, t);
        sg.gain.linearRampToValueAtTime(0.045, t + 2.0);
        swell.connect(sg); sg.connect(ac.destination);
        swell.start();
        loadingOscs.push(swell, lfo2); loadingGains.push(sg);
    }

    function stopLoading() {
        if (!ctx) return;
        const t = ctx.currentTime;
        loadingGains.forEach(g => {
            try {
                g.gain.cancelScheduledValues(t);
                g.gain.setValueAtTime(g.gain.value, t);
                g.gain.linearRampToValueAtTime(0, t + 0.5);
            } catch (_) {}
        });
        loadingOscs.forEach(o => {
            try { o.stop(t + 0.6); } catch (_) {}
        });
        loadingOscs  = [];
        loadingGains = [];
    }

    /* ── 7. TV 켜짐 — 저음에서 웜업되는 우웅 ── */
    function tvOn() {
        const ac = getCtx();
        const t  = ac.currentTime;

        // 메인 우웅 상승
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(30, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.7);
        osc.frequency.exponentialRampToValueAtTime(90, t + 1.3);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.14, t + 0.4);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 1.5);

        // 배음 레이어
        const harm = ac.createOscillator();
        const hg   = ac.createGain();
        harm.type  = 'triangle';
        harm.frequency.setValueAtTime(60, t + 0.1);
        harm.frequency.exponentialRampToValueAtTime(360, t + 0.7);
        harm.frequency.exponentialRampToValueAtTime(180, t + 1.3);
        hg.gain.setValueAtTime(0, t + 0.1);
        hg.gain.linearRampToValueAtTime(0.05, t + 0.5);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        harm.connect(hg); hg.connect(ac.destination);
        harm.start(t + 0.1); harm.stop(t + 1.4);
    }

    /* ── 8. TV 꺼짐 — 깊게 가라앉는 우웅 ── */
    function tvOff() {
        const ac = getCtx();
        const t  = ac.currentTime;

        // 메인 하강 우웅
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 1.8);
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 1.8);

        // 배음 레이어
        const harm = ac.createOscillator();
        const hg   = ac.createGain();
        harm.type  = 'triangle';
        harm.frequency.setValueAtTime(400, t);
        harm.frequency.exponentialRampToValueAtTime(50, t + 1.4);
        hg.gain.setValueAtTime(0.06, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        harm.connect(hg); hg.connect(ac.destination);
        harm.start(); harm.stop(t + 1.4);
    }

    /* ── unlock ── */
    function unlock() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
    }

    /* ── BGM ── */
    let bgmAudio = null;
    let bgmFadeTimer = null;

    function bgmPlay() {
        if (!bgmAudio) {
            bgmAudio = new Audio('/sound/Picnic_on_the_Far_Side.mp3');
            bgmAudio.loop = true;
            bgmAudio.volume = 0;
        }

        const tryPlay = () => {
            bgmAudio.play().then(() => {
                if (bgmFadeTimer) clearInterval(bgmFadeTimer);
                bgmFadeTimer = setInterval(() => {
                    bgmAudio.volume = Math.min(bgmAudio.volume + 0.01, 0.45);
                    if (bgmAudio.volume >= 0.45) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; }
                }, 40);
            }).catch(() => {
                // 자동재생 차단 시 첫 인터랙션 때 재시도
                document.addEventListener('click', tryPlay, { once: true });
                document.addEventListener('touchstart', tryPlay, { once: true });
            });
        };

        tryPlay();
    }

    function bgmStop() {
        if (!bgmAudio || bgmAudio.paused) return;
        if (bgmFadeTimer) clearInterval(bgmFadeTimer);
        bgmFadeTimer = setInterval(() => {
            bgmAudio.volume = Math.max(bgmAudio.volume - 0.015, 0);
            if (bgmAudio.volume <= 0) {
                clearInterval(bgmFadeTimer); bgmFadeTimer = null;
                bgmAudio.pause();
                bgmAudio.currentTime = 0;
            }
        }, 40);
    }

    return { glitch, textAppear, transition, reveal, click, startLoading, stopLoading, tvOn, tvOff, unlock, bgmPlay, bgmStop };
})();

/* ── AudioContext 활성화 — 매 인터랙션마다 resume 시도 ── */
['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => sfx.unlock(), { passive: true });
});

/* ── 전역 버튼 클릭음 ── */
document.addEventListener('click', e => {
    if (e.target.closest('.cyber-btn')) sfx.click();
});
