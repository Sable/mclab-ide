import re
import tempfile

import sh

_err_pattern = re.compile(r'\[(\d+), (\d+)\] (.*)')

matlab2xml = sh.Command('./matlab2xml')

class SyntaxError(Exception):
    def __init__(self, errs):
        super(SyntaxError, self).__init__(errs)
        self.errors = [
            {'line': e[0], 'col': e[1], 'message': e[2]}
            for e in _err_pattern.findall(errs)
        ]

def matlab_to_xml(code):
    with tempfile.NamedTemporaryFile('w') as f:
        f.write(code)
        f.flush()

        output = matlab2xml(f.name, _ok_code=[0,1])
        if output.exit_code == 0:
            return output.stdout
        raise SyntaxError(output.stdout)
