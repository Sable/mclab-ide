package mclab.ide.refactoring;

import java.io.IOException;
import java.util.Map;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;
import natlab.utils.NodeFinder;
import ast.Expr;

public class ExtractVariableTool extends RefactoringTool {
  protected String[] expectedExtraArguments() {
    return new String[] {"newName"};
  }

  private static Expr findExpressionInSelection(MatlabProgram program, TextRange selection) {
    return NodeFinder.find(Expr.class, program.parse())
        .filter(node -> selection.contains(TextRange.of(node)))
        .findFirst().orElse(null);
  }
  
  protected Refactoring createRefactoring(MatlabProgram program, TextRange selection,
      Map<String, String> extraArgs) {
    return Refactorings.extractVariable(
        RefactoringContext.create(program.getProject()),
        findExpressionInSelection(program, selection),
        extraArgs.get("newName"));
  }

  public static void main(String[] args) throws IOException {
    new ExtractVariableTool().run(args);
  }
}
