import json

import flask

import parse
import callgraph
import refactoring

app = flask.Flask(__name__)


def _parsed_request_data(format):
    response = {}
    try:
        response['ast'] = parse.matlab(flask.request.data, format)
    except parse.SyntaxError as e:
        response['errors'] = e.errors
    return json.dumps(response)


@app.route('/xml-ast', methods=['POST'])
def xml_ast():
    return _parsed_request_data(format='xml')


@app.route('/json-ast', methods=['POST'])
def json_ast():
    return _parsed_request_data(format='json')


@app.route('/callgraph', methods=['POST'])
def get_callgraph():
    project = flask.request.form['project']
    expression = flask.request.form['expression']
    graph = callgraph.get_callgraph(project, expression)
    return json.dumps({'callgraph': graph})


@app.route('/refactor/extract-function', methods=['GET'])
def extract_function():
    path = flask.request.args['path']
    selection = flask.request.args['selection']
    new_name = flask.request.args['newName']
    return refactoring.extract_function(path, selection, new_name)


@app.route('/refactor/extract-variable', methods=['GET'])
def extract_variable():
    path = flask.request.args['path']
    selection = flask.request.args['selection']
    new_name = flask.request.args['newName']
    return refactoring.extract_variable(path, selection, new_name)


@app.route('/refactor/inline-variable', methods=['GET'])
def inline_variable():
    path = flask.request.args['path']
    selection = flask.request.args['selection']
    return refactoring.inline_variable(path, selection)


@app.route('/refactor/inline-script', methods=['GET'])
def inline_script():
    path = flask.request.args['path']
    return refactoring.inline_script(path)

if __name__ == '__main__':
    app.run(debug=True, port=4242)
