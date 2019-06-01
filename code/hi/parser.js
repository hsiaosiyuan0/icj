const { SourceLoc, TokenType, Lexer } = require("./lexer");
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

class PrintStmt extends Node {
  constructor(loc, value) {
    super(NodeType.PRINT_STMT, loc);
    this.value = value;
  }
}

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

class NodeType {}
NodeType.PROG = "prog";
NodeType.SAY_HI = "sayhi";
NodeType.EXPR_STMT = "exprStmt";
NodeType.BINARY_EXPR = "binaryExpr";
NodeType.NUMBER = "number";
NodeType.PRINT_STMT = "printStmt";

class Parser {
  constructor(lexer) {
    this.lexer = lexer;
  }

  parseProg() {
    const node = new Prog();
    node.loc.start = this.lexer.getPos();
    while (true) {
      const tok = this.lexer.peek();
      let stmt;
      if (tok.type === TokenType.EOF) break;
      if (tok.type === TokenType.HI) stmt = this.parseSayHi();
      if (tok.type === TokenType.NUMBER) stmt = this.parseExprStmt();
      if (tok.type === TokenType.PRINT) stmt = this.parsePrintStmt();
      node.body.push(stmt);
    }
    node.loc.end = this.lexer.getPos();
    return node;
  }

  parsePrintStmt() {
    const node = new PrintStmt();
    let tok = this.lexer.next();
    node.loc.start = tok.loc.start;
    node.value = this.parseExpr();
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

  parseExprStmt() {
    const node = new ExprStmt();
    const expr = this.parseExpr();
    node.loc = expr.loc;
    node.value = expr;
    return node;
  }

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
      node.right = this.parseExpo();
      left = node;
    }
    return left;
  }

  parseFactor() {
    return this.parseNum();
  }

  parseNum() {
    const node = new NumLiteral();
    let tok = this.lexer.next();
    assert.ok(tok.type === TokenType.NUMBER, this.makeErrMsg(tok));
    node.loc = tok.loc;
    node.value = tok.value;
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
