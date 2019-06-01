# 解析算术表达式 - 优先级与结合性

## 优先级「Precedence」

上一节我们已经得到了消除左递归后的算术表达式语法，并根据语法完善了我们的解析程序。现在让我们来试着用我们上一节完成的内容，来解析算术表达式 `2 * 3 + 4`，我们会得到类似下面的输出：

```
type: prog
body:
  - type: exprStmt
    value:
      type: binaryExpr
      op: '*'
      left: '2'
      right:
        type: binaryExpr
        op: +
        left: '3'
        right: '4'
```

我们解析的结果，从现实的数学表达式的角度来看，是存在问题的，因为我们将表达式解析成了：

```
 node
 / | \
2  * node
    / | \
   3  +  4
```

上面的结构表示的是 `2 * (3 + 4)`，而表达式 `2 * 3 + 4` 的结构应为：

```
    node
    / | \
 node +  4
 / | \
2  *  3
```

为了解决这个问题，我们引入和数学上解决该问题类似的概念 - 优先级「Precedence」。优先级表示的是，在一个表达式中，如果同时出现多个运算符，那么具有较高优先级的运算符将先进行预算。

我们通过观察上面 `2 * 3 + 4` 对应的结构图发现，具有较高优先级的表达式(`*`)，将作为较低优先级的表达式(`+`)的操作数，即子节点。而是什么造就了图中的层次结构呢？就是我们的语法，语法规则和其待展开项，经过我们的 Top-Down 解析器的解析，就会体现为父子节点的关系。

依照这个思路，我们可以将具有较高优先级的表达式独立出来、作为新的语法规则，然后将其作为具有较低优先级的语法规则的待展开项。对于四则运算而言，其中的操作符优先级由高到低为：`num > "*/" > "+-"`，因此我们可以得到：

```ebnf
/* rule1 */
expr ::= expr "+" term
       | expr "-" term
       | term

/* rule2 */
term ::= term "*" factor
       | term "/" factor
       | factor

/* rule3 */
factor ::= num
```

我们通过三个规则来区分运算符的优先级。rule1 和 rule2 为我们之前所提到的左递归规则。我们拿 rule1 来再次实践如何消除左递归。

回顾我们的左递归消除公式：

```ebnf
A ::= Aα | β
// 消除左递归后
A  ::= βA'
A' ::= αA' | ε
// 将消除后的内容利用 EBNF 语法进一步合并为
A  ::= βα*
```

根据上面的式子，我们令：

* `A = expr`
* `α = "+" term`
* `β = term`

将得到消除后的结果：

```ebnf
expr ::= term ( ("+" | "-") term )*
```

rule2 的消除就留给大家来尝试了。上面的算术表达式语法最终为：

```ebnf
expr ::= term ( ( "+" | "-" ) term )*
term ::= factor ( ( "*" | "/" ) factor )*
factor ::= num
```

根据最终的语法，我们来完善我们的解析器。得益于我们之前的完善工作，现在我们这里只需要向语法解析器中增加3个方法，来对应上面的规则：

```js
parseExpr() {
  let left = this.parseTerm();
  while (true) {
    const op = this.lexer.peek();
    if (op.type !== "+" && op.type !== "-") break;
    this.lexer.next();
    const node = new BinaryExpr();
    node.left = left;
    node.op = op;
    node.right = this.parseTerm();
    left = node;
  }
  return left;
}

parseTerm() {
  let left = this.parseFactor();
  while (true) {
    const op = this.lexer.peek();
    if (op.type !== "*" && op.type !== "/") break;
    this.lexer.next();
    const node = new BinaryExpr();
    node.left = left;
    node.op = op;
    node.right = this.parseFactor();
    left = node;
  }
  return left;
}

parseFactor() {
  return this.parseNum();
}
```

`parseExpr` 和 `parseTerm` 的内容差不多，所以我们理解一下 `parseExpr` 的实现内容：

