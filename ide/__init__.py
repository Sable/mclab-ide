from flask import Flask

from ide.assets import assets

app = Flask(__name__)
assets.init_app(app)

import ide.views
