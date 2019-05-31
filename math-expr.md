# 解析算术表达式

## 算术表达式语法

到目前为止，我们的 hi 语言还是显得有些单薄了。接下来我们将给它添加计算数学表达式的功能。

未来我们在像 hi 语言中增加新的语法功能的时候，都将按照这样的步骤：

1. 增加相应的语法规则，也就是在我们的 EBNF 中增加需要新增的语法规则
2. 根据新增的语法规则，向词法解析器中增加适应新规则的内容
3. 根据新增的语法规则，向语法解析器中增加适应新规则的内容

按照上面的步骤来看，首先我们需要在向语法中增加数学表达式的新规则。我们来看看数学表达式的语法来如何书写：

```ebnf
expr ::= expr "*" expr
       | expr "/" expr
       | expr "+" expr
       | expr "-" expr
       | num
```

## 左递归「Left Recursion」

我们先来回顾下，我们对已有的 hi 语言规则是如何进行解析的：

```ebnf
prog ::= say_hi*
say_hi ::= HI STRING
HI ::= "hi"
STRING ::= '"' [^"]* '"'
```

我们分别在 Parser 中写了 `parseProg` 和 `parseSayHi` 两个方法，它们分别对应语法中的 `prog` 和 `say_hi` 这两个规则。然后我们根据 `prog` 的语法规则，在 `parseProg` 内部调用了 `parseSayHi`，方法之间的协作方式，完全的参照了语法规则的定义。

再来看一看我们目前得到的数学表达式语法规则，我们立刻按部就班地往 Parser 中添加一个新的 `parseExpr` 方法。

但是问题很快就出现了，我们先看第一个分支：

```ebnf
expr ::= expr "*" expr
```

按照规则的定义，我们在 `parseExpr` 内部，需要首先调用 `parseExpr` 方法。很显然，由于这个方法直接调用了自身的同时、内部并没有对需要处理的字符串进行任何步进操作，因此会导致程序陷入无限循环。

对于一个规则而言，如果它右边的规则内容部分、最左边出现的又是自身的规则，我们就称该规则是左递归「Left Recursion」的；并且该规则所属的语法，又被称为是左递归的语法。相似的，如果它右边的规则内容部分、最右边出现的又是自身的规则，我们就称之为右递归的规则。

## 消除左递归「Elimination of Left Recursion」

我们目前手写的语法解析器，是属于自上而下「Top-Down」的类型，我们还发现，自上而下的语法解析器，是无法处理左递归语法的。

所以我们要考虑，如何消除左递归「Elimination of Left Recursion」。

为了将问题简化，我们来看一个简单的左递归的语法规则：

```ebnf
A ::= Aα | β
```

这个语法规则中包含这样几个内容：

1. 非终结符 A
2. 不以 A 开头的(非)终结符 α
3. 不以 A 开头的(非)终结符 β

有一点需要注意的是，上面的语法规则属于直接左递归，因为它的右边的规则内容立刻出现了自身。为了做为对比，我们看一下间接左递归：

```ebnf
A ::= Sα | β
S ::= Aβ
```

我们来看一下这个规则的匹配过程：

1. 选取 `A ::= Sα` 这个分支
2. 因为 `S ::= Aβ`，所以将其右边带入到上一步、替换其中的 `S`，得到：`A ::= Aβα`

这又符合了我们之前对左递归的定义。我们的自上而下的解析器同样无法处理间接左递归的语法。

我们先看一下对于直接左递归 `A ::= Aα | β` 而言，它如何匹配输入的字符串：

1. `A ::= Aα`
2. `A ::= Aαα`
3. `A ::= Aααα`
4. 以此类推...
5. 直到某一时刻，输入的内容匹配到了 `β`，最终我们匹配的结果为
6. `A ::= βααα...`

当然，我们也可能在第一步的时候就直接匹配到了 `β`。因此，上面的语法匹配的字符为：以 `β` 开头的，后面紧接着任意数量的 `α`。

现在我们知道对于上面的规则来说，形如 `βααα...` 的输入，将会符合规则。并且上面的语法规则实际上是从右往左来匹配输入的。

为了使得我们的自上而下的解析器得以工作，我们重写后的规则需要满足：

1. 规则 A 需要从左往右来匹配输入
2. 规则 A 最左边的第一个(非)终结符不能为 A 自身

根据这两个原则，我们首先将 A 写成：

```ebnf
A ::= βA'
```

这样的目的就是先匹配 `βααα...` 中的第一个 `β`，这就满足了我们上面的两点重写需求。但是还没结束，我们接着 `A'` 要做的就是能够匹配重复出现的 `α`，因此我们可以将 `A'` 写成：

