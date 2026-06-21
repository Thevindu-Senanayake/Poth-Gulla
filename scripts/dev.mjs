import { execSync, spawn } from 'child_process';

const SERVICES = ['postgres', 'redis'];

function dockerUp() {
    console.log('[dev] Starting Docker services: ' + SERVICES.join(', '));
    execSync(`docker compose up -d ${SERVICES.join(' ')}`, { stdio: 'inherit' });
    console.log('[dev] Waiting for postgres to be healthy...');
    execSync(
        `docker compose exec postgres sh -c "until pg_isready -U admin -d poth_gulla; do sleep 1; done"`,
        { stdio: 'inherit' }
    );
}

function dockerDown() {
    console.log('\n[dev] Stopping Docker services...');
    try {
        execSync(`docker compose stop ${SERVICES.join(' ')}`, { stdio: 'inherit' });
    } catch {
        // best-effort
    }
}

dockerUp();

const turbo = spawn('yarn', ['turbo', 'dev', '--filter=poth-gulla-backend', '--filter=admin-web-client', '--filter=client'], {
    stdio: 'inherit',
    shell: true,
});

let cleanedUp = false;
function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    turbo.kill('SIGTERM');
    dockerDown();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
turbo.on('exit', () => {
    if (!cleanedUp) {
        cleanedUp = true;
        dockerDown();
    }
});
