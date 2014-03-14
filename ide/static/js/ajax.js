ide.ajax = (function() {
  var parseCode = function(code, callback) {
    $.ajax({
      url: '/parse',
      method: 'POST',
      contentType: 'text/plain',
      data: code,
      dataType: 'json',
      success: callback,
    });
  };

  var readFile = function(path, callback) {
    params = {path: path};
    $.get('read-file?' + $.param(params), callback);
  };

  var writeFile = function(path, contents, callback) {
    $.post('write-file', {path: path, contents: contents}, function (data) {
      if (callback) {
        callback();
      }
    });
  };

  var getFiles = function(callback) {
    $.getJSON('files', callback);
  };

  var getCallGraph = function(expression, callback) {
     $.ajax({
      url: 'callgraph',
      method: 'POST',
      data: {expression: expression},
      dataType: 'json',
      success: function (data) {
        if ('callgraph' in data) {
          callback(data.callgraph);
        }
      }
    });
  };

  return {
    parseCode: parseCode,
    readFile: readFile,
    writeFile: writeFile,
    getFiles: getFiles,
    getCallGraph: getCallGraph,
  };
})();
