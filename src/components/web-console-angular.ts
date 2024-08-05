import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { platformBrowser } from '@angular/platform-browser';

@Component({
  selector: 'app-web-console',
  template: `
    <div #consoleContainer [ngClass]="{'web-console': true, 'hidden': !visible}">
      <button class="toggle-console" (click)="toggleVisibility()">
        {{ visible ? 'Hide Console' : 'Show Console' }}
      </button>
      <div class="tab-container">
        <div *ngFor="let tabName of tabs"
             [ngClass]="{'tab': true, 'active': activeTab === tabName}"
             (click)="setActiveTab(tabName)">
          {{ tabName }}
        </div>
      </div>
      <div *ngFor="let tabName of tabs"
           [ngClass]="{'console-content': true, 'active': activeTab === tabName}">
        <ng-container *ngFor="let message of consoles[tabName]">
          <div [innerHTML]="message"></div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
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
    .web-console ::ng-deep .log { color: #fff; }
    .web-console ::ng-deep .warn { color: #ffcc00; }
    .web-console ::ng-deep .error { color: #ff4444; }
    .web-console ::ng-deep table { color: #fff; width: 100%; border-collapse: collapse; }
    .web-console ::ng-deep th, .web-console ::ng-deep td { border: 1px solid #444; padding: 5px; text-align: left; }
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
  `]
})
export class WebConsoleComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('consoleContainer') consoleContainer!: ElementRef;

  visible = true;
  activeTab = 'Default';
  tabs = ['Default', 'Event Logger'];
  consoles: { [key: string]: string[] } = {};
  eventMap = new Map<any, Map<string, Set<any>>>();
  private eventLoggerInterval: any;
  private initialHeight = 300;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.overrideConsoleMethods();
    this.setupEventLogger();
  }

  ngAfterViewInit() {
    this.setupResizeGesture();
  }

  ngOnDestroy() {
    this.restoreConsoleMethods();
    clearInterval(this.eventLoggerInterval);
  }

  private overrideConsoleMethods() {
    const methods = ['log', 'warn', 'error', 'table'];
    methods.forEach(method => {
      const originalMethod = (console as any)[method];
      (console as any)[`original${method.charAt(0).toUpperCase() + method.slice(1)}`] = originalMethod;
      (console as any)[method] = (...args: any[]) => {
        this.addMessage(method, args);
        originalMethod.apply(console, args);
      };
    });
  }

  private restoreConsoleMethods() {
    ['log', 'warn', 'error', 'table'].forEach(method => {
      (console as any)[method] = (console as any)[`original${method.charAt(0).toUpperCase() + method.slice(1)}`];
    });
  }

  private addMessage(type: string, args: any[]) {
    if (!this.consoles['Default']) {
      this.consoles['Default'] = [];
    }
    
    let element: string;
    if (type === 'table') {
      element = this.createTableElement(args[0]);
    } else {
      const formattedArgs = this.formatArgs(args);
      element = `<div class="${type}">[${type.toUpperCase()}] ${formattedArgs}</div>`;
    }
    
    this.consoles['Default'].push(element);
    this.cdr.detectChanges();
  }

  private formatArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'string' && arg.includes('%c')) {
        return this.processColoredText(arg, args);
      }
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');
  }

  private processColoredText(text: string, args: any[]): string {
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

  private createTableElement(data: any): string {
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

  private setupEventLogger() {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function(this: EventTarget & { eventMap?: Map<any, Map<string, Set<any>>> }, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (!this.eventMap) {
        this.eventMap = new Map();
      }
      if (!this.eventMap.has(this)) {
        this.eventMap.set(this, new Map());
      }
      if (!this.eventMap.get(this)!.has(type)) {
        this.eventMap.get(this)!.set(type, new Set());
      }
      this.eventMap.get(this)!.get(type)!.add(listener);
      return originalAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function(this: EventTarget & { eventMap?: Map<any, Map<string, Set<any>>> }, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
      if (this.eventMap && this.eventMap.has(this) && this.eventMap.get(this)!.has(type)) {
        this.eventMap.get(this)!.get(type)!.delete(listener);
        if (this.eventMap.get(this)!.get(type)!.size === 0) {
          this.eventMap.get(this)!.delete(type);
        }
        if (this.eventMap.get(this)!.size === 0) {
          this.eventMap.delete(this);
        }
      }
      return originalRemoveEventListener.call(this, type, listener, options);
    };

    this.eventLoggerInterval = setInterval(() => this.updateEventLogger(), 1000);
  }

  private updateEventLogger() {
    if (!this.consoles['Event Logger']) {
      this.consoles['Event Logger'] = [];
    }

    this.consoles['Event Logger'] = [];

    document.querySelectorAll('*').forEach((element: Element & { eventMap?: Map<any, Map<string, Set<any>>> }) => {
      if (element.eventMap) {
        element.eventMap.forEach((listeners, target) => {
          listeners.forEach((listenerSet, type) => {
            this.consoles['Event Logger'].push(
              `<div class="event-logger-item">${this.getElementDescription(target)}: ${type} (${listenerSet.size} listener${listenerSet.size > 1 ? 's' : ''})</div>`
            );
          });
        });
      }
    });

    this.cdr.detectChanges();
  }

  private getElementDescription(element: any): string {
    if (element === window) return 'Window';
    if (element === document) return 'Document';
    if (element === document.body) return 'Body';
    if (element instanceof HTMLElement) {
      return `<${element.tagName.toLowerCase()}${element.id ? ` id="${element.id}"` : ''}${element.className ? ` class="${element.className}"` : ''}>`;
    }
    return 'Unknown Element';
  }

  private setupResizeGesture() {
    let startY: number, startHeight: number;

    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startY = e.touches[0].clientY;
        startHeight = this.consoleContainer.nativeElement.offsetHeight;
        document.addEventListener('touchmove', touchMove, { passive: false });
        document.addEventListener('touchend', touchEnd);
      }
    };

    const touchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const deltaY = startY - e.touches[0].clientY;
        const newHeight = Math.min(Math.max(startHeight + deltaY, this.initialHeight), window.innerHeight);
        this.consoleContainer.nativeElement.style.height = `${newHeight}px`;
        e.preventDefault();
      }
    };

    const touchEnd = () => {
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
    };

    this.consoleContainer.nativeElement.addEventListener('touchstart', touchStart);
  }

  toggleVisibility() {
    this.visible = !this.visible;
  }

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }

  addCustomTab(tabName: string) {
    if (!this.tabs.includes(tabName)) {
      this.tabs.push(tabName);
      this.consoles[tabName] = [];
      this.cdr.detectChanges();
    }
  }

  addCustomMessage(tabName: string, message: string, style: { [key: string]: string } = {}) {
    if (!this.consoles[tabName]) {
      this.addCustomTab(tabName);
    }

    const styleString = Object.entries(style).map(([key, value]) => `${key}:${value}`).join(';');
    const element = `<div class="custom-message" style="${styleString}">${message}</div>`;
    this.consoles[tabName].push(element);
    this.cdr.detectChanges();
  }
}

@NgModule({
  declarations: [WebConsoleComponent],
  imports: [BrowserModule, CommonModule],
  exports: [WebConsoleComponent],
  bootstrap: [WebConsoleComponent]
})
export class WebConsoleModule {}

// Use platformBrowser instead of platformBrowserDynamic
const platform = platformBrowser();
export function bootstrap() {
  platform.bootstrapModule(WebConsoleModule);
}