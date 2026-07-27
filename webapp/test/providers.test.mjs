/**
 * 제공자 어댑터 테스트
 *
 * 실행: node webapp/test/providers.test.mjs   (저장소 루트에서)
 *
 * 네트워크를 타지 않는다. 실제 키가 없기도 하고, 여기서 봐야 하는 것은
 * 제공자가 뭘 돌려주느냐가 아니라 우리가 뭘 보내고 응답을 어떻게 분류하느냐다.
 * globalThis.fetch 를 가짜로 갈아끼우고 요청을 그대로 들여다본다.
 *
 * 가장 중요한 검사는 헤더다. 세 제공자에 같은 헤더 뭉치를 보내면 Google 만
 * 프리플라이트에서 403 으로 조용히 깨진다. 그건 실행 중에는 CORS 오류로만
 * 보여서 원인을 찾기 어렵다.
 */

import {
  PROVIDERS,
  RECOMMENDED,
  validateKeyFormat,
  listModels,
  createStructured,
  estimateCost,
} from '../providers.js';

let failures = 0;
let checks = 0;
function ok(cond, label, extra = '') {
  checks++;
  if (!cond) {
    console.log(`FAIL  ${label}${extra ? '  :: ' + extra : ''}`);
    failures++;
  }
  return cond;
}
function section(t) {
  console.log(`\n--- ${t} ---`);
}
/** 본문은 JSON 을 거쳐 오므로 참조가 아니라 값으로 본다. */
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const KEYS = {
  anthropic: 'sk-ant-api03-testkey',
  openai: 'sk-proj-testkey',
  google: 'AIzaTestKey',
};

/** 가짜 응답 하나. providers.js 는 ok/status/text() 만 쓴다. */
function res(status, body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  return { ok: status >= 200 && status < 300, status, text: async () => text };
}

/**
 * fetch 를 갈아끼우고 호출 기록을 돌려준다.
 * responder 가 Error 를 돌려주면 fetch 자체가 throw 한 것으로 흉내 낸다.
 */
function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const headers = {};
    for (const [k, v] of Object.entries(init.headers || {})) headers[k.toLowerCase()] = v;
    const call = {
      url: String(url),
      method: init.method || 'GET',
      headers,
      body: init.body ? JSON.parse(init.body) : null,
    };
    calls.push(call);
    const r = await responder(call);
    if (r instanceof Error) throw r;
    return r;
  };
  return calls;
}

/** 4안 스키마와 같은 모양. 중첩된 additionalProperties 가 들어 있다. */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'color'],
        properties: {
          name: { type: 'string' },
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        },
      },
    },
  },
};

const ARGS = {
  system: '너는 스킨 설계자다',
  messages: [{ role: 'user', content: '4안을 내라' }],
  schema: SCHEMA,
};

/** 정상 응답 본문. 세 제공자의 모양이 전부 다르다. */
const PAYLOAD = { items: [{ name: '가', color: '#112233' }] };
const OKBODY = {
  anthropic: {
    content: [
      { type: 'thinking', thinking: '고민' },
      { type: 'text', text: JSON.stringify(PAYLOAD) },
    ],
    usage: { input_tokens: 1200, output_tokens: 340 },
  },
  openai: {
    choices: [{ message: { content: JSON.stringify(PAYLOAD) } }],
    usage: { prompt_tokens: 1200, completion_tokens: 340 },
  },
  google: {
    candidates: [{ content: { parts: [{ text: JSON.stringify(PAYLOAD) }] } }],
    usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 340 },
  },
};

const MODEL = { anthropic: 'claude-opus-5', openai: 'gpt-x', google: 'gemini-x' };

/* ------------------------------------------------------------------ */

section('키 형식');

ok(validateKeyFormat('anthropic', KEYS.anthropic) === null, 'Anthropic 올바른 접두사는 통과');
ok(validateKeyFormat('openai', KEYS.openai) === null, 'OpenAI 올바른 접두사는 통과');
ok(validateKeyFormat('google', KEYS.google) === null, 'Google 올바른 접두사는 통과');

