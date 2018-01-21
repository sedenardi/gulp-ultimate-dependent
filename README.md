# gulp-ultimate-dependent

Gulp plugin to find the named ultimate dependent in the dependency graph.

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
  return gulp.src('src/**/*.{js, jsx}') // all watched files
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
  - `var dep = require('dep')`` - `/require\('([.|..]+[\/]+.*)'\)/g`
  - `import dep from 'dep'` - `/from '([.|..]+[\/]+.*)'/g`
- `replaceMatched [function, optional]`: used to further process matched dependency string, such as add inferred file extensions

## Tests

TODO

## License

  MIT
