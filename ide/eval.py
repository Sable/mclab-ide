import collections
import json

import ide.parser
import ide.profiling

def eval_profile_from_trace(trace):
    pairs = [tuple(line.split(': ', 1)) for line in trace]
    calls = [pair[0] for pair in pairs]
    args = [pair[1] for pair in pairs]

    # Parse each argument into an AST. But invoking the parser is
    # pretty slow, so combine all the lines into one script and separate
    # them again later.
    # TODO(isbadawi): Is this OK? Could the arguments be multiline?
    ast = json.loads(ide.parser.parse_matlab_code('\n'.join(args)))
    parsed_args = ast['programs'][0]['body']

    profile = collections.defaultdict(list)
    for call, arg in zip(calls, parsed_args):
        profile[call].append(arg)
    return profile


def get_profile(project):
    trace = ide.profiling.run(project, instrumentation='eval')
    return eval_profile_from_trace(trace)
