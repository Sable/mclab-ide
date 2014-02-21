mclab = window.mclab || {};
mclab.utils = mclab.utils || {};

mclab.utils.makeIcon = function(icon) {
  return $('<span>').addClass('glyphicon glyphicon-' + icon);
};
