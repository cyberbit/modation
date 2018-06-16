var gulp = require('gulp');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var closureCompiler = require('google-closure-compiler').gulp();

gulp.task('default', ['js:vendor', 'js:build']);

// Copy vendor assets
gulp.task('js:vendor', () =>
    gulp.src([
        // Isotope
        'node_modules/isotope-layout/dist/isotope.pkgd.min.js',

        // jQuery
        'node_modules/jquery/dist/jquery.min.js',

        // Moment
        'node_modules/moment/min/moment.min.js'
    ])
        .pipe(gulp.dest('rel2/vendor'))
);

// Build source files
gulp.task('js:build', () =>
    // Build APIs
    gulp.src(['src/js/crapi.js', 'src/js/modapi.js'])
        .pipe(closureCompiler({
            compilation_level: 'SIMPLE',
            js_output_file: 'api.min.js'
        }))
        .pipe(gulp.dest('rel2'))
);

// gulp.task('default', function() {
//     // place code for your default task here
// });
