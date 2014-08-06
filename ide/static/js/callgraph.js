ide.callgraph = (function() {
  var idFromToken = function(token) {
    var id = token.identifier;
    var col = token.col;
    if (id.trim() === '@') {
      col = token.col + id.indexOf('@');
      id = '<lambda>';
    }
    return id + '@' + token.file + ':' + token.line + ',' + col;
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

  var CallGraph = function() {
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
    ide.ajax.getCallGraph(function (graph) {
      this.graph = graph;
      callback(graph);
    }.bind(this));
  };

  CallGraph.prototype.getTargets = function(token, callback) {
    var id = idFromToken(token);
    this.get(function (graph) {
      var targets = graph[id] === undefined ? [] : graph[id];
      callback(targets.map(tokenFromId));
    });
  };

  CallGraph.prototype.getCallers = function(token, callback) {
    var containsToken = _(_.contains).partial(_, idFromToken(token));
    this.get(function (graph) {
      callback(_.chain(graph).pairs()
        .filter(_(containsToken).compose(_.last))
        .map(_.compose(tokenFromId, _.first))
        .value());
    });
  };

  return {
    CallGraph: CallGraph
  };
})();
