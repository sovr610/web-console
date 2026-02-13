class WebConsole {
    constructor(containerId = 'web-console') {
        this.containerId = containerId;
        this.container = document.getElementById(containerId) || this.createContainer(containerId);
        this.initialHeight = 300;
        this.minHeight = 150;
        this.tabs = ['Console', 'Elements', 'Network', 'Events'];
        this.activeTab = 'Console';
        this.consoles = {};
        this.logEntries = [];
        this.logFilter = 'all';
        this.logSearchQuery = '';
        this.logCounts = { log: 0, warn: 0, error: 0, info: 0 };
        this.visible = true;
        this.networkRequests = [];
        this.commandHistory = [];
        this.commandHistoryIndex = -1;
        this._styleEl = null;
        this._originalConsoleMethods = {};

        this.setupStyles();
        this.buildToolbar();
        this.setupTabBar();
        this.setupConsoles();
        this.buildConsoleTab();
        this.overrideConsoleMethods();
        this.setupTouchGesture();
        this.setupResizeHandle();
        this.setupEventLogger();
        this.setupElementsTab();
        this.setupNetworkTab();
        this.interceptNetworkRequests();
    }

    // ── Container ──────────────────────────────────────────────

    createContainer(id) {
        const c = document.createElement('div');
        c.id = id;
        document.body.appendChild(c);
        return c;
    }

    // ── Styles (CSS custom properties + responsive) ───────────

    setupStyles() {
        if (this._styleEl) this._styleEl.remove();
        const s = document.createElement('style');
        this._styleEl = s;
        const id = this.container.id;
        s.textContent = `
/* ── CSS Variables ─────────────────── */
:root {
    --wc-bg: #1e1e1e;
    --wc-bg-toolbar: #252526;
    --wc-bg-tab: #2d2d2d;
    --wc-bg-tab-active: #1e1e1e;
    --wc-bg-input: #1a1a1a;
    --wc-bg-hover: #2a2d2e;
    --wc-bg-row-alt: #262626;
    --wc-border: #3c3c3c;
    --wc-text: #cccccc;
    --wc-text-dim: #858585;
    --wc-accent: #0078d4;
    --wc-log: #d4d4d4;
    --wc-warn: #cca700;
    --wc-warn-bg: rgba(204,167,0,.08);
    --wc-error: #f44747;
    --wc-error-bg: rgba(244,71,71,.08);
    --wc-info: #3794ff;
    --wc-info-bg: rgba(55,148,255,.06);
    --wc-success: #89d185;
    --wc-network-ok: #89d185;
    --wc-network-redirect: #cca700;
    --wc-network-fail: #f44747;
    --wc-font: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
    --wc-font-size: clamp(11px, 2.8vw, 14px);
    --wc-radius: 6px;
    --wc-safe-bottom: env(safe-area-inset-bottom, 0px);
}

/* ── Main Container ────────────────── */
#${id} {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: ${this.initialHeight}px;
    background: var(--wc-bg);
    color: var(--wc-text);
    font-family: var(--wc-font);
    font-size: var(--wc-font-size);
    display: flex;
    flex-direction: column;
    z-index: 99999;
    transition: transform .25s cubic-bezier(.4,0,.2,1);
    box-shadow: 0 -2px 12px rgba(0,0,0,.45);
    border-top: 1px solid var(--wc-border);
    contain: layout style;
    padding-bottom: var(--wc-safe-bottom);
}
#${id}.wc-hidden {
    transform: translateY(100%);
    pointer-events: none;
}

/* ── Resize Handle ─────────────────── */
#${id} .wc-resize-handle {
    height: 14px;
    min-height: 14px;
    cursor: ns-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wc-bg-toolbar);
    border-bottom: 1px solid var(--wc-border);
    touch-action: none;
    flex-shrink: 0;
    -webkit-user-select: none;
    user-select: none;
}
#${id} .wc-resize-handle::after {
    content: '';
    width: 36px; height: 4px;
    border-radius: 2px;
    background: var(--wc-text-dim);
    opacity: .55;
}

/* ── Toolbar ───────────────────────── */
#${id} .wc-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 6px;
    height: 34px;
    min-height: 34px;
    background: var(--wc-bg-toolbar);
    border-bottom: 1px solid var(--wc-border);
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
}
#${id} .wc-toolbar::-webkit-scrollbar { display: none; }

#${id} .wc-toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px; height: 28px;
    padding: 0 8px;
    background: transparent;
    color: var(--wc-text-dim);
    border: none;
    border-radius: 4px;
    font-family: var(--wc-font);
    font-size: calc(var(--wc-font-size) - 1px);
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s, color .15s;
    flex-shrink: 0;
}
#${id} .wc-toolbar-btn:active,
#${id} .wc-toolbar-btn:hover {
    background: var(--wc-bg-hover);
    color: var(--wc-text);
}
#${id} .wc-toolbar-btn.wc-active {
    color: var(--wc-accent);
}

/* ── Tab Bar ───────────────────────── */
#${id} .wc-tab-bar {
    display: flex;
    height: 30px;
    min-height: 30px;
    background: var(--wc-bg-tab);
    border-bottom: 1px solid var(--wc-border);
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;
    -webkit-overflow-scrolling: touch;
}
#${id} .wc-tab-bar::-webkit-scrollbar { display: none; }

#${id} .wc-tab {
    display: inline-flex;
    align-items: center;
    padding: 0 14px;
    height: 100%;
    font-family: var(--wc-font);
    font-size: calc(var(--wc-font-size) - 1px);
    color: var(--wc-text-dim);
    cursor: pointer;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    transition: color .15s, border-color .15s, background .15s;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
    position: relative;
}
#${id} .wc-tab:active,
#${id} .wc-tab:hover {
    color: var(--wc-text);
    background: rgba(255,255,255,.04);
}
#${id} .wc-tab.wc-active {
    color: var(--wc-text);
    border-bottom-color: var(--wc-accent);
    background: var(--wc-bg-tab-active);
}
#${id} .wc-tab .wc-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px; height: 16px;
    margin-left: 6px;
    padding: 0 4px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    color: #fff;
}
#${id} .wc-badge-error { background: var(--wc-error); }
#${id} .wc-badge-warn  { background: var(--wc-warn); color: #000; }

/* ── Panel Content ─────────────────── */
#${id} .wc-panel {
    display: none;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    min-height: 0;
}
#${id} .wc-panel.wc-active { display: flex; flex-direction: column; }

/* ── Console Log Entries ───────────── */
#${id} .wc-log-area {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0;
}
#${id} .wc-log-entry {
    display: flex;
    gap: 8px;
    padding: 4px 10px;
    border-bottom: 1px solid var(--wc-border);
    line-height: 1.45;
    word-break: break-word;
    align-items: flex-start;
}
#${id} .wc-log-entry:hover { background: var(--wc-bg-hover); }
#${id} .wc-log-entry.wc-level-warn  { background: var(--wc-warn-bg); }
#${id} .wc-log-entry.wc-level-error { background: var(--wc-error-bg); }
#${id} .wc-log-entry.wc-level-info  { background: var(--wc-info-bg); }
#${id} .wc-log-entry .wc-log-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: .3px;
}
#${id} .wc-log-entry .wc-badge-log   { color: var(--wc-log); border: 1px solid var(--wc-border); }
#${id} .wc-log-entry .wc-badge-warn  { color: #000; background: var(--wc-warn); }
#${id} .wc-log-entry .wc-badge-error { color: #fff; background: var(--wc-error); }
#${id} .wc-log-entry .wc-badge-info  { color: #fff; background: var(--wc-info); }
#${id} .wc-log-entry .wc-log-time {
    flex-shrink: 0;
    color: var(--wc-text-dim);
    font-size: calc(var(--wc-font-size) - 2px);
    margin-top: 2px;
    min-width: 52px;
}
#${id} .wc-log-entry .wc-log-body {
    flex: 1;
    min-width: 0;
}
#${id} .wc-log-entry .wc-log-body .wc-string { color: var(--wc-log); }
#${id} .wc-log-entry .wc-log-body .wc-number { color: #b5cea8; }
#${id} .wc-log-entry .wc-log-body .wc-boolean { color: #569cd6; }
#${id} .wc-log-entry .wc-log-body .wc-null { color: var(--wc-text-dim); }
#${id} .wc-log-entry .wc-log-body .wc-undefined { color: var(--wc-text-dim); }

/* ── Filter Bar ────────────────────── */
#${id} .wc-filter-bar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px 6px;
    border-bottom: 1px solid var(--wc-border);
    background: var(--wc-bg-toolbar);
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
}
#${id} .wc-filter-bar::-webkit-scrollbar { display: none; }
#${id} .wc-filter-btn {
    padding: 3px 10px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--wc-text-dim);
    font-family: var(--wc-font);
    font-size: calc(var(--wc-font-size) - 2px);
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
}
#${id} .wc-filter-btn.wc-active {
    background: var(--wc-accent);
    color: #fff;
}
#${id} .wc-filter-search {
    flex: 1;
    min-width: 80px;
    height: 24px;
    margin-left: 4px;
    padding: 0 8px;
    background: var(--wc-bg-input);
    color: var(--wc-text);
    border: 1px solid var(--wc-border);
    border-radius: 4px;
    font-family: var(--wc-font);
    font-size: calc(var(--wc-font-size) - 2px);
    outline: none;
}
#${id} .wc-filter-search:focus { border-color: var(--wc-accent); }
#${id} .wc-filter-search::placeholder { color: var(--wc-text-dim); }

/* ── Console Input ─────────────────── */
#${id} .wc-input-area {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--wc-border);
    background: var(--wc-bg-input);
    padding: 0px;
    flex-shrink: 0;
}
#${id} .wc-input-area .wc-prompt {
    padding: 0 8px;
    color: var(--wc-accent);
    font-weight: bold;
    font-size: var(--wc-font-size);
    flex-shrink: 0;
    line-height: 36px;
}
#${id} .wc-input-area input {
    flex: 1;
    height: 36px;
    background: transparent;
    color: var(--wc-text);
    border: none;
    font-family: var(--wc-font);
    font-size: var(--wc-font-size);
    outline: none;
    min-width: 0;
}
#${id} .wc-input-area input::placeholder { color: var(--wc-text-dim); }
#${id} .wc-input-area button.wc-run-btn {
    height: 28px;
    padding: 0 12px;
    margin: 0 4px;
    background: var(--wc-accent);
    color: #fff;
    border: none;
    border-radius: 4px;
    font-family: var(--wc-font);
    font-size: calc(var(--wc-font-size) - 1px);
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
}

/* ── Object Tree ───────────────────── */
#${id} .wc-tree {
    padding-left: 16px;
}
#${id} .wc-tree-node {
    line-height: 1.6;
}
#${id} .wc-tree-toggle {
    display: inline-block;
    width: 14px;
    text-align: center;
    cursor: pointer;
    color: var(--wc-text-dim);
    font-size: 10px;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
}
#${id} .wc-tree-key { color: #9cdcfe; }
#${id} .wc-tree-colon { color: var(--wc-text-dim); }
#${id} .wc-tree-preview { color: var(--wc-text-dim); font-style: italic; }
#${id} .wc-tree-children { display: none; padding-left: 16px; }
#${id} .wc-tree-children.wc-expanded { display: block; }

/* ── Console Table ─────────────────── */
#${id} .wc-table-wrap {
    overflow-x: auto;
    margin: 4px 0;
    -webkit-overflow-scrolling: touch;
}
#${id} .wc-table-wrap table {
    border-collapse: collapse;
    font-size: calc(var(--wc-font-size) - 1px);
    min-width: 100%;
    color: var(--wc-text);
}
#${id} .wc-table-wrap th,
#${id} .wc-table-wrap td {
    padding: 3px 8px;
    border: 1px solid var(--wc-border);
    text-align: left;
    white-space: nowrap;
}
#${id} .wc-table-wrap th {
    background: var(--wc-bg-toolbar);
    font-weight: 600;
    position: sticky; top: 0;
}
#${id} .wc-table-wrap tr:nth-child(even) td { background: var(--wc-bg-row-alt); }

/* ── Elements Tab ──────────────────── */
#${id} .wc-elements-tree {
    padding: 8px;
    font-size: var(--wc-font-size);
    line-height: 1.55;
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}
#${id} .wc-dom-node {
    padding-left: 16px;
}
#${id} .wc-dom-toggle {
    display: inline-block;
    width: 14px;
    cursor: pointer;
    color: var(--wc-text-dim);
    font-size: 10px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    text-align: center;
    vertical-align: middle;
}
#${id} .wc-dom-tag { color: #569cd6; }
#${id} .wc-dom-attr-name { color: #9cdcfe; }
#${id} .wc-dom-attr-value { color: #ce9178; }
#${id} .wc-dom-text { color: #d4d4d4; }
#${id} .wc-dom-comment { color: #6a9955; font-style: italic; }
#${id} .wc-dom-children { display: none; }
#${id} .wc-dom-children.wc-expanded { display: block; }
#${id} .wc-dom-line { padding: 1px 0; }
#${id} .wc-dom-line:hover { background: rgba(255,255,255,.04); border-radius: 2px; }

/* ── Network Tab ───────────────────── */
#${id} .wc-net-list {
    padding: 0;
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}
#${id} .wc-net-header {
    display: grid;
    grid-template-columns: 3fr 1fr 1fr 1.5fr 1fr;
    gap: 4px;
    padding: 5px 10px;
    background: var(--wc-bg-toolbar);
    border-bottom: 1px solid var(--wc-border);
    font-weight: 600;
    font-size: calc(var(--wc-font-size) - 2px);
    color: var(--wc-text-dim);
    text-transform: uppercase;
    letter-spacing: .5px;
    position: sticky; top: 0;
    z-index: 1;
}
#${id} .wc-net-row {
    display: grid;
    grid-template-columns: 3fr 1fr 1fr 1.5fr 1fr;
    gap: 4px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--wc-border);
    font-size: calc(var(--wc-font-size) - 1px);
    align-items: center;
    cursor: pointer;
    transition: background .1s;
}
#${id} .wc-net-row:active,
#${id} .wc-net-row:hover { background: var(--wc-bg-hover); }
#${id} .wc-net-row .wc-net-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
#${id} .wc-net-status {
    font-weight: 600;
    border-radius: 3px;
    padding: 1px 6px;
    text-align: center;
    display: inline-block;
    font-size: calc(var(--wc-font-size) - 2px);
}
#${id} .wc-net-status.wc-s-ok    { color: var(--wc-network-ok); }
#${id} .wc-net-status.wc-s-redir { color: var(--wc-network-redirect); }
#${id} .wc-net-status.wc-s-fail  { color: var(--wc-network-fail); }
#${id} .wc-net-status.wc-s-pend  { color: var(--wc-text-dim); }

#${id} .wc-net-detail {
    padding: 10px;
    border-bottom: 2px solid var(--wc-border);
    background: var(--wc-bg-toolbar);
    font-size: calc(var(--wc-font-size) - 1px);
    line-height: 1.5;
    display: none;
}
#${id} .wc-net-detail.wc-expanded { display: block; }
#${id} .wc-net-detail-label {
    color: var(--wc-text-dim);
    font-weight: 600;
    margin-top: 6px;
}
#${id} .wc-net-detail-value {
    color: var(--wc-text);
    word-break: break-all;
    padding-left: 8px;
}
#${id} .wc-waterfall {
    height: 4px;
    border-radius: 2px;
    background: var(--wc-accent);
    min-width: 4px;
    max-width: 100%;
    margin-top: 2px;
}

/* ── Events Tab ────────────────────── */
#${id} .wc-event-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-bottom: 1px solid var(--wc-border);
    font-size: calc(var(--wc-font-size) - 1px);
}
#${id} .wc-event-item:hover { background: var(--wc-bg-hover); }
#${id} .wc-event-target {
    color: #569cd6;
    flex-shrink: 0;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
#${id} .wc-event-type {
    color: #dcdcaa;
    flex-shrink: 0;
}
#${id} .wc-event-count {
    color: var(--wc-text-dim);
    margin-left: auto;
    flex-shrink: 0;
}

/* ── Floating Toggle (when hidden) ── */
#${id}-fab {
    position: fixed;
    bottom: 16px; right: 16px;
    width: 44px; height: 44px;
    border-radius: 50%;
    background: var(--wc-accent);
    color: #fff;
    border: none;
    box-shadow: 0 2px 10px rgba(0,0,0,.4);
    font-size: 20px;
    cursor: pointer;
    z-index: 100000;
    display: none;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform .2s;
    padding-bottom: var(--wc-safe-bottom);
}
#${id}-fab:active { transform: scale(.9); }
#${id}-fab.wc-show { display: flex; }

/* ── Empty state ───────────────────── */
#${id} .wc-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--wc-text-dim);
    font-size: calc(var(--wc-font-size) + 1px);
    padding: 20px;
    text-align: center;
}

/* ── Responsive breakpoints ────────── */
@media (max-width: 380px) {
    #${id} .wc-net-header,
    #${id} .wc-net-row {
        grid-template-columns: 2.5fr 1fr 1fr;
    }
    #${id} .wc-net-header > :nth-child(4),
    #${id} .wc-net-header > :nth-child(5),
    #${id} .wc-net-row > :nth-child(4),
    #${id} .wc-net-row > :nth-child(5) { display: none; }
}
@media (min-width: 600px) {
    :root { --wc-font-size: 13px; }
}
`;
        document.head.appendChild(s);

        // Create the FAB toggle button
        if (!document.getElementById(id + '-fab')) {
            const fab = document.createElement('button');
            fab.id = id + '-fab';
            fab.innerHTML = '&#9776;';
            fab.title = 'Open DevTools';
            fab.onclick = () => this.show();
            document.body.appendChild(fab);
        }
    }

    // ── Toolbar (close, clear, hide) ──────────────────────────

    buildToolbar() {
        // Resize handle
        const handle = document.createElement('div');
        handle.className = 'wc-resize-handle';
        this.container.appendChild(handle);

        const bar = document.createElement('div');
        bar.className = 'wc-toolbar';

        const makeBtn = (label, title, cb) => {
            const b = document.createElement('button');
            b.className = 'wc-toolbar-btn';
            b.innerHTML = label;
            b.title = title;
            b.onclick = cb;
            return b;
        };

        bar.appendChild(makeBtn('&#x2716;', 'Close console', () => this.hide()));
        bar.appendChild(makeBtn('&#x1F5D1;', 'Clear', () => this.clearActivePanel()));
        bar.appendChild(makeBtn('&#x25F1;', 'Minimize', () => this.minimize()));

        // Spacer
        const spacer = document.createElement('span');
        spacer.style.flex = '1';
        bar.appendChild(spacer);

        bar.appendChild(makeBtn('&#x25BD;', 'Hide console', () => this.hide()));

        this.container.appendChild(bar);
    }

    minimize() {
        if (this.container.style.height === '48px') {
            this.container.style.height = this.initialHeight + 'px';
        } else {
            this.container.style.height = '48px';
        }
    }

    // ── Tab Bar ───────────────────────────────────────────────

    setupTabBar() {
        const bar = document.createElement('div');
        bar.className = 'wc-tab-bar';
        this._tabBar = bar;

        this.tabs.forEach(name => {
            const tab = document.createElement('div');
            tab.className = 'wc-tab' + (name === this.activeTab ? ' wc-active' : '');
            tab.dataset.tab = name;
            tab.textContent = name;
            tab.onclick = () => this.switchTab(name);
            bar.appendChild(tab);
        });
        this.container.appendChild(bar);
    }

    switchTab(name) {
        this.activeTab = name;
        // Update tab highlights
        this._tabBar.querySelectorAll('.wc-tab').forEach(t => {
            t.classList.toggle('wc-active', t.dataset.tab === name);
        });
        // Show/hide panels
        Object.keys(this.consoles).forEach(k => {
            this.consoles[k].classList.toggle('wc-active', k === name);
        });
    }

    _updateTabBadges() {
        this._tabBar.querySelectorAll('.wc-tab').forEach(t => {
            if (t.dataset.tab === 'Console') {
                // Remove existing badges
                t.querySelectorAll('.wc-badge').forEach(b => b.remove());
                if (this.logCounts.error > 0) {
                    const b = document.createElement('span');
                    b.className = 'wc-badge wc-badge-error';
                    b.textContent = this.logCounts.error > 99 ? '99+' : this.logCounts.error;
                    t.appendChild(b);
                }
                if (this.logCounts.warn > 0) {
                    const b = document.createElement('span');
                    b.className = 'wc-badge wc-badge-warn';
                    b.textContent = this.logCounts.warn > 99 ? '99+' : this.logCounts.warn;
                    t.appendChild(b);
                }
            }
        });
    }

    // ── Console Panels (containers) ───────────────────────────

    setupConsoles() {
        this.tabs.forEach(name => {
            const panel = document.createElement('div');
            panel.className = 'wc-panel' + (name === this.activeTab ? ' wc-active' : '');
            this.consoles[name] = panel;
            this.container.appendChild(panel);
        });
    }

    // ── Console Tab (filter bar + log area + input) ───────────

    buildConsoleTab() {
        const panel = this.consoles['Console'];

        // Filter bar
        const filterBar = document.createElement('div');
        filterBar.className = 'wc-filter-bar';
        const filters = ['all', 'log', 'info', 'warn', 'error'];
        filters.forEach(f => {
            const btn = document.createElement('button');
            btn.className = 'wc-filter-btn' + (f === 'all' ? ' wc-active' : '');
            btn.textContent = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1);
            btn.dataset.filter = f;
            btn.onclick = () => {
                this.logFilter = f;
                filterBar.querySelectorAll('.wc-filter-btn').forEach(b => b.classList.toggle('wc-active', b.dataset.filter === f));
                this.renderLogs();
            };
            filterBar.appendChild(btn);
        });

        const search = document.createElement('input');
        search.type = 'text';
        search.className = 'wc-filter-search';
        search.placeholder = 'Filter\u2026';
        search.oninput = () => { this.logSearchQuery = search.value; this.renderLogs(); };
        filterBar.appendChild(search);
        panel.appendChild(filterBar);

        // Log area
        const logArea = document.createElement('div');
        logArea.className = 'wc-log-area';
        this._logArea = logArea;
        panel.appendChild(logArea);

        // Command input
        const inputArea = document.createElement('div');
        inputArea.className = 'wc-input-area';

        const prompt = document.createElement('span');
        prompt.className = 'wc-prompt';
        prompt.textContent = '>';
        inputArea.appendChild(prompt);

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Execute JavaScript\u2026';
        input.autocomplete = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;
        this._cmdInput = input;

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(input.value);
                input.value = '';
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.commandHistoryIndex < this.commandHistory.length - 1) {
                    this.commandHistoryIndex++;
                    input.value = this.commandHistory[this.commandHistory.length - 1 - this.commandHistoryIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.commandHistoryIndex > 0) {
                    this.commandHistoryIndex--;
                    input.value = this.commandHistory[this.commandHistory.length - 1 - this.commandHistoryIndex];
                } else {
                    this.commandHistoryIndex = -1;
                    input.value = '';
                }
            }
        });
        inputArea.appendChild(input);

        const runBtn = document.createElement('button');
        runBtn.className = 'wc-run-btn';
        runBtn.textContent = 'Run';
        runBtn.onclick = () => { this.executeCommand(input.value); input.value = ''; };
        inputArea.appendChild(runBtn);

        panel.appendChild(inputArea);
    }

    executeCommand(cmd) {
        if (!cmd.trim()) return;
        this.commandHistory.push(cmd);
        this.commandHistoryIndex = -1;

        // Show command as log entry
        this._addLogEntry('log', [`> ${cmd}`], true);

        try {
            // eslint-disable-next-line no-eval
            const result = eval(cmd);
            this._addLogEntry('log', [result], true);
        } catch (err) {
            this._addLogEntry('error', [err.message], true);
        }
    }

    // ── Override Console Methods ──────────────────────────────

    overrideConsoleMethods() {
        const methods = ['log', 'warn', 'error', 'info', 'table', 'debug', 'clear'];
        methods.forEach(method => {
            this._originalConsoleMethods[method] = console[method];
            if (method === 'clear') {
                console[method] = () => {
                    this.clearConsole();
                    this._originalConsoleMethods[method].apply(console);
                };
            } else {
                console[method] = (...args) => {
                    this._addLogEntry(method === 'debug' ? 'log' : method, args);
                    this._originalConsoleMethods[method].apply(console, args);
                };
            }
        });
    }

    _addLogEntry(type, args, _isInternal = false) {
        if (type === 'table') {
            this.logEntries.push({ type: 'table', args, time: new Date() });
        } else {
            const level = (type === 'info' || type === 'debug') ? 'info' : type;
            this.logEntries.push({ type: level, args, time: new Date() });
            if (this.logCounts[level] !== undefined) {
                this.logCounts[level]++;
            }
        }
        this._updateTabBadges();
        this.renderLogs();
    }

    renderLogs() {
        const area = this._logArea;
        const wasAtBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 30;
        area.innerHTML = '';

        let entries = this.logEntries;
        if (this.logFilter !== 'all') {
            entries = entries.filter(e => e.type === this.logFilter);
        }
        if (this.logSearchQuery) {
            const q = this.logSearchQuery.toLowerCase();
            entries = entries.filter(e => {
                const text = e.args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
                return text.toLowerCase().includes(q);
            });
        }

        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'wc-empty';
            empty.textContent = this.logEntries.length === 0 ? 'No logs yet' : 'No matching logs';
            area.appendChild(empty);
            return;
        }

        const frag = document.createDocumentFragment();
        entries.forEach(entry => {
            if (entry.type === 'table') {
                frag.appendChild(this._createTableEntry(entry));
            } else {
                frag.appendChild(this._createLogRow(entry));
            }
        });
        area.appendChild(frag);

        if (wasAtBottom) {
            area.scrollTop = area.scrollHeight;
        }
    }

    _createLogRow(entry) {
        const row = document.createElement('div');
        row.className = `wc-log-entry wc-level-${entry.type}`;

        // Badge
        const badge = document.createElement('span');
        badge.className = `wc-log-badge wc-badge-${entry.type}`;
        badge.textContent = entry.type === 'info' ? 'INF' : entry.type.substring(0, 3).toUpperCase();
        row.appendChild(badge);

        // Time
        const time = document.createElement('span');
        time.className = 'wc-log-time';
        time.textContent = this._formatTime(entry.time);
        row.appendChild(time);

        // Body
        const body = document.createElement('span');
        body.className = 'wc-log-body';
        entry.args.forEach((arg, i) => {
            if (i > 0) body.appendChild(document.createTextNode(' '));
            body.appendChild(this._renderValue(arg));
        });
        row.appendChild(body);

        return row;
    }

    _createTableEntry(entry) {
        const wrapper = document.createElement('div');
        wrapper.className = 'wc-log-entry wc-level-log';
        const tableWrap = document.createElement('div');
        tableWrap.className = 'wc-table-wrap';
        const table = this._buildTable(entry.args[0]);
        tableWrap.appendChild(table);
        wrapper.appendChild(tableWrap);
        return wrapper;
    }

    _buildTable(data) {
        const table = document.createElement('table');
        if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]);
            const thead = document.createElement('thead');
            const hr = document.createElement('tr');
            const indexTh = document.createElement('th');
            indexTh.textContent = '(index)';
            hr.appendChild(indexTh);
            headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; hr.appendChild(th); });
            thead.appendChild(hr);
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            data.forEach((item, idx) => {
                const tr = document.createElement('tr');
                const idxTd = document.createElement('td'); idxTd.textContent = idx; tr.appendChild(idxTd);
                headers.forEach(h => { const td = document.createElement('td'); td.textContent = this._primitiveStr(item[h]); tr.appendChild(td); });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
        } else if (data && typeof data === 'object') {
            const thead = document.createElement('thead');
            const hr = document.createElement('tr');
            ['Key', 'Value'].forEach(h => { const th = document.createElement('th'); th.textContent = h; hr.appendChild(th); });
            thead.appendChild(hr);
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            Object.entries(data).forEach(([k, v]) => {
                const tr = document.createElement('tr');
                const kTd = document.createElement('td'); kTd.textContent = k; tr.appendChild(kTd);
                const vTd = document.createElement('td'); vTd.textContent = this._primitiveStr(v); tr.appendChild(vTd);
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
        }
        return table;
    }

    // ── Value Rendering (collapsible objects) ─────────────────

    _renderValue(val, depth = 0) {
        if (val === null) return this._makeSpan('null', 'wc-null');
        if (val === undefined) return this._makeSpan('undefined', 'wc-undefined');

        const type = typeof val;
        if (type === 'string') return this._makeSpan(depth === 0 ? val : `"${val}"`, 'wc-string');
        if (type === 'number') return this._makeSpan(String(val), 'wc-number');
        if (type === 'boolean') return this._makeSpan(String(val), 'wc-boolean');
        if (type === 'function') return this._makeSpan(`f ${val.name || 'anonymous'}()`, 'wc-null');
        if (type === 'symbol') return this._makeSpan(val.toString(), 'wc-string');

        if (val instanceof Error) return this._makeSpan(`${val.name}: ${val.message}`, 'wc-string');
        if (val instanceof HTMLElement) return this._makeSpan(`<${val.tagName.toLowerCase()}>`, 'wc-string');

        // Object / Array — collapsible tree
        return this._buildObjectTree(val, depth);
    }

    _buildObjectTree(obj, depth = 0) {
        const isArray = Array.isArray(obj);
        const preview = this._objectPreview(obj, isArray);
        const container = document.createElement('span');
        container.className = 'wc-tree-node';

        const toggle = document.createElement('span');
        toggle.className = 'wc-tree-toggle';
        toggle.textContent = '\u25B6'; // ▶

        const previewSpan = document.createElement('span');
        previewSpan.className = 'wc-tree-preview';
        previewSpan.textContent = preview;

        const children = document.createElement('div');
        children.className = 'wc-tree-children';
        let built = false;

        toggle.onclick = () => {
            const open = children.classList.toggle('wc-expanded');
            toggle.textContent = open ? '\u25BC' : '\u25B6'; // ▼ / ▶
            if (!built) {
                built = true;
                this._populateTreeChildren(children, obj, depth);
            }
        };

        container.appendChild(toggle);
        container.appendChild(previewSpan);
        container.appendChild(children);
        return container;
    }

    _populateTreeChildren(container, obj, depth) {
        const entries = Object.entries(obj);
        const max = 100;
        entries.slice(0, max).forEach(([key, value]) => {
            const line = document.createElement('div');
            const keySpan = document.createElement('span');
            keySpan.className = 'wc-tree-key';
            keySpan.textContent = key;
            const colon = document.createElement('span');
            colon.className = 'wc-tree-colon';
            colon.textContent = ': ';
            line.appendChild(keySpan);
            line.appendChild(colon);
            line.appendChild(this._renderValue(value, depth + 1));
            container.appendChild(line);
        });
        if (entries.length > max) {
            const more = document.createElement('div');
            more.className = 'wc-tree-preview';
            more.textContent = `\u2026 ${entries.length - max} more properties`;
            container.appendChild(more);
        }
        // __proto__
        try {
            const proto = Object.getPrototypeOf(obj);
            if (proto && proto !== Object.prototype && proto !== Array.prototype) {
                const line = document.createElement('div');
                const keySpan = document.createElement('span');
                keySpan.className = 'wc-tree-key';
                keySpan.textContent = '[[Prototype]]';
                const colon = document.createElement('span');
                colon.className = 'wc-tree-colon';
                colon.textContent = ': ';
                const val = document.createElement('span');
                val.className = 'wc-tree-preview';
                val.textContent = proto.constructor ? proto.constructor.name : 'Object';
                line.appendChild(keySpan);
                line.appendChild(colon);
                line.appendChild(val);
                container.appendChild(line);
            }
        } catch (e) { /* ignore */ }
    }

    _objectPreview(obj, isArray) {
        try {
            if (isArray) {
                const items = obj.slice(0, 5).map(v => this._primitiveStr(v));
                return `Array(${obj.length}) [${items.join(', ')}${obj.length > 5 ? ', \u2026' : ''}]`;
            }
            const keys = Object.keys(obj).slice(0, 4);
            const items = keys.map(k => `${k}: ${this._primitiveStr(obj[k])}`);
            return `{${items.join(', ')}${Object.keys(obj).length > 4 ? ', \u2026' : ''}}`;
        } catch { return '{...}'; }
    }

    _primitiveStr(v) {
        if (v === null) return 'null';
        if (v === undefined) return 'undefined';
        if (typeof v === 'string') return `"${v.length > 40 ? v.slice(0, 40) + '\u2026' : v}"`;
        if (typeof v === 'object') return Array.isArray(v) ? `Array(${v.length})` : '{...}';
        return String(v);
    }

    _makeSpan(text, cls) {
        const s = document.createElement('span');
        s.className = cls;
        s.textContent = text;
        return s;
    }

    _formatTime(d) {
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // ── Clear ─────────────────────────────────────────────────

    clearActivePanel() {
        if (this.activeTab === 'Console') {
            this.clearConsole();
        } else if (this.activeTab === 'Network') {
            this.networkRequests = [];
            this._renderNetworkList();
        } else if (this.activeTab === 'Events') {
            this.updateEventLogger();
        } else if (this.activeTab === 'Elements') {
            this.refreshElementsTab();
        }
    }

    clearConsole() {
        this.logEntries = [];
        this.logCounts = { log: 0, warn: 0, error: 0, info: 0 };
        this._updateTabBadges();
        this.renderLogs();
    }

    // ── Show / Hide ───────────────────────────────────────────

    show() {
        this.visible = true;
        this.container.classList.remove('wc-hidden');
        const fab = document.getElementById(this.containerId + '-fab');
        if (fab) fab.classList.remove('wc-show');
    }

    hide() {
        this.visible = false;
        this.container.classList.add('wc-hidden');
        const fab = document.getElementById(this.containerId + '-fab');
        if (fab) fab.classList.add('wc-show');
    }

    toggle() {
        this.visible ? this.hide() : this.show();
    }

    // ── Touch Gesture (two-finger double tap) ─────────────────

    setupTouchGesture() {
        let lastTap = 0;
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const now = Date.now();
                if (now - lastTap < 500 && now - lastTap > 50) {
                    this.toggle();
                    e.preventDefault();
                }
                lastTap = now;
            }
        }, { passive: false });
    }

    // ── Resize Handle (single finger drag) ────────────────────

    setupResizeHandle() {
        const handle = this.container.querySelector('.wc-resize-handle');
        let startY, startH;

        const onStart = (e) => {
            const touch = e.touches ? e.touches[0] : e;
            startY = touch.clientY;
            startH = this.container.offsetHeight;
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            e.preventDefault();
        };

        const onMove = (e) => {
            const touch = e.touches ? e.touches[0] : e;
            const delta = startY - touch.clientY;
            const h = Math.min(Math.max(startH + delta, this.minHeight), window.innerHeight * 0.92);
            this.container.style.height = h + 'px';
            e.preventDefault();
        };

        const onEnd = () => {
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
        };

        handle.addEventListener('touchstart', onStart, { passive: false });
        handle.addEventListener('mousedown', onStart);
    }

    // ── Event Logger ──────────────────────────────────────────

    setupEventLogger() {
        this.eventMap = new Map();
        this._overrideEventListenerMethods();
        this.updateEventLogger();
        this._eventLoggerInterval = setInterval(() => this.updateEventLogger(), 2000);
    }

    _overrideEventListenerMethods() {
        const origAdd = EventTarget.prototype.addEventListener;
        const origRemove = EventTarget.prototype.removeEventListener;
        const self = this;

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            const m = self.eventMap.get(this) || new Map();
            if (!m.has(type)) m.set(type, new Set());
            m.get(type).add(listener);
            self.eventMap.set(this, m);
            return origAdd.call(this, type, listener, options);
        };

        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            const m = self.eventMap.get(this);
            if (m && m.has(type)) {
                m.get(type).delete(listener);
                if (m.get(type).size === 0) m.delete(type);
                if (m.size === 0) self.eventMap.delete(this);
            }
            return origRemove.call(this, type, listener, options);
        };
    }

    updateEventLogger() {
        const panel = this.consoles['Events'];
        panel.innerHTML = '';

        let count = 0;
        this.eventMap.forEach((listeners, target) => {
            listeners.forEach((set, type) => {
                count++;
                const item = document.createElement('div');
                item.className = 'wc-event-item';

                const tgt = document.createElement('span');
                tgt.className = 'wc-event-target';
                tgt.textContent = this._describeElement(target);
                item.appendChild(tgt);

                const tp = document.createElement('span');
                tp.className = 'wc-event-type';
                tp.textContent = type;
                item.appendChild(tp);

                const ct = document.createElement('span');
                ct.className = 'wc-event-count';
                ct.textContent = `${set.size} listener${set.size !== 1 ? 's' : ''}`;
                item.appendChild(ct);

                panel.appendChild(item);
            });
        });

        if (count === 0) {
            const empty = document.createElement('div');
            empty.className = 'wc-empty';
            empty.textContent = 'No event listeners detected';
            panel.appendChild(empty);
        }
    }

    _describeElement(el) {
        if (el === window) return 'window';
        if (el === document) return 'document';
        if (el === document.body) return 'body';
        if (el instanceof HTMLElement) {
            let d = el.tagName.toLowerCase();
            if (el.id) d += `#${el.id}`;
            else if (el.className && typeof el.className === 'string') {
                const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.');
                if (cls) d += `.${cls}`;
            }
            return d;
        }
        return 'EventTarget';
    }

    // ── Elements Tab (live collapsible DOM tree) ──────────────

    setupElementsTab() {
        const panel = this.consoles['Elements'];
        panel.innerHTML = '';

        // Toolbar
        const bar = document.createElement('div');
        bar.className = 'wc-filter-bar';
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'wc-filter-btn wc-active';
        refreshBtn.textContent = 'Refresh DOM';
        refreshBtn.onclick = () => this.refreshElementsTab();
        bar.appendChild(refreshBtn);
        panel.appendChild(bar);

        const tree = document.createElement('div');
        tree.className = 'wc-elements-tree';
        this._elementsTree = tree;
        panel.appendChild(tree);

        this._buildDOMTree(tree, document.documentElement, 0, true);
    }

    refreshElementsTab() {
        this._elementsTree.innerHTML = '';
        this._buildDOMTree(this._elementsTree, document.documentElement, 0, true);
    }

    _buildDOMTree(container, node, depth, autoExpand = false) {
        if (!node) return;

        // Skip the webconsole container itself
        if (node === this.container || node.id === this.containerId + '-fab') return;

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                const line = document.createElement('div');
                line.className = 'wc-dom-line';
                line.style.paddingLeft = (depth * 16) + 'px';
                const span = document.createElement('span');
                span.className = 'wc-dom-text';
                span.textContent = text.length > 120 ? text.slice(0, 120) + '\u2026' : text;
                line.appendChild(span);
                container.appendChild(line);
            }
            return;
        }

        if (node.nodeType === Node.COMMENT_NODE) {
            const line = document.createElement('div');
            line.className = 'wc-dom-line';
            line.style.paddingLeft = (depth * 16) + 'px';
            const span = document.createElement('span');
            span.className = 'wc-dom-comment';
            span.textContent = `<!-- ${node.textContent.trim().slice(0, 80)} -->`;
            line.appendChild(span);
            container.appendChild(line);
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();
        const hasChildren = node.childNodes.length > 0;
        const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'].includes(tag);

        // Opening line
        const line = document.createElement('div');
        line.className = 'wc-dom-line';
        line.style.paddingLeft = (depth * 16) + 'px';

        let childContainer = null;

        if (hasChildren && !selfClosing) {
            const toggle = document.createElement('span');
            toggle.className = 'wc-dom-toggle';
            toggle.textContent = autoExpand && depth < 2 ? '\u25BC' : '\u25B6';

            childContainer = document.createElement('div');
            childContainer.className = 'wc-dom-children' + (autoExpand && depth < 2 ? ' wc-expanded' : '');

            let childrenBuilt = autoExpand && depth < 2;

            toggle.onclick = () => {
                const open = childContainer.classList.toggle('wc-expanded');
                toggle.textContent = open ? '\u25BC' : '\u25B6';
                if (!childrenBuilt) {
                    childrenBuilt = true;
                    node.childNodes.forEach(child => this._buildDOMTree(childContainer, child, depth + 1, false));
                    // Closing tag inside children
                    const closeLine = document.createElement('div');
                    closeLine.className = 'wc-dom-line';
                    const closeTag = document.createElement('span');
                    closeTag.className = 'wc-dom-tag';
                    closeTag.textContent = `</${tag}>`;
                    closeLine.appendChild(closeTag);
                    childContainer.appendChild(closeLine);
                }
            };

            line.appendChild(toggle);
        } else {
            // Spacer for alignment
            const spacer = document.createElement('span');
            spacer.style.display = 'inline-block';
            spacer.style.width = '14px';
            line.appendChild(spacer);
        }

        // Build opening tag markup
        const tagOpen = document.createElement('span');
        tagOpen.className = 'wc-dom-tag';
        tagOpen.textContent = '<' + tag;
        line.appendChild(tagOpen);

        // Attributes
        if (node.attributes) {
            Array.from(node.attributes).slice(0, 8).forEach(attr => {
                const space = document.createTextNode(' ');
                line.appendChild(space);
                const name = document.createElement('span');
                name.className = 'wc-dom-attr-name';
                name.textContent = attr.name;
                line.appendChild(name);
                if (attr.value) {
                    const eq = document.createTextNode('=');
                    line.appendChild(eq);
                    const val = document.createElement('span');
                    val.className = 'wc-dom-attr-value';
                    const truncated = attr.value.length > 60 ? attr.value.slice(0, 60) + '\u2026' : attr.value;
                    val.textContent = `"${truncated}"`;
                    line.appendChild(val);
                }
            });
            if (node.attributes.length > 8) {
                line.appendChild(document.createTextNode(' \u2026'));
            }
        }

        const tagClose = document.createElement('span');
        tagClose.className = 'wc-dom-tag';
        tagClose.textContent = selfClosing ? ' />' : '>';
        line.appendChild(tagClose);

        // If leaf element with short text, show inline
        if (!selfClosing && hasChildren && node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE) {
            const text = node.childNodes[0].textContent.trim();
            if (text.length <= 60) {
                const textSpan = document.createElement('span');
                textSpan.className = 'wc-dom-text';
                textSpan.textContent = text;
                line.appendChild(textSpan);
                const closeTag = document.createElement('span');
                closeTag.className = 'wc-dom-tag';
                closeTag.textContent = `</${tag}>`;
                line.appendChild(closeTag);
                container.appendChild(line);
                return; // No need for children container
            }
        }

        container.appendChild(line);

        if (childContainer) {
            // If auto-expanded, build children now
            if (autoExpand && depth < 2) {
                node.childNodes.forEach(child => this._buildDOMTree(childContainer, child, depth + 1, depth < 1));
                // Closing tag
                const closeLine = document.createElement('div');
                closeLine.className = 'wc-dom-line';
                const closeTag = document.createElement('span');
                closeTag.className = 'wc-dom-tag';
                closeTag.textContent = `</${tag}>`;
                closeLine.appendChild(closeTag);
                childContainer.appendChild(closeLine);
            }
            container.appendChild(childContainer);
        } else if (!selfClosing && hasChildren) {
            // No toggle but still close tag
            const closeLine = document.createElement('div');
            closeLine.className = 'wc-dom-line';
            closeLine.style.paddingLeft = (depth * 16) + 'px';
            const closeTag = document.createElement('span');
            closeTag.className = 'wc-dom-tag';
            closeTag.textContent = `</${tag}>`;
            closeLine.appendChild(closeTag);
            container.appendChild(closeLine);
        }
    }

    // ── Network Tab ───────────────────────────────────────────

    setupNetworkTab() {
        const panel = this.consoles['Network'];
        panel.innerHTML = '';

        // Header bar with clear
        const bar = document.createElement('div');
        bar.className = 'wc-filter-bar';
        const clearBtn = document.createElement('button');
        clearBtn.className = 'wc-filter-btn';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = () => { this.networkRequests = []; this._renderNetworkList(); };
        bar.appendChild(clearBtn);
        panel.appendChild(bar);

        // Column header
        const header = document.createElement('div');
        header.className = 'wc-net-header';
        ['Name', 'Method', 'Status', 'Type', 'Time'].forEach(h => {
            const c = document.createElement('span');
            c.textContent = h;
            header.appendChild(c);
        });
        panel.appendChild(header);

        const list = document.createElement('div');
        list.className = 'wc-net-list';
        this._netList = list;
        panel.appendChild(list);

        this._renderNetworkList();
    }

    _renderNetworkList() {
        this._netList.innerHTML = '';
        if (this.networkRequests.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'wc-empty';
            empty.textContent = 'No network requests captured';
            this._netList.appendChild(empty);
            return;
        }

        const maxTime = Math.max(...this.networkRequests.map(r => r.time || 1));

        this.networkRequests.forEach((req, idx) => {
            const row = document.createElement('div');
            row.className = 'wc-net-row';

            // Name (truncated URL)
            const name = document.createElement('span');
            name.className = 'wc-net-name';
            try {
                const u = new URL(req.url, location.href);
                name.textContent = u.pathname.split('/').pop() || u.pathname || req.url;
                name.title = req.url;
            } catch {
                name.textContent = req.url;
            }
            row.appendChild(name);

            // Method
            const method = document.createElement('span');
            method.textContent = (req.method || 'GET').toUpperCase();
            row.appendChild(method);

            // Status
            const status = document.createElement('span');
            status.className = 'wc-net-status';
            if (req.status === 0 || req.status === undefined) {
                status.textContent = req.pending ? 'pending' : (req.error ? 'ERR' : '\u2014');
                status.classList.add('wc-s-pend');
            } else {
                status.textContent = req.status;
                if (req.status >= 200 && req.status < 300) status.classList.add('wc-s-ok');
                else if (req.status >= 300 && req.status < 400) status.classList.add('wc-s-redir');
                else status.classList.add('wc-s-fail');
            }
            row.appendChild(status);

            // Type
            const type = document.createElement('span');
            const ct = req.type || '';
            type.textContent = ct.split(';')[0].split('/').pop() || '\u2014';
            type.title = ct;
            row.appendChild(type);

            // Time + waterfall
            const timeCell = document.createElement('span');
            const ms = req.time != null ? req.time.toFixed(0) + 'ms' : '\u2014';
            timeCell.textContent = ms;
            if (req.time != null) {
                const bar = document.createElement('div');
                bar.className = 'wc-waterfall';
                bar.style.width = Math.max(4, (req.time / maxTime) * 100) + '%';
                if (req.status >= 400) bar.style.background = 'var(--wc-network-fail)';
                else if (req.status >= 300) bar.style.background = 'var(--wc-network-redirect)';
                else bar.style.background = 'var(--wc-accent)';
                timeCell.appendChild(bar);
            }
            row.appendChild(timeCell);

            // Expandable detail
            const detail = document.createElement('div');
            detail.className = 'wc-net-detail';
            detail.innerHTML = `
                <div class="wc-net-detail-label">URL</div>
                <div class="wc-net-detail-value">${this._escapeHTML(req.url || '')}</div>
                <div class="wc-net-detail-label">Method</div>
                <div class="wc-net-detail-value">${this._escapeHTML((req.method || 'GET').toUpperCase())}</div>
                <div class="wc-net-detail-label">Status</div>
                <div class="wc-net-detail-value">${req.status || '\u2014'}</div>
                <div class="wc-net-detail-label">Content-Type</div>
                <div class="wc-net-detail-value">${this._escapeHTML(req.type || '\u2014')}</div>
                <div class="wc-net-detail-label">Size</div>
                <div class="wc-net-detail-value">${req.size || '\u2014'}</div>
                <div class="wc-net-detail-label">Time</div>
                <div class="wc-net-detail-value">${ms}</div>
            `;

            row.onclick = () => detail.classList.toggle('wc-expanded');

            this._netList.appendChild(row);
            this._netList.appendChild(detail);
        });
    }

    interceptNetworkRequests() {
        const origFetch = window.fetch;
        const origXHROpen = XMLHttpRequest.prototype.open;
        const origXHRSend = XMLHttpRequest.prototype.send;
        const wc = this;

        // ── Fetch ──
        window.fetch = function(...args) {
            const start = performance.now();
            const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || String(args[0]));
            const method = args[1]?.method || 'GET';

            return origFetch.apply(this, args).then(response => {
                const duration = performance.now() - start;
                wc._logNetworkRequest({
                    url,
                    method,
                    status: response.status,
                    type: response.headers.get('Content-Type') || '',
                    size: response.headers.get('Content-Length') || '\u2014',
                    time: duration
                });
                return response;
            }).catch(err => {
                const duration = performance.now() - start;
                wc._logNetworkRequest({
                    url,
                    method,
                    status: 0,
                    type: '',
                    size: '\u2014',
                    time: duration,
                    error: true
                });
                throw err;
            });
        };

        // ── XHR ──
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._wc_url = url;
            this._wc_method = method;
            return origXHROpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.send = function(...sendArgs) {
            this._wc_start = performance.now();
            this.addEventListener('loadend', function() {
                const duration = performance.now() - (this._wc_start || 0);
                wc._logNetworkRequest({
                    url: this._wc_url || '',
                    method: this._wc_method || 'GET',
                    status: this.status,
                    type: this.getResponseHeader('Content-Type') || '',
                    size: this.getResponseHeader('Content-Length') || (this.responseText ? this.responseText.length : '\u2014'),
                    time: duration
                });
            });
            return origXHRSend.apply(this, sendArgs);
        };
    }

    _logNetworkRequest(req) {
        this.networkRequests.push(req);
        this._renderNetworkList();
    }

    _escapeHTML(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ── Custom Tabs API ───────────────────────────────────────

    addCustomTab(tabName) {
        if (this.tabs.includes(tabName)) return;
        this.tabs.push(tabName);

        // Add tab button
        const tab = document.createElement('div');
        tab.className = 'wc-tab';
        tab.dataset.tab = tabName;
        tab.textContent = tabName;
        tab.onclick = () => this.switchTab(tabName);
        this._tabBar.appendChild(tab);

        // Add panel
        const panel = document.createElement('div');
        panel.className = 'wc-panel';
        this.consoles[tabName] = panel;
        this.container.appendChild(panel);
    }

    addCustomMessage(tabName, message, style = {}) {
        if (!this.consoles[tabName]) this.addCustomTab(tabName);

        const el = document.createElement('div');
        el.className = 'custom-message';
        el.textContent = message;
        Object.assign(el.style, {
            backgroundColor: style.backgroundColor || 'transparent',
            color: style.color || 'var(--wc-text)',
            fontWeight: style.fontWeight || 'normal',
            fontStyle: style.fontStyle || 'normal',
            padding: style.padding || '5px 10px',
            borderRadius: style.borderRadius || '3px',
            border: style.border || 'none',
            marginBottom: '2px',
            borderBottom: '1px solid var(--wc-border)'
        });

        this.consoles[tabName].appendChild(el);
        this.consoles[tabName].scrollTop = this.consoles[tabName].scrollHeight;
    }

    // ── Cleanup ───────────────────────────────────────────────

    destroy() {
        // Restore console methods
        Object.keys(this._originalConsoleMethods).forEach(m => {
            console[m] = this._originalConsoleMethods[m];
        });
        clearInterval(this._eventLoggerInterval);
        this.container.remove();
        const fab = document.getElementById(this.containerId + '-fab');
        if (fab) fab.remove();
        if (this._styleEl) this._styleEl.remove();
    }
}

// ── Module exports (UMD-friendly) ─────────────────────────
// Works as a global, CommonJS, AMD, or ES module depending on bundler.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebConsole;
    module.exports.WebConsole = WebConsole;
    module.exports.getWebConsoleClass = function () { return WebConsole; };
}
if (typeof window !== 'undefined') {
    window.WebConsole = WebConsole;
}
