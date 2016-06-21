'use strict';

require('mocha');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var generate = require('generate');
var gm = require('global-modules');
var existsSync = require('fs-exists-sync');
var del = require('delete');
var generator = require('./');
var app;

var actual = path.resolve.bind(path, __dirname, 'actual');

function exists(name, cb) {
  var filepath = actual(name);

  return function(err) {
    if (err) return cb(err);

    fs.stat(filepath, function(err, stat) {
      if (err) return cb(err);
      assert(stat);
      // del(path.dirname(filepath), cb);
      cb();
    });
  };
}

describe('generate-contributing', function() {
  beforeEach(function() {
    app = generate({silent: true});
    app.cwd = actual();
    app.option('dest', actual());
    app.option('askWhen', 'not-answered');

    // provide template data to avoid prompts
    app.data({
      author: {
        name: 'Jon Schlinkert',
        username: 'jonschlnkert',
        url: 'https://github.com/jonschlinkert'
      },
      project: {
        name: 'foo',
        description: 'bar',
        version: '0.1.0'
      }
    });
  });

  describe('plugin', function() {
    it('should only register the plugin once', function(cb) {
      var count = 0;
      app.on('plugin', function(name) {
        if (name === 'generate-contributing') {
          count++;
        }
      });
      app.use(generator);
      app.use(generator);
      app.use(generator);
      assert.equal(count, 1);
      cb();
    });

    it('should extend tasks onto the instance', function() {
      app.use(generator);
      assert(app.tasks.hasOwnProperty('default'));
      assert(app.tasks.hasOwnProperty('contributing'));
    });

    it('should run the `default` task with .build', function(cb) {
      app.use(generator);
      app.build('default', exists('contributing.md', cb));
    });

    it('should run the `default` task with .generate', function(cb) {
      app.use(generator);
      app.generate('default', exists('contributing.md', cb));
    });

    it('should run the `contributing` task with .build', function(cb) {
      app.use(generator);
      app.build('contributing', exists('contributing.md', cb));
    });

    it('should run the `contributing` task with .generate', function(cb) {
      app.use(generator);
      app.generate('contributing', exists('contributing.md', cb));
    });
  });

  if (!process.env.CI && !process.env.TRAVIS) {
    if (!existsSync(path.resolve(gm, 'generate-contributing'))) {
      console.log('generate-contributing is not installed globally, skipping CLI tests');
    } else {
      describe('generator (CLI)', function() {
        it('should run the default task using the `generate-contributing` name', function(cb) {
          app.use(generator);
          app.generate('generate-contributing', exists('contributing.md', cb));
        });

        it('should run the default task using the `contributing` generator alias', function(cb) {
          app.use(generator);
          app.generate('contributing', exists('contributing.md', cb));
        });

        it('should run the contributing task explicitly using the `contributing` generator alias', function(cb) {
          app.use(generator);
          app.generate('contributing:contributing', exists('contributing.md', cb));
        });
      });
    }
  }

  describe('generator (API)', function() {
    it('should run the default task on the generator', function(cb) {
      app.register('contributing', generator);
      app.generate('contributing', exists('contributing.md', cb));
    });

    it('should run the `default` task when defined explicitly', function(cb) {
      app.register('contributing', generator);
      app.generate('contributing:default', exists('contributing.md', cb));
    });

    it('should run the `contributing` task', function(cb) {
      app.register('contributing', generator);
      app.generate('contributing:contributing', exists('contributing.md', cb));
    });
  });

  describe('sub-generator', function() {
    it('should work as a sub-generator', function(cb) {
      app.register('foo', function(foo) {
        foo.register('contributing', generator);
      });
      app.generate('foo.contributing', exists('contributing.md', cb));
    });

    it('should run the `default` task by default', function(cb) {
      app.register('foo', function(foo) {
        foo.register('contributing', generator);
      });
      app.generate('foo.contributing', exists('contributing.md', cb));
    });

    it('should run the `contributing:default` task when defined explicitly', function(cb) {
      app.register('foo', function(foo) {
        foo.register('contributing', generator);
      });
      app.generate('foo.contributing:default', exists('contributing.md', cb));
    });

    it('should run the `contributing:contributing` task', function(cb) {
      app.register('foo', function(foo) {
        foo.register('contributing', generator);
      });
      app.generate('foo.contributing:contributing', exists('contributing.md', cb));
    });

    it('should work with nested sub-generators', function(cb) {
      app
        .register('foo', generator)
        .register('bar', generator)
        .register('baz', generator);

      app.generate('foo.bar.baz', exists('contributing.md', cb));
    });
  });
});
