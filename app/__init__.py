from flask import Flask, render_template
from flask.ext.assets import Environment, Bundle

app = Flask(__name__)
assets = Environment(app)

js = Bundle(
    'bower_components/ace-builds/src-noconflict/ace.js',
    'bower_components/ace-builds/src-noconflict/mode-matlab.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_dark.js',
    filters='jsmin',
    output='gen/packed.js')
css = Bundle('css/style.css',
    filters='cssmin',
    output='gen/packed.css')

assets.register('js_all', js)
assets.register('css_all', css)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
