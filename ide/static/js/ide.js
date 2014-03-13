var ide = {};

ide.init = function(settings) {
  ide.utils.init();

  var editor = new ide.editor.Editor('editor', 'editor-buffer', settings);
  editor.startSyntaxChecker();

  var consolePane = ace.edit('console');
  consolePane.setTheme('ace/theme/solarized_light');
  consolePane.setFontSize(14);
  // consolePane.setReadOnly(true);
  consolePane.setHighlightActiveLine(false);
  consolePane.setShowPrintMargin(false);
  consolePane.renderer.setShowGutter(false);

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

  var tree = new ide.tree.Tree('projects', 'tree');
  tree.onFileSelect(function(path) { editor.openFile(path); });
};
