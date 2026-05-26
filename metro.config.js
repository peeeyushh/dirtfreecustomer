const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Fix for "spawn UNKNOWN" on Windows
if (process.platform === "win32") {
  process.env.SystemRoot = process.env.SystemRoot || "C:\\Windows";
}

const config = getDefaultConfig(__dirname);

// Add support for .mjs files which are used by lucide-react-native
config.resolver.sourceExts.push("mjs");

module.exports = withNativeWind(config, { input: "./global.css" });
