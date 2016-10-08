import r from '../lambda.js';

function escape(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const klass = {
  'number':'[0-9]+',
  'identifier':'[a-zA-Z0-9_-]+',
  'email':'[^ ]+@[^ ]+'
}

export default function Matcher(matcher) {
  if(!(this instanceof Matcher)) {
    return new Matcher(matcher);
  }
  let names = [];
  let base = parse(names, matcher);
  this.match = r.partial(match, [regexp(base), names]);
  this.produce = r.partial(produce, [base]);
}
Matcher.define = define;

function define(name, regexp) {
  klass[name] = regexp;
}

function produce(base, obj) {
  return base.map((fragment) => {
    if(fragment.name) {
      return obj[fragment.name];
    }
    return fragment
  }).join('');
}

function match (regexp, names, candidate) {
  let match = candidate.match(regexp);
  let obj = {};
  if(match) {
    obj.match = match.shift();
    obj = names.reduce((obj, name, index) => {
      obj[name] = toNumberIfPossible(match[index]);
      return obj;
    }, obj);
  }
  return obj;
}

function toNumberIfPossible(string) {
  if (parseFloat(string, 10).toString() === string) {
    return parseFloat(string, 10);
  }
  return string;
}

function parse(names, matcher) {
  return matcher.split(/(\{[a-zA-Z0-9_\-]*(?::.*?)?\})/).map((fragment) => {
    if(isCapture(fragment)) {
      let {name, regexp} = parseCapture(fragment);
      names.push(name);
      return {name, regexp}
    } else {
      return fragment;
    }
  });
}

function regexp(base) {
  let str = base.map((fragment) => {
    if(fragment.name) {
      return fragment.regexp;
    }
    return escape(fragment);
  }).join('');
  return new RegExp('^' + str + '$');
}

function isCapture(piece){
  return piece[0] === '{' && piece[piece.length -1 ] === '}';
}

function parseCapture(capture) {
  capture = capture.slice(1, -1);
  let indexOfSeparator = capture.indexOf(':');
  if (indexOfSeparator !== -1) {
    let regexp = capture.slice(indexOfSeparator + 1);
    if(klass[regexp]) {
      regexp = klass[regexp];
    }
    return {
      name: capture.slice(0, indexOfSeparator),
      regexp: '(' + regexp + ')'
    }
  }
  return {name:capture, regexp:'(.*)'};
}
