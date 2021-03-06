import os
import re
import tempfile

from ide.util import shell_out, root_relative_path


class SyntaxError(Exception):
    pattern = re.compile(r'\[(\d+), (\d+)\] (.*)')

    def __init__(self, errs):
        super(SyntaxError, self).__init__(errs)
        self.errors = [
            {'line': e[0], 'col': e[1], 'message': e[2]}
            for e in SyntaxError.pattern.findall(errs)
        ]


def parse_matlab_code(code):
    with tempfile.NamedTemporaryFile('w') as f:
        f.write(code)
        f.flush()

        output = shell_out(root_relative_path('support', 'matlab2json'),
                           f.name, _ok_code=[0, 1])
        stdout = output.stdout.decode('utf-8')
        if output.exit_code == 0:
            return stdout
        raise SyntaxError(stdout)
