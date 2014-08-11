package mclab.ide.callgraph;

import java.util.Arrays;
import java.util.List;

import ast.ASTNode;
import ast.AssignStmt;
import ast.ColonExpr;
import ast.Expr;
import ast.ExprStmt;
import ast.Function;
import ast.FunctionHandleExpr;
import ast.LambdaExpr;
import ast.Name;
import ast.NameExpr;
import ast.ParameterizedExpr;
import ast.Program;
import ast.Script;
import ast.Stmt;
import ast.StringLiteralExpr;
import mclint.MatlabProgram;
import mclint.Project;
import mclint.util.AstUtil;
import natlab.LookupFile;
import natlab.toolkits.analysis.varorfun.VFAnalysis;
import natlab.toolkits.analysis.varorfun.VFPreorderAnalysis;
import natlab.toolkits.filehandling.FunctionOrScriptQuery;
import natlab.toolkits.path.FileEnvironment;
import natlab.utils.NodeFinder;
import nodecases.AbstractNodeCaseHandler;

public class CallgraphTransformer extends AbstractNodeCaseHandler {
  private static List<String> REFLECTIVE_FUNCTION_NAMES = Arrays.asList(
      "nargin", "nargout", "nargchk", "narginchk", "inputname");
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
    return identifier(function.getName());
  }

  private String identifier(Script script) {
    return identifier(script, script.getName());
  }

  private boolean isCall(ParameterizedExpr call) {
    return call.getTarget() instanceof NameExpr && isCall((NameExpr) call.getTarget());
  }

  private boolean isVar(ParameterizedExpr call) {
    return call.getTarget() instanceof NameExpr &&
        kindAnalysis.getResult(((NameExpr) call.getTarget()).getName()).isVariable() &&
        !(call.getParent() instanceof AssignStmt && ((AssignStmt) call.getParent()).getLHS() == call);
  }

  private boolean isCall(NameExpr call) {
    return kindAnalysis.getResult(call.getName()).isFunction() &&
        !REFLECTIVE_FUNCTION_NAMES.contains(call.getName().getID());
  }

  private static <T extends ASTNode> ast.List<T> concat(ast.List<T> list, ast.List<T> other) {
    other.forEach(list::addChild);
    return list;
  }

  private Expr wrapWithTraceCall(ParameterizedExpr call, boolean isVar) {
    Name target = ((NameExpr) call.getTarget()).getName();
    return new ParameterizedExpr(
        new NameExpr(new Name("mclab_callgraph_log_then_run")),
        concat(
          new ast.List<Expr>()
            .add(new StringLiteralExpr("call " + identifier(target)))
            .add(isVar ?
                new NameExpr(new Name(target.getID())) :
                new FunctionHandleExpr(new Name(target.getID()))),
          call.getArgs()
        )
    );
  }

  private Stmt entryPointLogStmt(String identifier) {
    return new ExprStmt(
        new ParameterizedExpr(
            new NameExpr(new Name("mclab_callgraph_log")),
            new ast.List<Expr>()
                .add(new StringLiteralExpr("enter " + identifier))
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

  @Override public void caseLambdaExpr(LambdaExpr e) {
    caseASTNode(e);
    AstUtil.replace(e.getBody(),
        new ParameterizedExpr(
            new NameExpr(new Name("mclab_callgraph_log_then_run")),
            new ast.List<Expr>()
                .add(new StringLiteralExpr("enter " + identifier(e, "<lambda>")))
                .add(new LambdaExpr(new ast.List<>(), (Expr) e.getBody().fullCopy()))));
  }

  @Override public void caseParameterizedExpr(ParameterizedExpr e) {
    e.getArgs().analyze(this);
    if (isCall(e)) {
      AstUtil.replace(e, wrapWithTraceCall(e, false /* isVar */));
    } else if (isVar(e)) {
      // Replace any colons with colon string literals; passing literal
      // colons to functions seems to confuse MATLAB.
      NodeFinder.find(ColonExpr.class, e.getArgs()).forEach(
          node -> AstUtil.replace(node, new StringLiteralExpr(":"))
      );
      AstUtil.replace(e, wrapWithTraceCall(e, true /* isVar */));
    }
  }

  @Override public void caseNameExpr(NameExpr e) {
    if (isCall(e)) {
      AstUtil.replace(e, wrapWithTraceCall(
          new ParameterizedExpr(e.fullCopy(), new ast.List<>()), false /* isVar */));
    }
  }
}
