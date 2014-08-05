import re

import pymatbridge

import ide.settings

TERMINAL_CRUFT = re.compile(r'[\[\]]\x08')


class Session(object):
    def __init__(self):
        self.backend = None
        self.session = None

    @property
    def started(self):
        return self.session is not None

    def start(self, backend):
        if self.started:
            self.session.stop()
        if backend == 'matlab':
            self.session = pymatbridge.Matlab()
        else:
            self.session = pymatbridge.Octave()
        self.session.start()
        self.backend = backend

    def run_code(self, code):
        response = self.session.run_code('rehash; %s' % code)
        response['content']['stdout'] = TERMINAL_CRUFT.sub(
            '', response['content']['stdout'])
        return response

_session = Session()


def get(backend=None):
    if backend is None:
        backend = ide.settings.get('backend')
    if not _session.started or _session.backend != backend:
        _session.start(backend)
    return _session


def run(code, backend=None):
    return get(backend).run_code(code)
