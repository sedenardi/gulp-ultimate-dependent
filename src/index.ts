import path from 'path';
import { promises as fsPromises } from 'fs';
import { promisify } from 'util';
import uniqBy from 'lodash.uniqby';
import glob from 'glob';
const aGlob = promisify(glob);

import { Transform } from 'stream';
import Vinyl from 'vinyl';

import requireRegex from 'requires-regex';
import importRegex from 'esm-import-regex';

type UltimateDependentOpts = {
  ultimateGlob: string;
  commonJS?: boolean;
  esm?: boolean;
  extensions?: string[];
  dependencyFile?: string | (() => string);
  warnOnMissing?: boolean;
  failOnMissing?: boolean;
  ignoreCircularDependency?: boolean;
};
type DependencyMap = Map<string, Set<string>>;
const gulpUltimateDependent = function(defaultOpts: UltimateDependentOpts) {
  const opts = {
    commonJS: true,
    esm: true,
    extensions: ['.js'],
    warnOnMissing: false,
    failOnMissing: false,
    ignoreCircularDependency: true,
    ...(defaultOpts || {})
  };

  const getRegexMatches = function(fileContents: string) {
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

  const resolveFile = async function(fileName: string, fromFile?: string) {
    const fileNames = [
      fileName,
      ...opts.extensions.map((ext) => `${fileName}${ext}`)
    ];
    let actualFileName: string = null;
    let res: Buffer = null;
    for (const extName of fileNames) {
      try {
        const buf = await fsPromises.readFile(extName);
        actualFileName = extName;
        res = buf;
        break;
      } catch(err) {
        if (opts.warnOnMissing) {
          console.log(`WARNING: error opening file ${fileName} from ${fromFile || fileName}`);
        }
        if (opts.failOnMissing) {
          throw err;
        }
      }
    }
    return [actualFileName, res] as const;
  };

  const getMatches = async function(depMap: DependencyMap, fileName: string, fromFile?: string) {
    fileName = path.resolve(fileName);
    if (depMap.has(fileName)) {
      return;
    }
    const [actualFileName, res] = await resolveFile(fileName, fromFile);
    if (!res) {
      return;
    }
    depMap.set(actualFileName, new Set());
    const fileContents = res.toString();
    const rMatches = getRegexMatches(fileContents);
    const matches = [];
    for (const match of rMatches) {
      const result = path.resolve(path.join(path.dirname(actualFileName), match));
      const [actualMatch] = await resolveFile(result, actualFileName);
      if (!actualMatch) {
        continue;
      }
      if (!depMap.get(actualFileName).has(actualMatch)) {
        depMap.get(actualFileName).add(actualMatch);
      }
      matches.push(actualMatch);
    }
    const depMatches = matches.map(async (f) => getMatches(depMap, f, actualFileName));
    return await Promise.all(depMatches);
  };

  const writeDependencies = async function(depMap) {
    let fileName = opts.dependencyFile;
    if (typeof fileName === 'function') {
      fileName = fileName();
    }
    if (typeof fileName === 'string' && fileName) {
      const depObj = Array.from(depMap.entries()).reduce((res, [k, set]) => {
        res[k] = Array.from(set.keys());
        return res;
      }, {});
      await fsPromises.writeFile(fileName, JSON.stringify(depObj, null, 2));
    }
  };

  const buildDepMap = async function() {
    const depMap: DependencyMap = new Map();
    const ultimates = await aGlob(opts.ultimateGlob, { absolute: true });
    const ultimateMatches = ultimates.map(async (f) => getMatches(depMap, f));
    await Promise.all(ultimateMatches);
    await writeDependencies(depMap);
    return [depMap, new Set(ultimates)] as const;
  };

  const seen = new Set<string>();
  const findPagesForComponent = function(depMap: DependencyMap, ultimatesSet: Set<string>, c: string) {
    if (!c.startsWith('/')) {
      c = '/' + c;
    }
    if (ultimatesSet.has(c)) {
      return [c];
    }
    if (seen.has(c)) {
      if (opts.ignoreCircularDependency) {
        return [];
      } else {
        throw new Error(`Circular dependency detected in ${c}`);
      }
    }
    seen.add(c);
    const pages: string[] = [];
    for (const [k, set] of depMap) {
      if (!set.has(c)) { continue; }
      pages.push(...findPagesForComponent(depMap, ultimatesSet, k));
    }
    return pages;
  };

  const files: string[] = [];
  const ultimateTransform = new Transform({
    objectMode: true,
    async transform(file, _, done) {
      try {
        const [depMap, ultimatesSet] = await buildDepMap();
        files.push(...findPagesForComponent(depMap, ultimatesSet, file.path));
        done();
      } catch(err) {
        done(err);
      }
    },
    flush(done) {
      const fileSet = uniqBy(files, (p) => {
        const parts = p.split('/');
        return parts[parts.length - 1];
      });
      fileSet.forEach((p) => this.push(new Vinyl({ path: p })));
      done();
    }
  });

  return ultimateTransform;
};

export default gulpUltimateDependent;
