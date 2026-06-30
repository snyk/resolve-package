const fs = require('fs');
const path = require('path');
const resolve = require('../lib/index');

afterEach(() => {
  jest.restoreAllMocks();
});

test('resolve immediately', async () => {
  jest.spyOn(fs.promises, 'stat').mockResolvedValue({ isFile: () => true });
  jest.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true, isFIFO: () => false });
  await resolve('foo');
  expect(resolve.sync('foo')).toBeTruthy();
});

test('resolve never', async () => {
  const notFound = Object.assign(new Error('not found'), { code: 'ENOENT' });
  jest.spyOn(fs.promises, 'stat').mockRejectedValue(notFound);
  jest.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => false, isFIFO: () => false });
  await expect(resolve('foo')).rejects.toMatchObject({ code: 'NO_PACKAGE_FOUND' });
  expect(() => resolve.sync('foo')).toThrow(/package not found foo/);
});

describe('resolve if not found', () => {
  beforeEach(() => {
    jest.spyOn(fs, 'statSync').mockImplementation(() => {
      const e = new Error('not found');
      e.code = 'ENOENT';
      throw e;
    });
  });

  test('sync should throw saying not found', () => {
    expect(() => resolve.sync('foo')).toThrow(/package not found foo/);
  });
});

test('resolve at root', async () => {
  const target = '/node_modules/foo';
  const base = `${__dirname}/fixtures/bar`;
  const targetFile = `${target}/package.json`;
  jest.spyOn(fs.promises, 'stat').mockImplementation((filename) => {
    if (filename === targetFile) return Promise.resolve({ isFile: () => true });
    return Promise.reject(Object.assign(new Error('not found'), { code: 'ENOENT' }));
  });
  jest.spyOn(fs, 'statSync').mockImplementation((filename) => ({
    isFile: () => filename === targetFile,
    isFIFO: () => false,
  }));

  const dir = await resolve('foo', base);
  expect(dir).toBe(target);
  expect(resolve.sync('foo', base)).toBe(target);
});

test('async: stat resolves as non-file, walks up to find package', async () => {
  const shallowFile = '/a/b/node_modules/foo/package.json';
  const deeperFile = '/a/node_modules/foo/package.json';
  jest.spyOn(fs.promises, 'stat').mockImplementation((filename) => {
    if (filename === shallowFile) return Promise.resolve({ isFile: () => false });
    if (filename === deeperFile) return Promise.resolve({ isFile: () => true });
    return Promise.reject(Object.assign(new Error('not found'), { code: 'ENOENT' }));
  });

  const dir = await resolve('foo', '/a/b');
  expect(dir).toBe('/a/node_modules/foo');
});

test('sync: non-ENOENT error from statSync propagates', () => {
  jest.spyOn(fs, 'statSync').mockImplementation(() => {
    throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
  });
  expect(() => resolve.sync('foo')).toThrow();
});

test('resolve works with scoped packages', async () => {
  const target = `${__dirname}/node_modules/@remy/foo/package.json`;
  const base = `${__dirname}/node_modules/@remy/foo/node_modules/semver/node_modules/bar`;
  jest.spyOn(fs.promises, 'stat').mockImplementation((filename) => {
    if (filename === target) return Promise.resolve({ isFile: () => true });
    return Promise.reject(Object.assign(new Error('not found'), { code: 'ENOENT' }));
  });
  jest.spyOn(fs, 'statSync').mockImplementation((filename) => ({
    isFile: () => filename === target,
    isFIFO: () => false,
  }));

  const dir = await resolve('@remy/foo', base);
  expect(dir).toBe(path.dirname(target));
  expect(resolve.sync('@remy/foo', base)).toBe(path.dirname(target));
});
