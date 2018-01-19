const path = require('path');
const fs = require('fs');
const promisify = require('util').promisify;
const readFileAsync = promisify(fs.readFile);
const _ = require('lodash');
const glob = require('glob');
const aGlob = (pattern) => {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, res) => {
      if (err) { return reject(err); }
      return resolve(res);
    });
  });
};

const Transform = require('stream').Transform;
const Vinyl = require('vinyl');

const gulpUltimateDependent = (opts) => {

  const getMatches = async (depObj, fileName) => {
    if (depObj[fileName]) {
      return;
    }
    depObj[fileName] = [];
    const res = await readFileAsync(fileName);
    const fileContents = res.toString();
    const matches = [];
    let match;
    while (match = opts.matchRegex.exec(fileContents)) {
      const matchPath = path.resolve(path.join(path.dirname(fileName), match[1]));
      const result = opts.replaceMatched ? opts.replaceMatched(matchPath) : matchPath;
      if (!_.some(depObj[fileName], (id) => id === result)) {
        depObj[fileName].push(result);
      }
      matches.push(result);
    }
    const depMatches = matches.map(async (f) => getMatches(depObj, f));
    return await Promise.all(depMatches);
  };

  const buildDepMap = async () => {
    const depObj = {};
    const ultimates = await aGlob(opts.ultimateGlob);
    const ultimateMatches = ultimates.map(async (f) => getMatches(depObj, f));
    await Promise.all(ultimateMatches);
    return _.entries(depObj);
  };

  class UltimateDependent extends Transform {
    constructor() {
      super({ objectMode: true });
      this.files = [];
    }
    findPagesForComponent(depObj, c) {
      if (!c.startsWith('/')) {
        c = '/' + c;
      }
      if (opts.ultimateMatch(c)) {
        return [c];
      }
      return _.chain(depObj)
        .filter((a) =>  _.some(a[1], (id) => id === c))
        .map((a) => this.findPagesForComponent(depObj, a[0]))
        .value();
    }
    _transform(file, encoding, done) {
      buildDepMap().then((depObj) => {
        this.files = this.files.concat(this.findPagesForComponent(depObj, file.path));
        done();
      });
    }
    _flush(done) {
      const pages = _.chain(this.files)
        .flattenDeep()
        .uniqBy((p) => {
          const parts = p.split('/');
          return parts[parts.length - 1];
        })
        .value();
      pages.forEach((p) => this.push(new Vinyl({ path: p })));
      done();
    }
  }
  
  return new UltimateDependent();
};

module.exports = gulpUltimateDependent;
