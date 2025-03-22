#!/usr/bin/env node

/**
 * MCP Server for Aligo SMS API
 * Allows sending SMS messages through Aligo API
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import rc from "rc";
import https from 'https';
import querystring from 'querystring';
import fs from 'fs';
import path from 'path';

/**
 * Configuration loading from .garakrc or environment variables
 */
const config = rc("garak"); // Load config from ~/.garakrc

// 맨 위에 디버그 로깅 헬퍼 함수 추가
const DEBUG = process.env.DEBUG === 'true';

// 디버그 로그 함수
function debug(...args) {
  if (DEBUG) {
    console.error(...args);
  }
}

/**
 * Create an MCP server
 */
const server = new McpServer({
  name: "Aligo-SMS-MCP-Server",
  version: "1.0.0",
  description: "MCP Server for Aligo SMS API integration"
});

/**
 * 직접 Aligo API 요청을 보내는 함수
 */
async function sendAligoSMS(params, authData) {
  return new Promise((resolve, reject) => {
    try {
      // 기본 POST 데이터 준비
      const postData = {
        key: authData.apiKey,
        user_id: authData.userId,
        sender: params.sender,
        receiver: params.receiver,
        msg: params.message,
        testmode_yn: authData.testMode ? 'Y' : 'N'
      };
      
      // 선택적 파라미터 추가
      if (params.msg_type === 'LMS' || params.msg_type === 'MMS') {
        postData.title = params.title;
      }
      
      if (params.destination) {
        postData.destination = params.destination;
      }
      
      if (params.schedule_date) {
        postData.rdate = params.schedule_date;
      }
      
      if (params.schedule_time) {
        postData.rtime = params.schedule_time;
      }
      
      // 이미지 첨부가 필요한 경우 (MMS)
      if (params.msg_type === 'MMS' && params.image_path) {
        // MMS 이미지 파일이 있는 경우
        const boundaryKey = `----WebKitFormBoundary${Math.random().toString(16).slice(2)}`;
        const CRLF = '\r\n';
        
        // 폼 바디 데이터 구성
        let formBody = [];
        
        // 일반 텍스트 필드 추가
        Object.keys(postData).forEach(key => {
          const value = postData[key];
          formBody.push(`--${boundaryKey}`);
          formBody.push(`Content-Disposition: form-data; name="${key}"`);
          formBody.push('');
          formBody.push(value);
        });
        
        // 이미지 파일 추가
        if (fs.existsSync(params.image_path)) {
          const fileContent = fs.readFileSync(params.image_path);
          const fileName = path.basename(params.image_path);
          
          formBody.push(`--${boundaryKey}`);
          formBody.push(`Content-Disposition: form-data; name="image"; filename="${fileName}"`);
          formBody.push(`Content-Type: ${getMimeType(fileName)}`);
          formBody.push('');
          
          // 텍스트 부분과 파일 부분을 합치기
          const textPart = formBody.join(CRLF);
          const endPart = `${CRLF}--${boundaryKey}--${CRLF}`;
          
          // 바이너리와 텍스트 부분을 결합
          const dataBuffer = Buffer.concat([
            Buffer.from(textPart + CRLF, 'utf8'),
            fileContent,
            Buffer.from(endPart, 'utf8')
          ]);
          
          // 요청 옵션
          const options = {
            hostname: 'apis.aligo.in',
            port: 443,
            path: '/send/',
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundaryKey}`,
              'Content-Length': dataBuffer.length
            }
          };
          
          // HTTPS 요청 생성
          const req = https.request(options, res => {
            let responseData = '';
            
            res.on('data', chunk => {
              responseData += chunk;
            });
            
            res.on('end', () => {
              try {
                const parsedData = JSON.parse(responseData);
                resolve(parsedData);
              } catch (error) {
                debug('응답 파싱 오류:', error);
                resolve(responseData); // 파싱 실패 시 원본 데이터 반환
              }
            });
          });
          
          // 요청 오류 처리
          req.on('error', error => {
            debug('요청 오류:', error);
            reject(error);
          });
          
          // 데이터 전송
          req.write(dataBuffer);
          req.end();
        } else {
          reject(new Error(`이미지 파일을 찾을 수 없습니다: ${params.image_path}`));
        }
      } else {
        // 일반 텍스트 메시지 (MMS가 아니거나 이미지가 없는 경우)
        const postDataString = querystring.stringify(postData);
        
        // 요청 옵션
        const options = {
          hostname: 'apis.aligo.in',
          port: 443,
          path: '/send/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postDataString)
          }
        };
        
        // HTTPS 요청 생성
        const req = https.request(options, res => {
          let responseData = '';
          
          res.on('data', chunk => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsedData = JSON.parse(responseData);
              resolve(parsedData);
            } catch (error) {
              debug('응답 파싱 오류:', error);
              resolve(responseData); // 파싱 실패 시 원본 데이터 반환
            }
          });
        });
        
        // 요청 오류 처리
        req.on('error', error => {
          debug('요청 오류:', error);
          reject(error);
        });
        
        // 데이터 전송
        req.write(postDataString);
        req.end();
      }
    } catch (error) {
      debug('알리고 SMS 전송 오류:', error);
      reject(error);
    }
  });
}

/**
 * 파일 확장자별 MIME 타입 반환
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * SMS sending tool
 * Allows sending SMS messages through the Aligo API
 */
server.tool(
  "send-sms",
  {
    sender: z.string().min(1).max(16).describe("Sender's phone number (registered with Aligo)"),
    receiver: z.string().min(1).describe("Recipient's phone number, or comma-separated list for multiple recipients"),
    message: z.string().min(1).max(2000).describe("SMS message content"),
    msg_type: z.enum(["SMS", "LMS", "MMS"]).optional().describe("Message type: SMS, LMS, or MMS"),
    title: z.string().max(44).optional().describe("Message title (required for LMS/MMS)"),
    schedule_date: z.string().regex(/^\d{8}$/).optional().describe("Optional schedule date (YYYYMMDD)"),
    schedule_time: z.string().regex(/^\d{4}$/).optional().describe("Optional schedule time (HHMM)"),
    destination: z.string().optional().describe("Optional formatted destination with names (01011112222|홍길동,01033334444|아무개)"),
    image_path: z.string().optional().describe("Optional image file path for MMS")
  },
  async ({ sender, receiver, message, msg_type, title, schedule_date, schedule_time, destination, image_path }) => {
    debug("send-sms 메서드 호출됨", { sender, receiver, message });
    
    try {
      // Check if LMS/MMS requires a title
      if ((msg_type === "LMS" || msg_type === "MMS") && !title) {
        return {
          content: [{ type: "text", text: "제목이 필요합니다: LMS와 MMS 메시지는 제목이 필수입니다." }],
          error: "제목 누락 (LMS/MMS)"
        };
      }

      const authData = {
        apiKey: config.ALIGO_API_KEY,
        userId: config.ALIGO_USER_ID,
        testMode: config.ALIGO_TEST_MODE === 'Y'
      };
      
      const params = {
        sender,
        receiver,
        message,
        msg_type: msg_type || "SMS",
        title,
        schedule_date,
        schedule_time,
        destination,
        image_path
      };

      debug("authData", authData);
      debug("params", params);
      
      // 직접 구현한 함수로 SMS 전송
      const result = await sendAligoSMS(params, authData);
      debug("API 응답:", result);
      
      // 응답 형식화
      return {
        content: [
          { type: "text", text: `메시지 전송 성공: ${result.msg_id ? '메시지 ID ' + result.msg_id : result.message || '전송 완료'}` }
        ],
        result: result
      };
    } catch (error) {
      console.error("Error sending SMS:", error);
      return {
        content: [{ type: "text", text: `메시지 전송 실패: ${error.message || "알 수 없는 오류"}` }],
        error: error.message || "알 수 없는 오류"
      };
    }
  }
);

// 프로그램의 메인 함수
async function main() {
  // 도구 등록 로그 출력
  debug("서버에 등록된 도구:");
  debug("send-sms - 알리고 API를 통한 SMS 발송");
  debug("sms-remaining - 알리고 계정 잔여 SMS 수 확인");
  debug("sms-history - SMS 발송 내역 조회");
  
  // 등록된 도구 목록 확인
  const tools = server._registeredTools;
  if (tools) {
    const toolNames = Object.keys(tools);
    debug(`등록된 도구 목록: ${toolNames.join(', ')}`);
  } else {
    debug("등록된 도구가 없습니다.");
  }
  
  // 등록된 리소스 목록 확인
  const resources = server._registeredResources;
  if (resources) {
    const resourceNames = Object.keys(resources);
    debug(`등록된 리소스 목록: ${resourceNames.join(', ')}`);
  } else {
    debug("등록된 리소스가 없습니다.");
  }
  
  // MCP 서버 연결
  try {
    debug("서버를 트랜스포트에 연결 시도 중...");
    await server.connect(new StdioServerTransport());
    debug("서버가 트랜스포트에 성공적으로 연결되었습니다.");
  } catch (error) {
    debug("서버 연결 실패:", error);
  }
}

// 메인 함수 실행
main().catch(error => {
  console.error("프로그램 실행 오류:", error);
});
