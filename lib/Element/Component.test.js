import tape from 'tape';
import Component from './Component.js';
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

tape.test('Component.mount() mount the HTML defined in its tag method', (t) => {
  onClick.count = 0;
  function onClick() {
    onClick.count++;
  }
  let component = Component({
    tag() {
      return Tag('div', {onClick},
        [Tag('p', {}, 'Hello'), Tag('p', {}, 'World')],
        Tag('p', {},
          Tag('span', {}, 'Again !')
        )
      );
    }
  });
  function assertHTML(parent) {
    if(!hasChildren(parent, 1)) {return false;}
    let firstChild = nthChild(parent, 0);
    if(!isTag(firstChild, 'div')) {return false;}
    if(!hasChildren(firstChild, 3)) {return false;}
    if(!isTag(nthChild(firstChild, 0) ,'p')) {return false;}
    if(getText(nthChild(firstChild, 0)) !== 'Hello') {return false;}
    if(!isTag(nthChild(firstChild, 1) ,'p')) {return false;}
    if(getText(nthChild(firstChild, 1)) !== 'World') {return false;}
    if(!isTag(nthChild(firstChild, 2) ,'p')) {return false;}
    if(!hasChildren(nthChild(firstChild, 2), 1)) {return false;}
    if(!isTag(nthChild(nthChild(firstChild, 2), 0), 'span')) {return false;}
    if(getText(nthChild(nthChild(firstChild, 2), 0)) !== 'Again !') {return false;}
    return true;
  }
  component({}).mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    t.assert(assertHTML(parent), 'The correct HTML should be returned');
    HTMLElement.click();
    t.equal(onClick.count, 1, 'Event listener should be bound');
    t.end();
  }).catch((e) => handleError(e, t));
})

tape.test('Component.mount() should cache the rendered HTML', (t) => {
  let component = Component({
    tag() {
      return Tag('div');
    }
  });
  let instance = component({});
  instance.mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    let oldparent = parent;
    return instance.mount(holder()).then(({parent, clean, remove}) => {
      t.equal(parent.querySelector('div'), HTMLElement, 'mount() should append the same HTML each time');
      t.equal(oldparent.childNodes.length, 0, 'the HTML should only reside in the current parent');
      t.end();
    })
  }).catch((e) => handleError(e, t));
})

tape.test('Component.mount() should render inner components', (t) => {
  let li = Component({
    tag() {
      return Tag('li', {}, 'list-item');
    }
  });
  let ul = Component({
    tag() {
      return Tag('ul', {},
        li({}),
        Tag('li', {}, 'another list-item')
      );
    }
  });
  function assertHTML(HTMLElement) {
    if(!hasChildren(HTMLElement, 2)) {return false;}
    if(!isTag(nthChild(HTMLElement, 0), 'li')) {return false;}
    if(getText(nthChild(HTMLElement, 0)) !== 'list-item') {return false;}
    if(!isTag(nthChild(HTMLElement, 1), 'li')) {return false;}
    if(getText(nthChild(HTMLElement, 1)) !== 'another list-item') {return false;}
    return true;
  }
  ul({}).mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('ul');
    t.assert(assertHTML(HTMLElement), 'The correct HTML should be mounted');
    t.end();
  }).catch((e) => handleError(e, t));
})

tape.test('Component.mount() generates a dynamic HTML using self', (t) => {
  onClick.count = 0;
  function onClick() {
    onClick.count++;
  }
  let component = Component({
    tag(self) {
      console.log(self);
      if(self.props.listenClicks) {
        return Tag('div', {onClick}, self.props.content);
      } else {
        return Tag('div', {}, self.props.content);
      }
    }
  });
  component({listenClicks:true, content:'yeah'}).mount(holder()).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    HTMLElement.click();
    t.equal(onClick.count, 1, 'Event should be bound');
    t.equal(HTMLElement.textContent, 'yeah', 'Correct values should be set');
  }).then(() => {
    return component({listenClicks:false, content:'meh'}).mount(holder());
  }).then(({parent, clean, remove}) => {
    let HTMLElement = parent.querySelector('div');
    HTMLElement.click();
    t.equal(onClick.count, 1, 'Event should not be bound');
    t.equal(HTMLElement.textContent, 'meh', 'Correct values should be set');
    t.end();
  }).catch((e) => handleError(e, t));

})

tape.test('Component.mount() should respect the lifecycle and mount the component in a parent', (t) => {
  let beforeMountCount = 0;
  let renderCount = 0;
  let afterMountCount = 0
  let component = Component({
    beforeRender() {
      beforeMountCount++;
      t.equal(renderCount, 0, 'beforeMount should be called before render');
      t.equal(afterMountCount, 0, 'beforeMount should be called before afterMount');
    },
    tag() {
      renderCount++;
      t.equal(beforeMountCount, 1, 'render should be called after beforeMount');
      t.equal(afterMountCount, 0, 'render should be called before afterMount');
      return Tag('div');
    },
    afterRender() {
      afterMountCount++;
      t.equal(beforeMountCount, 1, 'afterMount should be called after beforeMount');
      t.equal(renderCount, 1, 'afterMount should be called after render');
    }
  });
  component({}).mount(holder()).then(({parent, clean, remove}) => {
    t.equal(beforeMountCount, 1, 'beforeMount should be called')
    t.equal(renderCount, 1, 'render should be called')
    t.equal(afterMountCount, 1, 'afterMount should be called')
    t.end();
  }).catch((e) => {
    handleError(e, t);
  })
});

