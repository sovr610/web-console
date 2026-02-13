/**
 * Solid.js wrapper for the vanilla WebConsole class.
 *
 * Usage:
 *   import WebConsole from 'web-console/solid';
 *
 *   function App() {
 *     let api;
 *     return <WebConsole ref={el => api = el} onReady={(inst) => console.log(inst)} />;
 *   }
 *
 * Props:
 *   containerId  — DOM id for the container (default: 'web-console')
 *   visible      — whether the console starts visible (default: true)
 *   onReady      — callback fired with the vanilla WebConsole instance
 *   ref          — callback ref receiving the API object
 *
 * API (via ref):
 *   show, hide, toggle, clearConsole, addCustomTab, addCustomMessage, destroy, instance
 */

import { createEffect, onCleanup } from 'solid-js';

function WebConsole(props) {
  let wcInstance = null;

  // Solid runs the function body once (like React's initial render).
  // Use queueMicrotask to ensure the DOM is ready before creating the console.
  queueMicrotask(() => {
    const WC = window.WebConsole;
    if (!WC) {
      console.error('[WebConsole Solid] WebConsole class not found on window');
      return;
    }

    wcInstance = new WC(props.containerId || 'web-console');

    if (props.visible === false) {
      wcInstance.hide();
    }

    // Expose API via ref callback
    const api = {
      show:  () => wcInstance?.show(),
      hide:  () => wcInstance?.hide(),
      toggle: () => wcInstance?.toggle(),
      clearConsole: () => wcInstance?.clearConsole(),
      addCustomTab: (name) => wcInstance?.addCustomTab(name),
      addCustomMessage: (tab, msg, style) => wcInstance?.addCustomMessage(tab, msg, style),
      destroy: () => wcInstance?.destroy(),
      get instance() { return wcInstance; }
    };

    if (typeof props.ref === 'function') props.ref(api);
    if (props.onReady) props.onReady(wcInstance);
  });

  // Reactively sync the visible prop
  createEffect(() => {
    if (!wcInstance) return;
    const vis = props.visible;
    vis !== false ? wcInstance.show() : wcInstance.hide();
  });

  onCleanup(() => {
    wcInstance?.destroy();
    wcInstance = null;
  });

  // Vanilla WebConsole manages its own DOM — nothing to render
  return null;
}

export { WebConsole };
export default WebConsole;
