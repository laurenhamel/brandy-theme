'use strict';

var path = require('path');
var fs = require('fs-extra');
var Promise = require('bluebird');
var copy = Promise.promisify(fs.copy);

// Set your Sass project (the one you're generating docs for) path.
// Relative to this Gruntfile.
var projectPath = '../';

// Project path helper.
var project = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(projectPath);
  return path.resolve.apply(path, args);
};

// Project specific paths.
var dirs = {
  root: './',
  scss: 'scss',
  css: 'assets/css',
  images: 'assets/images',
  js: 'assets/js',
  template: 'views',
  src: project('brandy'),
  docs: project('brandy/docs')
};

// Tasks configuration.
var config = {

  dirs: dirs,

  sass: {
    options: {
      style: 'compressed'
    },
    develop: {
      files: [{
        expand: true,
        cwd: '<%= dirs.scss %>',
        src: ['*.scss'],
        dest: '<%= dirs.css %>',
        ext: '.css'
      }]
    }
  },

  watch: {
    scss: {
      files: ['<%= dirs.scss %>/**/*.scss'],
      tasks: ['sass:develop', 'autoprefixer:develop', 'dump:css']
    },
    js: {
      files: ['<%= dirs.js %>/**/*.js', '!<%= dirs.js %>/**/*.min.js'],
      tasks: ['jshint', 'babel', 'uglify:dist', 'dump:js']
    },
    template: {
      files: ['<%= dirs.template %>/**/*.handlebars'],
      tasks: ['sassdoc:develop']
    },
    config: {
      files: ['index.js', 'Gruntfile.js', '.babelrc', '.jshintrc'],
      tasks: ['sassdoc:develop'],
      options: {
        reload: true
      }
    }
  },

  browserSync: {
    options: {
      watchTask: true,
      server: {
        baseDir: '<%= dirs.docs %>'
      }
    },
    develop: {
      bsFiles: {
        src: [
          '<%= dirs.docs %>/*.html',
          '<%= dirs.docs %>/**/*.css',
          '<%= dirs.docs %>/**/*.js'
        ]
      }
    }
  },

  autoprefixer: {
    options: {
      browsers: ['last 2 version', '> 1%', 'ie 9']
    },
    develop: {
      files: [{
        expand: true,
        cwd: '<%= dirs.css %>',
        src: '{,*/}*.css',
        dest: '<%= dirs.css %>'
      }]
    }
  },

  uglify: {
    options: {},
    dist: {
      files: {
        '<%= dirs.js %>/main.min.js': ['<%= dirs.js %>/main.babel.js']
      }
    }
  },

  svgmin: {
    dist: {
      files: [{
        expand: true,
        cwd: '<%= dirs.images %>',
        src: '{,*/}*.svg',
        dest: '<%= dirs.images %>'
      }]
    }
  },

  imagemin: {
    dist: {
      files: [{
        expand: true,
        cwd: '<%= dirs.images %>',
        src: '{,*/}*.{gif,jpeg,jpg,png}',
        dest: '<%= dirs.images %>'
      }]
    }
  },

  // SassDoc compilation.
  // See: http://sassdoc.com/customising-the-view/
  sassdoc: {
    options: {
      verbose: true,
      dest: dirs.docs,
      package: '<%= dirs.src %>/package.json',
      config: '<%= dirs.src %>/.sassdocrc',
      //theme: dirs.root,
      // Disable cache to enable live-reloading.
      // Usefull for some template engines (e.g. Swig).
      cache: false,
    },
    develop: {
      src: '<%= dirs.src %>'
    }
  },
  
  babel: {
    dev: {
      files: {
        '<%= dirs.js %>/main.babel.js': '<%= dirs.js %>/main.js'
      }
    }
  },
  
  jshint: {
    options: {
      jshintrc: true
    },
    dev: {
      files: {
        src: ['<%= dirs.js %>/**/*.js', '!<%= dirs.js %>/**/*.{min,babel}.js']
      }
    }
  }

};


module.exports = function (grunt) {

  // Load all grunt tasks matching the `grunt-*` pattern.
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take.
  require('time-grunt')(grunt);


  grunt.initConfig(config);


  // Dump css or js files from theme into `docs/assets` whenever they get modified.
  // Prevent requiring a full SassDoc compilation.
  grunt.registerTask('dump', 'Dump CSS/JS to docs/assets', function () {
    var done = this.async();
    var target = this.args[0];
    var src = dirs[target];
    var dest = path.join(dirs.docs, 'assets', target);

    copy(src, dest).then(function () {
      grunt.log.ok('Dump: ' + src + ' copied to ' + path.relative(__dirname, dest));
      done();
    });
  });

  // Development task.
  // While working on a theme.
  grunt.registerTask('dev', 'Development task', function () {
    var tasks = ['browserSync:develop', 'watch'];
    var docs = fs.existsSync(dirs.docs);

    if (!docs) {
      grunt.log.ok('Running initial SassDoc compilation: ' + dirs.docs);
      tasks.unshift('sassdoc:develop');
    }

    grunt.task.run(tasks);
  });


  // Pre release/deploy optimisation tasks.
  grunt.registerTask('dist', [
    'uglify:dist',
    'newer:svgmin:dist',
    'newer:imagemin:dist',
    'dump:js',
    'dump:css',
    'dump:images'
  ]);
  
  grunt.registerTask('default', ['dev']);

};
