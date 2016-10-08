import tape from 'tape';
import Router from './Router.js';

var jsdom = require("jsdom").jsdom;
var document = jsdom(undefined, {});
var window = document.defaultView;

global.document = document;
global.window = window;

const teardown = () => {
  if(Router().destroy) {
    Router().destroy();
  }
  window.location.hash = '';
  console.log('teardown');
}

tape.test('Router is a singleton, always returning the same reference', (t) => {
  t.equal(Router(), Router(), 'Router should always return the same reference');
  t.end();
})

tape.test('Router.run start listening url change, Router.destroy stop', (t) => {
  let countFoo = 0;
  let countBar = 0;
  Router()
    .state('foo', 'path/to/foo', ()=>{countFoo++})
    .state('bar', 'path/to/bar', ()=>{countBar++})
  .run();
  Router().go('foo');
  setTimeout(() => {
    Router().destroy();
    Router().go('bar');
    setTimeout(() => {
      t.equal(countFoo, 1, 'Should have routed once to toto after run and before destroy')
      t.equal(countBar, 0, 'Should not have routed to tata after destroy')
      teardown();
      t.end();
    }, 1000);
  }, 1000);
})

tape.test('Router.state registers state with url', (t) => {
  let count = 0;
  Router()
    .state('foobar', 'articles/foobar', ()=>{count++})
    .run();
  t.equal(count, 0, 'state should not be triggered before routing to it')
  Router().go('foobar');
  setTimeout(() => {
    t.equal(count, 1, 'state should be triggered after routing to it')
    teardown();
    t.end();
  }, 1000);
})

tape.test('Router.state registers state with parametrized url', (t) => {
  let count = 0;
  Router()
    .state('comments', 'articles/{articleId}/comment/{commentId}', ({articleId, commentId})=>{
      t.equal(articleId, 123, 'url parameter should be passed to state action');
      t.equal(commentId, 42, 'url parameter should be passed to state action');
      count++
    })
    .run();
  Router().go('comments', {articleId:123, commentId:42});
  setTimeout(() => {
    t.equal(count, 1, 'state should be triggered after routing to it');
    teardown();
    t.end();
  }, 1000);
})

tape.test('Router.aliases registers aliases to states', (t) => {
  let count = 0;
  Router()
    .state('articleList', 'articles/{page}/{id}', ({page, id})=>{
      count++
      t.equal(page, 0, 'alias should map page parameter')
      t.equal(id, 2, 'alias should map id parameter');
    })
    .alias('articleList', 'articles/{id}', ({id}) => {return {page:0, id}})
    .run();
  Router().go('articles/2');
  setTimeout(() => {
    t.equal(count, 1, 'state should be triggered after routing to an alias');
    teardown();
    t.end();
  }, 1000);
})

tape.test('Router can be configured with a decorator run over each action', (t) => {
  let count = 0;
  let decorator= 0;
  Router({decorator(action){decorator++; return action();}})
    .state('state', 'path/to/state', ()=>{count++})
    .run();
  Router().go('state');
  setTimeout(() => {
    t.equal(decorator, 1, 'decorator should run');
    t.equal(count, 1, 'decorator should run the action');
    teardown();
    t.end();
  }, 1000);
})

tape.test('Router.run should try to route to current location', (t) => {
  let count = 0;
  window.location.hash='path/to/state';
  Router()
    .state('state', 'path/to/state', ()=>{console.log('kkukoo'); count++})
    .run();
  setTimeout(() => {
    t.equal(count, 1, 'state should be triggered after run if matching current location');
    teardown();
    t.end();
  }, 1000);
})

tape.onFinish(function(){
  window.close();
});
