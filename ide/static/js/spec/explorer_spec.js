describe('ProjectExplorer', function() {
  beforeEach(function() {
    this.explorer = new ide.explorer.ProjectExplorer();
    this.explorer.setFiles([
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
    expectTreesEqual(this.explorer.root(),
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
    var callback = jasmine.createSpy('callback');
    this.explorer.on('file_selected', callback);
    this.explorer.select(this.explorer.root().getByPath('lib/one.m'));
    expect(callback).toHaveBeenCalledWith('lib/one.m');
  });

  describe('renaming files', function() {
    beforeEach(function() {
      this.tryToRename = function(from, to, fs) {
        spyOn(ide.ajax, 'renameFile').and.callFake(function(from, to, done) {
          if (fs) {
            done();
          }
        });
        spyOn(ide.utils, 'prompt').and.callFake(function(message, cb) {
          cb(to);
        });
        this.explorer.doRename(from);
      }
    });

    it('reflects the rename in the file tree', function() {
      expect(this.explorer.root().getByPath('lib/one.m').fullPath()).toEqual('lib/one.m');
      this.explorer.on('file_renamed', function(_, _, doIt) {
        doIt();
      });
      this.tryToRename('lib/one.m', 'lib/three.m', true);
      expect(this.explorer.root().getByPath('lib/one.m')).toBeFalsy();
      expect(this.explorer.root().getByPath('lib/three.m').fullPath()).toEqual('lib/three.m');
    });

    it('emits a file_renamed event before renaming', function() {
      var callback = jasmine.createSpy('callback');
      this.explorer.on('file_renamed', callback);
      this.tryToRename('lib/one.m', 'lib/f.m');
      expect(callback).toHaveBeenCalled();
      expect(ide.ajax.renameFile).not.toHaveBeenCalled();
    });

    it('lets event listeners accept the rename', function() {
      this.explorer.on('file_renamed', function(from, to, doIt) {
        doIt();
      });
      this.tryToRename('lib/one.m', 'lib/f.m');
      expect(ide.ajax.renameFile).toHaveBeenCalled();
    });

    it('lets event listeners cancel the rename', function() {
      this.explorer.on('file_renamed', function(from, to, doIt) { });
      this.tryToRename('lib/one.m', 'lib/f.m');
      expect(ide.ajax.renameFile).not.toHaveBeenCalled();
    });

    it('adds a .m extension if missing', function() {
      var callback = jasmine.createSpy('callback');
      this.explorer.on('file_renamed', callback);
      this.tryToRename('lib/one.m', 'lib/f.xxx');
      expect(callback).toHaveBeenCalledWith('lib/one.m', 'lib/f.xxx.m', jasmine.any(Function));
    });

    it('rejects names already in the project', function() {
      var callback = jasmine.createSpy('callback');
      this.explorer.on('file_renamed', callback);
      this.tryToRename('lib/one.m', 'lib/two.m');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('deleting files', function() {
    beforeEach(function() {
      spyOn(ide.ajax, 'deleteFile');
      spyOn(ide.utils, 'confirm').and.callFake(function(message, cb) { cb() });
    });

    it('asks for confirmation', function() {
      this.explorer.doDelete('lib/one.m');
      expect(ide.utils.confirm).toHaveBeenCalled();
    })

    it('emits a file_deleted event before deleting', function() {
      var callback = jasmine.createSpy('callback');
      this.explorer.on('file_deleted', callback);
      this.explorer.doDelete('lib/one.m');
      expect(callback).toHaveBeenCalled();
      expect(ide.ajax.deleteFile).not.toHaveBeenCalled();
    });

    it('lets event listeners accept the deletion', function() {
      this.explorer.on('file_deleted', function(path, doIt) {
        doIt();
      });
      this.explorer.doDelete('lib/one.m');
      expect(ide.ajax.deleteFile).toHaveBeenCalled();
    });

    it('lets event listeners cancel the deletion', function() {
      this.explorer.on('file_deleted', function(path, doIt) { });
      this.explorer.doDelete('lib/one.m');
      expect(ide.ajax.deleteFile).not.toHaveBeenCalled();
    });
  });
});
