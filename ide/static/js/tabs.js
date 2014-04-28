ide.tabs = (function() {
  var Tab = function (name) {
    this.name = ko.observable(name);
    this.dirty = ko.observable(false);
  };

  var TabsViewModel = function (editor) {
    var self = this;

    // TODO(isbadawi): Does this belong here?
    $(window).on('beforeunload', function() {
      // TODO(isbadawi): Prompt to save, not just warn?
      var num_dirty = self.numDirtyTabs();
      if (num_dirty > 0) {
        var plural = num_dirty === 1 ? '' : 's';
        return [
          'You have ' + num_dirty + ' unsaved file' + plural + '.',
          'If you leave the page, you will lose any unsaved changes.'
        ].join('\n');
      }
    });

    self.tabs = ko.observableArray();
    self.selectedTab = ko.observable();

    self.selectedTab.subscribe(function (tab) {
      self.trigger('tab_select', tab.name());
    });

    self.tabs.subscribe(function (tabs) {
      if (tabs.length === 0) {
        self.trigger('all_tabs_closed');
      }
    });

    self.numDirtyTabs = function() {
      return _(self.tabs()).filter(function(tab) {
        return tab.dirty();
      }).length;
    };

    self.closeTab = function(tab) {
      if (!tab.dirty()) {
        self.forceCloseTab(tab);
        return;
      }
      ide.utils.confirm('This file has unsaved changes. Really close?',
        function() {
          self.forceCloseTab(tab);
        }
      );
    };

    self.forceCloseTab = function(tab) {
      if (tab === self.selectedTab()) {
        var i = self.tabs.indexOf(tab);
        var next = self.tabs()[i == 0 ? 1 : i - 1];
        if (next) {
          self.selectedTab(next);
        }
      }
      self.tabs.remove(tab);
    };

    self.findByName = function(name) {
      return _(self.tabs()).find(function (tab) {
        return tab.name() === name;
      });
    };

    self.openTab = function(path) {
      var tab = self.findByName(path);
      if (!tab) {
        tab = new Tab(path);
        self.tabs.push(tab);
      }
      self.selectedTab(tab);
    };
  };

  _.extend(TabsViewModel.prototype, ide.utils.EventsMixin);

  return {
    TabsViewModel: TabsViewModel
  };
})();