ok(validateKeyFormat('anthropic', KEYS.openai) !== null, 'Anthropic 에 OpenAI 키를 넣으면 잡는다');
ok(validateKeyFormat('anthropic', KEYS.google) !== null, 'Anthropic 에 Google 키를 넣으면 잡는다');
ok(validateKeyFormat('openai', KEYS.google) !== null, 'OpenAI 에 Google 키를 넣으면 잡는다');
ok(
  validateKeyFormat('openai', KEYS.anthropic) !== null,
  'OpenAI 에 Anthropic 키를 넣으면 잡는다 (둘 다 sk- 로 시작한다)',
);
ok(validateKeyFormat('google', KEYS.anthropic) !== null, 'Google 에 Anthropic 키를 넣으면 잡는다');
ok(validateKeyFormat('google', KEYS.openai) !== null, 'Google 에 OpenAI 키를 넣으면 잡는다');

ok(validateKeyFormat('anthropic', '') !== null, '빈 키를 잡는다');
ok(validateKeyFormat('anthropic', '   ') !== null, '공백만 있는 키를 잡는다');
ok(validateKeyFormat('nope', 'sk-ant-x') !== null, '모르는 제공자를 잡는다');

// 형식이 틀리면 네트워크를 타지 않아야 한다. 비용과 대기 시간이 걸린 부분이다.
{
  const calls = stubFetch(() => res(200, {}));
  const r = await listModels('anthropic', 'AIzaWrong');
  ok(r.ok === false && r.error.kind === 'format', '형식 오류는 kind=format', JSON.stringify(r.error));
  ok(calls.length === 0, '형식 오류면 fetch 를 부르지 않는다');
}

/* ------------------------------------------------------------------ */

section('헤더 — 제공자별로 정확히 갈려 나가는가');

for (const id of ['anthropic', 'openai', 'google']) {
  const calls = stubFetch(() => res(200, OKBODY[id]));
  await createStructured(id, KEYS[id], { ...ARGS, model: MODEL[id] });
  const h = calls[0].headers;

  if (id === 'anthropic') {
    ok(h['x-api-key'] === KEYS.anthropic, 'Anthropic 은 x-api-key 로 보낸다');
    ok(h['anthropic-version'] === '2023-06-01', 'Anthropic 은 anthropic-version 을 보낸다');
    ok(
      h['anthropic-dangerous-direct-browser-access'] === 'true',
      'Anthropic 은 브라우저 직접 호출 허용 헤더를 보낸다',
    );
    ok(!('authorization' in h), 'Anthropic 요청에 authorization 이 없다');
    ok(!('x-goog-api-key' in h), 'Anthropic 요청에 x-goog-api-key 가 없다');
  }

  if (id === 'openai') {
    ok(h.authorization === `Bearer ${KEYS.openai}`, 'OpenAI 는 authorization: Bearer 로 보낸다');
    ok(!('x-api-key' in h), 'OpenAI 요청에 x-api-key 가 없다');
    ok(!('x-goog-api-key' in h), 'OpenAI 요청에 x-goog-api-key 가 없다');
    ok(
      Object.keys(h).every((k) => !k.startsWith('anthropic-')),
      'OpenAI 요청에 anthropic- 헤더가 없다',
      Object.keys(h).join(','),
    );
  }

  if (id === 'google') {
    // 여기가 이 파일에서 가장 중요한 검사다.
    ok(h['x-goog-api-key'] === KEYS.google, 'Google 은 x-goog-api-key 로 보낸다');
    ok(!('authorization' in h), 'Google 요청에 authorization 이 없다');
    ok(!('x-api-key' in h), 'Google 요청에 x-api-key 가 없다');
    ok(
      Object.keys(h).every((k) => !k.startsWith('anthropic-')),
      'Google 요청에 anthropic- 헤더가 없다',
      Object.keys(h).join(','),
    );
    ok(
      Object.keys(h).sort().join(',') === 'content-type,x-goog-api-key',
      'Google POST 헤더는 content-type 과 x-goog-api-key 뿐이다',
      Object.keys(h).sort().join(','),
    );
  }
}

// 모델 목록 조회(GET)도 같은 규칙을 따라야 한다. Google 은 여기서도 헤더가 하나뿐이다.
{
  const calls = stubFetch(() => res(200, { models: [] }));
  await listModels('google', KEYS.google);
  const keys = Object.keys(calls[0].headers).sort();
  ok(keys.join(',') === 'x-goog-api-key', 'Google GET 헤더는 x-goog-api-key 뿐이다', keys.join(','));
}

/* ------------------------------------------------------------------ */

section('오류 분류');

// Anthropic / OpenAI 는 401
for (const id of ['anthropic', 'openai']) {
  stubFetch(() => res(401, { error: { message: 'invalid x-api-key' } }));
  const r = await listModels(id, KEYS[id]);
  ok(r.ok === false && r.error.kind === 'invalid_key', `${id} 401 은 invalid_key`, JSON.stringify(r.error));
}

