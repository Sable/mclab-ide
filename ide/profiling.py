import tempfile

import ide.session
from ide.util import shell_out, root_relative_path

INSTRUMENT = root_relative_path('support', 'instrument.sh')

def instrument(project, which):
    target_dir = tempfile.mkdtemp()
    shell_out(INSTRUMENT, which, project.root, target_dir)
    return target_dir

def run(project, *, instrumentation):
    target_dir = instrument(project, instrumentation)
    with tempfile.NamedTemporaryFile() as log_file:
        ide.session.run('; '.join([
            'mclab_runtime_old_pwd = pwd()',
            "cd('%s')" % target_dir,
            "mclab_runtime_init('%s')" % log_file.name,
            'ide_entry_point',
            'cd(mclab_runtime_old_pwd)',
            'clear mclab_runtime_old_pwd',
            'mclab_runtime_cleanup()',
        ]))
        return [line.strip().decode('utf-8') for line in log_file]
