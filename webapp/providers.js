/**
 * 제공자 어댑터
 *
 * 서버가 없으므로 브라우저가 제공자 API를 직접 부른다. 세 제공자를 같은 인터페이스로
 * 감싸되, 요청 헤더만은 절대 공유하지 않는다.
 *
 * Google 은 CORS 프리플라이트에서 content-type 과 x-goog-api-key 만 허용한다.
 * 세 곳에 공용 헤더 뭉치를 보내면 Google 만 403 으로 조용히 깨진다(실제로 재현했다).
 * 그래서 어댑터마다 authHeaders() 를 따로 두고, 공통 코드는 그 결과만 쓴다.
 *
 * 키는 사용자 것이다. 저장하거나 어디로도 보내지 않는다.
 */

/**
 * 제공자 정의.
 *
 * keyPrefix       - 형식 검사용 접두사
 * keyRejectPrefix - 이 접두사면 다른 제공자의 키다. 붙여넣기 실수를 잡는다
 * consoleUrl      - 키 발급처
 * keySteps        - 키를 받는 절차. E1 오른쪽에 처음부터 띄워 둔다
 * keyNote         - 절차 밖의 주의. 대개 결제 이야기라 따로 뽑았다
 *
 * keySteps 를 적어 두는 이유는, 키가 없는 사람이 이 도구에서 막히는 지점이
 * "키를 어떻게 받는지 모른다" 하나이기 때문이다. 다만 남의 화면이라 언제든
 * 바뀐다. 그래서 절차는 짧게만 적고 consoleUrl 을 항상 크게 함께 보여준다 -
 * 글이 틀려도 링크는 맞다. D1 의 관리자 도식에서 쓰는 것과 같은 방식이다.
 */
export const PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-api03-...',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    consoleLabel: 'Anthropic Console',
    keySteps: [
      'Anthropic Console 에 가입하고 로그인합니다',
      'Settings - API keys 로 들어갑니다',
      'Create Key 를 누르고 이름을 짓습니다',
      '만들어진 키를 복사합니다',
    ],
    keyNote:
      '키는 만든 직후 한 번만 보입니다. 창을 닫으면 다시 볼 수 없고 새로 만들어야 합니다. 그리고 Billing 에 결제 수단을 등록하고 크레딧을 충전해야 호출이 됩니다.',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    keyPrefix: 'sk-',
    // Anthropic 키도 sk- 로 시작한다. 접두사만 보면 통과하므로 따로 막는다.
    keyRejectPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-proj-...',
    consoleUrl: 'https://platform.openai.com/api-keys',
    consoleLabel: 'OpenAI Platform',
    keySteps: [
      'OpenAI Platform 에 가입하고 로그인합니다',
      'API keys 로 들어갑니다',
      'Create new secret key 를 누릅니다',
      '만들어진 키를 복사합니다',
    ],
    keyNote:
      '키는 만든 직후 한 번만 보입니다. 결제 수단을 등록하지 않으면 키는 살아 있어도 호출에서 할당량 오류가 납니다.',
  },
  google: {
    id: 'google',
    label: 'Google',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIza...',
    consoleUrl: 'https://aistudio.google.com/apikey',
    consoleLabel: 'Google AI Studio',
    keySteps: [
      'Google AI Studio 에 구글 계정으로 로그인합니다',
      'API 키 만들기를 누릅니다',
      '쓸 구글 클라우드 프로젝트를 고릅니다',
      '만들어진 키를 복사합니다',
    ],
    keyNote:
      '셋 중 유일하게 무료 등급이 있습니다. 다만 무료 등급은 분당 호출 수가 낮아 작업 중에 막힐 수 있습니다.',
  },
};

/**
 * 추천 모델.
 *
 * price 는 백만 토큰당 USD. 값을 모르면 price 를 두지 않는다 —
 * 틀린 단가를 보여 주는 것보다 "모름"이 낫다.
 *
 * 유지 항목: OpenAI 와 Google 은 사람이 확인해서 채워야 한다. 추측으로 모델 ID 와
 * 단가를 박아 넣으면 존재하지 않는 모델을 추천하거나 잘못된 비용을 보여 주게 된다.
 * 그때까지는 listModels 가 받아온 실제 목록을 sortModels 로 정렬해서 쓴다.
 */
export const RECOMMENDED = {
  // 모델 ID/단가 출처: claude-api 스킬 문서 (카탈로그 캐시 2026-06-04 기준)
  anthropic: [
    {
      id: 'claude-opus-4-8',
      label: 'Claude Opus 4.8',
      note: '가장 정확합니다',
      price: { input: 5, output: 25 },
    },
    {
      id: 'claude-sonnet-4-6',
      label: 'Claude Sonnet 4.6',
      note: '더 싸고 빠릅니다',
      price: { input: 3, output: 15 },
    },
    {
      id: 'claude-fable-5',
      label: 'Claude Fable 5',
      note: '최상위 성능, 가장 비쌉니다',
      price: { input: 10, output: 50 },
    },
  ],
  openai: [],
  google: [],
};

