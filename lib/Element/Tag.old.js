import r from 'ramda';
import Text from './Text.js';
import * as DOM from './DOM.js';

const SPECIAL_ATTRIBUTE_PREFIX = '__';
const SPECIAL_ATTRIBUTES = {
  INNER_HTML : SPECIAL_ATTRIBUTE_PREFIX + 'unsafeInnerHTML',
}

export default function Tag(name, attributes = {}, ...childs) {
  if(!(this instanceof Tag)) {
    return new Tag(name, attributes, ...childs);
  }

  let innerHTML = attributes[SPECIAL_ATTRIBUTES.INNER_HTML];
  if(innerHTML !== 0) {
    delete attributes[SPECIAL_ATTRIBUTES.INNER_HTML];
  }

  attributes = toKeyValue(attributes);
  childs = r.unnest(childs);

  let render = r.memoize(r.partial(renderWithChilds, [name, attributes, childs]));
  if(innerHTML !== undefined) {
    render = r.memoize(r.partial(renderWithInnerHTML, [name, attributes, innerHTML]));
  }

  this.mount = (root) => {
    return mount(render, root).then(({parent, clean, remove, childs}) => {
      this.unmount = () => {
        clean();
        return remove();
      }
      return {parent, clean, remove, childs};
    });
  }
  this.toString = r.partial(toString, [name, attributes, childs]);
  this.unmount = noop;
}

function mount(render, root) {
  console.log('mounting to %s', DOM.toString(root));
  return render().then(({HTMLElement, clean}) => {
    let {parent, removeChild} = DOM.appendChild(root, HTMLElement);
    return {parent, clean, remove:removeChild, childs:[HTMLElement]};
  });
}

function renderWithInnerHTML(name, attributes, html) {
  let {HTMLElement, cleaners} = setAttributes(DOM.setInnerHTML(DOM.createHTMLElement(name), html), attributes);
  return Promise.resolve({HTMLElement, clean:r.partial(callAll, [cleaners])}).then((result) => {
    console.log('rendered %s', toString(name, attributes, [html]));
    return result;
  });
}

function renderWithChilds(name, attributes, childs) {
  let {HTMLElement, cleaners} = setAttributes(DOM.createHTMLElement(name), attributes);
  return childs.reduce((promise, child) => {
    return promise.then(({HTMLElement, childCleaners}) => {
      return mountChild(child, HTMLElement).then(({parent, clean, remove}) => {
        return {HTMLElement:parent, childCleaners:r.append(clean, childCleaners)}
      });
    })
  }, Promise.resolve({HTMLElement, childCleaners:[]})).then(({HTMLElement, childCleaners}) => {
    console.log('rendered %s', toString(name, attributes, childs));
    return {HTMLElement, clean:r.partial(callAll, [r.concat(cleaners, childCleaners)])};
  })
}

function mountChild(child, parent) {
  if(!child.mount) {
    child = Text(child.toString());
  }
  return child.mount(parent);
}

function callAll(fns) {
  fns.forEach((fn) => {
    fn();
  })
}

function setAttributes(HTMLElement, attributes) {
  return attributes.reduce(({HTMLElement, cleaners}, attribute) => {
    let {result, cleaner} = processAttribute(HTMLElement, attribute);
    return {HTMLElement:result, cleaners:r.append(cleaner, cleaners)};
  }, {HTMLElement, cleaners:[]});
}

function processAttribute(HTMLElement, attribute) {
  if (isEventListenerAttribute(attribute)) {
    let type = attribute.key.slice(2).toLowerCase();
    var {HTMLElement, removeEventListener} = DOM.addEventListener(HTMLElement, type, attribute.value);
    return {result:HTMLElement, cleaner:removeEventListener};
  } else {
    let result = DOM.setAttribute(HTMLElement, attribute.key, attribute.value);
    return {result, cleaner:noop};
  }
}

function isEventListenerAttribute(attribute) {
  return r.is(Function, attribute.value) && attribute.key.slice(0,2).toLowerCase() === 'on';
}

function toString(name, attributes, childs) {
  let strAttributes = attributes.map((attribute) => {
    let strAttribute = attribute.key + ':' + attribute.value;
    if(isEventListenerAttribute(attribute)) {
      strAttribute = attribute.key + ':[Function]';
    }
    return '  ' + strAttribute;
  }).join('\n');
  strAttributes = attributes.length > 0 ? '{\n' + strAttributes +'\n}' : '';
  let strChilds = childs.map((child) => {
    return child.toString();
  }).join('\n').split('\n').map((line) => {return '    ' + line;}).join('\n');
  strChilds = childs.length > 0 ? '\n' + strChilds + '\n' : '';
  return '[Tag:' + name + strAttributes + ']' + strChilds + '[/Tag:' + name + ']';
}

const toKeyValue = r.compose(r.map(r.zipObj(['key', 'value'])), r.toPairs);

const noop = () => {};

//**********

const HTML5_TAGS_NAME = [
  'section', 'nav', 'article', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup', 'header', 'footer', 'address',
  'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'figure', 'figurecaption', 'div',
  'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'span', 'br', 'wbr',
  'ins', 'del',
  'img', 'iframe', 'object', 'param', 'video', 'audio', 'source', 'track', 'canvas', 'map', 'area', 'svg', 'math',
  'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th',
  'form', 'fieldset', 'legend', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option', 'textarea', 'keygen', 'output', 'progress', 'meter'
];

HTML5_TAGS_NAME.reduce((Tag, tagName) => {
  Tag[tagName] = r.partial(Tag, [tagName]);
  return Tag;
}, Tag)
