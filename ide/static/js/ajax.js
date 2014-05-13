ide.ajax = (function() {
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

  var getFiles = function(callback) {
    get_json('files', {}, callback);
  };

  var getCallGraph = function(expression, callback) {
     $.ajax({
      url: 'callgraph',
      method: 'post',
      data: {expression: expression},
      dataType: 'json',
      success: function (data) {
        if ('callgraph' in data) {
          callback(data.callgraph);
        }
      }
    });
  };

  var refactoring = function(which, params, success, error) {
    get_json('refactor/' + which, params, function (data) {
      data.newText ? success(data.newText) : error(data.error);
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

  var extractFunction = function(path, selection, newName, success, error) {
    extractBase('extract-function', path, selection, newName, success, error);
  };

  var extractVariable = function(path, selection, newName, success, error) {
    extractBase('extract-variable', path, selection, newName, success, error);
  };

  var inlineVariable = function(path, selection, success, error) {
    var params = { path: path, selection: serializeSelection(selection) };
    refactoring('inline-variable', params, success, error);
  };

  return {
    parseCode: parseCode,
    readFile: readFile,
    writeFile: writeFile,
    renameFile: renameFile,
    deleteFile: deleteFile,
    getFiles: getFiles,
    getCallGraph: getCallGraph,
    extractFunction: extractFunction,
    extractVariable: extractVariable,
    inlineVariable: inlineVariable
  };
})();
