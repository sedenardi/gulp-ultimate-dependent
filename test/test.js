/* global describe */
/* global it */

const ultimateDependent = require('..');
const path = require('path');
const assert = require('assert');

const getStream = () => {
  return ultimateDependent({
    ultimateGlob: '**/entry-*.js',
    ultimateMatch: (f) => { return f.includes('entry-'); },
    matchRegex: /require\('([.|..]+[\/]+.*)'\)/g,
    replaceMatched: (f) => {
      return (!f.endsWith('.js') && !f.endsWith('.jsx')) ? `${f}.js` : f;
    }
  });
};

describe('gulp-ultimate-dependent', () => {
  it('return if self changed', (done) => {
    const fileName = 'files/entry-1.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = getStream();
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.equal(results.length, 1);
      assert.ok(results[0].includes('files/entry-1.js'));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return if immediate dependency changed', (done) => {
    const fileName = 'files/components/dep-1-2.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = getStream();
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.equal(results.length, 1);
      assert.ok(results[0].includes('files/entry-2.js'));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return if last child dependency changed', (done) => {
    const fileName = 'files/components/dep-2-1.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = getStream();
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.equal(results.length, 1);
      assert.ok(results[0].includes('files/entry-1.js'));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return nothing if orphaned child dependency changed', (done) => {
    const fileName = 'files/components/dep-orphan.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = getStream();
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.equal(results.length, 0);
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
});
