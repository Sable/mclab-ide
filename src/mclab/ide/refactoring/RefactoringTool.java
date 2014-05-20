package mclab.ide.refactoring;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.Arrays;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;

import com.google.common.base.Joiner;

public abstract class RefactoringTool {
  protected String[] expectedExtraArguments() {
    return new String[] {};
  }

  protected abstract Refactoring createRefactoring(
      MatlabProgram program,
      TextRange selection,
      String[] extraArgs
  );
  
  private static void abortUnless(boolean check, String format, Object... args) {
    if (!check) {
      System.err.printf(format, args);
      System.exit(1);
    }
  }

  public void run(String[] args) throws IOException {
    String[] extra = expectedExtraArguments();
    abortUnless(args.length == 2 + extra.length,
        "usage: %s <file> <start-line>,<start-col>-<end-line>,<end-col> %s",
        getClass().getSimpleName(), Joiner.on(" ").join(extra));
    
    MatlabProgram program = MatlabProgram.at(Paths.get(args[0]));
    TextRange selection = TextRange.parse(args[1]);
    
    Refactoring refactoring = createRefactoring(
        program, selection, Arrays.copyOfRange(args, 2, args.length));
    
    abortUnless(refactoring.checkPreconditions(), "Preconditions failed!");
    refactoring.apply();

    abortUnless(refactoring.getErrors().isEmpty(), "%s",
        Joiner.on("\n").join(refactoring.getErrors()));

    System.out.println(refactoring.getContext().getTransformer().reconstructText());
  }
}
