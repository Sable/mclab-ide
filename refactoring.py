import sh


def delegate_to(command, *args):
    tool = sh.Command('./mclab-ide-support/%s' % command)
    return tool(*args, **{'_ok_code': [0, 1]}).stdout


def extract_function(path, selection, new_name):
    return delegate_to('extract-function.sh', path, selection, new_name)


def extract_variable(path, selection, new_name):
    return delegate_to('extract-variable.sh', path, selection, new_name)


def inline_variable(path, selection):
    return delegate_to('inline-variable.sh', path, selection)
