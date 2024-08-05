import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ConsoleProps {}

interface ConsoleState {
  visible: boolean;
  activeTab: string;
  tabs: string[];
  consoles: { [key: string]: React.ReactNode[] };
}

const WebConsole: React.FC<ConsoleProps> = () => {
  const [state, setState] = useState<ConsoleState>({
    visible: true,
    activeTab: 'Default',
    tabs: ['Default', 'Event Logger'],
    consoles: {},
  });
  const [eventMap, setEventMap] = useState<Map<any, Map<string, Set<any>>>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const initialHeight = 300;

  useEffect(() => {
    overrideConsoleMethods();
    const eventLoggerInterval = setupEventLogger();
    setupResizeGesture();

    return () => {
      restoreConsoleMethods();
      clearInterval(eventLoggerInterval);
    };
  }, []);

  const toggleVisibility = () => {
    setState(prevState => ({ ...prevState, visible: !prevState.visible }));
  };

  const setActiveTab = (tabName: string) => {
    setState(prevState => ({ ...prevState, activeTab: tabName }));
  };

  const overrideConsoleMethods = () => {
    const methods = ['log', 'warn', 'error', 'table'] as const;
    methods.forEach(method => {
      const originalMethod = (console as any)[method];
      (console as any)[`original${method.charAt(0).toUpperCase() + method.slice(1)}`] = originalMethod;
      (console as any)[method] = (...args: any[]) => {
        addMessage(method, args);
        originalMethod.apply(console, args);
      };
    });
  };

  const restoreConsoleMethods = () => {
    ['log', 'warn', 'error', 'table'].forEach(method => {
      (console as any)[method] = (console as any)[`original${method.charAt(0).toUpperCase() + method.slice(1)}`];
    });
  };

  const addMessage = (type: string, args: any[]) => {
    setState(prevState => {
      const updatedConsoles = { ...prevState.consoles };
      if (!updatedConsoles['Default']) {
        updatedConsoles['Default'] = [];
      }
      
      let element;
      if (type === 'table') {
        element = createTableElement(args[0]);
      } else {
        const formattedArgs = formatArgs(args);
        element = <div className={type} dangerouslySetInnerHTML={{ __html: `[${type.toUpperCase()}] ${formattedArgs}` }} />;
      }
      
      updatedConsoles['Default'] = [...updatedConsoles['Default'], element];
      return { ...prevState, consoles: updatedConsoles };
    });
  };

  const formatArgs = (args: any[]): string => {
    return args.map(arg => {
      if (typeof arg === 'string' && arg.includes('%c')) {
        return processColoredText(arg, args);
      }
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');
  };

  const processColoredText = (text: string, args: any[]): string => {
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
  };

  const createTableElement = (data: any): React.ReactNode => {
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0] || {});
      return (
        <table>
          <thead>
            <tr>
              {headers.map((header, index) => <th key={index}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header, cellIndex) => <td key={cellIndex}>{JSON.stringify(item[header])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (typeof data === 'object') {
      return (
        <table>
          <tbody>
            {Object.entries(data).map(([key, value], index) => (
              <tr key={index}>
                <td>{key}</td>
                <td>{JSON.stringify(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return null;
  };

  const setupEventLogger = () => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      setEventMap(prevMap => {
        const newMap = new Map(prevMap);
        if (!newMap.has(this)) {
          newMap.set(this, new Map());
        }
        const listeners = newMap.get(this)!;
        if (!listeners.has(type)) {
          listeners.set(type, new Set());
        }
        listeners.get(type)!.add(listener);
        return newMap;
      });
      return originalAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
      setEventMap(prevMap => {
        const newMap = new Map(prevMap);
        if (newMap.has(this) && newMap.get(this)!.has(type)) {
          const listeners = newMap.get(this)!;
          listeners.get(type)!.delete(listener);
          if (listeners.get(type)!.size === 0) {
            listeners.delete(type);
          }
          if (listeners.size === 0) {
            newMap.delete(this);
          }
        }
        return newMap;
      });
      return originalRemoveEventListener.call(this, type, listener, options);
    };

    return setInterval(() => updateEventLogger(), 1000);
  };

  const updateEventLogger = () => {
    setState(prevState => {
      const updatedConsoles = { ...prevState.consoles };
      updatedConsoles['Event Logger'] = [];

      eventMap.forEach((listeners, target) => {
        listeners.forEach((listenerSet, type) => {
          updatedConsoles['Event Logger'].push(
            <div key={`${getElementDescription(target)}-${type}`} className="event-logger-item">
              {`${getElementDescription(target)}: ${type} (${listenerSet.size} listener${listenerSet.size > 1 ? 's' : ''})`}
            </div>
          );
        });
      });

      return { ...prevState, consoles: updatedConsoles };
    });
  };

  const getElementDescription = (element: any): string => {
    if (element === window) return 'Window';
    if (element === document) return 'Document';
    if (element === document.body) return 'Body';
    if (element instanceof HTMLElement) {
      return `<${element.tagName.toLowerCase()}${element.id ? ` id="${element.id}"` : ''}${element.className ? ` class="${element.className}"` : ''}>`;
    }
    return 'Unknown Element';
  };

  const setupResizeGesture = () => {
    let startY: number, startHeight: number;

    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startY = e.touches[0].clientY;
        startHeight = containerRef.current?.offsetHeight || initialHeight;
        document.addEventListener('touchmove', touchMove, { passive: false });
        document.addEventListener('touchend', touchEnd);
      }
    };

    const touchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const deltaY = startY - e.touches[0].clientY;
        const newHeight = Math.min(Math.max(startHeight + deltaY, initialHeight), window.innerHeight);
        if (containerRef.current) {
          containerRef.current.style.height = `${newHeight}px`;
        }
        e.preventDefault();
      }
    };

    const touchEnd = () => {
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
    };

    containerRef.current?.addEventListener('touchstart', touchStart);
  };

  const addCustomTab = (tabName: string) => {
    setState(prevState => {
      if (!prevState.tabs.includes(tabName)) {
        return {
          ...prevState,
          tabs: [...prevState.tabs, tabName],
          consoles: { ...prevState.consoles, [tabName]: [] }
        };
      }
      return prevState;
    });
  };

  const addCustomMessage = (tabName: string, message: string, style: React.CSSProperties = {}) => {
    setState(prevState => {
      const updatedConsoles = { ...prevState.consoles };
      if (!updatedConsoles[tabName]) {
        addCustomTab(tabName);
      }
      const element = (
        <div
          className="custom-message"
          style={style}
        >
          {message}
        </div>
      );
      updatedConsoles[tabName] = [...(updatedConsoles[tabName] || []), element];
      return { ...prevState, consoles: updatedConsoles };
    });
  };

  return (
    <div ref={containerRef} className={`web-console ${state.visible ? '' : 'hidden'}`}>
      <button className="toggle-console" onClick={toggleVisibility}>
        {state.visible ? 'Hide Console' : 'Show Console'}
      </button>
      <div className="tab-container">
        {state.tabs.map(tabName => (
          <div
            key={tabName}
            className={`tab ${state.activeTab === tabName ? 'active' : ''}`}
            onClick={() => setActiveTab(tabName)}
          >
            {tabName}
          </div>
        ))}
      </div>
      {state.tabs.map(tabName => (
        <div
          key={tabName}
          className={`console-content ${state.activeTab === tabName ? 'active' : ''}`}
        >
          {state.consoles[tabName]}
        </div>
      ))}
    </div>
  );
};

const ReactBundle = {
  React,
  ReactDOM,
  WebConsole
};

export default ReactBundle;