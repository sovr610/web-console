<template>
  <div ref="consoleContainer" :class="{'web-console': true, 'hidden': !visible}">
    <button class="toggle-console" @click="toggleVisibility">
      {{ visible ? 'Hide Console' : 'Show Console' }}
    </button>
    <div class="tab-container">
      <div v-for="tabName in tabs" :key="tabName"
           :class="{'tab': true, 'active': activeTab === tabName}"
           @click="setActiveTab(tabName)">
        {{ tabName }}
      </div>
    </div>
    <div v-for="tabName in tabs" :key="tabName"
         :class="{'console-content': true, 'active': activeTab === tabName}">
      <div v-for="(message, index) in consoles[tabName]" :key="index" v-html="message"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const visible = ref(true);
const activeTab = ref('Default');
const tabs = ref(['Default', 'Event Logger']);
const consoles = ref({});
const eventMap = ref(new Map());
const consoleContainer = ref(null);
const initialHeight = 300;

function toggleVisibility() {
  visible.value = !visible.value;
}

function setActiveTab(tabName) {
  activeTab.value = tabName;
}

function overrideConsoleMethods() {
  const methods = ['log', 'warn', 'error', 'table'];
  methods.forEach(method => {
    const originalMethod = console[method];
    console[`original${method.charAt(0).toUpperCase() + method.slice(1)}`] = originalMethod;
    console[method] = (...args) => {
      addMessage(method, args);
      originalMethod.apply(console, args);
    };
  });
}

function restoreConsoleMethods() {
  ['log', 'warn', 'error', 'table'].forEach(method => {
    console[method] = console[`original${method.charAt(0).toUpperCase() + method.slice(1)}`];
  });
}

function addMessage(type, args) {
  if (!consoles.value['Default']) {
    consoles.value['Default'] = [];
  }
  
  let element;
  if (type === 'table') {
    element = createTableElement(args[0]);
  } else {
    const formattedArgs = formatArgs(args);
    element = `<div class="${type}">[${type.toUpperCase()}] ${formattedArgs}</div>`;
  }
  
  consoles.value['Default'].push(element);
}

function formatArgs(args) {
  return args.map(arg => {
    if (typeof arg === 'string' && arg.includes('%c')) {
      return processColoredText(arg, args);
    }
    return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
  }).join(' ');
}

function processColoredText(text, args) {
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

function createTableElement(data) {
  if (Array.isArray(data)) {
    const headers = Object.keys(data[0] || {});
    const headerRow = headers.map(header => `<th>${header}</th>`).join('');
    const bodyRows = data.map(item => 
      `<tr>${headers.map(header => `<td>${JSON.stringify(item[header])}</td>`).join('')}</tr>`
    ).join('');
    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  } else if (typeof data === 'object') {
    const rows = Object.entries(data).map(([key, value]) => 
      `<tr><td>${key}</td><td>${JSON.stringify(value)}</td></tr>`
    ).join('');
    return `<table><tbody>${rows}</tbody></table>`;
  }
  return '';
}

function setupEventLogger() {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (!eventMap.value.has(this)) {
      eventMap.value.set(this, new Map());
    }
    if (!eventMap.value.get(this).has(type)) {
      eventMap.value.get(this).set(type, new Set());
    }
    eventMap.value.get(this).get(type).add(listener);
    return originalAddEventListener.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function(type, listener, options) {
    if (eventMap.value.has(this) && eventMap.value.get(this).has(type)) {
      eventMap.value.get(this).get(type).delete(listener);
      if (eventMap.value.get(this).get(type).size === 0) {
        eventMap.value.get(this).delete(type);
      }
      if (eventMap.value.get(this).size === 0) {
        eventMap.value.delete(this);
      }
    }
    return originalRemoveEventListener.call(this, type, listener, options);
  };

  return setInterval(() => updateEventLogger(), 1000);
}

function updateEventLogger() {
  if (!consoles.value['Event Logger']) {
    consoles.value['Event Logger'] = [];
  }

  consoles.value['Event Logger'] = [];

  eventMap.value.forEach((listeners, target) => {
    listeners.forEach((listenerSet, type) => {
      consoles.value['Event Logger'].push(
        `<div class="event-logger-item">${getElementDescription(target)}: ${type} (${listenerSet.size} listener${listenerSet.size > 1 ? 's' : ''})</div>`
      );
    });
  });
}

function getElementDescription(element) {
  if (element === window) return 'Window';
  if (element === document) return 'Document';
  if (element === document.body) return 'Body';
  if (element instanceof HTMLElement) {
    return `<${element.tagName.toLowerCase()}${element.id ? ` id="${element.id}"` : ''}${element.className ? ` class="${element.className}"` : ''}>`;
  }
  return 'Unknown Element';
}

function setupResizeGesture() {
  let startY, startHeight;

  const touchStart = (e) => {
    if (e.touches.length === 2) {
      startY = e.touches[0].clientY;
      startHeight = consoleContainer.value.offsetHeight;
      document.addEventListener('touchmove', touchMove, { passive: false });
      document.addEventListener('touchend', touchEnd);
    }
  };

  const touchMove = (e) => {
    if (e.touches.length === 2) {
      const deltaY = startY - e.touches[0].clientY;
      const newHeight = Math.min(Math.max(startHeight + deltaY, initialHeight), window.innerHeight);
      consoleContainer.value.style.height = `${newHeight}px`;
      e.preventDefault();
    }
  };

  const touchEnd = () => {
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);
  };

  consoleContainer.value.addEventListener('touchstart', touchStart);
}

function addCustomTab(tabName) {
  if (!tabs.value.includes(tabName)) {
    tabs.value.push(tabName);
    consoles.value[tabName] = [];
  }
}

function addCustomMessage(tabName, message, style = {}) {
  if (!consoles.value[tabName]) {
    addCustomTab(tabName);
  }

  const styleString = Object.entries(style).map(([key, value]) => `${key}:${value}`).join(';');
  const element = `<div class="custom-message" style="${styleString}">${message}</div>`;
  consoles.value[tabName].push(element);
}

let eventLoggerInterval;

onMounted(() => {
  overrideConsoleMethods();
  eventLoggerInterval = setupEventLogger();
  nextTick(() => {
    setupResizeGesture();
  });
});

onUnmounted(() => {
  restoreConsoleMethods();
  clearInterval(eventLoggerInterval);
});
</script>

<style scoped>
.web-console {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 300px;
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
.web-console.hidden { transform: translateY(100%); }
.web-console :deep(.log) { color: #fff; }
.web-console :deep(.warn) { color: #ffcc00; }
.web-console :deep(.error) { color: #ff4444; }
.web-console :deep(table) { color: #fff; width: 100%; border-collapse: collapse; }
.web-console :deep(th), .web-console :deep(td) { border: 1px solid #444; padding: 5px; text-align: left; }
.toggle-console {
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
.tab.active { background-color: #666; }
.console-content {
  display: none;
  height: calc(100% - 70px);
  overflow-y: auto;
}
.console-content.active { display: block; }
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
</style>