#!/usr/bin/env node

/**
 * MCP Server for Aligo SMS API
 * Allows sending SMS messages through Aligo API
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import rc from "rc";
import axios from 'axios';
import FormData from 'form-data';
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
 * 직접 Aligo API 요청을 보내는 함수 (axios 사용)
 */
async function sendAligoSMS(params, authData) {
  try {
    const apiUrl = 'https://apis.aligo.in/send/';
    
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
      if (!fs.existsSync(params.image_path)) {
        throw new Error(`이미지 파일을 찾을 수 없습니다: ${params.image_path}`);
      }
      
      // FormData 사용하여 multipart/form-data 요청 생성
      const form = new FormData();
      
      // 텍스트 필드 추가
      Object.keys(postData).forEach(key => {
        form.append(key, postData[key]);
      });
      
      // 이미지 파일 추가
      const fileStream = fs.createReadStream(params.image_path);
      const fileName = path.basename(params.image_path);
      form.append('image', fileStream, {
        filename: fileName,
        contentType: getMimeType(fileName)
      });
      
      // axios로 요청 전송
      const response = await axios.post(apiUrl, form, {
        headers: {
          ...form.getHeaders()
        },
        timeout: 30000 // 30초 타임아웃
      });
      
      debug('API 응답:', response.data);
      return response.data;
      
    } else {
      // 일반 텍스트 메시지 (MMS가 아니거나 이미지가 없는 경우)
      const response = await axios.post(apiUrl, postData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000 // 30초 타임아웃
      });
      
      debug('API 응답:', response.data);
      return response.data;
    }
  } catch (error) {
    debug('알리고 SMS 전송 오류:', error);
    if (error.response) {
      // 서버가 응답을 반환한 경우
      debug('응답 상태:', error.response.status);
      debug('응답 데이터:', error.response.data);
      throw new Error(`API 오류: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // 요청이 전송되었지만 응답을 받지 못한 경우
      throw new Error('API 서버로부터 응답을 받지 못했습니다.');
    } else {
      // 요청 설정 중 오류가 발생한 경우
      throw error;
    }
  }
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
  "Send SMS messages through the Aligo API",
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