// Google 은 400 + 본문의 API_KEY_INVALID
{
  stubFetch(() =>
    res(400, {
      error: { code: 400, message: 'API key not valid', status: 'INVALID_ARGUMENT',
        details: [{ reason: 'API_KEY_INVALID' }] },
    }),
  );
  const r = await listModels('google', KEYS.google);
  ok(
    r.ok === false && r.error.kind === 'invalid_key',
    'Google 400 + API_KEY_INVALID 는 invalid_key',
    JSON.stringify(r.error),
  );
}

// Google 의 다른 400 은 키 문제가 아니다. 여기서 오진하면 사용자가 멀쩡한 키를 계속 바꾼다.
{
  stubFetch(() => res(400, { error: { code: 400, message: 'Unknown name "foo"' } }));
  const r = await createStructured('google', KEYS.google, { ...ARGS, model: 'gemini-x' });
  ok(r.ok === false && r.error.kind === 'api', 'Google 의 다른 400 은 api', JSON.stringify(r.error));
  ok(r.error.message.includes('Unknown name'), '제공자 메시지를 그대로 담는다', r.error.message);
}

// 그 외 상태 코드
{
  stubFetch(() => res(429, { error: { message: 'rate limit' } }));
  const r = await listModels('anthropic', KEYS.anthropic);
  ok(r.ok === false && r.error.kind === 'api', '429 는 api', JSON.stringify(r.error));
}

// fetch 자체가 throw — CORS, 오프라인, 확장 프로그램 차단
for (const id of ['anthropic', 'openai', 'google']) {
  stubFetch(() => new TypeError('Failed to fetch'));
  const r = await listModels(id, KEYS[id]);
  ok(r.ok === false && r.error.kind === 'network', `${id} fetch throw 는 network`, JSON.stringify(r.error));
}

// JSON 이 아닌 응답
{
  stubFetch(() => res(200, '<html>gateway</html>'));
  const r = await listModels('openai', KEYS.openai);
  ok(r.ok === false && r.error.kind === 'api', 'JSON 이 아닌 성공 응답은 api', JSON.stringify(r.error));
}

/* ------------------------------------------------------------------ */

section('Anthropic 요청 본문 — 최신 API 규칙');

{
  const calls = stubFetch(() => res(200, OKBODY.anthropic));
  await createStructured('anthropic', KEYS.anthropic, {
    ...ARGS,
    model: 'claude-opus-5',
    effort: 'high',
  });
  const body = calls[0].body;
  const flat = JSON.stringify(body);

  for (const bad of ['temperature', 'top_p', 'top_k', 'budget_tokens']) {
    ok(!(bad in body), `본문 최상위에 ${bad} 가 없다`);
    ok(!flat.includes(`"${bad}"`), `본문 어디에도 ${bad} 가 없다`, flat.slice(0, 200));
  }
  ok(!flat.includes('"thinking"'), '본문에 thinking 설정이 없다');

  ok(body.max_tokens >= 8000, 'max_tokens 가 8000 이상이다', String(body.max_tokens));
  ok(body.model === 'claude-opus-5', '모델 ID 를 그대로 보낸다');
  ok(body.system === ARGS.system, 'system 은 최상위 필드다');
  ok(body.output_config?.format?.type === 'json_schema', 'output_config.format 이 json_schema');
  ok(same(body.output_config?.format?.schema, SCHEMA), '스키마를 그대로 넣는다');
  ok(body.output_config?.effort === 'high', 'effort 는 output_config 안에 있다');
  ok(calls[0].url === 'https://api.anthropic.com/v1/messages', 'messages 엔드포인트를 부른다', calls[0].url);
}

// effort 를 주지 않으면 넣지 않는다
{
  const calls = stubFetch(() => res(200, OKBODY.anthropic));
  await createStructured('anthropic', KEYS.anthropic, { ...ARGS, model: 'claude-opus-5' });
  ok(!('effort' in calls[0].body.output_config), 'effort 가 없으면 보내지 않는다');
}

/* ------------------------------------------------------------------ */

section('구조화 출력 스키마가 제공자별로 올바른 자리에');

