ide.utils = (function() {
  PNotify.prototype.options.styling = 'bootstrap3';
  PNotify.prototype.options.history = false;

  var flashNotification = function(type, title, text) {
    new PNotify({ title: title, text: text, type: type, delay: 2000 });
  };

  var flashSuccess = flashNotification.bind(this, 'success', 'Success!');
  var flashError = flashNotification.bind(this, 'error', 'Something went wrong.');

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
  var MATLAB_IDENTIFIER = /^[a-zA-Z]\w{0,62}$/;
  var MATLAB_KEYWORDS = [
    'break', 'case', 'catch', 'classdef', 'continue', 'else', 'elseif', 'end',
    'for', 'function', 'global', 'if', 'otherwise', 'parfor', 'persistent',
    'return', 'spmd', 'switch', 'try', 'while'
  ];
  var isMatlabIdentifier = function(name) {
    return !_(MATLAB_KEYWORDS).contains(name) && MATLAB_IDENTIFIER.test(name);
  };

  var EventsMixin = {
    on: function (event, callback) {
      this.callbacks = this.callbacks || {};
      this.callbacks[event] = callback;
      return this;
    },
    trigger: function (event) {
      this.callbacks = this.callbacks || {};
      var callback = this.callbacks[event];
      if (callback) {
        callback.apply(this, _(arguments).toArray().slice(1));
      }
    }
  };

  return {
    EventsMixin: EventsMixin,
    flashSuccess: flashSuccess,
    flashError: flashError,
    prompt: prompt,
    confirm: confirm,
    isMatlabIdentifier: isMatlabIdentifier,
  };
})();
