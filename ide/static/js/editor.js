ide.editor = (function() {
  var Editor = function(aceId, settings) {
    this.editor = createAceEditor(aceId, settings);
    this.settings = settings;

    this.addKeyboardShortcut('save', 'Ctrl-S', function() {
      this.saveFile(this.tabs.selectedTab());
    }.bind(this));
    this.addKeyboardShortcut('save-all', 'Ctrl-Shift-S', function() {
      this.tabs.tabs().forEach(this.saveFile.bind(this));
    }.bind(this));

    this.sessions = {};
    this.asts = {};
    this.tabs = new ide.tabs.TabsViewModel()
      .on('all_tabs_closed', function() {
        this.visible(false);
      }.bind(this))
      .on('tab_select', this.selectFile.bind(this))
      .on('tab_save', this.saveFile.bind(this));

    this.editor.on('change', function () {
      this.tabs.selectedTab().dirty(true);
    }.bind(this));

    this.editor.on('click', function(e) {
      this.editor.getSelection().toSingleRange();
      if (!e.getAccelKey()) {
        return;
      }
      if (!this.hasAst()) {
        ide.utils.flashError('There are parse errors.');
        return;
      }
      var token = this.getTokenFromMouseEvent(e);
      if (this.isFunctionCall(token)) {
        this.trigger('function_call_clicked', token);
      }
    }.bind(this));

    this.visible = ko.observable(false);
  };

  var createAceEditor = function(el, settings) {
    var editor = ace.edit(el);
    editor.setTheme('ace/theme/' + settings.theme);
    editor.setFontSize(14);
    editor.setShowPrintMargin(false);
    if (settings.keybindings === 'vim') {
      editor.setKeyboardHandler(ace.require('ace/keyboard/vim').handler);
    } else if (settings.keybindings === 'emacs') {
      editor.setKeyboardHandler(ace.require('ace/keyboard/emacs').handler);
    }

    editor.resize();
    editor.focus();
    return editor;
  };

  var createEditSession = function(text, settings) {
    var session = ace.createEditSession(text, 'ace/mode/matlab');
    session.setUseSoftTabs(settings.expand_tabs);
    session.setTabSize(settings.tab_width);
    return session;
  };

  Editor.prototype.selectLine = function(line) {
    var Range = ace.require('ace/range').Range;
    var selection = this.editor.selection;
    selection.setSelectionRange(new Range(line - 1, 0, line - 1, 0));
    selection.selectLineStart();
    selection.selectLineEnd();
  }

  Editor.prototype.createSession = function(path, text) {
    this.sessions[path] = createEditSession(text, this.settings);
  };

  Editor.prototype.addKeyboardShortcut = function(name, key, action) {
    var bindKey = key;
    if (bindKey.indexOf('Ctrl') !== -1) {
      bindKey = {win: key, mac: key.replace('Ctrl', 'Command')};
    }
    this.editor.commands.addCommand({
      name: name,
      bindKey: bindKey,
      exec: action,
    });
  };

  Editor.prototype.openFile = function(path, callback) {
    if (_(this.sessions).has(path)) {
      this.tabs.openTab(path);
      if (callback) {
        callback();
      }
      return;
    }
    ide.ajax.readFile(path, function (contents) {
      this.createSession(path, contents);
      this.tabs.openTab(path);
      this.tryParse();
      if (callback) {
        callback();
      }
    }.bind(this));
  };

  Editor.prototype.selectFile = function(tab) {
    var path = tab.name();
    if (!_(this.sessions).has(path)) {
      this.createSession(path, '');
    }
    this.editor.setSession(this.sessions[path]);
    this.visible(true);
  };

  Editor.prototype.saveFile = function(tab) {
    var path = tab.name();
    ide.ajax.writeFile(path, this.sessions[path].getValue());
    tab.dirty(false);
  }

  var renameKey = function(object, oldKey, newKey) {
    if (_(object).has(oldKey)) {
      object[newKey] = object[oldKey];
      delete object[oldKey];
    }
  };

  var removeKey = function(object, key) {
    if (_(object).has(key)) {
      delete object[key];
    }
  };

  Editor.prototype.hasDirtyTab = function(path) {
    var tab = this.tabs.findByName(path);
    return tab && tab.dirty();
  };

  Editor.prototype.renameFile = function(oldPath, newPath) {
    var tab = this.tabs.findByName(oldPath);
    if (tab) {
      tab.name(newPath);
    }
    renameKey(this.sessions, oldPath, newPath);
    renameKey(this.asts, oldPath, newPath);
  };

  Editor.prototype.deleteFile = function(path) {
    var tab = this.tabs.findByName(path);
    if (tab) {
      this.tabs.forceCloseTab(tab);
    }
    removeKey(this.sessions, path);
    removeKey(this.asts, path);
  };

  Editor.prototype.jumpTo = function(token) {
    this.openFile(token.file, function () {
     this.editor.getSelection().moveTo(token.line - 1, token.col - 1);
    }.bind(this));
  };

  Editor.prototype.getTokenFromMouseEvent = function(e) {
    var MouseEvent = ace.require('ace/mouse/mouse_event').MouseEvent;
    if (!(e instanceof MouseEvent)) {
      e = new MouseEvent(e, this.editor);
    }
    var position = e.getDocumentPosition();
    var token = this.editor.getSession().getTokenAt(position.row, position.column);
    return {
      identifier: token.value,
      file: this.tabs.selectedTab().name(),
      line: position.row + 1,
      col: token.start + 1
    };
  };

  Editor.prototype.getSelectionRange = function() {
    var range = this.editor.getSelection().getRange();
    return {
      startLine: range.start.row + 1,
      startColumn: range.start.column + 1,
      endLine: range.end.row + 1,
      endColumn: range.end.column + 1,
    };
  };

  Editor.prototype.isFunctionCall = function(token) {
    return this.getAst()
      .findAtPosition('NameExpr', token)
      .isFunctionCall();
  };

  Editor.prototype.hasAst = function() {
    return _(this.asts).has(this.tabs.selectedTab().name());
  };

  Editor.prototype.getAst = function() {
    return this.asts[this.tabs.selectedTab().name()];
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
      function (ast) {
        this.clearErrors();
        this.asts[this.tabs.selectedTab().name()] = ast;
      }.bind(this),
      function (errors) {
        this.overlayErrors(errors);
        delete this.asts[this.tabs.selectedTab().name()];
      }.bind(this));
  };

  Editor.prototype.startSyntaxChecker = function() {
    var typingTimer = null;
    var doneTypingInterval = 1000;

    var doneTyping = function() {
      this.tryParse();
      typingTimer = null;
    }.bind(this);

    this.editor.on('change', function() {
      if (typingTimer !== null) {
        clearTimeout(typingTimer);
        typingTimer = null;
      }
      typingTimer = setTimeout(doneTyping, doneTypingInterval);
    });
  };

  _.extend(Editor.prototype, ide.utils.EventsMixin);

  return {
    Editor: Editor
  };
})();
