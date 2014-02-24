mclab = window.mclab || {};
mclab.editor = mclab.editor || {};

mclab.editor.Tab = function (li, label, session, manager) {
  this.li = li;
  this.label = label;
  this.li.data('tab', this);
  this.session = session;
  this.manager = manager;
};

mclab.editor.Tab.prototype.getSiblings = function() {
  return this.li.siblings().map(function (i, li) {
    return $(li).data('tab');
  });
};

mclab.editor.Tab.prototype.getClosestTab = function() {
  var tab = this.li.prev('li');
  if (tab.length === 0) {
    tab = this.li.next('li');
  }
  if (tab.length !== 0) {
    return tab.data('tab') || null;
  }
  return null;
}

mclab.editor.Tab.prototype.isSelected = function() {
  return this.li.hasClass('active');
};

mclab.editor.Tab.prototype.unselect = function() {
  this.li.removeClass('active');
};

mclab.editor.Tab.prototype.select = function() {
  this.li.addClass('active');
  this.getSiblings().each(function (i, tab) { tab.unselect(); });
  this.manager.editor.editor.setSession(this.session);
  this.manager.editor.show();
};

mclab.editor.Tab.prototype.close = function() {
  if (this.isSelected()) {
    var tab = this.getClosestTab();
    if (tab !== null) {
      tab.select();
    }
  }

  this.manager.removeTabLabeled(this.label);
  this.li.remove();

  if (this.manager.getNumTabs() === 0) {
    this.manager.editor.hide();
  }
};

mclab.editor.TabManager = function(editor) {
  this.editor = editor;
  this.el = editor.el;
  this.tabs = {};

  this.el.find('ul.editor-tabs')
    .on('click', 'li:not(.editor-add-file)', function() {
      $(this).data('tab').select();
    })
    .on('click', 'span.glyphicon-remove', function() {
      $(this).parents('li').first().data('tab').close();
      return false;
    });

  this.newTabButton = this.el.find('.editor-add-file').first();
  this.newTabButton.on('click', (function () {
    var filename = prompt('Name: ');
    if (filename !== null && /[^\s]/.test(filename)) {
      this.createTab(filename).select();
    }
  }).bind(this));
};

mclab.editor.TabManager.prototype.getNumTabs = function(name) {
  return Object.keys(this.tabs).length;
};

mclab.editor.TabManager.prototype.getTabLabeled = function(name) {
  return this.tabs[name];
};

mclab.editor.TabManager.prototype.hasTabLabeled = function(name) {
  return name in this.tabs;
};

mclab.editor.TabManager.prototype.removeTabLabeled = function(name) {
  delete this.tabs[name];
};

mclab.editor.TabManager.prototype.getSelectedTab = function() {
  return this.el.find('ul.editor-tabs li.active').data('tab');
};

mclab.editor.TabManager.prototype.createTab = function(filename, contents) {
  if (contents === undefined) {
    contents = '';
  }
  var li = $('<li>').append($('<a>').attr('href', '#').append(
    filename, '&nbsp;', mclab.utils.makeIcon('remove')));
  li.insertBefore(this.newTabButton);
  this.tabs[filename] = new mclab.editor.Tab(li, filename, this.newSession(contents), this);
  return this.tabs[filename];
};

mclab.editor.TabManager.prototype.newSession = function(text) {
  var session = ace.createEditSession(text, 'ace/mode/matlab');
  session.setUseSoftTabs(true);
  return session;
};

mclab.editor.TabManager.prototype.openFile = function(path) {
  if (this.hasTabLabeled(path)) {
    this.getTabLabeled(path).select();
    return;
  }
  var self = this;
  mclab.ajax.readFile(path, function (data) {
    self.createTab(path, data).select();
  });
};
