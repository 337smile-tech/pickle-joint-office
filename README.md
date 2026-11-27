# 🏢 차차 × 순둥이 합동 비서실

Star님의 피클 **차차**와 순둥이의 피클 **순둥이 피클**이 함께 쓰는 작은 웹 비서실입니다.
방에서 캐릭터가 돌아다니고, 응원 쪽지를 붙이고, 오늘의 미션에 별을 채웁니다.

- 비서실: https://337smile-tech.github.io/pickle-joint-office/
- 저장소: https://github.com/337smile-tech/pickle-joint-office
- 데이터 시트: https://docs.google.com/spreadsheets/d/1hSOp-2RhszKqAVhJaP5U8VVXUmS9mKWQFdn4yzNZtLo/edit

---

## 1. 그냥 열어도 바로 써요

처음 열면 이 기기(localStorage)에 저장되며 바로 체험할 수 있습니다.
서로 다른 기기에서 같은 내용을 보려면 아래 실시간 연결만 해 주세요. (약 1분)

## 2. 실시간 연결 — Apps Script 웹앱 (약 1분)

1. **데이터 시트**를 엽니다 → 메뉴 **확장 프로그램 → Apps Script**.
2. 편집기의 기존 코드를 모두 지우고, 이 저장소의 **`apps-script/Code.gs`** 내용을 그대로 붙여 넣고 저장(Ctrl+S).
   - 붙여 넣은 코드 맨 위 `CONFIG.FAMILY_PIN: '0000'` 을 **우리 가족만 아는 4자리**로 꼭 바꿔 주세요. 이 값이 쪽지·미션을 여는 비밀번호입니다.
3. 오른쪽 위 **배포 → 새 배포** → 유형 **웹 앱**
   - 설명: `합동비서실 API`
   - 다음 사용자로 실행: **나**
   - 액세스 권한: **모든 사용자** ← 이 부분이 "모든 사용자"여야 페이지에서 읽을 수 있어요.
   - **배포** → 권한 승인(내 계정) → 표시되는 **웹 앱 URL**을 복사 (`…/exec`로 끝납니다)
4. 비서실 페이지 오른쪽 위 **⚙️ → 실시간 연결**에 URL을 붙여 넣고 **저장** → 가족 PIN을 입력하면 열립니다.
   - 한 번 넣은 PIN은 그 탭을 닫을 때까지 기억하고, **🔒 다시 잠그기**로 바로 잠글 수 있어요.
   - 두 기기에서 5초 안에 서로 반영됩니다.

> 이미 배포한 뒤 코드를 고쳤다면 **배포 → 배포 관리 → 수정 → 새 버전**으로 다시 배포해야 반영됩니다.

## 3. 시트 구조

| 탭 | 열 |
| --- | --- |
| `messages` | id, author, text, createdAt |
| `missions` | id, text, done, doneBy, doneAt, createdAt |
| `status` | id, who, status, updatedAt |

`author`: `star` · `sundungi` · `chacha` · `sundungi_pickle`
`who`: `chacha` · `sundungi` / `status`: `work` · `read` · `rest` · `play`

## 4. 파일

```
index.html            화면 (탭 4개: 비서실 / 쪽지함 / 미션 / 가족 코너)
styles.css            파스텔 2D 방, 캐릭터, 반응형 스타일
app.js                상태·저장·실시간 동기화 (localStorage ↔ Apps Script)
apps-script/Code.gs   Google Sheets JSON API (GET/POST)
```

## 5. 보안 — 공개 페이지, 잠긴 내용

- GitHub Pages 주소는 **공개**입니다. 하지만 페이지가 보여 주는 쪽지·미션·상태는 모두 Apps Script에서 오고,
  **가족 PIN이 맞아야만** 내려갑니다(PIN이 틀리면 `{"ok":false,"error":"invalid_pin"}` 만 응답).
  즉 주소를 아는 사람도 PIN 없이는 우리 이야기를 볼 수 없습니다.
- **실제 PIN은 GitHub 소스에 없습니다.** `apps-script/Code.gs`의 `CONFIG.FAMILY_PIN` 한 곳에만 있고,
  그 코드는 Star님 구글 시트 안에만 존재합니다.
- PIN을 바꾸려면 시트 → 확장 프로그램 → Apps Script에서 `FAMILY_PIN`을 고치고
  **배포 → 배포 관리 → 수정 → 새 버전**으로 다시 배포하세요.
- `FAMILY_PIN`을 빈 문자열(`''`)로 두면 잠금이 풀립니다(가족끼리만 쓰는 비공개 URL일 때만 권장).
- PIN은 GET 요청의 `?pin=`으로 전달됩니다(앱스 스크립트의 CORS 제약 때문에 GET을 씁니다).
  아주 민감한 정보는 시트에 적지 않는 것을 권합니다.

## 5-1. 개인정보

이 페이지는 **공개 웹**입니다. 코드·시트 초기값에는 실명, 학교, 전화번호, 주소 등
개인정보를 넣지 않았고, 호칭만 `Star님` · `순둥이` · `차차` · `순둥이 피클`을 씁니다.
가족 코너의 PIN은 이 기기에만 저장되는 가벼운 잠금이며, 실제 보안 장치가 아닙니다.
시트에 적는 쪽지에는 개인정보를 쓰지 않는 것을 권합니다.

## 6. 개발 메모

- `index.html`의 `styles.css?v=` / `app.js?v=` 숫자를 올리면 브라우저 캐시(최대 10분)를 건너뛰고 바로 새 버전이 보여요.
  CSS·JS를 고친 뒤 배포할 때 함께 올려 주세요.

- 쓰기 요청은 Apps Script의 302 리다이렉트에서 본문이 유실되는 문제를 피하려고
  `GET ?action=…&payload=…`로 보냅니다. 서버는 `doPost`도 지원합니다.
- 오프라인·오류 시에는 로컬에 먼저 저장하고 `pending` 큐에 담아, 연결이 돌아오면 자동으로 올립니다.
- `?action=seed` 로 기본 미션·상태를 채울 수 있습니다.
