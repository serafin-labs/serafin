// General dependencies
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var _ = require('lodash');
var Promise = require('bluebird');

// Gulp dependencies
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var merge = require('merge-stream');

// Tasks variables
var sourceDirectory = __dirname + '/src';
var outputDirectory = __dirname + '/lib';
var outputTypingsDirectory = __dirname + '/lib/typings'
var buildFile = outputDirectory + '/build.txt'

// General tasks
gulp.task('default', ['dev']);
gulp.task('dev', ['build', 'watch-typescript', 'watch-assets', 'watch-build-done']);
gulp.task('build', ['build-typescript', 'copy-assets']);
gulp.task('restart', function (cb) {
    exec('forever restart -c "node --debug" --minUptime 1000 --spinSleepTime 1000 lib/index.js', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

/**
 * Write the build file with the current date in it
 */
function buildDone() {
    try {
        fs.writeFileSync(buildFile, new Date());
    } catch (e) {
        console.error('Build file not created');
    }
}

/**
 * Delete all files in the output directory
 * /!\ Use with caution
 */
gulp.task('clean', function (callback) {
    del([
        outputDirectory + '/*'
    ], callback);
});
/**
 * Watch any assets that need to be copied over to the output directory.
 */
gulp.task('watch-assets', function () {
    // Polling is used to work properly with containers
    plugins.watch([sourceDirectory + '/**/*.+(xml|js|json|htm|html|css|ico|jpg|jpeg|png|gif|tiff|svg|webp|ttf|eot|otf|woff)'], { interval: 1000, usePolling: true },
        // Use batch to avoid many saved files to trigger multiple copies
        plugins.batch(function (events, done) {
            gulp.start('copy-assets', done);
            done();
        }));
});

/**
 * Detect that the build has ended (when the build file is modified).
 */
gulp.task('watch-build-done', function () {
    plugins.watch(buildFile, { interval: 1000, usePolling: true },
        plugins.batch({ timeout: 500 }, function (events, done) {
            gulp.start('restart', done);
            done();
        }));
});

/**
 * Watch typescript sources and trigger compilation.
 */
gulp.task('watch-typescript', function () {
    plugins.watch([sourceDirectory + '/**/*.ts'], { interval: 1000, usePolling: true },
        plugins.batch(function (events, done) {
            gulp.start('build-typescript', done);
            done();
        }));
});

/**
 * Copy all assets to the output directory.
 * This task keeps the directory structure.
 */
gulp.task('copy-assets', function () {
    return gulp.src([sourceDirectory + '/**/*.json', sourceDirectory + '/**/*.xml', sourceDirectory + '/**/*.html', sourceDirectory + '/**/*.css', sourceDirectory + '/**/*.ico'])
        .pipe(gulp.dest(outputDirectory))
        .on('end', () => buildDone());
});

/**
 * Shared reference to the typescript project configuration.
 * It improves performances.
 */
var tsProject;

/**
 * Build typescript sources & generate typings.
 */
gulp.task('build-typescript', function () {
    // Create the typescript project if it is not initialized yet
    tsProject = tsProject || plugins.typescript.createProject(sourceDirectory + '/tsconfig.json', { outDir: sourceDirectory });
    // Create a stream to compile all typescript sources
    var tsStream = gulp.src([sourceDirectory + '/**/*.ts', sourceDirectory + '/**/*.tsx'])
        .pipe(plugins.sourcemaps.init())
        .pipe(tsProject());
    // Write js files and remap sourcemap path
    var jsStream = tsStream.js
        .pipe(plugins.sourcemaps.write(".", {
            includeContent: false,
            sourceRoot: path.relative(outputDirectory, sourceDirectory).replace(/\\/g, "/")
        }))
        .pipe(gulp.dest(outputDirectory));
    // Write typings files
    var dtsStream = tsStream.dts.pipe(gulp.dest(outputTypingsDirectory));
    // Combine streams so we can wait completion of both
    jsStream = merge(jsStream, dtsStream);
    jsStream.on('end', () => buildDone());
    return jsStream;
});