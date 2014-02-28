mclab = window.mclab || {};
mclab.editor = mclab.editor || {};

mclab.editor.Tab = function (li, label, manager) {
  this.li = li;
  this.label = label;
  this.li.data('tab', this);
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
  this.manager.trigger('tab_select', this.label);
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
    this.manager.trigger('all_tabs_closed');
  }
};

mclab.editor.TabManager = function(ul) {
  this.ul = ul;
  this.tabs = {};

  this.ul
    .on('click', 'li:not(.editor-add-file)', function() {
      $(this).data('tab').select();
    })
    .on('click', 'span.glyphicon-remove', function() {
      $(this).parents('li').first().data('tab').close();
      return false;
    });

  this.newTabButton = this.ul.find('.editor-add-file').first();
  this.newTabButton.on('click', (function () {
    var filename = prompt('Name: ');
    if (filename !== null && /[^\s]/.test(filename)) {
      this.createTab(filename).select();
    }
  }).bind(this));
};


mclab.editor.TabManager.prototype.on = function(event, callback) {
  this.ul.on(event, callback);
  return this;
};

mclab.editor.TabManager.prototype.trigger = function(event, arg) {
  this.ul.trigger(event, arg);
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
  return this.ul.find('li.active').data('tab');
};

mclab.editor.TabManager.prototype.createTab = function(filename, contents) {
  var li = $('<li>').append($('<a>').attr('href', '#').append(
    filename, '&nbsp;', mclab.utils.makeIcon('remove')));
  li.insertBefore(this.newTabButton);
  this.tabs[filename] = new mclab.editor.Tab(li, filename, this);
  this.trigger('tab_create', this.tabs[filename]);
  return this.tabs[filename];
};

