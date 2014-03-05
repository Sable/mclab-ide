import json

import flask

import parse
import callgraph

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

if __name__ == '__main__':
    app.run(debug=True, port=4242)
