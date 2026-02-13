const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

// ── Shared settings ─────────────────────────────────────────
function sharedConfig(isProduction) {
  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    cache: {
      type: 'filesystem',
      buildDependencies: { config: [__filename] }
    },

    module: {
      rules: [
        { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
        { test: /\.js$/, use: 'babel-loader', exclude: /node_modules/ },
        { test: /\.vue$/, use: 'vue-loader' },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      ],
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.vue'],
    },

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: { drop_console: false, passes: 2 },
            output: { comments: false }
          },
          extractComments: false
        })
      ],
      usedExports: true
    },

    stats: isProduction ? 'normal' : 'minimal'
  };
}

// ── Configs ─────────────────────────────────────────────────
module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const shared = sharedConfig(isProduction);
  const hash = isProduction ? '.[contenthash:8]' : '';

  // 1. Vanilla JS — standalone, zero dependencies
  const vanillaConfig = {
    ...shared,
    name: 'vanilla',
    entry: { 'web-console': './src/new-webConsole.js' },
    output: {
      filename: `[name]-bundle${hash}.js`,
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'umd',
      library: 'WebConsole',
      libraryExport: 'default',
      globalObject: 'this'
    },
    plugins: [
      new CopyPlugin({ patterns: [{ from: 'example', to: 'example' }] }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      })
    ],
    devServer: {
      static: [
        { directory: path.resolve(__dirname, 'example'), publicPath: '/example' },
        { directory: path.resolve(__dirname, 'dist'), publicPath: '/dist' },
        { directory: path.resolve(__dirname, 'src'), publicPath: '/src' },
      ],
      port: 9000,
      open: '/example/web-console-vanilla.html',
      hot: true,
      compress: true,
      watchFiles: ['src/**/*', 'example/**/*']
    }
  };

  // 2. React wrapper
  const reactConfig = {
    ...shared,
    name: 'react',
    entry: { react: './src/components/web-console-react.tsx' },
    output: {
      filename: `[name]-bundle${hash}.js`,
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'umd',
      library: 'reactWebConsole',
      globalObject: 'this'
    },
    externals: {
      react: { commonjs: 'react', commonjs2: 'react', amd: 'react', root: 'React' },
      'react-dom': { commonjs: 'react-dom', commonjs2: 'react-dom', amd: 'react-dom', root: 'ReactDOM' }
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      })
    ]
  };

  // 3. Angular wrapper
  const angularConfig = {
    ...shared,
    name: 'angular',
    entry: { angular: ['@angular/compiler', './src/components/web-console-angular.ts'] },
    output: {
      filename: `[name]-bundle${hash}.js`,
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'umd',
      library: 'angularWebConsole',
      globalObject: 'this'
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      })
    ]
  };

  // 4. Vue wrapper
  const vueConfig = {
    ...shared,
    name: 'vue',
    entry: { vue: './src/components/web-console.vue' },
    output: {
      filename: `[name]-bundle${hash}.js`,
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'umd',
      library: 'vueWebConsole',
      globalObject: 'this'
    },
    externals: {
      vue: { commonjs: 'vue', commonjs2: 'vue', amd: 'vue', root: 'Vue' }
    },
    plugins: [
      new VueLoaderPlugin(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      })
    ]
  };

  // 5. Svelte wrapper
  const svelteConfig = {
    ...shared,
    name: 'svelte',
    entry: { svelte: './src/components/web-console.svelte' },
    output: {
      filename: `[name]-bundle${hash}.js`,
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'umd',
      library: 'svelteWebConsole',
      globalObject: 'this'
    },
    module: {
      rules: [
        ...shared.module.rules,
        {
          test: /\.svelte$/,
          use: 'svelte-loader'
        },
        {
          test: /node_modules\/svelte\/.*\.mjs$/,
          resolve: { fullySpecified: false }
        }
      ]
    },
    resolve: {
      ...shared.resolve,
      extensions: ['.svelte', ...shared.resolve.extensions],
      conditionNames: ['svelte', 'browser', 'import']
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      })
    ]
  };

  // 6. Solid.js wrapper
  const solidConfig = {
    ...shared,
    name: 'solid',
    entry: { solid: './src/components/web-console-solid.js' },
    output: {
      filename: `[name]-bundle${hash}.js`,
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'umd',
      library: 'solidWebConsole',
      globalObject: 'this'
    },
    externals: {
      'solid-js': { commonjs: 'solid-js', commonjs2: 'solid-js', amd: 'solid-js', root: 'SolidJS' }
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      })
    ]
  };

  return [vanillaConfig, reactConfig, angularConfig, vueConfig, svelteConfig, solidConfig];
};