/** Anthropic 은 thinking 이 기본으로 켜져 있고 max_tokens 가 thinking + 응답을 합쳐 제한한다. */
const ANTHROPIC_MAX_TOKENS = 16000;

/* ---------------------------------------------------------------- 키 형식 */

/**
 * 접두사만 보고 거른다.
 *
 * 네트워크를 타기 전에 잡으면 비용도 대기 시간도 들지 않는다. 형식이 맞아도
 * 진짜 유효한 키인지는 listModels 가 확인한다.
 */
export function validateKeyFormat(providerId, key) {
  const p = PROVIDERS[providerId];
  if (!p) return '모르는 제공자입니다';

  const k = (key || '').trim();
  if (!k) return '키를 입력하세요';

  if (p.keyRejectPrefix && k.startsWith(p.keyRejectPrefix)) {
    return `${p.label} 키가 아닙니다. ${p.keyPrefix}... 로 시작해야 합니다`;
  }
  if (!k.startsWith(p.keyPrefix)) {
    return `${p.label} 키는 ${p.keyPrefix}... 로 시작합니다`;
  }
  return null;
}

/* --------------------------------------------------------- 스키마 변환 */

/**
 * Google 이 받는 responseSchema 키.
 *
 * OpenAPI 3.0 서브셋이라 JSON Schema 의 상당수를 모른다. 특히
 * additionalProperties 를 넣으면 요청 자체가 거부된다. 모르는 키를 무시하지 않고
 * 거부하므로 블랙리스트가 아니라 화이트리스트로 간다.
 *
 * pattern 이 빠지는 것은 감수한다 — 색 형식 같은 것은 spec.js 의 validateDetails 가
 * 어차피 다시 본다.
 */
const GOOGLE_SCHEMA_KEYS = new Set([
  'type',
  'format',
  'description',
  'nullable',
  'enum',
  'items',
  'properties',
  'required',
  'minItems',
  'maxItems',
  'propertyOrdering',
]);

/** JSON Schema 를 Google 이 받는 모양으로 줄인다. */
export function toGoogleSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toGoogleSchema);
  if (!schema || typeof schema !== 'object') return schema;

  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (!GOOGLE_SCHEMA_KEYS.has(k)) continue;
    if (k === 'properties') {
      out.properties = Object.fromEntries(
        Object.entries(v).map(([name, sub]) => [name, toGoogleSchema(sub)]),
      );
    } else if (k === 'items') {
      out.items = toGoogleSchema(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/* --------------------------------------------------------- 모델 정렬 */

/** 채팅/생성 계열로 보이지 않는 것. 숨기지는 않고 뒤로만 민다. */
const OFF_TOPIC = /embed|moderation|tts|whisper|transcribe|audio|realtime|dall-?e|imagen|veo|sora|rerank|aqa|guard/i;
const PREVIEW = /preview|exp|beta|alpha|latest-\d/i;
const DATED = /-\d{4}(-\d{2}-\d{2})?$|-\d{6,8}$/;

/** 이름에서 세대 번호를 뽑는다. gpt-5.2 는 5.2, gemini-2.5-flash 는 2.5 */
function generation(id) {
  const m = /(\d+(?:\.\d+)?)/.exec(id);
  if (!m) return 0;
  const n = Number(m[1]);
  // 날짜(20250929)나 빌드 번호가 걸린 경우는 세대가 아니다.
  return n < 100 ? n : 0;
}

/**
 * 그럴듯한 최신 기종을 앞으로.
 *
 * 모델 ID 를 하드코딩하지 않기 위한 이름 기반 정렬이다. 정확한 추천은 아니고,
 * 사용자가 목록에서 고르기 쉬운 순서를 만드는 것이 목적이다.
 */
export function sortModels(models) {
  const key = (m) => [
    OFF_TOPIC.test(m.id) ? 1 : 0,
    PREVIEW.test(m.id) ? 1 : 0,
    -generation(m.id),
    DATED.test(m.id) ? 1 : 0,
    m.id,
  ];
  return [...models].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  });
}

/* --------------------------------------------------------- 어댑터 */

