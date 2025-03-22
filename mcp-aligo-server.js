import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import rc from "rc";
import aligoapi from "aligoapi";

/**
 * Configuration loading from .garakrc or environment variables
 */
const config = rc("garak"); // Load config from ~/.garakrc

/**
 * AligoSMS wrapper class for MCP server
 */
class AligoSMSManager {
  constructor(authData) {
    this.authData = authData || {
      key: config.ALIGO_API_KEY,
      user_id: config.ALIGO_USER_ID,
      // Optional test mode setting
      testmode_yn: config.ALIGO_TEST_MODE || 'N'
    };
    
    // Validate required credentials
    if (!this.authData.key || !this.authData.user_id) {
      console.error("Missing Aligo API credentials. Set ALIGO_API_KEY and ALIGO_USER_ID in your .garakrc file.");
    }
  }

  /**
   * Send SMS message through Aligo API
   */
  async sendSMS(params) {
    try {
      const req = { body: params };
      return await aligoapi.send(req, this.authData);
    } catch (error) {
      console.error("Aligo SMS error:", error);
      throw error;
    }
  }

  /**
   * Check remaining SMS count
   */
  async checkRemaining() {
    try {
      const req = { body: {} };
      return await aligoapi.remain(req, this.authData);
    } catch (error) {
      console.error("Aligo remaining check error:", error);
      throw error;
    }
  }

  /**
   * Get SMS history
   */
  async getHistory(params = {}) {
    try {
      const req = { body: params };
      return await aligoapi.list(req, this.authData);
    } catch (error) {
      console.error("Aligo history error:", error);
      throw error;
    }
  }
}

// Initialize the SMS manager
const smsManager = new AligoSMSManager();

/**
 * Create an MCP server
 */
const server = new McpServer({
  name: "Aligo-SMS-MCP-Server",
  version: "1.0.0",
  description: "MCP Server for Aligo SMS API integration"
});

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
  },
  async ({ sender, receiver, message, msg_type, title, schedule_date, schedule_time }) => {
    try {
      // Prepare SMS parameters
      const smsParams = {
        sender: sender,
        receiver: receiver,
        msg: message,
      };

      // Add optional parameters if provided
      if (msg_type) smsParams.msg_type = msg_type;
      if (title) smsParams.title = title;
      if (schedule_date) smsParams.rdate = schedule_date;
      if (schedule_time) smsParams.rtime = schedule_time;
      
      // Check if LMS/MMS requires a title
      if ((msg_type === "LMS" || msg_type === "MMS") && !title) {
        return {
          content: [{ type: "text", text: "Title is required for LMS and MMS messages." }],
          error: "Missing title for LMS/MMS"
        };
      }

      // Send the SMS
      const result = await smsManager.sendSMS(smsParams);
      
      // Format the response
      return {
        content: [
          { type: "text", text: `Message sent successfully with ID: ${result.msg_id || 'Unknown'}` }
        ],
        result: result
      };
    } catch (error) {
      console.error("Error sending SMS:", error);
      return {
        content: [{ type: "text", text: `Failed to send SMS: ${error.message || "Unknown error"}` }],
        error: error.message || "Unknown error"
      };
    }
  }
);

/**
 * SMS remaining check tool
 * Returns the number of messages that can still be sent
 */
server.tool(
  "sms-remaining",
  {},
  async () => {
    try {
      const result = await smsManager.checkRemaining();
      return {
        content: [
          { type: "text", text: `You have ${result.remain_count || 0} SMS messages remaining.` }
        ],
        result: result
      };
    } catch (error) {
      console.error("Error checking remaining SMS:", error);
      return {
        content: [{ type: "text", text: `Failed to check remaining SMS: ${error.message || "Unknown error"}` }],
        error: error.message || "Unknown error"
      };
    }
  }
);

/**
 * SMS history tool
 * Returns the history of sent messages
 */
server.tool(
  "sms-history",
  {
    page: z.number().min(1).default(1).describe("Page number"),
    page_size: z.number().min(1).max(500).default(30).describe("Records per page"),
    start_date: z.string().regex(/^\d{8}$/).optional().describe("Start date (YYYYMMDD)"),
    limit_day: z.string().regex(/^\d{8}$/).optional().describe("End date (YYYYMMDD)"),
  },
  async ({ page, page_size, start_date, limit_day }) => {
    try {
      const params = {
        page: page,
        page_size: page_size
      };
      
      if (start_date) params.start_date = start_date;
      if (limit_day) params.limit_day = limit_day;
      
      const result = await smsManager.getHistory(params);
      
      // Format the response
      return {
        content: [
          { 
            type: "text", 
            text: `Retrieved ${result.list?.length || 0} SMS messages out of ${result.total_count || 0} total.` 
          }
        ],
        result: result
      };
    } catch (error) {
      console.error("Error retrieving SMS history:", error);
      return {
        content: [{ type: "text", text: `Failed to retrieve SMS history: ${error.message || "Unknown error"}` }],
        error: error.message || "Unknown error"
      };
    }
  }
);

/**
 * Add a dynamic SMS resource
 * Allows retrieving information about a specific sent message
 */
server.resource(
  "sms-message",
  new ResourceTemplate("sms://{messageId}", { list: undefined }),
  async (uri, { messageId }) => {
    try {
      // Query for a specific message details
      const req = { 
        body: { 
          mid: messageId 
        } 
      };
      
      const result = await aligoapi.smsList(req, smsManager.authData);
      
      if (!result.list || result.list.length === 0) {
        return {
          contents: [{
            uri: uri.href,
            text: `No message found with ID: ${messageId}`
          }]
        };
      }
      
      const message = result.list[0];
      
      return {
        contents: [{
          uri: uri.href,
          text: `Message ID: ${messageId}\nStatus: ${message.status}\nSent to: ${message.receiver}\nSent at: ${message.reg_date || 'Unknown'}`
        }]
      };
    } catch (error) {
      console.error("Error retrieving message details:", error);
      return {
        contents: [{
          uri: uri.href,
          text: `Error retrieving details for message ID: ${messageId}\nError: ${error.message || "Unknown error"}`
        }]
      };
    }
  }
);

// Keep the original tools for compatibility
server.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

server.tool("send-email",
  { email: z.string().email(), body: z.string().max(200) },
  async ({ email, body }) => {
    // 특정 서버로 요청을 보낼 데이터
    const token = config.GARAK_API_KEY; // API 키 가져오기
    if(!token) {
      return {
        content: [{ type: "text", text: "API 키가 없습니다. `npx hi-garak` 명령어로 API 키를 생성해주세요." }],
        error: "API 키가 없습니다."
      };
    }
    
    // 설정 파일에서 baseUrl을 가져오거나 기본값 사용
    const serverUrl = config.BASE_URL ? `${config.BASE_URL}/api/send` : "https://garak.wwwai.site/api/send";

    try {
      const response = await fetch(serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email, body })
      });

      const result = await response.json();
      if(!result.error) {
        return {
          content: [{ type: "text", text: "이메일을 성공적으로 보냈습니다." }],
          serverResponse: result
        };
      } else {
        return {
          content: [{ type: "text", text: `${result.message} 다시 시도해주세요. Error : ${result.error}` }],
          error: result.message
        };
      }
    } catch (error) {
      console.error(error);
      return {
        content: [{ type: "text", text: "이메일 전송 중 오류가 발생했습니다." }],
        error: error.message
      };
    }
  }
);

server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);

// Start the MCP server
const transport = new StdioServerTransport();
await server.connect(transport);