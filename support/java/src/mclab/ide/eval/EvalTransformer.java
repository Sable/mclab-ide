package mclab.ide.eval;

import ast.ASTNode;
import ast.ExprStmt;
import ast.NameExpr;
import ast.ParameterizedExpr;
import mclint.MatlabProgram;
import mclint.Project;
import mclint.util.AstUtil;
import nodecases.AbstractNodeCaseHandler;

import static natlab.utils.Asts.args;
import static natlab.utils.Asts.call;
import static natlab.utils.Asts.string;

public class EvalTransformer extends AbstractNodeCaseHandler {
  @Override public void caseASTNode(ASTNode node) {
    for (int i = 0; i < node.getNumChild(); ++i) {
      node.getChild(i).analyze(this);
    }
  }

  boolean isCallToEval(ParameterizedExpr call) {
    return call.getTarget() instanceof NameExpr &&
        ((NameExpr) call.getTarget()).getName().getID().equals("eval") &&
        call.getArgs().getNumChild() == 1;
  }

  public static void instrument(Project project) {
    project.getMatlabPrograms().forEach(EvalTransformer::instrument);
  }

  public static void instrument(MatlabProgram program) {
    program.parse()
      .analyze(new EvalTransformer(program.getPath().toString()));
  }

  private String relativePath;
  public EvalTransformer(String relativePath) {
    this.relativePath = relativePath;
  }

  private String identifier(ParameterizedExpr node) {
    return String.format("%s:%d,%d",
        relativePath, node.getStartLine(), node.getStartColumn());
  }

  private ParameterizedExpr wrappedEvalCall(ParameterizedExpr e) {
    return call("mclab_runtime_eval_wrapper",
        args(string(identifier(e)), e.getArg(0)));
  }

  @Override public void caseParameterizedExpr(ParameterizedExpr e) {
    if (!(e.getParent() instanceof ExprStmt)) {
      return;
    }
    e.getArgs().analyze(this);
    if (isCallToEval(e)) {
      AstUtil.replace(e, wrappedEvalCall(e));
    }
  }
}
