/* =============================================
   PLUTO SIGNAL — Web Audio Synthesizer
   외부 파일 없이 Web Audio API로 모든 효과음 생성
   ============================================= */

const sfx = (() => {
    let ctx = null;
    let loadingNodes = [];

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function noise(duration) {
        const ac = getCtx();
        const len = Math.ceil(ac.sampleRate * duration);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    /* ── 1. 지직 글리치 노이즈 ── */
    function glitch() {
        const ac = getCtx();
        const dur = 0.18;

        const src = ac.createBufferSource();
        src.buffer = noise(dur);

        const filt = ac.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 1800;
        filt.Q.value = 0.4;

        const g = ac.createGain();
        g.gain.setValueAtTime(0.35, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);

        src.connect(filt); filt.connect(g); g.connect(ac.destination);
        src.start(); src.stop(ac.currentTime + dur);

        // 낮은 피치 드롭 추가
        const osc = ac.createOscillator();
        const og = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + dur);
        og.gain.setValueAtTime(0.08, ac.currentTime);
        og.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
        osc.connect(og); og.connect(ac.destination);
        osc.start(); osc.stop(ac.currentTime + dur);
    }

    /* ── 2. 텍스트 등장음 (짧은 전자 비프) ── */
    function textAppear() {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, ac.currentTime + 0.07);
        g.gain.setValueAtTime(0.05, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.07);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(ac.currentTime + 0.07);
    }

    /* ── 3. 화면 전환 (글리치 스윕) ── */
    function transition() {
        const ac = getCtx();
        const t = ac.currentTime;

        // 노이즈 하이패스 스윕
        const src = ac.createBufferSource();
        src.buffer = noise(0.3);
        const filt = ac.createBiquadFilter();
        filt.type = 'highpass';
        filt.frequency.setValueAtTime(300, t);
        filt.frequency.exponentialRampToValueAtTime(9000, t + 0.18);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        src.connect(filt); filt.connect(g); g.connect(ac.destination);
        src.start(); src.stop(t + 0.3);

        // 피치 다운 sweep
        const osc = ac.createOscillator();
        const og = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
        og.gain.setValueAtTime(0.06, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(og); og.connect(ac.destination);
        osc.start(); osc.stop(t + 0.22);
    }

    /* ── 4. 결과창 등장 (스캔 비프) ── */
    function reveal() {
        const ac = getCtx();
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.linearRampToValueAtTime(760, t + 0.12);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 0.18);
    }

    /* ── 5. 버튼 클릭 ── */
    function click() {
        const ac = getCtx();
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 0.07);
    }

    /* ── 6. 로딩 앰비언트 (우주 드론) ── */
    function startLoading() {
        stopLoading();
        const ac = getCtx();
        const t = ac.currentTime;

        // 저음 드론
        const drone = ac.createOscillator();
        const dg = ac.createGain();
        drone.type = 'sine';
        drone.frequency.value = 55;
        dg.gain.setValueAtTime(0, t);
        dg.gain.linearRampToValueAtTime(0.09, t + 0.8);
        drone.connect(dg); dg.connect(ac.destination);
        drone.start();
        loadingNodes.push(drone, dg);

        // 중음 펄스
        const mid = ac.createOscillator();
        const mg = ac.createGain();
        mid.type = 'sine';
        mid.frequency.value = 220;
        mg.gain.setValueAtTime(0, t);
        mg.gain.linearRampToValueAtTime(0.035, t + 0.8);

        const lfo = ac.createOscillator();
        const lg = ac.createGain();
        lfo.frequency.value = 0.7;
        lg.gain.value = 0.025;
        lfo.connect(lg); lg.connect(mg.gain);
        lfo.start();

        mid.connect(mg); mg.connect(ac.destination);
        mid.start();
        loadingNodes.push(mid, mg, lfo, lg);

        // 고음 시머
        const hi = ac.createOscillator();
        const hg = ac.createGain();
        hi.type = 'sine';
        hi.frequency.value = 1100;
        hg.gain.setValueAtTime(0, t);
        hg.gain.linearRampToValueAtTime(0.012, t + 1.5);
        hi.connect(hg); hg.connect(ac.destination);
        hi.start();
        loadingNodes.push(hi, hg);
    }

    function stopLoading() {
        if (!ctx) return;
        const t = ctx.currentTime;
        loadingNodes.forEach(n => {
            try {
                if (n instanceof GainNode) {
                    n.gain.setValueAtTime(n.gain.value, t);
                    n.gain.linearRampToValueAtTime(0, t + 0.4);
                } else {
                    n.stop(t + 0.4);
                }
            } catch (_) {}
        });
        loadingNodes = [];
    }

    /* ── 7. TV 꺼짐 (CRT 파워다운) ── */
    function tvOff() {
        const ac = getCtx();
        const t = ac.currentTime;

        // CRT 고주파 하강
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(14000, t);
        osc.frequency.exponentialRampToValueAtTime(18, t + 1.6);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 1.6);

        // 노이즈 크래클
        const src = ac.createBufferSource();
        src.buffer = noise(0.5);
        const ng = ac.createGain();
        ng.gain.setValueAtTime(0.22, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        src.connect(ng); ng.connect(ac.destination);
        src.start(); src.stop(t + 0.5);
    }

    /* ── AudioContext 잠금 해제 ── */
    function unlock() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
    }

    return { glitch, textAppear, transition, reveal, click, startLoading, stopLoading, tvOff, unlock };
})();

/* ── 첫 번째 유저 인터랙션에서 AudioContext 활성화 ── */
(function () {
    const unlock = () => {
        sfx.unlock();
        document.removeEventListener('click',      unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown',    unlock);
    };
    document.addEventListener('click',      unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown',    unlock);
})();

/* ── 전역 버튼 클릭 사운드 ── */
document.addEventListener('click', e => {
    if (e.target.closest('.cyber-btn')) sfx.click();
});
