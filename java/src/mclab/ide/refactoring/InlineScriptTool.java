package mclab.ide.refactoring;

import ast.Script;
import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;

import java.io.IOException;
import java.util.Map;

public class InlineScriptTool extends RefactoringTool {
  @Override protected Refactoring createRefactoring(MatlabProgram program, TextRange selection, Map<String, String> extraArgs) {
    return Refactorings.inlineScript(RefactoringContext.create(program.getProject()), (Script) program.parse());
  }

  public static void main(String[] args) throws IOException {
    new InlineScriptTool().run(args);
  }
}
