class Sidebar {
  
  constructor( config = {} ) {
    
    this.config = $.extend({
      
      // Collapsed class
      collapsedClass: 'is-collapsed',

      // Storage key
      storageKey: '_sassdoc_sidebar_index',

      // Index attribute
      indexAttribute: 'data-slug',

      // Toggle button
      toggleBtn: '.js-btn-toggle',

      // Automatic initialization
      init: true
      
    }, config);
    
    if( this.config.init === true ) this.init();
    
  }
  
  init() {
    
    this.config.nodes = $(`[${this.config.indexAttribute}]`);
    this.load();
    this.updateDOM();
    this.bind();
    this.loadToggle();
    
  }
  
  loadToggle() {
    
    $('<span />', {
      class: 'layout-toggle',
      html: '&times;',
      'data-alt': '&#8594;'
    }).appendTo( $('.header') );
    
    const $toggle = $('.layout-toggle');

    $toggle.on('click', (event) => {
      
      const $this = $(event.target).closest($toggle);

      $('body').toggleClass('sidebar-closed');

      const alt = $this.html();
      
      $this.html($this.data('alt'));
      $this.data('alt', alt);
      
    });
    
  }
  
  load() {
    
    let index = window.localStorage ? window.localStorage.getItem(this.config.storageKey) : null;

    this.index = index ? JSON.parse(index) : this.buildIndex();
    
  }
  
  buildIndex() {
    
    let index = {};

    this.config.nodes.each($.proxy(function (index, item) {
      
      let $item = $(item);

      index[$item.attr(this.config.indexAttribute)] = !$item.hasClass(this.config.collapsedClass);
      
    }, this));

    return index;
    
  }
  
  updateDOM() {

    for ( let item in this.index ) {
      
      if (this.index[item] === false) $(`[${this.config.indexAttribute}="${item}"]`).addClass(this.config.collapsedClass);

    }
    
  }
  
  save() {
    
    if ( !window.localStorage ) return;

    window.localStorage.setItem(this.config.storageKey, JSON.stringify(this.index));
    
  }
  
  bind() {
    
    var collapsed = false;

    // Save index in localStorage
    window.onbeforeunload = $.proxy(() => this.save(), this);

    // Toggle all
    $(this.config.toggleBtn).on('click', $.proxy((event) => {
      
      const $node = $(event.target);
      const text = $node.attr('data-alt');
      
      $node.attr('data-alt', $node.text());
      $node.text(text);

      const fn = collapsed === true ? 'removeClass' : 'addClass';

      this.config.nodes.each($.proxy(function (index, item) {
        
        const $item = $(item);
        const slug = $item.attr(this.config.indexAttribute);

        this.index[slug] = collapsed;

        $(`[${this.config.indexAttribute}="${slug}"]`)[fn](this.config.collapsedClass);
        
      }, this));

      collapsed = !collapsed;
      
      this.save();
      
    }, this));

    // Toggle item
    this.config.nodes.on('click', $.proxy((event) => {
      
      const $item = $(event.target);
      const slug = $item.attr(this.config.indexAttribute);

      // Update index
      this.index[slug] = !this.index[slug];

      // Update DOM
      $item.toggleClass(this.config.collapsedClass);
      
    }, this));
    
  }
  
}

class Search {
  
  constructor( config = {} ) {
    
    this.config = $.extend({
      
      // Search DOM
      search: {
        items: '.sassdoc__item',
        input: '#js-search-input',
        form: '#js-search',
        suggestionsWrapper: '#js-search-suggestions'
      },

      // Fuse options
      fuse: {
        keys: ['name'],
        threshold: 0.3
      },

      init: true
      
    }, config);
    
    if( this.config.init === true ) this.init();
    
  }
  
  init() {
    
    // Fuse engine instanciation
    this.index = new Fuse($.map($(this.config.search.items), (item) => {

      const $item = $(item);

      return {
        group: $item.data('group'),
        name: $item.data('name'),
        type: $item.data('type'),
        node: $item
      };
      
    }), this.config.fuse);
    
    this.initSearch();
    
  }
  
  fillSuggestions( items ) {
    
    let searchSuggestions = $(this.config.search.suggestionsWrapper);
    
    searchSuggestions.html('');

    var suggestions = $.map(items.slice(0, 10), (item) => {
      
      const $li = $('<li />', {
        'data-group': item.group,
        'data-type': item.type,
        'data-name': item.name,
        'html': `<a href="#${item.group}-${item.type}-${item.name}"><code>${item.type.slice(0, 3)}</code>${item.name}</a>`
      });

      searchSuggestions.append($li);
      
      return $li;
      
    });

    return suggestions;
    
  }
  
