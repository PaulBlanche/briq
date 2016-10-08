export function partial(fn, appliedArgs) {
  return (...args) => {
    return fn.apply({}, appliedArgs.concat(args));
  }
}

export function toKeyValue(object) {
  let arr = [];
  for(let key in object) {
    arr.push({key, value:object[key]});
  }
  return arr;
}

function type(value) {
  if(value === null) return 'Null';
  if(value === undefined) return 'Undefined';
  return Object.prototype.toString.call(value).slice(8, -1);
}

export function is(constructor, value) {
  if(value === null || value === undefined) return false;
  return value.constructor === constructor;
}

function cloneRegExp(pattern) {
  return new RegExp(pattern.source,
    (pattern.global ? 'g' : '') +
    (pattern.ignoreCase ? 'i' : '') +
    (pattern.multiline ? 'm' : '') +
    (pattern.sticky ? 'y' : '') +
    (pattern.unicode ? 'u' : ''));
}

export function clone(value, refFrom = [], refTo = [], deep = true) {
  switch(type(value)) {
    case 'RegExp' : return cloneRegExp(value);
    case 'Date' : return new Date(value.valueOf());
    case 'Array' : return copy([]);
    case 'Object' : return copy({});
    default : return value;
  }
  function copy(copied) {
    let len = refFrom.length;
    var idx = 0;
    while (idx < len) {
      if(value === refFrom[idx]) {
        return refTo[idx];
      }
      idx += 1;
    }
    refFrom[len] = value;
    refTo[len] = copied;
    for(let key in value) {
      copied[key] = deep ? clone(value[key], refFrom, refTo, true) : value[key];
    }
    return copied;
  }
}

export function memoize(fn) {
  let cached = undefined;
  let hasrun = false;
  return (...args) => {
    if(hasrun) return cached;
    hasrun = true;
    cached = fn(...args);
    return cached;
  }
}

export function append(value, array) {
  array.push(value);
  return array;
}

export function unnest(array) {
  return array.reduce((flat, item) => {
    if(is(Array, item)) {
      item.forEach((nested) => {
        flat.push(nested);
      })
    } else {
      flat.push(item);
    }
    return flat;
  }, []);
}

export function values(object) {
  return Object.keys(object).reduce((values, key) => {
    values.push(object[key]);
    return values;
  }, []);
}

export function head(array) {
  return array[0];
}

export function merge(obj1, obj2) {
  let obj = clone(obj1);
  obj2 = clone(obj2);
  for(let key in obj2) {
    obj[key] = obj2[key];
  }
  return obj;
}

export default {
  unnest,
  values,
  head,
  append,
  clone,
  is,
  toKeyValue,
  partial,
  memoize,
  merge
}
