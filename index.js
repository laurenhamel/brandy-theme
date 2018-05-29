/**
 * Utility function we will use to merge a default configuration
 * with the user object.
 */
const extend = require('extend');

/**
 * Handlebars helper plugins
 */
const chroma = extend(require('chroma-js'), {
  
  isColor( value ) { try { this(value); return true; } catch(error) { return false; } },
  
  isEqual( a, b ) { return chroma(a) == chroma(b); },
  
  inverse( color, light = null, dark = null, step = .05 ) { 
    
    const threshold = [7, 4.5];
  
    const contrast = {light: null, dark: null, best: 0};
    
    if( light && dark ) {
      
      let best;
      
      contrast.light = chroma.contrast(color, light);
      contrast.dark = chroma.contrast(color, dark);
      
      if( contrast.light > contrast.dark ) {
        
        if( threshold.map((t) => contrast.light >= t).indexOf(true) > -1 ) return light;
        
        if( Math.max(contrast.best, contrast.light) == contrast.light ) {
          
          best = light;
          contrast.best = contrast.light;
          
        }
        
      }
      
      else {
        
        if( threshold.map((t) => contrast.dark >= t).indexOf(true) > -1 ) return dark;
        
        if( Math.max(contrast.best, contrast.dark) == contrast.dark ) {
          
          best = dark;
          contrast.best = contrast.dark;
          
        }
        
      }
      
      return best;
      
    }
    
    else {
      
      light = color;
      dark = color;
      
      const done = function() {
        
        if( chroma.isEqual(light, 'white') && chroma.isEqual(dark, 'black') ) return true;
        
        if( contrast.light >= threshold[0] || contrast.dark >= threshold[0] ) return true;
        
        if( contrast.light >= threshold[1] || contrast.dark >= threshold[1] ) return true;
        
        return false;
        
      };
      
      do {
      
        light = chroma(light).brighten(step);
        dark = chroma(dark).darken(step);
        
        contrast.light = chroma.contrast(color, light);
        contrast.dark = chroma.contrast(color, dark);
      
      } while( done() === false )
  
      return contrast.light > contrast.dark ? light : dark;

    }
    
  }
  
});

/**
 * Rendering engine helpers for handlebars.js
 */
