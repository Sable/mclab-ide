ide.tabs = (function() {
  var Tab = function (li, label, manager) {
    this.li = li;
    this.label = label;
    this.label_el = this.li.find('a').first();
    this.li.data('tab', this);
    this.manager = manager;
    this.is_dirty = false;
  };

  Tab.prototype.setDirty = function() {
    if (!this.is_dirty) {
      this.is_dirty = true;
      this.label_el.prepend('*');
    }
  }

  Tab.prototype.clearDirty = function() {
    if (this.is_dirty) {
      this.is_dirty = false;
      this.label_el.html(this.label_el.html().substring(1));
    }
  }

  Tab.prototype.getSiblings = function() {
    return _.chain(this.li.siblings()).map($).invoke('data', 'tab').value();
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
    _(this.getSiblings()).invoke('unselect');
    this.manager.trigger('tab_select', this.label);
  };

  Tab.prototype.close = function() {
    // TODO(isbadawi): Prompt to save, not just warn?
    if (!this.is_dirty) {
      this.forceClose();
      return;
    }
    var self = this;
    ide.utils.confirm('This file has unsaved changes. Really close?', function (confirmed) {
      if (confirmed) {
        self.forceClose();
      }
    });
  };

  Tab.prototype.rename = function(newName) {
    this.label_el.html(this.label_el.html().replace(this.label, newName));

    // TODO(isbadawi): It's not nice that the tab is reaching into its manager
    delete this.manager.tabs[this.label];
    this.manager.tabs[newName] = this;
    this.label = newName;
  }

  Tab.prototype.forceClose = function() {
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

  TabManager.prototype.getAllTabs = function(name) {
    return _(this.tabs).values();
  }

  TabManager.prototype.getDirtyTabs = function(name) {
    return _(this.getAllTabs()).where({is_dirty: true});
  }

  TabManager.prototype.getTabLabeled = function(name) {
    return this.tabs[name];
  };

  TabManager.prototype.hasTabLabeled = function(name) {
    return _(this.tabs).has(name);
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
    li.appendTo(this.ul);
    this.tabs[filename] = new Tab(li, filename, this);
    return this.tabs[filename];
  };

  return {
    TabManager: TabManager
  };
})();
