const NL = "\n";
const CR = "\r";
const EOL = "\n";
const EOF = "\x03";

class Position {
  constructor(ofst, line, col) {
    this.ofst = ofst;
    this.line = line;
    this.col = col;
  }
}

class Source {
  constructor(code = "", file = "stdin") {
    this.code = code;
    this.file = file;
    this.ch = "";
    this.ofst = -1;
    this.line = 1;
    this.col = 0;
    this.isPeek = false;
    this.posStack = [];
  }

  read(cnt = 1) {
    const ret = [];
    let ofst = this.ofst;
    let c;
    while (cnt) {
      const next = ofst + 1;
      c = this.code[next];
      if (c === undefined) {
        c = EOF;
        ret.push(c);
        break;
      }
      ofst = next;
      if (c === CR || c === NL) {
        if (c === CR && this.code[next + 1] === NL) ofst++;
        if (!this.isPeek) {
          this.line++;
          this.col = 0;
        }
        c = EOL;
      } else if (!this.isPeek) this.col++;
      ret.push(c);
      cnt--;
    }
    if (!this.isPeek) {
      this.ch = c;
      this.ofst = ofst;
    }
    return ret.join("");
  }

  peek(cnt = 1) {
    this.isPeek = true;
    const ret = this.read(cnt);
    this.isPeek = false;
    return ret;
  }

  getPos() {
    return new Position(this.ofst, this.line, this.col);
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
}

module.exports = {
  NL,
  CR,
  EOL,
  EOF,
  Position,
  Source
};
