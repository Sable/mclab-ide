import json

import flask
import sh

import parse
import callgraph

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


refactor = sh.Command('./mclab-ide-support/refactor.sh')

@app.route('/refactor/extract-function', methods=['GET'])
def extract_function():
    path = flask.request.args['path']
    selection = flask.request.args['selection']
    new_name = flask.request.args['newName']
    return refactor('ExtractFunction', path, selection, new_name).stdout


@app.route('/refactor/extract-variable', methods=['GET'])
def extract_variable():
    path = flask.request.args['path']
    selection = flask.request.args['selection']
    new_name = flask.request.args['newName']
    return refactor('ExtractVariable', path, selection, new_name).stdout


@app.route('/refactor/inline-variable', methods=['GET'])
def inline_variable():
    path = flask.request.args['path']
    selection = flask.request.args['selection']
    return refactor('InlineVariable', path, selection).stdout


@app.route('/refactor/inline-script', methods=['GET'])
def inline_script():
    path = flask.request.args['path']
    return refactor('InlineScript', path, '1,1-1,1').stdout

if __name__ == '__main__':
    app.run(debug=True, port=4242)
