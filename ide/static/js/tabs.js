ide.tabs = (function() {
  var Tab = function (li, name) {
    this.li = li;
    this.name = name;
    this.label = this.li.find('a').first();
    this.li.data('tab', this);
    this.dirty = false;
  };

  Tab.create = function(name, parent) {
    var li =
      $('<li>').append(
        $('<a>')
          .attr('href', '#')
          .append(name, '&nbsp;', ide.utils.makeIcon('remove'))
      ).appendTo(parent);
    return new Tab(li, name);
  };

  Tab.prototype.markDirty = function() {
    if (!this.dirty) {
      this.dirty = true;
      this.label.prepend('*');
    }
  };

  Tab.prototype.clearDirty = function() {
    if (this.dirty) {
      this.dirty = false;
      this.label.html(this.label.html().substring(1));
    }
  };

  Tab.prototype.getNext = function() {
    var tab = this.li.prev('li');
    if (tab.length === 0) {
      tab = this.li.next('li');
    }
    if (tab.length !== 0) {
      return tab.data('tab') || null;
    }
    return null;
  };

  Tab.prototype.selected = function() {
    return this.li.hasClass('active');
  };

  Tab.prototype.close = function() {
    this.li.remove();
  };

  Tab.prototype.select = function() {
    this.li.addClass('active');
    _.chain(this.li.siblings()).map($).invoke('removeClass', 'active');
  };

  Tab.prototype.rename = function(newName) {
    this.label.html(this.label.html().replace(this.name, newName));
    this.name = newName;
  };

  Tab.prototype.remove = function() {
    this.li.remove();
  };

  var TabManager = function(ul) {
    this.ul = ul;
    this.tabs = {};
    this.callbacks = {
      all_tabs_closed: null,
      tab_select: null,
    };

    var self = this;
    this.ul
      .on('click', 'li:not(.editor-add-file)', function() {
        self.select($(this).data('tab').name);
      })
      .on('click', 'span.glyphicon-remove', function() {
        self.close($(this).parents('li').first().data('tab').name);
        return false;
      });
  };

  TabManager.prototype.on = function(event, callback) {
    this.callbacks[event] = callback;
    return this;
  };

  TabManager.prototype.trigger = function(event) {
    var callback = this.callbacks[event];
    if (callback) {
      callback.apply(null, _(arguments).toArray().slice(1));
    }
  };

  TabManager.prototype.numDirtyTabs = function(name) {
    return _.chain(this.tabs).values().where({dirty: true}).size().value();
  };

  TabManager.prototype.isDirty = function(name) {
    return this.tabs[name].dirty;
  };

  TabManager.prototype.has = function(name) {
    return _(this.tabs).has(name);
  };

  TabManager.prototype.close = function(name) {
    var tab = this.tabs[name];
    if (!tab.dirty) {
      this.forceClose(name);
      return;
    }
    ide.utils.confirm('This file has unsaved changes. Really close?', function (confirmed) {
      if (confirmed) {
        this.forceClose(name);
      }
    }.bind(this));
  };

  TabManager.prototype.forceClose = function(name) {
    var tab = this.tabs[name];
    if (tab.selected()) {
      var next = tab.getNext();
      if (next !== null) {
        this.select(next.name);
      }
    }
    tab.close();

    delete this.tabs[name];
    if (_(this.tabs).isEmpty()) {
      this.trigger('all_tabs_closed');
    }
  };

  TabManager.prototype.rename = function(name, newName) {
    var tab = this.tabs[name];
    tab.rename(newName);
    this.tabs[newName] = tab;
    delete this.tabs[name];
  };

  TabManager.prototype.select = function(name) {
    this.tabs[name].select();
    this.trigger('tab_select', name);
  };

  TabManager.prototype.getSelected = function() {
    return _(this.tabs).find(function (tab) {
      return tab.selected();
    }).name;
  };

  TabManager.prototype.markDirty = function(name) {
    this.tabs[name].markDirty();
  };

  TabManager.prototype.clearDirty = function(name) {
    this.tabs[name].clearDirty();
  };

  TabManager.prototype.create = function(name) {
    this.tabs[name] = Tab.create(name, this.ul);
  };

  return {
    TabManager: TabManager
  };
})();
