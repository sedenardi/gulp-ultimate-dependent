# gulp-ultimate-dependent

Gulp plugin to find the named ultimate dependent in the dependency graph.

## Description

When you're running an incremental build system, you usually only want to build the files that change. For frontend applications with multiple main source files (Webpack entry points, individual style files, etc.), you usually only want to build the files containing a changed file. This plugin builds a dependency list and iterates through to find the highest-level dependent. This way, you won't have to do a full rebuild every time a file changes, but build just the files that depend on the changed file.

Of course, this package has uses other than frontend applications. You can use it to build other types of sources, or to generate the list of dependencies for your files.

## Requirements

- Node.js 8 or higher (due to usage of `async` functions and `util.promisify`)
- gulp v4 (untested with other versions)

## Installation

```js
npm install --save-dev gulp-ultimate-dependent
```

## Example

```js
const gulp = require('gulp');
const ultimateDependent = require('gulp-ultimate-dependent');

const firstRun = Date.now()
gulp.task('incrementalBuild', () => {
  return gulp.src([
    'src/**/*.{js, jsx}' // all watched files
  ], { since: gulp.lastRun(incrementalBuild) || firstRun }) // what's changed
    .pipe(ultimateDependent({
      ultimateGlob: 'src/**/*ParentPage.jsx',
      ultimateMatch: (f) => { return f.endsWith('ParentPage.jsx'); },
      matchRegex: /require\('([.|..]+[\/]+.*)'\)/g,
      replaceMatched: (f) => {
        return (!f.endsWith('.js') && !f.endsWith('.jsx')) ? `${f}.js` : f;
      }
    }))
    .pipe(build()) // build the ultimate dependents
    .pipe(gulp.dest('output/'));
});
```

## Options

- `ultimateGlob [string, required]`: search glob pattern identifying all ultimate parent dependents
- `ultimateMatch [function, required]`: test to see whether file is an ultimate parent dependent (should match files that `ultimateGlob` returns)
- `matchRegex [regex, required]`: search pattern to determine dependencies. Examples:
  - `var dep = require('dep')` - `/require\('([.|..]+[\/]+.*)'\)/g`
  - `import dep from 'dep'` - `/from '([.|..]+[\/]+.*)'/g`
- `replaceMatched [function, optional]`: used to further process matched dependency string, such as add inferred file extensions

## Tests

TODO

## License

  MIT
