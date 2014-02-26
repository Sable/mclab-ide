$(function() {
  var editor = new mclab.editor.Editor('editor', 'editor-buffer');
  editor.startSyntaxChecker();

  var consolePane = ace.edit('console');
  consolePane.setTheme('ace/theme/solarized_light');
  consolePane.setFontSize(14);
  consolePane.setReadOnly(true);
  consolePane.setHighlightActiveLine(false);
  consolePane.setShowPrintMargin(false);
  consolePane.renderer.setShowGutter(false);

  var tree = new mclab.tree.Tree('projects', '/projects');
  tree.onFileSelect(function(path) { editor.openFile(path); });
}); 
