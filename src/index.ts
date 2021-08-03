import path from 'path';
import { promises as fsPromises } from 'fs';
import { promisify } from 'util';
import uniqBy from 'lodash.uniqby';
import glob from 'glob';
const aGlob = promisify(glob);
import { Transform } from 'stream';
import Vinyl from 'vinyl';
import detective from 'detective-typescript';

type UltimateDependentOpts = {
  ultimateGlob: string;
  extensions?: string[];
  dependencyFile?: string | (() => string);
  warnOnMissing?: boolean;
  failOnMissing?: boolean;
  ignoreCircularDependency?: boolean;
  skipTypeImports?: boolean;
  mixedImports?: boolean;
  jsx?: boolean;
  debug?: boolean;
};
type DependencyMap = Map<string, Set<string>>;
const gulpUltimateDependent = function(defaultOpts: UltimateDependentOpts) {
  const opts = {
    extensions: ['.js'],
    warnOnMissing: false,
    failOnMissing: false,
    ignoreCircularDependency: true,
    skipTypeImports: true,
    mixedImports: true,
    jsx: true,
    debug: false,
    ...(defaultOpts || {})
  };
  let depMap: DependencyMap;
  let ultimates: Set<string>;

  const getDependencies = function(fileContents: string) {
    const dependencies: string[] = detective(fileContents, {
      skipTypeImports: opts.skipTypeImports,
      mixedImports: opts.mixedImports,
      jsx: opts.jsx
    });
    return dependencies.filter((dep) => {
      return (
        dep.startsWith('./') ||
        dep.startsWith('../')
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
        // error reading file
      }
    }
    if (!res) {
      if (opts.warnOnMissing) {
        console.log(`WARNING: error opening file ${fileName} from ${fromFile || fileName}`);
      }
      if (opts.failOnMissing) {
        const err: any = new Error(`Error opening file ${fileName} from ${fromFile || fileName}`);
        err.code = 'ENOENT';
        throw err;
      }
    }
    return [actualFileName, res] as const;
  };

  const saveDependencies = async function(fileName: string, fromFile?: string) {
    fileName = path.resolve(fileName);
    if (depMap.has(fileName)) {
      return null;
    }
    if (fileName.toLowerCase().endsWith('.json')) {
      return null;
    }
    const [actualFileName, res] = await resolveFile(fileName, fromFile);
    if (!res) {
      return null;
    }
    depMap.set(actualFileName, new Set());
    const fileContents = res.toString();
    const rMatches = getDependencies(fileContents);
    const matches: string[] = [];
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
    return [actualFileName, matches] as const;
  };

  const saveAndProcessDependencies = async function(fileName: string, fromFile?: string) {
    const deps = await saveDependencies(fileName, fromFile);
    if (!deps) {
      return;
    }
    const [actualFileName, matches] = deps;
    for (const match of matches) {
      await saveAndProcessDependencies(match, actualFileName);
    }
  };

  const writeDependencies = async function() {
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

  const buildDepMap = async function(affectedFile: string) {
    const now = Date.now();
    if (!depMap || !depMap.has(affectedFile)) {
      if (opts.debug) {
        console.log('DEBUG: Full dependency map rebuild');
      }
      depMap = new Map();
      const ultimateMatches = await aGlob(opts.ultimateGlob, { absolute: true });
      ultimates = new Set(ultimateMatches);
      await Promise.all(ultimateMatches.map(async (f) => saveAndProcessDependencies(f)));
    } else {
      if (opts.debug) {
        console.log('DEBUG: Partial dependency map rebuild');
      }
      depMap.delete(affectedFile);
      await saveDependencies(affectedFile);
    }
    await writeDependencies();
    if (opts.debug) {
      console.log(`DEBUG: Rebuild took ${Date.now() - now}ms`);
    }
  };

  return function() {
    const files: string[] = [];
    const seen = new Set<string>();
    const findPagesForComponent = function(c: string) {
      if (!c.startsWith('/')) {
        c = '/' + c;
      }
      if (ultimates.has(c)) {
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
        pages.push(...findPagesForComponent(k));
      }
      return pages;
    };

    const ultimateTransform = new Transform({
      objectMode: true,
      async transform(file, _, done) {
        try {
          await buildDepMap(file.path);
          files.push(...findPagesForComponent(file.path));
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
};

export default gulpUltimateDependent;