{
  const calls = stubFetch(() => res(200, OKBODY.openai));
  await createStructured('openai', KEYS.openai, { ...ARGS, model: 'gpt-x' });
  const body = calls[0].body;
  ok(body.response_format?.type === 'json_schema', 'OpenAI 는 response_format.type = json_schema');
  ok(body.response_format?.json_schema?.strict === true, 'OpenAI 는 strict: true');
  ok(same(body.response_format?.json_schema?.schema, SCHEMA), 'OpenAI 는 json_schema.schema 에 스키마');
  ok(typeof body.response_format?.json_schema?.name === 'string', 'OpenAI 는 json_schema.name 을 준다');
  ok(body.messages[0].role === 'system' && body.messages[0].content === ARGS.system,
    'OpenAI 는 system 을 메시지로 앞에 붙인다');
  ok(calls[0].url === 'https://api.openai.com/v1/chat/completions', 'chat/completions 를 부른다', calls[0].url);
}

{
  const calls = stubFetch(() => res(200, OKBODY.google));
  await createStructured('google', KEYS.google, { ...ARGS, model: 'gemini-x' });
  const body = calls[0].body;
  const gs = body.generationConfig?.responseSchema;

  ok(body.generationConfig?.responseMimeType === 'application/json', 'Google 은 responseMimeType 을 준다');
  ok(!!gs, 'Google 은 responseSchema 를 준다');
  ok(body.systemInstruction?.parts?.[0]?.text === ARGS.system, 'Google 은 systemInstruction 을 쓴다');
  ok(body.contents?.[0]?.role === 'user', 'Google 은 contents.role 을 쓴다');
  ok(body.contents?.[0]?.parts?.[0]?.text === '4안을 내라', 'Google 은 parts.text 로 보낸다');
  ok(
    calls[0].url === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent',
    'generateContent 를 부른다',
    calls[0].url,
  );

  // Google 의 responseSchema 는 OpenAPI 서브셋이다. additionalProperties 가 남으면 요청이 거부된다.
  const flat = JSON.stringify(gs);
  ok(!flat.includes('additionalProperties'), 'Google 스키마에서 additionalProperties 를 제거한다', flat);
  ok(!flat.includes('pattern'), 'Google 스키마에서 지원 안 되는 pattern 도 제거한다', flat);
  ok(gs.type === 'object' && !!gs.properties?.items, '지원되는 키는 남긴다');
  ok(gs.properties.items.minItems === 2, 'minItems 는 남긴다');
  ok(
    gs.properties.items.items.properties.color.type === 'string',
    '중첩된 곳까지 변환한다',
    JSON.stringify(gs.properties.items.items),
  );
  ok(Array.isArray(gs.required) && gs.required.includes('items'), 'required 는 남긴다');
  // 원본을 건드리면 다른 제공자 호출이 망가진다.
  ok(SCHEMA.additionalProperties === false, '원본 스키마는 그대로 둔다');
}

/* ------------------------------------------------------------------ */

section('정상 응답에서 JSON 꺼내기');

for (const id of ['anthropic', 'openai', 'google']) {
  stubFetch(() => res(200, OKBODY[id]));
  const r = await createStructured(id, KEYS[id], { ...ARGS, model: MODEL[id] });
  ok(r.ok === true, `${id} 정상 응답은 ok`, JSON.stringify(r.error || {}));
  ok(r.data?.items?.[0]?.name === '가', `${id} 응답에서 JSON 을 꺼낸다`, JSON.stringify(r.data));
  ok(r.usage?.input === 1200 && r.usage?.output === 340, `${id} 토큰 수를 옮긴다`, JSON.stringify(r.usage));
}

// 구조화 출력을 걸었는데도 JSON 이 아니면 api 오류다
{
  stubFetch(() => res(200, { content: [{ type: 'text', text: '죄송하지만 도와드릴 수 없습니다' }] }));
  const r = await createStructured('anthropic', KEYS.anthropic, { ...ARGS, model: 'claude-opus-5' });
  ok(r.ok === false && r.error.kind === 'api', 'JSON 파싱 실패는 api', JSON.stringify(r.error));
}

// 빈 응답
{
  stubFetch(() => res(200, { content: [] }));
  const r = await createStructured('anthropic', KEYS.anthropic, { ...ARGS, model: 'claude-opus-5' });
  ok(r.ok === false && r.error.kind === 'api', '빈 응답은 api', JSON.stringify(r.error));
}

/* ------------------------------------------------------------------ */

section('모델 목록');

