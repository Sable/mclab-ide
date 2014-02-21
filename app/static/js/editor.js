mclab = window.mclab || {};
mclab.editor = mclab.editor || {};

mclab.editor.Tab = function (li, label, session, editor) {
  this.li = li;
  this.label = label;
  this.li.data('tab', this);
  this.session = session;
  this.editor = editor;
};

mclab.editor.Tab.prototype.getSiblings = function() {
  return this.li.siblings().map(function (i, li) {
    return $(li).data('tab');
  });
};

mclab.editor.Tab.prototype.getClosestTab = function() {
  var tab = this.li.prev('li');
  if (tab.length === 0) {
    tab = this.li.next('li');
  }
  if (tab.length !== 0) {
    return tab.data('tab') || null;
  }
  return null;
}

mclab.editor.Tab.prototype.isSelected = function() {
  return this.li.hasClass('active');
};

mclab.editor.Tab.prototype.unselect = function() {
  this.li.removeClass('active');
};

mclab.editor.Tab.prototype.select = function() {
  this.li.addClass('active');
  this.getSiblings().each(function (i, tab) { tab.unselect(); });
  this.editor.editor.setSession(this.session);
};

mclab.editor.Tab.prototype.close = function() {
  if (this.isSelected()) {
    var tab = this.getClosestTab();
    if (tab !== null) {
      tab.select();
    }
  }

  this.editor.removeTabLabeled(this.label);
  this.li.remove();
};

mclab.editor.TabbedEditor = function(id, aceId) {
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


mclab.editor.TabbedEditor.prototype.getTabLabeled = function(name) {
  return this.tabs[name];
};

mclab.editor.TabbedEditor.prototype.hasTabLabeled = function(name) {
  return name in this.tabs;
}

mclab.editor.TabbedEditor.prototype.removeTabLabeled = function(name) {
  delete this.tabs[name];
}

mclab.editor.TabbedEditor.prototype.createTab = function(filename, contents) {
  if (contents === undefined) {
    contents = '';
  }
  var li = $('<li>').append($('<a>').attr('href', '#').append(
    filename, '&nbsp;', mclab.utils.makeIcon('remove')));
  li.insertBefore(this.newTabButton);
  this.tabs[filename] = new mclab.editor.Tab(li, filename, this.newSession(contents), this);
  return this.tabs[filename];
}

mclab.editor.TabbedEditor.prototype.newSession = function(text) {
  var session = ace.createEditSession(text, 'ace/mode/matlab');
  session.setUseSoftTabs(true);
  return session;
}

mclab.editor.TabbedEditor.prototype.resizeAce = function() {
    var height = $(window).height();
    this.editor_el.height(3 * height / 4);
    this.editor.resize();
    // TODO(isbadawi): This shouldn't be here
    $('#console').height(height / 4);
    ace.edit('console').resize();
};

mclab.editor.TabbedEditor.prototype.overlayErrors = function(errors) {
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

mclab.editor.TabbedEditor.prototype.tryParse = function() {
  mclab.ajax.parseCode(this.editor.getValue(), (function (data) {
    this.overlayErrors(data.errors);
  }).bind(this));
};

mclab.editor.TabbedEditor.prototype.startSyntaxChecker = function() {
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

mclab.editor.TabbedEditor.prototype.openFile = function(path) {
  if (this.hasTabLabeled(path)) {
    this.getTabLabeled(path).select();
    return;
  }
  var self = this;
  mclab.ajax.readFile(path, function (data) {
    self.createTab(path, data).select();
  });
};
