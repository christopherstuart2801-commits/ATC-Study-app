// Web Audio API & Speech Synthesis helper for ATC Radio Squelch & Pilot Readbacks

class ATCAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Plays a radio squelch burst (PTT press or release)
  public playSquelch(type: 'press' | 'release' = 'press') {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const duration = type === 'press' ? 0.08 : 0.12;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to sound like narrow VHF radio
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 3;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(type === 'press' ? 0.15 : 0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {
      console.warn('Audio squelch error:', e);
    }
  }

  // Alias for speakReadback
  public speak(text: string, onEnd?: () => void) {
    this.speakReadback(text, onEnd);
  }

  // Plays a roger beep tone
  public playRogerBeep() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Roger beep error:', e);
    }
  }

  // Speak pilot readback using SpeechSynthesis with simulated radio pitch/rate
  public speakReadback(text: string, onEnd?: () => void) {
    if (this.isMuted || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    this.playSquelch('press');

    setTimeout(() => {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95 + (Math.random() * 0.1 - 0.05); // Slightly varied military tone
      utterance.volume = 0.9;

      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('US') || v.name.includes('Natural'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (engVoice) {
        utterance.voice = engVoice;
      }

      utterance.onend = () => {
        this.playSquelch('release');
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.playSquelch('release');
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    }, 100);
  }
}

export const audioEngine = new ATCAudioEngine();
