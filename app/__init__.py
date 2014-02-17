from flask import Flask, render_template, request
from flask.ext.assets import Environment, Bundle
import requests

MCLABAAS_URL = 'http://localhost:4242'

app = Flask(__name__)
assets = Environment(app)

js = Bundle(
    'bower_components/ace-builds/src-noconflict/ace.js',
    'bower_components/ace-builds/src-noconflict/mode-matlab.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_dark.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_light.js',
    'bower_components/jquery/jquery.js',
    'bower_components/bootstrap/dist/js/bootstrap.min.js',
    'js/main.js',
    filters='jsmin',
    output='gen/packed.js')

css = Bundle(
    'bower_components/bootstrap/dist/css/bootstrap.css',
    Bundle('less/style.less', filters='less'),
    filters='cssmin',
    output='gen/packed.css')

assets.register('js_all', js)
assets.register('css_all', css)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/parse', methods=['POST'])
def parse():
    return requests.post(MCLABAAS_URL + '/ast', data=request.data).text

if __name__ == '__main__':
    app.run(debug=True)
