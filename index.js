const path = require('path');
const fs = require('fs');
const promisify = require('util').promisify;
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const flattenDeep = require('lodash.flattendeep');
const uniqBy = require('lodash.uniqby');
const glob = require('glob');
const aGlob = promisify(glob);

const Transform = require('stream').Transform;
const Vinyl = require('vinyl');

const gulpUltimateDependent = (opts) => {
  opts.failOnMissing = opts.failOnMissing !== undefined ? opts.failOnMissing : false;

  const getRegexMatch = (fileContents) => {
    if (opts.matchRegex.exec) {
      return opts.matchRegex.exec(fileContents);
    } else if (opts.matchRegex.length > 0) {
      let regexMatch = null;
      for (let i = 0; i < opts.matchRegex.length; i++) {
        const match = opts.matchRegex[i].exec(fileContents);
        if (match) {
          regexMatch = match;
          break;
        }
      }
      return regexMatch;
    }
  };

  const getMatches = async (depObj, fileName, fromFile) => {
    fileName = path.resolve(fileName);
    if (depObj[fileName]) {
      return;
    }
    depObj[fileName] = [];
    let res;
    try {
      res = await readFileAsync(fileName);
    } catch(err) {
      if (err.code === 'ENOENT') {
        console.log(`WARNING: error opening file ${fileName} from ${fromFile || fileName}`);
        if (opts.failOnMissing) {
          throw err;
        } else {
          return;
        }
      }
    }
    const fileContents = res.toString();
    const matches = [];
    let match;
    while (match = getRegexMatch(fileContents)) {
      const matchPath = path.resolve(path.join(path.dirname(fileName), match[1]));
      const result = opts.replaceMatched ? opts.replaceMatched(matchPath) : matchPath;
      if (!depObj[fileName].some((id) => id === result)) {
        depObj[fileName].push(result);
      }
      matches.push(result);
    }
    const depMatches = matches.map(async (f) => getMatches(depObj, f, fileName));
    return await Promise.all(depMatches);
  };

  const writeDependencies = async (depObj) => {
    let fileName = opts.dependencyFile;
    if (typeof fileName === 'function') {
      fileName = fileName();
    }
    if (typeof fileName === 'string' && fileName) {
      await writeFileAsync(fileName, JSON.stringify(depObj, null, 2));
    }
  };

  const buildDepMap = async () => {
    const depObj = {};
    const ultimates = await aGlob(opts.ultimateGlob);
    const ultimateMatches = ultimates.map(async (f) => getMatches(depObj, f));
    await Promise.all(ultimateMatches);
    await writeDependencies(depObj);
    return Object.keys(depObj).map((key) => [key, depObj[key]]);
  };

  class UltimateDependent extends Transform {
    constructor() {
      super({ objectMode: true });
      this.files = [];
    }
    findPagesForComponent(depArray, c) {
      if (!c.startsWith('/')) {
        c = '/' + c;
      }
      if (opts.ultimateMatch(c)) {
        return [c];
      }
      return depArray.filter((a) =>  a[1].some((id) => id === c))
        .map((a) => this.findPagesForComponent(depArray, a[0]));
    }
    _transform(file, encoding, done) {
      buildDepMap().then((depArray) => {
        this.files = this.files.concat(this.findPagesForComponent(depArray, file.path));
        done();
      }).catch((err) => { done(err); });
    }
    _flush(done) {
      const pages = uniqBy(flattenDeep(this.files), (p) => {
        const parts = p.split('/');
        return parts[parts.length - 1];
      });
      pages.forEach((p) => this.push(new Vinyl({ path: p })));
      done();
    }
  }

  return new UltimateDependent();
};

module.exports = gulpUltimateDependent;
