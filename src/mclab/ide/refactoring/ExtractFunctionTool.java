package mclab.ide.refactoring;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;
import mclint.transform.StatementRange;
import natlab.utils.NodeFinder;
import nodecases.AbstractNodeCaseHandler;
import ast.ASTNode;
import ast.Function;
import ast.Program;
import ast.Stmt;

public class ExtractFunctionTool extends RefactoringTool {
  protected String[] expectedExtraArguments() {
    return new String[] {"newName"};
  }

  private static List<Stmt> getStatementsWithinRange(Program ast, final TextRange range) {
    final List<Stmt> statements = new ArrayList<>();
    ast.analyze(new AbstractNodeCaseHandler() {
      @Override public void caseASTNode(ASTNode node) {
        for (int i = 0; i < node.getNumChild(); ++i) {
          node.getChild(i).analyze(this);
        }
      }
      
      @Override public void caseStmt(Stmt node) {
        // If e.g. it's an if statement that is contained in the range,
        // then don't recurse -- we're going to pull the whole block out.
        if (range.contains(TextRange.of(node))) {
          statements.add(node);
        } else {
          caseASTNode(node);
        }
      }
    });
    return statements;
  }
  
  private static <T> T getUniqueElementOrNull(Stream<T> stream) {
    Set<T> elements = stream.collect(Collectors.toSet());
    return elements.size() == 1 ? elements.iterator().next() : null;
  }
  
  private static ast.Function getEnclosingFunctionIfUniqueElseNull(List<Stmt> stmts) {

    return getUniqueElementOrNull(stmts.stream()
        .map(stmt -> NodeFinder.findParent(Function.class, stmt)));
  }

  @SuppressWarnings("unchecked")
  private static ast.List<Stmt> getParentListIfUniqueElseNull(List<Stmt> stmts) {
    return (ast.List<Stmt>) getUniqueElementOrNull(stmts.stream().map(ASTNode::getParent));
  }
  
  private static StatementRange toStatementRange(List<Stmt> statements, ast.Function enclosingFunction) {
    final ast.List<Stmt> stmts = getParentListIfUniqueElseNull(statements); 

    int start = statements.stream()
        .mapToInt(stmts::getIndexOfChild)
        .min()
        .getAsInt();
    int end = statements.stream()
        .mapToInt(stmts::getIndexOfChild)
        .max()
        .getAsInt();
    return StatementRange.create(enclosingFunction, stmts, start, end + 1);
  }
  
  private static StatementRange findStatementsInSelection(MatlabProgram program, TextRange range) {
    List<Stmt> statements = getStatementsWithinRange(program.parse(), range); 
    ast.Function enclosingFunction = getEnclosingFunctionIfUniqueElseNull(statements);
    return toStatementRange(statements, enclosingFunction);
  }
  
  protected Refactoring createRefactoring(MatlabProgram program, TextRange selection,
      Map<String, String> extraArguments) {
    return Refactorings.extractFunction(
        RefactoringContext.create(program.getProject()),
        findStatementsInSelection(program, selection),
        extraArguments.get("newName"));
  }

  public static void main(String[] args) throws IOException {
    new ExtractFunctionTool().run(args);
  }
}