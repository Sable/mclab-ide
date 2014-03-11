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

  Editor.prototype.jumpToId = function(id) {
    var pattern = /(.*)+@(.*)+:(\d+),(\d+)/;
    var match = id.match(pattern);
    this.jumpTo(match[2], parseInt(match[3], 10), parseInt(match[4], 10));
  }

  Editor.prototype.jumpTo = function(file, line, col) {
    console.log('Jumping to ' + JSON.stringify(arguments));
    this.openFile(file, (function() {
      this.editor.getSelection().moveTo(line - 1, col - 1);
    }).bind(this));
  };

  Editor.prototype.onFunctionCallClicked = function(callback) {
    this.editor.on('click', (function(e) {
      if (!e.getAccelKey()) {
        return;
      }
      var position = e.getDocumentPosition();
      var token = this.editor.getSession()
          .getTokenAt(position.row, position.column);
      var line = position.row + 1;
      var col = token.start + 1;
      if (!this.possibleFunctionCall(line, col)) {
        return;
      }

      var file = this.tabs.getSelectedTab().label;
      var id = token.value + '@' + file + ':' + line + ',' + col;
      callback(id);
    }).bind(this));
  }

  Editor.prototype.possibleFunctionCall = function(row, column) {
    // TODO(isbadawi): Get correct kind information.
    // Here, I'm counting kind BOT as a possible function call.
    // This is because I'm parsing files in isolation, so the kind
    // analysis doesn't know about the sibling functions. Long term,
    // should have an AST for the whole project.
    var kind = this.getAst()
        .find('NameExpr[line="' + row + '"][col="' + column + '"]')
        .first()
        .attr('kind');
    return kind === 'FUN' || kind === 'BOT';
  };

  Editor.prototype.getAst = function() {
    var currentFile = this.tabs.getSelectedTab().label;
    if (!(currentFile in this.asts)) {
      return $();
    }
    return this.asts[currentFile];
  };


  Editor.prototype.hide = function() {
    this.editor_el.css('visibility', 'hidden');
  };

  Editor.prototype.show = function() {
    this.editor_el.css('visibility', 'visible');
  };

  Editor.prototype.overlayErrors = function(errors) {
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

  Editor.prototype.tryParse = function() {
    ide.ajax.parseCode(this.editor.getValue(), (function (data) {
      if (data.ast) {
        this.asts[this.tabs.getSelectedTab().label] = $($.parseXML(data.ast));
      }
      this.overlayErrors(data.errors);
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