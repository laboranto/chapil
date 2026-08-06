# 피드백 수신처 자체 구현 — 설계

- 작성일: 2026-08-06
- 상태: 설계 확정, 구현 대기

## 배경

`frontend/src/pages/Feedback.jsx`는 Nextcloud Forms API로 직접 POST하고 있었다.

```
https://iranto.synology.me/nextcloud/ocs/v2.php/apps/forms/api/v3/forms/1/submissions
```

2026-07-18 NAS 마비 사건 이후 Nextcloud 서비스를 중단(`synopkg stop nextcloud`)했으므로 이 엔드포인트는 죽었다. 현재 사용자는 "보내는 중…" 다음에 HTTP 오류 문구만 보게 되며, 설정 화면의 '피드백 보내기' 버튼은 그대로 노출되어 있다.

즉 이 작업은 신규 기능이 아니라 **끊어진 기능의 수신처를 자체 구현으로 교체**하는 것이다.

## 핵심 제약 — recovery와 feedback은 목적지가 정반대다

차필은 셀프호스팅 앱이다(README: 각자 NAS·홈서버·웹호스팅에 직접 구동). 이 사실이 두 엔드포인트의 설계를 갈라놓는다.

| 엔드포인트 | 도달해야 할 서버 | 구현 |
|---|---|---|
| `/api/recovery/*` | **각 사용자 본인의 서버** | 상대 경로 (`recovery.js` 현행 유지) |
| 피드백 | **개발자(이란토)의 서버** | 절대 URL |

**따라서 공용 API base URL 상수를 도입해서는 안 되며, `frontend/src/recovery.js`는 이번 작업에서 수정하지 않는다.** 두 엔드포인트를 같은 방식으로 통일하면 셀프호스터들이 보낸 피드백이 전부 자기 서버에 저장되어 개발자에게 도달하지 못한다.

## 수신처: 데모 컨테이너

`chapil-demo` 컨테이너(포트 8001, 볼륨 `./data-demo`)가 `https://chapil-demo.varmakoro.net`으로 이미 공개 인터넷에 노출되어 있다(https 확인 완료). 이것을 피드백 수집처로 사용한다.

**본 서버(`chapil`, 8000)를 새로 공개하지 않는다.** 그 컨테이너를 공개하면 인증 없는 `PUT/GET/DELETE /api/recovery/{lookup_key}`가 이란토의 실제 데이터와 함께 노출된다. 데모 컨테이너를 쓰면 본 서버는 Tailscale 뒤에 그대로 두고 신규 공격면이 0이다.

**`DEMO_MODE=true`에서 피드백 라우트를 막지 않는다.** 데모 컨테이너가 곧 수신처이므로 거기서 라우트가 살아있어야 한다. (`/api/demo-seed`의 `DEMO_MODE` 게이팅과는 목적이 반대다.)

## 저장 방식: 피드백 1건 = 마크다운 파일 1개

`/data/feedback/` 아래에 건별 `.md` 파일을 쌓는다. 컨테이너 기준 `/data`는 호스트의 `./data-demo`에 bind mount되어 있다.

sqlite도 CSV도 쓰지 않는다. 근거:

- **`app/database.py`를 전혀 건드리지 않아도 된다.** 실사용 복구 백업이 든 `carlog.db` 근처에 손댈 일이 없어 유실 위험이 0이다.
- **파일명을 서버가 생성하므로 충돌이 없고, 따라서 잠금이 필요 없다.** CSV append에 필요했던 `threading.Lock`, Excel용 UTF-8 BOM, 쉼표·개행 escaping이 전부 불필요해진다.
- 여러 줄 스택트레이스가 마크다운 코드블록에 자연스럽게 들어간다. CSV라면 셀 하나에 갇혀 사실상 읽을 수 없다.
- 피드백은 append-only이고 빈도가 극히 낮다. 관계형 DB가 과하다.

### 파일명

```
YYYY-MM-DDTHH-MM-SS-<6자리 난수>.md
```

타임스탬프는 서버 수신 시각(`localtime`). 난수는 같은 초에 2건이 들어올 때의 충돌 방지용. **파일명은 전적으로 서버가 생성하며 클라이언트 입력을 일절 사용하지 않는다** — 경로 순회(path traversal) 여지를 원천 차단한다.

### 파일 내용

다음 구조로 조판한다(스택트레이스는 펜스 코드블록으로 감싼다):

- `# 피드백 <수신시각>` 제목
- 기기 정보 표 — 앱 버전 / Android / 모델 / WebView 4행
- `## 내용` — 사용자 입력 본문 그대로
- `## 오류 기록 (N건)` — 항목마다 발생 시각을 불릿으로, 그 아래 `trace`를 코드블록으로

오류 기록이 없으면 `## 오류 기록` 섹션 자리에 `오류 기록 없음`을 남긴다. 기기 정보 필드가 `null`이면 `알 수 없음`으로 표기한다.