  search( term ) { return this.fillSuggestions(this.index.search(term)); }
  
  initSearch() {
    
    const searchForm = $(this.config.search.form);
    const searchInput = $(this.config.search.input);
    const searchSuggestions = $(this.config.search.suggestionsWrapper);

    var currentSelection = -1;
    var suggestions = [];
    var selected;

    var self = this;

    // Clicking on a suggestion
    searchSuggestions.on('click', (e) => {
      
      const target = $(event.target);

      if (target.nodeName === 'A') {
        
        searchInput.val(target.parent().data('name'));
        suggestions = self.fillSuggestions([]);
        
      }
      
    });

    // Filling the form
    searchForm.on('keyup', (e) => {
      
      e.preventDefault();

      // Enter
      if ( e.keyCode === 13 ) {
        
        if (selected) {
          
          suggestions = self.fillSuggestions([]);
          searchInput.val(selected.data('name'));
          window.location = selected.children().first().attr('href');
          
        }

        e.stopPropagation();
      }

      // Down
      if ( e.keyCode === 40 ) {
        
        currentSelection = (currentSelection + 1) % suggestions.length;
        
      }

      // Up
      if ( e.keyCode === 38 ) {
        
        currentSelection = currentSelection - 1;

        if (currentSelection < 0) currentSelection =  suggestions.length - 1;

      }

      if ( suggestions[currentSelection] ) {
        
        if (selected) selected.removeClass('selected');

        selected = suggestions[currentSelection];
        selected.addClass('selected');
        
      }

    });

    searchInput.on('keyup', (e) => {
      
      if (e.keyCode !== 40 && e.keyCode !== 38) {
        
        currentSelection = -1;
        suggestions = self.search($(this).val());
        
      }

      else e.preventDefault();

    }).on('search', () => {
      
      suggestions = self.search($(this).val());
      
    });
    
  }
  
}

class App {
  
  constructor( config = {} ) {
    
    this.config = $.extend({
      
      // Search module
      search: new Search(),

      // Sidebar module
      sidebar: new Sidebar(),
      
      // Code preview helpers
      indentSpaces: true,
      indentSize: 2,
      indentUp: ['{', '('],
      indentDown: ['}', ')'],
      indentClass: 'js-autoindent',

      // Initialisation
      init: true
      
    }, config);
    
    this.__lastChar = function( string ) { return string.trim()[string.trim().length - 1] || ''; };
    this.__firstChar = function( string ) { return string.trim()[0] || ''; };
    
    if( this.config.init !== false ) this.init();
    
  }
  
  init() {
    
    this.codePreview();
    
  }
  
  autoIndent( code ) {
    
    code = code.split(/\r?\n/);
    
    const indentChar = this.config.indentSpaces ? ' '.repeat(this.config.indentSize) : "\t";

    let prevIndents = code[0].search(/\S/) / indentChar.length;
    let prevChar = code[0] ? this.__lastChar(code[0]) : '';
    let nextChar = code[1] ? this.__firstChar(code[1]) : '';

    return code.map((line, index, array) => {

      const lineCode = line.trim();

      let currIndents = prevIndents;

      if( index !== 0 ) {
      
        if( this.config.indentUp.includes(prevChar) ) ++currIndents;
        if( this.config.indentDown.includes(nextChar) ) --currIndents;
        
      }

      const lineIndents = indentChar.repeat(currIndents);

      prevIndents = currIndents;
      prevChar = this.__lastChar(lineCode);
      nextChar = array[index + 1] ? this.__firstChar(array[index + 1]) : '';

      return `${lineIndents}${lineCode}`;

    }, this).join("\n");
    
  }
  
  codePreview() {
    
    const $autos = $(`.${this.config.indentClass}`); 
    const $toggle = $('.item__code--togglable');
      
    $autos.each((i, auto) => { 

      const $code = $(auto).is('code') ? $(auto) : $(auto).find('code');

      $code.html(this.autoIndent($code.html()));

    }).bind(this);

    $toggle.on('click', () => {
      
      const $item = $(event.target).closest($toggle);
      const $code = $item.find('code');
      const switchTo = $item.attr('data-current-state') === 'expanded' ? 'collapsed' : 'expanded';
      const code = this.autoIndent( $item.attr(`data-${switchTo}`) );

      $item.attr('data-current-state', switchTo);
      $code.html(code);
      Prism.highlightElement($code[0]);
      
    });
    
  }
  
}

var app = new App();