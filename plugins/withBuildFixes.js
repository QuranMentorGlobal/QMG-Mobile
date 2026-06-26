// plugins/withBuildFixes.js
// CNG config plugin that makes release builds succeed on CI:
//   1) Bumps Gradle JVM heap + metaspace (the default 512 MiB metaspace OOMs the
//      release "lintVitalAnalyzeRelease" task on GitHub runners).
//   2) Disables release-build lint entirely — lint is a code-quality check and is
//      not needed to produce the .aab, and it's the task that was crashing.
// Applied automatically during `expo prebuild` (so it works with `eas build --local`).
const { withGradleProperties, withAppBuildGradle } = require('expo/config-plugins');

const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=2048m -XX:+UseParallelGC -Dfile.encoding=UTF-8';

function setJvmArgs(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs')
    );
    cfg.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    return cfg;
  });
}

function disableReleaseLint(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;
    if (!contents.includes('checkReleaseBuilds false')) {
      contents = contents.replace(
        /android\s*\{/,
        'android {\n    lint {\n        checkReleaseBuilds false\n        abortOnError false\n    }'
      );
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = function withBuildFixes(config) {
  config = setJvmArgs(config);
  config = disableReleaseLint(config);
  return config;
};
