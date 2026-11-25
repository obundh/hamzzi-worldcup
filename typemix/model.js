(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TypeMix = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 1;
  const FIELDS = Object.freeze([
    { key: 'gender', label: 'Gender', ko: '성별' },
    { key: 'age', label: 'Age', ko: '나이' },
    { key: 'height', label: 'Height', ko: '키' },
    { key: 'weight', label: 'Weight', ko: '몸무게' },
    { key: 'job', label: 'Job', ko: '직업' },
    { key: 'nationality', label: 'Nationality', ko: '국적' }
  ].map(Object.freeze));
  const keys = FIELDS.map(function (field) { return field.key; });
  const numeric = Object.freeze({
    age: Object.freeze([16, 90]),
    height: Object.freeze([100, 230]),
    weight: Object.freeze([35, 300])
  });
  const catalogs = Object.create(null);
  function catalog(entries) {
    const table = Object.create(null);
    entries.forEach(function (entry) {
      table[entry[0]] = Object.freeze({ label: entry[1], ko: entry[2] });
    });
    return Object.freeze(table);
  }
  catalogs.gender = catalog([
    ['male', 'Male', '남성'], ['female', 'Female', '여성']
  ]);
  catalogs.job = catalog([
    ['doctor', 'Doctor', '의사'], ['teacher', 'Teacher', '교사'],
    ['engineer', 'Engineer', '엔지니어'], ['artist', 'Artist', '미술가'],
    ['chef', 'Chef', '요리사'], ['athlete', 'Athlete', '운동선수'],
    ['photographer', 'Photographer', '사진작가'], ['firefighter', 'Firefighter', '소방관'],
    ['pilot', 'Pilot', '조종사'], ['astronaut', 'Astronaut', '우주비행사'],
    ['gamer', 'Pro Gamer', '프로게이머'], ['detective', 'Detective', '탐정'],
    ['baker', 'Baker', '제빵사'], ['musician', 'Musician', '음악가'],
    ['lawyer', 'Lawyer', '변호사'], ['rockstar', 'Rock Star', '록 스타'],
    ['student', 'Student', '학생'], ['writer', 'Writer', '작가'],
    ['actor', 'Actor', '배우'], ['unemployed', 'Unemployed', '무직']
  ]);
  catalogs.nationality = catalog([
    ['korean', 'Korean', '대한민국'], ['japanese', 'Japanese', '일본'],
    ['chinese', 'Chinese', '중국'], ['american', 'American', '미국'],
    ['canadian', 'Canadian', '캐나다'], ['british', 'British', '영국'],
    ['french', 'French', '프랑스'], ['german', 'German', '독일'],
    ['italian', 'Italian', '이탈리아'], ['spanish', 'Spanish', '스페인'],
    ['brazilian', 'Brazilian', '브라질'], ['mexican', 'Mexican', '멕시코'],
    ['australian', 'Australian', '호주'], ['indian', 'Indian', '인도'],
    ['thai', 'Thai', '태국'], ['vietnamese', 'Vietnamese', '베트남'],
    ['filipino', 'Filipino', '필리핀'], ['egyptian', 'Egyptian', '이집트'],
    ['kenyan', 'Kenyan', '케냐'], ['swedish', 'Swedish', '스웨덴']
  ]);
  Object.freeze(catalogs);
  const has = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };

  function isRecord(value) {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function dataKeys(value) {
    if (!isRecord(value)) return null;
    const own = Reflect.ownKeys(value);
    if (own.some(function (key) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return typeof key !== 'string' || !descriptor || !has(descriptor, 'value');
    })) return null;
    return own;
  }
  function validValue(key, value) {
    if (has(numeric, key)) {
      const range = numeric[key];
      return Number.isInteger(value) && value >= range[0] && value <= range[1];
    }
    return has(catalogs, key) && typeof value === 'string' && has(catalogs[key], value);
  }
  function validatePartial(profile) {
    const own = dataKeys(profile);
    if (!own || own.length > keys.length) return false;
    // An interrupted run may have the first N fields, never a hole or extra field.
    return keys.every(function (key, index) {
      return index < own.length ? has(profile, key) && validValue(key, profile[key]) : !has(profile, key);
    }) && own.every(function (key) { return keys.indexOf(key) !== -1; });
  }
  function validate(profile) {
    return validatePartial(profile) && Reflect.ownKeys(profile).length === keys.length;
  }
  function draw(key, rng) {
    if (keys.indexOf(key) === -1) throw new RangeError('알 수 없는 항목입니다.');
    if (rng === undefined) rng = Math.random;
    if (typeof rng !== 'function') throw new TypeError('난수 함수가 필요합니다.');
    const roll = rng();
    if (typeof roll !== 'number' || !Number.isFinite(roll) || roll < 0 || roll >= 1) {
      throw new RangeError('난수는 0 이상 1 미만이어야 합니다.');
    }
    if (has(numeric, key)) {
      const range = numeric[key];
      return range[0] + Math.floor(roll * (range[1] - range[0] + 1));
    }
    const values = Object.keys(catalogs[key]);
    return values[Math.floor(roll * values.length)];
  }
  function generate(rng) {
    const profile = {};
    keys.forEach(function (key) { profile[key] = draw(key, rng); });
    return profile;
  }
  function requireValue(key, value) {
    if (keys.indexOf(key) === -1 || !validValue(key, value)) throw new TypeError('올바르지 않은 결과입니다.');
  }
  function display(key, value) {
    requireValue(key, value);
    if (key === 'age') return String(value);
    if (key === 'height') return value + 'cm';
    if (key === 'weight') return value + 'kg';
    return catalogs[key][value].label;
  }
  function describe(key, value) {
    requireValue(key, value);
    if (key === 'age') return value + '세';
    if (key === 'height') return value + 'cm';
    if (key === 'weight') return value + 'kg';
    return catalogs[key][value].ko;
  }
  function buildPrompt(profile) {
    if (!validate(profile)) throw new TypeError('여섯 항목을 모두 뽑은 뒤 프롬프트를 만들 수 있습니다.');
    const facts = FIELDS.map(function (field) {
      return field.ko + ': ' + describe(field.key, profile[field.key]) +
        (has(catalogs, field.key) ? ' (' + display(field.key, profile[field.key]) + ')' : '');
    }).join('\n');
    const ageDirection = profile.age < 18
      ? '미성년 인물이므로 나이에 맞는 일상복을 완전히 갖춰 입은 비성적 캐릭터로 표현해 줘. 직업은 상상 속 캐릭터 설정으로 다루고, 성인처럼 나이를 바꾸지 마.'
      : '해당 나이에 어울리는 일상복을 완전히 갖춰 입은 인물로 표현해 줘.';
    return '아래 랜덤 프로필을 바탕으로 가상의 인물 한 명을 생성형 이미지로 만들어 줘.\n\n' +
      facts + '\n\n' +
      '위의 성별, 나이, 키, 몸무게, 직업, 국적을 임의로 변경하지 말고 캐릭터 설정에 모두 반영해 줘. ' +
      '사진처럼 섬세한 질감과 자연스러운 조명으로, 머리부터 발끝까지 보이는 세로 9:16 전신 구도로 그려 줘. ' +
      '키와 몸무게의 조합이 현실적으로 과장되어 있다면 수치를 설정으로 유지하면서 스타일화한 체형으로 표현해 줘. ' +
      ageDirection + ' 직업은 적절한 소품이나 배경으로 은근히 보여 줘. ' +
      '국적만으로 인종이나 외모를 단정하지 말아 줘. 실제 유명인과 닮게 만들지 말고, 글자·숫자·표·워터마크 없이 인물 이미지 한 장으로 만들어 줘.';
  }
  function restore(saved) {
    const own = dataKeys(saved);
    if (!own || own.length !== 2 || !has(saved, 'version') || !has(saved, 'profile') ||
        saved.version !== VERSION || !validatePartial(saved.profile)) {
      throw new TypeError('저장된 뽑기 기록을 읽을 수 없습니다.');
    }
    const profile = {};
    keys.forEach(function (key) { if (has(saved.profile, key)) profile[key] = saved.profile[key]; });
    return { version: VERSION, profile: profile };
  }

  return Object.freeze({ VERSION: VERSION, FIELDS: FIELDS, draw: draw, generate: generate,
    display: display, describe: describe, validate: validate, validatePartial: validatePartial,
    buildPrompt: buildPrompt, restore: restore });
});
