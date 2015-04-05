import contextlib
import os
import pathlib
import shutil

WORKSPACE_DIR = pathlib.Path(os.path.expanduser('~/mclab-ide-projects'))


def mkdir_p(path):
    with contextlib.suppress(FileExistsError):
        path.mkdir(parents=True)


def get_all_projects():
    mkdir_p(WORKSPACE_DIR)
    return (Project(path.name) for path in WORKSPACE_DIR.iterdir())


class Project(object):
    def __init__(self, name):
        self.name = name
        self.root = WORKSPACE_DIR / self.name

    def exists(self):
        return self.root.exists()

    def create(self):
        mkdir_p(self.root)
        self.write_file('ide_entry_point.m', '''
function ide_entry_point()
  % This function is used as an entry point for profiling runs, which
  % provide the data powering features such as jump-to-definition and
  % find callers. You should fill it in with code that exercises as
  % much of your project as possible.
end'''[1:])

    def delete(self):
        shutil.rmtree(str(self.root))

    def files(self):
        return [path.relative_to(self.root) for path in self.root.rglob('*')
                if path.name.endswith('.m') and not path.name.startswith('.')]

    def path(self, file):
        return self.root / file

    def read_file(self, file):
        with self.path(file).open() as f:
            return f.read()

    def write_file(self, file, contents):
        path = self.path(file)
        mkdir_p(path.parent)
        with path.open('w') as f:
            f.write(contents)

    def delete_file(self, file):
        path = self.path(file)
        if path.is_dir():
            shutil.rmtree(str(path))
        else:
            path.unlink()

    def rename_file(self, src, dest):
        src, dest = self.path(src), self.path(dest)
        mkdir_p(dest.parent)
        src.rename(dest)
