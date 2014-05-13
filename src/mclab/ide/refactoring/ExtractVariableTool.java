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
import ast.Expr;

public class ExtractVariableTool {
  private static Expr findExpressionInSelection(MatlabProgram program, TextRange selection) {
    return NodeFinder.find(Expr.class, program.parse())
        .firstMatch(TextRange.correspondsTo(selection))
        .orNull();
  }

  public static void main(String[] args) throws IOException {
    if (args.length != 3) {
      System.err.println(
          "usage: ExtractVariableTool <file> <start-line,start-col>-<end-line,end-col> new-name");
      System.exit(1);
    }
    
    MatlabProgram program = MatlabProgram.at(Paths.get(args[0]));
    TextRange selection = TextRange.parse(args[1]);
    String newName = args[2];
    
    Expr expr = findExpressionInSelection(program, selection);
    RefactoringContext context = RefactoringContext.create(program);
    Refactoring extractVariable = Refactorings.extractVariable(
        context, expr, newName);
    extractVariable.apply();
    for (Exceptions.RefactorException error : extractVariable.getErrors()) {
      System.err.println(error);
    }
    if (extractVariable.getErrors().isEmpty()) {
      System.out.println(context.getTransformer().reconstructText());
    }
  }
}
