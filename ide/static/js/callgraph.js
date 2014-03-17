ide.callgraph = (function() {
  var idFromToken = function(token) {
    return token.identifier +
      '@' + token.file +
      ':' + token.line + ',' + token.col;
  };

  var tokenFromId = function(id) {
    var pattern = /(.*)+@(.*)+:(\d+),(\d+)/;
    var match = id.match(pattern);
    return {
      identifier: match[1],
      file: match[2],
      line: parseInt(match[3], 10),
      col: parseInt(match[4], 10)
    };
  };

  var computeCallGraph = function(code, callback) {
    console.log('Computing callgraph from "' + code + '"...');
    ide.ajax.getCallGraph(code, function (graph) {
      console.log('Got the callgraph: ' + JSON.stringify(graph));
      callback(graph);
    });
  };

  var CallGraph = function(codeSource) {
    this.codeSource = codeSource;
    this.invalidate();
  };

  CallGraph.prototype.invalidate = function() {
    this.graph = null;
  };

  CallGraph.prototype.get = function(callback) {
    if (this.graph !== null) {
      console.log('Reusing cached callgraph.');
      callback(this.graph);
      return;
    }
    computeCallGraph(this.codeSource(), (function(graph) {
      this.graph = graph;
      callback(graph);
    }).bind(this));
  };

  CallGraph.prototype.getTargets = function(token, callback) {
    var id = idFromToken(token);
    this.get(function (graph) {
      var targets = graph[id] === undefined ? [] : graph[id];
      callback(targets.map(tokenFromId));
    });
  };

  return {
    CallGraph: CallGraph
  };
})();
