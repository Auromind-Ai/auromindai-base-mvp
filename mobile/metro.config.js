const os = require('os');
const { getDefaultConfig } = require('expo/metro-config');


if (os.platform() === 'win32') {
  try {
    const NativeWatcher = require('metro-file-map/private/watchers/NativeWatcher').default;
    if (NativeWatcher && !NativeWatcher.__win32Patched) {
      NativeWatcher.__win32Patched = true;
      NativeWatcher.isSupported = () => true;

      const origHandleEvent = NativeWatcher.prototype._handleEvent;
      NativeWatcher.prototype._handleEvent = async function (event, relativePath) {
        if (!relativePath) return;
        const normalized = relativePath.replace(/\\/g, '/');
        if (
          normalized === 'node_modules' ||
          normalized.startsWith('node_modules/') ||
          normalized === '.expo' ||
          normalized.startsWith('.expo/')
        ) {
          return;
        }
        return origHandleEvent.call(this, event, relativePath);
      };
    }
  } catch {
    // Fallback to default Metro watcher if internal module layout changes
  }
}

module.exports = getDefaultConfig(__dirname);
