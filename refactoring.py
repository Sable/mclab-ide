import sh


class Error(Exception): pass


def delegate_to(command, *args):
    tool = sh.Command('./mclab-ide-support/%s' % command)
    output = tool(*args, **{'_ok_code': [0, 1]})
    if output.exit_code == 0:
        return output.stdout
    raise Error(output.stderr)


def extract_function(path, selection, new_name):
    return delegate_to('extract-function.sh', path, selection, new_name)


def extract_variable(path, selection, new_name):
    return delegate_to('extract-variable.sh', path, selection, new_name)
