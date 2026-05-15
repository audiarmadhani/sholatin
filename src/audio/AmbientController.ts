import { Audio } from 'expo-av';

/**
 * Ambient audio: respects master mute. No bundled stems in MVP — API ready for future assets.
 * Call init() once; home screen keeps ambient unmuted (no in-app mute control).
 */
export class AmbientController {
  private bed: Audio.Sound | null = null;

  private muted = false;

  async init() {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.bed) {
      this.bed.setIsMutedAsync(m).catch(() => {});
    }
  }

  /** Map channel harmony [0,1] to volume when stems exist. */
  async updateFromHarmony(harmony: number) {
    if (this.muted) return;
    // Placeholder: no remote/file asset shipped. Unload any previous.
    if (!this.bed) return;
    const vol = 0.05 + harmony * 0.08;
    await this.bed.setVolumeAsync(Math.min(0.2, vol)).catch(() => {});
  }

  async unload() {
    if (this.bed) {
      await this.bed.unloadAsync();
      this.bed = null;
    }
  }
}

export const ambient = new AmbientController();
