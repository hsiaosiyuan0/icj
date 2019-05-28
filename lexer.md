# 词法分析器

有了前面的介绍，我们编写词法解析的工作将变得很简单。接下来我们开始着手编写我们的词法解析器「Lexer」。

我们的 hi 语言只有两个词法元素，分别是 `HI` 和 `STRING`。

词法分析器的作用就是，接收 Source 的输入，并将其转化为 Tokens 输出，根据这个需求，我们可以这样来写词法解析器：

```js
class Lexer {
  constructor(src) {
    this.src = src;
  }

  next() {
    this.skipWhitespace();
    const ch = this.src.peek();
    switch (ch) {
      case '"':
        return this.readString();
      case "h":
        return this.readHi();
      case EOF:
        return new Token(TokenType.EOF);
      default:
        throw new Error(this.makeErrMsg());
    }
  }

  makeErrMsg() {}

  readHi() {}

  readString() {}

  skipWhitespace() {}
}
```

可以看到 Lexer 的构造函数只有一个参数，就是 Source 的实例。未来在使用 Lexer 的时候，通过不断调用 `next` 方法，来读取 Tokens。

在 `next` 方法中，我们使用了先行预测「Lookahead」，即向前预读一个字符，来判断接下来是读取 HI 关键字，还是读取字符串。如果两者都不是，就判断是否已经读到源文件的结尾处。最后如果都匹配不到，我们就直接抛出一个异常，表示读入了无法识别的字符，也就是源文件中包含了不符合词法规则的字符。

因为词法元素在源文件中是被空白分割的，所以我们在 `next` 运行之初，调用了 `skipWhitespace` 方法，就和它的名字一样，这是用来跳过文件中的空白字符的。`skipWhitespace` 方法如下：

```js
skipWhitespace() {
  while (true) {
    let ch = this.src.peek();
    if (ch === " " || ch === "\t" || ch === EOL) {
      this.src.read();
      continue;
    }
    break;
  }
}
```

我们这里简单地跳过空格、制表符、和换行。

为什么是「简单地」？因为我们没有考虑 Unicode 的情况，在 Unicode 中，还有其他的一些字符表示空白。

并且上面使用了 `EOL` ，因为各个平台不同的换行符已经被我们在 Source 中处理过了。

`makeErrMsg` 方法非要简单，就是制作报错信息，因为我们在词法解析的过程中，将会多次使用报错信息，所以我们将其制作成一个方法：

```js
makeErrMsg() {
  return `Unexpected char at line: ${this.src.line} column: ${this.src.col}`;
}
```

对于报错信息，我们也只是简单地打印行列号。

在开始读取 Token 之前，我们还需要另外几个辅助类，分别是「SourceLoc」，「Token」，「TokenType]：

```js
class SourceLoc {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

class Token {
  constructor(type, value, loc) {
    this.type = type;
    this.value = value;
    this.loc = loc || new SourceLoc();
  }
}

class TokenType {}
TokenType.EOF = "eof";
TokenType.HI = "hi";
TokenType.STRING = "string";
```

Token 表示的就是我们解析后的词法元素，包含了该词法元素的类型，内容，以及它在源文件中的位置信息。由于 Token 的内容是源文件的片段，所以位置需要包含 `start` 和 `end` 信息。

接着我们开始看一下 `readHi` 方法的实现：

```js
readHi() {
  const tok = new Token(TokenType.HI);
  tok.loc.start = this.src.getPos();
  const hi = this.src.read(2);
  assert.ok(hi === "hi", this.makeErrMsg());
  tok.loc.end = this.src.getPos();
  tok.value = "hi";
  return tok;
}
```

首先，一旦进入了该方法，则表示接下来的字符一定是 `h`，因为我们是在 `next` 方法中通过预读一个字符、并匹配到 `h` 进来的。于是我们这里直接读取接下来的两个字符，判断它们是否是 `hi`。如果不是 `hi`，我们则直接报错。

注意这里 Token 的位置信息收集分为两部分，在读取之前，我们收集了 `start` 信息，在读取内容之后，我们收集了 `end` 的信息。

最后我们看一下 `readString` 方法：

```js
readString() {
  const tok = new Token(TokenType.STRING);
  tok.loc.start = this.src.getPos();
  this.src.read();
  const v = [];
  while (true) {
    let ch = this.src.read();
    if (ch === '"') break;
    else if(ch === EOF) throw new Error(this.makeErrMsg());
    v.push(ch);
  }
  tok.loc.end = this.src.getPos();
  tok.value = v.join("");
  return tok;
}
```

注意第一个 `read` 操作，因为我们是通过预读满足了 `"` 才调用的该方法，所以我们这里直接跳过 `"`，因为我们只想收集双信号之间的字符串内容。然后在循环内部，我们就不断读取字符，如果遇到了作为关闭标签的 `"` 我们就跳出循环。

我们将读取的字符都先存入 `v` 数组中，在循环跳出之后，再将它们合并为字符串，存入 Token。

注意在写循环的时候，一定到注意跳出条件，所以如果在读到文件末尾仍未遇到关闭的 `"`，我们就抛出一个异常来终止程序。对于 `read` 方法的实现，我们也可以结合之前根据 EBNF 生成的铁路图来看。

现在我们来试一试我们的 Lexer 的工作效果：

```js
const { Source } = require("./source");
const { Lexer, TokenType } = require("./lexer");

const code = `hi "lexer"`;
const src = new Source(code);
const lexer = new Lexer(src);

while (true) {
  const tok = lexer.next();
  if (tok.type === TokenType.EOF) break;
  console.log(tok);
}
```

运气好的话，我们应该会在控制台看到输出了两个 Tokens，分别是 `HI` 和 `STRING`。

最后，我们再为 Lexer 添加一个方法 「Peek」，这样我们的词法分析器也有了预读的功能

```js
peek() {
  this.src.pushPos();
  const tok = this.next();
  this.src.restorePos();
  return tok;
}
```

可以看到我们的预读功能主要是借助了 Source 类中的 `pushPos` 和 `restorePos` 方法。所以我们继续在 Source 类中补全这两个方法：

```js
constructor(code = "", file = "stdin") {
  // ...
  this.posStack = [];
}

pushPos() {
  this.posStack.push(this.getPos());
}

restorePos() {
  const pos = this.posStack.pop();
  if (pos === undefined)
    throw new LexerError("Unbalanced popping of position stack");
  this.ofst = pos.ofst;
  this.line = pos.line;
  this.col = pos.col;
}

getPos() {
  return this.src.getPos();
}
```

首先我们给 Source 类增加一个属性 `posStack`，用来保存位置信息。随后，通过对这个数组进行 `push` 和 `pop` 来存入和取回位置信息。

因为 `push` 和 `pop` 在代码中肯定是成对出现的，所以我们在 `restorePos` 的时候，进行了一个简单的检查。

为了使我们未来在 Parser 中获取源文件时，不需要使用 `this.lexer.src.getPos()` 这么长的调用链，我们在 Lexer 中增加了 `getPos` 方法。

这样我们在 Parser 中只需要通过 `this.lexer.getPos()` 就可以了，是短了一点吧看起来。