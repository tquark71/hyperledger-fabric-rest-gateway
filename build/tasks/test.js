var gulp = require('gulp');
var tape = require('gulp-tape');
var tapColorize = require('tap-colorize');
var path = require('path');
var fs = require('fs');


gulp.task('integration-test', [], function() {
	let integrationSrcArray = [];
	let integrationFiles = fs.readdirSync(path.resolve(__dirname, '../../test/integration'))
	console.log(integrationFiles)
	for (let i = 0; i < integrationFiles.length; i++) {
		integrationFiles[i] = path.resolve(__dirname, '../../test/integration/') + '/' + integrationFiles[i]
	}
	console.log(integrationFiles)

	return gulp.src(integrationFiles)
		.pipe(tape({
			reporter: tapColorize()
		}))

});