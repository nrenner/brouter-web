var gulp = require('gulp');
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');
var minifyCss = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var debug = require('gulp-debug');
var mainBowerFiles = require('main-bower-files');
var del = require('del');
var tap = require('gulp-tap');
var path = require('path');
var cached = require('gulp-cached');
var remember = require('gulp-remember');
var inject = require('gulp-inject');

var paths = {
  // see overrides in bower.json
  scriptsConfig: mainBowerFiles('**/url-search-params/**/*.js'),
  scripts: mainBowerFiles([
    '**/*.js', 
    '!**/*.min.js',
    '!**/url-search-params/**/*.js'
  ]).concat([
    'js/Util.js',
    'js/Map.js',
    'js/router/BRouter.js',
    'js/plugin/*.js',
    'js/control/*.js',
    'js/index.js'
  ]),
  styles: mainBowerFiles('**/*.css').concat('css/*.css'),
  images: mainBowerFiles('**/*.+(png|gif)'),
  fonts: mainBowerFiles('**/font-awesome/fonts/*'),
  dest: 'dist',
  destName: 'brouter-web'
};

// libs that require loading before config.js
gulp.task('scripts_config', ['clean'], function() {
  // just copy for now
  return gulp.src(paths.scriptsConfig)
    .pipe(gulp.dest(paths.dest));
});

gulp.task('scripts', function() {
  return gulp.src(paths.scripts, { base: '.' })
    .pipe(sourcemaps.init())
      .pipe(cached('scripts')) 
      .pipe(uglify())
      .pipe(remember('scripts'))
      .pipe(concat(paths.destName + '.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.dest));
});

// separate, fallback task for debugging (switch manually in index.html)
gulp.task('concat', function() {
  return gulp.src(paths.scripts)
    .pipe(concat(paths.destName + '.src.js'))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('styles', function() {
  return gulp.src(paths.styles)
    // hack for rewriting relative URLs to images/fonts in gulp-concat-css
    // when src in css subfolder (remove '../')
    // see also (?) https://github.com/mariocasciaro/gulp-concat-css/pull/10
    .pipe(tap(function (file) {
      if (path.basename(file.base) === 'css') {
        file.path = 'css/' + file.relative;
        file.base = './css';
      } else {
        file.path = file.relative;
        file.base = '.';
      }
    }))
    .pipe(concatCss(paths.destName + '.css'))
    .pipe(minifyCss({
      rebase: false
    }))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('images', ['clean'], function() {
  return gulp.src(paths.images)
    .pipe(gulp.dest(paths.dest + '/images'));
});

gulp.task('fonts', ['clean'], function() {
  return gulp.src(paths.fonts)
    .pipe(gulp.dest(paths.dest + '/fonts'));
});

gulp.task('clean', function(cb) {
  del(paths.dest + '/**/*' , cb);
}); 

gulp.task('watch', function() {
  var watcher = gulp.watch(paths.scripts, ['scripts']);
  watcher.on('change', function (event) {
    if (event.type === 'deleted') {
      delete cached.caches.scripts[event.path];
      remember.forget('scripts', event.path);
    }
  });  
});

gulp.task('debug', function() {
  //return gulp.src(mainBowerFiles(['**/*.js', '!**/*.min.js']))
  //return gulp.src(mainBowerFiles('**/*.css'))
  return gulp.src(paths.scripts)
  //return gulp.src(paths.styles)
  //return gulp.src(paths.images)
    .pipe(debug());

  //return gulp.src(mainBowerFiles({debugging: true}));
});

gulp.task('inject', function () {
  var target = gulp.src('index.html');
  var sources =  gulp.src(paths.scripts, { base: '.', read: false });

  return target.pipe(inject(sources, { relative: true }))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['clean', 'scripts_config', 'scripts', 'styles', 'images', 'fonts']);
