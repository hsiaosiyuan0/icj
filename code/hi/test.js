const { Source } = require("./source");
const { Lexer, TokenType } = require("./lexer");
const { Parser } = require("./parser");
const { InterpretVisitor } = require("./interpret-visitor");
const { YamlVisitor } = require("./yaml-visitor");
const util = require("util");

const code = `print 1 + 2 ** 3 * 5`;
const src = new Source(code);
const lexer = new Lexer(src);
const parser = new Parser(lexer);

const ast = parser.parseProg();
// const visitor = new YamlVisitor();
// console.log(visitor.visitProg(ast));
const visitor = new InterpretVisitor();
visitor.visitProg(ast);
