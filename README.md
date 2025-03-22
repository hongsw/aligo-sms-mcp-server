# Aligo SMS MCP 서버

Model Context Protocol(MCP)를 사용하여 Aligo SMS API에 접근할 수 있는 서버입니다. Claude AI와 같은 MCP 호환 AI 에이전트가 SMS 메시지를 보내거나 관련 정보를 조회할 수 있습니다.

## 설치

```bash
# 레포지토리 클론
git clone https://github.com/your-username/aligo-sms-mcp-server.git
cd aligo-sms-mcp-server

# 의존성 설치
npm install
```

## 설정

API 키 설정은 `.garakrc` 파일에 저장됩니다. 홈 디렉토리에 다음과 같은 파일을 만듭니다:

```
apiKey=발급받은_API_키
userId=발급받은_사용자_아이디
```

## 사용 방법

### 서버 시작

```bash
# 서버 시작
npm start

# 디버그 모드로 서버 시작 (모든 로그 출력)
DEBUG=true npm start
```

### 직접 JSON-RPC 요청 보내기

서버에 직접 요청을 보내려면 파이프를 통해 JSON-RPC 요청을 전송할 수 있습니다:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | node server.js

# 디버그 모드로 실행
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | DEBUG=true node server.js
```

### 테스트 스크립트 실행

제공된 테스트 스크립트를 사용하여 서버 기능을 테스트할 수 있습니다:

```bash
# 일반 모드로 테스트
npm test

# 디버그 모드로 테스트
DEBUG=true npm test
```

이 스크립트는 초기화, SMS 전송, 남은 SMS 조회 등의 요청을 자동으로 전송합니다.

## Claude AI와 함께 사용하기

Claude AI와 함께 사용하려면 y-cli를 통해 서버를 연결해야 합니다.

```bash
y-cli chat --tool "node server.js" --tool-name "aligo-sms"
```

## 지원되는 메서드

### Initialize (초기화)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "test-client",
      "version": "1.0.0"
    }
  }
}
```

### Tools (도구 목록)

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools",
  "params": {}
}
```

### SMS 메시지 전송

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "send-sms",
  "params": {
    "sender": "01000000000",
    "receiver": "01011112222",
    "message": "테스트 메시지입니다",
    "msg_type": "LMS",
    "title": "테스트 제목"
  }
}
```

### 남은 SMS 개수 확인

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "sms-remaining",
  "params": {}
}
```

### SMS 전송 내역 조회

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "sms-history",
  "params": {
    "limit": 10,
    "page": 1
  }
}
```

## 문제 해결

서버가 예상대로 동작하지 않을 경우:

1. 콘솔 출력을 확인하여 오류 메시지 파악
2. `.garakrc` 파일의 API 키 설정 확인
3. 테스트 스크립트를 실행하여 기본 기능 테스트
4. 디버깅을 위해 `DEBUG=true` 환경 변수 설정

## 디버깅

서버의 자세한 로그를 보려면 `DEBUG=true` 환경 변수를 설정하세요:

```bash
# 디버그 모드로 서버 시작
DEBUG=true npm start

# 디버그 모드로 직접 요청 테스트
DEBUG=true node server.js

# 디버그 모드로 테스트 스크립트 실행
DEBUG=true npm test
```

디버그 모드에서는 다음과 같은 정보가 표시됩니다:

- 모든 입출력 메시지 내용
- JSON-RPC 요청 및 응답 구조
- 서버 처리 단계별 로그
- 오류 발생 시 상세 정보

## 구조

MCP 서버는 다음과 같은 구조로 이루어져 있습니다:

- `server.js`: 메인 MCP 서버 구현 - JSON-RPC 메시지 처리 및 Aligo API 연동 
- `testServer.js`: 서버 기능 테스트 스크립트

## 요구사항

- Node.js 16.x 이상
- Aligo SMS API 계정 (API 키 및 사용자 ID)
- MCP(Model Context Protocol)에 대한 기본 이해

## 기능

- Aligo API를 사용하여 SMS, LMS 및 MMS 메시지 전송
- 메시지 잔액 확인
- 메시지 내역 조회
- 다양한 형식의 메시지 지원 (텍스트, 이미지 첨부)