1. 首先 `let left = this.parseTerm()` 对应 `expr` 规则的最左边第一个非终结符的解析
2. 随后我们进入了 while 循环
3. 在循环中，我们预读下一个 Token 是否为 `+` 或 `-`
4. 如果不是，我们就跳出循环，返回 left
5. 如果是 `+` 或 `-`，我们就调用 `parseTerm` 来解析运算符右边的子节点
6. 这样我们就已经得到了一个 BinaryExpr 节点，此时我们将它替换之前的 left 值
7. 跳到第3步继续执行

在循环中，我们将中间每一步得到的节点，都作为下一个即将处理的 BinaryExpr 节点的左边子节点。因此对于表达式 `1 + 2 - 3`，解析后的结构为：

```
    node
    / | \
 node -  3
 / | \
1  +  2
```

也就是说，对于优先级相同的情况，我们采用了和数学中类似的从左往右处理的方式。

我们可以试再着解析问题表达式 `2 * 3 + 4`，我们会得到下面的输出：

```
type: prog
body:
  - type: exprStmt
    value:
      type: binaryExpr
      op: +
      left:
        type: binaryExpr
        op: '*'
        left: '2'
        right: '3'
      right: '4'
```

上面的结果对应下图：

```
    node
    / | \
 node +  4
 / | \
2  *  3
```

可见我们的工作已经达到目的了。

## 结合性「Associativity」

接下来我们来解析一个新的运算符 `**`，这个运算符就是 JS 中的指数运算符。该运算符含有两个字符，而我们目前的运算符还只是单个字符，除了这点不同之外，它还具有比 `*/` 运算符更高的优先级。

我们可以打开这个页面 [Operator precedence
](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence)，这个页面中列出了 JS 中所有的运算符，以及它们的优先级。

在这上述页面中，我们可以发现 `**` 运算符的优先级为 `15`，而 `*/` 的优先级为 `14`。因此为了在语法中包含这个运算规则，我们需要将现有的规则修改成如下的形式：

```ebnf
expr ::= term ( ( "+" | "-" ) term )*
term ::= expo ( ( "*" | "/" ) expo )*
expo ::= factor ( "**" factor )*
factor ::= num
```

只要将现有的实现，修改下面几处，就可以实现对该运算规则的解析。

首先在 Lexer 中修改：

```js
// 增加 Token 类型
TokenType.EXPO = "**";

// 修改 Lexer::isOp 方法，增加 `*`
static isOp(ch) {
  return ["*", "/", "+", "-", "*"].indexOf(ch) !== -1;
}

// 修改 Lexer::readOp 方法，使之可以读取 `**`
readOp() {
  const tok = new Token();
  tok.loc.start = this.getPos();
  tok.type = this.src.read();
  if (tok.type === "*") {
    // 如果当前的字符为 `*`，我们就预读下一个，如果也是 `*` 就读取它
    if (this.src.peek() === "*") {
      this.src.read();
      tok.type = "**";
    }
  }
  tok.loc.end = this.getPos();
  return tok;
}
```

接着修改 Parser：

```js
parseTerm() {
  let left = this.parseExpo();
  while (true) {
    const op = this.lexer.peek();
    if (op.type !== "*" && op.type !== "/") break;
    this.lexer.next();
    const node = new BinaryExpr();
    node.left = left;
    node.op = op;
    node.right = this.parseExpo();
    left = node;
  }
  return left;
}

parseExpo() {
  let left = this.parseFactor();
  while (true) {
    const op = this.lexer.peek();
    if (op.type !== "**") break;
    this.lexer.next();
    const node = new BinaryExpr();
    node.left = left;
    node.op = op;
    node.right = this.parseFactor();
    left = node;
  }
  return left;
}
```

我们增加了 `parseExpo` 方法，并将 `parseTerm` 中原本调用 `parseFactor` 的地方替换为 `parseExpo`，而在 `parseExpo` 中，我们调用 `parseFactor`。这些修改都是一一对应了我们的语法规则的变动。

修改完成后，我们试着解析表达式 `2 ** 3 ** 4`，我们会得到下面的输出：

```
type: prog
body:
  - type: exprStmt
    value:
      type: binaryExpr
      op: '**'
      left:
        type: binaryExpr
        op: '**'
        left: '2'
        right: '3'
      right: '4'
```

该输出的结构即为：

