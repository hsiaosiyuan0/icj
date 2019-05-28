const { Source } = require("./source");
const { Lexer, TokenType } = require("./lexer");
const { Parser } = require("./parser");
const util = require("util");

const code = `hi "lexer"
hi "parser"
`;
const src = new Source(code);
const lexer = new Lexer(src);
const parser = new Parser(lexer);

const ast = parser.parseProg();
console.log(util.inspect(ast, true, null));
