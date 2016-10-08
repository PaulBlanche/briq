import r from '../lambda';
import * as DOM from './DOM.js';
import Text from './Text.js';

const SPECIAL_ATTRIBUTE_PREFIX = '__';
const SPECIAL_ATTRIBUTES = {
  INNER_HTML : SPECIAL_ATTRIBUTE_PREFIX + 'unsafeInnerHTML',
}

function createHTMLElement(name, attributes) {
  attributes = toKeyValue(attributes);
  let {HTMLElement, cleaners} = setAttributes(document.createElement(name), attributes);
  return {HTMLElement, clean:r.partial(execAll, [cleaners])}
}

function execAll(array) {
  array.forEach((item) => {item()});
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

function render(name, attributes, childs) {
  let innerHTML = attributes[SPECIAL_ATTRIBUTES.INNER_HTML];
  if(innerHTML !== undefined) {
    delete attributes[SPECIAL_ATTRIBUTES.INNER_HTML];
  }
  let {HTMLElement, clean} = createHTMLElement(name, attributes);
  if (innerHTML) {
    return Promise.resolve({HTMLElement:DOM.setInnerHTML(HTMLElement, innerHTML), clean:clean})
  } else {
    return mountChilds(HTMLElement, clean, childs);
  }
}

function mountChilds(HTMLElement, clean, childs) {
  return childs.reduce((promise, child) => {
    return promise.then(({HTMLElement, cleaners}) => {
      return mountChild(HTMLElement, child).then(({parent, clean, remove}) => {
        return {HTMLElement:parent, cleaners:cleaners.concat(clean)};
      });
    });
  }, Promise.resolve({HTMLElement, cleaners:[clean]})).then(({HTMLElement, cleaners}) => {
    return {HTMLElement, clean:r.partial(execAll, [cleaners])}
  });
}

function mountChild(HTMLElement, child) {
  if(!child.mount) {
    child = Text(child.toString());
  }
  return child.mount(HTMLElement);
}

function mount(renderTag, root) {
  return renderTag().then(({HTMLElement, clean}) => {
    let {parent, removeChild} = DOM.appendChild(root, HTMLElement);
    return {parent, clean, remove:removeChild}
  });
}

function unmount(clean, remove) {
  clean();
  return remove();
}

export default function Tag(name, attributes = {}, ...childs) {
  childs = r.unnest(childs);
  let renderTag = r.partial(render, [name, attributes, childs]);
  let _renderTag = r.memoize(renderTag);
  return {
    render: _renderTag,
    mount(parent) {
      return mount(_renderTag, parent).then(({parent, clean, remove}) => {
        this.unmount = r.partial(unmount, [clean, remove]);
        return {parent, clean, remove};
      })
    },
    toString() {return '<'+name+'>'},
    unmount() {}
  }
}

const toKeyValue = r.toKeyValue;

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