const ADAPTERS = {
  anthropic: {
    /** Google 과 절대 섞이면 안 되는 지점. 여기 헤더는 Anthropic 에만 나간다. */
    authHeaders(key) {
      return {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // 이게 없으면 브라우저에서 직접 호출이 거부된다.
        'anthropic-dangerous-direct-browser-access': 'true',
      };
    },
    modelsUrl() {
      // limit 상한이 문서에 없다. 너무 크게 잡으면 유효한 키에서만 400 이 나서
      // 사용자 화면에서만 터진다. 모델 수가 스무 개 안팎이라 100 이면 충분하다.
      return 'https://api.anthropic.com/v1/models?limit=100';
    },
    parseModels(body) {
      return (body?.data || []).map((m) => ({ id: m.id, label: m.display_name || m.id }));
    },
    messageUrl() {
      return 'https://api.anthropic.com/v1/messages';
    },
    messageBody({ model, system, systemParts, messages, schema, effort }) {
      const outputConfig = { format: { type: 'json_schema', schema } };
      if (effort) outputConfig.effort = effort;

      // 프롬프트 캐싱: systemParts 는 [프리픽스, 태스크규칙] 2요소 배열.
      // Anthropic 캐시는 접두사 일치라, 요청마다 변하지 않는 프리픽스 블록에만
      // cache_control 을 붙인다. 태스크규칙은 요청마다 달라질 수 있어 캐시 밖에 둔다.
      // systemParts 가 없으면 기존 문자열 system 을 그대로 쓴다 (하위 호환 —
      // 화면 쪽 수정은 별도 작업이라 아직 안 넘어올 수 있음).
      let systemField = null;
      if (Array.isArray(systemParts) && systemParts.length === 2) {
        systemField = [
          { type: 'text', text: systemParts[0], cache_control: { type: 'ephemeral' } },
          { type: 'text', text: systemParts[1] },
        ];
      } else if (system) {
        systemField = system;
      }

      // temperature / top_p / top_k 와 thinking.budget_tokens 는 400 이다. 넣지 않는다.
      return {
        model,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        ...(systemField ? { system: systemField } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        output_config: outputConfig,
      };
    },
    extract(body) {
      // thinking 블록이 앞에 섞여 오므로 text 블록만 골라 붙인다.
      const text = (body?.content || [])
        .filter((b) => b?.type === 'text')
        .map((b) => b.text)
        .join('');
      return {
        text,
        usage: {
          input: body?.usage?.input_tokens ?? 0,
          output: body?.usage?.output_tokens ?? 0,
        },
      };
    },
  },

  openai: {
    authHeaders(key) {
      return { authorization: `Bearer ${key}` };
    },
    modelsUrl() {
      return 'https://api.openai.com/v1/models';
    },
    parseModels(body) {
      return (body?.data || []).map((m) => ({ id: m.id, label: m.id }));
    },
    messageUrl() {
      return 'https://api.openai.com/v1/chat/completions';
    },
    messageBody({ model, system, messages, schema }) {
      // effort 는 제공자마다 이름과 값이 달라 확인 전까지 보내지 않는다.
      // systemParts 는 받아도 무시한다 — OpenAI 는 프리픽스 자동 캐싱이라
      // 명시적 캐시 마커가 없고, 문자열 system 그대로 보내면 알아서 캐싱된다.
      return {
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'result', schema, strict: true },
        },
      };
    },
    extract(body) {
      return {
        text: body?.choices?.[0]?.message?.content || '',
        usage: {
          input: body?.usage?.prompt_tokens ?? 0,
          output: body?.usage?.completion_tokens ?? 0,
        },
      };
    },
  },

  google: {
    /** 여기에 헤더를 더하면 프리플라이트에서 403 이 난다. 딱 하나만 보낸다. */
    authHeaders(key) {
      return { 'x-goog-api-key': key };
    },
    modelsUrl() {
      return 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200';
    },
    parseModels(body) {
      return (body?.models || []).map((m) => {
        const id = String(m.name || '').replace(/^models\//, '');
        return { id, label: m.displayName || id };
      });
    },
    messageUrl(model) {
      return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    },
    messageBody({ system, messages, schema }) {
      // systemParts 는 받아도 무시한다 — Google(Gemini) 도 암시적 프리픽스 캐싱이
      // 기본이라 요청 본문에 캐시 지시를 넣을 게 없다. 문자열 system 그대로 보낸다.
      return {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: toGoogleSchema(schema),
        },
      };
    },
    extract(body) {
      const parts = body?.candidates?.[0]?.content?.parts || [];
      return {
        text: parts.map((p) => p?.text || '').join(''),
        usage: {
          input: body?.usageMetadata?.promptTokenCount ?? 0,
          output: body?.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    },
  },
};

/* --------------------------------------------------------- 오류 분류 */

function err(kind, message) {
  return { ok: false, error: { kind, message } };
}

/**
 * 제공자가 키를 거부한 것인지 본다.
 *
 * Anthropic/OpenAI 는 401 이지만 Google 은 400 을 준다. 상태 코드만 보면
 * Google 에서 "잘못된 요청"으로 오진해 사용자가 키를 고칠 생각을 못 한다.
 */
function isInvalidKey(providerId, status, rawBody) {
  if (status === 401) return true;
  if (providerId === 'google' && rawBody.includes('API_KEY_INVALID')) return true;
  return false;
}

/** 제공자 오류 본문에서 사람이 읽을 문장을 꺼낸다. 세 곳 다 error.message 를 쓴다. */
function errorMessage(parsed, rawBody, status) {
  const m = parsed?.error?.message;
  if (typeof m === 'string' && m) return m;
  if (rawBody) return rawBody.slice(0, 300);
  return `HTTP ${status}`;
}

/**
 * 호출 한 번. 성공하면 파싱된 본문을, 실패하면 분류된 오류를 준다.
 *
 * fetch 가 throw 하는 경우(CORS, 오프라인, 확장 프로그램 차단)와 제공자가 오류를
 * 응답한 경우는 사용자가 할 일이 다르므로 반드시 갈라야 한다.
 */
async function call(providerId, url, init) {
  let res;
  let raw;
  try {
    res = await fetch(url, init);
    raw = await res.text();
  } catch (e) {
    return err(
      'network',
      `${PROVIDERS[providerId]?.label || providerId} 에 연결하지 못했습니다: ${e?.message || e}`,
    );
  }

  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    if (isInvalidKey(providerId, res.status, raw)) {
      return err('invalid_key', `${PROVIDERS[providerId]?.label || providerId} 가 키를 거부했습니다`);
    }
    return err('api', errorMessage(parsed, raw, res.status));
  }

  if (parsed === null) {
    return err('api', '응답을 읽지 못했습니다');
  }
  return { ok: true, body: parsed };
}

