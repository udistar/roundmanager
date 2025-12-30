# 네이버 지도 API 인증 실패 해결 가이드

## 현재 상태
- ❌ Error Code 200: Authentication Failed
- ❌ Static Map 403 Forbidden
- ⚠️ CORS 에러

## 해결 방법

### 1단계: 네이버 클라우드 플랫폼 콘솔 확인
1. https://console.ncloud.com/ 접속
2. Services → AI·NAVER API → AI·NAVER API 선택
3. Application 목록에서 **RoundManager** 클릭
4. [수정] 버튼 클릭

### 2단계: 설정 확인
**반드시 확인할 항목:**

#### A. 서비스 선택
- ✅ **Maps** 체크박스가 선택되어 있어야 함
- 하위 항목 모두 체크:
  - ✅ Static Map
  - ✅ Directions 5
  - ✅ Geocoding
  - ✅ Reverse Geocoding

#### B. Web 서비스 URL
**두 개 모두 추가:**
```
http://localhost:3003
http://127.0.0.1:3003
```
- 주의: 끝에 `/` 없이 입력
- 주의: `https`가 아닌 `http`

#### C. 저장
- [저장] 버튼 클릭 후 **1~2분 대기** (설정 반영 시간)

### 3단계: 브라우저 새로고침
- 콘솔 설정 저장 후
- 브라우저 **완전 새로고침** (Ctrl + Shift + R)

### 4단계: 확인
F12 → Console 탭에서 다음 에러가 사라졌는지 확인:
- ❌ "Error Code 200"
- ❌ "Authentication Failed"

## 여전히 안 되는 경우

### 옵션 1: API 키 재발급
1. 콘솔에서 기존 Application 삭제
2. 새로 생성하여 새 Client ID/Secret 발급
3. 코드에 새 키 적용

### 옵션 2: 지도 기능 임시 비활성화
날씨, 식당 추천 등 다른 기능은 정상 작동하므로
지도만 임시로 숨기고 사용 가능

## 참고
- 네이버 Maps API는 **반드시 Web Service URL 등록 필요**
- 등록하지 않으면 Error Code 200 발생
- 설정 변경 후 1~2분 대기 필요
