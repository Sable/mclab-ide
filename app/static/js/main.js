function Tab(li, session, editor) {
  this.li = li;
  this.li.data('tab', this);
  this.session = session;
  this.editor = editor;
};

Tab.prototype.getSiblings = function() {
  return this.li.siblings().map(function (i, li) {
    return $(li).data('tab');
  });
};

Tab.prototype.unselect = function() {
  this.li.removeClass('active');
};

Tab.prototype.select = function() {
  this.li.addClass('active');
  this.getSiblings().each(function (i, tab) { tab.unselect(); });
  this.editor.editor.setSession(this.session);
};

Tab.prototype.close = function() {
  this.li.remove();
};

function TabbedEditor(id, aceId) {
  this.el = $('#' + id);
  this.editor_el = $('#' + aceId);
  this.editor = ace.edit(aceId);
  this.editor.setTheme('ace/theme/solarized_dark');
  this.editor.setFontSize(14);
  this.editor.setSession(this.newSession(''));
  this.editor.resize();
  this.editor.focus();

  $(window).resize(this.resizeAce.bind(this));
  this.resizeAce();

  this.tabs = {};

  this.el.find('ul.editor-tabs')
    .on('click', 'li:not(.editor-add-file)', function () {
      $(this).data('tab').select();
    })
    .on('click', 'span.glyphicon-remove', function() {
      $(this).parents('li').first().data('tab').close();
      return false;
    });

  this.newTabButton = this.el.find('.editor-add-file').first();
  this.newTabButton.on('click', (function () {
    var filename = prompt('Name: ');
    if (/[^\s]/.test(filename)) {
      this.createTab(filename).select();
    }
  }).bind(this));
};


TabbedEditor.prototype.getTabLabeled = function(name) {
  return this.tabs[name];
};

TabbedEditor.prototype.hasTabLabeled = function(name) {
  return name in this.tabs;
}

var makeIcon = function(icon) {
  return $('<span>').addClass('glyphicon glyphicon-' + icon);
}

TabbedEditor.prototype.createTab = function(filename, contents) {
  if (contents === undefined) {
    contents = '';
  }
  var li = $('<li>').append($('<a>').attr('href', '#').append(
    filename, '&nbsp;', makeIcon('remove')));
  li.insertBefore(this.newTabButton);
  this.tabs[filename] = new Tab(li, this.newSession(contents), this);
  return this.tabs[filename];
}

TabbedEditor.prototype.newSession = function(text) {
  var session = ace.createEditSession(text, 'ace/mode/matlab');
  session.setUseSoftTabs(true);
  return session;
}

TabbedEditor.prototype.resizeAce = function() {
    var height = $(window).height();
    this.editor_el.height(3 * height / 4);
    this.editor.resize();
    // TODO(isbadawi): This shouldn't be here
    $('#console').height(height / 4);
    ace.edit('console').resize();
};

TabbedEditor.prototype.overlayErrors = function(errors) {
  if (errors === undefined) {
    errors = [];
  }
  this.editor.getSession().setAnnotations(
    errors.map(function (err) {
      return {
        row: err.line - 1,
        column: err.col - 1,
        text: err.message,
        type: 'error'
      };
    })
  );
};

TabbedEditor.prototype.tryParse = function() {
  Ajax.parseCode(this.editor.getValue(), (function (data) {
    this.overlayErrors(data.errors);
  }).bind(this));
};

TabbedEditor.prototype.startSyntaxChecker = function() {
  var typingTimer = null;
  var doneTypingInterval = 1000;

  var doneTyping = (function() {
    this.tryParse();
    typingTimer = null;
  }).bind(this);

  this.editor.on('change', function() {
    if (typingTimer != null) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
  });
};

var getPathFromTreeNode = function (node) {
  var parts = [];
  while (node.name !== undefined) {
    parts.unshift(node.name);
    node = node.parent;
  }
  return parts.join('/'); 
}

var Ajax = {
  parseCode: function(code, callback) {
    $.ajax({
      url: '/parse',
      method: 'POST',
      contentType: 'text/plain',
      data: code,
      dataType: 'json',
      success: callback,
    });
  },
  readFile: function(path, callback) {
    $.get('/read?path=' + encodeURIComponent(path), callback);
  },
  writeFile: function(path, contents) {
    $.post({
      url: '/write',
      data: {'path': path, 'contents': contents}
    });
  },
};

$(function() {
  var editor = new TabbedEditor('editor', 'editor-buffer');
  editor.startSyntaxChecker();

  var console = ace.edit('console');
  console.setTheme('ace/theme/solarized_light');
  console.setFontSize(14);
  console.setReadOnly(true);
  console.setHighlightActiveLine(false);
  console.renderer.setShowGutter(false);

  $('#projects').tree({
    dataUrl: '/projects',
    selectable: false,
  });
  $('#projects').on('tree.dblclick', function(e) {
    if (e.node.children.length > 0) {
      return;
    }
    var path = getPathFromTreeNode(e.node);
    if (editor.hasTabLabeled(path)) {
      editor.getTabLabeled(path).select();
    } else {
      Ajax.readFile(path, function (data) {
        editor.createTab(path, data).select();
      });
    }
  });
}); 
