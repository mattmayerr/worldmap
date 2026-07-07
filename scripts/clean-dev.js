const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const nextDir = path.join(process.cwd(), ".next");

if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next cache");
}

if (process.platform === "win32") {
  try {
    const output = execSync('netstat -ano | findstr ":3000.*LISTENING"', {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const pids = new Set(
      output
        .split("\n")
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && pid !== "0")
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Stopped process on port 3000 (PID ${pid})`);
      } catch {
        // ignore
      }
    }
  } catch {
    // port already free
  }
}
