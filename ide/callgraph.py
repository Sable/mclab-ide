import collections

import ide.profiling

Event = collections.namedtuple('Event', 'type location')


def callgraph_from_trace(trace):
    edges = set()
    last_event = Event('<dummy>', None)
    for line in trace:
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
    trace = ide.profiling.run(project, instrumentation='callgraph')
    return callgraph_from_trace(trace)
