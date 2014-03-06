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
    params = {project: ide.project, path: path};
    $.get('/read?' + $.param(params), callback);
  };

  var writeFile = function(path, contents) {
    $.post('/write', {project: ide.project, path: path, contents: contents}, function (data) {
      ide.utils.flashSuccess('File ' + path + ' saved.');
    });
  };

  return {
    parseCode: parseCode,
    readFile: readFile,
    writeFile: writeFile,
  };
})();
