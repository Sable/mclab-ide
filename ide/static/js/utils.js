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

  return {
    makeIcon: makeIcon,
    flashSuccess: flashSuccess,
    flashError: flashError,
    init: function() {
      $.pnotify.defaults.styling = 'bootstrap3';
      $.pnotify.defaults.history = false;
    },
  };
})();
