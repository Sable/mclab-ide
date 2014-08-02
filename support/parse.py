import os
import re
import tempfile

import sh

this_dir = os.path.dirname(__file__)

matlab2json = sh.Command(os.path.join(this_dir, 'matlab2json'))


class SyntaxError(Exception):
    pattern = re.compile(r'\[(\d+), (\d+)\] (.*)')
    def __init__(self, errs):
        super(SyntaxError, self).__init__(errs)
        self.errors = [
            {'line': e[0], 'col': e[1], 'message': e[2]}
            for e in SyntaxError.pattern.findall(errs)
        ]


def matlab(code):
    return get_command_output_or_throw(matlab2json, code)


def get_command_output_or_throw(command, code):
    with tempfile.NamedTemporaryFile('w') as f:
        f.write(code)
        f.flush()

        output = command(f.name, _ok_code=[0,1])
        if output.exit_code == 0:
            return output.stdout
        raise SyntaxError(output.stdout)
