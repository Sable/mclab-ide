var ide = {};

ide.init = function(settings) {
  ide.utils.init();

  var editor = new ide.editor.Editor('editor', 'editor-buffer', settings);
  editor.startSyntaxChecker();

  var consolePane = ace.edit('console');
  consolePane.setSession(ace.createEditSession(''));
  consolePane.setTheme('ace/theme/textmate');
  consolePane.setFontSize(14);
  // consolePane.setReadOnly(true);
  consolePane.setHighlightActiveLine(false);
  consolePane.setShowPrintMargin(false);
  consolePane.renderer.setShowGutter(false);

  $(window).resize(function() {
    var height = $(window).height();
    editor.resize(3 * height / 4);
    $('#console').height(height / 4);
    consolePane.resize();
  });
  $(window).trigger('resize');

  var callgraph = new ide.callgraph.CallGraph(
    consolePane.getValue.bind(consolePane));
  editor.editor.on('change', callgraph.invalidate.bind(callgraph));
  consolePane.on('change', callgraph.invalidate.bind(callgraph));

  editor.onFunctionCallClicked(function (token) {
    callgraph.getTargets(token, function (targets) {
      if (targets.length !== 0) {
        editor.jumpTo(targets[0]);
      } else {
        ide.utils.flashError("This call site wasn't covered by the profiling run.");
      }
    });
  });

  var explorer = new ide.explorer.ProjectExplorer(
    'project-explorer', 'files', editor.openFile.bind(editor));
};
