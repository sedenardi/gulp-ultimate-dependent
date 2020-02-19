/* global describe */
/* global it */

const ultimateDependent = require('..');
const path = require('path');
const assert = require('assert');

const getStream = function(opts = {}) {
  opts = {
    failOnMissing: false,
    ...opts
  };
  return ultimateDependent({
    ultimateGlob: '**/entry-*.js',
    commonJS: true,
    esm: true,
    failOnMissing: opts.failOnMissing
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
      assert.equal(results.length, 2);
      assert.ok(results.some((r) => r.includes('files/entry-1.js')));
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
  it('throw error on missing dependency', (done) => {
    const fileName = 'files/components/dep-1-4.js';
    const filePath = path.resolve(__dirname, fileName);
    const results = [];
    const stream = getStream({
      failOnMissing: true
    });
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('error', (err) => {
      assert.equal(err.code, 'ENOENT');
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
});
