mclab = window.mclab || {};
mclab.utils = mclab.utils || {};

mclab.utils.makeIcon = function(icon) {
  return $('<span>').addClass('glyphicon glyphicon-' + icon);
};

mclab.utils.flashSuccess = function(text) {
  mclab.utils.flashNotification('success', 'Success!', text);
}

mclab.utils.flashError = function(text) {
  mclab.utils.flashNotification('error', 'Something went wrong.', text);
}

mclab.utils.flashNotification = function(type, title, text) {
  $.pnotify({
    title: title,
    text: text,
    type: type,
    delay: 2000
  });
}

$(function() {
  $.pnotify.defaults.styling = 'bootstrap3';
  $.pnotify.defaults.history = false;
});
