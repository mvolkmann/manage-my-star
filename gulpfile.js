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
var nodemon = require('gulp-nodemon');
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
  var options = {
    //'box-model': false,
    //'box-sizing': false,
    ids: false,
    //important: false,
    //'overqualified-elements': false,
    //'regex-selectors': false,
    //'qualified-headings': false,
    //'unique-headings': false,
    //'universal-selector': false,
    //'unqualified-attributes': false
  };

  return gulp.src(paths.css).
    pipe(cache('csslint')).
    pipe(csslint(options)).
    pipe(csslint.reporter());
});

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

gulp.task('lint', ['csslint', 'jshint', 'jsonlint']);

// Restarts server when code changes.
gulp.task('nodemon', function () {
  nodemon({
    script: 'build/server.js',
    // TODO: Configure this to only restart server when server.js changes.
    ignore: ['']
  });
});

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

  gulp.watch([paths.css, paths.html],
    livereload.changed);
});

//gulp.task('default', ['less', 'transpile', 'nodemon', 'watch']);
gulp.task('default', ['less', 'transpile', 'watch']);