```bnf
A' ::= αA' | ε
```

`ε` 表示匹配输入的结尾，作为匹配的终止条件。

我们将它们放到一起：

```ebnf
A  ::= βA'
A' ::= αA' | ε
```

我们来试着使用重写后的规则，看看它将如何匹配输入：

1. `A ::= βA'` 匹配开头第一个 `βA'`
2. 因为 `A' ::= αA'`，将其右边带入上一步的右边、替换 `A'`，可以匹配到 `βαA'`
3. 继续上一步，可以继续匹配到 `βααA'`
4. 继续上一步，可以继续匹配到 `βαααA'`
5. 以此类推...
6. 直到匹配到输入的结尾部分，满足 `A' ::= ε` 
7. 最终得以匹配的结果为 `βααα...αααε`

现在我们得出结论，对于直接左递归：

```ebnf
A ::= Aα | β
```

我们可以通过左递归消除，将其变换为：

```ebnf
A  ::= βA'
A' ::= αA' | ε
```

现在我们着手看一下我们的算术表达式语法，针对它如何进行左递归消除：

```ebnf
expr ::= expr "*" expr
       | num
```

我们直接套用公式，令:

* `A = expr`，因为 `A` 的定义为需要进行消除的项
* `α = "*" expr`，因为 `α` 的定义为，以不是待消除项开头的(非)终结符
* `β = num`，因为 `β` 的定义为，以不是待消除项开头的(非)终结符

经过变换得到：

```ebnf
expr  ::= num expr'
expr' ::= "*" expr expr' | ε
```

我们已经可以将乘法表达式进行左递归消除了，接下来我们看看如何处理整个算术表达式：

```ebnf
expr ::= expr "*" expr
       | expr "/" expr
       | expr "+" expr
       | expr "-" expr
       | num
```

面对一下变得这么复杂的表达式，大家估计会感到无从下手。我们可以利用已经掌握的知识，将每个分支先拆开来进行消除：

```ebnf
expr  ::= num expr'
expr' ::= "*" expr expr' | ε

expr  ::= num expr'
expr' ::= "/" expr expr' | ε

expr  ::= num expr'
expr' ::= "+" expr expr' | ε

expr  ::= num expr'
expr' ::= "-" expr expr' | ε
```

我们将上面的结果两行一组、相互对照起来观察，不难发现，第一行都是相同的，第二行也只是操作符不同，将所有第二行综合起来看，它们其实都是表示 `expr'` 的不同分支。我们可以将上面的结果进行合并：

```ebnf
expr  ::= num expr'
expr' ::= "*" expr expr'
        | "/" expr expr' 
        | "+" expr expr'
        | "-" expr expr'
        | ε
```

于是我们得到一个新的结论，对于形如：

```ebnf
A ::= Aα | Aβ | γ
```

的规则，我们可以将其转换成：

```ebnf
A  ::= γA'
A' ::= αA' | βA' | ε

/* A' 根据 EBNF 语法功能，上面的 A' 又可进一步简化为 */
A' ::= α*
    |  β*
    |  ε

/* 将 A' 进一步简化  */
A' ::= ( α | β )*
    |  ε
```

来消除左递归。

我们最终处理完成后的表达式语法为：

```ebnf
expr  ::= num expr'

/* 对照上面简化 A' 中间形式 */
expr' ::= ( "*" expr )*
        | ( "/" expr )* 
        | ( "+" expr )*
        | ( "-" expr )*
        | ε

/* 对照 A’ 的最终形式 */
expr' ::= ( "*" expr )*
        | ( "/" expr )* 
        | ( "+" expr )*
        | ( "-" expr )*
        | ε

/* 根据我们的表达式内容进一步简化 */
expr' ::= ( ( "*" | "/" | "+" | "-" ) expr )*
        | ε

/* 最终我们得到 */
expr  ::= num expr'
expr' ::= ( ( "*" | "/" | "+" | "-" ) expr )*
        | ε
```

## 完善解析器

现在我们来补全我们的解析器，以解析算术表达式。

### 完善词法解析器

我们先来完善词法解析器，首先我们先增加几个 Token 类型：

```js
TokenType.NUMBER = "number";
TokenType.MUL = "*";
TokenType.DIV = "/";
TokenType.ADD = "+";
TokenType.SUB = "-";
```

这些新增的类型即为我们接下来将要解析的 Token 类型，我们来修改一下 `Lexer::next` 方法：

```js
next() {
  this.skipWhitespace();
  const ch = this.src.peek();
  if (ch === '"') return this.readString();
  if (ch === "h") return this.readHi();
  // 解析数字
  if (Lexer.isDigit(ch)) return this.readNumber();
  // 解析运算符
  if (Lexer.isOp(ch)) return this.readOp();
  if (ch === EOF) return new Token(TokenType.EOF);
  throw new Error(this.makeErrMsg());
}
```

