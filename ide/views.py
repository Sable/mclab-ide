import json

from werkzeug.routing import BaseConverter
from flask import render_template, request, abort
import requests

from ide import app
from ide.projects import get_all_projects, Project

MCLABAAS_URL = 'http://localhost:4242'

@app.route('/')
def index():
    return render_template('index.html', projects=get_all_projects())


@app.route('/parse', methods=['POST'])
def parse():
    return requests.post(MCLABAAS_URL + '/ast', data=request.data).text


class ProjectConverter(BaseConverter):
    def to_python(self, value):
        return Project(value)

    def to_url(self, value):
        return BaseConverter.to_url(value.name)

app.url_map.converters['project'] = ProjectConverter


@app.route('/project/<project:project>/')
def project(project):
    if not project.exists():
        abort(404)
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
