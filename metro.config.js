const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add support for .mjs files which are used by lucide-react-native
config.resolver.sourceExts.push("mjs");

module.exports = withNativeWind(config, { input: "./global.css" });
