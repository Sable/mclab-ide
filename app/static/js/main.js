function resizeAce() {
  var height = $(window).height();
  $('#editor').height(3 * height / 4);
  $('#console').height(height / 4);
  ace.edit('editor').resize();
  ace.edit('console').resize();
}

function tryParse(editor, console) {
  $.ajax({
    url: '/parse',
    method: 'POST',
    contentType: 'text/plain',
    data: editor.getValue(),
    dataType: 'json',
    success: function (data) {
      if (data.errors) {
        editor.getSession().setAnnotations(
          data.errors.map(function (err) {
            return {
              row: err.line - 1,
              column: err.col - 1,
              text: err.message,
              type: 'error'
            }
          })
        );
      } else {
        editor.getSession().clearAnnotations();
      }
    },
  });
}

$(function() {
  var editor = ace.edit('editor');
  editor.setTheme('ace/theme/solarized_dark');
  editor.setFontSize(14);
  editor.getSession().setMode('ace/mode/matlab');
  editor.getSession().setUseSoftTabs(true);
  editor.resize();
  editor.focus();

  var console = ace.edit('console');
  console.setTheme('ace/theme/solarized_light');
  console.setFontSize(14);
  console.setReadOnly(true);
  console.setHighlightActiveLine(false);
  console.renderer.setShowGutter(false);
 
  $(window).resize(resizeAce);
  resizeAce();

  var typingTimer = null;
  var doneTypingInterval = 1000;

  //on keyup, start the countdown
  editor.on('change', function(){
    if (typingTimer != null) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
  });

  function doneTyping() {
    tryParse(editor, console);
    typingTimer = null;
  }
}); 
