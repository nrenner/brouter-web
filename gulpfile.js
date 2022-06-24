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
var rename = require('gulp-rename');
var browserSync = require('browser-sync');
var merge = require('merge-stream');
var babel = require('gulp-babel');
var { marked } = require('marked');
var fs = require('fs');

const server = browserSync.create();

var debug = false;

var paths = {
    // see overrides in package.json
    scriptsConfig: mainNpmFiles()
        .filter(
            (f) =>
                // index.html
                RegExp('url-search-params/.*\\.js', 'i').test(f) ||
                RegExp('core-js-bundle/.*\\.js', 'i').test(f) ||
                RegExp('regenerator-runtime/.*\\.js', 'i').test(f) ||
                // dynamic import in MaplibreGlLazyLoader
                RegExp('maplibre-gl/.*\\.js', 'i').test(f) ||
                RegExp('@maplibre/maplibre-gl-leaflet/.*\\.js', 'i').test(f)
        )
        .concat([
            // large lib as extra file for faster parallel loading (*.min.js already excluded from bundle)
            'node_modules/@turf/turf/turf.min.js',
        ]),
    scripts: [
        'node_modules/jquery/dist/jquery.js',
        'node_modules/async/dist/async.js',
        'node_modules/leaflet/dist/leaflet-src.js',
    ]
        .concat(
            mainNpmFiles().filter(
                (f) =>
                    RegExp('.*\\.js', 'i').test(f) &&
                    !RegExp('.*\\.min\\.js', 'i').test(f) &&
                    !RegExp('url-search-params/.*\\.js', 'i').test(f) &&
                    !RegExp('core-js-bundle/.*\\.js', 'i').test(f) &&
                    !RegExp('regenerator-runtime/.*\\.js', 'i').test(f) &&
                    !RegExp('maplibre-gl/.*\\.js', 'i').test(f) &&
                    !RegExp('@maplibre/maplibre-gl-leaflet/.*\\.js', 'i').test(f)
            )
        )
        .concat([
            'js/Browser.js',
            'js/WhatsNew.js',
            'js/Util.js',
            'js/Map.js',
            'js/LayersConfig.js',
            'js/router/BRouter.js',
            'js/util/*.js',
            'js/format/*.js',
            'js/plugin/*.js',
            'js/control/*.js',
            'js/index.js',
        ]),
    styles: mainNpmFiles()
        .filter((f) => RegExp('.*\\.css', 'i').test(f) && !RegExp('.*\\.min\\.css', 'i').test(f))
        .concat('css/*.css'),
    images: mainNpmFiles().filter((f) => RegExp('.*.+(png|gif|svg)', 'i').test(f)),
    fonts: mainNpmFiles().filter((f) => RegExp('font-awesome/fonts/.*', 'i').test(f)),
    changelog: 'CHANGELOG.md',
    locales: 'locales/*.json',
    layers: ['layers/**/*.geojson', 'layers/**/*.json'],
    layersDestName: 'layers.js',
    layersConfig: [
        'layers/config/config.js',
        'layers/config/tree.js',
        'layers/config/overrides.js',
        'layers/config/geometry.js',
    ],
    layersConfigDestName: 'layersConf.js',
    boundaries: ['resources/boundaries/*.geojson', 'resources/boundaries/*.topo.json'],
    zip: ['dist/**', 'index.html', 'config.template.js', 'keys.template.js'],
    dest: 'dist',
    destName: 'brouter-web',
};

gulp.task('clean', function () {
    return del(paths.dest + '/**/*');
});

