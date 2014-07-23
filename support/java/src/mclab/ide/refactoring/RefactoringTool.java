package mclab.ide.refactoring;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import org.json.simple.JSONValue;

public abstract class RefactoringTool {
  protected String[] expectedExtraArguments() {
    return new String[]{};
  }

  protected abstract Refactoring createRefactoring(
      MatlabProgram program,
      TextRange selection,
      Map<String, String> extraArgs
  );

  private static String getStackTraceAsString(Exception e) {
    StringWriter sw = new StringWriter();
    e.printStackTrace(new PrintWriter(sw));
    return sw.toString();
  }

  private Map<String, Object> applyRefactoring(Refactoring refactoring) {
    Map<String, Object> jsonOutput = new HashMap<>();
    jsonOutput.put("modified", Collections.emptyMap());
    jsonOutput.put("errors", Collections.emptyList());

    // TODO(isbadawi): A boolean is not sufficient here. Need better error output.
    if (!refactoring.checkPreconditions()) {
      jsonOutput.put("errors", Collections.singletonList("Preconditions failed!"));
      return jsonOutput;
    }

    try {
      refactoring.apply();
    } catch (Exception e) {
      jsonOutput.put("exception", getStackTraceAsString(e));
      return jsonOutput;
    }

    jsonOutput.put("errors", refactoring.getErrors().stream().map(Object::toString).collect(Collectors.toList()));

    if (refactoring.getErrors().isEmpty()) {
      jsonOutput.put("modified", refactoring.getContext().getModifiedPrograms().stream()
          .collect(Collectors.toMap(
              p -> p.getPath().toString(),
              p -> refactoring.getContext().getTransformer(p).reconstructText())));
    }
    // TODO(isbadawi): Maybe a "selection" would be useful to tell the IDE what the new selection should be?
    return jsonOutput;
  }

  public void run(String[] args) throws IOException {
    String[] extra = expectedExtraArguments();
    if (args.length != 2 + extra.length) {
      System.err.printf("usage: %s <file> <start-line>,<start-col>-<end-line>,<end-col> %s\n",
          getClass().getSimpleName(), Arrays.stream(extra).collect(Collectors.joining(" ")));
      System.exit(1);
    }

    MatlabProgram program = MatlabProgram.at(Paths.get(args[0]));
    TextRange selection = TextRange.parse(args[1]);

    Refactoring refactoring = createRefactoring(program, selection,
        IntStream.range(2, args.length).boxed()
            .collect(Collectors.toMap(i -> extra[i - 2], i -> args[i])));

    System.out.println(JSONValue.toJSONString(applyRefactoring(refactoring)));
  }
}
