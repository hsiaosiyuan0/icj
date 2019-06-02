# 1.6 使用 AST - 第一个解释器

但我们得到了程序的 AST 结构之后，我们可以围绕它做很多事情，接下来我们将通过编写一个解释器，来了解如何使用 AST。

因为 AST 是一个树形结构，那么很明显，我们需要通过遍历这个树形结构来使用它。

由于 AST 中有很多不同类型的节点\(尽管目前我们的 hi 语言只有寥寥无几的几个类型\)，而针对这些节点，我们大概率也会采取不同的操作，因此我们将对这些节点的操作都抽离出来，放到一个名为 Visitor 的类中。这也是利用了\[设计模式\]\([https://zh.wikipedia.org/wiki/设计模式\_\(计算机\)\)中的访问者模式「Visitor](https://zh.wikipedia.org/wiki/设计模式_%28计算机%29%29中的访问者模式「Visitor) Pattern」。

下面我们来看一下 Visitor 的结构：

```javascript
class Visitor {
  visitProg(node) {}
  visitSayHi(node) {}
}
```

由于我们的 hi 语言太简单了，它只有两个节点类型，一个是 `PROG` 和 `SAY_HI`，所以我们的 Visitor 中的操作也只有两个。

现在我们开始实现我们的解释器，我们的解释器需要继承于 Visitor 类，我们给它取名 InterpretVisitor：

```javascript
class InterpretVisitor extends Visitor {
  visitProg(node) {
    node.body.forEach(stmt => this.visitSayHi(stmt));
  }
  visitSayHi(node) {
    console.log(`hi ${node.value}`);
  }
}
```

因为 InterpretVisitor 的实现也非常的简单，我们就直接给出实现了。

可以看到，我们在 `visitProg` 内部，就是迭代节点的 `body` 属性，使用其中的元素为参数调用 `visitSayHi` 方法。回顾我们的 `Prog` 节点的定义：

```javascript
class Prog extends Node {
  constructor(loc, body = []) {
    super(NodeType.Prog, loc);
    this.body = body;
  }
}
```

我们将它其中的语句都存入了 `body` 属性数组中。

而对于 `visitSayHi` 方法的实现，我们则是简单地拼接一个 `hi ${something}` 字符串，然后打印该字符串。

我们将所有这些组合到一起，来运行一下我们的解释器：

```javascript
const { Source } = require("./source");
const { Lexer, TokenType } = require("./lexer");
const { Parser } = require("./parser");
const { InterpretVisitor } = require("./interpret-visitor");
const util = require("util");

const code = `hi "lexer"
hi "parser"
`;
const src = new Source(code);
const lexer = new Lexer(src);
const parser = new Parser(lexer);

const ast = parser.parseProg();
const visitor = new InterpretVisitor();
visitor.visitProg(ast);
```

幸运的话，我们会在控制台看到如下的输出：

```text
hi lexer
hi parser
```

到此为止，我们已经完成了一个解释型的语言。千万不要感到惊讶，尽管它目前非常的简单，但是它真的是一个编程语言。

