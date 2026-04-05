import { PermissionsAndroid, Platform } from 'react-native';

const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

async function hasFineOrCoarse(): Promise<boolean> {
  const fineStatus = await PermissionsAndroid.check(FINE);
  const coarseStatus = await PermissionsAndroid.check(COARSE);
  return fineStatus || coarseStatus;
}

export async function ensureFineLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (await hasFineOrCoarse()) return true;

    const granted = await PermissionsAndroid.requestMultiple([FINE, COARSE]);
    const fromDialog =
      granted[FINE] === PermissionsAndroid.RESULTS.GRANTED ||
      granted[COARSE] === PermissionsAndroid.RESULTS.GRANTED;

    // Some devices lag updating permission state; trust check() after the dialog too.
    if (fromDialog || (await hasFineOrCoarse())) return true;
    return false;
  }
  return true;
}
