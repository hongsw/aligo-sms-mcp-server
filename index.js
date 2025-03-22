/**
 * Aligo SMS MCP 서버
 * 
 * 이 서버는 클라이언트가 Aligo SMS 서비스와 상호작용할 수 있는 JSON-RPC 기반 MCP(Model Context Protocol) 인터페이스를 제공합니다.
 */

import https from 'https';
import querystring from 'querystring';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import rc from 'rc';

// 디버그 모드 설정
const DEBUG = process.env.DEBUG === 'true';

// 디버그 로그 함수
function debug(...args) {
  if (DEBUG) {
    console.error(...args);
  }
}

// __dirname 설정 (ES 모듈에서는 자동으로 제공되지 않음)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 설정 로드
const config = rc('garak', {
  apiKey: '',
  userId: ''
});

// 서버 메타데이터
const serverInfo = {
  name: "aligo-sms-mcp-server",
  version: "1.0.0",
  vendor: "Aligo SMS API",
  description: "MCP 서버로 Aligo SMS API와 연동합니다"
};

// 사용 가능한 도구 목록
const availableTools = [
  {
    name: "send-sms",
    description: "Aligo SMS API를 통해 SMS/LMS/MMS 메시지를 전송합니다",
    parameters: {
      type: "object",
      properties: {
        sender: {
          type: "string",
          description: "발신자 전화번호 (필수)"
        },
        receiver: {
          type: "string",
          description: "수신자 전화번호 (필수)"
        },
        message: {
          type: "string",
          description: "보낼 메시지 내용 (필수)"
        },
        msg_type: {
          type: "string",
          description: "메시지 유형 (SMS, LMS, MMS)",
          enum: ["SMS", "LMS", "MMS"],
          default: "SMS"
        },
        title: {
          type: "string",
          description: "LMS/MMS 메시지의 제목 (선택사항)"
        },
        image_path: {
          type: "string",
          description: "MMS 이미지 파일 경로 (MMS인 경우 필수)"
        }
      },
      required: ["sender", "receiver", "message"]
    }
  },
  {
    name: "sms-remaining",
    description: "Aligo SMS API를 통해 계정의 남은 SMS 포인트를 확인합니다",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "sms-history",
    description: "Aligo SMS API를 통해 최근 전송한 SMS 이력을 조회합니다",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "조회할 최대 항목 수 (기본값: 10)",
          default: 10
        },
        page: {
          type: "number",
          description: "조회할 페이지 번호 (기본값: 1)",
          default: 1
        }
      }
    }
  }
];

/**
 * Aligo SMS API를 통해 SMS/LMS/MMS를 전송하는 함수
 */
