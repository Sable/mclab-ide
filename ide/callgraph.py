#!/usr/bin/env python
import collections
import tempfile

from ide.util import shell_out, root_relative_path
import ide.session
import ide.settings

Event = collections.namedtuple('Event', 'type location')


def trace_to_callgraph(trace):
    edges = set()
    last_event = Event('<dummy>', None)
    for line in trace:
        line = line.strip().decode('utf-8')
        event = Event(*line.split(' ', 1))
        if event.type not in ('call', 'enter', 'builtin'):
            raise ValueError('unrecognized event type: %s', type)
        if event.type == 'enter' and last_event.type == 'call':
            edges.add((last_event.location, event.location))
        last_event = event
    graph = collections.defaultdict(list)
    for site, target in edges:
        graph[site].append(target)
    return graph


def get(project):
    target_dir = tempfile.mkdtemp()
    shell_out(root_relative_path('support', 'instrument.sh'),
              'callgraph', project.root, target_dir)
    with tempfile.NamedTemporaryFile(delete=False) as log_file:
        ide.session.run('; '.join([
            'mclab_runtime_old_pwd = pwd()',
            "cd('%s')" % target_dir,
            "mclab_runtime_init('%s')" % log_file.name,
            'ide_entry_point',
            'cd(mclab_runtime_old_pwd)',
            'clear mclab_runtime_old_pwd',
            'mclab_runtime_cleanup()',
        ]))
        call_trace = log_file.readlines()
    return trace_to_callgraph(call_trace)
