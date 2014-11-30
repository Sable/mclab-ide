package mclab.ide.refactoring;

import java.io.IOException;
import java.util.Map;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;

public class RemoveRedundantEvalTool extends RefactoringTool {
  protected Refactoring createRefactoring(MatlabProgram program, TextRange selection,
      Map<String, String> extraArgs) {
    return new RemoveRedundantEval(
        RefactoringContext.create(program.getProject()),
        program.parse());
  }

  public static void main(String[] args) throws IOException {
    new RemoveRedundantEvalTool().run(args);
  }
}
