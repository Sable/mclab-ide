package mclab.ide.callgraph;

import ast.Script;
import mclint.MatlabProgram;
import mclint.Project;
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

  public static void instrument(Project project) {
    project.getMatlabPrograms().forEach(CallgraphTransformer::instrument);
  }

  public static void instrument(MatlabProgram program) {
    Program node = program.parse();
    VFAnalysis kindAnalysis = new VFPreorderAnalysis(node, getKindAnalysisEnvironment(node));
    kindAnalysis.analyze();
    node.analyze(new CallgraphTransformer(kindAnalysis, program.getPath().toString()));
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

  private String identifier(Script script) {
    return identifier(script, script.getName());
  }

  private boolean isCall(ParameterizedExpr call) {
    return call.getTarget() instanceof NameExpr && isCall((NameExpr) call.getTarget());
  }

  private boolean isCall(NameExpr call) {
    return kindAnalysis.getResult(call.getName()).isFunction();
  }

  private static <T extends ASTNode> ast.List<T> concat(ast.List<T> list, ast.List<T> other) {
    other.forEach(list::addChild);
    return list;
  }

  private Expr wrapWithTraceCall(ParameterizedExpr call) {
    Name target = ((NameExpr) call.getTarget()).getName();
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

  private Stmt entryPointLogStmt(String identifier) {
    return new ExprStmt(
        new ParameterizedExpr(
            new NameExpr(new Name("mclab_callgraph_log")),
            new ast.List<Expr>()
                .add(new StringLiteralExpr("enter " + identifier + "\\n"))
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
    f.getStmts().insertChild(entryPointLogStmt(identifier(f)), 0);
  }

  @Override public void caseScript(Script s) {
    caseASTNode(s);
    s.getStmts().insertChild(entryPointLogStmt(identifier(s)), 0);
  }

  @Override public void caseParameterizedExpr(ParameterizedExpr e) {
    e.getArgs().analyze(this);
    if (isCall(e)) {
      AstUtil.replace(e, wrapWithTraceCall(e));
    }
  }

  @Override public void caseNameExpr(NameExpr e) {
    if (isCall(e)) {
      AstUtil.replace(e, wrapWithTraceCall(new ParameterizedExpr(e.fullCopy(), new ast.List<>())));
    }
  }
}
