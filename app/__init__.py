import json
import os

from flask import Flask, render_template, request
from flask.ext.assets import Environment, Bundle
import requests

MCLABAAS_URL = 'http://localhost:4242'
WORKSPACE_DIR = os.path.expanduser('~/mclab-ide-projects')

app = Flask(__name__)
assets = Environment(app)

js = Bundle(
    'bower_components/ace-builds/src-noconflict/ace.js',
    'bower_components/ace-builds/src-noconflict/mode-matlab.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_dark.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_light.js',
    'bower_components/jquery/jquery.js',
    'bower_components/bootstrap/dist/js/bootstrap.min.js',
    'bower_components/jqtree/tree.jquery.js',
    'bower_components/pnotify/jquery.pnotify.min.js',
    'js/utils.js',
    'js/ajax.js',
    'js/tree.js',
    'js/tabs.js',
    'js/editor.js',
    'js/main.js',
    filters='jsmin',
    output='gen/packed.js')

css = Bundle(
    'bower_components/bootstrap/dist/css/bootstrap.css',
    'bower_components/jqtree/jqtree.css',
    'bower_components/pnotify/jquery.pnotify.default.css',
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

def get_projects_tree(dir=WORKSPACE_DIR):
    projects = []
    for project in os.listdir(dir):
        abspath = os.path.join(dir, project)
        node = {'label': project}
        if os.path.isdir(abspath):
            node['children'] = get_projects_tree(abspath)
        projects.append(node)
    return projects

@app.route('/projects', methods=['GET'])
def projects():
    return json.dumps(get_projects_tree())

@app.route('/read', methods=['GET'])
def read():
    path = request.args['path']
    with open(os.path.join(WORKSPACE_DIR, path)) as f:
        return f.read()

@app.route('/write', methods=['POST'])
def write():
    path = request.form['path']
    contents = request.form['contents']
    with open(os.path.join(WORKSPACE_DIR, path), 'w') as f:
        f.write(contents)
    return json.dumps({'status': 'OK'})

if __name__ == '__main__':
    app.run(debug=True)
