const { NodeType } = require("./parser");

class Visitor {
  visitProg(node) {}

  visitSayHi(node) {}

  visitExprStmt(node) {}

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
}

module.exports = {
  Visitor
};
