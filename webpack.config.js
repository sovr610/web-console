const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: {
    react: './src/components/web-console-react.tsx',
    angular: ['@angular/compiler', './src/components/web-console-angular.ts'],
    vue: './src/components/web-console.vue'
  },
  output: {
    filename: '[name]-bundle.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
    library: '[name]WebConsole',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.vue$/,
        use: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.vue'],
  },
  externals: {
    'vue': 'Vue'
  },
  plugins: [
    new VueLoaderPlugin(),
    new webpack.ProvidePlugin({
      React: 'react',
      ReactDOM: 'react-dom'
    })
  ]
};