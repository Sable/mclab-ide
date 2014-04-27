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
    // Here, we count names with kind BOT as possible function calls.
    // BOT usually occurs when you have a function call but it wasn't
    // found in the environment (typically because it's a builtin or
    // library function McLab is not aware of). (Also, until we fix the
    // /parse API to have a correct kind analysis when parsing, regular
    // in-project function calls have kind BOT.)
    //
    // Of course, BOT could also mean a genuine error -- a function
    // that doesn't exist. It would be nice if we could use this
    // to signal a possible error. Unfortunately we've no way to
    // distinguish these cases right now. We would need a list of
    // all builtins, plus a mechanism for the project to declare what
    // libraries it depends on and what functions are included -- then
    // we could amend the MATLAB path that the kind analysis assumes.
    //
    // TODO(isbadawi): Find a sensible heuristic to warn about
    // calls to undeclared functions?
    return this.ast.type === 'NameExpr' && (
      this.ast.kind === 'FUN' ||
      this.ast.kind === 'BOT');
  };

  return {
    parse: parse
  };
})();
