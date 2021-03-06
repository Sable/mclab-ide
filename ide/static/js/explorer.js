ide.explorer = (function() {
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
    var root = new TreeNode('<dummy>');
    files.forEach(root.add.bind(root));
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
      var index = _(this.children()).sortedIndex(node, function (node) {
        return node.name();
      });
      this.children.splice(index, 0, node);
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
    while (node.parent) {
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
    this.root = ko.observable(new TreeNode('<dummy>'));

    // Define event handlers here -- otherwise we can't use 'this' to access
    // the current object. (I guess).
    var self = this;

    this.newFile = function(form) {
      var path = ide.utils.toMfile(form.path.value);
      if (self.fileExists(path)) {
        self.select(self.root().getByPath(path));
      } else {
        self.createFile(path);
      }
      form.reset();
    };

    this.select = function(file) {
      if (file.leaf()) {
        file.ensureVisible();
        self.trigger('file_selected', file.fullPath());
      }
    };

    this.onContextMenuItem = function(action, node) {
      if (action === 'Rename...') {
        self.doRename(node.fullPath());
      } else if (action === 'Delete') {
        self.doDelete(node.fullPath());
      } else {
        console.log('Unexpected action:', action);
      }
    };
  };

  ProjectExplorer.prototype.setFiles = function(files) {
    this.files(files);
    this.root(TreeNode.fromFiles(files));
  };

  ProjectExplorer.prototype.fileExists = function(path) {
    return _(this.files()).contains(path);
  }

  ProjectExplorer.prototype.createFile = function(path) {
    ide.ajax.writeFile(path, '', function() {
      this.files.push(path);
      this.select(this.root().add(path));
    }.bind(this));
  };

  ProjectExplorer.prototype.doRename = function(name) {
    if (name === 'ide_entry_point.m') {
      ide.utils.flashError("Can't rename ide_entry_point.m.");
      return;
    }
    ide.utils.prompt('New name for ' + name + '?', function (newName) {
      newName = ide.utils.toMfile(newName);
      if (this.fileExists(newName)) {
        ide.utils.flashError("'" + newName + "' already exists.");
        return;
      }
      this.trigger('file_renamed', name, newName, function() {
        ide.ajax.renameFile(name, newName, function() {
          this.files.remove(name);
          this.files.push(newName);
          this.root().getByPath(name).remove();
          this.root().add(newName).ensureVisible();
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  ProjectExplorer.prototype.doDelete = function(name) {
    if (name === 'ide_entry_point.m') {
      ide.utils.flashError("Can't delete ide_entry_point.m.");
      return;
    }
    ide.utils.confirm("Are you sure you want to delete file '" + name + "'?",
      function() {
        this.trigger('file_deleted', name, function() {
          ide.ajax.deleteFile(name, function() {
            this.files.remove(name);
            this.root().getByPath(name).remove();
          }.bind(this));
        }.bind(this));
      }.bind(this));
  };

  _.extend(ProjectExplorer.prototype, ide.utils.EventsMixin);

  return {
    TreeNode: TreeNode,
    ProjectExplorer: ProjectExplorer
  };
})();
