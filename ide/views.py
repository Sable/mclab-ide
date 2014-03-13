import json

from werkzeug.routing import BaseConverter
from flask import render_template, request, abort, flash, redirect, url_for
import requests

import ide.settings
from ide import app
from ide.projects import get_all_projects, Project

MCLABAAS_URL = 'http://localhost:4242'

@app.route('/')
def index():
    return render_template('index.html', projects=get_all_projects())


@app.route('/parse', methods=['POST'])
def parse():
    return requests.post(MCLABAAS_URL + '/ast', data=request.data).text

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


@app.route('/project/<project:project>/')
def project(project):
    return render_template('project.html', settings=json.dumps(ide.settings.get()))


@app.route('/project/create/', methods=['POST'])
def create():
    project = Project(request.form['name'])
    if project.exists():
        flash('A project called %s already exists.' % project.name, 'error')
        return redirect(url_for('index'))
    project.create()
    return redirect(url_for('project', project=project))


@app.route('/project/<project:project>/delete', methods=['POST'])
def delete(project):
    project.delete()
    flash('Project %s successfully deleted.' % project.name, 'info')
    return redirect(url_for('index'))

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


@app.route('/project/<project:project>/callgraph', methods=['POST'])
def callgraph(project):
    params = {'project': project.root,
              'expression': request.form['expression']}
    return requests.post(MCLABAAS_URL + '/callgraph', data=params).text
