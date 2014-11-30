package mclab.ide.refactoring;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import ast.ASTNode;
import ast.CellIndexExpr;
import ast.Expr;
import ast.ExprStmt;
import ast.ForStmt;
import ast.MatrixExpr;
import ast.Name;
import ast.NameExpr;
import ast.ParameterizedExpr;
import ast.Program;
import ast.Script;
import ast.Stmt;
import ast.StringLiteralExpr;

import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.transform.Transformer;
import mclint.util.AstUtil;
import mclint.util.Parsing;

import natlab.refactoring.Exceptions;
import natlab.utils.NodeFinder;

public class RemoveRedundantEval extends Refactoring {
  private List<ExprStmt> callsToEval;

  private Set<String> allNames;
  private Map<String, String> nonClashingNameCache = new HashMap<>();

  private ExprStmt currentCall;
  private Set<String> currentLoopVariables;

  private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("a__([a-zA-Z]\\w{0,62})__a");

  public RemoveRedundantEval(RefactoringContext context, ForStmt loop) {
    super(context);

    Program program = NodeFinder.findParent(Program.class, loop);
    this.allNames = NodeFinder.find(Name.class, program)
        .map(Name::getID)
        .collect(Collectors.toSet());

    this.callsToEval = NodeFinder.find(ExprStmt.class, loop)
        .filter(this::isArrayLikeEval)
        .collect(Collectors.toList());
  }

  private String nonClashingVariableName(String name) {
    if (!nonClashingNameCache.containsKey(name)) {
      String newName = name;
      while (allNames.contains(newName)) {
        newName += "_";
      }
      nonClashingNameCache.put(name, newName);
    }
    return nonClashingNameCache.get(name);
  }

  private String getLoopVariable(ForStmt node) {
    return ((NameExpr) node.getAssignStmt().getLHS()).getName().getID();
  }

  private Set<String> enclosingLoopVariables(ParameterizedExpr call) {
    Set<String> loopVariables = new HashSet<>();
    for (ASTNode<?> node = call.getParent(); node != null; node = node.getParent()) {
      if (node instanceof ForStmt) {
        loopVariables.add(getLoopVariable((ForStmt) node));
      }
    }
    return loopVariables;
  }

  private String getTarget(ParameterizedExpr call) {
    return ((NameExpr) call.getTarget()).getName().getID();
  }

  private boolean isArrayLikeEval(ExprStmt stmt) {
    if (!(stmt.getExpr() instanceof ParameterizedExpr)) {
      return false;
    }
    ParameterizedExpr call = (ParameterizedExpr) stmt.getExpr();

    return call.getTarget() instanceof NameExpr &&
      getTarget(call).equals("eval") &&
      call.getArgs().getNumChild() == 1 &&
      !enclosingLoopVariables(call).isEmpty();
  }

  @Override public boolean checkPreconditions() {
    return !callsToEval.isEmpty();
  }

  private static class UnexpectedStructure extends Exceptions.RefactorException {
    ExprStmt call;
    public UnexpectedStructure(ExprStmt call) {
      this.call = call;
    }

    @Override public String toString() {
      return String.format("Call site %s doesn't match expected pattern", call.getPrettyPrinted());
    }
  }

  private void ensure(boolean condition) {
    if (!condition) {
      throw new UnexpectedStructure(currentCall);
    }
  }

  private String expandStringConcat(ast.List<Expr> exprs) {
    List<String> expanded = exprs.stream().map(e -> {
      if (e instanceof StringLiteralExpr) {
        return ((StringLiteralExpr) e).getValue();
      } else if (e instanceof ParameterizedExpr) {
        ParameterizedExpr arg = (ParameterizedExpr) e;
        ensure(arg.getTarget() instanceof NameExpr);
        String target = ((NameExpr) arg.getTarget()).getName().getID();
        ensure(target.equals("num2str") || target.equals("int2str"));
        ensure(arg.getNumArg() == 1);
        ensure(arg.getArg(0) instanceof NameExpr);
        String var = ((NameExpr) arg.getArg(0)).getName().getID();
        ensure(currentLoopVariables.contains(var));
        return "a__" + var + "__a";
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
      ensure(exprs.getChild(argIndex) instanceof NameExpr);
      String var = ((NameExpr) exprs.getChild(argIndex)).getName().getID();
      ensure(currentLoopVariables.contains(var));
      argIndex++;
      format = format.replaceFirst("%d", "a__" + var + "__a");
    }
    return format;
  }

  private void eliminateCallToEval(ExprStmt stmt) {
    Transformer transformer = context.getTransformer(stmt);
    ParameterizedExpr callToEval = (ParameterizedExpr) stmt.getExpr();

    currentCall = stmt;
    currentLoopVariables = enclosingLoopVariables(callToEval);

    String expanded = null;
    if (callToEval.getArg(0) instanceof MatrixExpr) {
      MatrixExpr arg = (MatrixExpr) callToEval.getArg(0);
      ensure(arg.getNumRow() == 1);
      expanded = expandStringConcat(arg.getRow(0).getElements());
    } else if (callToEval.getArg(0) instanceof ParameterizedExpr) {
      ParameterizedExpr arg = (ParameterizedExpr) callToEval.getArg(0);
      ensure(arg.getTarget() instanceof NameExpr && getTarget(arg).equals("sprintf"));
      expanded = expandSprintf(arg.getArgs());
    }
    Stmt replacement = ((Script) Parsing.string(expanded)).getStmt(0);
    NodeFinder.find(NameExpr.class, replacement).forEach(node -> {
      Matcher matcher = PLACEHOLDER_PATTERN.matcher(node.getName().getID());
      if (!matcher.find()) {
        return;
      }
      String target = nonClashingVariableName(matcher.replaceAll(""));
      matcher.reset();

      CellIndexExpr expr = new CellIndexExpr();
      expr.setTarget(new NameExpr(new Name(target)));
      while (matcher.find()) {
        expr.addArg(new NameExpr(new Name(matcher.group(1))));
      }
      AstUtil.replace(node, expr);
    });
    // This makes the layout preservation engine consider this node synthetic,
    // even though it's the result of parsing. :\
    replacement.setStartLine(0);
    transformer.replace(stmt, replacement);
  }

  @Override public void apply() {
    callsToEval.forEach(call -> {
      try {
        eliminateCallToEval(call);
      } catch (UnexpectedStructure e) {
        addError(e);
      }
    });
    // TODO(isbadawi): Wrap the loop in a try-catch with a warning
  }
}
