const { Visitor } = require("./visitor");

class InterpretVisitor extends Visitor {
  visitProg(node) {
    node.body.forEach(stmt => this.visitStmt(stmt));
  }

  visitSayHi(node) {
    console.log(`hi ${node.value}`);
  }

  visitBinaryExpr(node) {
    const left = this.visitExpr(node.left);
    const op = node.op.type;
    const right = this.visitExpr(node.right);
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "**":
        return left ** right;
    }
  }

  visitPrintStmt(node) {
    console.log(this.visitExpr(node.value));
  }

  visitNumLiteral(node) {
    return parseInt(node.value);
  }
}

module.exports = {
  InterpretVisitor
};
