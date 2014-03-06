import errno
import os
import json

from werkzeug.routing import BaseConverter
from flask import render_template, request
import requests

from ide import app

MCLABAAS_URL = 'http://localhost:4242'
WORKSPACE_DIR = os.path.expanduser('~/mclab-ide-projects')

@app.route('/')
def index():
    return render_template('index.html', projects=os.listdir(WORKSPACE_DIR))


@app.route('/parse', methods=['POST'])
def parse():
    return requests.post(MCLABAAS_URL + '/ast', data=request.data).text


def mkdir_p(path):
    try:
        os.makedirs(path)
    except OSError as e:
        if e.errno != errno.EEXIST or not os.path.isdir(path):
            raise


class Project(object):
    def __init__(self, name):
        self.name = name
        self.root = os.path.join(WORKSPACE_DIR, self.name)

    def tree(self, start=None):
        if start is None:
            start = self.root
        dirs = []
        for dir in os.listdir(start):
            abspath = os.path.join(start, dir)
            node = {'label': dir}
            if os.path.isdir(abspath):
                node['children'] = self.tree(abspath)
            dirs.append(node)
        return dirs

    def path(self, file):
        return os.path.join(self.root, file)

    def read_file(self, file):
        with open(self.path(file)) as f:
            return f.read()

    def write_file(self, file, contents):
        path = self.path(file)
        mkdir_p(os.path.dirname(path))
        with open(path, 'w') as f:
            f.write(contents)


class ProjectConverter(BaseConverter):
    def to_python(self, value):
        return Project(value)

    def to_url(self, value):
        return BaseConverter.to_url(value.name)

app.url_map.converters['project'] = ProjectConverter


@app.route('/project/<project:project>/')
def project(project):
    return render_template('project.html')

@app.route('/project/<project:project>/tree', methods=['GET'])
def tree(project):
    return json.dumps(project.tree())

@app.route('/project/<project:project>/read', methods=['GET'])
def read(project):
    return project.read_file(request.args['path'])

@app.route('/project/<project:project>/write', methods=['POST'])
def write(project):
    project.write_file(request.form['path'], request.form['contents'])
    return json.dumps({'status': 'OK'})
