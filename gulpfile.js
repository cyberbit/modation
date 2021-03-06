const gulp = require('gulp');
const pump = require('pump');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const crx = require('gulp-crx-pack');
const manifest = require('./src/manifest.json');
const fs = require('fs');
const eslint = require('gulp-eslint');

gulp.task('default', ['dev']);

gulp.task('dev', ['chrome', 'images', 'html', 'css', 'js']);

gulp.task('watch', ['dev'], cb => {
    gulp.watch('src/js/**/*.js', ['js']);
});

/**********
 * Chrome *
 **********/

gulp.task('chrome', ['chrome:manifest']);

// Copy manifest
gulp.task('chrome:manifest', cb => {
    pump([
        gulp.src('src/manifest.json'),
        gulp.dest('rel')
    ],
    cb)
});

// TODO this doesn't work right :(
gulp.task('chrome:pack', cb => {
    pump([
       gulp.src('rel'),
       crx({
           privateKey: fs.readFileSync('./modation.pem', 'utf8'),
           filename: 'modation.crx'
       }),
       gulp.dest('./build')
    ]);
})

/**********
 * Images *
 **********/

gulp.task('images', cb => {
    pump([
        gulp.src([
            'src/img/*'
        ]),
        gulp.dest('rel/img')
    ])
})

/********
 * HTML *
 ********/

// Copy HTML files
gulp.task('html', cb => {
    pump([
        gulp.src([
            'src/background.html',
            'src/content.html',
            'src/popup.html',
            'src/uioptions.html'
        ]),
        gulp.dest('rel')
    ],
    cb)
});

gulp.task('css', cb => {
    pump([
        gulp.src([
            'src/css/content.min.css',
            'src/css/popup.min.css',
            'src/css/uioptions.min.css'
        ]),
        gulp.dest('rel/css')
    ])
})

/**************
 * JavaScript *
 **************/

gulp.task('js', ['js:vendor', 'js:api', 'js:build']);

// Copy vendor assets
gulp.task('js:vendor', cb => {
    pump([
        gulp.src([
            // jQuery
            'node_modules/jquery/dist/jquery.min.js',

            // Isotope
            'node_modules/isotope-layout/dist/isotope.pkgd.min.js',

            // imagesLoaded
            'node_modules/imagesloaded/imagesloaded.pkgd.min.js',

            // Moment
            'node_modules/moment/min/moment.min.js',

            // jQuery caret position (custom build)
            'src/js/jquery.caretposition.custom.min.js',

            // jQuery Sew (custom build)
            'src/js/jquery.sew.custom.min.js'
        ]),
        gulp.dest('rel/js/vendor')
    ],
    cb)
});

// Build APIs
gulp.task('js:api', cb => {
    pump([
        gulp.src('src/js/api/*.js'),
        eslint(),
        eslint.format(),
        eslint.failAfterError(),
        sourcemaps.init(),
            uglify(),
            concat('api.min.js'),
        sourcemaps.write(),
        gulp.dest('rel/js')
    ],
    cb)
});

// Build other sources
gulp.task('js:build', cb => {
    pump([
        gulp.src([
            'src/js/content.js',
            'src/js/eventPage.js',
            'src/js/newpopup.js',
            'src/js/uioptions.js'
        ]),
        eslint(),
        eslint.format(),
        eslint.failAfterError(),
        sourcemaps.init(),
            uglify(),
            rename({
                suffix: '.min'
            }),
        sourcemaps.write(),
        gulp.dest('rel/js')
    ],
    cb)
});
