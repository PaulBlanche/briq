import r from '../lambda.js';
import Matcher from './Matcher.js';

const defaultConfig = {
  decorator(action) {
    return action();
  },
  middlewares:[],
}

let instance = undefined;
export default function Router(config) {
  if (instance !== undefined) {
    return instance;
  }
  if(!(this instanceof Router)) {
    return new Router(config);
  }
  instance = this;
  config = r.merge(defaultConfig, config);

  let states = {};
  let aliases = [];
  this.run = () => {
    let stop = run(states, aliases, config.decorator);
    this.destroy = () => {
      stop();
      aliases = {};
      states = {};
      instance = undefined;
    }
  }
  this.state = (name, matcher, action) => {
    states = state(states, name, matcher, action);
    return this;
  }
  this.alias = (name, matcher, mapper) => {
    aliases = alias(aliases, name, matcher, mapper);
    return this;
  }
  this.go = r.partial(go, [states]);
}

function state(states, name, matcher, action) {
  states[name] = {name, matcher:Matcher(matcher), action};
  return states;
}

function alias(aliases, name, matcher, mapper) {
  aliases.push({name, matcher:Matcher(matcher), mapper});
  return aliases;
}

function go(states, name, parameters) {
  if(!states[name]) {
    window.location.hash = name;
  } else {
    window.location.hash = states[name].matcher.produce(parameters);
  }
}

function current() {
  return window.location.hash.slice(1);
}

function selectRoute(states, aliases, path) {
  path = path || current();

  let matchPathIn = r.partial(matchIn, [path]);
  let state = matchPathIn(r.values(states));
  let match = state ? state.matcher.match(path) : {};
  if(state === undefined) {
    let alias = matchPathIn(aliases);
    if(alias !== undefined) {
      state = states[alias.name];
      match = alias.mapper(alias.matcher.match(path));
    }
  }

  return state ? r.partial(state.action, [match]) : () => {};
}

function matchIn(path, array) {
  return r.head(array.filter((item) => {
    return item.matcher.match(path).match !== undefined;
  }));
}

let toto = 0;
function routeChangeListener(states, aliases, decorator, event) {
  console.log('routeChangeListener', toto)
  let action = selectRoute(states, aliases);
  decorator(action);
}

function run(states, aliases, decorator) {
  toto++;
  let listener = r.partial(routeChangeListener, [states, aliases, decorator]);
  window.addEventListener('hashchange', listener);
  console.log('listening ...')
  return () => {
    window.removeEventListener('hashchange', listener);
    console.log('listener removed ...')
  }
}
