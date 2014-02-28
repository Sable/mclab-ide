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
    $.get('/read?path=' + encodeURIComponent(path), callback);
  };

  var writeFile = function(path, contents) {
    $.post('/write', {'path': path, 'contents': contents}, function (data) {
      ide.utils.flashSuccess('File ' + path + ' saved.');
    });
  };

  return {
    parseCode: parseCode,
    readFile: readFile,
    writeFile: writeFile,
  };
})();
