const gulp = require('gulp');
const pump = require('pump');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');

gulp.task('default', ['dev']);

gulp.task('dev', ['chrome', 'html', 'js']);

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

// TODO: Images

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

// TODO: CSS

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
            'node_modules/moment/min/moment.min.js'
        ]),
        gulp.dest('rel/js/vendor')
    ],
    cb)
});

// Build APIs
gulp.task('js:api', cb => {
    pump([
        gulp.src('src/js/api/*.js'),
        uglify(),
        concat('api.min.js'),
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
        uglify(),
        rename({
            suffix: '.min'
        }),
        gulp.dest('rel/js')
    ],
    cb)
});
