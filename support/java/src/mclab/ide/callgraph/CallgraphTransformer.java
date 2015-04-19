package mclab.ide.callgraph;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import ast.ASTNode;
import ast.AssignStmt;
import ast.ColonExpr;
import ast.ElseBlock;
import ast.Expr;
import ast.Function;
import ast.IfBlock;
import ast.IfStmt;
import ast.LambdaExpr;
import ast.MatrixExpr;
import ast.Name;
import ast.NameExpr;
import ast.ParameterizedExpr;
import ast.Program;
import ast.Script;
import ast.ShortCircuitOrExpr;
import ast.Stmt;
import mclint.MatlabProgram;
import mclint.Project;
import mclint.util.AstUtil;
import natlab.tame.builtin.Builtin;
import natlab.toolkits.analysis.core.ReachingDefs;
import natlab.toolkits.analysis.core.UseDefDefUseChain;
import natlab.toolkits.analysis.handlepropagation.HandleFlowset;
import natlab.toolkits.analysis.handlepropagation.HandlePropagationAnalysis;
import natlab.toolkits.analysis.handlepropagation.handlevalues.AbstractValue;
import natlab.toolkits.analysis.handlepropagation.handlevalues.Value;
import natlab.toolkits.analysis.varorfun.VFAnalysis;
import natlab.toolkits.analysis.varorfun.VFPreorderAnalysis;
import natlab.utils.NodeFinder;
import nodecases.AbstractNodeCaseHandler;

import static natlab.utils.Asts.args;
import static natlab.utils.Asts.call;
import static natlab.utils.Asts.handleTo;
import static natlab.utils.Asts.stmt;
import static natlab.utils.Asts.string;
import static natlab.utils.Asts.var;

public class CallgraphTransformer extends AbstractNodeCaseHandler {
  private static List<String> REFLECTIVE_FUNCTION_NAMES = Arrays.asList(
      "nargin", "nargout", "nargchk", "narginchk", "inputname");

  public static void instrument(Project project) {
    project.getMatlabPrograms().forEach(CallgraphTransformer::instrument);
  }

  public static void instrument(MatlabProgram program) {
    Program node = program.parse();
    VFAnalysis kindAnalysis = new VFPreorderAnalysis(node);
    kindAnalysis.analyze();
    HandlePropagationAnalysis handleAnalysis = new HandlePropagationAnalysis(node);
    handleAnalysis.analyze();
    node.analyze(new CallgraphTransformer(kindAnalysis, handleAnalysis, program.getPath().toString()));
  }

  private VFAnalysis kindAnalysis;
  private HandlePropagationAnalysis handleAnalysis;
  private String relativePath;

  private CallgraphTransformer(
      VFAnalysis kindAnalysis,
      HandlePropagationAnalysis handleAnalysis,
      String relativePath) {
    this.kindAnalysis = kindAnalysis;
    this.handleAnalysis = handleAnalysis;
    this.relativePath = relativePath;
  }

  private String identifier(ASTNode node, String id) {
    return String.format("%s@%s:%d,%d", id, relativePath, node.getStartLine(), node.getStartColumn());
  }

  private String identifier(Name name) {
    return identifier(name, name.getID());
  }

  private String identifier(Function function) {
    return identifier(function.getName());
  }

  private String identifier(Script script) {
    return identifier(script, script.getName());
  }

  private boolean isCall(ParameterizedExpr call) {
    return call.getTarget() instanceof NameExpr && isCall((NameExpr) call.getTarget());
  }

  private static boolean callsBuiltin(ParameterizedExpr call) {
    return callsBuiltin((NameExpr) call.getTarget());
  }

  private static boolean callsBuiltin(NameExpr call) {
    // TODO(isbadawi): Check for user-defined specializations of builtins?
    // TODO(isbadawi): Maybe use LookupFile's database instead of Builtin's?
    String target = call.getName().getID();
    return !target.equals("feval") && Builtin.getBuiltinQuery().isBuiltin(target);
  }

  private boolean isVar(ParameterizedExpr call) {
    if (!(call.getTarget() instanceof NameExpr &&
        kindAnalysis.getResult(((NameExpr) call.getTarget()).getName()).isVariable())) {
      return false;
    }
    AssignStmt assign = NodeFinder.findParent(AssignStmt.class, call);
    if (assign == null) {
      return true;
    }
    return !(assign.getLHS() == call || (
        assign.getLHS() instanceof MatrixExpr &&
        ((MatrixExpr) assign.getLHS()).getRow(0).getElements().stream().anyMatch(p -> p == call)
      )
    );
  }

  private boolean mightBeFunctionHandle(ParameterizedExpr e) {
    Stmt parentStmt = NodeFinder.findParent(Stmt.class, e);
    String target = ((NameExpr) e.getTarget()).getName().getID();
    HandleFlowset stmtHandleInfo = handleAnalysis.getOutFlowSets().get(parentStmt);
    TreeSet<Value> targetHandleInfo = stmtHandleInfo.getOrDefault(target, new TreeSet<>());
    return targetHandleInfo.stream().anyMatch(Value::isHandle);
  }

  private boolean shouldInstrument(ParameterizedExpr e) {
    return isVar(e) && mightBeFunctionHandle(e);
  }

  private boolean isCall(NameExpr call) {
    return kindAnalysis.getResult(call.getName()).isFunction() &&
        !REFLECTIVE_FUNCTION_NAMES.contains(call.getName().getID());
  }

  private static <T extends ASTNode> ast.List<T> concat(ast.List<T> list, ast.List<T> other) {
    other.forEach(list::addChild);
    return list;
  }

