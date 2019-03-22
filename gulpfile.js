var gulp = require('gulp');
var concat = require('gulp-concat');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gulpDebug = require('gulp-debug');
var mainNpmFiles = require('npmfiles');
var del = require('del');
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
var cleanCSS = require('gulp-clean-css');
var modifyCssUrls = require('gulp-modify-css-urls');
var sort = require('gulp-sort');
var scanner = require('i18next-scanner');
var jsonConcat = require('gulp-json-concat');
var rename = require("gulp-rename");

var debug = false;

var paths = {
  // see overrides in package.json
  scriptsConfig: mainNpmFiles().filter(f => RegExp('url-search-params/.*\\.js', 'i').test(f)),
  scripts: [
    'node_modules/jquery/dist/jquery.js',
    'node_modules/tether/dist/js/tether.js',
    'node_modules/async/lib/async.js'
  ].concat(mainNpmFiles().filter(f => 
    RegExp('.*\\.js', 'i').test(f) &&
    !RegExp('.*\\.min\\.js', 'i').test(f) &&
    !RegExp('url-search-params/.*\\.js', 'i').test(f)
  )).concat([
    'js/Browser.js',
    'js/Util.js',
    'js/Map.js',
    'js/LayersConfig.js',
    'js/router/BRouter.js',
    'js/plugin/*.js',
    'js/control/*.js',
    'js/index.js'
  ]),
  styles: mainNpmFiles().filter(f => 
    RegExp('.*\\.css', 'i').test(f) &&
    !RegExp('.*\\.min\\.css', 'i').test(f)
  ).concat('css/*.css'),
  images: mainNpmFiles().filter(f => RegExp('.*.+(png|gif|svg)', 'i').test(f)),
  fonts: mainNpmFiles().filter(f => RegExp('font-awesome/fonts/.*', 'i').test(f)),
  locales: 'locales/*.json',
  layers: 'layers/**/*.geojson',
  layersDestName: 'layers.js',
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
    .pipe(modifyCssUrls({
      modify(url, filePath) {
        var distUrl = url;
        var imageExt = ['.png', '.gif', '.svg'];

        if (imageExt.indexOf(path.extname(url)) !== -1) {
          distUrl = 'images/' + path.basename(url);
        } else if (url.indexOf('font') !== -1) {
          distUrl = 'fonts/' + path.basename(url);
        }

        return distUrl;
      }
    }))
    .pipe(concat(paths.destName + '.css'))
    .pipe(cleanCSS({
      rebase: false
    }))
    .pipe(postcss([ autoprefixer({ remove: false }) ]))
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

gulp.task('locales', ['clean'], function() {
  return gulp.src(paths.locales)
    .pipe(gulp.dest(paths.dest + '/locales'));
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
  //return gulp.src(paths.scripts)
  //return gulp.src(paths.styles)
  //return gulp.src(paths.images)
  // return gulp.src(paths.locales)
  return gulp.src(paths.scripts.concat(paths.styles).concat(paths.images).concat(paths.locales))
    .pipe(gulpDebug());

});

gulp.task('inject', function () {
  var target = gulp.src('index.html');
  var sources = gulp.src(paths.scripts.concat(paths.styles), { base: '.', read: false });

  return target.pipe(inject(sources, { relative: true }))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['clean', 'scripts_config', 'layers', 'scripts', 'styles', 'images', 'fonts', 'locales']);

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
  return(gulp.src(['./package.json'])
  .pipe(bump({version: nextVersion}))
  .pipe(gulp.dest('./')));
});

gulp.task('bump:html', ['release:init'], function() {
  return(gulp.src('./index.html')
  .pipe(replace(/<sup class="version">(.*)<\/sup>/, '<sup class="version">'+nextVersion+'</sup>'))
  .pipe(gulp.dest('.')));
});

gulp.task('release:commit', ['bump'], function() {
  gulp.src(['./index.html', './package.json'])
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

gulp.task('i18next', function() {
  return gulp.src(['index.html', 'locales/keys.js', 'js/**/*.js'])
    .pipe(sort())
    .pipe(scanner({
        lngs: ['en'], // we only generate English version, other languages are handled by transifex via yarn transifex-pull/push
        removeUnusedKeys: true,
        sort: true,
        resource: {
            // the source path is relative to current working directory
            loadPath: 'locales/{{lng}}.json',
            
            // the destination path is relative to your `gulp.dest()` path
            savePath: 'locales/{{lng}}.json'
        }
    }))
    .pipe(gulp.dest('.'));
})

// Bundles layer files. To download and extract run "yarn layers"
gulp.task('layers', function () {
  return gulp.src(paths.layers)
    // Workaround to get file extension removed from the dictionary key 
    .pipe(rename({ extname: ".json" }))
    .pipe(jsonConcat(paths.layersDestName, function(data){
      return Buffer.from('BR.layerIndex = ' + JSON.stringify(data, null, 2) + ';');
    }))
    .pipe(gulp.dest(paths.dest));
});
