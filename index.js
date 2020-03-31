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

const requireRegex = require('requires-regex');
const importRegex = require('esm-import-regex');

const gulpUltimateDependent = function(opts = {}) {
  opts = {
    commonJS: true,
    esm: true,
    extensions: ['.js'],
    warnOnMissing: false,
    failOnMissing: false,
    ignoreCircularDependency: true,
    ...opts
  };

  const getRegexMatches = function(fileContents) {
    const matches = [];
    if (opts.commonJS) {
      const commonJS = [...fileContents.matchAll(requireRegex())].map((match) => match[4]);
      matches.push(...commonJS);
    }
    if (opts.esm) {
      const esm = [...fileContents.matchAll(importRegex())].map((match) => match[2]);
      matches.push(...esm);
    }
    return matches.filter((match) => {
      return typeof match === 'string' && (
        match.startsWith('./') ||
        match.startsWith('../')
      );
    });
  };

  const resolveFile = async function(fileName, fromFile) {
    const fileNames = [
      fileName,
      ...opts.extensions.map((ext) => `${fileName}${ext}`)
    ];
    let actualFileName;
    let res;
    for (const extName of fileNames) {
      try {
        const buf = await readFileAsync(extName);
        actualFileName = extName;
        res = buf;
        break;
      } catch(err) { }
    }
    if (res) {
      return [actualFileName, res];
    }
    if (opts.warnOnMissing) {
      console.log(`WARNING: error opening file ${fileName} from ${fromFile || fileName}`);
    }
    if (opts.failOnMissing) {
      const err = new Error(`Error opening file ${fileName} from ${fromFile || fileName}`);
      err.code = 'ENOENT';
      throw err;
    }
    return [null, null];
  };

  const getMatches = async function(depObj, fileName, fromFile) {
    fileName = path.resolve(fileName);
    if (depObj[fileName]) {
      return;
    }
    const [actualFileName, res] = await resolveFile(fileName, fromFile);
    if (!res) {
      return;
    }
    depObj[actualFileName] = [];
    const fileContents = res.toString();
    const rMatches = getRegexMatches(fileContents);
    const matches = [];
    for (const match of rMatches) {
      const result = path.resolve(path.join(path.dirname(actualFileName), match));
      const [actualMatch] = await resolveFile(result, actualFileName);
      if (!actualMatch) {
        continue;
      }
      if (!depObj[actualFileName].some((id) => id === actualMatch)) {
        depObj[actualFileName].push(actualMatch);
      }
      matches.push(actualMatch);
    }
    const depMatches = matches.map(async (f) => getMatches(depObj, f, actualFileName));
    return await Promise.all(depMatches);
  };

  const writeDependencies = async function(depObj) {
    let fileName = opts.dependencyFile;
    if (typeof fileName === 'function') {
      fileName = fileName();
    }
    if (typeof fileName === 'string' && fileName) {
      await writeFileAsync(fileName, JSON.stringify(depObj, null, 2));
    }
  };

  const buildDepMap = async function() {
    const depObj = {};
    const ultimates = await aGlob(opts.ultimateGlob);
    const ultimateMatches = ultimates.map(async (f) => getMatches(depObj, f));
    await Promise.all(ultimateMatches);
    await writeDependencies(depObj);
    const depArray = Object.keys(depObj).map((key) => [key, depObj[key]]);
    return [depArray, ultimates];
  };

  class UltimateDependent extends Transform {
    constructor() {
      super({ objectMode: true });
      this.files = [];
      this.seen = new Set();
    }
    findPagesForComponent(depArray, ultimates, c) {
      if (!c.startsWith('/')) {
        c = '/' + c;
      }
      if (ultimates.some((u) => c.endsWith(u))) {
        return [c];
      }
      if (this.seen.has(c)) {
        if (opts.ignoreCircularDependency) {
          return [];
        } else {
          throw new Error(`Circular dependency detected in ${c}`);
        }
      }
      this.seen.add(c);
      return depArray.filter((a) =>  a[1].some((id) => id === c))
        .map((a) => this.findPagesForComponent(depArray, ultimates, a[0]));
    }
    _transform(file, _, done) {
      buildDepMap().then(([depArray, ultimates]) => {
        this.files = this.files.concat(this.findPagesForComponent(depArray, ultimates, file.path));
        done();
      }).catch((err) => {
        done(err);
      });
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
