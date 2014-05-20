package mclab.ide.refactoring;

import java.io.IOException;
import java.util.List;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;
import mclint.transform.StatementRange;
import natlab.utils.AstFunctions;
import natlab.utils.NodeFinder;
import nodecases.AbstractNodeCaseHandler;
import ast.ASTNode;
import ast.Program;
import ast.Stmt;

import com.google.common.base.Function;
import com.google.common.collect.FluentIterable;
import com.google.common.collect.Lists;
import com.google.common.collect.Ordering;
import com.google.common.primitives.Ints;

public class ExtractFunctionTool extends RefactoringTool {
  protected String[] expectedExtraArguments() {
    return new String[] {"newName"};
  }

  private static List<Stmt> getStatementsWithinRange(Program ast, final TextRange range) {
    final List<Stmt> statements = Lists.newArrayList();
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
  
  private static <T> T getUniqueElementOrNull(Iterable<T> elements) {
    FluentIterable<T> iterable = FluentIterable.from(elements);
    return iterable.toSet().size() == 1 ? iterable.first().get() : null;
  }
  
  private static ast.Function getEnclosingFunctionIfUniqueElseNull(List<Stmt> stmts) {
    return getUniqueElementOrNull(FluentIterable.from(stmts)
        .transform(new Function<Stmt, ast.Function>() {
          @Override public ast.Function apply(Stmt stmt) {
            return NodeFinder.findParent(ast.Function.class, stmt);
          }
        }));
  }

  @SuppressWarnings("unchecked")
  private static ast.List<Stmt> getParentListIfUniqueElseNull(List<Stmt> stmts) {
    return (ast.List<Stmt>) getUniqueElementOrNull(FluentIterable.from(stmts)
        .transform(AstFunctions.getParent()));
  }
  
  private static StatementRange toStatementRange(List<Stmt> statements, ast.Function enclosingFunction) {
    final ast.List<Stmt> stmts = getParentListIfUniqueElseNull(statements); 
    Ordering<Stmt> byIndex = new Ordering<Stmt>() {
      @Override public int compare(Stmt s1, Stmt s2) {
        return Ints.compare(stmts.getIndexOfChild(s1), stmts.getIndexOfChild(s2));
      }
    };
    Stmt firstStatement = byIndex.min(statements);
    Stmt lastStatement = byIndex.max(statements);
    return StatementRange.create(enclosingFunction, stmts,
        stmts.getIndexOfChild(firstStatement),
        stmts.getIndexOfChild(lastStatement) + 1);
  }
  
  private static StatementRange findStatementsInSelection(MatlabProgram program, TextRange range) {
    List<Stmt> statements = getStatementsWithinRange(program.parse(), range); 
    ast.Function enclosingFunction = getEnclosingFunctionIfUniqueElseNull(statements);
    return toStatementRange(statements, enclosingFunction);
  }
  
  protected Refactoring createRefactoring(MatlabProgram program, TextRange selection,
      String[] extraArguments) {
    return Refactorings.extractFunction(
        RefactoringContext.create(program),
        findStatementsInSelection(program, selection),
        extraArguments[0]);
  }

  public static void main(String[] args) throws IOException {
    new ExtractFunctionTool().run(args);
  }
}