package mclab.ide.callgraph;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

import mclint.Project;

public class Instrument {
  public static void main(String[] args) throws IOException {
    if (args.length != 2) {
      System.err.println("usage: mclab.ide.callgraph.Instrument dir targetdir");
      System.exit(1);
    }
    final Project project = Project.at(Paths.get(args[0]).toAbsolutePath());
    final Path target = Paths.get(args[1]).toAbsolutePath();
    CallgraphTransformer.instrument(project);
    project.write(target);
  }
}
