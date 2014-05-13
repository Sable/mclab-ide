package mclab.ide.refactoring;

import java.io.IOException;
import java.nio.file.Paths;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;
import natlab.refactoring.Exceptions;
import natlab.utils.NodeFinder;
import ast.AssignStmt;

public class InlineVariableTool {
  private static AssignStmt findDefinitionInSelection(MatlabProgram program, TextRange selection) {
    return NodeFinder.find(AssignStmt.class, program.parse())
        .firstMatch(TextRange.overlapping(selection))
        .orNull();
  }

  public static void main(String[] args) throws IOException {
    if (args.length != 2) {
      System.err.println(
          "usage: InlineVariableTool <file> <start-line,start-col>-<end-line,end-col>");
      System.exit(1);
    }

    MatlabProgram program = MatlabProgram.at(Paths.get(args[0]));
    TextRange selection = TextRange.parse(args[1]);
    
    AssignStmt definition = findDefinitionInSelection(program, selection);
    RefactoringContext context = RefactoringContext.create(program);
    Refactoring inlineVariable = Refactorings.inlineVariable(context, definition);
    inlineVariable.apply();
    for (Exceptions.RefactorException error : inlineVariable.getErrors()) {
      System.err.println(error);
    }
    if (inlineVariable.getErrors().isEmpty()) {
      System.out.println(context.getTransformer().reconstructText());
    }
  }
}
