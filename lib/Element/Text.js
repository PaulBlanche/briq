import {createTextNode, appendChild} from './DOM.js';
import r from '../lambda';

export default function Text(string) {
  let renderText = r.partial(render, [string]);
  return {
    render:renderText,
    mount:r.partial(mount, [renderText]),
    toString() {return string}
  }
}

function render(string) {
  return createTextNode(string);
}

function mount(renderText, root) {
  let {parent, removeChild} = appendChild(root, renderText());
  return Promise.resolve({parent, clean:()=>{}, remove:removeChild})

}
