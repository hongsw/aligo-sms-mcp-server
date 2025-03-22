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

## 설치 npx

```bash
npx -y github:hongsw/aligo-sms-mcp-server
```

## 설정

API 키 설정은 `.garakrc` 파일에 저장됩니다. 홈 디렉토리에 다음과 같은 파일을 만듭니다:

```
apiKey=발급받은_API_키
userId=발급받은_사용자_아이디
```



## 구조

MCP 서버는 다음과 같은 구조로 이루어져 있습니다:

- `server.js`: 메인 MCP 서버 구현 - JSON-RPC 메시지 처리 및 Aligo API 연동 

## 요구사항

- Node.js 16.x 이상
- Aligo SMS API 계정 (API 키 및 사용자 ID)
- MCP(Model Context Protocol)에 대한 기본 이해

## 기능

- Aligo API를 사용하여 SMS, LMS 및 MMS 메시지 전송
- 메시지 잔액 확인
- 메시지 내역 조회
- 다양한 형식의 메시지 지원 (텍스트, 이미지 첨부)