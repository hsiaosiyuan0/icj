# 1.5 语法分析器

通常的语法解析算法有「LL，Left-to-right, Leftmost Derivation」和「LR, Left-to-right, Rightmost derivation」两种，第一个 L 表示 Left-to-right，第二个 L 和 R 分别表示最左推导和最右推导。

「推导」，表示的是如何运用语法规则来匹配输入的字符串。和数学中的推导相似，我们通过不断地将非终结符替换为它的某个生产式来得出输入字符串是否匹配语法的结论。

比如我们的 hi 语言：

```ebnf
prog ::= say_hi*
say_hi ::= HI STRING
HI ::= "hi"
STRING ::= '"' [^"]* '"'
```

假设我们的源文件内容为 `hi "parser"`。为了解析这个字符串，我们从 `prog` 开始，遇到非终结符，就使用其规则内容代替，直到字符串结尾。

匹配的过程为：

1. 以 `prog` 为起始点
2. `prog` 右边为非终结符 `say_hi`，因此使用 `say_hi` 的规则内容
3. 发现非终结符 `HI`，于是使用其规则内容
4. 发现输入中的字符串 `hi` 匹配了该规则，于是开始尝试匹配 `say_hi` 规则中的 `STRING`
5. 发现 `STRING` 也是非终结符，于是转而使用其规则内容
6. 发现余下的输入字符匹配了 `STRING` 规则的内容，于是回到 `say_hi` 规则
7. 回到 `say_hi` 之后，发现它已经处理完毕，因此，回到了 `prog`
8. 回到 `prog` 之后，我们发现此时已经处理完全部的输入，符合了我们 `prog` 的规则，因此 `prog` 规则也匹配完成

最终，我们发现输入的字符串匹配了我们的语法。通过具体的步骤，我们可以体会到不断带入和推导的过程。

上述的推导过程，就是最左推导 - 我们总是从语法规则的最左边非终结符进行推导。与之类似，最右推导的定义为 - 总是选择最右边的非终结符进行推导。虽然最右推导的定义如此，但是我们并不能简单地将它套用进上述演示步骤。

