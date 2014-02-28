ide.editor = (function() {
  var Editor = function(id, aceId) {
    this.el = $('#' + id);
    this.editor_el = $('#' + aceId);
    this.editor = ace.edit(aceId);
    this.editor.setTheme('ace/theme/solarized_dark');
    this.editor.setFontSize(14);
    this.editor.setShowPrintMargin(false);
    this.editor.resize();
    this.editor.focus();

    this.editor.commands.addCommand({
      name: 'save',
      bindKey: {
        win: 'Ctrl-S',
        mac: 'Command-S',
      },
      exec: (function() {
        var tab = this.tabs.getSelectedTab();
        ide.ajax.writeFile(tab.label, this.editor.getValue());
      }).bind(this),
    });

    $(window).resize(this.resizeAce.bind(this));
    this.resizeAce();

    var ul = this.el.find('ul.editor-tabs').first();
    this.sessions = {};
    this.tabs = new ide.tabs.TabManager(ul)
      .on('all_tabs_closed', this.hide.bind(this))
      .on('tab_select', (function (e, path) {
        if (!(path in this.sessions)) {
          this.sessions[path] = this.newSession('');
        }
        this.editor.setSession(this.sessions[path]);
        this.show();
      }).bind(this));
    this.hide();
  };

  Editor.prototype.openFile = function(path) {
    if (this.tabs.hasTabLabeled(path)) {
      this.tabs.getTabLabeled(path).select();
      return;
    }
    ide.ajax.readFile(path, (function (contents) {
      this.sessions[path] = this.newSession(contents);
      this.tabs.createTab(path).select();
    }).bind(this));
  }

  Editor.prototype.newSession = function(text) {
    var session = ace.createEditSession(text, 'ace/mode/matlab');
    session.setUseSoftTabs(true);
    return session;
  };

  Editor.prototype.hide = function() {
    this.editor_el.css('visibility', 'hidden');
  };

  Editor.prototype.show = function() {
    this.editor_el.css('visibility', 'visible');
  };

  Editor.prototype.resizeAce = function() {
      var height = $(window).height();
      this.editor_el.height(3 * height / 4);
      this.editor.resize();
      // TODO(isbadawi): This shouldn't be here
      $('#console').height(height / 4);
      ace.edit('console').resize();
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
