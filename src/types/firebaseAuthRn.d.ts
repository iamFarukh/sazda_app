import type { AsyncStorageStatic } from '@react-native-async-storage/async-storage';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: AsyncStorageStatic): unknown;
}
