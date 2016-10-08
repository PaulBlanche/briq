import tape from 'tape';
import Tag from './Tag.js';

var jsdom = require("jsdom").jsdom;
var document = jsdom(undefined, {});
var window = document.defaultView;

global.document = document;
global.window = window;

function handleError(e, t) {
  t.fail('No error should be thrown');
  console.error('Error thrown :', e);
  t.end();
}

function holder() {
  return document.createElement('body');
}

function isTag(HTMLElement, name) {
  return HTMLElement.tagName.toLowerCase() === name.toLowerCase();
}

function hasChildren(HTMLElement, length) {
  return HTMLElement.childNodes.length === length;
}

function nthChild(HTMLElement, index) {
  return HTMLElement.childNodes[index];
}

function getAttribute(HTMLElement, key) {
  return HTMLElement.getAttribute(key);
}

function getText(HTMLElement) {
  return HTMLElement.textContent;
}

tape.test('Tag.mount() generates an HTMLElement of apropriate type', (t) => {
  let doneCount = 0;
  function done() {
    if(++doneCount === 2) {
      t.end();
    }
  }
  Tag('div', {}).mount(holder()).then(({parent, clean, remove}) => {
    t.assert(hasChildren(parent, 1) && isTag(nthChild(parent,0), 'div'), 'mount() should mount the correct HTML');
    done();
  }).catch((e) => handleError(e, t));
  Tag('span', {}).mount(holder()).then(({parent, clean, remove}) => {
    t.assert(hasChildren(parent, 1) && isTag(nthChild(parent,0), 'span'), 'mount() should mount the correct HTML');
    done();
  }).catch((e) => handleError(e, t));
})

tape.test('Tag.mount() generates an HTMLElement with attributes', (t) => {
  Tag('div', {foo:'bar', baz:'foobar'})
  .mount(holder())
  .then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    t.equal(getAttribute(HTMLElement, 'foo'), 'bar', 'mount() on Tag with {foo:bar} shoud set "foo" attribute to "bar"');
    t.equal(getAttribute(HTMLElement, 'baz'), 'foobar', 'mount() on Tag with {baz:foobar} shoud set "baz" attribute to "foobar"');
    t.end();
  }).catch((e) => handleError(e, t));
})

tape.test('Tag.mount() generates an HTMLElement with event listeners', (t) => {
  onClick.count = 0;
  function onClick() {
    onClick.count++;
  }
  Tag('div', {onClick}).mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    HTMLElement.click()
    t.equal(onClick.count, 1, 'onClick() should be triggered once on click event');
    t.end();
  }).catch((e) => handleError(e, t));
});

tape.test('Tag.mount() generates an HTMLElement with nested childs', (t) => {
  let tag = Tag('div', {},
    [Tag('p'), Tag('p')],
    Tag('p', {},
      Tag('span')
    )
  );
  function assertDirectChilds(HTMLElement) {
    let childNodes = HTMLElement.childNodes
    if(!hasChildren(HTMLElement, 3)) {return false;}
    if(!isTag(nthChild(HTMLElement, 0), 'p')) {return false;}
    if(!isTag(nthChild(HTMLElement, 1), 'p')) {return false;}
    if(!isTag(nthChild(HTMLElement, 2), 'p')) {return false;}
    return true;
  }
  function assertNestedChilds(HTMLElement) {
    let child = nthChild(HTMLElement, 2);
    if(!hasChildren(child, 1)) {return false;}
    if(!isTag(nthChild(child, 0), 'span')) {return false;}
    return true;
  }
  tag.mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    t.assert(assertDirectChilds(HTMLElement), 'Tag.mount() should render direct childs');
    t.assert(assertNestedChilds(HTMLElement), 'Tag.mount() should render nested childs');
    t.end();
  }).catch((e) => handleError(e, t));
});

tape.test('Tag.mount() generates an HTMLElement with innerHTML', (t) => {
  let tag = Tag('div', {__unsafeInnerHTML:'<p>Hello world</p>'});
  function assertInnerHTML(HTMLElement) {
    if(!hasChildren(HTMLElement, 1)) {return false;}
    if(!isTag(nthChild(HTMLElement, 0), 'p')) {return false;}
    if(getText(nthChild(HTMLElement, 0)) !== 'Hello world') {return false;}
    return true;
  }
  tag.mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    t.assert(assertInnerHTML(HTMLElement), 'The correct HTML should be set with __unsafeInnerHTML');
    t.equal(getAttribute(HTMLElement, '__unsafeInnerHTML'), null, 'Special attribut should not be set')
    t.end();
  }).catch((e) => handleError(e, t));
})

tape.test('Tag.mount() should automatically wrap String child in TextNode', (t) => {
  let tag = Tag('div', {}, 'Hello World');
  tag.mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    t.equal(getText(HTMLElement), 'Hello World', 'Tag.mount() should wrap string child in TextNode')
    t.end();
  }).catch((e) => handleError(e, t));
})

tape.test('Tag.mount() should cache the rendered HTML', (t) => {
  let tag = Tag('div', {});
  tag.mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    let oldparent = parent;
    tag.mount(holder()).then(({parent, clean, remove}) => {
      t.equal(parent.querySelector('div'), HTMLElement, 'mount() should append the same HTML each time');
      t.assert(hasChildren(oldparent, 0), 'the HTML should only reside in the current parent');
      t.end();
    })
  })
})

tape.test('Tag.unmount() should revert the Tag.mount() operation', (t) => {
  onClick.count = 0;
  function onClick() {
    onClick.count++;
  }
  let tag = Tag('div', {onClick}, Tag('p', {}, 'Hello world'));
  function assertChild(HTMLElement) {
    let childNodes = HTMLElement.childNodes
    if(!hasChildren(HTMLElement, 1)) {return false;}
    if(childNodes[0].tagName.toLowerCase() !== 'p') {return false;}
    if(childNodes[0].textContent !== 'Hello world') {return false;}
    return true;
  }
  let body = holder();
  let child = undefined;
  tag.mount(body).then(({parent, clean, remove}) => {
    child = parent.querySelector('div');
    return tag.unmount();
  }).then((parent) => {
    t.equal(parent, body, 'Tag.unmount() should return the parent');
    t.assert(assertChild(child), 'Tag.unmount() should not modify the severed child');
    t.assert(!parent.contains(child), 'Tag.unmount() should remove the child from the parent');
    child.click();
    t.equal(onClick.count, 0, 'Tag.unmount() should remove all event listeners');
    t.end()
  }).catch((e) => {
    handleError(e, t);
  })
})

tape.onFinish(function(){
  window.close();
});
