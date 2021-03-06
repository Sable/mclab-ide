ide.tabs = (function() {
  var Tab = function (name) {
    this.name = ko.observable(name);
    this.dirty = ko.observable(false);
  };

  var TabsViewModel = function () {
    var self = this;

    self.tabs = ko.observableArray();
    self.selectedTab = ko.observable();

    self.selectedTab.subscribe(function (tab) {
      if (tab) {
        self.trigger('tab_select', tab);
      }
    });

    self.tabs.subscribe(function (tabs) {
      if (tabs.length === 0) {
        self.trigger('all_tabs_closed');
      }
    });

    self.numDirtyTabs = function() {
      return self.tabs().filter(function(tab) {
        return tab.dirty();
      }).length;
    };

    self.beforeUnloadText = ko.computed(function() {
      var num_dirty = self.numDirtyTabs();
      if (num_dirty > 0) {
        var plural = num_dirty === 1 ? '' : 's';
        return [
          'You have ' + num_dirty + ' unsaved file' + plural + '.',
          'If you leave the page, you will lose any unsaved changes.'
        ].join('\n');
      }
    });

    self.closeTab = function(tab) {
      if (!tab.dirty()) {
        self.forceCloseTab(tab);
        return;
      }
      ide.utils.confirm('This file has unsaved changes. Really close?',
          self.forceCloseTab.bind(self, tab));
    };

    self.forceCloseTab = function(tab) {
      if (tab === self.selectedTab()) {
        var i = self.tabs.indexOf(tab);
        self.selectedTab(self.tabs()[i == 0 ? 1 : i - 1]);
      }
      self.tabs.remove(tab);
    };

    self.findByName = function(name) {
      return _(self.tabs()).find(function (tab) {
        return tab.name() === name;
      });
    };

    self.newTab = function(name) {
      var tab = new Tab(name);
      self.tabs.push(tab);
      return tab;
    };

    self.openTab = function(path) {
      var tab = self.findByName(path);
      if (!tab) {
        tab = self.newTab(path);
      }
      self.selectedTab(tab);
      return tab;
    };

    self.onContextMenuItem = function (action, tab) {
      if (action === 'Close') {
        self.closeTab(tab);
      } else if (action === 'Save') {
        self.trigger('tab_save', tab);
      }
    };
  };

  _.extend(TabsViewModel.prototype, ide.utils.EventsMixin);

  return {
    TabsViewModel: TabsViewModel
  };
})();
