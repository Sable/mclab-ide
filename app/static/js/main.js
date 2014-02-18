function IDE() {
  this.editor = ace.edit('editor');
  this.editor.setTheme('ace/theme/solarized_dark');
  this.editor.setFontSize(14);
  this.editor.setSession(this.newSession());
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

  this.sessions = {};
}

IDE.prototype.switchToFile = function(filename) {
  this.editor.setSession(this.sessions[filename]);
};

IDE.prototype.createAndSwitchToFile = function(filename) {
  if (!(filename in this.sessions)) {
    this.sessions[filename] = this.newSession();
  }
  this.switchToFile(filename);
}

IDE.prototype.newSession = function() {
  var session = new ace.EditSession('');
  session.setMode('ace/mode/matlab');
  session.setUseSoftTabs(true);
  return session;
}

IDE.prototype.resizeAce = function() {
    var height = $(window).height();
    $('#editor').height(3 * height / 4);
    $('#console').height(height / 4);
    this.editor.resize();
    this.console.resize();
};

IDE.prototype.overlayErrors = function(errors) {
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

function selectTab(tab) {
  tab.siblings('.active').removeClass('active');
  tab.addClass('active');
}

$(function() {
  var ide = new IDE();
  ide.startSyntaxChecker();

  $('#file-switcher').on('click', 'li a', function () {
    var filename = $(this).text();
    ide.switchToFile(filename);
    selectTab($(this).parent());
  });

  $('#add-file').on('click', function () {
    var filename = prompt('Name:');
    var newTab = $('<li>').append(
      $('<a>').attr('href', '#').text(filename));
    newTab.insertBefore($(this));
    selectTab(newTab);
    ide.createAndSwitchToFile(filename);
  });
}); 
