import tempfile

import ide.parser
from ide.util import shell_out, root_relative_path

class AnalyzerError(ide.parser.SyntaxError):
    pass

def analyze_matlab_code(code):
    temp_dir = tempfile.mkdtemp()
    with tempfile.NamedTemporaryFile('w', prefix='a', suffix='.m', dir=temp_dir) as f:
        f.write(code)
        f.flush()

        output = shell_out(root_relative_path('support', 'analyze.sh'),
                           temp_dir, _ok_code=[0, 1])
        stdout = output.stdout.decode('utf-8')
        if output.exit_code == 0:
            return AnalyzerError(stdout).errors
        raise AnalyzerError(stdout)
