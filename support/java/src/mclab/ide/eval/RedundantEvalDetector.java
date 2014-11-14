package mclab.ide.eval;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import ast.ASTNode;
import ast.ExprStmt;
import ast.ForStmt;
import ast.Name;
import ast.NameExpr;
import ast.ParameterizedExpr;
import ast.StringLiteralExpr;
import mclint.MatlabProgram;
import mclint.Project;
import natlab.toolkits.analysis.core.UseDefDefUseChain;
import natlab.utils.NodeFinder;
import nodecases.AbstractNodeCaseHandler;

public class RedundantEvalDetector extends AbstractNodeCaseHandler {
  private UseDefDefUseChain udduChain;

  @Override public void caseASTNode(ASTNode node) {
    for (int i = 0; i < node.getNumChild(); ++i) {
      node.getChild(i).analyze(this);
    }
  }

  boolean isCallToEval(ParameterizedExpr call) {
    return call.getTarget() instanceof NameExpr &&
        ((NameExpr) call.getTarget()).getName().getID().equals("eval") &&
        call.getArgs().getNumChild() == 1;
  }

  private boolean usesLoopVariable(ParameterizedExpr e) {
    List<ForStmt> enclosingLoops = new ArrayList<>();
    for (ASTNode<?> node = e.getParent(); node != null; node = node.getParent()) {
      if (node instanceof ForStmt) {
        enclosingLoops.add((ForStmt) node);
      }
    }
    Set<Name> loopVariableUses = enclosingLoops.stream()
      .flatMap(loop -> udduChain.getUses(loop.getAssignStmt()).stream())
      .collect(Collectors.toSet());
    return NodeFinder.find(Name.class, e.getArgs()).anyMatch(loopVariableUses::contains);
  }

  String location(ParameterizedExpr call) {
    return String.format("%s:%d,%d", call.getMatlabProgram().getPath().toString(),
        call.getStartLine(), call.getStartColumn());
  }

  public static void detectIn(Project project) {
    project.getMatlabPrograms().forEach(RedundantEvalDetector::detectIn);
  }

  public static void detectIn(MatlabProgram program) {
    program.parse().analyze(new RedundantEvalDetector(program.analyze().getUseDefDefUseChain()));
  }

  public RedundantEvalDetector(UseDefDefUseChain udduChain) {
    this.udduChain = udduChain;
  }

  @Override public void caseParameterizedExpr(ParameterizedExpr e) {
    if (!(e.getParent() instanceof ExprStmt)) {
      return;
    }
    e.getArgs().analyze(this);
    if (isCallToEval(e) && usesLoopVariable(e)) {
      System.out.println("possible redundant eval at " + location(e));
    }
  }

  public static void main(String[] args) throws IOException {
    if (args.length != 1) {
      System.err.println("usage: mclab.ide.eval.RedundantEvalDetector project");
      System.exit(1);
    }
    final Project project = Project.at(Paths.get(args[0]).toAbsolutePath());
    RedundantEvalDetector.detectIn(project);
  }
}
