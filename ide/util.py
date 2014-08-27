import pathlib

import sh

root_dir = pathlib.Path(__file__).parent.parent


def root_relative_path(*parts):
    return root_dir.joinpath(*parts)


def shell_out(program, *args, **kwargs):
    return sh.Command(str(program))(*args, **kwargs)
