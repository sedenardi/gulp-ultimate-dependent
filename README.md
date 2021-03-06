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
      commonJS: true,
      esm: true,
      extensions: ['.js'],
      dependencyFile: 'dependencies.json',
      warnOnMissing: true,
      failOnMissing: true
    }))
    .pipe(build()) // build the ultimate dependents
    .pipe(gulp.dest('output/'));
});
```

## Options

- `ultimateGlob: string` - **required** - search glob pattern identifying all ultimate parent dependents
- `commonJS: bool` - optional, default `true` - include CommonJS `require()` dependencies
- `esm: bool` - optional, default `true` - include ES Module `import` dependencies
- `extensions: string[]` - optional, default `['.js']` - used to further process matched dependency string, such as add inferred file extensions
- `dependencyFile: string | () => string` - optional - if you want to output the dependency list, specify a file name or function which returns a file name
- `warnOnMissing: bool` - optional, default `false` - if `true`, stream will output to console if it finds a dependency whose file is missing.
- `failOnMissing: bool` - optional, default `false` - if `true`, stream will fail if it finds a dependency whose underlying file is missing (this is common if you delete a file you're watching). If `false`, stream still returns affected dependents. The stream will still fail on other errors.
- `ignoreCircularDependency: bool` - optional, default `true` - if `true`, stream will ignore files it's already traversed, indicating a circular dependency. If `false`, stream will emit an error with the first file it sees twice.

## Tests

```js
npm run test
```

## License

  MIT
