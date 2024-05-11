const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    renderer: './src/renderer.ts',
    preload: './preload.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  target: 'electron-renderer',
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.js', '.ts'], // Add TypeScript extension
    modules: [
      path.resolve(__dirname, 'node_modules')
    ],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'ts-loader'
        }
      }
    ]
  },
  devtool: 'source-map',
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  }
};
