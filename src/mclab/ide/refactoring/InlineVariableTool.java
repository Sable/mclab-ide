package mclab.ide.refactoring;

import java.io.IOException;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;
import natlab.utils.NodeFinder;
import ast.AssignStmt;

public class InlineVariableTool extends RefactoringTool {
  private static AssignStmt findDefinitionInSelection(MatlabProgram program, TextRange selection) {
    return NodeFinder.find(AssignStmt.class, program.parse())
        .filter(node -> TextRange.of(node).overlaps(selection))
        .findFirst().orElse(null);
  }
  
  protected Refactoring createRefactoring(MatlabProgram program, TextRange selection,
      String[] extraArgs) {
    return Refactorings.inlineVariable(
        RefactoringContext.create(program.getProject()),
        findDefinitionInSelection(program, selection));
  }

  public static void main(String[] args) throws IOException {
    new InlineVariableTool().run(args);
  }
}
