package mclab.ide.refactoring;

import java.io.IOException;
import java.util.Map;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;
import natlab.utils.NodeFinder;
import ast.ExprStmt;

public class RemoveRedundantEvalTool extends RefactoringTool {
  private static ExprStmt findEvalInSelection(MatlabProgram program, TextRange selection) {
    return NodeFinder.find(ExprStmt.class, program.parse())
        .filter(node -> TextRange.of(node).overlaps(selection))
        .findFirst().orElse(null);
  }
  
  protected Refactoring createRefactoring(MatlabProgram program, TextRange selection,
      Map<String, String> extraArgs) {
    return new RemoveRedundantEval(
        RefactoringContext.create(program.getProject()),
        findEvalInSelection(program, selection));
  }

  public static void main(String[] args) throws IOException {
    new RemoveRedundantEvalTool().run(args);
  }
}
