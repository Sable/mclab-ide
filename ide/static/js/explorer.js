ide.explorer = (function() {
  var ProjectExplorer = function(id) {
    this.el = $('#' + id);
    this.tree = this.el.find('#files');
    this.files = [];

    this.callbacks = {
      file_selected: null,
      file_renamed: null,
      file_deleted: null
    };

    var self = this;
    this.el.find('#new-file-form').submit(function (e) {
      e.preventDefault();
      var path = $(this).serializeArray()[0].value;
      if (self.checkFilename(path)) {
        self.createFile(path);
        this.reset();
      }
    });

    this.tree.on('tree.dblclick', (function (e) {
      this.nodeSelected(e.node);
    }).bind(this));

    this.createTree();
    this.createContextMenu();
    this.refresh();
  };

  ProjectExplorer.prototype.on = function(event, callback) {
    this.callbacks[event] = callback;
    return this;
  };

  ProjectExplorer.prototype.trigger = function(event) {
    var callback = this.callbacks[event];
    if (callback) {
      callback.apply(null, Array.prototype.slice.call(arguments, 1));
    }
  };

  ProjectExplorer.prototype.checkFilename = function(path) {
    if (!/[^\s].m$/.test(path)) {
      ide.utils.flashError('Please enter a file name that ends in .m.');
      return false;
    }
    if (this.files.indexOf(path) !== -1) {
      ide.utils.flashError('A file with that name already exists.');
      return false;
    }
    return true;
  }

  ProjectExplorer.prototype.createFile = function(path) {
    ide.ajax.writeFile(path, '', (function() {
      // TODO(isbadawi): Just edit the tree instead of refreshing completely?
      this.refresh((function() {
        this.trigger('file_selected', path);
      }).bind(this));
    }).bind(this));
  };

  ProjectExplorer.prototype.nodeSelected = function(node) {
    if (node.children.length > 0) {
      this.el.tree('toggle', node, false);
      return;
    }
    var parts = [];
    while (node.name !== undefined) {
      parts.unshift(node.name);
      node = node.parent;
    }
    this.trigger('file_selected', parts.join('/'));
  };

  var Dir = function(name) {
    this.name = name;
    this.files = {};
  };

  Dir.prototype.add = function (path) {
    if (path.length === 0) {
      return;
    }
    var parts = path.split('/');
    if (!(parts[0] in this.files)) {
      this.files[parts[0]] = new Dir(parts[0]);
    }
    this.files[parts[0]].add(parts.slice(1).join('/'));
  };

  Dir.prototype.toJqTree = function() {
    return {
      label: this.name,
      children: Object.keys(this.files).map((function (k) {
        return this.files[k].toJqTree();
      }).bind(this)),
    };
  };

  var filesToJqTree = function(files) {
    var tree = new Dir('<dummy>');
    files.forEach(tree.add.bind(tree));
    return tree.toJqTree().children;
  };

  ProjectExplorer.prototype.refresh = function(callback) {
    ide.ajax.getFiles((function (files) {
      this.files = files;
      this.drawTree();
      if (callback) {
        callback();
      }
    }).bind(this));
  };

  ProjectExplorer.prototype.createTree = function() {
    this.el.find('#files').tree({
      data: {},
      selectable: true,
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
  }

  ProjectExplorer.prototype.drawTree = function() {
    this.tree.tree('loadData', filesToJqTree(this.files));
  };

  ProjectExplorer.prototype.getSelectedNodeFromMouseEvent = function(e) {
    var item = $(document.elementFromPoint(e.clientX, e.clientY));
    var name = null;
    if (item.hasClass('jqtree-title')) {
      name = item.text();
    } else {
      name = item.find('.jqtree-title').text();
    }
    var node = this.tree.tree('getNodeByName', name);
    this.tree.tree('selectNode', node);
    return node;
  };

  ProjectExplorer.prototype.createContextMenu = function() {
    var self = this;
    var selectedNode = null;
    this.el.contextmenu({
      target: '#files-context-menu',
      before: function (e) {
        e.preventDefault();
        selectedNode = self.getSelectedNodeFromMouseEvent(e);
        return true;
      },
      onItem: function (e, item) {
        var action = $(item).text();
        if (action === 'Rename...') {
          self.doRename(selectedNode);
        } else if (action === 'Delete') {
          self.doDelete(selectedNode);
        } else {
          console.log('Unexpected action:', action);
        }
        self.tree.tree('selectNode', null);
      },
    });
  };

  ProjectExplorer.prototype.doRename = function(node) {
    var newName = prompt('New name for ' + node.name + '?');
    if (newName === null || newName.trim().length === 0) {
      return;
    };
    if (!this.checkFilename(newName)) {
      return;
    }
    var self = this;
    this.trigger('file_renamed', node.name, newName, function() {
      ide.ajax.renameFile(node.name, newName, function() {
        self.files.splice(self.files.indexOf(node.name), 1);
        self.files.push(newName);
        self.tree.tree('updateNode', node, newName);
      });
    });
  };

  ProjectExplorer.prototype.doDelete = function(node) {
    if (!confirm("Are you sure you want to delete file '" + node.name + "'?")) {
      return;
    }
    var self = this;
    this.trigger('file_deleted', node.name, function() {
      ide.ajax.deleteFile(node.name, function() {
        self.files.splice(self.files.indexOf(node.name), 1);
        self.tree.tree('removeNode', node);
      });
    });
  };

  return {
    ProjectExplorer: ProjectExplorer
  };
})();
