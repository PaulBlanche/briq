import r from 'ramda';
import Text from './Text.js';
import * as DOM from './DOM.js';

export default function Factory(blueprint) {
  return r.partial(Component, [blueprint]);
}

function Component(blueprint, props) {
  if(!(this instanceof Component)) {
    return new Component(blueprint, props);
  }

  let component = this;

  let self = selfClosure(props, refresh);
  let mrender = r.memoize(r.partial(trueRender, [blueprint, self]));
  ////////////////////////////
  //FIXME : refresh should replace the component, not remount it;
  ///////////////////////////
  function refresh () {
    console.log('refresh');
    let parent = undefined;
    try {
      parent = component.unmount();
    } catch (e) {
      throw Error('Error during refresh, while unmounting component : refresh is probably called before full mount/refresh');
    }
    if(parent === undefined) {
      throw Error('refresh called before full mount');
    }
    mrender = r.memoize(r.partial(trueRender, [blueprint, self]));
    return component.mount(parent, false, r.partial(trueRender, [blueprint, self]));
  }

  let nextSibling = undefined,
  this.mount = (parent, cached = false, render = mrender) => {
    return mount(blueprint, self, render, parent).then(({parent, clean, remove, childs}) => {
      nextSibling = childs[childs.length-1].nextSibling;
      this.unmount = () => {
        return unmount(clean, remove, blueprint.name, parent);
      }
      return {parent, clean:cached ? () => {} : clean, remove, childs};
    })
  };
  this.unmount = () => {};
  this.toString = r.partial(toString, [blueprint.name]);

  if(blueprint.init) {
    blueprint.init(r.clone(self(false)));
  }
}

function unmount(clean, remove, name, parent) {
  console.log('Unmounting %s from %s', toString(name), DOM.toString(parent));
  clean()
  return remove();
}

function selfClosure(props, refresh) {
  let _state = {};
  let _cache = {};
  return (mutable = true) => {
    return {
      props,
      state(newState) {
        let cloneState = r.clone(_state);
        if(newState === undefined) {
          return cloneState;
        }
        if(r.is(String, newState)) {
          return cloneState[newState];
        }
        _state = r.clone(newState);
        return mutable ? refresh().then(() => cloneState).catch((e) => { console.log(e);}) : Promise.resolve(cloneState);
      },
      cache(id, factory) {
        if(_cache[id] === undefined) {
          let instance = factory();
          let _mount = instance.mount.bind(instance);
          instance.mount = (parent) => {
            return _mount(parent, true);
          }
          _cache[id] = {instance, mount:_mount};
        }
        console.log(_cache[id].intance);
        return _cache[id].instance;
      }
    };
  };
}

function state(state, mutator) {
  return (newState) => {
    if(newState === undefined) {
      return state;
    }
    return Promise.resolve(mutator(state, newState));
  }
}

function trueRender(blueprint, self) {
  let elements = blueprint.render(r.clone(self()));
  if(!r.is(Array, elements)) {
    elements = [elements];
  }
  return elements;
}

function mount(blueprint, self, render, parent) {
  console.log('Mounting %s to %s', toString(blueprint.name), DOM.toString(parent));
  return Promise.resolve(beforeMount(blueprint, self)).then(() => {
    return render().reduce((promise, element) => {
      return promise.then(({parent, cleans, removes, themChilds}) => {
        return mountChild(element, parent).then(({parent, clean, remove, childs}) => {
          return {parent, cleans:r.append(clean, cleans), removes:r.append(remove, removes), themChilds:themChilds.concat(childs)};
        })
      })
    }, Promise.resolve({parent, cleans:[], removes:[], themChilds:[]})).then(({parent, cleans, removes, themChilds}) => {
      return Promise.resolve(afterMount(blueprint, self)).then(() => {
        return {parent, clean:r.partial(callAll, [cleans]), remove:() => {callAll(removes); return parent}, childs:themChilds};
      });
    });
  });
}

function beforeMount(blueprint, self) {
  if(blueprint.beforeMount) {
    return blueprint.beforeMount(r.clone(self(false)));
  }
}

function afterMount(blueprint, self) {
  if(blueprint.afterMount) {
    return blueprint.afterMount(r.clone(self()));
  }
}

function callAll(fns) {
  fns.forEach((fn) => {
    fn();
  })
}

function mountChild(child, parent) {
  if(!child.mount) {
    child = Text(child.toString());
  }
  return child.mount(parent)
}

function toString(name) {
  return '{Component:'+name+'}';
}