// libs that require loading before config.js
gulp.task('scripts_config', function () {
    // just copy for now
    return gulp
        .src(paths.scriptsConfig)
        .pipe(
            rename(function (path) {
                if (path.basename === 'minified') {
                    path.basename = 'core-js-bundle.min';
                } else if (path.basename === 'runtime') {
                    path.basename = 'regenerator-runtime';
                }
            })
        )
        .pipe(replace('//# sourceMappingURL=minified.js.map', ''))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('scripts', function () {
    if (debug) gutil.log(gutil.colors.yellow('Running in Debug mode'));
    else gutil.log(gutil.colors.green('Running in Release mode'));

    return gulp
        .src(paths.scripts, { base: '.' })
        .pipe(sourcemaps.init())
        .pipe(cached('scripts'))
        .pipe(gulpif(!debug, babel()))
        .pipe(gulpif(!debug, uglify()))
        .pipe(remember('scripts'))
        .pipe(concat(paths.destName + '.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.dest));
});

// separate, fallback task for debugging (switch manually in index.html)
gulp.task('concat', function () {
    return gulp
        .src(paths.scripts)
        .pipe(concat(paths.destName + '.src.js'))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('styles', function () {
    return gulp
        .src(paths.styles)
        .pipe(
            modifyCssUrls({
                modify(url, filePath) {
                    var distUrl = url;
                    var imageExt = ['.png', '.gif', '.svg'];

                    if (imageExt.indexOf(path.extname(url)) !== -1) {
                        distUrl = 'images/' + path.basename(url);
                    } else if (url.indexOf('font') !== -1) {
                        distUrl = 'fonts/' + path.basename(url);
                    }

                    return distUrl;
                },
            })
        )
        .pipe(concat(paths.destName + '.css'))
        .pipe(
            cleanCSS({
                rebase: false,
            })
        )
        .pipe(postcss([autoprefixer({ remove: false })]))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('images', function () {
    return gulp.src(paths.images).pipe(gulp.dest(paths.dest + '/images'));
});

gulp.task('fonts', function () {
    return gulp.src(paths.fonts).pipe(gulp.dest(paths.dest + '/fonts'));
});

gulp.task('locales', function () {
    return gulp.src(paths.locales).pipe(gulp.dest(paths.dest + '/locales'));
});

gulp.task('boundaries', function () {
    return gulp.src(paths.boundaries).pipe(gulp.dest(paths.dest + '/boundaries'));
});

gulp.task('changelog', function (cb) {
    var content = 'BR.changelog = `' + marked(fs.readFileSync(paths.changelog, 'utf-8')) + '`';
    content = content.replace(/<h1.*<\/h1>/i, '');
    fs.writeFile(paths.dest + '/changelog.js', content, cb);
});

gulp.task('reload', function (done) {
    server.reload();
    done();
});

gulp.task('watch', function () {
    debug = true;
    var watcher = gulp.watch(paths.scripts, gulp.series('scripts', 'reload'));
    watcher.on('change', function (event) {
        if (event.type === 'deleted') {
            delete cached.caches.scripts[event.path];
            remember.forget('scripts', event.path);
        }
    });
    gulp.watch(paths.changelog, gulp.series('changelog', 'reload'));
    gulp.watch(paths.locales, gulp.series('locales', 'reload'));
    gulp.watch(paths.styles, gulp.series('styles', 'reload'));
    gulp.watch(paths.layers, gulp.series('layers', 'reload'));
    gulp.watch(paths.layersConfig, gulp.series('layers_config', 'reload'));
    gulp.watch(['./index.html'].concat(paths.images).concat(paths.fonts).concat(paths.locales), gulp.series('reload'));
});

// Print paths to console, for manually debugging the gulp build
// (comment out corresponding line of paths to print)
gulp.task('log', function () {
    // var src = paths.scriptsConfig;
    var src = paths.scripts.concat(paths.styles).concat(paths.images).concat(paths.locales);

    return gulp.src(src).pipe(gulpDebug());
});

gulp.task('inject', function () {
    var target = gulp.src('index.html');
    var sources = gulp.src(paths.scripts.concat(paths.styles), {
        base: '.',
        read: false,
    });

    return target.pipe(inject(sources, { relative: true })).pipe(gulp.dest('.'));
});

var pkg = require('./package.json');
var nextVersion;
var ghToken;

gulp.task('release:init', function (cb) {
    ghToken = gutil.env.token;
    if (!ghToken) {
        return cb(new Error('--token is required (github personal access token'));
    }
    if (ghToken.length != 40) {
        return cb(new Error('--token length must be 40, not ' + ghToken.length));
    }

    nextVersion = pkg.version;

    if (gutil.env.skipnewtag) {
        return cb();
    }

    var tag = gutil.env.tag;
    if (!tag) {
        return cb(new Error('--tag is required'));
    }
    if (['major', 'minor', 'patch'].indexOf(tag) < 0) {
        return cb(new Error('--tag must be major, minor or patch'));
    }

    nextVersion = semver.inc(pkg.version, tag);

    git.status({ args: '--porcelain', quiet: true }, function (err, stdout) {
        if (err) return cb(err);
        if (stdout.length > 0) {
            return cb(new Error('Repository is not clean. Please commit or stash your pending modification'));
        }

        cb();
    });
});

gulp.task('bump:json', function () {
    gutil.log(gutil.colors.green('Bump to ' + nextVersion));
    return gulp
        .src(['./package.json'])
        .pipe(bump({ version: nextVersion }))
        .pipe(gulp.dest('./'));
});

gulp.task('bump:html', function () {
    const version = nextVersion || pkg.version;
    return gulp
        .src('./index.html')
        .pipe(replace(/<sup class="version">(.*)<\/sup>/, '<sup class="version">' + version + '</sup>'))
        .pipe(replace(/BR.version = '(.*?)';/, "BR.version = '" + version + "';"))
        .pipe(gulp.dest('.'));
});

gulp.task('bump', gulp.series('bump:json', 'bump:html'));

gulp.task('release:commit', function () {
    return gulp.src(['./index.html', './package.json']).pipe(git.commit('release: ' + nextVersion));
});

gulp.task('release:tag', function (cb) {
    return git.tag(nextVersion, '', cb);
});

gulp.task('release:push', function (cb) {
    git.push('origin', 'master', { args: '--tags' }, cb);
});

gulp.task('i18next', function () {
    return gulp
        .src(['index.html', 'locales/keys.js', 'layers/config/overrides.js', 'js/**/*.js'])
        .pipe(sort())
        .pipe(
            scanner({
                lngs: ['en'], // we only generate English version, other languages are handled by transifex via yarn transifex-pull/push
                removeUnusedKeys: true,
                sort: true,
                resource: {
                    // the source path is relative to current working directory
                    loadPath: 'locales/{{lng}}.json',

                    // the destination path is relative to your `gulp.dest()` path
                    savePath: 'locales/{{lng}}.json',
                },
            })
        )
        .pipe(gulp.dest('.'));
});

gulp.task('layers_config', function () {
    return gulp.src(paths.layersConfig).pipe(concat(paths.layersConfigDestName)).pipe(gulp.dest(paths.dest));
});

// Bundles layer files. To download and extract run "yarn layers"
gulp.task('layers', function () {
    return (
        gulp
            .src(paths.layers)
            // Workaround to get file extension removed from the dictionary key
            .pipe(rename({ extname: '.json' }))
            .pipe(
                jsonConcat(paths.layersDestName, function (data) {
                    var header =
                        '// Licensed under the MIT License (https://github.com/nrenner/brouter-web#license + Credits and Licenses),\n' +
                        '// except JOSM imagery database (dataSource=JOSM) is licensed under Creative Commons (CC-BY-SA),\n' +
                        '// see https://josm.openstreetmap.de/wiki/Maps#Otherimportantinformation\n';
                    return Buffer.from(header + 'BR.layerIndex = ' + JSON.stringify(data, null, 2) + ';');
                })
            )
            .pipe(gulp.dest(paths.dest))
    );
});

gulp.task(
    'default',
    gulp.series(
        'clean',
        'scripts_config',
        'layers_config',
        'layers',
        'bump:html',
        'scripts',
        'styles',
        'images',
        'fonts',
        'locales',
        'boundaries',
        'changelog'
    )
);

gulp.task(
    'debug',
    gulp.series(function (cb) {
        debug = true;
        cb();
    }, 'default')
);

gulp.task(
    'serve',
    gulp.series('debug', function (cb) {
        server.init({
            server: {
                baseDir: './',
            },
            open: false,
        });
        cb();
    })
);

gulp.task('release:zip', function () {
    gutil.log(gutil.colors.green('Build brouter-web.' + nextVersion + '.zip'));
    return gulp
        .src(paths.zip, {
            base: '.',
        })
        .pipe(zip('brouter-web.' + nextVersion + '.zip'))
        .pipe(gulp.dest('.'));
});

gulp.task('release:zip_standalone', function () {
    var version = pkg.version;
    var destName = 'brouter-web-standalone.' + version + '.zip';

    gutil.log(gutil.colors.green('Build ' + destName));

    var brouterWeb = gulp
        .src(paths.zip, {
            base: '.',
        })
        .pipe(
            rename(function (path) {
                path.dirname = 'brouter-web/' + path.dirname;
            })
        );

    var root = gulp.src(['resources/standalone/run.sh', 'resources/standalone/segments4']);

    var serverRoot = gulp
        .src(['docs/developers/profile_developers_guide.md', 'brouter-server/build/libs/brouter-*-all.jar'], {
            cwd: path.join(process.cwd(), '../brouter'),
        })
        .pipe(
            rename(function (path) {
                if (path.basename.startsWith('brouter-') && path.basename.endsWith('-all')) {
                    path.basename = 'brouter';
                }
            })
        );

    var serverProfiles = gulp.src(
        [
            'profiles2/**',
            '!profiles2/all.brf',
            '!profiles2/car-eco-suspect_scan.brf',
            '!profiles2/car-traffic_analysis.brf',
            '!profiles2/softaccess.brf',
        ],
        {
            cwd: path.join(process.cwd(), '../brouter/misc/'),
            base: '../brouter/misc/',
        }
    );

    var serverScripts = gulp.src(['standalone/**'], {
        cwd: path.join(process.cwd(), '../brouter/misc/scripts/'),
        base: '../brouter/misc/scripts/',
    });

    return merge(brouterWeb, root, serverRoot, serverProfiles, serverScripts).pipe(zip(destName)).pipe(gulp.dest('.'));
});

gulp.task('release:publish', function () {
    return gulp.src('./brouter-web.' + nextVersion + '.zip').pipe(
        release({
            tag: nextVersion,
            token: ghToken,
            manifest: pkg,
        })
    );
});

gulp.task(
    'release',
    gulp.series(
        'release:init',
        'bump',
        'release:commit',
        'release:tag',
        'release:push',
        'default',
        'release:zip',
        'release:publish'
    )
);
