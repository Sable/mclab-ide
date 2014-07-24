import json
import re

from flask import (render_template, request, abort, flash, redirect, url_for,
                   send_file)
import pymatbridge
import requests
from werkzeug.routing import BaseConverter

import ide.settings
from ide import app
from ide.projects import get_all_projects, Project

MCLABAAS_URL = 'http://localhost:4242'
TERMINAL_CRUFT = re.compile(r'[\[\]]\x08')


def _strip_cruft(text):
    return TERMINAL_CRUFT.sub('', text)


@app.route('/')
def index():
    return render_template('index.html', projects=get_all_projects())


@app.route('/parse', methods=['POST'])
def parse():
    return requests.post(MCLABAAS_URL + '/json-ast', data=request.data).text


@app.route('/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'GET':
        return render_template(
            'settings.html', settings=ide.settings.get(),
            themes=ide.settings.AVAILABLE_THEMES)
    else:
        new_settings = request.form.to_dict()
        new_settings['expand_tabs'] = bool(new_settings['expand_tabs'])
        new_settings['tab_width'] = int(new_settings['tab_width'])
        ide.settings.save(new_settings)
        flash('Settings successfully saved.', 'info')
        return redirect(url_for('index'))


class ProjectConverter(BaseConverter):
    def to_python(self, value):
        project = Project(value)
        if not project.exists():
            abort(404)
        return project

    def to_url(self, value):
        return super(ProjectConverter, self).to_url(value.name)

app.url_map.converters['project'] = ProjectConverter


@app.route('/project/', methods=['POST'])
def create_project():
    project = Project(request.form['name'])
    if project.exists():
        flash('A project called %s already exists.' % project.name, 'error')
        return redirect(url_for('index'))
    project.create()
    return redirect(url_for('project', project=project))


matlab_session = None
def get_matlab_session():
    global matlab_session
    if matlab_session is None:
        matlab_session = pymatbridge.Matlab()
        matlab_session.start()
    return matlab_session


@app.route('/project/<project:project>/')
def project(project):
    get_matlab_session().run_code('cd %s;' % project.path(''))
    return render_template(
        'project.html',
        settings=json.dumps(ide.settings.get()))


@app.route('/project/<project:project>/run', methods=['POST'])
def run(project):
    response = get_matlab_session().run_code('rehash; %s' % request.data)
    response['content']['stdout'] = _strip_cruft(response['content']['stdout'])
    return json.dumps(response)


@app.route('/figure', methods=['GET'])
def figure():
    return send_file(request.args['path'], cache_timeout=0)


@app.route('/project/<project:project>/delete', methods=['POST'])
def delete(project):
    project.delete()
    flash('Project %s successfully deleted.' % project.name, 'info')
    return redirect(url_for('index'))


@app.route('/project/<project:project>/files', methods=['GET'])
def files(project):
    return json.dumps(list(project.files()))


@app.route('/project/<project:project>/read-file', methods=['GET'])
def read_file(project):
    return project.read_file(request.args['path'])


@app.route('/project/<project:project>/write-file', methods=['POST'])
def write_file(project):
    project.write_file(request.form['path'], request.form['contents'])
    return json.dumps({'status': 'OK'})


@app.route('/project/<project:project>/delete-file', methods=['POST'])
def delete_file(project):
    project.delete_file(request.form['path'])
    return json.dumps({'status': 'OK'})


@app.route('/project/<project:project>/rename-file', methods=['POST'])
def rename_file(project):
    project.rename_file(request.form['path'], request.form['newPath'])
    return json.dumps({'status': 'OK'})


@app.route('/project/<project:project>/callgraph', methods=['POST'])
def callgraph(project):
    params = {'project': project.root,
              'expression': request.form['expression']}
    return requests.post(MCLABAAS_URL + '/callgraph', data=params).text


@app.route('/project/<project:project>/refactor/extract-function', methods=['GET'])
def extract_function(project):
    params = {
        'path': project.path(request.args['path']),
        'selection': request.args['selection'],
        'newName': request.args['newName']
    }
    return requests.get(MCLABAAS_URL + '/refactor/extract-function', params=params).text


@app.route('/project/<project:project>/refactor/extract-variable', methods=['GET'])
def extract_variable(project):
    params = {
        'path': project.path(request.args['path']),
        'selection': request.args['selection'],
        'newName': request.args['newName']
    }
    return requests.get(MCLABAAS_URL + '/refactor/extract-variable', params=params).text


@app.route('/project/<project:project>/refactor/inline-variable', methods=['GET'])
def inline_variable(project):
    params = {
        'path': project.path(request.args['path']),
        'selection': request.args['selection'],
    }
    return requests.get(MCLABAAS_URL + '/refactor/inline-variable', params=params).text


@app.route('/project/<project:project>/refactor/inline-script', methods=['GET'])
def inline_script(project):
    params = {
        'path': project.path(request.args['path']),
    }
    return requests.get(MCLABAAS_URL + '/refactor/inline-script', params=params).text
