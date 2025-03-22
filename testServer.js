/**
 * MCP 서버 테스트 스크립트
 * 이 파일을 실행하여 Aligo SMS MCP 서버에 직접 요청을 보냅니다.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// 디버그 모드 설정
const DEBUG = process.env.DEBUG === 'true';

// 디버그 로그 함수
function debug(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

// __dirname 설정 (ES 모듈에서는 자동으로 제공되지 않음)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 서버 스크립트 경로
const serverScriptPath = path.join(__dirname, 'server.js');

// 테스트할 요청 정의
const testRequests = [
  // initialize 요청
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  },
  // tools 메서드 요청 (도구 목록)
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools",
    params: {}
  },
  // send-sms 요청
  {
    jsonrpc: "2.0",
    id: 3,
    method: "send-sms",
    params: {
      sender: "01000000000",
      receiver: "01011112222",
      message: "테스트 메시지입니다",
      msg_type: "LMS",
      title: "테스트 제목"
    }
  },
  // sms-remaining 요청
  {
    jsonrpc: "2.0",
    id: 4,
    method: "sms-remaining",
    params: {}
  }
];

/**
 * 서버 테스트 함수
 */
async function testServer() {
  console.log("MCP 서버 테스트를 시작합니다...");
  
  // 서버 프로세스 생성
  const serverProcess = spawn('node', [serverScriptPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { ...process.env, DEBUG: process.env.DEBUG }  // DEBUG 환경 변수 전달
  });
  
  // 각 요청에 대한 결과 저장
  const results = [];
  
  // 응답 리스너 설정
  serverProcess.stdout.on('data', (data) => {
    const response = data.toString().trim();
    console.log("\n응답 받음:");
    console.log(response);
    
    try {
      const parsedResponse = JSON.parse(response);
      results.push(parsedResponse);
      
      // 모든 요청이 처리되었는지 확인
      if (results.length >= testRequests.length) {
        console.log("\n모든 테스트가 완료되었습니다.");
        
        // 테스트 결과 요약 출력
        console.log("\n테스트 결과 요약:");
        for (let i = 0; i < results.length; i++) {
          const req = testRequests[i];
          const res = results[i];
          
          console.log(`\n[요청 ${i+1}] ${req.method}`);
          if (res.error) {
            console.log(`- 오류: ${res.error.message} (코드: ${res.error.code})`);
          } else {
            const resultStr = JSON.stringify(res.result).substring(0, 100);
            console.log(`- 성공: ${resultStr}${resultStr.length >= 100 ? '...' : ''}`);
          }
        }
        
        // 상세 로그 출력 (디버그 모드일 때만)
        debug("\n상세 요청/응답 로그:");
        for (let i = 0; i < results.length; i++) {
          const req = testRequests[i];
          const res = results[i];
          
          debug(`\n[요청 ${i+1}] ${req.method}`);
          debug("요청 데이터:", JSON.stringify(req, null, 2));
          debug("응답 데이터:", JSON.stringify(res, null, 2));
        }
        
        // 서버 종료
        serverProcess.kill();
        console.log("\n테스트가 완료되었습니다.");
      }
    } catch (error) {
      console.error("응답 파싱 오류:", error);
    }
  });
  
  // 오류 처리
  serverProcess.on('error', (error) => {
    console.error("서버 프로세스 오류:", error);
  });
  
  // 서버가 시작될 때까지 잠시 대기
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 각 요청을 순차적으로 전송
  for (const request of testRequests) {
    console.log("\n요청 전송:");
    console.log(JSON.stringify(request, null, 2));
    
    // 요청 전송
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    
    // 다음 요청 전 잠시 대기 (응답을 기다림)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// 테스트 실행
testServer().catch(error => {
  console.error("테스트 중 오류 발생:", error);
  process.exit(1);
}); 