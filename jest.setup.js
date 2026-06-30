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
  const { View, Text, ScrollView } = require('react-native');
  const createAnimatedComponent = c => c;
  const identityEasing = () => 0;
  const chain = () => identityEasing;
  const Easing = {
    linear: identityEasing,
    ease: identityEasing,
    quad: identityEasing,
    cubic: identityEasing,
    sin: identityEasing,
    exp: identityEasing,
    bezier: () => identityEasing,
    in: chain,
    out: chain,
    inOut: chain,
  };
  return {
    __esModule: true,
    default: { createAnimatedComponent, View, Text, ScrollView },
    View,
    Text,
    ScrollView,
    createAnimatedComponent,
    useSharedValue: v => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    useDerivedValue: fn => ({ value: typeof fn === 'function' ? fn() : fn }),
    useReducedMotion: () => false,
    withTiming: v => v,
    withSpring: v => v,
    withDelay: (_d, v) => v,
    withRepeat: v => v,
    withSequence: (...vals) => vals[vals.length - 1],
    cancelAnimation: () => {},
    interpolate: (_v, _in, out) => (Array.isArray(out) ? out[0] : 0),
    runOnJS: fn => fn,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend' },
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    Easing,
    Animated: { View, Text, ScrollView, createAnimatedComponent },
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = props => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: Mock,
    Svg: Mock,
    Circle: Mock,
    Path: Mock,
    G: Mock,
    Rect: Mock,
    Defs: Mock,
    LinearGradient: Mock,
    RadialGradient: Mock,
    Stop: Mock,
    ClipPath: Mock,
    Text: Mock,
  };
});

jest.mock('lottie-react-native', () => 'LottieView');

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

