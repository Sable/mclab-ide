ide.tabs = (function() {
  var Tab = function (name) {
    this.name = ko.observable(name);
    this.dirty = ko.observable(false);
    this.selected = ko.observable(false);
  };

  var TabsViewModel = function (editor) {
    var self = this;

    // TODO(isbadawi): Does this belong here?
    $(window).on('beforeunload', function() {
      // TODO(isbadawi): Prompt to save, not just warn?
      var num_dirty = _(self.tabs()).filter(function (tab) {
        return tab.dirty();
      }).length;
      if (num_dirty === 0) {
        return;
      }
      var plural = num_dirty === 1 ? '' : 's';
      return [
        'You have ' + num_dirty + ' unsaved file' + plural + '.',
        'If you leave the page, you will lose any unsaved changes.'
      ].join('\n');
    });

    self.tabs = ko.observableArray([]);
    self.callbacks = {};

    self.selectedTab = function() {
      return _(self.tabs()).find(function (tab) {
        return tab.selected();
      });
    };

    self.selectTab = function(tab) {
      self.tabs().forEach(function (tab) {
        if (tab.selected()) {
          tab.selected(false);
        }
      });
      tab.selected(true);
      self.trigger('tab_select', tab.name());
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
      if (tab.selected()) {
        var i = self.tabs.indexOf(tab);
        var next = self.tabs()[i == 0 ? 1 : i - 1];
        if (next) {
          self.selectTab(next);
        }
      }
      self.tabs.remove(tab);

      if (self.tabs().length === 0) {
        self.trigger('all_tabs_closed');
      }
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
      self.selectTab(tab);
    };

    self.on = function(event, callback) {
      self.callbacks[event] = callback;
      return self;
    }

    self.trigger = function(event) {
      var callback = self.callbacks[event];
      if (callback) {
        callback.apply(null, _(arguments).toArray().slice(1));
      }
    };
  };

  return {
    TabsViewModel: TabsViewModel
  };
})();
