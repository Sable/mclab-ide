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

  var extractFunction = function(path, selection, newName, success, error) {
    var range = [
      [selection.startLine, selection.startColumn].join(','),
      [selection.endLine, selection.endColumn].join(','),
    ].join('-');

    var params = { path: path, selection: range, newName: newName };
    get_json('refactor/extract-function', params, function (data) {
      if (data.newText) {
        success(data.newText);
      } else {
        error(data.error);
      }
    });
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
  };
})();
