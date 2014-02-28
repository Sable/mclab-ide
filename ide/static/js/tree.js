ide.tree = (function() {
  var Tree = function(id, dataUrl) {
    this.el = $('#' + id);
    this.dataUrl = dataUrl;
    this.el.tree({
      dataUrl: this.dataUrl,
      selectable: false,
      slide: false,
      useContextMenu: false,
      openedIcon: ide.utils.makeIcon('folder-open').prop('outerHTML'),
      closedIcon: ide.utils.makeIcon('folder-close').prop('outerHTML'),
      onCreateLi: function(node, li) {
        if (node.children.length === 0) {
          li.find('.jqtree-title').before(
            $('<a>')
              .addClass('jqtree_common jqtree-toggler')
              .append(ide.utils.makeIcon('file'))
          );
        }
      },
    });
    return this;
  };

  Tree.prototype.onFileSelect = function(callback) {
    var self = this;
    this.el.on('tree.dblclick', function (e) {
      if (e.node.children.length > 0) {
        self.el.tree('toggle', e.node, false);
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

  return {
    Tree: Tree
  };
})();