  private Expr wrapWithTraceCall(ParameterizedExpr call, boolean isVar) {
    Name target = ((NameExpr) call.getTarget()).getName();
    return call("mclab_runtime_log_then_run", concat(
        args(
            string("call " + identifier(target)),
            isVar ? var(target.getID()) : handleTo(target.getID())
        ),
        call.getArgs()
    ));
  }

  private Stmt entryPointLogStmt(String identifier) {
    return stmt(call("mclab_runtime_log", args(string("enter " + identifier))));
  }

  @Override public void caseASTNode(ASTNode node) {
    for (int i = 0; i < node.getNumChild(); ++i) {
      node.getChild(i).analyze(this);
    }
  }

  private static UseDefDefUseChain getUseDefDefUseChain(Function f) {
    ReachingDefs reachingDefs = new ReachingDefs(f);
    reachingDefs.analyze();
    return UseDefDefUseChain.fromReachingDefs(reachingDefs);
  }

  private Set<Name> skipInstrumenting = new HashSet<>();
  private boolean safeToSkip(ParameterizedExpr e) {
    return skipInstrumenting.contains(((NameExpr) e.getTarget()).getName());
  }

  @Override public void caseFunction(Function f) {
    // This method is pretty hairy. The idea is that since the handle
    // propagation analysis is intraprocedural, the result for parameters
    // is typically top, which means that if we pass an array as a parameter
    // we'd end up instrumenting each of its uses. Instead we have two
    // instrumented versions -- one where we don't instrument any uses of
    // parameters, and one where we instrument all of them. We then wrap the
    // whole function in a runtime check that checks whether any of the
    // parameters are function handles -- if so, use the fully instrumented
    // version, otherwise, use the optimized version.

    if (f.getInputParams().getNumChild() == 0) {
      caseASTNode(f.getStmts());
    } else {
      // Mark uses of function parameters as skippable
      UseDefDefUseChain udduChain = getUseDefDefUseChain(f);
      f.getInputParams().stream()
          .flatMap(n -> udduChain.getUses(n).stream())
          .forEach(skipInstrumenting::add);

      // Create the optimized version and make a copy of it
      caseASTNode(f.getStmts());
      ast.List<Stmt> paramsUninstrumentedVersion = f.getStmts().treeCopy();

      // Of the expressions we skipped, decide which require instrumentation
      List<ParameterizedExpr> newlyInstrumented = skipInstrumenting.stream()
          .filter(n -> n.getParent().getParent() instanceof ParameterizedExpr)
          .map(n -> (ParameterizedExpr) n.getParent().getParent())
          .filter(this::shouldInstrument)
          .collect(Collectors.toList());
      skipInstrumenting.clear();

      // Create the fully instrumented version
      newlyInstrumented.forEach(this::instrumentVar);

      // Figure out which input parameters we ended up instrumenting
      List<String> requireGuard = newlyInstrumented.stream()
          .map(p -> ((NameExpr) p.getTarget()).getName().getID())
          .distinct()
          .collect(Collectors.toList());

      // Insert the runtime check
      // Don't check each parameter; just the ones with instrumented uses
      // And if the versions are the same, then don't add the check at all.
      if (!requireGuard.isEmpty()) {
        Expr guard = requireGuard.stream()
            .<Expr>map(name -> call("isa", args(var(name), string("function_handle"))))
            .reduce(ShortCircuitOrExpr::new)
            .get();
        f.setStmtList(new ast.List<Stmt>()
            .add(new IfStmt(
                new ast.List<IfBlock>().add(new IfBlock(guard, f.getStmts())),
                new ast.Opt<>(new ElseBlock(paramsUninstrumentedVersion)))));
      }
    }
    f.getStmts().insertChild(entryPointLogStmt(identifier(f)), 0);
  }

  @Override public void caseScript(Script s) {
    caseASTNode(s);
    s.getStmts().insertChild(entryPointLogStmt(identifier(s)), 0);
  }

  @Override public void caseLambdaExpr(LambdaExpr e) {
    caseASTNode(e);
    AstUtil.replace(e.getBody(),
        call("mclab_runtime_log_then_run", args(
            string("enter " + identifier(e, "<lambda>")),
            new LambdaExpr(new ast.List<>(), e.getBody().treeCopy())
        )));
  }

  private void instrumentVar(ParameterizedExpr e) {
    // Replace any colons with colon string literals; passing literal
    // colons to functions seems to confuse MATLAB.
    NodeFinder.find(ColonExpr.class, e.getArgs()).forEach(
        node -> AstUtil.replace(node, string(":"))
    );
    // TODO(isbadawi): Something fishy going on here!
    // For some reason, sometimes we get here the second time around and e has
    // already been replaced. Its parent pointer is stale, and AstUtil.replace
    // throws an exception. This check is a quick workaround, but there is
    // something deeper going on.
    if (e.getParent().getIndexOfChild(e) != -1) {
      AstUtil.replace(e, wrapWithTraceCall(e, true /* isVar */));
    }
  }

  @Override public void caseParameterizedExpr(ParameterizedExpr e) {
    e.getArgs().analyze(this);
    if (isCall(e)) {
      if (!callsBuiltin(e)) {
        AstUtil.replace(e, wrapWithTraceCall(e, false /* isVar */));
      }
    } else if (shouldInstrument(e) && !safeToSkip(e)) {
      instrumentVar(e);
    }
  }

  @Override public void caseNameExpr(NameExpr e) {
    if (isCall(e) && !callsBuiltin(e)) {
      AstUtil.replace(e, wrapWithTraceCall(call(e.treeCopy(), args()), false /* isVar */));
    }
  }
}
