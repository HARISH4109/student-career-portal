const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

(async () => {
  const port = await getAvailablePort();
  const child = spawn(process.execPath, ['apps/api/dist/server.js'], {
    windowsHide: true,
    env: { ...process.env, NODE_ENV: 'production', LOG_LEVEL: 'fatal', API_PORT: String(port),
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/career_portal_test',
      SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'smoke-test', SUPABASE_ANON_KEY: 'smoke-test',
      JWT_SECRET: 'smoke-test-secret-16-characters', REDIS_URL: 'redis://127.0.0.1:6379',
      AI_SERVICE_BASE_URL: 'http://127.0.0.1:8000', AI_SERVICE_INTERNAL_TOKEN: 'smoke-test',
    }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  try {
    for (let attempt = 0; attempt < 30; attempt++) {
      if (child.exitCode !== null) throw new Error(`Production startup exited ${child.exitCode}: ${stderr}`);
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/v1/opportunities`, { signal: AbortSignal.timeout(1000) });
        const body = await response.json();
        if (response.status !== 401 || body.error?.code !== 'UNAUTHORIZED') throw new Error('Unexpected authentication response');
        console.log('PASS: compiled production API starts with plain Node and serves protected routes.');
        return;
      } catch (error) {
        if (attempt === 29) throw error;
        await delay(250);
      }
    }
  } finally { child.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

