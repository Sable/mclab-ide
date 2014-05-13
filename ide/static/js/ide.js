var ide = {};

ide.ViewModel = function(settings) {
  var self = this;

  self.editor = new ide.editor.Editor('editor-buffer', settings);
  self.editor.startSyntaxChecker();

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
    $('#editor-buffer').height(3 * height / 4);
    $('#console').height(height / 4);
    self.editor.editor.resize();
    consolePane.resize();
  });
  $(window).trigger('resize');

  var callgraph = new ide.callgraph.CallGraph(
    consolePane.getValue.bind(consolePane));
  self.editor.editor.on('change', callgraph.invalidate.bind(callgraph));
  consolePane.on('change', callgraph.invalidate.bind(callgraph));

  self.editor.on('function_call_clicked', function (token) {
    console.log(token);
    callgraph.getTargets(token, function (targets) {
      if (targets.length !== 0) {
        self.editor.jumpTo(targets[0]);
      } else {
        ide.utils.flashError("This call site wasn't covered by the profiling run.");
      }
    });
  });

  self.doRefactoring = function (name, action, extraParams, success) {
    console.log(name, 'for', JSON.stringify(self.editor.getSelectionRange()));
    var params = [
      self.editor.tabs.selectedTab().name(),
      self.editor.getSelectionRange()
    ].concat(extraParams);
    params.push(success);
    params.push(function (error) {
      console.log(name, 'failed:', error);
      ide.utils.flashError(error);
    });
    action.apply(this, params);
  };

  self.doExtractRefactoring = function (name, action) {
    ide.utils.prompt('New name', function (newName) {
      if (!ide.utils.isMatlabIdentifier(newName.trim())) {
        ide.utils.flashError(
          "'" + newName.trim() + "' is not a valid MATLAB identifier.");
        return;
      }
      self.doRefactoring(name, action, [newName], function (changedText) {
        console.log(name, 'successful.');
        // TODO(isbadawi): Avoid rewriting the whole file?
        // The server could send a patch, or something.
        var selection_start_line = self.editor.getSelectionRange().startLine;
        self.editor.editor.setValue(changedText);
        self.editor.selectLine(selection_start_line);
      });
    });
  };

  self.onContextMenuItem = function (action) {
    if (action === 'Extract function') {
      self.doExtractRefactoring('Extract function', ide.ajax.extractFunction);
    }

    if (action === 'Extract variable') {
      self.doExtractRefactoring('Extract variable', ide.ajax.extractVariable);
    }

    if (action == 'Inline variable') {
      self.doRefactoring('Inline variable', ide.ajax.inlineVariable, [],
          function (changedText) {
            self.editor.editor.setValue(changedText);
            self.editor.editor.clearSelection();
          });
    }
  };

  self.explorer = new ide.explorer.ProjectExplorer()
    .on('file_selected', function (path) {
      self.editor.openFile(path);
    })
    .on('file_renamed', function (oldPath, newPath, doRename) {
      if (self.editor.hasDirtyTab(oldPath)) {
        ide.utils.flashError('This file has unsaved changes. ' +
          'Please save the file before renaming.');
        return;
      }
      self.editor.renameFile(oldPath, newPath);
      // TODO(isbadawi): Be smarter about invalidating callgraph
      callgraph.invalidate();
      doRename();
    })
    .on('file_deleted', function (path, doDelete) {
      self.editor.deleteFile(path);
      // TODO(isbadawi): Be smarter about invalidating callgraph
      callgraph.invalidate();
      doDelete();
    });
};