## API

### `POST /api/feedback`

기존 `app/main.py`에 라우트 하나를 추가한다. 요청 본문은 JSON:

```json
{
  "text": "사용자 입력 본문",
  "appVersion": "26.6.1",
  "android": "14",
  "model": "SM-S911N",
  "webview": "120.0.6099.230",
  "logs": [{ "at": "ISO8601", "trace": "스택 문자열" }]
}
```

- `text`를 제외한 모든 필드는 선택(`Optional`). 기기 정보는 `logger.js`의 `getDeviceInfo()`가 UA 파싱에 실패하면 `null`을 반환하므로 없을 수 있다.
- 응답: 성공 시 `{"ok": true}`.

**검증(공개 POST이므로 최소한만):**

- `text`가 비었으면 400.
- `text` 4,000자 초과 시 400.
- `logs`는 최대 30건(클라이언트 `logger.js`의 `MAX_ENTRIES`와 동일), 각 `trace` 4,000자 초과분은 잘라서 저장.

**Rate limiting은 구현하지 않는다.** 남용이 실제로 발생하기 전까지는 YAGNI이며, 필요해지면 리버스 프록시 계층에서 거는 편이 낫다.

## 프론트엔드 변경

`frontend/src/pages/Feedback.jsx`만 수정한다.

1. POST 대상 URL을 `https://chapil-demo.varmakoro.net/api/feedback` 절대 경로로 교체.
2. payload를 문자열 연결에서 **구조화된 JSON 객체로 변경**. 현재는 본문·기기정보·오류로그를 하나의 문자열로 합쳐 보내는데(`Feedback.jsx:27-33`), 서버가 마크다운으로 조판하려면 필드가 분리되어 있어야 한다.
3. Nextcloud 전용 헤더(`OCS-APIRequest`)와 `shareHash` 제거.

UI, 상태 관리(`idle | sending | done | error`), 고지 문구는 변경하지 않는다.

## 읽는 방법

SSH로 NAS에 접속해 직접 읽는다. 관리자 UI나 조회 엔드포인트를 만들지 않는다.

```sh
ls -t ./data-demo/feedback/          # 최신순 목록
cat ./data-demo/feedback/<파일명>     # 개별 확인
grep -rl "검색어" ./data-demo/feedback/
```

## 변경하지 않는 것

- `frontend/src/recovery.js` — 상대 경로가 셀프호스팅 모델에 맞는 올바른 구현이다.
- `app/database.py`, `DB_PATH`, `docker-compose.yml`의 `volumes` — 실사용 복구 백업 유실 위험.
- `docs/privacy.md` — "피드백 데이터는 개발자가 운영하는 개인 서버에 저장되며, 문제 해결 후 삭제됩니다"가 변경 후에도 그대로 참이다. 수집 항목도 동일하다.
- `app/main.py`의 COOP/COEP 미들웨어.

## 범위 밖 (별건으로 기록)

**Capacitor 네이티브 빌드에 `server.url`이 없다.** 따라서 패키징된 Android/iOS 앱에서는 상대 경로 `/api/recovery/*`가 `localhost`로 해석되어 **복구코드 백업이 네이티브 앱에서 작동한 적이 없을 가능성이 높다.** 앱스토어 출시가 "준비 중"이라 아직 드러나지 않은 잠복 이슈다.

`server.url`을 채워 넣는 것은 해법이 아니다. 웹뷰가 해당 주소를 원격 로드하게 되어 ① 주소가 하나로 고정되므로 셀프호스팅 모델이 무너지고 ② 로컬 sqlite-wasm 기반 오프라인 동작을 잃는다.

올바른 해법은 셀프호스팅 앱의 표준 패턴 — **앱 내 '서버 주소' 설정 화면**을 두고 `recovery.js`가 그 값을 base로 사용하는 것. 별도 기능이므로 이번 작업에 포함하지 않는다.

**이미 설치된 Android 앱**은 이 변경과 무관하게 죽은 Nextcloud URL로 계속 POST한다. 사용자가 앱을 업데이트해야 해소되며, 서버 측에서 할 수 있는 일이 없다.

## 배포

`chapil-demo`는 `chapil:latest` 이미지를 공유하므로 두 컨테이너가 함께 갱신된다.

```sh
docker compose up -d --build
```

`--build` 없이는 프론트엔드 변경이 반영되지 않는다(Dockerfile이 multi-stage로 컨테이너 내부에서 `npm run build`를 수행).

커밋·푸시·배포는 gitea 인증이 필요하므로 이란토가 직접 수행한다.

## 검증

- 백엔드: `app/tests/`에 pytest 추가 — 정상 저장, 빈 `text` 400, 길이 초과 400, 기기 정보 누락 시 `알 수 없음` 표기.
- 프론트엔드: 데모 사이트에서 실제 전송 후 `./data-demo/feedback/`에 파일이 생성되고 내용이 올바른지 육안 확인.
