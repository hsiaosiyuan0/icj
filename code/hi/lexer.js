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
TokenType.NUMBER = "number";
TokenType.MUL = "*";
TokenType.DIV = "/";
TokenType.ADD = "+";
TokenType.SUB = "-";
TokenType.EXPO = "**";
TokenType.PRINT = "print";

class Lexer {
  constructor(src) {
    this.src = src;
  }

  static isDigit(n) {
    return n >= "0" && n <= "9";
  }

  static isOp(ch) {
    return ["*", "/", "+", "-", "*"].indexOf(ch) !== -1;
  }

  next() {
    this.skipWhitespace();
    const ch = this.src.peek();
    if (ch === '"') return this.readString();
    if (ch === "h") return this.readHi();
    if (ch === "p") return this.readPrint();
    if (Lexer.isDigit(ch)) return this.readNumber();
    if (Lexer.isOp(ch)) return this.readOp();
    if (ch === EOF) return new Token(TokenType.EOF);
    throw new Error(this.makeErrMsg());
  }

  makeErrMsg() {
    return `Unexpected char at line: ${this.src.line} column: ${this.src.col}`;
  }

  readPrint() {
    const tok = new Token(TokenType.PRINT);
    tok.loc.start = this.getPos();
    const print = this.src.read(5);
    assert.ok(print === "print", this.makeErrMsg());
    tok.loc.end = this.getPos();
    tok.value = "print";
    return tok;
  }

  readHi() {
    const tok = new Token(TokenType.HI);
    tok.loc.start = this.getPos();
    const hi = this.src.read(2);
    assert.ok(hi === "hi", this.makeErrMsg());
    tok.loc.end = this.getPos();
    tok.value = "hi";
    return tok;
  }

  readString() {
    const tok = new Token(TokenType.STRING);
    tok.loc.start = this.getPos();
    this.src.read();
    const v = [];
    while (true) {
      let ch = this.src.read();
      if (ch === '"') break;
      else if (ch === EOF) throw new Error(this.makeErrMsg());
      v.push(ch);
    }
    tok.loc.end = this.getPos();
    tok.value = v.join("");
    return tok;
  }

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
    if (tok.type === "*") {
      if (this.src.peek() === "*") {
        this.src.read();
        tok.type = "**";
      }
    }
    tok.loc.end = this.getPos();
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
