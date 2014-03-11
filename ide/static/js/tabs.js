ide.tabs = (function() {
  var Tab = function (li, label, manager) {
    this.li = li;
    this.label = label;
    this.li.data('tab', this);
    this.manager = manager;
  };

  Tab.prototype.getSiblings = function() {
    return this.li.siblings().map(function (i, li) {
      return $(li).data('tab');
    });
  };

  Tab.prototype.getClosestTab = function() {
    var tab = this.li.prev('li');
    if (tab.length === 0) {
      tab = this.li.next('li');
    }
    if (tab.length !== 0) {
      return tab.data('tab') || null;
    }
    return null;
  }

  Tab.prototype.isSelected = function() {
    return this.li.hasClass('active');
  };

  Tab.prototype.unselect = function() {
    this.li.removeClass('active');
  };

  Tab.prototype.select = function() {
    this.li.addClass('active');
    this.getSiblings().each(function (i, tab) { tab.unselect(); });
    this.manager.trigger('tab_select', this.label);
  };

  Tab.prototype.close = function() {
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

  var TabManager = function(ul) {
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


  TabManager.prototype.on = function(event, callback) {
    this.ul.on(event, callback);
    return this;
  };

  TabManager.prototype.trigger = function(event, arg) {
    this.ul.trigger(event, arg);
  };

  TabManager.prototype.getNumTabs = function(name) {
    return Object.keys(this.tabs).length;
  };

  TabManager.prototype.getTabLabeled = function(name) {
    return this.tabs[name];
  };

  TabManager.prototype.hasTabLabeled = function(name) {
    return name in this.tabs;
  };

  TabManager.prototype.removeTabLabeled = function(name) {
    delete this.tabs[name];
  };

  TabManager.prototype.getSelectedTab = function() {
    return this.ul.find('li.active').data('tab');
  };

  TabManager.prototype.createTab = function(filename) {
    var li = $('<li>').append($('<a>').attr('href', '#').append(
      filename, '&nbsp;', ide.utils.makeIcon('remove')));
    li.insertBefore(this.newTabButton);
    this.tabs[filename] = new Tab(li, filename, this);
    return this.tabs[filename];
  };

  return {
    TabManager: TabManager
  };
})();
