import sh


class Error(Exception): pass


def extract_function(path, selection, new_name):
    extract_function_tool = sh.Command('./mclab-ide-support/extract-function.sh')
    output = extract_function_tool(path, selection, new_name, _ok_code=[0,1])
    if output.exit_code == 0:
        return output.stdout
    raise Error(output.stderr)
