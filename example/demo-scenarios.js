/**
 * demo-scenarios.js
 * Simulates realistic app behaviour to exercise every WebConsole feature.
 * Load after new-webConsole.js — each function is self-contained.
 */

// ── Simulate a realistic API call chain ─────────────────────
function demoApiCallChain() {
    console.info('[demo] Starting API call chain…');

    fetch('https://jsonplaceholder.typicode.com/users/1')
        .then(r => r.json())
        .then(user => {
            console.log('User loaded:', user);
            return fetch(`https://jsonplaceholder.typicode.com/posts?userId=${user.id}`);
        })
        .then(r => r.json())
        .then(posts => {
            console.log(`Fetched ${posts.length} posts for user`, posts.slice(0, 3));
            return fetch(`https://jsonplaceholder.typicode.com/comments?postId=${posts[0].id}`);
        })
        .then(r => r.json())
        .then(comments => {
            console.log(`Fetched ${comments.length} comments on first post`, comments.slice(0, 2));
            console.info('[demo] API chain finished ✓');
        })
        .catch(err => console.error('[demo] API chain failed:', err));
}

// ── Simulate periodic background logging ────────────────────
function demoPeriodicLogs(count = 10, intervalMs = 800) {
    let i = 0;
    console.info(`[demo] Starting periodic logger — ${count} entries every ${intervalMs}ms`);
    const id = setInterval(() => {
        const mem = (Math.random() * 200 + 50).toFixed(1);
        const cpu = (Math.random() * 100).toFixed(0);
        console.log(`[tick ${i + 1}/${count}] heap: ${mem} MB  cpu: ${cpu}%`);
        i++;
        if (i >= count) {
            clearInterval(id);
            console.info('[demo] Periodic logger finished ✓');
        }
    }, intervalMs);
}

// ── Simulate mixed log levels during "app boot" ─────────────
function demoAppBoot() {
    console.info('─── App Boot Sequence ───');
    console.log('Loading configuration…');
    console.log('Config:', {
        env: 'production',
        api: 'https://api.example.com/v2',
        features: { darkMode: true, analytics: true, betaChat: false },
        build: { version: '2.4.1', commit: 'a3f8d09', date: '2026-02-13T08:30:00Z' }
    });
    console.info('Connecting to WebSocket wss://rt.example.com…');
    console.warn('WebSocket latency is elevated: 320 ms (threshold: 200 ms)');
    console.log('Auth token refreshed — expires in 3600 s');
    console.info('Service Worker: active, scope /app/');
    console.log('Loaded 3 plugins:', ['analytics', 'crash-reporter', 'feature-flags']);
    console.warn('Plugin "crash-reporter" is using deprecated v1 API — update to v2');
    console.error('Failed to pre-cache /assets/icons/sprite.svg — 404');
    console.info('─── Boot complete (1.24 s) ───');
}

// ── Simulate a caught exception with stack ──────────────────
function demoCaughtException() {
    try {
        const data = null;
        data.map(x => x * 2);
    } catch (e) {
        console.error('Unhandled runtime error:', e.message);
        console.error(e.stack);
    }
}

// ── Simulate large nested object inspection ─────────────────
function demoDeepObject() {
    console.log('Deep object:', {
        app: {
            name: 'WebConsole Demo',
            modules: {
                auth: { provider: 'OAuth2', scopes: ['read', 'write', 'admin'], tokenTTL: 3600 },
                storage: {
                    driver: 'indexedDB',
                    databases: [
                        { name: 'app-cache', version: 3, stores: ['assets', 'api-cache', 'user-prefs'] },
                        { name: 'offline-queue', version: 1, stores: ['pending-sync'] }
                    ]
                },
                ui: {
                    theme: { mode: 'dark', accent: '#0078d4', radius: 8 },
                    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
                    animations: { enabled: true, reducedMotion: false, duration: 200 }
                }
            }
        }
    });
}

