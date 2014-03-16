ide.utils = (function() {
  var makeIcon = function(icon) {
    return $('<span>').addClass('glyphicon glyphicon-' + icon);
  };

  var flashSuccess = function(text ) {
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
    bootbox.prompt(message, callback);
  };

  var confirm = function(message, callback) {
    bootbox.confirm(message, callback);
  };

  return {
    makeIcon: makeIcon,
    flashSuccess: flashSuccess,
    flashError: flashError,
    prompt: prompt,
    confirm: confirm,
    init: function() {
      $.pnotify.defaults.styling = 'bootstrap3';
      $.pnotify.defaults.history = false;
    },
  };
})();
