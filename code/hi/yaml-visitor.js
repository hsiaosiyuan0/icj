const { Visitor } = require("./visitor");
const yaml = require("js-yaml");

class YamlVisitor extends Visitor {
  visitProg(node) {
    return yaml.dump({
      type: node.type,
      body: this.visitStmtList(node.body)
    });
  }

  visitStmtList(list) {
    return list.map(stmt => this.visitStmt(stmt));
  }

  visitExprStmt(node) {
    return {
      type: node.type,
      value: this.visitExpr(node.value)
    };
  }

  visitBinaryExpr(node) {
    return {
      type: node.type,
      op: node.op.type,
      left: this.visitExpr(node.left),
      right: this.visitExpr(node.right)
    };
  }

  visitNumLiteral(node) {
    return node.value;
  }
}

module.exports = {
  YamlVisitor
};