const helpers = extend({
  
  chroma(color, method = null, ...options ) {

    const source = options.pop();

    const methods = [
      'mix',
      'scale',
      'bezier',
      'average',
      'blend',
      'random',
      'contrast',
      'distance',
      'deltaE',
      'limits',
      'temparature',
      'cubehelix',
      'inverse',
      'isEqual'
    ];
    
    const filters = [
      'alpha',
      'darken',
      'brighten',
      'saturate',
      'desaturate',
      'luminance',
      'mode',
      'gamma'
    ];
    
    const getters = [
      'hex',
      'name', 
      'css',
      'rgb',
      'rgba',
      'hsl',
      'hsv',
      'hsi',
      'lab',
      'lch',
      'hcl',
      'temparature',
      'gl',
    ];
    
    const scale = [
      'mode',
      'gamma',
      'padding',
      'cache',
      'correctLightness',
      'colors',
      'classes',
      'domain'
    ];
    
    const cubehelix = [
      'start',
      'rotations',
      'hue',
      'gamma',
      'lightness'
    ];
    
    // Normalize arguments.
    if( methods.includes(color) ) {
      
      let temp = color;
      
      color = method;
      method = temp;
      
    }
  
    else if( method.indexOf('=') > -1 || !methods.includes(method) ) {
      
      options.unshift(method);
      method = null;
      
    }
    
    // Normalize colors.
    if( methods.includes(color) || filters.includes(color) || getters.includes(color) ) {
      
      options.unshift(color);
      color = undefined;
      
    }
    
    else if( /\[ *(?:([^,\[\]]*?)(?=\,|\])\,? *)* *\]/.test(color) ) {
      
      color = color.replace(/\[|\]/g, '').split(',').map((c) => c.trim().replace(/\'|\"/g, ''));
      
    } 

    // Handle color checks.
    if( color && method == 'isColor' ) return chroma.isColor(color);

    // Verify color.
    if( !Array.isArray(color) ) {
      
      if( !color && !method ) return;
      
      if( !chroma.isColor(color) && !['cubehelix', 'scale', 'random'].includes(method) ) return;
      
    }

    // Initialize result.
    let result;
    
    // Handle method implementations.
    if( method ) {
    
      if( method == 'scale' ) result = chroma[method](color);
    
      else {
    
        if( Array.isArray(color) ) result = chroma[method](...color);
    
        else result = chroma[method](color);
    
      }
    
    }
    
    else result = chroma(color);

    // Handle options.
    if( options.length > 0 ) {
      
      // Convert the options into an object.
      options = options.map((option) => option.trim().split('=')).reduce((object, option) => {
        
        object[option[0]] = option[1];
        
        return object;
        
      }, {});

      // Extract getters.
      const get = Object.keys(options).filter((option) => {
        
        return getters.includes(option);
        
      });
      
      // Loop through options.
      for( let key in options ) {
        
        // Remove any getters.
        if( get.includes(key) ) {
          
          delete options[key];
          
          continue;
          
        }
        
        // Get the value.
        let value = options[key];
        
        // Normalize truthy values.
        if( value === true ) value = undefined;
        
        // Verify methods.
        switch( method ) {
          
          case 'scale':
            
            if( !scale.includes(key) ) continue;
            
            break;
            
          case 'cubehelix':
            
            if( !cubehelix.includes(key) ) continue;
            
            break;
            
          default:
            
            if( !filters.concat(['scale']).includes(key) ) continue;
            
            break;
            
        }
 
        // Apply option.
        if( result[key] ) result = result[key](value);
        
      }
      
      // Only use getters if given.
      if( get.length > 0 ) {
      
        // Initialize gotten values.
        let gotten = {};

        // Handle getters.
        for( let getter of get ) {

          gotten[getter] = result[getter]();

        }

        // Use the gotten values.
        result = gotten;
        
      }
      
    }
    
    // Return.
    return result;
    
  },
  
  set(key, value, context) {
  
    context[key] = value;
    
  },
  
  unset(key, context) {
    
    delete context[key];
    
  },
  
  concat() { 
    
    return Array.from(arguments).slice(0, -1).join('');
    
  },
  
  indexOf( lookup, value ) {
    
    if( !Array.isArray(lookup) && typeof lookup !== 'string' ) return -1;
  
    return lookup.indexOf(value);
    
  },
  
  formatParamType( value ) {
    
    return value
            .split('|')
            .map((x) => helpers.capitalize(x.trim()))
            .join('</code> or <code>');
    
  }
  
}, require('handlebars-helpers')());

/**
 * Themeleon template helper
 *
 * See <https://github.com/themeleon/themeleon>.
 */
const themeleon = require('themeleon')().use('consolidate');

/**
 * SassDoc extras (providing Markdown and other filters, and different way to
 * index SassDoc data).
 *
 * See <https://github.com/SassDoc/sassdoc-extras>.
 */
const extras = require('sassdoc-extras');

/**
 * Utility functions used for file handling
 */
const fs = require('fs');
const path = require('path');

/**
 *  Utility function for recursively reading partials
 */
fs.walkdirSync = function( dir, list = [], root ) {
  
  const files = fs.readdirSync(dir);
  
  if( !root ) root = path.normalize(dir.substring(0, dir.lastIndexOf('/')) + '/');
  
  files.forEach((file) => {
    
    if( fs.statSync(path.join(dir, file)).isDirectory() ) {
      
      list = fs.walkdirSync(path.join(dir, file), list, root);
      
    }
    
    else list.push(path.join(dir.replace(root, ''), file));
    
  });
  
  return list;
  
};

/**
 * The theme function. You can directly export it like this:
 *
 *     module.exports = themeleon(__dirname, function (t) {});
 *
 * ... but here we want more control on the template variables, so there
 * is a little bit of preprocessing below.
 *
 * The theme function describes the steps to render the theme.
 */
const theme = themeleon(__dirname, function (t) { 
  
  /**
   * Copy the assets folder from the theme's directory in the
   * destination directory.
   */
  t.copy('assets');
  
  /**
   * Read in the contents of the partials directory recursively, then 
   * format them as an object, using a unique identifier and path location
   */
  const partials = fs.walkdirSync(path.resolve(__dirname, 'views/partials')).reduce((object, partial) => {
      
      const ext = path.extname(partial);
      
      object[partial.replace('partials/', '').replace(ext, '')] = partial.replace(ext, '');
      
      return object;
      
    }, {});

  /**
   * Initialize data set
   */
  const data = extend(t.ctx, {
    partials,
    helpers
  });

  /**
   * Render `views/index.handlebars` with the theme's context (`ctx` below)
   * as `index.html` in the destination directory.
   */
  t.handlebars('views/index.handlebars', 'index.html', data);
  
});

/**
 * Actual theme function. It takes the destination directory `dest`
 * (that will be handled by Themeleon), and the context variables `ctx`.
 *
 * Here, we will modify the context to have a `view` key defaulting to
 * a literal object, but that can be overriden by the user's
 * configuration.
 */
module.exports = function (dest, ctx) {
  const def = {
    display: {
      access: ['public', 'private'],
      alias: false,
      watermark: true,
    },
    groups: {
      'undefined': 'General',
    },
    'shortcutIcon': 'http://sass-lang.com/favicon.ico',
  };

  // Apply default values for groups and display.
  ctx.groups = extend(def.groups, ctx.groups);
  ctx.display = extend(def.display, ctx.display);

  // Extend top-level context keys.
  ctx = extend({}, def, ctx);

  /**
   * Parse text data (like descriptions) as Markdown, and put the
   * rendered HTML in `html*` variables.
   *
   * For example, `ctx.package.description` will be parsed as Markdown
   * in `ctx.package.htmlDescription`.
   *
   * See <http://sassdoc.com/extra-tools/#markdown>.
   */
  extras.markdown(ctx);

  /**
   * Add a `display` property for each data item regarding of display
   * configuration (hide private items and aliases for example).
   *
   * You'll need to add default values in your `.sassdocrc` before
   * using this filter:
   *
   *     {
   *       "display": {
   *         "access": ["public", "private"],
   *         "alias": false
   *       }
   *     }
   *
   * See <http://sassdoc.com/extra-tools/#display-toggle>.
   */
  extras.display(ctx);

  /**
   * Allow the user to give a name to the documentation groups.
   *
   * We can then have `@group slug` in the docblock, and map `slug`
   * to `Some title string` in the theme configuration.
   *
   * **Note:** all items without a group are in the `undefined` group.
   *
   * See <http://sassdoc.com/extra-tools/#groups-aliases>.
   */
  extras.groupName(ctx);

  /**
   * Use SassDoc indexer to index the data by group and type, so we
   * have the following structure:
   *
   *     {
   *       "group-slug": {
   *         "function": [...],
   *         "mixin": [...],
   *         "variable": [...]
   *       },
   *       "another-group": {
   *         "function": [...],
   *         "mixin": [...],
   *         "variable": [...]
   *       }
   *     }
   *
   * You can then use `data.byGroupAndType` instead of `data` in your
   * templates to manipulate the indexed object.
   */
  ctx.data.byGroupAndType = extras.byGroupAndType(ctx.data);

  // Avoid key collision with Handlebars default `data`.
  // @see https://github.com/SassDoc/generator-sassdoc-theme/issues/22
  ctx._data = ctx.data;
  delete ctx.data;

  /**
   * Now we have prepared the data, we can proxy to the Themeleon
   * generated theme function.
   */
  return theme.apply(this, arguments);
};
