var ide = {};

ide.ViewModel = function(settings) {
  var self = this;

  self.editor = new ide.editor.Editor('editor-buffer', settings);

  $(window).resize(function() {
    var total_height = $(window).height();
    var nav_height = $('nav').height();
    var remaining_height = total_height - nav_height;

    $('#editor').height(3 * remaining_height / 4);
    $('#editor-buffer').height($('#editor').height() - $('ul.editor-tabs').height());
    self.editor.editor.resize();

    $('#console').height(remaining_height / 4);
    var terminal = $.terminal.active();
    if (terminal) {
      terminal.css('height', $('#console').height());
    }
  }).resize();


  self.matlabSessionReady = ko.observable(false);
  ide.ajax.initializeMatlabSession(
      self.matlabSessionReady.bind(self.matlabRessionReady, true));

  self.onCommand = function(command, terminal) {
    terminal.pause();
    ide.ajax.runCode(command, function (response) {
      terminal.resume();
      if (response.success === "true") {
        if (response.content.stdout.trim().length !== 0) {
          terminal.echo(response.content.stdout);
        }
        response.content.figures.forEach(function (path) {
          window.open('/figure?path=' + encodeURIComponent(path), '_blank');
        });
      } else {
        terminal.error(response.content.stdout);
      }
    });
  };

  var callgraph = new ide.callgraph.CallGraph();
  // TODO(isbadawi): This is too strong.
  self.editor.editor.on('change', callgraph.invalidate.bind(callgraph));

  self.jumpToDeclaration = function (token) {
    callgraph.getTargets(token, function (targets) {
      if (targets.length !== 0) {
        self.editor.jumpTo(targets[0]);
      } else {
        ide.utils.flashError("This call site wasn't covered by the profiling run.");
      }
    });
  };

  self.jumpToCaller = function (token) {
    callgraph.getCallers(token, function (callers) {
      if (callers.length !== 0) {
        self.editor.jumpTo(callers[0]);
      } else {
        ide.utils.flashError("This function wasn't called during the profiling run.");
      }
    });
  };

  self.editor.on('function_call_clicked', self.jumpToDeclaration);

  self.doRefactoring = function (name, action, extraParams, success) {
    console.log(name, 'for', JSON.stringify(self.editor.getSelectionRange()));
    var params = [
      self.editor.tabs.selectedTab().name(),
      self.editor.getSelectionRange()
    ].concat(extraParams);
    params.push(success);
    params.push(function (error) {
      error = JSON.stringify(error);
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
      self.doRefactoring(name, action, [newName], function (modifiedFiles) {
        console.log(name, 'successful.');
        // TODO(isbadawi): Avoid rewriting the whole file?
        // The server could send a patch, or something.
        var selection_start_line = self.editor.getSelectionRange().startLine;
        self.editor.editor.setValue(modifiedFiles[self.editor.tabs.selectedTab().name()]);
        self.editor.selectLine(selection_start_line);
      });
    });
  };

  self.onContextMenuItem = function (action, element, event) {
    switch (action) {
    case 'Extract function':
      self.doExtractRefactoring('Extract function', ide.ajax.extractFunction);
      break;
    case 'Extract variable':
      self.doExtractRefactoring('Extract variable', ide.ajax.extractVariable);
      break;
    case 'Inline variable':
      self.doRefactoring('Inline variable', ide.ajax.inlineVariable, [],
          function (modifiedFiles) {
            self.editor.editor.setValue(modifiedFiles[self.editor.tabs.selectedTab().name()]);
            self.editor.editor.clearSelection();
          });
      break;
    case 'Inline script':
      self.doRefactoring('Inline script', ide.ajax.inlineScript, [],
          function (modifiedFiles) {
            _(modifiedFiles).each(function (newText, filename) {
              self.editor.openFile(filename, function () {
                self.editor.sessions[filename].setValue(newText);
              });
            });
          });
      break;
    case 'Jump to declaration':
      var token = self.editor.getTokenFromMouseEvent(event);
      if (self.editor.isFunctionCall(token)) {
        self.jumpToDeclaration(token);
      }
      break;
    case 'Find callers':
      var token = self.editor.getTokenFromMouseEvent(event);
      self.jumpToCaller(token);
      break;
    }
  };

  self.explorer = new ide.explorer.ProjectExplorer()
    .on('file_selected', self.editor.openFile.bind(self.editor))
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

  ide.ajax.getFiles(self.explorer.setFiles.bind(self.explorer));
};