async function sendAligoSMS(params) {
  return new Promise((resolve, reject) => {
    try {
      // 필수 매개변수 검증
      if (!params.sender || !params.receiver || !params.message) {
        return reject(new Error('필수 매개변수(sender, receiver, message)가 누락되었습니다'));
      }

      // API 인증 정보
      if (!config.userId || !config.apiKey) {
        return reject(new Error('API 인증 정보(userId, apiKey)가 설정되지 않았습니다'));
      }

      // 기본 POST 데이터 설정
      const postData = {
        key: config.apiKey,
        user_id: config.userId,
        sender: params.sender,
        receiver: params.receiver,
        msg: params.message,
        msg_type: params.msg_type || 'SMS' // 기본값은 SMS
      };

      // LMS/MMS 제목 설정 (있는 경우)
      if (params.title && (params.msg_type === 'LMS' || params.msg_type === 'MMS')) {
        postData.title = params.title;
      }

      let requestOptions = {
        hostname: 'apis.aligo.in',
        port: 443,
        path: '/send/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      // MMS인 경우 이미지 파일 처리
      if (params.msg_type === 'MMS' && params.image_path) {
        // 파일 존재 확인
        if (!fs.existsSync(params.image_path)) {
          return reject(new Error(`이미지 파일을 찾을 수 없습니다: ${params.image_path}`));
        }

        // 대안: 헤더 Content-Type을 application/x-www-form-urlencoded로 설정하고
        // 파일 데이터를 base64로 인코딩하여 전송 (Aligo API가 지원하는 경우)
        // 이 부분은 Aligo API 명세에 따라 수정 필요
        postData.image = fs.readFileSync(params.image_path, { encoding: 'base64' });
      }

      debug('Aligo SMS API 요청 생성:', requestOptions);
      debug('POST 데이터:', postData);

      // HTTPS 요청 생성
      const req = https.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const responseData = JSON.parse(data);
            debug('Aligo SMS API 응답:', responseData);
            resolve(responseData);
          } catch (error) {
            debug('Aligo SMS API 응답 파싱 오류:', error);
            reject(new Error(`응답 파싱 오류: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        debug('Aligo SMS API 요청 오류:', error);
        reject(error);
      });

      // 요청 데이터 전송
      req.write(querystring.stringify(postData));
      req.end();
    } catch (error) {
      debug('sendAligoSMS 함수 오류:', error);
      reject(error);
    }
  });
}

/**
 * 파일 확장자를 기반으로 MIME 타입을 반환
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 요청 처리 함수
 */
async function handleRequest(request) {
  debug('요청 수신:', JSON.stringify(request, null, 2));
  
  const { method, params, id } = request;
  
  try {
    // JSON-RPC 응답 템플릿
    const response = {
      jsonrpc: "2.0",
      id
    };
    
    // 메서드별 처리
    switch (method) {
      // 초기화 메서드 처리
      case 'initialize': {
        debug('initialize 메서드 처리');
        response.result = {
          serverInfo,
          capabilities: {
            // 서버 기능 명시
            listTools: true,
            callTools: true
          }
        };
        break;
      }
      
      // 도구 목록 메서드 처리
      case 'tools': {
        debug('tools 메서드 처리');
        response.result = availableTools;
        break;
      }
      
      // SMS 전송 메서드 처리
      case 'send-sms': {
        debug('send-sms 메서드 처리', params);
        
        try {
          const result = await sendAligoSMS(params);
          response.result = {
            success: true,
            data: result
          };
        } catch (error) {
          response.error = {
            code: -32000,
            message: `SMS 전송 오류: ${error.message}`
          };
        }
        break;
      }
      
      // 남은 SMS 포인트 조회 메서드 처리
      case 'sms-remaining': {
        debug('sms-remaining 메서드 처리');
        
        // 임시 응답
        response.result = {
          success: true,
          data: {
            remaining_sms: 1000
          }
        };
        
        // TODO: Aligo API 연동 추가
        break;
      }
      
      // SMS 이력 조회 메서드 처리
      case 'sms-history': {
        debug('sms-history 메서드 처리', params);
        
        // 임시 응답
        response.result = {
          success: true,
          data: {
            total: 10,
            items: [
              { id: 1, sender: "01012345678", receiver: "01087654321", message: "테스트 메시지", sent_at: new Date().toISOString() }
            ]
          }
        };
        
        // TODO: Aligo API 연동 추가
        break;
      }
      
      // 지원하지 않는 메서드
      default: {
        debug(`지원하지 않는 메서드: ${method}`);
        response.error = {
          code: -32601,
          message: "Method not found"
        };
      }
    }
    
    debug('응답 반환:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    debug('요청 처리 오류:', error);
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`
      }
    };
  }
}

/**
 * 서버 실행 함수
 */
function main() {
  process.stdin.setEncoding('utf8');
  
  // 스트림 버퍼링 방지
  process.stdin.on('data', async (data) => {
    const inputLine = data.toString().trim();
    debug('원시 입력 데이터 수신:', inputLine);
    
    try {
      // 각 줄을 개별 JSON 메시지로 처리
      if (inputLine) {
        debug('입력 라인 처리:', inputLine);
        
        try {
          const request = JSON.parse(inputLine);
          const response = await handleRequest(request);
          console.log(JSON.stringify(response));
        } catch (parseError) {
          debug('JSON 파싱 오류:', parseError);
          
          // 유효하지 않은 JSON에 대한 오류 응답
          const errorResponse = {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: `Parse error: ${parseError.message}`
            }
          };
          
          console.log(JSON.stringify(errorResponse));
        }
      }
    } catch (error) {
      debug('입력 처리 오류:', error);
      
      // 일반적인 오류 응답
      const errorResponse = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`
        }
      };
      
      console.log(JSON.stringify(errorResponse));
    }
  });
  
  // 처리되지 않은 예외 처리
  process.on('uncaughtException', (error) => {
    debug('처리되지 않은 예외:', error);
    
    // 일반적인 오류 응답
    const errorResponse = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`
      }
    };
    
    console.log(JSON.stringify(errorResponse));
  });
  
  // 종료 신호 처리
  process.on('SIGINT', () => {
    debug('SIGINT 신호 수신, 서버를 종료합니다');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    debug('SIGTERM 신호 수신, 서버를 종료합니다');
    process.exit(0);
  });
  
  debug('MCP 서버가 시작되었습니다. 표준 입력을 통해 JSON-RPC 요청을 대기 중...');
}

// 서버 시작
main(); 