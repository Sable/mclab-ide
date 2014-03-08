var ide = {};

ide.init = function() {
  ide.utils.init();

  var editor = new ide.editor.Editor('editor', 'editor-buffer');
  editor.startSyntaxChecker();

  var consolePane = ace.edit('console');
  consolePane.setTheme('ace/theme/solarized_light');
  consolePane.setFontSize(14);
  // consolePane.setReadOnly(true);
  consolePane.setHighlightActiveLine(false);
  consolePane.setShowPrintMargin(false);
  consolePane.renderer.setShowGutter(false);

  editor.onFunctionCallClicked(function(id) {
    var expression = consolePane.getValue().trim();
    console.log('Triggering callgraph with "' + expression + '"...');
    ide.ajax.getCallGraph(expression, function (callgraph) {
      console.log('Got the callgraph!');
      var targets = callgraph[id];
      if (targets !== undefined && targets.length !== 0) {
        editor.jumpToId(targets[0]);
      }
    });
  });

  var tree = new ide.tree.Tree('projects', 'tree');
  tree.onFileSelect(function(path) { editor.openFile(path); });
}; 
