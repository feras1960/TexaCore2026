module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin - DISABLED for web to prevent Worklets errors
      // Only enable on native platforms
      ...(process.env.EXPO_TARGET !== 'web' ? ['react-native-reanimated/plugin'] : []),
    ],
  };
};
