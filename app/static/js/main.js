function IDE() {
  this.editor = ace.edit('editor');
  this.editor.setTheme('ace/theme/solarized_dark');
  this.editor.setFontSize(14);
  this.editor.getSession().setMode('ace/mode/matlab');
  this.editor.getSession().setUseSoftTabs(true);
  this.editor.resize();
  this.editor.focus();

  this.console = ace.edit('console');
  this.console.setTheme('ace/theme/solarized_light');
  this.console.setFontSize(14);
  this.console.setReadOnly(true);
  this.console.setHighlightActiveLine(false);
  this.console.renderer.setShowGutter(false);
 
  $(window).resize(this.resizeAce.bind(this));
  this.resizeAce();
}

IDE.prototype.resizeAce = function() {
    var height = $(window).height();
    $('#editor').height(3 * height / 4);
    $('#console').height(height / 4);
    this.editor.resize();
    this.console.resize();
};

IDE.prototype.overlayErrors = function(errors) {
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

IDE.prototype.tryParse = function() {
  $.ajax({
    url: '/parse',
    method: 'POST',
    contentType: 'text/plain',
    data: this.editor.getValue(),
    dataType: 'json',
    success: (function (data) { this.overlayErrors(data.errors); }).bind(this),
  })
};

IDE.prototype.startSyntaxChecker = function() {
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
  var ide = new IDE();
  ide.startSyntaxChecker();
}); 
