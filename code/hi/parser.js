const { SourceLoc, TokenType } = require("./lexer");
const assert = require("assert");

class Node {
  constructor(type, loc) {
    this.type = type;
    this.loc = loc || new SourceLoc();
  }
}

class Prog extends Node {
  constructor(loc, body = []) {
    super(NodeType.PROG, loc);
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
NodeType.PROG = "prog";
NodeType.SAY_HI = "sayhi";

class Parser {
  constructor(lexer) {
    this.lexer = lexer;
  }

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
}

module.exports = {
  Node,
  NodeType,
  Prog,
  SayHi,
  Parser
};
