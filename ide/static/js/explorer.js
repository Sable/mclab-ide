ide.explorer = (function() {
  var ProjectExplorer = function(id, dataUrl, callback) {
    this.el = $('#' + id);
    this.dataUrl = dataUrl;

    this.refresh();

    var self = this;
    this.el.find('#new-file-form').submit(function (e) {
      e.preventDefault();
      var name = $(this).serializeArray()[0].value;
      if (!/[^\s].m$/.test(name)) {
        ide.utils.flashError('Please enter a file name that ends in .m.');
        return;
      }
      ide.ajax.writeFile(name, '', function() {
        self.refresh();
        callback(name);
      });
    });

    this.el.find('#files').on('tree.dblclick', (function (e) {
      if (e.node.children.length > 0) {
        this.tree.tree('toggle', e.node, false);
        return;
      }
      var parts = [];
      var node = e.node;
      while (node.name !== undefined) {
        parts.unshift(node.name);
        node = node.parent;
      }
      callback(parts.join('/'));
    }).bind(this));
  };

  ProjectExplorer.prototype.refresh = function() {
    this.el.find('#files').tree({
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
  };

  return {
    ProjectExplorer: ProjectExplorer
  };
})();
