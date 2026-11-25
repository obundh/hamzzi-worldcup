'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../model.js');
let checks = 0;
function check(name, fn) {
  fn(); checks += 1; console.log('PASS ' + name);
}
const lower = { gender: 'male', age: 16, height: 100, weight: 35, job: 'doctor', nationality: 'korean' };
const upper = { gender: 'female', age: 90, height: 230, weight: 300, job: 'unemployed', nationality: 'swedish' };

check('source-confirmed six-field order and immutable API', () => {
  assert.deepEqual(M.FIELDS.map(f => f.label), ['Gender', 'Age', 'Height', 'Weight', 'Job', 'Nationality']);
  assert.equal(M.VERSION, 1);
  assert(Object.isFrozen(M)); assert(Object.isFrozen(M.FIELDS));
  assert(M.FIELDS.every(Object.isFrozen));
});
check('inclusive integer boundaries, independent surprising profiles', () => {
  assert.deepEqual(M.generate(() => 0), lower);
  assert.deepEqual(M.generate(() => 1 - Number.EPSILON), upper);
  assert(M.validate(lower)); assert(M.validate(upper));
  assert(M.validate({ ...lower, height: 222, weight: 260, age: 82 }));
  assert.equal(M.display('height', 222), '222cm');
  assert.equal(M.display('weight', 260), '260kg');
  assert.equal(M.display('age', 23), '23');
});
check('every numeric result reachable uniformly at its interval midpoint', () => {
  for (const [key, min, max] of [['age',16,90], ['height',100,230], ['weight',35,300]]) {
    for (let value = min; value <= max; value++) {
      assert.equal(M.draw(key, () => (value - min + .5) / (max - min + 1)), value);
    }
  }
});
check('at least sixteen jobs and nationalities; catalog labels and Korean descriptions', () => {
  for (const key of ['job', 'nationality']) {
    const values = new Set();
    for (let i = 0; i < 10000; i++) values.add(M.draw(key, () => i / 10000));
    assert(values.size >= 16);
    for (const value of values) {
      assert.match(M.display(key, value), /^[A-Za-z ]+$/);
      assert.match(M.describe(key, value), /[가-힣]/);
      assert(M.validate({ ...lower, [key]: value }));
    }
  }
});
check('all ordered prefixes restore; gaps and extra fields reject', () => {
  const keys = M.FIELDS.map(f => f.key);
  for (let n = 0; n <= keys.length; n++) {
    const prefix = Object.fromEntries(keys.slice(0, n).map(key => [key, upper[key]]));
    assert(M.validatePartial(prefix));
    assert.equal(M.validate(prefix), n === keys.length);
    const restored = M.restore({ version: 1, profile: prefix });
    assert.deepEqual(restored.profile, prefix);
    assert.notEqual(restored.profile, prefix);
  }
  assert(!M.validatePartial({ age: 23 }));
  assert(!M.validatePartial({ gender: 'male', height: 222 }));
  assert(!M.validatePartial({ ...lower, hair: 'brown' }));
  assert(!M.validatePartial({ ...lower, x: undefined }));
});
check('invalid numbers and unknown strings reject without coercion', () => {
  for (const [key, values] of Object.entries({
    gender: ['Male', 'any', '', 0], age: [15,91,23.5,'23',NaN,Infinity],
    height: [99,231,null], weight: [34,301,'260'], job: ['toString','__proto__','constructor'],
    nationality: ['prototype','toString','__proto__',{}]
  })) for (const value of values) assert(!M.validate({ ...lower, [key]: value }));
  for (const value of [null, undefined, [], 0, '', new Date()]) assert(!M.validatePartial(value));
});
check('prototype pollution, accessors, symbols, and unexpected save keys reject', () => {
  const poisoned = JSON.parse('{"gender":"male","__proto__":{"age":23}}');
  assert(!M.validatePartial(poisoned));
  assert(!M.validatePartial(Object.create(lower)));
  const getter = {}; Object.defineProperty(getter, 'gender', { get() { throw Error('must not execute'); } });
  assert(!M.validatePartial(getter));
  const symbol = { ...lower }; symbol[Symbol('extra')] = 1;
  assert(!M.validate(symbol));
  for (const saved of [null, [], {}, { version: 2, profile: lower },
    { version: '1', profile: lower }, { version: 1, profile: lower, extra: true },
    { version: 1, profile: { age: 23 } }, Object.create({ version: 1, profile: lower })]) {
    assert.throws(() => M.restore(saved), TypeError);
  }
  const nullPrototype = Object.assign(Object.create(null), lower);
  assert(M.validate(nullPrototype));
  assert.deepEqual(M.restore({ version: 1, profile: nullPrototype }).profile, lower);
});
check('prompt faithfully contains every field and source-like extremes', () => {
  const profile = { gender: 'female', age: 82, height: 222, weight: 260, job: 'rockstar', nationality: 'brazilian' };
  const prompt = M.buildPrompt(profile);
  for (const field of M.FIELDS) assert(prompt.includes(field.ko + ': ' + M.describe(field.key, profile[field.key])));
  assert(prompt.includes('82세')); assert(prompt.includes('222cm')); assert(prompt.includes('260kg'));
  assert(prompt.includes('Rock Star')); assert(prompt.includes('Brazilian'));
  assert(prompt.includes('9:16')); assert(prompt.includes('머리부터 발끝'));
  assert(prompt.includes('글자·숫자·표·워터마크 없이'));
  assert.throws(() => M.buildPrompt({ gender: 'female' }), TypeError);
});
check('minor prompt preserves values with age-appropriate nonsexual fictional framing', () => {
  const prompt = M.buildPrompt(lower);
  assert(prompt.includes('16세')); assert(prompt.includes('100cm')); assert(prompt.includes('35kg'));
  assert(prompt.includes('미성년')); assert(prompt.includes('비성적'));
  assert(prompt.includes('상상 속 캐릭터 설정')); assert(!prompt.includes('이상형'));
});
check('bad RNG and unknown field cannot manufacture undefined results', () => {
  for (const roll of [-1,1,NaN,Infinity,'0',null]) assert.throws(() => M.draw('age', () => roll), RangeError);
  assert.throws(() => M.draw('age', 0), TypeError);
  for (const key of ['toString','__proto__','hair',null]) assert.throws(() => M.draw(key), RangeError);
});
check('ten thousand generated profiles, display, and prompt remain valid', () => {
  for (let i = 0; i < 10000; i++) {
    const profile = M.generate();
    assert(M.validate(profile));
    for (const field of M.FIELDS) assert.equal(typeof M.display(field.key, profile[field.key]), 'string');
    assert(M.buildPrompt(profile).includes(profile.weight + 'kg'));
  }
});
check('classic browser script exposes TypeMix without CommonJS', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../model.js'), 'utf8'), sandbox);
  assert.equal(sandbox.TypeMix.VERSION, 1);
  assert.equal(sandbox.TypeMix.FIELDS.map(f => f.key).join(','), 'gender,age,height,weight,job,nationality');
  assert.equal(sandbox.TypeMix.generate(() => 0).age, 16);
});
console.log('\n' + checks + ' model checks passed.');
