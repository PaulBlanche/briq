import tape from 'tape';
//import Element from './lib/DOM/Element.test.es6.js';
import Component from './lib/DOM/Component.test.es6.js';
//import Console from './lib/dev/csl.test.es6.js'

tape.onFinish(function(){
  console.log("##COVERAGE##");
  console.log(JSON.stringify(window.__coverage__));
  window.close();
});
