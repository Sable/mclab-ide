import os

import sh

this_dir = os.path.dirname(__file__)
support_dir = os.path.join(this_dir, '..', 'support')

def shell_out(program, *args, **kwargs):
    command = sh.Command(os.path.join(support_dir, program))
    return command(*args, **kwargs)
