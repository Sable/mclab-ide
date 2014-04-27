ide.explorer = (function() {
  ko.bindingHandlers.contextMenu = {
    init: function (element, valueAccessor) {
      $(element).contextmenu(valueAccessor());
    }
  };

  var TreeNode = function (name, children, parent) {
    this.name = ko.observable(name);
    this.children = ko.observableArray(children || []);
    this.parent = parent;

    this.expanded = ko.observable(false);
    this.leaf = ko.computed(function() {
      return this.children().length === 0;
    }.bind(this));
  };

  TreeNode.fromFiles = function(files) {
    var root = new TreeNode('<dummy');
    files.forEach(function (file) {
      root.add(file);
    });
    return root;
  }

  TreeNode.prototype.toggle = function(node, e) {
    e.stopPropagation();
    this.expanded(!this.expanded());
  };

  TreeNode.prototype.getChildByName = function(name) {
    return _(this.children()).find(function (node) {
      return node.name() === name;
    });
  }

  TreeNode.prototype.getOrCreateChildByName = function(name) {
    var node = this.getChildByName(name);
    if (!node) {
      var node = new TreeNode(name, [], this);
      this.children.push(node);
    }
    return node;
  };

  TreeNode.prototype.add = function (path) {
    if (path.length === 0) {
      return this;
    }
    var parts = path.split('/');
    return this.getOrCreateChildByName(parts[0])
        .add(parts.slice(1).join('/'));
  };

  TreeNode.prototype.getByPath = function(path) {
    var parts = path.split('/');
    var node = this;
    for (var i = 0; i < parts.length; ++i) {
      node = node.getChildByName(parts[i]);
      if (!node) {
        return;
      }
    }
    return node;
  };

  TreeNode.prototype.ensureVisible = function() {
    var node = this;
    while (!node.expanded() && node.parent) {
      node.expanded(true);
      node = node.parent;
    }
  }

  TreeNode.prototype.remove = function() {
    var node = this;
    do {
      node.parent.children.remove(node);
      node = node.parent;
    } while (node.leaf() && node.parent);
  };

  TreeNode.prototype.fullPath = function() {
    var parts = [];
    var node = this;
    while (node.parent) {
      parts.unshift(node.name());
      node = node.parent;
    }
    return parts.join('/');
  }

  var ProjectExplorer = function() {
    this.files = ko.observableArray([]);
    this.root = new TreeNode('<dummy>');

    ide.ajax.getFiles(function (files) {
      this.files(files);
      this.root.children(TreeNode.fromFiles(files).children());
      this.root.children().forEach(function (node) {
        node.parent = this.root;
      }.bind(this));
    }.bind(this));

    this.callbacks = {
      file_selected: null,
      file_renamed: null,
      file_deleted: null
    };

    // Define event handlers here -- otherwise we can't use 'this' to access
    // the current object. (I guess).
    var self = this;

    ProjectExplorer.prototype.newFile = function(form) {
      var path = $(form).serializeArray()[0].value;
      if (self.checkFilename(path)) {
        self.createFile(path);
        form.reset();
      }
    };

    this.select = function(file) {
      if (file.leaf()) {
        self.trigger('file_selected', file.fullPath());
      }
    };

    this.beforeContextMenu = function(e) {
      var el = $(document.elementFromPoint(e.clientX, e.clientY));
      var parents = el.parents('li');
      var node = parents.first();
      var descendents = node.find('li');
      if (parents.length === 0 || descendents.length !== 0) {
        return false;
      }
      self.contextMenuPath = el.parents('li').map(function() {
        return $(this).find('span.file-name').first().text();
      }).get().reverse().join('/');
      return true;
    }

    this.onContextMenuItem = function(e, item) {
      var action = $(item).text();
      if (action === 'Rename...') {
        self.doRename(self.contextMenuPath);
      } else if (action === 'Delete') {
        self.doDelete(self.contextMenuPath);
      } else {
        console.log('Unexpected action:', action);
      }
    };
  };

  ProjectExplorer.prototype.on = function(event, callback) {
    this.callbacks[event] = callback;
    return this;
  };

  ProjectExplorer.prototype.trigger = function(event) {
    var callback = this.callbacks[event];
    if (callback) {
      callback.apply(null, _(arguments).toArray().slice(1));
    }
  };

  ProjectExplorer.prototype.checkFilename = function(path) {
    if (!/[^\s].m$/.test(path)) {
      ide.utils.flashError('Please enter a file name that ends in .m.');
      return false;
    }
    if (_(this.files()).contains(path)) {
      ide.utils.flashError('A file with that name already exists.');
      return false;
    }
    return true;
  };

  ProjectExplorer.prototype.createFile = function(path) {
    ide.ajax.writeFile(path, '', function() {
      this.root.add(path).ensureVisible();
      this.trigger('file_selected', path);
    }.bind(this));
  };

  ProjectExplorer.prototype.doRename = function(name) {
    ide.utils.prompt('New name for ' + name + '?', function (newName) {
      if (!this.checkFilename(newName)) {
        return;
      }
      this.trigger('file_renamed', name, newName, function() {
        ide.ajax.renameFile(name, newName, function() {
          this.files.remove(name);
          this.files.push(newName);
          this.root.getByPath(name).remove();
          this.root.add(newName).ensureVisible();
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  ProjectExplorer.prototype.doDelete = function(name) {
    ide.utils.confirm("Are you sure you want to delete file '" + name + "'?",
      function() {
        this.trigger('file_deleted', name, function() {
          ide.ajax.deleteFile(name, function() {
            this.files.remove(name);
            this.root.getByPath(name).remove();
          }.bind(this));
        }.bind(this));
      }.bind(this));
  };

  return {
    ProjectExplorer: ProjectExplorer
  };
})();
