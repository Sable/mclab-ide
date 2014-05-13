package mclab.ide.common;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import ast.ASTNode;

import com.google.common.base.Preconditions;
import com.google.common.base.Predicate;

public class TextRange {
  private int startLine;
  private int startColumn;
  private int endLine;
  private int endColumn;

  private static Pattern REGEX = Pattern.compile("(\\d+),(\\d+)-(\\d+),(\\d+)");
  // 1,2-4,5 -> TextRange(startLine=1, startColumn=2, endLine=4, endColumn=5)
  public static TextRange parse(String range) {
    Matcher m = REGEX.matcher(range);
    Preconditions.checkArgument(m.find(), "couldn't parse text range");
    int startLine = Integer.parseInt(m.group(1));
    int startColumn = Integer.parseInt(m.group(2));
    int endLine = Integer.parseInt(m.group(3));
    int endColumn = Integer.parseInt(m.group(4));
    return create(startLine, startColumn, endLine, endColumn);
  }
  
  public static Predicate<ASTNode<?>> correspondsTo(final TextRange range) {
    return new Predicate<ASTNode<?>>() {
      @Override public boolean apply(ASTNode<?> node) {
        return range.contains(TextRange.of(node));
      }
    };
  }
  
  public static TextRange create(int startLine, int startColumn, int endLine, int endColumn) {
    return new TextRange(startLine, startColumn, endLine, endColumn);
  }
  
  public static TextRange of(ASTNode node) {
    return create(node.getStartLine(), node.getStartColumn(), node.getEndLine(), node.getEndColumn());
  }
  
  private TextRange(int startLine, int startColumn, int endLine, int endColumn) {
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
  }

  public int getStartLine() {
    return startLine;
  }

  public int getStartColumn() {
    return startColumn;
  }

  public int getEndLine() {
    return endLine;
  }

  public int getEndColumn() {
    return endColumn;
  }
  
  public boolean contains(TextRange range) {
    return (getStartLine() < range.getStartLine() ||
        (getStartLine() == range.getStartLine() && getStartColumn() <= range.getStartColumn())) &&
        (getEndLine() > range.getEndLine() ||
        (getEndLine() == range.getEndLine() && getEndColumn() >= range.getEndColumn()));
  }
  
  @Override public String toString() {
    return String.format("%d,%d-%d,%d", getStartLine(), getStartColumn(), getEndLine(), getEndColumn());
  }
}