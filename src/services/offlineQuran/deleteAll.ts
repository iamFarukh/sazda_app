import { getOfflineQuranRoot } from './paths';
import { rmrf } from './fsUtils';

export async function deleteAllOfflineQuranData(): Promise<void> {
  await rmrf(getOfflineQuranRoot());
}
