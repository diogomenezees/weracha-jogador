// Metro com suporte a debug IDs do Sentry: é o que liga o stack trace de release
// ao código original (sourcemaps enviados no build do EAS).
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = config;
