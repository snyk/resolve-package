module.exports = resolvePkg;
module.exports.sync = sync;

const fs = require('fs');
const path = require('path');
const debug = require('debug')('snyk:resolve');

function resolvePkg(name, basedir) {
  if (!basedir) {
    basedir = process.cwd();
  }

  const filename = path.resolve(basedir, 'node_modules', name, 'package.json');
  debug('%s: %s', name, filename);
  return fs.promises.stat(filename).then(function (stat) {
    if (stat.isFile()) {
      return path.dirname(filename);
    }
  }).catch(function () {
    debug('%s: not found on %s (root? %s)', name, basedir, isRoot(basedir));
    if (isRoot(basedir)) {
      debug('at root');
      const error = new Error('package not found ' + name);
      error.code = 'NO_PACKAGE_FOUND';
      throw error;
    }
  }).then(function (dir) {
    if (dir) {
      debug('%s: FOUND AT %s', name, dir);
      return dir;
    }

    debug('%s: cycling down', name);
    return resolvePkg(name, path.resolve(basedir, '..'));
  });
}

function sync(name, basedir) {
  if (!basedir) {
    basedir = process.cwd();
  }

  const filename = path.resolve(basedir, 'node_modules', name, 'package.json');
  debug('%s: %s', name, filename);

  const isFile = function (file) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return false;
      }
    }
    return stat.isFile() || stat.isFIFO();
  };

  if (isFile(filename)) {
    debug('%s: FOUND AT %s', name, filename);
    return path.dirname(filename);
  }

  if (isRoot(basedir)) {
    debug('%s: not found on %s (now at root)', name, filename);
    const error = new Error('package not found ' + name);
    error.code = 'NO_PACKAGE_FOUND';
    throw error;
  }

  debug('%s: cycling down', name);
  return sync(name, path.resolve(basedir, '..'));
}

function isRoot(dir) {
  const parsed = path.parse(dir);
  return parsed.root === parsed.dir && !parsed.base;
}
