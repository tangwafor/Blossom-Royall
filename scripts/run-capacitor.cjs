const os = require("node:os");

try {
  os.userInfo();
} catch {
  os.userInfo = () => ({ shell: process.env.ComSpec || "cmd.exe" });
}

process.argv = [process.execPath, "cap", ...process.argv.slice(2)];
require("../node_modules/@capacitor/cli/bin/capacitor");
