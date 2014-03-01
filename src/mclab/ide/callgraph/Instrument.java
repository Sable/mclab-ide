package mclab.ide.callgraph;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;

import natlab.CompilationProblem;
import natlab.Parse;
import natlab.toolkits.path.FileEnvironment;
import ast.Program;

import com.google.common.base.Joiner;
import com.google.common.collect.Lists;

public class Instrument {
  private static FileEnvironment environment = null;

  private static Program parseOrDie(String path) {
    List<CompilationProblem> errors = Lists.newArrayList();
    Program program = Parse.parseMatlabFile(path, errors);
    if (!errors.isEmpty()) {
      System.err.printf("Errors parsing %s: \n%s\n", path, Joiner.on('\n').join(errors));
    }
    return program;
  }

  public static void main(String[] args) throws IOException {
    if (args.length != 2) {
      System.err.println("usage: mclab.ide.callgraph.Instrument dir targetdir");
      System.exit(1);
    }
    final Path source = Paths.get(args[0]).toAbsolutePath();
    final Path target = Paths.get(args[1]).toAbsolutePath();

    Files.walkFileTree(source, new SimpleFileVisitor<Path>() {
      @Override
      public FileVisitResult visitFile(Path path, BasicFileAttributes attr) throws IOException {
        Path absolutePath = path.toAbsolutePath();
        Path relativePath = source.relativize(absolutePath);
        Path targetPath = target.resolve(relativePath);
        Files.createDirectories(targetPath.getParent());
        if (path.toString().endsWith(".m")) {
          Program program = parseOrDie(absolutePath.toString());
          // TODO(isbadawi): Does it make sense to take the first file we find as the "main" file?
          if (environment == null) {
            environment = new FileEnvironment(program.getFile());
          }
          CallgraphTransformer.instrument(program, environment);
          Files.write(targetPath, program.getPrettyPrinted().getBytes("utf-8"));
        } else {
          Files.copy(absolutePath, targetPath);
        }
        return FileVisitResult.CONTINUE;
      }
    });
  }
}
