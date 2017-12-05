var gulp = require('gulp');
var gulpTasks = require('./src/serafin/gulp-tasks/index.js');
var gulpTasksModel = require('@serafin/gulp-serafin-json-schema-to-typescript').gulpTasksModel;

gulp.task('default', ['start']);
gulp.task('dev', ['watch', 'watch-build-done', 'start']);
gulp.task('watch', ['watch-typescript', 'watch-model-petstore', 'watch-model-library', 'watch-assets']);
gulp.task('build', ['build-model-petstore', 'build-model-library', 'build-typescript', 'copy-assets']);
gulp.task('build-done', ['restart', 'test']);

var main = process.env.MAIN || 'lib/example/petstore/index.js';

gulpTasks.assets(gulp,
    [__dirname + '/src/**/*.+(xml|js|json|htm|html|css|ico|jpg|jpeg|png|gif|tiff|svg|webp|ttf|eot|otf|woff)', '!' + __dirname + '/src/tsconfig.json'],
    __dirname + '/lib');
gulpTasks.typescript(gulp, __dirname + '/src', __dirname + '/src/tsconfig.json', __dirname + '/lib', __dirname + '/lib/typings');
gulpTasks.utils(gulp, __dirname + '/lib');
gulpTasks.runner(gulp, __dirname + '/' + main, __dirname + '/lib/build.txt', __dirname + '/lib/pid', true);
gulpTasks.test(gulp, __dirname + '/lib/**/test/*.js', __dirname + '/lib/coverage');
gulpTasksModel(gulp, __dirname + '/src/example/petstore/**/*.model.json', __dirname + '/src/example/petstore/model', 'petstore', {
    modelSchemaPath: "../../../serafin/pipeline"
});
gulpTasksModel(gulp, __dirname + '/src/example/library/**/*.model.json', __dirname + '/src/example/library/model', 'library', {
    modelSchemaPath: "../../../serafin/pipeline"
});