最右推导可以描述的语法集合大于最左推导，但是缺点就是非常复杂且难于徒手完成它，因此出现了很多工具，用于生成 LR Parser，比如 [Yacc](http://dinosaur.compilertools.net/yacc/)。本系列的主要目的就是教大家如何手写编译器，因此余下的章节中，我们将只讨论最左推导。

最左推导还会有一个 N 的代数形式 - 「LL(N)」。N 表示的是在遇到分支的时候，最多向前预读 N 个 Token。比如有这样的语法：

```ebnf
stmt ::= ifStmt | whileStmt | blockStmt
stmtList ::= stmt*
ifStmt ::= "if" "(" expr  ")" stmt "else" stmt
whileStmt ::= "while" "(" expr ")" stmt
blockStmt ::= "{" stmtList "}"
```

我们在处理 `stmt` 规则的时候，至少需要预读 1 个 Token，根据该预读的 Token 是 `if` 还是 `while` 还是 `{` 来是选择接下来处理 `ifStmt` 还是 `whileStmt` 还是 `blockStmt` 。因此这样的语法又被称为 LL(1) 语法。

以 C 语言入门的同学，不知道是否记得当初学习 if 语句的口诀「if 只能跟单条语句，如果需要使用多条语句则需要将多条语句放在大括号中」。如果了解了上面语法的含义，我就会知道原来 if 语句实际上只能跟单条语句，只不过有一个 `blockStmt` 语句，在它内部可以包含多条语句。

如果我们仔细观察上面的演示推导过程，会发现两点：

1. 将对每个非终结符处理都设想成一个函数，那么会发现整个推导过程，实际就是函数的互相调用
2. 并且，是由父级的规则函数调用了子级的规则函数，比如 `Prog` 调用了 `say_hi`；整个过程是由根「Root」规则开始，以深度优先的原则逐步进入到叶子规则的处理

因此基于最左推导完成的解析器通常又被称为自上而下「Top-Down」的解析器。

现在可以看看作为我们 hi 语言的语法解析器的框架代码：

```js
class Parser {
  constructor(lexer) {
    this.lexer = lexer;
  }

  parseProg() {
    while (true) {
      const tok = this.lexer.peek();
      if (tok.type === TokenType.EOF) break;
      this.parseSayHi();
    }
  }

  parseSayHi() {}
}
```

`parseProg` 中的内容，就对应了 `prog` 规则的内容。我们先预读一个 Token，看其是否已经到达输入的结尾，如果是就停止处理，否则就调用 `parseSayHi` 进行解析。

注意这里的框架代码不要完全的对照上面的演示推导过程，否则你会发现没有 `parseHi` 和 `parseString`。前文已经提到过，为了将整个编译过程结构化，词法元素的解析已经被我们移到了 Lexer 中。

在开始完善解析器之前，还需要介绍另外两个类：「Node」和「NodeType」

```js
class Node {
  constructor(type, loc) {
    this.type = type;
    this.loc = loc || new SourceLoc();
  }
}

class Prog extends Node {
  constructor(loc, body = []) {
    super(NodeType.Prog, loc);
    this.body = body;
  }
}

class SayHi extends Node {
  constructor(loc, value) {
    super(NodeType.SAY_HI, loc);
    this.value = value;
  }
}

class NodeType {}
NodeType.Prog = "prog";
NodeType.SAY_HI = "sayhi";
```

我们通过类「Node」和其派生类来存放我们解析的结果，通过「NodeType」来区分 Node 类型。

现在我们可以开始看看补全后的解析方法：

```js
parseProg() {
  const node = new Prog();
  node.loc.start = this.lexer.getPos();

  while (true) {
    const tok = this.lexer.peek();
    if (tok.type === TokenType.EOF) break;
    
    node.body.push(this.parseSayHi());
  }
  
  node.loc.end = this.lexer.getPos();
  return node;
}

parseSayHi() {
  const node = new SayHi();
  let tok = this.lexer.next();
  assert.ok(tok.type === TokenType.HI, this.makeErrMsg(tok));
  node.loc.start = tok.loc.start;

  tok = this.lexer.next();
  assert.ok(tok.type === TokenType.STRING, this.makeErrMsg(tok));
  
  node.value = tok.value;
  node.loc.end = tok.loc.end;
  return node;
}

makeErrMsg(tok) {
  const loc = tok.loc;
  return `Unexpected token at line: ${loc.start.line} column: ${
    loc.start.col
  }`;
}
```

我们在开始处理节点数据前，首先保存它的其实位置信息，在节点处理完成后，保存它的结束位置信息。并且我们使用 `assert.ok` 来在发生读入 Token 和语法不匹配时，直接报错并结束程序。

虽然通常情况下，一个好的错误恢复「Error Recovery」机制是一个好的解析器的必要条件，因为这样可以在一次解析过程中收集并报告尽量多的错误信息。然而要真正地完成一个良好的错误恢复子程序，其难度并不亚于编写一个解析器。况且在现有硬件条件、配合大部分情况下源码体积都很小时，解析一次也耗费不了多少时间，所以我们的一次仅报告一个错误的实现看起来似乎也是可行的。

最后我们来看一看，如何来将 Parser 和 Lexer 放到一起，来解析程序，并打印结果：

```js
const { Source } = require("./source");
const { Lexer, TokenType } = require("./lexer");
const { Parser } = require("./parser");
const util = require("util");

const code = `hi "lexer"`;
const src = new Source(code);
const lexer = new Lexer(src);
const parser = new Parser(lexer);

const ast = parser.parseProg();
console.log(util.inspect(ast, true, null));
```

运气好的情况下，我们大概会得到以下的输出：

```
Prog {
  type: 'prog',
  loc:
   SourceLoc {
     start: Position { ofst: -1, line: 1, col: 0 },
     end: Position { ofst: 9, line: 1, col: 10 } },
  body:
   [ SayHi {
       type: 'sayhi',
       loc:
        SourceLoc {
          start: Position { ofst: -1, line: 1, col: 0 },
          end: Position { ofst: 9, line: 1, col: 10 } },
       value: 'lexer' },
     [length]: 1 ] }
```

这个输出的内容，就是我们常说的抽象语法树「AST，Abstract Syntax Tree」了。这个树形结构，就是用来描述源码中的词法元素根据语法规则组成的层程序结构。有了这个结构之后，我们可以做更多的事情，比如我们接下来将进一步实现一个解释器，来解释运行我们的代码。