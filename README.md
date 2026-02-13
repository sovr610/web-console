# WebConsole

A lightweight, zero-dependency mobile developer console that runs directly in the browser. Inspect logs, DOM elements, network requests, and custom metrics — no USB cable or desktop DevTools required.

Inspired by [Eruda](https://github.com/nicai/eruda) and [vConsole](https://github.com/nicai/vConsole), but built as a single vanilla JS class with no runtime dependencies and optional React, Angular, and Vue component wrappers.

## Features

- **Console tab** — colour-coded `log` / `warn` / `error` / `info` output with filter buttons, text search, and log-level badges
- **Collapsible object trees** — expand nested objects, arrays, Maps, Sets, and DOM nodes inline
- **REPL** — evaluate JavaScript live from the command input with ↑/↓ history
- **Elements tab** — live, lazy-loaded DOM tree inspector
- **Network tab** — auto-intercepted `fetch` and `XMLHttpRequest` with status codes, timing waterfall bars, and expandable detail panels
- **Events tab** — periodic snapshot of registered event listeners
- **Custom tabs** — `addCustomTab()` / `addCustomMessage()` API for app-specific metrics
- **Resize handle** — single-finger drag to resize the panel height
- **FAB toggle** — floating 🐞 button appears when the console is hidden; swipe down or tap ✕ to close
- **Responsive** — CSS custom properties, `clamp()` font sizing, `safe-area-inset` padding, works on any screen size
- **Dark theme** — VS Code-inspired colour palette out of the box

## Quick Start

### Vanilla JS (no bundler)

```html
<script src="src/new-webConsole.js"></script>
<script>
  const devtools = new WebConsole();
  // That's it — the panel is now visible at the bottom of the page.
</script>
```

### From the built bundle

```bash
npm install
npm run build
```

```html
<script src="dist/web-console-bundle.js"></script>
<script>
  const devtools = new WebConsole();
</script>
```

## NPM Scripts

| Command | Description |
|---|---|
| `npm run build` | Production build — minified, tree-shaken, content-hashed |
| `npm run build:dev` | Development build — fast, with eval source maps |
| `npm run build:vanilla` | Build only the vanilla JS component |
| `npm run watch` | Development build in watch mode |
| `npm run serve` | Dev server on `localhost:9000`, opens the vanilla example |
| `npm run serve:prod` | Serve the production build |
| `npm run analyze` | Generate a webpack bundle analysis report |
| `npm run clean` | Delete the `dist/` folder |

## API

```js
const wc = new WebConsole(containerId?);
```

| Method | Description |
|---|---|
| `wc.show()` | Show the console panel |
| `wc.hide()` | Hide the console panel (FAB button appears) |
| `wc.toggle()` | Toggle visibility |
| `wc.clearConsole()` | Clear all log entries and reset counters |
| `wc.addCustomTab(name)` | Create a new tab |
| `wc.addCustomMessage(tab, msg, style?)` | Append a styled message to a custom tab |
| `wc.destroy()` | Remove the console from the DOM and restore native `console` methods |

All standard `console.log`, `console.warn`, `console.error`, and `console.info` calls are automatically captured and displayed. Network requests via `fetch` and `XMLHttpRequest` are intercepted and shown in the Network tab.

## Project Structure

```
web-console/
├── src/
│   ├── new-webConsole.js          # Main component (vanilla JS, zero deps)
│   ├── webConsole.js              # Legacy version (kept for reference)
│   └── components/
│       ├── web-console-react.tsx  # React 18 wrapper
│       ├── web-console-angular.ts # Angular 18 wrapper
│       └── web-console.vue        # Vue 3 wrapper
├── example/
│   ├── web-console-vanilla.html   # Interactive demo — tap buttons to exercise every feature
│   ├── showing-web-console-comp.html  # Framework wrapper showcase (React / Angular / Vue)
│   └── demo-scenarios.js          # Reusable scenario functions (API chains, boot sim, etc.)
├── dist/                          # Built bundles (generated)
├── webpack.config.js              # Webpack 5 config (dev/prod, TerserPlugin, dev-server)
├── tsconfig.json
└── package.json
```

## Examples

Open `example/web-console-vanilla.html` in any browser (or run `npm run serve`) to see the full interactive demo. It includes buttons for:

- Every log level with realistic messages
- Structured data — objects, arrays, deeply nested config trees, all JS primitive types
- Network requests — GET, POST, 404 responses (hits [jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com))
- Custom "Metrics" tab with styled messages
- 100-entry stress test
- Error with stack trace

`example/demo-scenarios.js` contains reusable functions you can call from the REPL or import into your own pages:

```js
demoApiCallChain()     // Chained fetch: user → posts → comments
demoPeriodicLogs()     // Timed background log entries with simulated metrics
demoAppBoot()          // Realistic app startup with mixed log levels
demoCaughtException()  // Null reference error with stack trace
demoDeepObject()       // Large nested object for tree inspector testing
```

## Framework Wrappers

Component wrappers are provided for React 18, Angular 18, and Vue 3. After building (`npm run build`), the UMD bundles are available in `dist/`:

- `react-bundle.js`
- `angular-bundle.js`
- `vue-bundle.js`

See `example/showing-web-console-comp.html` for usage examples and setup instructions.

## Build Optimizations

The webpack config supports both development and production modes:

- **TerserPlugin** — 2-pass minification with comment stripping
- **Tree shaking** — `usedExports: true`
- **Content hashing** — `[contenthash:8]` filenames for long-term caching
- **Filesystem caching** — dramatically faster rebuilds
- **Source maps** — full `source-map` in production, `eval-source-map` in development
- **Auto-clean** — `output.clean: true` wipes `dist/` before each build

## License

MIT
