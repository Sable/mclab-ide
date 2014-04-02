package mclab.ide.refactoring;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import mclab.ide.common.TextRange;
import mclint.MatlabProgram;
import mclint.refactoring.Refactoring;
import mclint.refactoring.RefactoringContext;
import mclint.refactoring.Refactorings;
import natlab.refactoring.Exceptions;
import natlab.utils.NodeFinder;
import ast.Function;
import ast.Program;
import ast.Stmt;

import com.google.common.base.Predicate;
import com.google.common.collect.FluentIterable;
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import com.google.common.primitives.Ints;

public class ExtractFunctionTool {
  private static class StatementRange {
    public int start;
    public int end;
    public Function enclosingFunction;
    public StatementRange(int start, int end, Function enclosingFunction) {
      this.start = start;
      this.end = end;
      this.enclosingFunction = enclosingFunction;
    }
    
    @Override public String toString() {
      return String.format("%s:%d-%d", enclosingFunction.getName(), start, end);
    }
  }
  
  private static Predicate<Stmt> occursWithin(final TextRange range) {
    return new Predicate<Stmt>() {
      @Override public boolean apply(Stmt node) {
        return range.contains(TextRange.of(node));
      }
    };
  }
  
  private static com.google.common.base.Function<Stmt, Function> ENCLOSING_FUNCTION =
      new com.google.common.base.Function<Stmt, Function>() {
    @Override public Function apply(Stmt stmt) {
      return NodeFinder.findParent(Function.class, stmt);
    }
  };
  
  private static List<Stmt> getStatementsWithinRange(Program ast, TextRange range) {
    return Lists.newArrayList(NodeFinder.find(Stmt.class, ast).filter(occursWithin(range)));
  }
  
  private static Function getEnclosingFunctionIfUniqueElseNull(List<Stmt> stmts) {
    FluentIterable<Function> functions = FluentIterable.from(
        Iterables.transform(stmts, ENCLOSING_FUNCTION));
    if (functions.toSet().size() != 1) {
      return null;
    }
    return functions.first().get();
  }
  
  private static StatementRange toStatementRange(List<Stmt> statements, Function enclosingFunction) {
    final ast.List<Stmt> stmts = enclosingFunction.getStmts();
    Collections.sort(statements, new Comparator<Stmt>() {
      @Override public int compare(Stmt s1, Stmt s2) {
        return Ints.compare(stmts.getIndexOfChild(s1), stmts.getIndexOfChild(s2));
      }
    });
        
    Stmt firstStatement = statements.get(0);
    Stmt lastStatement = statements.get(statements.size() - 1);
    return new StatementRange(
        stmts.getIndexOfChild(firstStatement),
        stmts.getIndexOfChild(lastStatement) + 1,
        enclosingFunction);
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
        context, statements.enclosingFunction,
        statements.start, statements.end, newName);
    extractFunction.apply();
    for (Exceptions.RefactorException error : extractFunction.getErrors()) {
      System.err.println(error);
    }
    if (extractFunction.getErrors().isEmpty()) {
      System.out.println(context.getTransformer().reconstructText());
    }
  }
}
