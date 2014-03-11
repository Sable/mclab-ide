ide.editor = (function() {
  var Editor = function(id, aceId) {
    this.el = $('#' + id);
    this.editor_el = $('#' + aceId);
    this.editor = createAceEditor(aceId);

    this.addKeyboardShortcut('save', 'S', this.saveCurrentFile.bind(this));

    $(window).resize((function() {
      var height = $(window).height();
      this.editor_el.height(3 * height / 4);
      this.editor.resize();
      // TODO(isbadawi): This shouldn't be here
      $('#console').height(height / 4);
      ace.edit('console').resize();
    }).bind(this));
    $(window).trigger('resize');

    var ul = this.el.find('ul.editor-tabs').first();
    this.sessions = {};
    this.asts = {};
    this.tabs = new ide.tabs.TabManager(ul)
      .on('all_tabs_closed', this.hide.bind(this))
      .on('tab_select', (function (e, path) {
        if (!(path in this.sessions)) {
          this.createSession(path, '');
        }
        this.editor.setSession(this.sessions[path]);
        this.show();
      }).bind(this));
    this.hide();
  };

  var createAceEditor = function(el) {
    var editor = ace.edit(el);
    // TODO(isbadawi): These could be configurable.
    editor.setTheme('ace/theme/solarized_dark');
    editor.setFontSize(14);
    editor.setShowPrintMargin(false);
    editor.resize();
    editor.focus();
    return editor;
  };

  var createEditSession = function(text) {
    var session = ace.createEditSession(text, 'ace/mode/matlab');
    // TODO(isbadawi): These could also be configurable.
    session.setUseSoftTabs(true);
    return session;
  };

  Editor.prototype.createSession = function(path, text) {
    this.sessions[path] = createEditSession(text);
  };

  Editor.prototype.addKeyboardShortcut = function(name, key, action) {
    this.editor.commands.addCommand({
      name: name,
      bindKey: {
        win: 'Ctrl-' + key,
        mac: 'Command-' + key,
      },
      exec: action,
    });
  };

  Editor.prototype.openFile = function(path, callback) {
    if (this.tabs.hasTabLabeled(path)) {
      this.tabs.getTabLabeled(path).select();
      if (callback) {
        callback();
      }
      return;
    }
    ide.ajax.readFile(path, (function (contents) {
      this.createSession(path, contents);
      this.tabs.createTab(path).select();
      this.tryParse();
      if (callback) {
        callback();
      }
    }).bind(this));
  }

  Editor.prototype.getCurrentFile = function() {
    return this.tabs.getSelectedTab().label;
  }

  Editor.prototype.saveCurrentFile = function() {
    ide.ajax.writeFile(this.getCurrentFile(), this.editor.getValue());
  };

  Editor.prototype.jumpTo = function(token) {
    console.log('Jumping to ' + JSON.stringify(token));
    this.openFile(token.file, (function() {
      this.editor.getSelection().moveTo(token.line - 1, token.col - 1);
    }).bind(this));
  };

  Editor.prototype.getTokenFromMouseEvent = function(e) {
    var position = e.getDocumentPosition();
    var token = this.editor.getSession().getTokenAt(position.row, position.column);
    return {
      identifier: token.value,
      file: this.getCurrentFile(),
      line: position.row + 1,
      col: token.start + 1
    };
  }

  Editor.prototype.onFunctionCallClicked = function(callback) {
    this.editor.on('click', (function(e) {
      if (!e.getAccelKey()) {
        return;
      }
      if (!this.hasAst()) {
        ide.utils.flashError('There are parse errors.')
        return;
      }
      var token = this.getTokenFromMouseEvent(e);
      if (this.isFunctionCall(token)) {
        callback(token);
      }
    }).bind(this));
  }

  Editor.prototype.isFunctionCall = function(token) {
    return this.getAst()
      .find('NameExpr', {line: token.line, col: token.col})
      .isFunctionCall();
  };

  Editor.prototype.hasAst = function() {
    return this.getCurrentFile() in this.asts;
  }

  Editor.prototype.getAst = function() {
    return this.asts[this.getCurrentFile()];
  };

  Editor.prototype.hide = function() {
    this.editor_el.css('visibility', 'hidden');
  };

  Editor.prototype.show = function() {
    this.editor_el.css('visibility', 'visible');
  };

  Editor.prototype.clearErrors = function() {
    this.overlayErrors([]);
  };

  Editor.prototype.overlayErrors = function(errors) {
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

  Editor.prototype.tryParse = function() {
    ide.ast.parse(this.editor.getValue(),
      (function (ast) {
        this.clearErrors();
        this.asts[this.getCurrentFile()] = ast;
      }).bind(this),
      (function (errors) {
        this.overlayErrors(errors);
        delete this.asts[this.getCurrentFile()];
      }).bind(this));
  };

  Editor.prototype.startSyntaxChecker = function() {
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

  return {
    Editor: Editor
  };
})();
