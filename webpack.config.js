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
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg|typeface\.json)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name(resourcePath, resourceQuery) {
                // `resourcePath` - `/absolute/path/to/file.js`
                // `resourceQuery` - `?foo=bar`

                if (process.env.NODE_ENV === 'development') {
                  return '[path][name].[ext]';
                }

                return '[contenthash].[ext]';
              },
              modules: true
            }
          }
        ],
        type: 'javascript/auto', // This line is important to load JSON files
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
