<!--
  Vue 3 wrapper for the vanilla WebConsole class.

  Usage:
    <WebConsole />
    <WebConsole container-id="my-console" :visible="false" @ready="onReady" />
-->
<template>
  <!-- Vanilla WebConsole manages its own DOM — nothing to render -->
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  /** DOM id for the console container */
  containerId: { type: String, default: 'web-console' },
  /** Whether the console starts visible */
  visible: { type: Boolean, default: true },
});

const emit = defineEmits(['ready']);

const instance = ref(null);

onMounted(() => {
  const WC = window.WebConsole;
  if (!WC) {
    console.error('[WebConsole Vue] WebConsole class not found on window');
    return;
  }

  instance.value = new WC(props.containerId);

  if (!props.visible) {
    instance.value.hide();
  }

  emit('ready', instance.value);
});

onUnmounted(() => {
  instance.value?.destroy();
  instance.value = null;
});

// Sync the visible prop reactively
watch(
  () => props.visible,
  (val) => {
    if (!instance.value) return;
    val ? instance.value.show() : instance.value.hide();
  }
);

// ── Public API ──────────────────────────────────────────────
function show() { instance.value?.show(); }
function hide() { instance.value?.hide(); }
function toggle() { instance.value?.toggle(); }
function clearConsole() { instance.value?.clearConsole(); }
function addCustomTab(name) { instance.value?.addCustomTab(name); }
function addCustomMessage(tab, msg, style) { instance.value?.addCustomMessage(tab, msg, style); }

defineExpose({
  show,
  hide,
  toggle,
  clearConsole,
  addCustomTab,
  addCustomMessage,
  /** Direct access to the underlying vanilla WebConsole */
  instance,
});
</script>

