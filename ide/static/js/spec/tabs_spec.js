describe('TabsViewModel', function() {
  beforeEach(function() {
    this.tabs = new ide.tabs.TabsViewModel();
  });

  it('has initially no tabs', function() {
    expect(this.tabs.tabs().length).toBe(0);
  });

  it('can create new tabs', function() {
    var tab = this.tabs.newTab('hello');
    expect(this.tabs.tabs().length).toBe(1);
    expect(this.tabs.tabs()[0]).toBe(tab);
  });

  describe('selecting tabs', function() {
    it('initially has no selected tabs', function() {
      expect(this.tabs.selectedTab()).toBeFalsy();
    });

    it('remembers the selected tab', function() {
      var tab = this.tabs.newTab('hello');
      this.tabs.selectedTab(tab);
      expect(this.tabs.selectedTab()).toBe(tab);
    });

    it('has only one selected tab', function() {
      var tab1 = this.tabs.newTab('first');
      var tab2 = this.tabs.newTab('second');
      this.tabs.selectedTab(tab1);
      this.tabs.selectedTab(tab2);
      expect(this.tabs.selectedTab()).toBe(tab2);
    });

    it('emits a tab_select event when a tab is selected', function() {
      var callback = jasmine.createSpy('callback');
      this.tabs.on('tab_select', callback);
      var tab = this.tabs.newTab('hello');
      this.tabs.selectedTab(tab);

      expect(callback).toHaveBeenCalledWith(tab);
    });

    it('does not emit an event when the selection is cleared', function() {
      var callback = jasmine.createSpy('callback');
      var tab = this.tabs.newTab('hello');
      this.tabs.selectedTab(tab);
      this.tabs.on('tab_select', callback);
      this.tabs.selectedTab(null);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('closing tabs', function() {
    it('can close tabs', function() {
      var tab = this.tabs.newTab('hello');
      this.tabs.closeTab(tab);
      expect(this.tabs.tabs().length).toBe(0);
    });

    it('emits an all_tabs_closed event when all tabs are closed', function() {
      var callback = jasmine.createSpy('callback');
      this.tabs.on('all_tabs_closed', callback);

      var tab1 = this.tabs.newTab('first');
      var tab2 = this.tabs.newTab('second');
      this.tabs.closeTab(tab1);
      expect(callback).not.toHaveBeenCalled();
      this.tabs.closeTab(tab2);
      expect(callback).toHaveBeenCalled();
    });

    describe('closing dirty tabs', function() {
      it('asks for confirmation', function() {
        var tab = this.tabs.newTab('hello');
        tab.dirty(true);

        // Cancel first time, confirm second time
        var first = true;
        spyOn(ide.utils, 'confirm').andCallFake(function(message, cb) {
          if (first) {
            first = false;
          } else {
            cb();
          }
        });

        this.tabs.closeTab(tab);
        expect(this.tabs.tabs().length).toBe(1);
        this.tabs.closeTab(tab);
        expect(this.tabs.tabs().length).toBe(0);
      });
    });

    describe('closing the selected tab', function() {
      it('selects the previous tab', function() {
        var tab1 = this.tabs.newTab('first');
        var tab2 = this.tabs.newTab('two');
        var tab3 = this.tabs.newTab('three');
        this.tabs.selectedTab(tab2);
        this.tabs.closeTab(tab2);
        expect(this.tabs.selectedTab()).toBe(tab1);
      });

      it('selects the next tab if there is no previous tab', function() {
        var tab1 = this.tabs.newTab('first');
        var tab2 = this.tabs.newTab('two');
        this.tabs.selectedTab(tab1);
        this.tabs.closeTab(tab1);
        expect(this.tabs.selectedTab()).toBe(tab2);
      });

      it('clears the selection if there are no other tabs', function() {
        var tab = this.tabs.newTab('hello');
        this.tabs.selectedTab(tab);
        this.tabs.closeTab(tab);
        expect(this.tabs.selectedTab()).toBeFalsy();
      });
    });
  });

  describe('opening tabs', function() {
    it('creates a new tab and selects it', function() {
      var tab = this.tabs.openTab('hello');
      expect(this.tabs.tabs().length).toBe(1);
      expect(this.tabs.selectedTab()).toBe(tab);
    });
  });

  describe('saving tabs', function() {
    it('emits a tab_save event', function() {
      var callback = jasmine.createSpy('callback');
      this.tabs.on('tab_save', callback);
      var tab = this.tabs.openTab('hello');
      this.tabs.onContextMenuItem('Save', tab);
      expect(callback).toHaveBeenCalledWith(tab);
    });
  });
});