```
    node
    / | \
 node **  4
 / | \
2  **  3
```

该结构表示的计算等于表达式 `(2 ** 3) ** 4`。但是我们知道，在 JS 中，表达式 `2 ** 3 ** 4` 实际上等于 `2 ** (3 ** 4)`，大家动手试一试。

造成这个结果的原因，就是我们没有正确处理运算符的结合性。当表达式中的运算符具有相同的优先级时，就需要通过结合性来指定计算的先后顺序。

更为具体地来说，对于表达式 `a OP b OP c` 而言：

* 因为两个 `OP` 相同，即具有相同的优先级，此时我们需要考虑 `OP` 的结合性
* 如果 `OP` 为左结合的，那么 `b` 将先和左边的 `a` 一起，执行 `OP` 运算，运算的结果再和 `c` 一起，做右边的 `OP` 运算。
* 如果 `OP` 为右结合的，那么 `b` 将先和右边的 `c` 一起，执行 `OP` 运算，运算的结果再和 `a` 一起，做左边的 `OP` 运算。

比如 `a ** b ** c ** d`，对应的结构应为：

```
 node
 / | \
a  ** node
     / | \
    b  **  node
          / | \
         c  ** d
```

在了解了结合性之后，我们来看如何将 `parseExpo` 进行修改，以解析具有右结合性的操作符 `**`。

我们来回顾一下在 [1.7 解析算术表达式 - 左递归和其消除法](1-7-arith-left-recursion.md) 末尾的测试用例，对于表达式 `1 + 2 + 3`，我们输出的结果为

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
        op: '+'
        left: '2'
        right: '3'
```

对应的结构就是：

```
 node
 / | \
1  + node
     / | \
    2  +  3
```

这个结果其实可以看成是将 `+` 当做右结合性来解析的结果。为什么能有这样的效果，我们来看当时的语法：

```ebnf
expr  ::= num expr'
expr' ::= ( ( "*" | "/" | "+" | "-" ) expr )*
        | ε
```

为了解析这样的语法，我们的代码为：

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

我们还一起看了这段代码执行的流程示意图，大家可以结合起来看。这段代码将操作符都处理成右结合性的原因就在于，`parseExpr1` 方法中，对于右边节点的处理，总是调用 `parseExpr`：

```js
parseExpr1(left) {
  // ...
  node.right = this.parseExpr();
  return node;
}
```

而在 `parseExpr` 内部，它先读取一个操作数，然后将其作为参数继续调用 `parseExpr1`，在未来某一时刻 `parseExpr1` 返回时，此前被传入的操作数，成为了返回的节点的左边子节点；这样的间接递归形式，使得所有的操作数都和它右边的操作符结合到了一起，刚好符合了我们需要对右结合性的处理需求。

所以我们可以将我们的 `**` 处理方法修改成：

```js
parseExpo() {
  let left = this.parseFactor();
  while (true) {
    const op = this.lexer.peek();
    if (op.type !== "**") break;
    this.lexer.next();
    const node = new BinaryExpr();
    node.left = left;
    node.op = op;
    node.right = this.parseExpo();
    left = node;
  }
  return left;
}
```

非常简单的修改，只有一行 `node.right = this.parseExpo();`，我们将原本 `parseFactor` 换成了 `parseExpo`。虽然我们这里使用的是直接递归，但是不必担心，我们在 `parseExpo` 中总是会先读取 factor，从而消耗掉一部分输入，因此不会陷入无限循环。

我们通过一个测试来试一试我们修改后的内容，解析表达式 `2 ** 3 ** 4 ** 5`。我们可以得到下面的输出：

```yaml
type: prog
body:
  - type: exprStmt
    value:
      type: binaryExpr
      op: '**'
      left: '2'
      right:
        type: binaryExpr
        op: '**'
        left: '3'
        right:
          type: binaryExpr
          op: '**'
          left: '4'
          right: '5'
```

再来一个综合型的测试，解析表达式 `1 + 2 ** 3 * 5`。我们可以得到下面的输出：

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
        left:
          type: binaryExpr
          op: '**'
          left: '2'
          right: '3'
        right: '5'
```