没有什么特别新的东西，只是增加了两个预测分支，分别预测接下来选择解析数字还是解析运算符。接着我们看一下 `readNumber` 和 `readOp` 的实现：

```js
readNumber() {
  const tok = new Token(TokenType.NUMBER);
  tok.loc.start = this.getPos();
  const v = [this.src.read()];
  while (true) {
    let ch = this.src.peek();
    if (Lexer.isDigit(ch)) {
      v.push(this.src.read());
      continue;
    }
    break;
  }
  tok.loc.end = this.getPos();
  tok.value = v.join("");
  return tok;
}

readOp() {
  const tok = new Token();
  tok.loc.start = this.getPos();
  tok.type = this.src.read();
  tok.loc.end = this.getPos();
  return tok;
}
```

如果输入的是数字的话，我们就不断的尝试读取接下来的数字，直到接下来的字符不是数字为止，这里我们只处理了整型数，并且没有特别考虑前导零和正负整数的情况。所以符合我们条件的数字面量的类型为：以可选前导零开头的任意整数。

处理操作符(运算符)的过程就很简单了，由于我们目前的操作符都是单个字符的，直接读取它们就行了。

### 完善语法解析器

我们继续看一下如何完善语法解析器。

首先，我们添加几个新的节点类型的定义：

```js
class ExprStmt extends Node {
  constructor(loc, value) {
    super(NodeType.EXPR_STMT, loc);
    this.value = value;
  }
}

class BinaryExpr extends Node {
  constructor(loc, op, left, right) {
    super(NodeType.BINARY_EXPR, loc);
    this.op = op;
    this.left = left;
    this.right = right;
  }
}

class NumLiteral extends Node {
  constructor(loc, value) {
    super(NodeType.NUMBER, loc);
    this.value = value;
  }
}
```

这里我们开始区分表达式「Expression」和语句「Statement」这两种不同的节点类型了。

运算符 `* / + -` 被称为双目运算符，所谓「目」就是操作数的意思。因为这些运算符都需要两个操作数，所以称之为双目运算符，它们所表示的运算就称为双目运算。

我们通过类「BinaryExpr」来表示这样的程序结构。

对于数值字面量而言，我们使用类「NumLiteral」来表示它。字面量也是表达式，表达式「Expression」是语句「Statement」的组成部分。

为了表示程序中出现的表达式语句，我们还定义了类「ExprStmt」，该类的属性 `value` 表示的就是作为其唯一子节点的表达式节点。

为了对应新增的节点定义，我们也需要添加几个新的节点类型：

```js
NodeType.EXPR_STMT = "exprStmt";
NodeType.BINARY_EXPR = "binaryExpr";
NodeType.NUMBER = "number";
```

和完善词法解析器的步骤相似，我们也从语法解析的入口方法开始完善：

```js
parseProg() {
  const node = new Prog();
  node.loc.start = this.lexer.getPos();
  while (true) {
    const tok = this.lexer.peek();
    let stmt;
    if (tok.type === TokenType.EOF) break;
    if (tok.type === TokenType.HI) stmt = this.parseSayHi();
    // 预测解下来是否需要进行表达式的解析
    if (tok.type === TokenType.NUMBER) stmt = this.parseExprStmt();
    node.body.push(stmt);
  }
  node.loc.end = this.lexer.getPos();
  return node;
}
```

上一节我们已经将算术表达式的左递归进行了消除，通过消除后的表达式我们发现，算术表达式总是以数值字面量作为开头的，因此我们可以使用上面代码中的预测条件。

由于 ExprStmt 只有唯一的表达式节点，所以对它的解析也很接单：

```js
parseExprStmt() {
  const node = new ExprStmt();
  const expr = this.parseExpr();
  node.loc = expr.loc;
  node.value = expr;
  return node;
}
```

`parseExprStmt` 只是简单地调用 `parseExpr` 方法，那么 `parseExpr` 实现为：

```js
parseExpr() {
  const num = this.parseNum();
  return this.parseExpr1(num);
}

parseNum() {
  const node = new NumLiteral();
  let tok = this.lexer.next();
  assert.ok(tok.type === TokenType.NUMBER, this.makeErrMsg(tok));
  node.loc = tok.loc;
  node.value = tok.value;
  return node;
}

parseExpr1(left) {
  const node = new BinaryExpr();
  node.left = left;
  node.op = this.lexer.peek();
  if (!Lexer.isOp(node.op.type)) return left;
  this.lexer.next();
  assert.ok(Lexer.isOp(node.op.type), this.makeErrMsg(node.op));
  node.right = this.parseExpr();
  return node;
}
```

