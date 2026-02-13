import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// Import the vanilla WebConsole class (bundled alongside via webpack)
// @ts-ignore — vanilla JS class, no type declarations
import { getWebConsoleClass } from '../new-webConsole';

// ── Prop types ──────────────────────────────────────────────
export interface WebConsoleProps {
  /** DOM id for the console container (default: 'web-console') */
  containerId?: string;
  /** Whether the console is visible on mount (default: true) */
  visible?: boolean;
  /** Called after the underlying WebConsole instance is created */
  onReady?: (instance: any) => void;
}

/** Methods exposed via ref */
export interface WebConsoleHandle {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  clearConsole: () => void;
  addCustomTab: (name: string) => void;
  addCustomMessage: (tab: string, msg: string, style?: Record<string, string>) => void;
  destroy: () => void;
  /** Direct access to the underlying vanilla WebConsole instance */
  instance: any;
}

// ── Component ───────────────────────────────────────────────
const WebConsole = forwardRef<WebConsoleHandle, WebConsoleProps>(
  ({ containerId = 'web-console', visible = true, onReady }, ref) => {
    const wcRef = useRef<any>(null);

    // Create the vanilla WebConsole instance once on mount
    useEffect(() => {
      // Grab the class — it's attached to window by the vanilla script
      const WC = (window as any).WebConsole || getWebConsoleClass?.();
      if (!WC) {
        console.error('[WebConsole React] WebConsole class not found');
        return;
      }

      const instance = new WC(containerId);
      wcRef.current = instance;

      if (!visible) {
        instance.hide();
      }

      onReady?.(instance);

      return () => {
        instance.destroy();
        wcRef.current = null;
      };
    }, [containerId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync the visible prop
    useEffect(() => {
      if (!wcRef.current) return;
      visible ? wcRef.current.show() : wcRef.current.hide();
    }, [visible]);

    // Expose imperative methods via ref
    useImperativeHandle(ref, () => ({
      show: () => wcRef.current?.show(),
      hide: () => wcRef.current?.hide(),
      toggle: () => wcRef.current?.toggle(),
      clearConsole: () => wcRef.current?.clearConsole(),
      addCustomTab: (name: string) => wcRef.current?.addCustomTab(name),
      addCustomMessage: (tab: string, msg: string, style?: Record<string, string>) =>
        wcRef.current?.addCustomMessage(tab, msg, style),
      destroy: () => wcRef.current?.destroy(),
      get instance() { return wcRef.current; }
    }), []);

    // The vanilla class manages its own DOM — no React render needed
    return null;
  }
);

WebConsole.displayName = 'WebConsole';

export { WebConsole };
export default WebConsole;

