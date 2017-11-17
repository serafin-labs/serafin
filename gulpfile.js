// TODO: 
// - include the tests and code coverage generation

var gulpTasks = require('./src/serafin/gulp-tasks/index.js');

// Gulp dependencies
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var jsonSchemaToTypescript = require('@serafin/gulp-serafin-json-schema-to-typescript');
var del = require('del');
var merge = require('merge-stream');

// General tasks
gulp.task('default', ['start']);
gulp.task('dev', ['watch', 'watch-build-done', 'start']);
gulp.task('watch', ['watch-typescript', 'watch-model-example', 'watch-assets']);
gulp.task('build', ['build-typescript', 'copy-assets']);

gulpTasks.assets(gulp,
    [__dirname + '/src/**/*.+(xml|js|json|htm|html|css|ico|jpg|jpeg|png|gif|tiff|svg|webp|ttf|eot|otf|woff)', '!' + __dirname + '/src/tsconfig.json'],
    __dirname + '/lib');
gulpTasks.typescript(gulp, __dirname + '/src', __dirname + '/src/tsconfig.json', __dirname + '/lib', __dirname + '/lib/typings');
gulpTasks.model(gulp, __dirname + '/src/example/**/*.model.json', __dirname + '/src/example/model', 'example');
gulpTasks.utils(gulp, __dirname + '/lib');
gulpTasks.runner(gulp, __dirname + '/lib/example/index.js', __dirname + '/lib/build.txt', __dirname + '/lib/pid', true);
gulpTasks.test(gulp, __dirname + '/lib/**/test/*.js', __dirname + '/lib/coverage');