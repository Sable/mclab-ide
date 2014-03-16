ide.editor = (function() {
  var Editor = function(id, aceId, settings) {
    this.el = $('#' + id);
    this.editor_el = $('#' + aceId);
    this.editor = createAceEditor(aceId, settings);
    this.settings = settings;

    this.addKeyboardShortcut('save', 'S', this.saveCurrentFile.bind(this));

    var ul = this.el.find('ul.editor-tabs').first();
    this.sessions = {};
    this.asts = {};
    this.tabs = new ide.tabs.TabManager(ul)
      .on('all_tabs_closed', this.hide.bind(this))
      .on('tab_select', (function (e, path) {
        this.selectFile(path);
      }).bind(this));
    this.editor.on('change', (function () {
      this.tabs.getSelectedTab().setDirty();
    }).bind(this));
    this.hide();

    $(window).on('beforeunload', (function() {
      // TODO(isbadawi): Prompt to save, not just warn?
      var dirty_tabs = this.tabs.getDirtyTabs().length;
      if (dirty_tabs > 0) {
        return [
          'You have ' + dirty_tabs + ' unsaved file' + (dirty_tabs === 1 ? '' : 's') + '.',
          'If you leave the page, you will lose any unsaved changes.'
        ].join('\n');
      }
    }).bind(this));
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
    session.setTabSize(settings.tab_width)
    return session;
  };

  Editor.prototype.resize = function(height) {
    this.editor_el.height(height);
    this.editor.resize();
  };

  Editor.prototype.selectFile = function(path) {
      if (!(path in this.sessions)) {
        this.createSession(path, '');
      }
      this.editor.setSession(this.sessions[path]);
      this.show();
  };

  Editor.prototype.createSession = function(path, text) {
    this.sessions[path] = createEditSession(text, this.settings);
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
    var path = this.getCurrentFile();
    ide.ajax.writeFile(path, this.editor.getValue(), function () {
      ide.utils.flashSuccess('File ' + path + ' saved.');
    });
    this.tabs.getSelectedTab().clearDirty();
  };

  Editor.prototype.fileIsDirty = function(path) {
    if (!this.tabs.hasTabLabeled(path)) {
      return false;
    }
    return this.tabs.getTabLabeled(path).is_dirty;
  }

  var renameKey = function(object, oldKey, newKey) {
    if (oldKey in object) {
      object[newKey] = object[oldKey];
      delete object[oldKey];
    }
  };

  var removeKey = function(object, key) {
    if (key in object) {
      delete object[key];
    }
  };

  Editor.prototype.renameFile = function(oldPath, newPath) {
    if (this.tabs.hasTabLabeled(oldPath)) {
      this.tabs.getTabLabeled(oldPath).rename(newPath);
    }
    renameKey(this.sessions, oldPath, newPath);
    renameKey(this.asts, oldPath, newPath);
  };

  Editor.prototype.deleteFile = function(path) {
    if (this.tabs.hasTabLabeled(path)) {
      this.tabs.getTabLabeled(path).forceClose();
    }
    removeKey(this.sessions, path);
    removeKey(this.asts, path);
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
      this.editor.getSelection().toSingleRange();
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
