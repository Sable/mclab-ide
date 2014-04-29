from flask import Flask
from flask.ext.jasmine import Jasmine, Asset

from ide.assets import assets

app = Flask(__name__)
app.config.from_object('secret')
app.config['ASSETS_DEBUG'] = True
app.debug = True
assets.init_app(app)

jasmine = Jasmine(app)
jasmine.specs(
    'js/spec/tabs_spec.js',
)
jasmine.sources(Asset('js_all'))

import ide.views
