import r from '../lambda';
import * as DOM from './DOM.js';
import Text from './Text.js';

/*
Component ::
  render :: Promise {[HTMLElement], Function}
  mount :: HTMLElement -> Function -> Promise {HTMLElement, Function, Function}
  replace :: HTMLElement -> Function -> Promise {HTMLElement, Function, Function}
*/
function safeCall(fn, args) {
  if(fn) {
    return fn.apply({}, args);
  }
}

function render(blueprint, self) {
  console.log('render ...', blueprint);
  return Promise.resolve(safeCall(blueprint.beforeRender, [r.clone(self())])).then(() => {
    return blueprint.tag(r.clone(self())).render();
  }).then((result) => {
    console.log('after render');
    safeCall(blueprint.afterRender, [r.clone(self())]);
    return result;
  })
}

function mount(renderComponent, root) {
  console.log('mount ...');
  return renderComponent().then(({HTMLElement, clean}) => {
    console.log('append after render');
    let {parent, removeChild} = DOM.appendChild(root, HTMLElement);
    return {parent, child:HTMLElement, clean, remove:removeChild};
  });
}

function replace(renderComponent, element) {
  console.log('refresh ...');
  return renderComponent().then(({HTMLElement, clean}) => {
    console.log('replace after render')
    let {parent, removeChild} = DOM.replaceChild(element.parentNode, HTMLElement, element);
    return {parent, child:HTMLElement, clean, remove:removeChild};
  })
}

function unmount(clean, remove) {
  console.log('unmount');
  clean();
  return remove();
}

export default function Component(blueprint) {
  return r.partial(enrich, [blueprint]);
}

function enrich(blueprint, props) {
  let _onMutate = () => {};
  function getOnMutate() {return _onMutate};
  function setOnMutate(onMutate) {_onMutate = onMutate}
  let self = Self(props, getOnMutate); // Magic function
  let _renderComponent = r.memoize(renderComponent);

  safeCall(blueprint.init, [r.clone(self()), ]);

  let component = {
    mount(parent) {
      return mount(_renderComponent, parent).then(({parent, clean, remove}) => {
        component.unmount = r.partial(unmount, [clean, remove]);
        return {parent, clean, remove};
      });
    },
    unmount() {}
  }
  return component;

  function renderComponent() {
    return render(blueprint, self).then(({HTMLElement, clean}) => {
      console.log('after render, set refresh');
      setOnMutate(() => {
        console.time('refresh')
        return replace(renderComponent, HTMLElement).then(({parent, clean, remove}) => {
          console.log('after refresh, update unmount');
          component.unmount = r.partial(unmount, [clean, remove]);
          console.timeEnd('refresh');
          return {parent, clean, remove};
        })
      });
      return {HTMLElement, clean};
    })
  }

}

function Self(props, getOnMutate) {
  let _state = {};
  function getState() {return r.clone(_state)};
  function setState(newState) { _state = r.clone(newState)};
  let _cache = {};
  function getInCache(id) {return _cache[id]};
  function setInCache(id, data){_cache[id] = data}
  return () => {
    return {
      props:props,
      state:state(setState, getState, getOnMutate),
      cache:cache(setInCache, getInCache)
    };
  };
}

function cache(set, get) {
  return (id, factory) => {
    if(get(id) === undefined) {
      let instance = factory();
      let mount = instance.mount.bind(instance);
      instance.mount = (parent) => {
        return mount(parent).then(({parent, clean, remove})=>{
          return {parent, clean:()=>{}, remove}
        })
      }
      set(id, {instance, mount});
    } else {
      console.log('from cache');
    }
    return get(id).instance;
  }
}

function state(set, get, getOnMutate) {
  return (newState) => {
    let state = get();
    if(newState === undefined) {
      return state;
    }
    if(r.is(String, newState)) {
      return state[newState];
    }
    set(newState);
    return Promise.resolve(safeCall(getOnMutate())).then(() => {
      return newState;
    });
  }
}


Component({
  tag(self) {
    return Tag('div', {},
      Tag('span', {},
        self.props.content
      )
    );
  }
})({content:'Hello world'})
