var gulp = require('gulp');
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');
var minifyCss = require('gulp-minify-css');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gulpDebug = require('gulp-debug');
var mainBowerFiles = require('main-bower-files');
var del = require('del');
var tap = require('gulp-tap');
var path = require('path');
var cached = require('gulp-cached');
var remember = require('gulp-remember');
var inject = require('gulp-inject');
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var zip = require('gulp-zip');
var bump = require('gulp-bump');
var semver = require('semver');
var git = require('gulp-git');
var replace = require('gulp-replace');
var release = require('gulp-github-release');

var debug = false;

var paths = {
  // see overrides in bower.json
  scriptsConfig: mainBowerFiles('**/url-search-params/**/*.js'),
  scripts: mainBowerFiles([
    '**/*.js',
    '!**/*.min.js',
    '!**/url-search-params/**/*.js'
  ]).concat([
    'js/Browser.js',
    'js/Util.js',
    'js/Map.js',
    'js/router/BRouter.js',
    'js/plugin/*.js',
    'js/control/*.js',
    'js/index.js'
  ]),
  styles: mainBowerFiles('**/*.css').concat('css/*.css'),
  images: mainBowerFiles('**/*.+(png|gif|svg)'),
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
  if (debug)
    gutil.log( gutil.colors.yellow('Running in Debug mode') );
  else
    gutil.log( gutil.colors.green('Running in Release mode') );

  return gulp.src(paths.scripts, { base: '.' })
    .pipe(sourcemaps.init())
      .pipe(cached('scripts'))
      .pipe(gulpif(!debug, uglify()))
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
    .pipe(postcss([ autoprefixer({ remove: false }) ]))
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
  debug = true;
  var watcher = gulp.watch(paths.scripts, ['scripts']);
  watcher.on('change', function (event) {
    if (event.type === 'deleted') {
      delete cached.caches.scripts[event.path];
      remember.forget('scripts', event.path);
    }
  });
  gulp.watch(paths.styles, ['styles']);
});

// Print paths to console, for manually debugging the gulp build
// (comment out corresponding line of paths to print)
gulp.task('log', function() {
  //return gulp.src(mainBowerFiles(['**/*.js', '!**/*.min.js']))
  //return gulp.src(mainBowerFiles('**/*.css'))
  return gulp.src(paths.scripts)
  //return gulp.src(paths.styles)
  //return gulp.src(paths.images)
    .pipe(gulpDebug());

  //return gulp.src(mainBowerFiles({debugging: true}));
});

gulp.task('inject', function () {
  var target = gulp.src('index.html');
  var sources = gulp.src(paths.scripts.concat(paths.styles), { base: '.', read: false });

  return target.pipe(inject(sources, { relative: true }))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['clean', 'scripts_config', 'scripts', 'styles', 'images', 'fonts']);

gulp.task('debug', function() {
  debug = true;
  gulp.start('default');
});

var pkg = require('./package.json');
var tags = {patch: 'patch', minor: 'minor', major: 'major'};
var nextVersion;
var ghToken;

gulp.task('release:init', function() {
  var tag = gutil.env.tag;
  if (!tag) {
    gutil.log(gutil.colors.red('--tag is required'));
    process.exit(1);
  }
  if (['major', 'minor', 'patch'].indexOf(tag) < 0) {
    gutil.log(gutil.colors.red('--tag must be major, minor or patch'));
    process.exit(2);
  }
  ghToken = gutil.env.token;
  if (!ghToken) {
    gutil.log(gutil.colors.red('--token is required (github personnal access token)'));
    process.exit(3);
  }
  if (ghToken.length != 40) {
    gutil.log(gutil.colors.red('--token length must be 40'));
    process.exit(4);
  }
  git.status({args: '--porcelain', quiet: true}, function(err, stdout) {
    if (err) throw err;
    if (stdout.length > 0) {
      gutil.log(gutil.colors.red('Repository is not clean. Please commit or stash your pending modification'));
      process.exit(5);
    }
  });
  nextVersion = semver.inc(pkg.version, tag);
  return;
});

gulp.task('bump', ['bump:json', 'bump:html']);

gulp.task('bump:json', ['release:init'], function() {
  gutil.log(gutil.colors.green('Bump to '+nextVersion));
  return(gulp.src(['./package.json', './bower.json'])
  .pipe(bump({version: nextVersion}))
  .pipe(gulp.dest('./')));
});

gulp.task('bump:html', ['release:init'], function() {
  return(gulp.src('./index.html')
  .pipe(replace(/<sup class="version">(.*)<\/sup>/, '<sup class="version">'+nextVersion+'</sup>'))
  .pipe(gulp.dest('.')));
});

gulp.task('release:commit', ['bump'], function() {
  gulp.src(['./index.html', './package.json', './bower.json'])
  .pipe(git.commit('release: '+nextVersion));
});

gulp.task('release:tag', ['release:commit'], function() {
  return(git.tag(nextVersion, '', function(err) {
    if (err) throw err;
  }));
});

gulp.task('release:push', ['release:tag'], function() {
  git.push('origin', 'master', {args: '--tags'}, function(err) {
    if (err) throw err;
  });
});

gulp.task('release:zip', ['release:tag', 'default'], function() {
  gutil.log(gutil.colors.green('Build brouter-web.'+nextVersion+'.zip'));
  return(gulp.src(['dist/**', 'index.html', 'config.template.js', 'keys.template.js'], {'base': '.'})
  .pipe(zip('brouter-web.'+nextVersion+'.zip'))
  .pipe(gulp.dest('.')));
});

gulp.task('release:publish', ['release:zip'], function() {
  gulp.src('./brouter-web.'+nextVersion+'.zip')
  .pipe(release({
    tag: nextVersion,
    token: ghToken,
    manifest: pkg,
  }))
});

gulp.task('release', ['release:init', 'bump', 'release:commit', 'release:tag',
                      'release:push', 'release:zip', 'release:publish']);