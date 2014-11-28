package mclab.ide.refactoring;

import java.io.IOException;
import java.util.Map;

import ast.ForStmt;
import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import natlab.utils.NodeFinder;

public class RemoveRedundantEvalTool extends RefactoringTool {
  private static ForStmt findTopLevelForLoopInSelection(MatlabProgram program, TextRange selection) {
    return NodeFinder.find(ForStmt.class, program.parse())
        .filter(node -> TextRange.of(node).contains(selection))
        .findFirst()
        .map(loop -> {
          while (loop.getParent().getParent() instanceof ForStmt) {
            loop = (ForStmt) loop.getParent().getParent();
          }
          return loop;
        })
        .orElse(null);
  }
  
  protected Refactoring createRefactoring(MatlabProgram program, TextRange selection,
      Map<String, String> extraArgs) {
    return new RemoveRedundantEval(
        RefactoringContext.create(program.getProject()),
        findTopLevelForLoopInSelection(program, selection));
  }

  public static void main(String[] args) throws IOException {
    new RemoveRedundantEvalTool().run(args);
  }
}
