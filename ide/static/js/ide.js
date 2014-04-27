var ide = {};

ide.init = function(settings) {
  ide.utils.init();

  var editor = new ide.editor.Editor('editor', 'editor-buffer', settings);
  tabs = new ide.tabs.TabsViewModel(editor);
  ko.applyBindings(tabs, document.getElementById('editor'));
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

  $('#editor-buffer').contextmenu({
    target: '#editor-context-menu',
    onItem: function (e, item) {
      var action = $(item).text();
      if (action === 'Extract function') {
        console.log('Extract function for', JSON.stringify(editor.getSelectionRange()));
        ide.utils.prompt('Method name', function (newName) {
          if (newName === null || newName.trim().length === 0) {
            return;
          }
          if (!ide.utils.isMatlabIdentifier(newName.trim())) {
            ide.utils.flashError(
              "'" + newName.trim() + "' is not a valid MATLAB identifier.");
            return;
          }
          ide.ajax.extractFunction(
            editor.tabs.getSelected(),
            editor.getSelectionRange(),
            newName,
            function (changedText) {
              console.log('Extract function successful.');
              // TODO(isbadawi): Avoid rewriting the whole file?
              // The server could send a patch, or something.
              var selection_start_line = editor.getSelectionRange().startLine;
              editor.editor.setValue(changedText);
              editor.selectLine(selection_start_line);
            },
            function (error) {
              console.log('Extract function failed:', error);
              ide.utils.flashError(error);
            }
          );
        });
      }
    },
  });


  var explorer = new ide.explorer.ProjectExplorer()
    .on('file_selected', function (path) {
      tabs.open(path);
    })
    .on('file_renamed', function (oldPath, newPath, doRename) {
      var tab = tabs.findByName(oldPath);
      if (tab) {
        if (tab.dirty()) {
          ide.utils.flashError('This file has unsaved changes. ' +
            'Please save the file before renaming.');
          return;
        }
        tab.name(newPath);
      }
      editor.renameFile(oldPath, newPath);
      // TODO(isbadawi): Be smarter about invalidating callgraph
      callgraph.invalidate();
      doRename();
    })
    .on('file_deleted', function (path, doDelete) {
      var tab = tabs.findByName(path);
      if (tab) {
        tabs.forceCloseTab(tab);
      }
      editor.deleteFile(path);
      // TODO(isbadawi): Be smarter about invalidating callgraph
      callgraph.invalidate();
      doDelete();
    });
  ko.applyBindings(explorer, document.getElementById('project-explorer'));
};
