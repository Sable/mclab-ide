import os
import json

from flask import render_template, request
import requests

from ide import app

MCLABAAS_URL = 'http://localhost:4242'
WORKSPACE_DIR = os.path.expanduser('~/mclab-ide-projects')

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
