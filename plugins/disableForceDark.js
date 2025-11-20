const { withAndroidStyles } = require("@expo/config-plugins");

const ensureForceDarkDisabled = (styles) => {
  if (!Array.isArray(styles)) return;
  styles.forEach((style) => {
    if (!style.$ || !style.$.name) return;
    const isAppTheme = ["AppTheme", "AppTheme.NoActionBar", "Theme.App.SplashScreen"].includes(style.$.name);
    if (!isAppTheme) return;
    const targetName = "android:forceDarkAllowed";
    style.item = style.item || [];
    const existing = style.item.find((item) => item.$?.name === targetName);
    if (existing) {
      existing._ = "false";
    } else {
      style.item.push({
        _: "false",
        $: { name: targetName },
      });
    }
  });
};

const withDisableForceDark = (config) => {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults?.resources?.style;
    ensureForceDarkDisabled(styles);
    return config;
  });
};

module.exports = withDisableForceDark;
