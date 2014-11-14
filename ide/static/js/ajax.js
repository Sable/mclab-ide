ide.ajax = (function() {
  var runCode = function(code, callback) {
    $.ajax({
      url: 'run',
      method: 'post',
      contentType: 'text/plain',
      data: code,
      dataType: 'json',
      success: callback
    });
  };

  var parseCode = function(code, callback) {
    $.ajax({
      url: '/parse',
      method: 'post',
      contentType: 'text/plain',
      data: code,
      dataType: 'json',
      success: callback,
    });
  };

  var analyzeCode = function(code, callback) {
    $.ajax({
      url: '/analyze',
      method: 'post',
      contentType: 'text/plain',
      data: code,
      dataType: 'json',
      success: callback,
    });
  };

  var get = function(url, params, callback) {
    $.get(url + '?' + $.param(params), callback);
  };

  var get_json = function(url, params, callback) {
    $.getJSON(url + '?' + $.param(params), callback);
  };

  var post = function(url, params, callback) {
    $.post(url, params, function (data) {
      if (callback) {
        callback();
      }
    });
  };

  var initializeMatlabSession = post.bind(this, 'init-session', {});

  var readFile = function(path, callback) {
    get('read-file', {path: path}, callback);
  };

  var writeFile = function(path, contents, callback) {
    post('write-file', {path: path, contents: contents}, callback);
  };

  var renameFile = function(path, newPath, callback) {
    post('rename-file', {path: path, newPath: newPath}, callback);
  };

  var deleteFile = function(path, callback) {
    post('delete-file', {path: path}, callback);
  };

  var getFiles = get_json.bind(this, 'files', {});

  var getCallGraph = function(callback) {
    get_json('callgraph', {}, function (data) {
      if ('callgraph' in data) {
        callback(data.callgraph);
      }
    });
  };

  var refactoring = function(which, params, success, error) {
    get_json('refactor/' + which, params, function (data) {
      if (data.errors.length !== 0 || data.exception) {
        error(data);
      } else {
        success(data.modified);
      }
    });
  };

  // The Natlab tools expect selections in the form
  // line,col-line,col
  var serializeSelection = function(selection) {
    return [
      [selection.startLine, selection.startColumn].join(','),
      [selection.endLine, selection.endColumn].join(','),
    ].join('-');
  };

  var extractBase = function(url, path, selection, newName, success, error) {
    var params = {
      path: path,
      selection: serializeSelection(selection),
      newName: newName
    };
    refactoring(url, params, success, error);
  };

  var extractFunction = extractBase.bind(this, 'extract-function');
  var extractVariable = extractBase.bind(this, 'extract-variable');

  var inlineVariable = function(path, selection, success, error) {
    var params = { path: path, selection: serializeSelection(selection) };
    refactoring('inline-variable', params, success, error);
  };

  var inlineScript = function(path, _, success, error) {
    var params = { path: path };
    refactoring('inline-script', params, success, error);
  };

  var removeRedundantEval = function(path, selection, success, error) {
    var params = { path: path, selection: serializeSelection(selection) };
    refactoring('remove-redundant-eval', params, success, error);
  };

  return {
    runCode: runCode,
    parseCode: parseCode,
    analyzeCode: analyzeCode,
    initializeMatlabSession: initializeMatlabSession,
    readFile: readFile,
    writeFile: writeFile,
    renameFile: renameFile,
    deleteFile: deleteFile,
    getFiles: getFiles,
    getCallGraph: getCallGraph,
    extractFunction: extractFunction,
    extractVariable: extractVariable,
    inlineVariable: inlineVariable,
    inlineScript: inlineScript,
    removeRedundantEval: removeRedundantEval
  };
})();
