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

    /* ── 1. 지직 글리치 ── */
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
        g.gain.setValueAtTime(0.7, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(filt); filt.connect(g); g.connect(ac.destination);
        src.start(); src.stop(t + dur);

        const osc = ac.createOscillator();
        const og  = ac.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + dur);
        og.gain.setValueAtTime(0.2, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(og); og.connect(ac.destination);
        osc.start(); osc.stop(t + dur);
    }

    /* ── 2. 텍스트 등장 ── */
    function textAppear() {
        const ac = getCtx();
        const t  = ac.currentTime;
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'square';
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(450, t + 0.08);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 0.08);
    }

    /* ── 3. 화면 전환 ── */
    function transition() {
        const ac = getCtx();
        const t  = ac.currentTime;

        const src  = ac.createBufferSource();
        src.buffer = noise(0.3);
        const filt = ac.createBiquadFilter();
        filt.type  = 'highpass';
        filt.frequency.setValueAtTime(300, t);
        filt.frequency.exponentialRampToValueAtTime(9000, t + 0.18);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.45, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        src.connect(filt); filt.connect(g); g.connect(ac.destination);
        src.start(); src.stop(t + 0.3);

        const osc = ac.createOscillator();
        const og  = ac.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.setValueAtTime(250, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
        og.gain.setValueAtTime(0.2, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(og); og.connect(ac.destination);
        osc.start(); osc.stop(t + 0.22);
    }

    /* ── 4. 결과창 스캔 비프 ── */
    function reveal() {
        const ac = getCtx();
        const t  = ac.currentTime;
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.linearRampToValueAtTime(760, t + 0.15);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 0.2);
    }

    /* ── 5. 버튼 클릭 ── */
    function click() {
        const ac = getCtx();
        const t  = ac.currentTime;
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'square';
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 0.08);
    }

    /* ── 6. 로딩 앰비언트 ── */
    function startLoading() {
        stopLoading();
        const ac = getCtx();
        const t  = ac.currentTime;

        // 저음 드론
        const drone = ac.createOscillator();
        const dg    = ac.createGain();
        drone.type  = 'sine';
        drone.frequency.value = 55;
        dg.gain.setValueAtTime(0, t);
        dg.gain.linearRampToValueAtTime(0.2, t + 0.8);
        drone.connect(dg); dg.connect(ac.destination);
        drone.start();
        loadingOscs.push(drone); loadingGains.push(dg);

        // 중음 펄스 + LFO
        const mid = ac.createOscillator();
        const mg  = ac.createGain();
        mid.type  = 'sine';
        mid.frequency.value = 220;
        mg.gain.setValueAtTime(0, t);
        mg.gain.linearRampToValueAtTime(0.1, t + 0.8);

        const lfo = ac.createOscillator();
        const lg  = ac.createGain();
        lfo.frequency.value = 0.7;
        lg.gain.value = 0.06;
        lfo.connect(lg); lg.connect(mg.gain);
        lfo.start();

        mid.connect(mg); mg.connect(ac.destination);
        mid.start();
        loadingOscs.push(mid, lfo); loadingGains.push(mg);

        // 고음 시머
        const hi = ac.createOscillator();
        const hg = ac.createGain();
        hi.type  = 'sine';
        hi.frequency.value = 1100;
        hg.gain.setValueAtTime(0, t);
        hg.gain.linearRampToValueAtTime(0.04, t + 1.5);
        hi.connect(hg); hg.connect(ac.destination);
        hi.start();
        loadingOscs.push(hi); loadingGains.push(hg);
    }

    function stopLoading() {
        if (!ctx) return;
        const t = ctx.currentTime;
        loadingGains.forEach(g => {
            try {
                g.gain.cancelScheduledValues(t);
                g.gain.setValueAtTime(g.gain.value, t);
                g.gain.linearRampToValueAtTime(0, t + 0.4);
            } catch (_) {}
        });
        loadingOscs.forEach(o => {
            try { o.stop(t + 0.5); } catch (_) {}
        });
        loadingOscs  = [];
        loadingGains = [];
    }

    /* ── 7. TV 꺼짐 ── */
    function tvOff() {
        const ac = getCtx();
        const t  = ac.currentTime;

        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.setValueAtTime(14000, t);
        osc.frequency.exponentialRampToValueAtTime(18, t + 1.6);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(t + 1.6);

        const src  = ac.createBufferSource();
        src.buffer = noise(0.5);
        const ng   = ac.createGain();
        ng.gain.setValueAtTime(0.5, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        src.connect(ng); ng.connect(ac.destination);
        src.start(); src.stop(t + 0.5);
    }

    /* ── unlock ── */
    function unlock() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
    }

    return { glitch, textAppear, transition, reveal, click, startLoading, stopLoading, tvOff, unlock };
})();

/* ── AudioContext 활성화 — 매 인터랙션마다 resume 시도 ── */
['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => sfx.unlock(), { passive: true });
});

/* ── 전역 버튼 클릭음 ── */
document.addEventListener('click', e => {
    if (e.target.closest('.cyber-btn')) sfx.click();
});
