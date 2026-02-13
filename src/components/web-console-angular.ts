import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  NgModule,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowser } from '@angular/platform-browser';

/**
 * Angular wrapper for the vanilla WebConsole class.
 *
 * Usage:
 *   <app-web-console [containerId]="'my-console'" [visible]="true"></app-web-console>
 */
@Component({
  selector: 'app-web-console',
  template: `<!-- Vanilla WebConsole manages its own DOM -->`,
  styles: [`:host { display: none; }`],
})
export class WebConsoleComponent implements OnInit, OnDestroy {
  /** DOM id for the console container */
  @Input() containerId: string = 'web-console';
  /** Whether the console is visible on init */
  @Input() visible: boolean = true;
  /** Emitted once the vanilla instance is created */
  @Output() ready = new EventEmitter<any>();

  private _instance: any = null;

  /** Direct access to the underlying vanilla WebConsole */
  get instance(): any {
    return this._instance;
  }

  ngOnInit(): void {
    const WC = (window as any).WebConsole;
    if (!WC) {
      console.error('[WebConsole Angular] WebConsole class not found on window');
      return;
    }

    this._instance = new WC(this.containerId);

    if (!this.visible) {
      this._instance.hide();
    }

    this.ready.emit(this._instance);
  }

  ngOnDestroy(): void {
    this._instance?.destroy();
    this._instance = null;
  }

  // ── Public API pass-through ─────────────────────────────

  show(): void { this._instance?.show(); }
  hide(): void { this._instance?.hide(); }
  toggle(): void { this._instance?.toggle(); }
  clearConsole(): void { this._instance?.clearConsole(); }
  addCustomTab(name: string): void { this._instance?.addCustomTab(name); }
  addCustomMessage(tab: string, msg: string, style?: Record<string, string>): void {
    this._instance?.addCustomMessage(tab, msg, style);
  }
}

@NgModule({
  declarations: [WebConsoleComponent],
  imports: [BrowserModule],
  exports: [WebConsoleComponent],
  bootstrap: [WebConsoleComponent],
})
export class WebConsoleModule {}

const platform = platformBrowser();
export function bootstrap(): void {
  platform.bootstrapModule(WebConsoleModule);
}

