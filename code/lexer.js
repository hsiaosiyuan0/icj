const { EOF, EOL } = require("./source");
const assert = require("assert");

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

  makeErrMsg() {
    return `Unexpected char at line: ${this.src.line} column: ${this.src.col}`;
  }

  readHi() {
    const tok = new Token(TokenType.HI);
    tok.loc.start = this.src.getPos();
    const hi = this.src.read(2);
    assert.ok(hi === "hi", this.makeErrMsg());
    tok.loc.end = this.src.getPos();
    tok.value = "hi";
    return tok;
  }

  readString() {
    const tok = new Token(TokenType.STRING);
    tok.loc.start = this.src.getPos();
    this.src.read();
    const v = [];
    while (true) {
      let ch = this.src.read();
      if (ch === '"') break;
      else if (ch === EOF) throw new Error(this.makeErrMsg());
      v.push(ch);
    }
    tok.loc.end = this.src.getPos();
    tok.value = v.join("");
    return tok;
  }

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

  peek() {
    this.src.pushPos();
    const tok = this.next();
    this.src.restorePos();
    return tok;
  }

  getPos() {
    return this.src.getPos();
  }
}

module.exports = {
  SourceLoc,
  Token,
  TokenType,
  Lexer
};