上面的代码对照消除左递归后的表达式语法：

```ebnf
expr  ::= num expr'
expr' ::= ( ( "*" | "/" | "+" | "-" ) expr )*
        | ε
```

我们只是使用方法来替代语法规则中的展开操作。`parseNum` 就是解析数值字面量，就不过多解释了。

`parseExpr1` 方法就对应了消除后的 `expr'` 的内容。`parseExpr1` 中我们先预读接下来的 Token 是否为操作符，如果不是，就表示处理已经完成了，直接返回传入的 `left`。如果接下来为操作符，我们就先将已经处理的操作符跳过，然后接续调用 `parseExpr`。我们没有陷入无限循环的原因就是，我们在方法内部总是可以消化掉一部分输入。

对于表达式 `1 + 2 * 3` 来说，调用的过程如下：

![](images/expr123.svg)

我们可以以一个 U 型的方式来看这个图，从左边开始往下，到了最底部时，转到右边往上。左边和中间左半边部分，表示我们的递归调用链、期间发生的参数传递、以及表达式字符串被不断读取的消减过程。右边和中间的右半部分表示了递归调用结束，不断返回并构造节点的过程。

上图中我们不仅分析了整个表达式解析的过程；还根据这个过程，演示了我们消除左递归后的右递归的执行过程。

在我们着手试一试完善的成果之前，我们先添加一个新的 Visitor - 「YamlVisitor」，它可以将我们的 AST 输出为 [YAML](https://yaml.org/) 的格式，这个格式的好处就是既能体现我们树形结构的层级关系，格式上也显得更加清晰。

我们先往类「Visitor」中增加一些内容：

```js
visitExprStmt(node) {}

visitStmt(node) {
  switch (node.type) {
    case NodeType.EXPR_STMT:
      return this.visitExprStmt(node);
    case NodeType.SAY_HI:
      return this.visitSayHi(node);
  }
}

visitStmtList(list) {}

visitNumLiteral(node) {}

visitBinaryExpr(node) {}

visitExpr(node) {
  switch (node.type) {
    case NodeType.NUMBER:
      return this.visitNumLiteral(node);
    case NodeType.BINARY_EXPR:
      return this.visitBinaryExpr(node);
  }
}
```

空着的方法留给子类去实现。`visitStmt` 和 `visitExpr` 做一个简单的任务派发，根据不同节点的类型，将它们派发到各自的处理方法中。

下面是「YamlVisitor」的实现：

```js
const { Visitor } = require("./visitor");
const yaml = require("js-yaml");

class YamlVisitor extends Visitor {
  visitProg(node) {
    return yaml.dump({
      type: node.type,
      body: this.visitStmtList(node.body)
    });
  }

  visitStmtList(list) {
    return list.map(stmt => this.visitStmt(stmt));
  }

  visitExprStmt(node) {
    return {
      type: node.type,
      value: this.visitExpr(node.value)
    };
  }

  visitBinaryExpr(node) {
    return {
      type: node.type,
      op: node.op.type,
      left: this.visitExpr(node.left),
      right: this.visitExpr(node.right)
    };
  }

  visitNumLiteral(node) {
    return node.value;
  }
}
```

在对不同节点的处理中，我仅输出扼要的内容，比如跳过了行列号。在起始点的处理方法 `visitProg` 中，我们将返回根据 YAML 语法序列化后的字符串。

我们尚未考虑如何消除间接左递归，因为消除直接左递归已经可以应对大部分情况了，我们不妨等遇到间接左递归的时候再考虑如何消除它。

最后通过一小段程序来检验这次的完成结果：

```js
const { Source } = require("./source");
const { Lexer, TokenType } = require("./lexer");
const { Parser } = require("./parser");
const { InterpretVisitor } = require("./interpret-visitor");
const { YamlVisitor } = require("./yaml-visitor");
const util = require("util");

const code = `1 + 2 * 3
4 + 5 * 6
`;
const src = new Source(code);
const lexer = new Lexer(src);
const parser = new Parser(lexer);

const ast = parser.parseProg();
const visitor = new YamlVisitor();
console.log(visitor.visitProg(ast));
```

幸运的话，将看到类似下面的输出：

```yaml
type: prog
body:
  - type: exprStmt
    value:
      type: binaryExpr
      op: +
      left: '1'
      right:
        type: binaryExpr
        op: '*'
        left: '2'
        right: '3'
  - type: exprStmt
    value:
      type: binaryExpr
      op: +
      left: '4'
      right:
        type: binaryExpr
        op: '*'
        left: '5'
        right: '6'
```