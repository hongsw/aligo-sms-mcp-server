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
ALIGO_API_KEY=발급받은_API_키
ALIGO_USER_ID=발급받은_사용자_아이디
ALIGO_TEST_MODE=Y  # 테스트 모드 (Y/N)
```

## 사용 방법

### 서버 시작

```bash
# 서버 시작
node startServer.js

# 디버그 모드로 서버 시작 (모든 로그 출력)
DEBUG=true node startServer.js
```

서버가 시작되면 PID와 함께 서버가 실행 중임을 알려주는 메시지가 표시됩니다.

### 직접 JSON-RPC 요청 보내기

서버에 직접 요청을 보내려면 파이프를 통해 JSON-RPC 요청을 전송할 수 있습니다:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | node mcpServer.js

# 디버그 모드로 실행
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | DEBUG=true node mcpServer.js
```

### 테스트 스크립트 실행

제공된 테스트 스크립트를 사용하여 서버 기능을 테스트할 수 있습니다:

```bash
# 일반 모드로 테스트
node testServer.js

# 디버그 모드로 테스트
DEBUG=true node testServer.js
```

이 스크립트는 초기화, SMS 전송, 남은 SMS 조회 등의 요청을 자동으로 전송합니다.

## Claude AI와 함께 사용하기

Claude AI와 함께 사용하려면 y-cli를 통해 서버를 연결해야 합니다.

1. 먼저 서버를 시작합니다:
   ```bash
   node startServer.js
   ```

2. 다른 터미널에서 Claude와 대화하면서 MCP 도구에 접근합니다:
   ```bash
   y-cli chat --tool "node mcpServer.js" --tool-name "aligo-sms"
   ```

## 지원되는 도구

### SMS 메시지 전송

```json
{
  "jsonrpc": "2.0",
  "id": 1,
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
  "id": 1,
  "method": "sms-remaining",
  "params": {}
}
```

### SMS 전송 내역 조회

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sms-history",
  "params": {
    "page": 1,
    "page_size": 10
  }
}
```

## 프로그래밍 방식으로 서버 사용하기

Node.js 애플리케이션에서 서버를 시작하려면:

```javascript
import { startServer } from './startServer.js';

// 서버 시작
startServer()
  .then(() => {
    console.log('서버가 성공적으로 시작되었습니다.');
  })
  .catch(error => {
    console.error('서버 시작 오류:', error);
  });
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
DEBUG=true node startServer.js

# 디버그 모드로 직접 요청 테스트
DEBUG=true node mcpServer.js

# 디버그 모드로 테스트 스크립트 실행
DEBUG=true node testServer.js
```

디버그 모드에서는 다음과 같은 정보가 표시됩니다:

- 모든 입출력 메시지 내용
- JSON-RPC 요청 및 응답 구조
- 서버 처리 단계별 로그
- 오류 발생 시 상세 정보

## 개발 참고사항

MCP 서버는 다음과 같은 구조로 이루어져 있습니다:

- `index.js`: 메인 MCP 서버 구현
- `mcpServer.js`: MCP 통신을 처리하는 래퍼 스크립트
- `startServer.js`: 서버를 쉽게 시작할 수 있는 유틸리티
- `testServer.js`: 서버 기능 테스트 스크립트

도구는 다음과 같이 등록됩니다:

```javascript
server.tool(
  "send-sms",
  {
    sender: z.string().min(1).max(16).describe("Sender's phone number"),
    receiver: z.string().min(1).describe("Recipient's phone number"),
    message: z.string().min(1).max(2000).describe("SMS message content"),
    // ... 추가 파라미터 ...
  },
  async ({ sender, receiver, message, /* ... */ }) => {
    // 도구 구현 로직
    return {
      content: [{ type: "text", text: "결과 메시지" }],
      result: { /* 결과 데이터 */ }
    };
  }
);
```

## Features

- Send SMS, LMS, and MMS messages using Aligo API
- Schedule messages for future delivery
- Check remaining message balance
- Retrieve message history
- Query specific message details

## Prerequisites

- Node.js 16.x or higher
- An Aligo API account with API key and user ID
- Basic understanding of MCP (Model Context Protocol)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/hongsw/aligo-sms-mcp-server.git
   cd aligo-sms-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your Aligo API credentials:
   
   Create a `.garakrc` file in your home directory with the following content:
   ```
   ALIGO_API_KEY=your_api_key
   ALIGO_USER_ID=your_user_id
   ALIGO_TEST_MODE=Y  # Optional: Use 'Y' for test mode
   ```

## Usage

### Starting the MCP server

```bash
npm start
```

This will start the MCP server that listens for commands on stdin and responds on stdout. It can be connected to AI assistants or other clients that support the MCP protocol.

### Available Tools

#### 1. send-sms

Sends SMS, LMS, or MMS messages.

Parameters:
- `sender` (string): Registered sender's phone number
- `receiver` (string): Recipient's phone number(s), comma-separated for multiple recipients
- `message` (string): SMS message content
- `msg_type` (string, optional): Message type - 'SMS', 'LMS', or 'MMS'
- `title` (string, optional): Message title (required for LMS/MMS)
- `schedule_date` (string, optional): Scheduled date in YYYYMMDD format
- `schedule_time` (string, optional): Scheduled time in HHMM format

Example request:
```json
{
  "tool": "send-sms",
  "parameters": {
    "sender": "01012345678",
    "receiver": "01098765432",
    "message": "Hello, this is a test message!",
    "msg_type": "SMS"
  }
}
```

#### 2. sms-remaining

Checks the remaining message balance in your Aligo account.

Example request:
```json
{
  "tool": "sms-remaining",
  "parameters": {}
}
```

#### 3. sms-history

Retrieves the history of sent messages.

Parameters:
- `page` (number, optional): Page number for pagination (default: 1)
- `page_size` (number, optional): Records per page (default: 30, max: 500)
- `start_date` (string, optional): Start date in YYYYMMDD format
- `limit_day` (string, optional): End date in YYYYMMDD format

Example request:
```json
{
  "tool": "sms-history",
  "parameters": {
    "page": 1,
    "page_size": 50,
    "start_date": "20250301",
    "limit_day": "20250331"
  }
}
```

### Available Resources

#### sms-message

Retrieves details about a specific message.

URI pattern: `sms://{messageId}`

Example:
```
sms://MSG12345678
```

## Integration with AI Assistants

This MCP server is designed to be integrated with AI assistants that support the Model Context Protocol. The server handles stdin/stdout communication, making it compatible with various MCP client implementations.

To use with OpenAI's function calling:

1. Start the MCP server
2. Use an MCP client to connect your AI assistant to the server
3. The AI assistant can now use the tools and resources defined in the server

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Aligo for providing the SMS API
- Model Context Protocol for standardizing tool and resource access