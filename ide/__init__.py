from flask import Flask
from flask.ext.jasmine import Jasmine, Asset

from ide.assets import assets
from ide.util import root_relative_path

app = Flask(__name__)
app.config.from_object('ide.secret')
app.config.update({
    'DEBUG': True,
    'ASSETS_DEBUG': True,
    'LESS_BIN': root_relative_path('node_modules', 'less', 'bin', 'lessc'),
})
assets.init_app(app)

jasmine = Jasmine(app)
jasmine.specs(
    'js/spec/explorer_spec.js',
    'js/spec/tabs_spec.js',
)
jasmine.sources(Asset('js_all'))

import ide.views
