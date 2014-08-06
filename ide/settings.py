import json
import os

import sh

AVAILABLE_THEMES = (
    ('monokai', 'Monokai (Sublime Text)'),
    ('textmate', 'Blackboard (TextMate)'),
    ('solarized_light', 'Solarized (light)'),
    ('solarized_dark', 'Solarized (dark)'),
)


DEFAULT_SETTINGS = dict(
    theme='solarized_dark',
    keybindings='default',
    expand_tabs=True,
    tab_width=2,
    backend='matlab' if sh.which('matlab') is not None else 'octave'
)

SETTINGS_PATH = os.path.join(os.path.expanduser('~'), '.mclabrc')


def save(settings):
    # Fallback to the default settings in case some keys are missing
    settings = dict(DEFAULT_SETTINGS, **settings)
    with open(SETTINGS_PATH, 'w') as f:
        json.dump(settings, f, indent=2)


def _read():
    with open(SETTINGS_PATH) as f:
        return json.load(f)


def get(key=None):
    if key is not None:
        return get()[key]
    if not os.path.exists(SETTINGS_PATH):
        save(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS
    return _read()
