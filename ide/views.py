import json

from flask import (render_template, request, abort, flash, redirect, url_for,
                   send_file)
import requests
import sh
from werkzeug.routing import BaseConverter

import ide.callgraph
from ide.util import shell_out, root_relative_path
import ide.parser
import ide.settings
import ide.session
from ide import app
from ide.projects import get_all_projects, Project


@app.route('/')
def index():
    return render_template('index.html', projects=get_all_projects())


@app.route('/runtests', methods=['GET'])
def run_tests():
    return render_template('run_tests.html')


@app.route('/parse', methods=['POST'])
def parse():
    response = {}
    try:
        response['ast'] = ide.parser.parse_matlab_code(request.data.decode('utf-8'))
    except ide.parser.SyntaxError as e:
        response['errors'] = e.errors
    return json.dumps(response)


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


@app.route('/project/<project:project>/init-session', methods=['POST'])
def initialize_session(project):
    ide.session.run(';'.join([
        'cd %s' % project.root,
        'clear',
        "if exist('./.session.mat') == 2, load('./.session.mat'), end"
    ]))
    return json.dumps({'status': 'OK'})


@app.route('/project/<project:project>/')
def project(project):
    return render_template(
        'project.html',
        settings=json.dumps(ide.settings.get()))


@app.route('/project/<project:project>/run', methods=['POST'])
def run(project):
    session_path = project.path('.session.mat')
    response = ide.session.run(','.join([
        request.data.decode('utf-8'),
        "save('-v7', '%s');" % session_path
    ]))
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
    return json.dumps(list(map(str, project.files())))


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


@app.route('/project/<project:project>/callgraph', methods=['GET'])
def callgraph(project):
    return json.dumps({'callgraph': ide.callgraph.get(project)})


def refactoring(*args):
    return shell_out(root_relative_path('support', 'refactor.sh'), *args)


@app.route('/project/<project:project>/refactor/extract-function', methods=['GET'])
def extract_function(project):
    return refactoring('ExtractFunction',
        project.path(request.args['path']),
        request.args['selection'],
        request.args['newName']).stdout


@app.route('/project/<project:project>/refactor/extract-variable', methods=['GET'])
def extract_variable(project):
    return refactoring('ExtractVariable',
        project.path(request.args['path']),
        request.args['selection'],
        request.args['newName']).stdout


@app.route('/project/<project:project>/refactor/inline-variable', methods=['GET'])
def inline_variable(project):
    return refactoring('InlineVariable',
        project.path(request.args['path']),
        request.args['selection']).stdout


@app.route('/project/<project:project>/refactor/inline-script', methods=['GET'])
def inline_script(project):
    return refactoring('InlineScript',
        project.path(request.args['path']),
        '1,1-1,1').stdout
