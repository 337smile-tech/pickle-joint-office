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
3. 오른쪽 위 **배포 → 새 배포** → 유형 **웹 앱**
   - 설명: `합동비서실 API`
   - 다음 사용자로 실행: **나**
   - 액세스 권한: **모든 사용자** ← 이 부분이 "모든 사용자"여야 페이지에서 읽을 수 있어요.
   - **배포** → 권한 승인(내 계정) → 표시되는 **웹 앱 URL**을 복사 (`…/exec`로 끝납니다)
4. 비서실 페이지 오른쪽 위 **⚙️ → 실시간 연결**에 URL을 붙여 넣고 **저장**.
   - `연결 성공! 쪽지 n개 …` 이 나오면 끝. 두 기기에서 5초 안에 서로 반영됩니다.

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

## 5. 개인정보

이 페이지는 **공개 웹**입니다. 코드·시트 초기값에는 실명, 학교, 전화번호, 주소 등
개인정보를 넣지 않았고, 호칭만 `Star님` · `순둥이` · `차차` · `순둥이 피클`을 씁니다.
가족 코너의 PIN은 이 기기에만 저장되는 가벼운 잠금이며, 실제 보안 장치가 아닙니다.
시트에 적는 쪽지에는 개인정보를 쓰지 않는 것을 권합니다.

## 6. 개발 메모

- 쓰기 요청은 Apps Script의 302 리다이렉트에서 본문이 유실되는 문제를 피하려고
  `GET ?action=…&payload=…`로 보냅니다. 서버는 `doPost`도 지원합니다.
- 오프라인·오류 시에는 로컬에 먼저 저장하고 `pending` 큐에 담아, 연결이 돌아오면 자동으로 올립니다.
- `?action=seed` 로 기본 미션·상태를 채울 수 있습니다.
