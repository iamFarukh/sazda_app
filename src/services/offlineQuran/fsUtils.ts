import RNFS from 'react-native-fs';

export async function ensureDir(path: string): Promise<void> {
  const exists = await RNFS.exists(path);
  if (!exists) {
    await RNFS.mkdir(path);
  }
}

export async function rmrf(path: string): Promise<void> {
  const exists = await RNFS.exists(path);
  if (!exists) return;
  const stat = await RNFS.stat(path);
  if (stat.isFile()) {
    await RNFS.unlink(path);
    return;
  }
  const items = await RNFS.readDir(path);
  for (const it of items) {
    await rmrf(it.path);
  }
  await RNFS.unlink(path);
}

export async function sumDirectoryBytes(dir: string): Promise<number> {
  const exists = await RNFS.exists(dir);
  if (!exists) return 0;
  const stat = await RNFS.stat(dir);
  if (stat.isFile()) {
    return Number(stat.size ?? 0);
  }
  const items = await RNFS.readDir(dir);
  let total = 0;
  for (const it of items) {
    total += await sumDirectoryBytes(it.path);
  }
  return total;
}
