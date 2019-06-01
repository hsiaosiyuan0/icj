# 使用 AST - 计算器

我们已经可以解析算术表达式了，基于此我们可以进一步来实现一个计算器。

为了可以将打印我们的表达式的执行结果，在实现函数调用的语法之前，我们先零食的实现一个打印的语法：

```ebnf
print ::= "print" expr
```

这样对于语句 `print 1 + 2 + 3` 来说，它会先执行 `1 + 2 + 3` 然后打印执行的结果。

语法添加完毕后，第一步还是先完善词法解析器：

```js
TokenType.PRINT = "print";

class Lexer {
  next() {
    this.skipWhitespace();
    const ch = this.src.peek();
    // ...
    if (ch === "h") return this.readHi();
    if (ch === "p") return this.readPrint();
    // ...
    throw new Error(this.makeErrMsg());
  }

  readPrint() {
    const tok = new Token(TokenType.HI);
    tok.loc.start = this.getPos();
    const print = this.src.read(5);
    assert.ok(print === "print", this.makeErrMsg());
    tok.loc.end = this.getPos();
    tok.value = "print";
    return tok;
  }
}
```

添加一个新的 Token 类型 `TokenType.PRINT`，在 `Lexer::next` 中增加对该关键字的预测分支，以及解析该关键字的 `Lexer::readPrint` 方法。

接着我们来完善语法解析器：

```js
class PrintStmt extends Node {
  constructor(loc, value) {
    super(NodeType.PRINT_STMT, loc);
    this.value = value;
  }
}

NodeType.PRINT_STMT = "printStmt";

class Parser {
  parseProg() {
    // ...
    while (true) {
      // ...
      if (tok.type === TokenType.NUMBER) stmt = this.parseExprStmt();
      if (tok.type === TokenType.PRINT) stmt = this.parsePrintStmt();
      node.body.push(stmt);
    }
    // ...
  }

  parsePrintStmt() {
    const node = new PrintStmt();
    let tok = this.lexer.next();
    node.loc.start = tok.loc.start;
    node.value = this.parseExpr();
    node.loc.end = this.lexer.getPos();
    return node;
  }
}
```

我们新增了一个节点类型 `NodeType.PRINT_STMT` 已经它的定义 `PrintStmt`。在 `Parser::parseProg` 中，我们增加了预测 `print` 语句的分支，`Parser::parsePrintStmt` 负责解析 `print` 语句。

接着完善 Visitor：

```js
class Visitor {
  visitPrintStmt(node) {}

  visitStmt(node) {
    switch (node.type) {
      case NodeType.EXPR_STMT:
        return this.visitExprStmt(node);
      case NodeType.SAY_HI:
        return this.visitSayHi(node);
      case NodeType.PRINT_STMT:
        return this.visitPrintStmt(node);
    }
  }
}
```

我们增加了 `visitPrintStmt` 方法，留给子类去实现。在 `visitStmt` 中，增加了对 `NodeType.PRINT_STMT` 类型的识别和处理。

最后，我们来完善 InterpretVisitor：

```js
class InterpretVisitor extends Visitor {
  visitProg(node) {
    node.body.forEach(stmt => this.visitStmt(stmt));
  }

  visitBinaryExpr(node) {
    const left = this.visitExpr(node.left);
    const op = node.op.type;
    const right = this.visitExpr(node.right);
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "**":
        return left ** right;
    }
  }

  visitPrintStmt(node) {
    console.log(this.visitExpr(node.value));
  }

  visitNumLiteral(node) {
    return parseInt(node.value);
  }
}
```

在 `visitNumLiteral` 中，我们将字符串通过 `parseInt` 转换成了整型，注意我们在定义数字的语法规则时，具有可选的前导零，当时做这样的选择，也是顺带利用了 JS 中 `parseInt` 方法的功能。`visitBinaryExpr` 中，我们对于两个操作数，我们分别调用 `visitExpr` 来取它们的值，然后根据不同的操作符执行了相应的运算，并返回运行结果，这样使得操作数取值的 `visitExpr` 调用总是可以拿到值：来自 parseInt 或者子节点的运算结果。`visitPrintStmt` 的操作就是打印运算的结果，对于求值则是委托给了 `visitExpr` 来完成。

我们可以来试一试运行语句 `print 1 + 2 ** 3 * 5`：

```js
const code = `print 1 + 2 ** 3 * 5`;
const src = new Source(code);
const lexer = new Lexer(src);
const parser = new Parser(lexer);

const ast = parser.parseProg();
const visitor = new InterpretVisitor();
visitor.visitProg(ast);
```

我们将会得到输出 `41`。因为我们的 hi 语言使用了和 JS 相同的运算符优先级和结合性，所以大家也可以将表达式 `1 + 2 ** 3 * 5` 直接粘贴到浏览器的控制台，来验证执行的结果是否和 hi 语言相同。