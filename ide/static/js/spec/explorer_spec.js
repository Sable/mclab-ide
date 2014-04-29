describe('ProjectExplorer', function() {
  beforeEach(function() {
    spyOn(ide.ajax, 'getFiles').andCallFake(function (cb) {
      cb([
        'lib/nested/f.m',
        'lib/one.m',
        'lib/two.m',
        'test/one_test.m',
        'test/two_test.m'
      ]);
    });

    this.explorer = new ide.explorer.ProjectExplorer();
  });

  it('gets the project files from the server', function() {
    expect(this.explorer.files()).toEqual([
      'lib/nested/f.m',
      'lib/one.m',
      'lib/two.m',
      'test/one_test.m',
      'test/two_test.m'
    ]);
  });

  var expectTreesEqual = function(actual, expected) {
    expect(expected.name()).toEqual(actual.name());
    expect(expected.children().length).toEqual(expected.children().length);
    _.zip(expected.children(), actual.children()).forEach(function (pair) {
      expectTreesEqual(pair[0], pair[1]);
    });
  };

  it('organizes the files into a tree', function() {
    var node = ide.explorer.TreeNode;
    expectTreesEqual(this.explorer.root,
      new node('<dummy>', [
        new node('lib', [
          new node('nested', [
            new node('f.m')
          ]),
          new node('one.m'),
          new node('two.m')
        ]),
        new node('test', [
          new node('one_test.m'),
          new node('two_test.m')
        ])
      ])
    );
  });

  it('emits a file_selected event when a file is selected', function() {
    var called = false;
    this.explorer.on('file_selected', function(path) {
      expect(path).toEqual('lib/one.m');
      called = true;
    });

    this.explorer.select(this.explorer.root.getByPath('lib/one.m'));
    expect(called).toBe(true);
  });


  describe('renaming files', function() {
    beforeEach(function() {
      this.fileRenamedCallbackWasCalled = false;
      this.explorer.on('file_renamed', function() {
        this.fileRenamedCallbackWasCalled = true;
      }.bind(this));

      this.tryToRename = function(from, to) {
        spyOn(ide.utils, 'prompt').andCallFake(function(message, cb) {
          cb(to);
        });
        this.explorer.doRename(from);
      }
    });

    it('emits a file_renamed event when a file is to be renamed', function() {
      this.tryToRename('lib/one.m', 'lib/f.m');
      expect(this.fileRenamedCallbackWasCalled).toBe(true);
    });

    it('rejects names without a .m extension', function() {
      this.tryToRename('lib/one.m', 'lib/f.xxx');
      expect(this.fileRenamedCallbackWasCalled).toBe(false);
    });

    it('rejects names already in the project', function() {
      this.tryToRename('lib/one.m', 'lib/two.m');
      expect(this.fileRenamedCallbackWasCalled).toBe(false);
    });
  });
});
