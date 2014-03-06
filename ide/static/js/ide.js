var ide = {};

ide.init = function() {
  ide.utils.init();

  var editor = new ide.editor.Editor('editor', 'editor-buffer');
  editor.startSyntaxChecker();

  var consolePane = ace.edit('console');
  consolePane.setTheme('ace/theme/solarized_light');
  consolePane.setFontSize(14);
  consolePane.setReadOnly(true);
  consolePane.setHighlightActiveLine(false);
  consolePane.setShowPrintMargin(false);
  consolePane.renderer.setShowGutter(false);

  var tree = new ide.tree.Tree('projects', 'tree');
  tree.onFileSelect(function(path) { editor.openFile(path); });
}; 
