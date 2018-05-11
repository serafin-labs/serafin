const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const WebpackShellPlugin = require('webpack-shell-plugin');

// Webpack dev server doesn't support multiconfiguration. We need to detect it to use only the webapp configuration.
const isWebpackDevServer = process.env.MODE === "wds"

module.exports = function (env, argv) {
    const isProduction = !(argv.mode === "development")
    console.log(`Building mode:${argv.mode || "production"}`);

    var configurations = [{
        entry: {
            index: "./src/index.ts",
            test: "./src/test/tests.ts",
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx']
        },
        target: "node",
        externals: [nodeExternals()],
        devtool: 'nosources-source-map',
        watchOptions: {
            poll: 1000,
            ignored: /node_modules|lib/
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'awesome-typescript-loader',
                    exclude: /node_modules|lib/
                },
            ]
        },
        optimization: {
            minimize: false
        },
        output: {
            filename: '[name].js',
            libraryTarget: 'commonjs',
            devtoolModuleFilenameTemplate: info => info.resourcePath.startsWith('./src') ? `.${info.resourcePath}` : info.absoluteResourcePath,
            path: path.resolve(__dirname, 'lib')
        },
        plugins: [
            ...(!isProduction ? [new WebpackShellPlugin({ onBuildExit: ['npm test'] })] : []),
            ...(isProduction ? [new CleanWebpackPlugin(["lib"])] : []),
        ]
    }];

    return isWebpackDevServer ? configurations[0] : configurations
}