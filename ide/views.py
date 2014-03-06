import os
import json

from flask import render_template, request
import requests

from ide import app

MCLABAAS_URL = 'http://localhost:4242'
WORKSPACE_DIR = os.path.expanduser('~/mclab-ide-projects')

@app.route('/')
def index():
    return render_template('index.html', projects=os.listdir(WORKSPACE_DIR))

@app.route('/project/<name>')
def project(name):
    return render_template('project.html', project=name)

@app.route('/parse', methods=['POST'])
def parse():
    return requests.post(MCLABAAS_URL + '/ast', data=request.data).text

def directory_tree(dir):
    projects = []
    for project in os.listdir(dir):
        abspath = os.path.join(dir, project)
        node = {'label': project}
        if os.path.isdir(abspath):
            node['children'] = directory_tree(abspath)
        projects.append(node)
    return projects

def get_project_path(project, path=''):
    return os.path.join(WORKSPACE_DIR, project, path)

@app.route('/tree', methods=['GET'])
def projects():
    directory = get_project_path(request.args['project'])
    return json.dumps(directory_tree(directory))

@app.route('/read', methods=['GET'])
def read():
    project = request.args['project']
    path = request.args['path']
    with open(get_project_path(project, path)) as f:
        return f.read()

def mkdir_p(path):
    try:
        os.makedirs(path)
    except OSError as e:
        if e.errno != errno.EEXIST or not os.path.isdir(path):
            raise

@app.route('/write', methods=['POST'])
def write():
    project = request.form['project']
    path = request.form['path']
    contents = request.form['contents']

    project_path = get_project_path(project, path)
    mkdir_p(os.path.dirname(project_path))
    with open(project_path, 'w') as f:
        f.write(contents)
    return json.dumps({'status': 'OK'})
