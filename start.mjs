import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
    else child.kill();
  }
  process.exitCode = code;
}

async function isReady(url, expected) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok && (await response.text()).includes(expected);
  } catch {
    return false;
  }
}

async function launch(name, command, args, cwd, url, expected) {
  if (await isReady(url, expected)) {
    console.log(`${name} is already running.`);
    return;
  }
  const child = spawn(command, args, {
    cwd, stdio: 'inherit', windowsHide: true,
    env: { ...process.env, FLASK_DEBUG: '0', PYTHONUNBUFFERED: '1' },
  });
  children.push(child);
  child.on('error', error => { console.error(`${name}: ${error.message}`); stop(1); });
  child.on('exit', code => { if (!stopping) { console.error(`${name} stopped (${code}).`); stop(code || 1); } });
  for (let attempt = 0; attempt < 40; attempt++) {
    if (stopping) throw new Error(`${name} could not start.`);
    if (await isReady(url, expected)) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`${name} did not become ready at ${url}. Check whether its port is already in use.`);
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
try {
  const python = path.join(root, 'Backend', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (!existsSync(python)) throw new Error('Backend virtual environment is missing. Install Backend/requirements.txt first.');
  await launch('Backend', python, ['app.py'], path.join(root, 'Backend'), 'http://127.0.0.1:5000/', 'Events API');
  const port = process.env.PORT || '3000';
  await launch('Frontend', process.execPath, ['server.mjs'], path.join(root, 'frontend'), `http://127.0.0.1:${port}/`, 'Campus Connect');
  console.log(`\nOpen http://localhost:${port} — frontend and backend are connected.\nPress Ctrl+C to stop servers started by this command.`);
} catch (error) {
  console.error(error.message);
  stop(1);
}
