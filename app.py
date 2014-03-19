import json

import flask

import parse
import callgraph
import refactoring

app = flask.Flask(__name__)

@app.route('/ast', methods=['POST'])
def ast():
    code = flask.request.data
    response = {}
    try:
        response['ast'] = parse.matlab_to_xml(code)
    except parse.SyntaxError as e:
        response['errors'] = e.errors
    return json.dumps(response)

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
    try:
        new_text = refactoring.extract_function(path, selection, new_name)
        return json.dumps({'newText': new_text})
    except refactoring.Error as e:
        return json.dumps({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=4242)
