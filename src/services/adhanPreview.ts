import Sound from 'react-native-sound';
import { getBuiltinAdhanBundleFile } from '../constants/adhanBuiltInSounds';

Sound.setCategory('Playback', true);

/** Play a bundled built-in clip once (for settings “test sound”). */
export function playBundledAdhanPreview(soundId: string): Promise<void> {
  const file = getBuiltinAdhanBundleFile(soundId);
  if (!file) return Promise.resolve();

  return new Promise((resolve) => {
    const s = new Sound(file, Sound.MAIN_BUNDLE, (err) => {
      if (err) {
        resolve();
        return;
      }
      s.play(() => {
        s.release();
        resolve();
      });
    });
  });
}
