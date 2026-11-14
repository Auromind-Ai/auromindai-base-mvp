const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER_START = '// [with-windows-short-cxx] start';
const MARKER_END = '// [with-windows-short-cxx] end';

const GROOVY_SNIPPET = `${MARKER_START}
subprojects { subproject ->
  if (System.getProperty("os.name").toLowerCase(java.util.Locale.ROOT).contains("win")) {
    def sdkDir = System.getenv("ANDROID_HOME") ?: System.getenv("ANDROID_SDK_ROOT") ?: ((System.getenv("LOCALAPPDATA") ?: "") + "/Android/Sdk")
    def cmakeDir = new File(sdkDir, "cmake")
    def preferredCmake = ["3.31.6", "3.31.1"].find { new File(cmakeDir, it).exists() }
    def sysDrive = System.getenv("SystemDrive") ?: "C:"
    ["com.android.library", "com.android.application"].each { pluginId ->
      subproject.plugins.withId(pluginId) {
        def androidExt = subproject.extensions.findByName("android")
        if (androidExt != null) {
          if (androidExt.externalNativeBuild?.cmake?.buildStagingDirectory == null) {
            androidExt.externalNativeBuild.cmake.buildStagingDirectory = new File(sysDrive + "/cxx", subproject.name)
          }
          if (preferredCmake != null && androidExt.externalNativeBuild?.cmake?.version == null) {
            androidExt.externalNativeBuild.cmake.version = preferredCmake
          }
        }
      }
    }
  }
}
${MARKER_END}`;

module.exports = function withWindowsShortCxx(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    let contents = mod.modResults.contents;
    if (contents.includes(MARKER_START)) {
      contents = contents.replace(
        new RegExp(`${MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        GROOVY_SNIPPET
      );
    } else {
      contents = contents.replace(
        'apply plugin: "expo-root-project"',
        `${GROOVY_SNIPPET}\n\napply plugin: "expo-root-project"`
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });
};
