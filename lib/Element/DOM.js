import r from '../lambda';

export function setAttribute(HTMLElement, key, value) {
  console.log('set attribute {%s:%s} on %s', key, value, toString(HTMLElement))
  HTMLElement.setAttribute(key, value);
  return HTMLElement;
}

export function createHTMLElement(name) {
  console.log('create new <%s>', name)
  return document.createElement(name);
}

export function createTextNode(string) {
  console.log('create new TextNode : %s', limit(string, 20))
  return document.createTextNode(string);
}

export function addEventListener(HTMLElement, type, listener) {
  console.log('add [%s] event listener on %s', type, toString(HTMLElement))
  HTMLElement.addEventListener(type, listener);
  return {HTMLElement, removeEventListener:r.partial(removeEventListener, [HTMLElement, type, listener])};
}

function removeEventListener(HTMLElement, type, listener) {
  console.log('remove [%s] event listener from %s', type, toString(HTMLElement))
  HTMLElement.removeEventListener(type, listener);
  return HTMLElement;
}

export function appendChild(parent, child) {
  console.log('append %s to %s', toString(child), toString(parent))
  parent.appendChild(child);
  return {parent, removeChild:r.partial(removeChild, [parent, child])};
}

export function replaceChild(parent, newChild, oldChild) {
  console.log('replacing %s with %s in %s', toString(oldChild), toString(newChild), toString(parent))
  parent.replaceChild(newChild, oldChild);
  return {parent, removeChild:r.partial(removeChild, [parent, newChild])};
}

function removeChild(parent, child) {
  console.log('removing %s from %s', toString(child), toString(parent))
  parent.removeChild(child);
  return parent;
}

export function setInnerHTML(HTMLElement, string) {
  console.log('set innerHTML "%s" to %s', limit(string, 20), toString(HTMLElement))
  HTMLElement.innerHTML = string;
  return HTMLElement;
}

function limit(string, limit) {
  if(string.length < limit) {
    return string;
  }
  return string.slice(0, limit-3) + '...';
}

export function toString(HTMLElement) {
  if(!HTMLElement.tagName) {
    return '"' + limit(HTMLElement.textContent, 20) + '"';
  }
  let name = HTMLElement.tagName.toLowerCase();
  let attributes = [...HTMLElement.attributes].map((attribute) => {
    return attribute.name + '="' + attribute.value + '"';
  }).join(' ');
  attributes = attributes.length > 0 ? ' ' + attributes : attributes;
  return '<' + name + attributes + '>'
}
