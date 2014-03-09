from flask import Flask

from ide.assets import assets

app = Flask(__name__)
app.config['ASSETS_DEBUG'] = True
assets.init_app(app)

import ide.views
