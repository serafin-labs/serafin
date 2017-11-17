var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');

// Gulp dependencies
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var jsonSchemaToTypescript = require('@serafin/gulp-serafin-json-schema-to-typescript');
var del = require('del');
var merge = require('merge-stream');

module.exports = {
    /**
     * @param gulp Gulp object
     * @param sourcePath Path(s) of the files containing JSON-Schema models 
     * @param modelDirectory Model file directory
     * @param taskSuffix Optional task suffix allow to create multiple tasks for differents model files, in case of sub-projects
     */
    model(gulp, sourcePath, modelDirectory, taskSuffix = null) {
        if (typeof taskSuffix == 'string') {
            taskSuffix = '-' + taskSuffix;
        } else {
            taskSuffix = '';
        }

        gulp.task('watch-model' + taskSuffix, function () {
            return gulp.watch(adaptPath(sourcePath), { usePolling: true, awaitWriteFinish: true, alwaysStat: true },
                function () {
                    return gulp.start('build-model' + taskSuffix);
                });
        });

        gulp.task('build-model' + taskSuffix, function () {
            return gulp.src(adaptPath(sourcePath))
                .pipe(jsonSchemaToTypescript(modelDirectory + "/model.ts"))
                .pipe(gulp.dest(modelPath))
        });
    },

    /**
     * @param gulp Gulp object
     * @param sourceDirectory Directory containing typescript sources
     * @param tsConfigFile Typescript configuration file
     * @param outputDirectory Directory where the project is built
     * @param outputTypingsDirectory Directory where the typings are built
     */
    typescript(gulp, sourceDirectory, tsConfigFile, outputDirectory, outputTypingsDirectory) {
        // Shared reference to the typescript project configuration.
        // It improves performances.
        var tsProject;

        // Watch typescript sources and trigger compilation.
        gulp.task('watch-typescript', function () {
            return gulp.watch(sourceDirectory + '/**/*.ts', { usePolling: true, awaitWriteFinish: true, alwaysStat: true },
                function () {
                    return gulp.start('build-typescript');
                });
        });

        gulp.task('build-typescript', function () {
            // Create the typescript project if it is not initialized yet
            tsProject = tsProject || plugins.typescript.createProject(tsConfigFile, { outDir: sourceDirectory });
            // Create a stream to compile all typescript sources
            var tsStream = gulp.src(sourceDirectory + '/**/*.ts')
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
    },

    /**
     * @param gulp Gulp object
     * @param assetsPath Path(s) of the assets to be copied
     * @param outputDirectory Directory where the assets are copied
     */
    assets(gulp, assetsPath, outputDirectory) {
        // Watch any assets that need to be copied over to the output directory.
        gulp.task('watch-assets', function () {
            // Polling is used to work properly with mounted file systems (VM shares, container volumes...)
            return plugins.watch(adaptPath(assetsPath), { usePolling: true, awaitWriteFinish: true, alwaysStat: true },
                function () {
                    return gulp.start('copy-assets');
                });
        });

        // Copy all assets to the output directory.
        // This task keeps the directory structure.
        gulp.task('copy-assets', function () {
            return gulp.src(assetsPath)
                .pipe(gulp.dest(outputDirectory))
                .on('end', () => buildDone());
        });
    },

    /**
     * @param gulp Gulp object
     * @param outputDirectory Build directory
     */
    utils(gulp, outputDirectory) {
        /**
         * Delete all files in the output directory
         */
        gulp.task('clean', function (callback) {
            del([
                outputDirectory + '/*'
            ], callback);
        });
    },

    /**
     * @param gulp Gulp object
     * @param command Command to run the application
     * @param buildFile Path of the build file
     */
    runner(gulp, command, buildFile, pidFile, debug) {
        var process = null;
        gulp.task('build-done', function () {
            try {
                fs.writeFileSync(buildFile, new Date());
            } catch (e) {
                console.error('Build file not created: ' + e);
            }
        });

        gulp.task('watch-build-done', function () {
            return plugins.watch(buildFile, { usePolling: true, awaitWriteFinish: true, alwaysStat: true },
                function () {
                    gulp.start('restart');
                    if (gulp.hasTask('test')) {
                        gulp.start('test');
                    }
                });
        });

        gulp.task('start', function () {
            options = [];
            if (!!debug) {
                options.push('--inspect');
            }
            options.push(command);

            process = spawn('node', options, { detached: true });
            fs.writeFileSync(pidFile, process.pid);

            process.stdout.on('data', function (data) {
                console.log(data.toString());
            });
            process.stderr.on('data', function (data) {
                console.error(data.toString());
            });
            process.on('exit', function (data) {
                console.log('*** Process exited ***');
                process = null;
            });
        });

        gulp.task('restart', function () {
            if (!process) {
                fs.access(pidFile, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                    if (err) {
                        console.error('No application running or PID error');
                    } else {
                        var pid = fs.readFileSync(pidFile);
                        process = spawn('kill', [pid]);
                        process.stdout.on('close', function (data) {
                            return gulp.start('start');
                        });
                    }
                });
            } else if (process) {
                if (process.exitCode != null) {
                    gulp.start('start');
                } else {
                    process.kill();
                    process.on('close', function () {
                        process = null;
                        return gulp.start('start');
                    });
                }
            }
        });
    },

    test(gulp, jsTestsPath, coverageReportsDirectory) {
        gulp.task('test', function () {
            function writeProcessOutput(process) {
                process['stdout'].on('data', function (data) {
                    console.log(data.toString());
                });
                process['stderr'].on('data', function (data) {
                    console.error(data.toString());
                });

                return process;
            }

            istanbul = writeProcessOutput(spawn('istanbul', ['cover', '--dir', coverageReportsDirectory, '_mocha', '--', '-R', 'spec', jsTestsPath]));
            istanbul.on('close', function (data) {
                writeProcessOutput(spawn('remap-istanbul', ['-i', coverageReportsDirectory + '/coverage.json', '-t', 'lcovonly', '-o', coverageReportsDirectory + '/lcov.info']));
                writeProcessOutput(spawn('remap-istanbul', ['-i', coverageReportsDirectory + '/coverage.json', '-t', 'html', '-o', coverageReportsDirectory + '/lcov-report']));
            });
        });
    }
};

function buildDone() {
    if (gulp.hasTask('build-done')) {
        gulp.start('build-done');
    }
}

function adaptPath(path) {
    if (typeof path == 'String') {
        path = [path];
    }

    if (!typeof path == 'Array') {
        throw Error("Source directory: Array or String expected");
    }

    return path;
}