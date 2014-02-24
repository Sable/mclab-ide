mclab = window.mclab || {};
mclab.ajax = mclab.ajax || {};

mclab.ajax.parseCode = function(code, callback) {
  $.ajax({
    url: '/parse',
    method: 'POST',
    contentType: 'text/plain',
    data: code,
    dataType: 'json',
    success: callback,
  });
};

mclab.ajax.readFile = function(path, callback) {
  $.get('/read?path=' + encodeURIComponent(path), callback);
};

mclab.ajax.writeFile = function(path, contents) {
  $.post('/write', {'path': path, 'contents': contents}, function (data) {
    mclab.utils.flashSuccess('File ' + path + ' saved.');
  });
};
