class WebConsole {
    constructor(containerId = 'web-console') {
        this.container = document.getElementById(containerId) || this.createContainer(containerId);
        this.initialHeight = 300;
        this.setupStyles();
        this.tabs = ['Default', 'Event Logger'];
        this.activeTab = 'Default';
        this.consoles = {};
        this.setupTabs();
        this.setupConsoles();
        this.overrideConsoleMethods();
        this.visible = true;
        this.setupTouchGesture();
        this.setupToggleButton();
        this.setupEventLogger();
        this.setupResizeGesture();
    }

    createContainer(id) {
        const container = document.createElement('div');
        container.id = id;
        document.body.appendChild(container);
        return container;
    }

    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #${this.container.id} {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: ${this.initialHeight}px;
                background-color: rgba(0, 0, 0, 0.8);
                color: #fff;
                font-family: monospace;
                font-size: 14px;
                padding: 10px;
                padding-top: 60px;
                overflow-y: auto;
                transition: transform 0.3s ease-in-out;
                z-index: 9998;
            }
            #${this.container.id} .log { color: #fff; }
            #${this.container.id} .warn { color: #ffcc00; }
            #${this.container.id} .error { color: #ff4444; }
            #${this.container.id} table { color: #fff; }
            #${this.container.id}.hidden { transform: translateY(100%); }
            #toggleConsole {
                position: absolute;
                top: 5px;
                right: 5px;
                z-index: 9999;
                padding: 5px 10px;
                background-color: #007bff;
                color: #fff;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            }
            .tab-container {
                position: absolute;
                top: 30px;
                left: 0;
                right: 0;
                display: flex;
                flex-wrap: wrap;
                overflow-y: auto;
                max-height: 60px;
                scrollbar-width: none;
                -ms-overflow-style: none;
                -webkit-overflow-scrolling: touch;
            }
            .tab-container::-webkit-scrollbar {
                display: none;
            }
            .tab {
                display: inline-block;
                padding: 5px 10px;
                background-color: #444;
                color: #fff;
                cursor: pointer;
                border-radius: 5px 5px 0 0;
                margin-right: 5px;
                margin-bottom: 5px;
            }
            .tab.active {
                background-color: #666;
            }
            .console-content {
                display: none;
                height: calc(100% - 70px);
                overflow-y: auto;
            }
            .console-content.active {
                display: block;
            }
            .event-logger-item {
                margin-bottom: 5px;
                border-bottom: 1px solid #444;
                padding-bottom: 5px;
            }
            .custom-message {
                margin-bottom: 5px;
                padding: 5px;
                border-radius: 3px;
            }
        `;
        document.head.appendChild(style);
    }

    setupTabs() {
        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';
        this.tabs.forEach(tabName => {
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.textContent = tabName;
            tab.onclick = () => this.switchTab(tabName);
            tabContainer.appendChild(tab);
        });
        this.container.appendChild(tabContainer);

        this.adjustTabLayout();

        const resizeObserver = new ResizeObserver(() => this.adjustTabLayout());
        resizeObserver.observe(this.container);

        // Touch scrolling for tabs
        let isScrolling = false;
        let startY;
        let startScrollTop;

        tabContainer.addEventListener('touchstart', (e) => {
            isScrolling = true;
            startY = e.touches[0].pageY;
            startScrollTop = tabContainer.scrollTop;
        }, { passive: true });

        tabContainer.addEventListener('touchmove', (e) => {
            if (!isScrolling) return;
            const y = e.touches[0].pageY;
            const walk = startY - y;
            tabContainer.scrollTop = startScrollTop + walk;
        }, { passive: true });

        tabContainer.addEventListener('touchend', () => {
            isScrolling = false;
        });
    }

    adjustTabLayout() {
        const tabContainer = this.container.querySelector('.tab-container');
        const tabs = tabContainer.querySelectorAll('.tab');
        let totalWidth = 0;
        const containerWidth = tabContainer.clientWidth;

        tabs.forEach(tab => {
            totalWidth += tab.offsetWidth + 5; // 5px for margin
        });

        if (totalWidth > containerWidth) {
            tabContainer.style.flexWrap = 'wrap';
            this.container.style.paddingTop = '90px'; // Increase top padding for two rows
            tabContainer.style.maxHeight = '60px'; // Allow two rows
        } else {
            tabContainer.style.flexWrap = 'nowrap';
            this.container.style.paddingTop = '60px'; // Reset to original padding
            tabContainer.style.maxHeight = '30px'; // Reset to single row
        }
    }

    setupConsoles() {
        this.tabs.forEach(tabName => {
            const console = document.createElement('div');
            console.className = `console-content ${tabName === this.activeTab ? 'active' : ''}`;
            this.consoles[tabName] = console;
            this.container.appendChild(console);
        });
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        this.tabs.forEach(name => {
            const tab = this.container.querySelector(`.tab:nth-child(${this.tabs.indexOf(name) + 1})`);
            const console = this.consoles[name];
            if (name === tabName) {
                tab.classList.add('active');
                console.classList.add('active');
            } else {
                tab.classList.remove('active');
                console.classList.remove('active');
            }
        });
    }

    overrideConsoleMethods() {
        const methods = ['log', 'warn', 'error', 'table'];
        methods.forEach(method => {
            const originalMethod = console[method];
            console[method] = (...args) => {
                this.addMessage(method, args);
                originalMethod.apply(console, args);
            };
        });
    }

    addMessage(type, args) {
        let element;
        if (type === 'table') {
            element = this.createTableElement(args[0]);
        } else {
            element = document.createElement('div');
            element.className = type;
            const formattedArgs = this.formatArgs(args);
            element.innerHTML = `[${type.toUpperCase()}] ${formattedArgs}`;
        }
        
        this.consoles['Default'].appendChild(element);
        this.consoles['Default'].scrollTop = this.consoles['Default'].scrollHeight;
    }

    formatArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'string' && arg.includes('%c')) {
                return this.processColoredText(arg, args);
            }
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        }).join(' ');
    }

    processColoredText(text, args) {
        const parts = text.split('%c');
        let result = parts[0];
        let styleIndex = 1;

        for (let i = 1; i < parts.length; i++) {
            if (styleIndex < args.length) {
                const style = args[styleIndex];
                result += `<span style="${style}">${parts[i]}</span>`;
                styleIndex++;
            } else {
                result += parts[i];
            }
        }

        return result;
    }

    createTableElement(data) {
        const table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        table.style.marginTop = '5px';
        table.style.marginBottom = '5px';

        if (Array.isArray(data)) {
            // Handle array of objects
            const headers = Object.keys(data[0] || {});
            table.appendChild(this.createTableRow(headers, true));
            data.forEach(item => {
                table.appendChild(this.createTableRow(headers.map(header => item[header])));
            });
        } else if (typeof data === 'object') {
            // Handle single object
            Object.entries(data).forEach(([key, value]) => {
                table.appendChild(this.createTableRow([key, value]));
            });
        }

        return table;
    }

    createTableRow(cells, isHeader = false) {
        const row = document.createElement('tr');
        cells.forEach(cell => {
            const cellElement = document.createElement(isHeader ? 'th' : 'td');
            cellElement.style.border = '1px solid #444';
            cellElement.style.padding = '5px';
            cellElement.style.textAlign = 'left';
            cellElement.textContent = this.formatCellContent(cell);
            row.appendChild(cellElement);
        });
        return row;
    }

    formatCellContent(content) {
        if (typeof content === 'object') {
            return JSON.stringify(content);
        }
        return String(content);
    }

    clear() {
        Object.values(this.consoles).forEach(console => console.innerHTML = '');
        this.setupTabs();
        this.setupToggleButton();
        this.updateEventLogger();
    }

    toggle() {
        this.visible = !this.visible;
        this.container.classList.toggle('hidden', !this.visible);
        const toggleButton = document.getElementById('toggleConsole');
        toggleButton.textContent = this.visible ? 'Hide Console' : 'Show Console';
    }

    setupTouchGesture() {
        let lastTap = 0;
        let tapCount = 0;

        document.addEventListener('touchstart', (event) => {
            if (event.touches.length === 2) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 500 && tapLength > 0) {
                    this.toggle();
                    event.preventDefault();
                }
                lastTap = currentTime;
            }
        });
    }

    setupToggleButton() {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggleConsole';
        toggleButton.textContent = 'Hide Console';
        toggleButton.onclick = () => this.toggle();
        this.container.appendChild(toggleButton);
    }

    setupEventLogger() {
        this.eventMap = new Map();
        this.overrideEventListenerMethods();
        this.updateEventLogger();
        setInterval(() => this.updateEventLogger(), 1000);
    }

    overrideEventListenerMethods() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        const self = this;

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            const listeners = self.eventMap.get(this) || new Map();
            if (!listeners.has(type)) {
                listeners.set(type, new Set());
            }
            listeners.get(type).add(listener);
            self.eventMap.set(this, listeners);
            return originalAddEventListener.call(this, type, listener, options);
        };

        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            const listeners = self.eventMap.get(this);
            if (listeners && listeners.has(type)) {
                listeners.get(type).delete(listener);
                if (listeners.get(type).size === 0) {
                    listeners.delete(type);
                }
                if (listeners.size === 0) {
                    self.eventMap.delete(this);
                }
            }
            return originalRemoveEventListener.call(this, type, listener, options);
        };
    }

    updateEventLogger() {
        const eventLoggerContent = this.consoles['Event Logger'];
        eventLoggerContent.innerHTML = '';
        this.eventMap.forEach((listeners, target) => {
            listeners.forEach((listenerSet, type) => {
                const element = document.createElement('div');
                element.className = 'event-logger-item';
                element.textContent = `${this.getElementDescription(target)}: ${type} (${listenerSet.size} listener${listenerSet.size > 1 ? 's' : ''})`;
                eventLoggerContent.appendChild(element);
            });
        });
    }

    getElementDescription(element) {
        if (element === window) return 'Window';
        if (element === document) return 'Document';
        if (element === document.body) return 'Body';
        if (element instanceof HTMLElement) {
            return `<${element.tagName.toLowerCase()}${element.id ? ` id="${element.id}"` : ''}${element.className ? ` class="${element.className}"` : ''}>`;
        }
        return 'Unknown Element';
    }

    setupResizeGesture() {
        let startY, startHeight;

        const touchStart = (e) => {
            if (e.touches.length === 2) {
                startY = e.touches[0].clientY;
                startHeight = this.container.offsetHeight;
                document.addEventListener('touchmove', touchMove, { passive: false });
                document.addEventListener('touchend', touchEnd);
            }
        };

        const touchMove = (e) => {
            if (e.touches.length === 2) {
                const deltaY = startY - e.touches[0].clientY;
                const newHeight = Math.min(Math.max(startHeight + deltaY, this.initialHeight), window.innerHeight);
                this.container.style.height = `${newHeight}px`;
                e.preventDefault();
            }
        };

        const touchEnd = () => {
            document.removeEventListener('touchmove', touchMove);
            document.removeEventListener('touchend', touchEnd);
        };

        this.container.addEventListener('touchstart', touchStart);
    }

 addCustomTab(tabName) {
        if (!this.tabs.includes(tabName)) {
            this.tabs.push(tabName);
            const tabContainer = this.container.querySelector('.tab-container');
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.textContent = tabName;
            tab.onclick = () => this.switchTab(tabName);
            tabContainer.appendChild(tab);

            const console = document.createElement('div');
            console.className = 'console-content';
            this.consoles[tabName] = console;
            this.container.appendChild(console);

            this.adjustTabLayout();
        }
    }

    addCustomMessage(tabName, message, style = {}) {
        if (!this.consoles[tabName]) {
            this.addCustomTab(tabName);
        }

        const element = document.createElement('div');
        element.className = 'custom-message';
        element.textContent = message;

        Object.assign(element.style, {
            backgroundColor: style.backgroundColor || 'transparent',
            color: style.color || '#fff',
            fontWeight: style.fontWeight || 'normal',
            fontStyle: style.fontStyle || 'normal',
            textDecoration: style.textDecoration || 'none',
            padding: style.padding || '5px',
            borderRadius: style.borderRadius || '3px',
            border: style.border || 'none',
            marginBottom: '5px'
        });

        this.consoles[tabName].appendChild(element);
        this.consoles[tabName].scrollTop = this.consoles[tabName].scrollHeight;
    }
}