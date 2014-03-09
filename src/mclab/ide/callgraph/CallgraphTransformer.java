package mclab.ide.callgraph;

import mclint.util.AstUtil;
import natlab.LookupFile;
import natlab.toolkits.analysis.varorfun.VFAnalysis;
import natlab.toolkits.analysis.varorfun.VFPreorderAnalysis;
import natlab.toolkits.filehandling.FunctionOrScriptQuery;
import natlab.toolkits.path.FileEnvironment;
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
  private static FunctionOrScriptQuery BASELINE_QUERY = LookupFile.getFunctionOrScriptQueryObject();
  private static FunctionOrScriptQuery getKindAnalysisEnvironment(Program node) {
    final FunctionOrScriptQuery env = new FileEnvironment(node.getFile())
        .getFunctionOrScriptQuery(node.getFile());
    return new FunctionOrScriptQuery() {
      @Override public boolean isFunctionOrScript(String name) {
        return env.isFunctionOrScript(name) || BASELINE_QUERY.isFunctionOrScript(name);
      }
      
      @Override public boolean isPackage(String name) {
        return env.isPackage(name) || BASELINE_QUERY.isPackage(name);
      }
    };
  }

  public static void instrument(Program node, String relativePath) {
    VFAnalysis kindAnalysis = new VFPreorderAnalysis(node, getKindAnalysisEnvironment(node)); 
    kindAnalysis.analyze();
    node.analyze(new CallgraphTransformer(kindAnalysis, relativePath));
  }
  
  private VFAnalysis kindAnalysis;
  private String relativePath;

  private CallgraphTransformer(VFAnalysis kindAnalysis, String relativePath) {
    this.kindAnalysis = kindAnalysis;
    this.relativePath = relativePath;
  }
  
  private String identifier(ASTNode node, String id) {
    return String.format("%s@%s:%d,%d", id, relativePath, node.getStartLine(), node.getStartColumn());
  }

  private String identifier(Name name) {
    return identifier(name, name.getID());
  }
  
  private String identifier(Function function) {
    return identifier(function, function.getName());
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

  private Expr wrapWithTraceCall(ParameterizedExpr call) {
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
  
  private Stmt functionEntryLogStmt(Function f) {
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
