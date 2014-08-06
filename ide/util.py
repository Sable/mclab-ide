import os

import sh

root_dir = os.path.dirname(os.path.dirname(__file__))


def root_relative_path(*parts):
    return os.path.join(root_dir, *parts)


def shell_out(program, *args, **kwargs):
    return sh.Command(program)(*args, **kwargs)
