import tape from 'tape';
import Matcher from './Matcher.js';

tape.test('Matcher should match urls', (t) => {
  let matcher = Matcher('path/to/file');
  t.deepEqual(matcher.match('path/to/file'), {match:'path/to/file'}, 'Matcher should match identical url');
  t.deepEqual(matcher.match('path/to/other/file'), {}, 'Matcher should not match identical url');
  t.deepEqual(matcher.match('path/to/file/elsewhere'), {}, 'Matcher should not match identical url');
  t.end();
});

tape.test('Matcher should match with named capture', (t) => {
  let matcher = Matcher('path/{id}/{foo}file');
  t.deepEqual(matcher.match('path/123/foofile'), {match:'path/123/foofile', id:123, foo:'foo'}, 'Matcher should match with named capture');
  t.deepEqual(matcher.match('path/foofile'), {}, 'Matcher should match with named capture');
  t.deepEqual(matcher.match('path//foofile'), {match:'path//foofile', id:'', foo:'foo'}, 'Captures are optionals, (.*) is used to match');
  matcher = Matcher('path/{id}-{name}/{foo}file');
  t.deepEqual(matcher.match('path/123-toto/foofile'), {match:'path/123-toto/foofile', id:123, foo:'foo', name:'toto'}, 'Matcher can match multiple capture in each fragments');
  t.end();
})

tape.test('Matcher should match with named capture and specific regexp', (t) => {
  let matcher = Matcher('path/{id:[0-9]+}/{name:[a-zA-Z0-9_]+}file');
  t.deepEqual(matcher.match('path/123/totofile'), {match:'path/123/totofile', id:123, name:'toto'}, 'Matcher should match with regexp named capture')
  t.deepEqual(matcher.match('path//totofile'), {}, 'Matcher should not match with regexp named capture')
  t.deepEqual(matcher.match('path/id/totofile'), {}, 'Matcher should match with regexp named capture')
  t.end();
})

tape.test('Matcher should propose predefined regexp', (t) => {
  let matcher = Matcher('path/{id:number}/{name:identifier}file');
  t.deepEqual(matcher.match('path/123/totofile'), {match:'path/123/totofile', id:123, name:'toto'}, 'Matcher should match with regexp named capture')
  t.deepEqual(matcher.match('path//totofile'), {}, 'Matcher should not match with regexp named capture')
  t.deepEqual(matcher.match('path/id/totofile'), {}, 'Matcher should match with regexp named capture')
  t.end();
})

tape.test('Matcher can allow definition of custom regexp', (t) => {
  Matcher.define('customId', '[0-9][a-z]{2}');
  let matcher = Matcher('path/{id:customId}');
  t.deepEqual(matcher.match('path/0ab'), {match:'path/0ab', id:'0ab'}, 'Matcher should match with custom regexp named capture')
  t.deepEqual(matcher.match('path/abc'), {}, 'Matcher should not match with regexp named capture')
  t.end();
})

tape.test('Matcher should produce url with given parameters', (t) => {
  let matcher = Matcher('path/{id:number}/{name:identifier}file');
  t.deepEqual(matcher.produce({id:123, name:'foo'}), 'path/123/foofile', 'Matcher should produce the correct url');
  t.deepEqual(matcher.produce({id:123}), 'path/123/file', 'Matcher should produce the correct url with missing parameter');
  t.end();
})
