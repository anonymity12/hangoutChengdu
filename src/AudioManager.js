/**
 * 音频管理器 - 使用Web Audio API生成程序化音效
 */
export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.engineGain = null;
        this.engineOscillator = null;
        this.engineRunning = false;
        this.sirenNode = null;
        this.sirenRunning = false;
        this.muted = false;
        
        this.init();
    }
    
    /**
     * 初始化音频系统
     */
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 主音量控制
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.audioContext.destination);
            
            // 引擎音量控制
            this.engineGain = this.audioContext.createGain();
            this.engineGain.gain.value = 0;
            this.engineGain.connect(this.masterGain);
            
            console.log('🔊 音频系统初始化完成');
        } catch (e) {
            console.warn('⚠️ 音频系统初始化失败:', e);
        }
    }
    
    /**
     * 确保音频上下文已启动（需要用户交互后调用）
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
    
    /**
     * 启动引擎声音
     */
    startEngine() {
        if (!this.audioContext || this.engineRunning) return;
        
        this.resume();
        
        // 创建引擎声音（低频振荡器模拟发动机）
        this.engineOscillator = this.audioContext.createOscillator();
        this.engineOscillator.type = 'sawtooth';
        this.engineOscillator.frequency.value = 60;
        
        // 添加低通滤波器使声音更柔和
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;
        
        this.engineOscillator.connect(filter);
        filter.connect(this.engineGain);
        
        this.engineOscillator.start();
        this.engineRunning = true;
    }
    
    /**
     * 停止引擎声音
     */
    stopEngine() {
        if (this.engineOscillator && this.engineRunning) {
            this.engineOscillator.stop();
            this.engineOscillator.disconnect();
            this.engineOscillator = null;
            this.engineRunning = false;
        }
    }
    
    /**
     * 更新引擎声音（根据速度调整音调和音量）
     * @param {number} speed - 车辆速度 (0-1)
     * @param {boolean} accelerating - 是否在加速
     */
    updateEngine(speed, accelerating) {
        if (!this.audioContext || !this.engineRunning) return;
        
        // 根据速度调整频率（模拟转速）
        const baseFreq = 50;
        const maxFreq = 150;
        const targetFreq = baseFreq + (speed * (maxFreq - baseFreq));
        
        if (this.engineOscillator) {
            this.engineOscillator.frequency.setTargetAtTime(
                targetFreq, 
                this.audioContext.currentTime, 
                0.1
            );
        }
        
        // 根据是否加速调整音量
        const targetVolume = accelerating ? 0.15 + speed * 0.15 : 0.05;
        this.engineGain.gain.setTargetAtTime(
            targetVolume, 
            this.audioContext.currentTime, 
            0.1
        );
    }
    
    /**
     * 播放碰撞音效
     */
    playCollision() {
        if (!this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        
        // 创建碰撞声音（噪音 + 低频冲击）
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // 生成带衰减的噪音
        for (let i = 0; i < bufferSize; i++) {
            const decay = 1 - (i / bufferSize);
            data[i] = (Math.random() * 2 - 1) * decay * decay;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = buffer;
        
        // 低通滤波器
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        
        // 音量包络
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        noiseSource.start(now);
        noiseSource.stop(now + 0.3);
        
        // 添加低频冲击声
        const impact = this.audioContext.createOscillator();
        impact.type = 'sine';
        impact.frequency.setValueAtTime(100, now);
        impact.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        
        const impactGain = this.audioContext.createGain();
        impactGain.gain.setValueAtTime(0.4, now);
        impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        impact.connect(impactGain);
        impactGain.connect(this.masterGain);
        
        impact.start(now);
        impact.stop(now + 0.15);
    }
    
    /**
     * 播放警察警报声
     */
    playSiren() {
        if (!this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        const duration = 2;
        
        // 创建双音调警报
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        // 警报音调交替变化
        const freq1Start = 800;
        const freq1End = 600;
        const freq2Start = 600;
        const freq2End = 800;
        
        // 创建音调变化
        for (let i = 0; i < 4; i++) {
            const t = now + i * 0.5;
            osc1.frequency.setValueAtTime(freq1Start, t);
            osc1.frequency.linearRampToValueAtTime(freq1End, t + 0.25);
            osc1.frequency.linearRampToValueAtTime(freq1Start, t + 0.5);
            
            osc2.frequency.setValueAtTime(freq2Start, t);
            osc2.frequency.linearRampToValueAtTime(freq2End, t + 0.25);
            osc2.frequency.linearRampToValueAtTime(freq2Start, t + 0.5);
        }
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gainNode.gain.setValueAtTime(0.15, now + duration - 0.3);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }
    
    /**
     * 播放被抓住音效
     */
    playCaught() {
        if (!this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        
        // 下降音调表示失败
        const osc = this.audioContext.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.5);
    }
    
    /**
     * 播放获得金币音效
     */
    playCoinCollect() {
        if (!this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        
        // 上升音调表示获得奖励
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.setValueAtTime(1100, now + 0.1);
        
        osc2.frequency.setValueAtTime(1100, now);
        osc2.frequency.setValueAtTime(1320, now + 0.1);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.setValueAtTime(0.15, now + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
    }
    
    /**
     * 切换静音
     */
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.3;
        }
        return this.muted;
    }
    
    /**
     * 设置主音量
     * @param {number} volume - 音量 (0-1)
     */
    setVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }
}
