ide.explorer = (function() {
  var ProjectExplorer = function(id, callback) {
    this.el = $('#' + id);
    this.tree = this.el.find('#files');
    this.files = [];
    this.fileSelectedCallback = callback;

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
    this.refresh();
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
      this.refresh((function() {
        this.fileSelectedCallback(path);
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
    this.fileSelectedCallback(parts.join('/'));
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
  }

  ProjectExplorer.prototype.drawTree = function() {
    this.tree.tree('loadData', filesToJqTree(this.files));
  };

  return {
    ProjectExplorer: ProjectExplorer
  };
})();
