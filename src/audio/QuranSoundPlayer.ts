import Sound from 'react-native-sound';

// Ensure audible playback on iOS even with the silent switch.
// 2nd arg = mixWithOthers (keeps other audio playing if user wants).
Sound.setCategory('Playback', true);

type LoadResult = { ok: true; duration: number } | { ok: false; message: string };

/**
 * Single global audio engine (singleton).
 * - Ensures only one sound instance is alive at a time.
 * - Guards against rapid-tap race conditions with a monotonically increasing token.
 */
export class QuranSoundPlayer {
  private sound: Sound | null = null;
  private token = 0;
  private playing = false;
  private url: string | null = null;

  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private onProgress: ((pos: number, duration: number) => void) | null = null;
  private onEnd: (() => void) | null = null;

  setListeners(listeners: {
    onProgress?: (pos: number, duration: number) => void;
    onEnd?: () => void;
  }) {
    this.onProgress = listeners.onProgress ?? null;
    this.onEnd = listeners.onEnd ?? null;
  }

  getCurrentUrl() {
    return this.url;
  }

  isPlaying() {
    return this.playing;
  }

  async load(url: string): Promise<LoadResult> {
    const myToken = ++this.token;
    this.stopInternal();
    this.url = url;

    return await new Promise<LoadResult>(resolve => {
      // For remote urls, pass undefined base path
      const s = new Sound(url, undefined, error => {
        if (myToken !== this.token) {
          s.release();
          return;
        }
        if (error) {
          s.release();
          this.sound = null;
          this.url = null;
          resolve({ ok: false, message: 'Unable to play audio' });
          return;
        }
        this.sound = s;
        try {
          s.setVolume(1.0);
        } catch {
          // ignore
        }
        resolve({ ok: true, duration: s.getDuration() || 0 });
      });
    });
  }

  play() {
    if (!this.sound) return;
    this.playing = true;
    this.startProgress();
    this.sound.play(success => {
      // Note: callback runs on JS thread; keep it lightweight.
      this.playing = false;
      this.stopProgress();
      if (success) {
        this.onEnd?.();
      }
    });
  }

  pause() {
    if (!this.sound) return;
    this.sound.pause();
    this.playing = false;
    this.stopProgress();
  }

  stop() {
    this.stopInternal();
    this.url = null;
  }

  seek(sec: number) {
    if (!this.sound) return;
    this.sound.setCurrentTime(Math.max(0, sec));
  }

  private startProgress() {
    if (!this.sound || this.progressTimer) return;
    // Controlled interval: avoid per-frame updates.
    this.progressTimer = setInterval(() => {
      const s = this.sound;
      if (!s) return;
      s.getCurrentTime(pos => {
        const d = s.getDuration() || 0;
        this.onProgress?.(pos || 0, d);
      });
    }, 450);
  }

  private stopProgress() {
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.progressTimer = null;
  }

  private stopInternal() {
    this.stopProgress();
    this.playing = false;
    if (this.sound) {
      try {
        this.sound.stop(() => {});
      } catch {
        // ignore
      }
      this.sound.release();
    }
    this.sound = null;
  }
}

export const quranSoundPlayer = new QuranSoundPlayer();

