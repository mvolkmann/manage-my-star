'use strict';

var cache = require('gulp-cached');
var changed = require('gulp-changed');
var csslint = require('gulp-csslint');
var del = require('del');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jsonlint = require('gulp-json-lint');
var less = require('gulp-less');
var livereload = require('gulp-livereload');
var plumber = require('gulp-plumber');
var sourceMaps = require('gulp-sourcemaps');
var traceur = require('gulp-traceur');
var watch = require('gulp-watch');

var contentDir = 'content/common';
var indexHtml = contentDir + '/index.html';

var paths = {
  css: 'build/*.css',
  html: ['index.html', 'src/*.html'],
  js: ['gulpfile.js', 'src/*.js'],
  jsNext: ['src/*.js'],
  json: ['*.json'],
  less: 'src/*.less'
};

gulp.task('clean', function (done) {
  del(['build'], done);
});

gulp.task('csslint', function () {
  return gulp.src(paths.css).
    pipe(cache('csslint')).
    pipe(csslint({
      'box-model': false,
      'box-sizing': false,
      ids: false,
      important: false,
      'overqualified-elements': false,
      'regex-selectors': false,
      'qualified-headings': false,
      'unique-headings': false,
      'universal-selector': false,
      'unqualified-attributes': false
    })).
    pipe(csslint.reporter());
});

gulp.task('default', ['watch']);

gulp.task('js', ['jshint'], function (done) {
  //TODO: Don't call this if jshint found any issues.
  livereload.changed();
  done();
});

gulp.task('jshint', function () {
  // This is using .jshintrc in the gm-earnpower-client directory.
  return gulp.src(paths.js).
    pipe(cache('jshint')).
    pipe(jshint()).
    pipe(jshint.reporter('default')).
    pipe(jshint.reporter('fail')); // stop processing if errors
});

gulp.task('jsonlint', function () {
  return gulp.src(paths.json).
    pipe(cache('jsonlint')).
    pipe(jsonlint()).
    pipe(jsonlint.report('verbose'));
});

gulp.task('less', function () {
  return gulp.src(paths.less).
    pipe(plumber()).
    pipe(changed('src', {extension: '.css'})).
    pipe(less()).
    pipe(gulp.dest('build'));
});

//gulp.task('lint', ['csslint', 'jshint', 'eslint', 'jsonlint']);
gulp.task('lint', ['csslint', 'jshint', 'jsonlint']);

gulp.task('transpile', ['jshint'], function () {
  return gulp.src(paths.jsNext).
    pipe(plumber()).
    pipe(changed('build', {extension: '.js'})).
    pipe(sourceMaps.init()).
    pipe(traceur({experimental: true})).
    pipe(sourceMaps.write('.')).
    pipe(gulp.dest('build'));
});

gulp.task('watch', function () {
  livereload.listen();

  // gulp.watch only processes files that match its glob patterns
  // when it starts and processes all of them when any file changes.
  // The watch plugin fixes both of these issues.
  gulp.watch(paths.css, ['csslint']);
  gulp.watch(paths.js, ['js']);
  //gulp.watch(paths.js, ['jshint'], livereload.changed);
  gulp.watch(paths.jsNext, ['transpile']);
  gulp.watch(paths.json, ['jsonlint']);
  gulp.watch(paths.less, ['less']);

  gulp.watch([paths.css, paths.html, paths.json],
    livereload.changed);
});
