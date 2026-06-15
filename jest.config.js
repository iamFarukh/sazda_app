module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-gesture-handler|react-native-drawer-layout|react-native-reanimated|@react-native-google-signin/google-signin)/)',
  ],
  moduleNameMapper: {
    '\\.(ttf|otf|png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
