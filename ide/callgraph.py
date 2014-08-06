#!/usr/bin/env python
import collections

from ide.common import shell_out
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

def get(project_dir, matlab_expression):
    backend = ide.settings.get('backend')
    call_trace = shell_out('trace.sh', project_dir, matlab_expression,
                           backend).stdout
    edges = trace_to_edgelist(call_trace.splitlines())
    grouped = collections.defaultdict(list)
    for site, target in edges:
        grouped[site].append(target)
    return grouped
