from flask import Flask

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

import ide.views
