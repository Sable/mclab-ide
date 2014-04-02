package mclab.ide.refactoring;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.List;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;
import mclint.transform.StatementRange;
import natlab.refactoring.Exceptions;
import natlab.utils.AstFunctions;
import natlab.utils.NodeFinder;
import nodecases.AbstractNodeCaseHandler;
import ast.ASTNode;
import ast.Function;
import ast.Program;
import ast.Stmt;

import com.google.common.collect.FluentIterable;
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import com.google.common.collect.Ordering;
import com.google.common.primitives.Ints;

public class ExtractFunctionTool {
  private static com.google.common.base.Function<Stmt, Function> ENCLOSING_FUNCTION =
      new com.google.common.base.Function<Stmt, Function>() {
    @Override public Function apply(Stmt stmt) {
      return NodeFinder.findParent(Function.class, stmt);
    }
  };
  
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
  
  private static Function getEnclosingFunctionIfUniqueElseNull(List<Stmt> stmts) {
    return getUniqueElementOrNull(Iterables.transform(stmts, ENCLOSING_FUNCTION));
  }
  
  @SuppressWarnings("unchecked")
  private static ast.List<Stmt> getParentListIfUniqueElseNull(List<Stmt> stmts) {
    return (ast.List<Stmt>) getUniqueElementOrNull(Iterables.transform(stmts, AstFunctions.getParent()));
  }
  
  private static StatementRange toStatementRange(List<Stmt> statements, Function enclosingFunction) {
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
    Function enclosingFunction = getEnclosingFunctionIfUniqueElseNull(statements);
    return toStatementRange(statements, enclosingFunction);
  }
  
  public static void main(String[] args) throws IOException {
    if (args.length != 3) {
      System.err.println(
          "usage: ExtractFunctionTool <file> <start-line,start-col>-<end-line,end-col> new-name");
      System.exit(1);
    }
    
    MatlabProgram program = MatlabProgram.at(Paths.get(args[0]));
    TextRange selection = TextRange.parse(args[1]);
    String newName = args[2];
    
    StatementRange statements = findStatementsInSelection(program, selection);
    RefactoringContext context = RefactoringContext.create(program);
    Refactoring extractFunction = Refactorings.extractFunction(
        context, statements, newName);
    extractFunction.apply();
    for (Exceptions.RefactorException error : extractFunction.getErrors()) {
      System.err.println(error);
    }
    if (extractFunction.getErrors().isEmpty()) {
      System.out.println(context.getTransformer().reconstructText());
    }
  }
}
