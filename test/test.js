const ultimateDependent = require('../lib/index').default;
const path = require('path');
const { describe, it } = require('mocha');
const assert = require('assert');

const JS_GLOB = '**/entry-*.js';
const TS_GLOB = '**/entry-*.{js,ts}';

// const getStream = function(opts = {}) {
//   opts = {
//     failOnMissing: false,
//     ...opts
//   };
//   return ultimateDependent({
//     ultimateGlob: '**/entry-*.{js,ts}',
//     commonJS: true,
//     esm: true,
//     extensions: ['.js'],
//     warnOnMissing: true,
//     failOnMissing: opts.failOnMissing
//   });
// };

describe('gulp-ultimate-dependent - JS only', () => {
  it('return if self changed', (done) => {
    const fileName = 'files/entry-1.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: JS_GLOB
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 1);
      assert.ok(results[0].includes('files/entry-1.js'));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return if immediate dependency changed', (done) => {
    const fileName = 'files/components/dep-1-2.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: JS_GLOB
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 1);
      assert.ok(results[0].includes('files/entry-2.js'));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return if last child dependency changed', (done) => {
    const fileName = 'files/components/dep-2-1.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: JS_GLOB
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 2);
      assert.ok(results.some((r) => r.includes('files/entry-1.js')));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return nothing if orphaned child dependency changed', (done) => {
    const fileName = 'files/components/dep-orphan.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: JS_GLOB
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 0);
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('throw error on missing dependency', (done) => {
    const fileName = 'files/components/dep-1-4.js';
    const filePath = path.resolve(__dirname, fileName);
    const results = [];
    const stream = ultimateDependent({
      ultimateGlob: JS_GLOB,
      failOnMissing: true
    });
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('error', (err) => {
      assert.strictEqual(err.code, 'ENOENT');
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
});

describe('gulp-ultimate-dependent - TS', () => {
  it('return if self changed', (done) => {
    const fileName = 'files/entry-4.ts';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: TS_GLOB,
      extensions: ['.js', '.ts']
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 1);
      assert.ok(results[0].includes('files/entry-4.ts'));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return if immediate TS dependency changed', (done) => {
    const fileName = 'files/components/dep-1-5.ts';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: TS_GLOB,
      extensions: ['.js', '.ts']
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 1);
      assert.ok(results[0].includes('files/entry-4.ts'));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return if immediate JS dependency changed', (done) => {
    const fileName = 'files/components/dep-1-3.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: TS_GLOB,
      extensions: ['.js', '.ts']
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 2);
      assert.ok(results.some((r) => r.includes('files/entry-4.ts')));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return if last child dependency changed', (done) => {
    const fileName = 'files/components/dep-2-4.ts';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: TS_GLOB,
      extensions: ['.js', '.ts']
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 1);
      assert.ok(results.some((r) => r.includes('files/entry-4.ts')));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('return nothing if orphaned child dependency changed', (done) => {
    const fileName = 'files/components/dep-orphan.js';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: TS_GLOB,
      extensions: ['.js', '.ts']
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 0);
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('throw error on missing dependency', (done) => {
    const fileName = 'files/components/dep-1-6.ts';
    const filePath = path.resolve(__dirname, fileName);
    const results = [];
    const stream = ultimateDependent({
      ultimateGlob: TS_GLOB,
      extensions: ['.js', '.ts'],
      failOnMissing: true
    });
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('error', (err) => {
      assert.strictEqual(err.code, 'ENOENT');
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('ignores circular dependency', (done) => {
    const fileName = 'files/components/dep-circular-1.ts';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: TS_GLOB,
      extensions: ['.js', '.ts'],
      ignoreCircularDependency: true
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('finish', () => {
      assert.strictEqual(results.length, 1);
      assert.ok(results.some((r) => r.includes('files/entry-circular.ts')));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
  it('throws error on circular dependency', (done) => {
    const fileName = 'files/components/dep-circular-1.ts';
    const filePath = path.resolve(__dirname, fileName);
    const stream = ultimateDependent({
      ultimateGlob: TS_GLOB,
      extensions: ['.js', '.ts'],
      ignoreCircularDependency: false
    });
    const results = [];
    stream.on('data', (file) => { results.push(file.path); });

    stream.on('error', (err) => {
      assert.ok(err.message.startsWith('Circular dependency detected in'));
      done();
    });

    stream.write({ path: filePath});
    stream.end();
  });
});
