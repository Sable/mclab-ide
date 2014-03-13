import errno
import os
import shutil

WORKSPACE_DIR = os.path.expanduser('~/mclab-ide-projects')


def get_all_projects():
    return map(Project, os.listdir(WORKSPACE_DIR))


def mkdir_p(path):
    try:
        os.makedirs(path)
    except OSError as e:
        if e.errno != errno.EEXIST or not os.path.isdir(path):
            raise


class Project(object):
    def __init__(self, name):
        self.name = name
        self.root = os.path.join(WORKSPACE_DIR, self.name)

    def exists(self):
        return os.path.exists(self.root)

    def create(self):
        mkdir_p(self.root)

    def delete(self):
        shutil.rmtree(self.root)

    # TODO(isbadawi): It's not nice that this method is building
    # the tree that jqtree expects. Could just return a bunch of
    # paths and do the conversion in javascript,
    def tree(self, start=None):
        if start is None:
            start = self.root
        dirs = []
        for dir in os.listdir(start):
            abspath = os.path.join(start, dir)
            node = {'label': dir}
            if os.path.isdir(abspath):
                node['children'] = self.tree(abspath)
            dirs.append(node)
        return dirs

    def path(self, file):
        return os.path.join(self.root, file)

    def read_file(self, file):
        with open(self.path(file)) as f:
            return f.read()

    def write_file(self, file, contents):
        path = self.path(file)
        mkdir_p(os.path.dirname(path))
        with open(path, 'w') as f:
            f.write(contents)
