<!--
  Svelte wrapper for the vanilla WebConsole class.

  Usage:
    <WebConsole />
    <WebConsole containerId="my-console" visible={false} on:ready={onReady} />

  Methods (bind:this to access):
    show(), hide(), toggle(), clearConsole(),
    addCustomTab(name), addCustomMessage(tab, msg, style),
    destroy(), getInstance()
-->
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  /** DOM id for the console container */
  export let containerId = 'web-console';
  /** Whether the console starts visible */
  export let visible = true;

  const dispatch = createEventDispatcher();
  let instance = null;

  onMount(() => {
    const WC = window.WebConsole;
    if (!WC) {
      console.error('[WebConsole Svelte] WebConsole class not found on window');
      return;
    }

    instance = new WC(containerId);

    if (!visible) {
      instance.hide();
    }

    dispatch('ready', instance);
  });

  onDestroy(() => {
    instance?.destroy();
    instance = null;
  });

  // Reactively sync the visible prop
  $: if (instance) {
    visible ? instance.show() : instance.hide();
  }

  // ── Public API ──────────────────────────────────────────────
  export function show() { instance?.show(); }
  export function hide() { instance?.hide(); }
  export function toggle() { instance?.toggle(); }
  export function clearConsole() { instance?.clearConsole(); }
  export function addCustomTab(name) { instance?.addCustomTab(name); }
  export function addCustomMessage(tab, msg, style) { instance?.addCustomMessage(tab, msg, style); }
  export function destroy() { instance?.destroy(); }
  /** Direct access to the underlying vanilla WebConsole instance */
  export function getInstance() { return instance; }
</script>

<!-- Vanilla WebConsole manages its own DOM — nothing to render -->
