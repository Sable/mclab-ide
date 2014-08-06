#!/usr/bin/env python
import collections
import tempfile

from ide.common import shell_out
import ide.session
import ide.settings

Event = collections.namedtuple('Event', 'type location')

def trace_to_edgelist(trace):
    edgelist = set()
    last_event = Event('<dummy>', None)
    for line in trace:
        line = line.strip()
        event = Event(*line.split(' ', 1))
        if event.type not in ('call', 'enter'):
            raise ValueError('unrecognized event type: %s', type)
        if event.type == 'enter' and last_event.type == 'call':
            edgelist.add((last_event.location, event.location))
        last_event = event
    return edgelist


def get(project):
    target_dir = tempfile.mkdtemp()
    shell_out('instrument.sh', project.root, target_dir)
    with tempfile.NamedTemporaryFile(delete=False) as log_file:
        response = ide.session.run('; '.join([
            'mclab_callgraph_old_pwd = pwd()',
            "cd('%s')" % target_dir,
            "mclab_callgraph_init('%s')" % log_file.name,
            'ide_entry_point',
            'cd(mclab_callgraph_old_pwd)',
            'clear mclab_callgraph_old_pwd',
            'mclab_callgraph_cleanup()',
        ]))
        call_trace = log_file.readlines()
    edges = trace_to_edgelist(call_trace)
    grouped = collections.defaultdict(list)
    for site, target in edges:
        grouped[site].append(target)
    return grouped
