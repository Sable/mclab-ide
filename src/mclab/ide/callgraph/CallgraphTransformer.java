package mclab.ide.callgraph;

import mclint.util.AstUtil;
import natlab.toolkits.analysis.varorfun.VFAnalysis;
import natlab.toolkits.analysis.varorfun.VFPreorderAnalysis;
import natlab.utils.NodeFinder;
import nodecases.AbstractNodeCaseHandler;
import ast.ASTNode;
import ast.Expr;
import ast.ExprStmt;
import ast.Function;
import ast.FunctionHandleExpr;
import ast.Name;
import ast.NameExpr;
import ast.ParameterizedExpr;
import ast.Program;
import ast.Stmt;
import ast.StringLiteralExpr;

public class CallgraphTransformer extends AbstractNodeCaseHandler {
  public static void instrument(ASTNode<?> node) {
    VFAnalysis kindAnalysis = new VFPreorderAnalysis(node);
    kindAnalysis.analyze();
    node.analyze(new CallgraphTransformer(kindAnalysis));
  }
  
  private VFAnalysis kindAnalysis;

  private CallgraphTransformer(VFAnalysis kindAnalysis) {
    this.kindAnalysis = kindAnalysis;
  }
  
  private static String getFullPath(ASTNode node) {
    return NodeFinder.findParent(Program.class, node).getFile().getPath();
  }
  
  private static String identifier(Name name) {
    return String.format("%s@%s:%d,%d",
        name.getID(), getFullPath(name), name.getStartLine(), name.getStartColumn());
  }
  
  private static String identifier(Function function) {
    return String.format("%s@%s:%d,%d",
        function.getName(), getFullPath(function),
        function.getStartLine(), function.getStartColumn());
  }
  
  private static Name getTarget(ParameterizedExpr call) {
    return ((NameExpr) call.getTarget()).getName();
  }
  
  private boolean isCall(ParameterizedExpr call) {
    if (!(call.getTarget() instanceof NameExpr)) {
      return false;
    }
    return kindAnalysis.getResult(getTarget(call)).isFunction();
  }
  
  private static <T extends ASTNode> ast.List<T> concat(ast.List<T> list, ast.List<T> other) {
    for (T t : other) {
      list = list.add(t);
    }
    return list;
  }

  private static Expr wrapWithTraceCall(ParameterizedExpr call) {
    Name target = getTarget(call);
    return new ParameterizedExpr(
        new NameExpr(new Name("mclab_callgraph_log_then_run")),
        concat(
          new ast.List<Expr>()
            .add(new StringLiteralExpr("call " + identifier(target) + "\\n"))
            .add(new FunctionHandleExpr(new Name(target.getID()))),
          call.getArgs()
        )
    );

  }
  
  private static Stmt functionEntryLogStmt(Function f) {
    return new ExprStmt(
        new ParameterizedExpr(
            new NameExpr(new Name("mclab_callgraph_log")),
            new ast.List<Expr>()
              .add(new StringLiteralExpr("enter " + identifier(f) + "\\n"))
        )
    );
  }

  @Override public void caseASTNode(ASTNode node) {
    for (int i = 0; i < node.getNumChild(); ++i) {
      node.getChild(i).analyze(this);
    }
  }
  
  @Override public void caseFunction(Function f) {
    caseASTNode(f);
    f.getStmts().insertChild(functionEntryLogStmt(f), 0);
  }
  
  @Override public void caseParameterizedExpr(ParameterizedExpr e) {
    if (!isCall(e)) {
      return;
    }
    e.getArgs().analyze(this);
    AstUtil.replace(e, wrapWithTraceCall(e));
  }
}