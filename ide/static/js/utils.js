ide.utils = (function() {
  var flashSuccess = function(text) {
    flashNotification('success', 'Success!', text);
  };

  var flashError = function(text) {
    flashNotification('error', 'Something went wrong.', text);
  };

  var flashNotification = function(type, title, text) {
    $.pnotify({
      title: title,
      text: text,
      type: type,
      delay: 2000
    });
  };


  var prompt = function(message, callback) {
    bootbox.prompt(message, function (text) {
      if (text !== null && text.trim().length !== 0) {
        callback(text);
      }
    });
  };

  var confirm = function(message, callback) {
    bootbox.confirm(message, function (confirmed) {
      if (confirmed) {
        callback();
      }
    });
  };

  // http://www.mathworks.com/help/matlab/ref/isvarname.html
  // A valid variable name is a character string of letters, digits, and
  // underscores, totaling not more than namelengthmax (63) characters and
  // beginning with a letter. MATLAB keywords are not valid variable names.
  var MATLAB_IDENTIFIER = /^[a-zA-Z]\w{1,62}$/;
  var MATLAB_KEYWORDS = [
    'break', 'case', 'catch', 'classdef', 'continue', 'else', 'elseif', 'end',
    'for', 'function', 'global', 'if', 'otherwise', 'parfor', 'persistent',
    'return', 'spmd', 'switch', 'try', 'while'
  ];
  var isMatlabIdentifier = function(name) {
    return !_(MATLAB_KEYWORDS).contains(name) && MATLAB_IDENTIFIER.test(name);
  };

  return {
    flashSuccess: flashSuccess,
    flashError: flashError,
    prompt: prompt,
    confirm: confirm,
    isMatlabIdentifier: isMatlabIdentifier,
    init: function() {
      $.pnotify.defaults.styling = 'bootstrap3';
      $.pnotify.defaults.history = false;
    },
  };
})();
