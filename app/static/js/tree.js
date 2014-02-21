mclab = window.mclab || {};
mclab.tree = mclab.tree || {};

mclab.tree.Tree = function(id, dataUrl) {
  this.el = $('#' + id);
  this.dataUrl = dataUrl;
  this.el.tree({
    dataUrl: this.dataUrl,
    selectable: false,
    slide: false,
    openedIcon: mclab.utils.makeIcon('folder-open').prop('outerHTML'),
    closedIcon: mclab.utils.makeIcon('folder-close').prop('outerHTML'),
    onCreateLi: function(node, li) {
      if (node.children.length === 0) {
        li.find('.jqtree-title').before(
          $('<a>')
            .addClass('jqtree_common jqtree-toggler')
            .append(mclab.utils.makeIcon('file'))
        );
      }
    },
  });
  return this;
}

mclab.tree.Tree.prototype.onFileSelect = function(callback) {
  this.el.on('tree.dblclick', function (e) {
    if (e.node.children.length > 0) {
      return;
    }
    var parts = [];
    var node = e.node;
    while (node.name !== undefined) {
      parts.unshift(node.name);
      node = node.parent;
    }
    callback(parts.join('/'));
  });
};