tape.test('A different "self" should be passed to all functions', (t) => {
  let beforeMountSelf = undefined;
  let renderSelf = undefined;
  let afterMountSelf = undefined;
  let props = {foo:'bar'};
  let component = Component({
    beforeRender(self) {
      beforeMountSelf = self;
      t.deepEqual(self.props, props, 'Props should be passed through self');
    },
    tag(self) {
      renderSelf = self;
      t.deepEqual(self.props, props, 'Props should be passed through self');
      return Tag('div');
    },
    afterRender(self) {
      afterMountSelf = self;
      t.deepEqual(self.props, props, 'Props should be passed through self');
    }
  });
  component(props).mount(holder()).then(({parent, clean, remove}) => {
    t.notEqual(beforeMountSelf, renderSelf, '"self" in render should be different to "self" in beforeMount');
    t.notEqual(renderSelf, afterMountSelf, '"self" in render should be different to "self" in afterMountSelf');
    t.notEqual(beforeMountSelf, afterMountSelf, '"self" in beforeMount should be different to "self" in afterMountSelf');
    t.end();
  }).catch((e) => {
    handleError(e, t);
  })
});

tape.test('Component.unmount() should revert the Component.mount() operation', (t) => {
  onClick.count = 0;
  function onClick() {
    onClick.count++;
  }
  let component = Component({
    tag() {
      return Tag('div', {onClick}, Tag('p', {}, 'Hello world'));
    }
  });
  function assertChild(HTMLElement) {
    let childNodes = HTMLElement.childNodes
    if(childNodes.length !== 1) {return false;}
    if(childNodes[0].tagName.toLowerCase() !== 'p') {return false;}
    if(childNodes[0].textContent !== 'Hello world') {return false;}
    return true;
  }
  let body = holder();
  let instance = component({});
  instance.mount(body).then(({parent, clean, remove}) => {
    let child = parent.querySelector('div');
    parent = instance.unmount();
    t.equal(parent, body, 'Component.unmount() should return the parent');
    t.assert(assertChild(child), 'Component.unmount() should not modify the severed child');
    t.assert(!parent.contains(child), 'Component.unmount() should remove the child from the parent');
    child.click();
    t.equal(onClick.count, 0, 'Component.unmount() should remove all event listeners');
    t.end();
  }).catch((e) => handleError(e, t));
})

tape.test('Component.unmount() should not interfere with other components', (t) => {
  let component = Component({
    tag(self) {
      return Tag('div', {}, self.props.content);
    }
  });
  function assertHTML(parent, withfoo = true, withbar = true) {
    if(parent.childNodes.length !== ((withfoo ? 1 : 0) + (withbar ? 1: 0))) {return false;}
    if(withfoo) {
      if(!isTag(nthChild(parent, 0), 'div')) {return false;}
      if(parent.childNodes[0].textContent !== 'foo') {return false;}
    }
    if(withbar) {
      let index = (withfoo ? 1 : 0);
      if(!isTag(nthChild(parent, index + 0), 'div')) {return false;}
      if(parent.childNodes[index + 0].textContent !== 'bar') {return false;}
    }
    return true;
  }
  let parent = holder();
  let foo = component({content:'foo'});
  let bar = component({content:'bar'});
  let p1 = foo.mount(parent).then((mount1) => {
    return bar.mount(parent).then((mount2) => {
      t.equal(mount1.parent, mount2.parent, 'Component should be mounted on the same element');
      t.assert(assertHTML(parent, true, true), 'Both component should be mounted on the parent');
      foo.unmount();
      t.assert(assertHTML(parent, false, true), 'Unmounting on component should not change the second');
      t.end();
    })
  }).catch((e) => handleError(e, t));
});

tape.test('Modifying the state should refresh the HTML', (t) => {
  let component = Component({
    init(self) {
      console.log('init');
      self.state({clicks:0});
    },
    tag(self) {
      console.log('tag')
      let clicks = self.state('clicks');
      return Tag('div', {onClick:() => {self.state({clicks:clicks+1});console.log('onClick')}}, self.state('clicks') + "");
    }
  });
  component({}).mount(holder()).then(({parent, clean, remove}) => {
    t.equal(parent.querySelector('div').textContent, '0', 'State should be initialized with the init value');
    let oldChild = parent.querySelector('div');
    oldChild.click();
    setTimeout(() => {
      t.equal(parent.querySelector('div').textContent, '1', 'State mutation should trigger refresh');
      t.notEqual(parent.querySelector('div'), oldChild, 'Refresh should re-render HTML');
      parent.querySelector('div').click();
      setTimeout(() => {
        t.equal(parent.querySelector('div').textContent, '2', 'State mutation should trigger refresh');
      })
      t.end();
    }, 500);
  }).catch((e) => handleError(e, t));
})

