import RNFS from 'react-native-fs';
import { getOfflineQuranRoot, getSurahJsonPath } from './paths';
import { readManifest, writeManifest } from './manifest';
import { rmrf } from './fsUtils';

/** Remove one surah's JSON, audio folder, and manifest entry (e.g. cancel or user delete). */
export async function clearSurahOfflineData(surahNumber: number): Promise<void> {
  const jsonPath = getSurahJsonPath(surahNumber);
  if (await RNFS.exists(jsonPath)) {
    await RNFS.unlink(jsonPath);
  }
  const audioDir = `${getOfflineQuranRoot()}/audio/${String(surahNumber).padStart(3, '0')}`;
  await rmrf(audioDir);
  const m = await readManifest();
  if (m) {
    delete m.surahs[String(surahNumber)];
    await writeManifest(m);
  }
}
