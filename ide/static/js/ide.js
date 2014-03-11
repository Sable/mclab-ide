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

  var callgraph = null;
  var getCallgraph = function(callback) {
    if (callgraph !== null) {
      console.log('Reusing cached callgraph.');
      callback(callgraph);
      return;
    }
    var expression = consolePane.getValue().trim();
    console.log('Triggering callgraph with "' + expression + '"...');
    ide.ajax.getCallGraph(expression, function (newCallgraph) {
      console.log('Got the callgraph: ' + JSON.stringify(newCallgraph));
      callgraph = newCallgraph;
      callback(callgraph);
    });
  };
  var invalidateCallgraph = function() {
    callgraph = null;
  };

  editor.editor.on('change', invalidateCallgraph);
  consolePane.on('change', invalidateCallgraph);

  var createCallgraphIdFromToken = function(token) {
    return token.identifier +
      '@' + token.file +
      ':' + token.line + ',' + token.col;
  }

  var createTokenFromCallgraphId = function(id) {
    var pattern = /(.*)+@(.*)+:(\d+),(\d+)/;
    var match = id.match(pattern);
    return {
      identifier: match[1],
      file: match[2],
      line: parseInt(match[3], 10),
      col: parseInt(match[4], 10)
    };
  }

  editor.onFunctionCallClicked(function (token) {
    var id = createCallgraphIdFromToken(token);
    getCallgraph(function(callgraph) {
      var targets = callgraph[id];
      if (targets !== undefined && targets.length !== 0) {
        editor.jumpTo(createTokenFromCallgraphId(targets[0]));
      } else {
        ide.utils.flashError("This call site wasn't covered by the profiling run.");
      }
    });
  });

  var tree = new ide.tree.Tree('projects', 'tree');
  tree.onFileSelect(function(path) { editor.openFile(path); });
};
