#!/usr/bin/env python
import collections
import pprint
import sys

import sh

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

def get_callgraph(project_dir, matlab_expression):
    trace = sh.Command('./trace.sh')
    call_trace = trace(project_dir, matlab_expression).stdout
    edges = trace_to_edgelist(call_trace.splitlines())
    grouped = collections.defaultdict(list)
    for site, target in edges:
        grouped[site].append(target)
    return grouped

if __name__ == '__main__':
    pprint.pprint(get_callgraph(sys.argv[1], sys.argv[2]))
