var test = require('tap').test;
var proxyquire = require('proxyquire');
var Promise = require('es6-promise').Promise; // jshint ignore:line
var path = require('path');

var False = function () { return false; };
var True = function () { return true; };
var suceed = False;

var fs = {
  statSync: function (filename) {
    return {
      isFile: function () {
        return suceed(filename);
      },
      isFIFO: function () {
        return suceed(filename);
      },
    };
  },
  stat: function (filename) {
    if (!suceed(filename)) {
      return Promise.reject(new Error('not a file'));
    }
    return Promise.resolve({
      isFile: function () {
        return true;
      }
    });
  }
};

var resolve = proxyquire('../lib/index', {
  'then-fs': fs,
});

test('resolve immediately', function (t) {
  t.plan(2);

  suceed = True;

  resolve('foo').then(function () {
    t.pass('foo found');
  }).catch(function (e) {
    t.fail(e.stack);
  });

  t.ok(resolve.sync('foo'), 'sync should find immediately');
});

test('resolve never', function (t) {
  t.plan(2);
  suceed = False;

  resolve('foo').then(function () {
    t.fail('should result in NO_PACKAGE_FOUND');
  }).catch(function (e) {
    if (e.code === 'NO_PACKAGE_FOUND') {
      t.pass('not found');
    } else {
      t.fail(e.stack);
    }
  });

  t.throws(function () {
    resolve.sync('foo');
  }, /package not found foo/, 'sync should throw saying not found');
});

test('resolve if not found', function (t) {
  var statSync = fs.statSync;
  t.plan(3);
  t.test('setup', function (t) {
    fs.statSync = function () {
      var e = new Error('not found');
      e.code = 'ENOENT';
      throw e;
    };
    t.pass('setup complete');
    t.end();
  });

  t.test('resolve if not found (test)', function (t) {
    t.plan(1);
    t.throws(function () {
      resolve.sync('foo');
    }, /package not found foo/, 'sync should throw saying not found');
  });

  t.test('teardown', function (t) {
    fs.statSync = statSync;
    t.pass('teardown complete');
    t.end();
  });
});


test('resolve at root', function (t) {
  t.plan(2);

  var target = '/node_modules/foo';
  var base = __dirname + '/fixtures/bar';
  suceed = function (filename) {
    // console.log('%s ===? %s', filename, filename === target + '/package.json');
    return filename === target + '/package.json';
  };

  resolve('foo', base).then(function (dir) {
    t.equal(dir, target);
  }).catch(function (e) {
    if (e.code === 'NO_PACKAGE_FOUND') {
      t.fail('not found at root');
    } else {
      t.fail(e.stack, 'unknown error on search at root');
    }
  });

  t.equal(resolve.sync('foo', base), target, 'found module at root');
});

test('resolve works with scoped packages', function (t) {
  t.plan(2);

  var target = __dirname + '/node_modules/@remy/foo/package.json';
  suceed = function (filename) {
    return filename === target;
  };

  var base = __dirname + '/node_modules/@remy/foo/node_modules/semver/node_modules/bar';

  resolve('@remy/foo', base).then(function (dir) {
    t.equal(dir, path.dirname(target));
  }).catch(function (e) {
    console.log(e.stack);
    if (e.code === 'NO_PACKAGE_FOUND') {
      t.fail('not found');
    } else {
      t.fail(e.stack);
    }
  });

  t.equal(resolve.sync('@remy/foo', base), path.dirname(target), 'sync scoped matches');
});