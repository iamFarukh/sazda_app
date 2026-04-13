module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Reanimated 4 bundles worklets; keep this plugin last (required).
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      safe: false,
      allowUndefined: true,
      verbose: false,
    }],
    'react-native-reanimated/plugin',
  ],
};