/* --------------------------------------------------------- 공개 API */

/**
 * 모델 목록.
 *
 * 토큰이 들지 않는 호출이라 키 검증을 겸한다. 사용자가 키를 넣자마자
 * 돈 안 들이고 맞는지 확인할 수 있는 유일한 지점이다.
 */
export async function listModels(providerId, key) {
  const a = ADAPTERS[providerId];
  if (!a) return err('api', '모르는 제공자입니다');

  const formatError = validateKeyFormat(providerId, key);
  if (formatError) return err('format', formatError);

  const res = await call(providerId, a.modelsUrl(), {
    method: 'GET',
    headers: a.authHeaders(key.trim()),
  });
  if (!res.ok) return res;

  return { ok: true, models: sortModels(a.parseModels(res.body)) };
}

/**
 * 구조화 JSON 출력을 받는다.
 *
 * messages 는 [{role:'user'|'assistant', content}] 형태의 제공자 중립 모양이고,
 * 각 어댑터가 자기 모양으로 바꾼다.
 *
 * systemParts 는 [프리픽스, 태스크규칙] 2요소 문자열 배열 (선택).
 * Anthropic 만 프롬프트 캐싱에 쓰고, OpenAI/Google 은 자동 캐싱이라 무시한다.
 */
export async function createStructured(providerId, key, { model, system, systemParts, messages, schema, effort } = {}) {
  const a = ADAPTERS[providerId];
  if (!a) return err('api', '모르는 제공자입니다');

  const formatError = validateKeyFormat(providerId, key);
  if (formatError) return err('format', formatError);
  if (!model) return err('api', '모델을 고르지 않았습니다');

  const res = await call(providerId, a.messageUrl(model), {
    method: 'POST',
    headers: { ...a.authHeaders(key.trim()), 'content-type': 'application/json' },
    body: JSON.stringify(a.messageBody({ model, system, systemParts, messages: messages || [], schema, effort })),
  });
  if (!res.ok) return res;

  const { text, usage } = a.extract(res.body);
  if (!text) return err('api', '모델이 빈 응답을 돌려줬습니다');

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // 구조화 출력을 걸었는데도 JSON 이 아니면 제공자 쪽 문제로 본다.
    return err('api', `모델 응답이 JSON 이 아닙니다: ${text.slice(0, 200)}`);
  }

  return { ok: true, data, usage };
}

/**
 * 비용 추정 (USD).
 *
 * 단가를 아는 모델만 계산한다. 모르면 null 을 주고 화면은 비용을 감춘다.
 * RECOMMENDED 밖의 모델은 전부 null 이다.
 */
export function estimateCost(providerId, modelId, usage) {
  const m = (RECOMMENDED[providerId] || []).find((x) => x.id === modelId);
  if (!m?.price) return null;

  const input = Number(usage?.input) || 0;
  const output = Number(usage?.output) || 0;
  return (input * m.price.input + output * m.price.output) / 1e6;
}