{
  stubFetch(() => res(200, { data: [{ id: 'claude-opus-5', display_name: 'Claude Opus 5' }] }));
  const r = await listModels('anthropic', KEYS.anthropic);
  ok(r.ok === true && r.models[0].id === 'claude-opus-5', 'Anthropic 목록을 읽는다', JSON.stringify(r));
  ok(r.models[0].label === 'Claude Opus 5', 'Anthropic display_name 을 라벨로 쓴다');
}

{
  stubFetch(() =>
    res(200, { models: [{ name: 'models/gemini-3-pro', displayName: 'Gemini 3 Pro' }] }),
  );
  const r = await listModels('google', KEYS.google);
  ok(r.ok === true && r.models[0].id === 'gemini-3-pro', 'Google 의 models/ 접두사를 뗀다', JSON.stringify(r));
}

// 이름 기반 정렬: 최신 세대가 앞, 채팅 계열이 아닌 것은 뒤
{
  stubFetch(() =>
    res(200, {
      data: [
        { id: 'text-embedding-3-large' },
        { id: 'gpt-4o' },
        { id: 'gpt-5.2' },
        { id: 'gpt-5.2-preview' },
      ],
    }),
  );
  const r = await listModels('openai', KEYS.openai);
  const ids = r.models.map((m) => m.id);
  ok(ids[0] === 'gpt-5.2', '최신 세대가 앞에 온다', ids.join(' > '));
  ok(ids.indexOf('gpt-4o') < ids.indexOf('text-embedding-3-large'), '채팅 계열이 아닌 것은 뒤로', ids.join(' > '));
  ok(ids.indexOf('gpt-5.2') < ids.indexOf('gpt-5.2-preview'), 'preview 는 정식판보다 뒤로', ids.join(' > '));
  ok(ids.length === 4, '어떤 모델도 목록에서 빼지 않는다', ids.join(' > '));
}

/* ------------------------------------------------------------------ */

section('비용 추정');

{
  // 백만 토큰당 입력 $5 / 출력 $25
  const c = estimateCost('anthropic', 'claude-opus-5', { input: 1_000_000, output: 1_000_000 });
  ok(c === 30, 'Opus 5 단가를 계산한다', String(c));

  const s = estimateCost('anthropic', 'claude-sonnet-5', { input: 1_000_000, output: 1_000_000 });
  ok(s === 18, 'Sonnet 5 단가를 계산한다', String(s));

  ok(estimateCost('anthropic', 'claude-opus-5', { input: 0, output: 0 }) === 0, '0 토큰은 0');
  ok(estimateCost('anthropic', 'claude-opus-5', undefined) === 0, 'usage 가 없으면 0');
}

ok(estimateCost('anthropic', 'claude-opus-4-8', { input: 1000, output: 1000 }) === null,
  '모르는 Anthropic 모델은 null');
ok(estimateCost('openai', 'gpt-5.2', { input: 1000, output: 1000 }) === null,
  'OpenAI 는 단가를 몰라 null');
ok(estimateCost('google', 'gemini-3-pro', { input: 1000, output: 1000 }) === null,
  'Google 은 단가를 몰라 null');
ok(estimateCost('nope', 'x', { input: 1, output: 1 }) === null, '모르는 제공자는 null');

/* ------------------------------------------------------------------ */

section('제공자 정의');

for (const id of ['anthropic', 'openai', 'google']) {
  const p = PROVIDERS[id];
  ok(p?.id === id, `${id} 정의가 있다`);
  ok(!!p.label && !!p.keyPrefix && !!p.keyPlaceholder, `${id} 화면에 쓸 값이 다 있다`);
  ok(/^https:\/\//.test(p.consoleUrl) && !!p.consoleLabel, `${id} 키 발급처가 있다`, p.consoleUrl);
  ok(Array.isArray(RECOMMENDED[id]), `${id} 추천 목록 자리가 있다`);
}

// 추천에 단가를 적었다면 두 값이 다 있어야 한다. 반쪽 단가는 잘못된 비용을 낳는다.
for (const [id, list] of Object.entries(RECOMMENDED)) {
  for (const m of list) {
    ok(!!m.id && !!m.label && !!m.note, `${id}/${m.id} 추천 항목이 온전하다`);
    ok(
      typeof m.price.input === 'number' && typeof m.price.output === 'number',
      `${id}/${m.id} 단가가 입출력 둘 다 있다`,
    );
  }
}
ok(RECOMMENDED.openai.length === 0 && RECOMMENDED.google.length === 0,
  'OpenAI/Google 추천은 확인 전까지 비워 둔다');

console.log(`\n${checks} 가지 확인`);
console.log(failures === 0 ? '전체 통과' : `실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
