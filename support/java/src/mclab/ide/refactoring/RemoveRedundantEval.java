package mclab.ide.refactoring;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

import ast.ASTNode;
import ast.Expr;
import ast.ExprStmt;
import ast.ForStmt;
import ast.MatrixExpr;
import ast.NameExpr;
import ast.ParameterizedExpr;
import ast.Script;
import ast.Stmt;
import ast.StringLiteralExpr;

import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.transform.Transformer;
import mclint.util.Parsing;

public class RemoveRedundantEval extends Refactoring {
  private ExprStmt stmt;
  private ParameterizedExpr callToEval;

  private Set<String> loopVariables;

  public RemoveRedundantEval(RefactoringContext context, ExprStmt stmt) {
    super(context);
    this.stmt = stmt;
  }

  @Override public boolean checkPreconditions() {
    if (!(stmt.getExpr() instanceof ParameterizedExpr)) {
      return false;
    }
    callToEval = (ParameterizedExpr) stmt.getExpr();
    loopVariables = new HashSet<>();
    for (ASTNode<?> node = callToEval.getParent(); node != null; node = node.getParent()) {
      if (node instanceof ForStmt) {
        loopVariables.add(((NameExpr) ((ForStmt) node).getAssignStmt().getLHS()).getName().getID());
      }
    }

    return callToEval.getTarget() instanceof NameExpr &&
      ((NameExpr) callToEval.getTarget()).getName().getID().equals("eval") &&
      callToEval.getArgs().getNumChild() == 1 &&
      !loopVariables.isEmpty();
  }

  private static void ensure(boolean condition) {
    if (!condition) {
      throw new RuntimeException("Doesn't fit pattern");
    }
  }

  private String expandStringConcat(ast.List<Expr> exprs) {
    List<String> expanded = exprs.stream().map(e -> {
      if (e instanceof StringLiteralExpr) {
        return ((StringLiteralExpr) e).getValue();
      } else if (e instanceof ParameterizedExpr) {
        // TODO(isbadawi): multiple loop variables?
        ParameterizedExpr arg = (ParameterizedExpr) e;
        ensure(arg.getTarget() instanceof NameExpr);
        String target = ((NameExpr) arg.getTarget()).getName().getID();
        ensure(target.equals("num2str") || target.equals("int2str"));
        ensure(arg.getNumArg() == 1);
        ensure(arg.getArg(0) instanceof NameExpr);
        String var = ((NameExpr) arg.getArg(0)).getName().getID();
        ensure(loopVariables.contains(var));
        return "(" + var + ")";
      } else {
        ensure(false);
        return "";
      }
    }).collect(Collectors.toList());
    return expanded.stream().collect(Collectors.joining(""));
  }

  private String expandSprintf(ast.List<Expr> exprs) {
    ensure(exprs.getChild(0) instanceof StringLiteralExpr);
    String format = ((StringLiteralExpr) exprs.getChild(0)).getValue();
    ensure(exprs.getNumChild() - 1 == format.length() - format.replace("%", "").length());
    int argIndex = 1;
    while (format.contains("%d")) {
      // TODO(isbadawi): multiple loop variables?
      ensure(exprs.getChild(argIndex) instanceof NameExpr);
      String var = ((NameExpr) exprs.getChild(argIndex)).getName().getID();
      ensure(loopVariables.contains(var));
      argIndex++;
      format = format.replaceFirst("%d", "(" + var + ")");
    }
    return format;
  }

  @Override public void apply() {
    Transformer transformer = context.getTransformer(stmt);

    // eval(['a', num2str(i), ' = ', num2str(i)])
    // eval(sprintf('a%d = %d', i, i))

    String expanded = null;
    if (callToEval.getArg(0) instanceof MatrixExpr) {
      MatrixExpr arg = (MatrixExpr) callToEval.getArg(0);
      ensure(arg.getNumRow() == 1);
      expanded = expandStringConcat(((MatrixExpr) arg).getRow(0).getElements());
    } else if (callToEval.getArg(0) instanceof ParameterizedExpr) {
      ParameterizedExpr arg = (ParameterizedExpr) callToEval.getArg(0);
      ensure(arg.getTarget() instanceof NameExpr);
      ensure(((NameExpr) arg.getTarget()).getName().getID().equals("sprintf"));
      expanded = expandSprintf(arg.getArgs());
    }
    Stmt replacement = ((Script) Parsing.string(expanded)).getStmt(0);
    // This makes the layout preservation engine consider this node synthetic,
    // even though it's the result of parsing. :\
    replacement.setStartLine(0);
    transformer.replace(stmt, replacement);
  }
}
