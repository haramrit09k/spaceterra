// Spawns one of ai-player/local-model/{server,ollama_server,laya_server}.py
// and waits for it to accept connections. Shared by play.js and collect.js
// so both talk to a backend the same way - kept separate from jev.js so
// jev.js doesn't need to know how its backends get started, just where to
// send requests (LOCAL_JEV_URL).
const { spawn } = require('child_process');

function startLocalModelServer(scriptPath, port, logTag) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [scriptPath, String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let settled = false;
    proc.stdout.on('data', (chunk) => {
      process.stdout.write(`[${logTag}] ${chunk}`);
      if (!settled && chunk.toString().includes('serving on')) {
        settled = true;
        resolve(proc);
      }
    });
    proc.stderr.on('data', (chunk) => process.stderr.write(`[${logTag}] ${chunk}`));
    proc.on('exit', (code) => {
      if (!settled) reject(new Error(`${logTag} server exited early (code ${code})`));
    });
  });
}

module.exports = { startLocalModelServer };