tape.test('State should not be shared between components', (t) => {
  let component1 = Component({
    init(self) {
      t.deepEqual(self.state(), {}, 'State should be initialized to empty object');
      self.state({foo:self.props.fooInit});
    },
    tag(self) {
      let state = self.state();
      t.deepEqual(Object.keys(state), ['foo'], 'State should only contains properties for this component')
      let foo = state.foo;
      return Tag('div', {onClick:()=>{self.state({foo:foo+1})}}, foo + "");
    }
  });
  let component2 = Component({
    init(self) {
      t.deepEqual(self.state(), {}, 'State should be initialized to empty object');
      self.state({bar:'foobar'});
    },
    tag(self) {
      let state = self.state();
      t.deepEqual(Object.keys(state), ['bar'], 'State should only contains properties for this component')
      return Tag('div', {}, state.bar);
    }
  });
  let p1 = component1({fooInit:1}).mount(holder());
  let p3 = component1({fooInit:2}).mount(holder());
  let p2 = component2({}).mount(holder());
  Promise.all([p1, p2, p3]).then(([mount1, mount2, mount3]) => {
    t.equal(mount1.parent.querySelector('div').textContent, '1', 'First instance should have its own state inizialized');
    t.equal(mount2.parent.querySelector('div').textContent, 'foobar', 'Other component should have its own state initialized');
    t.equal(mount3.parent.querySelector('div').textContent, '2', 'Second instance should have its own state initialized');
    mount1.parent.querySelector('div').click();
    setTimeout(() => {
      t.equal(mount1.parent.querySelector('div').textContent, '2', 'First instance should have its state updated');
      t.equal(mount2.parent.querySelector('div').textContent, 'foobar', 'Other component state should remain the same');
      t.equal(mount3.parent.querySelector('div').textContent, '2', 'Second instance state should remain the same');
      mount3.parent.querySelector('div').click();
      setTimeout(() => {
        t.equal(mount1.parent.querySelector('div').textContent, '2', 'First instance state should remain the same');
        t.equal(mount2.parent.querySelector('div').textContent, 'foobar', 'Other component state should remain the same');
        t.equal(mount3.parent.querySelector('div').textContent, '3', 'Second instance should have its state updated');
        t.end();
      }, 500)
    }, 500)
  }).catch((e) => handleError(e, t));
})

tape.test('References to state cant be kept', (t) => {
  let stateReference = undefined;
  let mutationReference = {mutation:false};
  let component = Component({
    init(self) {
      stateReference = self.state();
      stateReference.init = true;
      self.state(mutationReference);
      mutationReference.mutation = true;
    },
    tag(self) {
      t.equal(self.state().init, undefined, 'State cant be mutated through direct references')
      t.equal(self.state().mutation, false, 'State cant be mutated through set references')
      return Tag('div');
    }
  });
  component({}).mount(holder()).then(() => {
    t.end();
  }).catch((e) => handleError(e, t));
})

tape.test('Cached child component should not re-render on refresh', (t) => {
  let childRenderCount = 0;
  let childClickCount = 0;
  let child = Component({
    name:'child',
    tag(self) {
      childRenderCount++;
      return Tag('span', {class:self.props.class, onClick(event) {event.stopPropagation(); childClickCount++}}, self.props.content);
    }
  });
  let parent = Component({
    name:'parent',
    init(self) {
      self.state({clicks:0});
    },
    tag(self) {
      let clicks = self.state('clicks');
      return Tag('div', {onClick() {self.state({clicks:clicks+1})}},
        child({content:clicks + ' clicks', class:'not-cached'}),
        self.cache('child-0', () => child({content:clicks + ' clicks when cached', class:'cached'}))
      )
    }
  });
  parent({}).mount(holder()).then(({parent, clean, remove}) => {
    let cached = parent.querySelector('.cached');
    t.equal(cached.textContent, '0 clicks when cached', 'Cached child component should be rendered');
    t.equal(parent.querySelector('.not-cached').textContent, '0 clicks', 'Not cached child component should be rendered');
    t.equal(childRenderCount, 2, 'Child render() method should be called twice');
    parent.querySelector('div').click();
    setTimeout(() => {
      t.equal(cached, parent.querySelector('.cached'), 'HTML for cached child should be the same');
      cached.click();
      t.equal(childClickCount, 1, 'Event for cached child should still be bound');
      t.equal(parent.querySelector('.cached').textContent, '0 clicks when cached', 'Cached child should not update');
      t.equal(parent.querySelector('.not-cached').textContent, '1 clicks', 'Not cached child should update');
      t.equal(childRenderCount, 3, 'Child render() method should be called only once');
      t.end();
    }, 500);
  }).catch((e) => handleError(e, t));
})


tape.onFinish(function(){
  window.close();
});
