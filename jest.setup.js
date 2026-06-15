import 'react-native-gesture-handler/jestSetup';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// TurboModules used by some RN libs in tests
jest.mock('react-native-mmkv', () => {
  const map = new Map();
  return {
    createMMKV: () => ({
      getString: key => map.get(key) ?? null,
      set: (key, value) => {
        map.set(key, String(value));
      },
      remove: key => {
        map.delete(key);
      },
    }),
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

jest.mock('@react-native-vector-icons/material-icons', () => 'MaterialIcons');

global.__reanimatedWorkletInit = () => {};

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const createAnimatedComponent = c => c;
  return {
    __esModule: true,
    default: { createAnimatedComponent },
    View,
    createAnimatedComponent,
    useSharedValue: v => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: v => v,
    runOnJS: fn => fn,
    Easing: {},
    Animated: { View, createAnimatedComponent },
  };
});

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => () => {}),
  signOut: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn() },
  signInWithCredential: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
    createChannel: jest.fn(async () => 'test-channel'),
    deleteChannel: jest.fn(async () => {}),
    displayNotification: jest.fn(async () => {}),
    createTriggerNotification: jest.fn(async () => {}),
    cancelTriggerNotification: jest.fn(async () => {}),
  },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
  RepeatFrequency: { DAILY: 'DAILY' },
  TriggerType: { TIMESTAMP: 'TIMESTAMP' },
  AndroidVisibility: { PUBLIC: 'PUBLIC' },
  AndroidCategory: { ALARM: 'ALARM', REMINDER: 'REMINDER' },
  AndroidStyle: { INBOX: 'INBOX' },
}));

jest.mock('@react-native-community/geolocation', () => ({
  setRNConfiguration: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

