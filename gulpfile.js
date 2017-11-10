// TODO: 
// - call forever programmatically
// - include the tests and code coverage generation
// - isolate the 'generic' gulp tasks in a dedicated component (as before)

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
var jsonSchemaToTypescript = require('@serafin/gulp-serafin-json-schema-to-typescript');
var del = require('del');
var merge = require('merge-stream');

// Tasks variables
var sourceDirectory = __dirname + '/src';
var outputDirectory = __dirname + '/lib';
var outputTypingsDirectory = __dirname + '/lib/typings'
var buildFile = outputDirectory + '/build.txt'

var assetsFormat = '*.+(xml|js|json|htm|html|css|ico|jpg|jpeg|png|gif|tiff|svg|webp|ttf|eot|otf|woff)';

// General tasks
gulp.task('default', ['run']);
gulp.task('dev', ['watch', 'watch-build-done', 'run-dev']);
gulp.task('watch', ['watch-typescript', 'watch-assets']);
gulp.task('build', ['build-typescript', 'copy-assets']);
gulp.task('run', function () { run('--minUptime 1000 --spinSleepTime 1000'); });
gulp.task('run-dev', function () { run('--minUptime 1000 --spinSleepTime 1000 -m 1'); });

/**
 * Run the main task with forever
 * 
 * @param options forever options
 */
function run(options) {
    var process = exec(`forever -c "node --debug" ${options} lib/index.js`);
    process.stdout.on('data', function (data) {
        console.log(data);
    });
    process.stderr.on('data', function (data) {
        console.error(data);
    });
}

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
 * Restart the forever service
 */
function restart() {
    return exec('forever restartall', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
    });
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

gulp.task('watch-build-done', function () {
    return plugins.watch(buildFile, { usePolling: true, awaitWriteFinish: true, alwaysStat: true }, function () {
        restart();
    });
});

/**
 * Watch any assets that need to be copied over to the output directory.
 */
gulp.task('watch-assets', function () {
    // Polling is used to work properly with containers
    return plugins.watch([sourceDirectory + '/**///' + assetsFormat], { usePolling: true, awaitWriteFinish: true, alwaysStat: true },
        // Use batch to avoid many saved files to trigger multiple copies
        function () {
            return gulp.start('copy-assets');
        });
});

/**
 * Watch typescript sources and trigger compilation.
 */
gulp.task('watch-typescript', function () {
    return plugins.watch([sourceDirectory + '/**/*.ts'], { usePolling: true, awaitWriteFinish: true, alwaysStat: true },
        function () {
            return gulp.start('build-typescript');
        });


});

/**
 * Copy all assets to the output directory.
 * This task keeps the directory structure.
 */
gulp.task('copy-assets', function () {
    return gulp.src([sourceDirectory + '/**/' + assetsFormat])
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

/**
 * Build json schemas. For testing.
 */
gulp.task('build-json-schema', function () {
    return gulp.src(sourceDirectory + '/model/**/*.json')
        .pipe(jsonSchemaToTypescript("model.ts"))
        .pipe(gulp.dest(sourceDirectory + '/model/'))
});