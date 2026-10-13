/**
 * withReelMindNative — config plugin for the ReelMind Fire TV build.
 *
 * Does two things that Expo defaults get wrong for a TV app:
 *
 * 1. RAW voice intent filter. Expo prefixes custom actions with
 *    "android.intent.action." — but Fire OS custom voice intents must match
 *    the exact action string configured in the Fire OS Developer Options
 *    console (com.reelmind.app.ASK). This plugin adds the intent filter
 *    with the exact action. (So `android.intentFilters` is NOT set in
 *    app.json — that would create a prefixed duplicate.)
 *
 * 2. Explicit registration of the local native package `reelmind-remote`
 *    (D-pad/ENTER/BACK key events + voice intent consumption). The generated
 *    app is patched so the module is wired deterministically:
 *      - settings.gradle: include ':reelmind-remote'
 *      - app/build.gradle: implementation project(':reelmind-remote')
 *      - MainApplication: add(ReelMindRemotePackage())
 *
 * All edits are idempotent (safe to run on every `expo prebuild`).
 */
const {
  withAndroidManifest,
  withAppBuildGradle,
  withMainApplication,
  withSettingsGradle,
} = require('@expo/config-plugins');
const path = require('path');

const VOICE_ACTION = 'com.reelmind.app.ASK';
const MODULE_NAME = 'reelmind-remote';
const PACKAGE_CLASS = 'com.reelmind.remote.ReelMindRemotePackage';

function withVoiceIntentFilter(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application[0];
    const activities = application.activity || [];
    // The main (launcher) activity is the one Expo generated with the
    // MAIN/LAUNCHER intent filter.
    const main =
      activities.find((a) =>
        (a['intent-filter'] || []).some((f) =>
          (f.action || []).some((x) => x.$['android:name'] === 'android.intent.action.MAIN'),
        ),
      ) || activities[0];
    if (!main) {
      throw new Error('withReelMindNative: could not find main activity in AndroidManifest.xml');
    }
    const filters = main['intent-filter'] || (main['intent-filter'] = []);
    const hasRaw = filters.some((f) =>
      (f.action || []).some((x) => x.$['android:name'] === VOICE_ACTION),
    );
    // Drop the Expo-prefixed duplicate if present (action "android.intent.action.<VOICE_ACTION>").
    const prefixed = 'android.intent.action.' + VOICE_ACTION;
    main['intent-filter'] = filters.filter(
      (f) => !(f.action || []).some((x) => x.$['android:name'] === prefixed),
    );
    if (!hasRaw) {
      main['intent-filter'].push({
        $: { 'android:label': 'reelmind-voice-ask' },
        action: [{ $: { 'android:name': VOICE_ACTION } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      });
    }
    return cfg;
  });
}

function withModuleInclude(config) {
  return withSettingsGradle(config, (cfg) => {
    let content = cfg.modResults.contents;
    if (!content.includes(`:${MODULE_NAME}`)) {
      content += [
        '',
        `// ReelMind native remote bridge (local RN package under client/packages)`,
        `include ':${MODULE_NAME}'`,
        `project(':${MODULE_NAME}').projectDir = new File(rootProject.projectDir, '../packages/${MODULE_NAME}/android')`,
        '',
      ].join('\n');
      cfg.modResults.contents = content;
    }
    return cfg;
  });
}

function withModuleDependency(config) {
  return withAppBuildGradle(config, (cfg) => {
    let content = cfg.modResults.contents;
    if (!content.includes(`project(':${MODULE_NAME}')`)) {
      content = content.replace(
        /dependencies\s*\{/,
        `dependencies {\n    // ReelMind native remote bridge\n    implementation project(':${MODULE_NAME}')`,
      );
      cfg.modResults.contents = content;
    }
    return cfg;
  });
}

function withModuleRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let content = cfg.modResults.contents;
    if (!content.includes('ReelMindRemotePackage')) {
      content = content.replace(
        'import com.facebook.react.ReactApplication',
        `import com.reelmind.remote.ReelMindRemotePackage\nimport com.facebook.react.ReactApplication`,
      );
      // Hook into the autolinked PackageList block.
      content = content.replace(
        /(PackageList\(this\)\.packages\.apply \{)/,
        `$1\n              add(ReelMindRemotePackage())`,
      );
      cfg.modResults.contents = content;
    }
    return cfg;
  });
}

module.exports = function withReelMindNative(config) {
  return withVoiceIntentFilter(withModuleInclude(withModuleDependency(withModuleRegistration(config))));
};

module.exports.VOICE_ACTION = VOICE_ACTION;
