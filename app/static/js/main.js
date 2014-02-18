function TabbedEditor(id, aceId) {
  this.el = $('#' + id);
  this.editor_el = $('#' + aceId);
  this.editor = ace.edit(aceId);
  this.editor.setTheme('ace/theme/solarized_dark');
  this.editor.setFontSize(14);
  this.editor.setSession(this.newSession());
  this.editor.resize();
  this.editor.focus();

  $(window).resize(this.resizeAce.bind(this));
  this.resizeAce();

  this.sessions = {};

  var self = this;

  this.el.find('.editor-tabs').on('click', 'li', function () {
    self.selectTab($(this));
  });

  this.el.find('.editor-add-file').on('click', function () {
    self.selectTab(self.createTabBefore($(this), prompt('Name: ')));
  });
}

TabbedEditor.prototype.selectTab = function(tab) {
  tab.siblings('.active').removeClass('active');
  tab.addClass('active');
  var filename = tab.first('a').text();
  this.editor.setSession(this.sessions[filename]);
}

TabbedEditor.prototype.createTabBefore = function(tab, filename) {
  var newTab = $('<li>').append(
    $('<a>').attr('href', '#').text(filename));
  newTab.insertBefore(tab);
  this.sessions[filename] = this.newSession();
  return newTab;
}

TabbedEditor.prototype.newSession = function() {
  var session = ace.createEditSession('', 'ace/mode/matlab');
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
  $.ajax({
    url: '/parse',
    method: 'POST',
    contentType: 'text/plain',
    data: this.editor.getValue(),
    dataType: 'json',
    success: (function (data) { this.overlayErrors(data.errors); }).bind(this),
  })
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

$(function() {
  var editor = new TabbedEditor('editor', 'editor-buffer');
  editor.startSyntaxChecker();

  var console = ace.edit('console');
  console.setTheme('ace/theme/solarized_light');
  console.setFontSize(14);
  console.setReadOnly(true);
  console.setHighlightActiveLine(false);
  console.renderer.setShowGutter(false);
}); 
