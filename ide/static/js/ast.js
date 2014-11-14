ide.ast = (function() {
  var parse = function(code, callback, err) {
    ide.ajax.parseCode(code, function (data) {
      if (data.ast) {
        callback(new Ast(JSON.parse(data.ast)));
      } else {
        err(data.errors);
      }
    });
  };

  var analyze = function(code, callback, err) {
    ide.ajax.analyzeCode(code, function (data) {
      if (data.warnings) {
        callback(data.warnings);
      } else if (err) {
        err(data.errors);
      }
    });
  };

  var Ast = function(ast) {
    this.ast = ast;
  };

  var traverseAst = function(ast, cb) {
    if (_.isEmpty(ast) || cb(ast) === false) {
      return;
    }
    _(ast).each(function (value, key) {
      if (_.isArray(value)) {
        _(value).each(function (node) {
          traverseAst(node, cb);
        });
      } else if (key !== 'position' && _.isObject(value)) {
        traverseAst(value, cb);
      }
    });
  }

  Ast.prototype.findAtPosition = function(type, position) {
    var match;
    traverseAst(this.ast, function(node) {
      if (node.type === type &&
          node.position.start.line === position.line &&
          node.position.start.column === position.col) {
        match = node;
        return false;
      }
    });
    return new Ast(match);
  };

  Ast.prototype.isFunctionCall = function() {
    if (!this.ast) {
      return false;
    }
    // The only analysis we run so far is the kind analysis. This will
    // distinguish function calls from variable accesses, but it will
    // classify function handles as variables.
    //
    // The callgraph instrumentation figures out at runtime whether an
    // identifier is a function handle, and so is able to calls through
    // function handles. But statically we don't know, so we'll say each
    // identifier is possibly a function call for our purposes.
    //
    // TODO(isbadawi): Integrate handle propagation analysis?
    // TODO(isbadawi): Somehow warn about calls to undeclared functions...
    // TODO(isbadawi): Make parents accessible in json AST?
    //                 Could at least check it's not the LHS of an assignment.
    return this.ast.type === 'NameExpr';
  };

  return {
    parse: parse,
    analyze: analyze
  };
})();
