import { jest } from '@jest/globals';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Mock aligoapi
const mockAligoApi = {
  send: jest.fn(),
  remain: jest.fn(),
  list: jest.fn()
};

jest.mock('aligoapi', () => mockAligoApi);

// Mock rc
jest.mock('rc', () => () => ({
  ALIGO_API_KEY: 'test-api-key',
  ALIGO_USER_ID: 'test-user-id',
  ALIGO_TEST_MODE: 'Y'
}));

describe('Aligo SMS MCP Server Tests', () => {
  let server;
  let mockSendResponse;
  let mockRemainResponse;
  let mockHistoryResponse;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock responses
    mockSendResponse = {
      msg_id: 'test-msg-id',
      success_cnt: 1,
      error_cnt: 0,
    };

    mockRemainResponse = {
      remain_count: 100,
    };

    mockHistoryResponse = {
      list: [
        {
          msg_id: 'test-msg-id',
          sender: '01012345678',
          receiver: '01087654321',
          msg: 'Test message',
          reg_date: '2024-03-20 10:00:00'
        }
      ],
      total_count: 1
    };

    // Setup aligoapi mocks
    mockAligoApi.send.mockResolvedValue(mockSendResponse);
    mockAligoApi.remain.mockResolvedValue(mockRemainResponse);
    mockAligoApi.list.mockResolvedValue(mockHistoryResponse);

    // Import server module
    const { default: createServer } = await import('../mcp-aligo-server.js');
    server = createServer;

    // Register tools
    server.tool(
      "send-sms",
      {
        sender: z.string().min(1).max(16).describe("Sender's phone number"),
        receiver: z.string().min(1).describe("Recipient's phone number"),
        message: z.string().min(1).max(2000).describe("SMS message content"),
        msg_type: z.enum(["SMS", "LMS", "MMS"]).optional().describe("Message type"),
        title: z.string().max(44).optional().describe("Message title"),
      },
      async ({ sender, receiver, message, msg_type, title }) => {
        if ((msg_type === "LMS" || msg_type === "MMS") && !title) {
          return {
            content: [{ type: "text", text: "Title is required for LMS and MMS messages." }],
            error: "Missing title for LMS/MMS"
          };
        }

        const smsParams = {
          sender,
          receiver,
          msg: message,
          msg_type,
          title
        };

        const result = await mockAligoApi.send({ body: smsParams });
        return {
          content: [{ type: "text", text: `Message sent successfully with ID: ${result.msg_id}` }],
          result
        };
      }
    );

    server.tool(
      "sms-remaining",
      {},
      async () => {
        const result = await mockAligoApi.remain({ body: {} });
        return {
          content: [{ type: "text", text: `You have ${result.remain_count} SMS messages remaining.` }],
          result
        };
      }
    );

    server.tool(
      "sms-history",
      {
        page: z.number().min(1).default(1).describe("Page number"),
        page_size: z.number().min(1).max(500).default(30).describe("Records per page"),
        start_date: z.string().regex(/^\d{8}$/).optional().describe("Start date (YYYYMMDD)"),
        limit_day: z.string().regex(/^\d{8}$/).optional().describe("End date (YYYYMMDD)"),
      },
      async ({ page, page_size, start_date, limit_day }) => {
        const params = {
          page,
          page_size,
          start_date,
          limit_day
        };
        
        const result = await mockAligoApi.list({ body: params });
        return {
          content: [{ type: "text", text: `Retrieved ${result.list?.length || 0} SMS messages out of ${result.total_count || 0} total.` }],
          result
        };
      }
    );
  });

  describe('send-sms Tool', () => {
    test('should send SMS successfully', async () => {
      const params = {
        sender: '01012345678',
        receiver: '01087654321',
        message: 'Test message'
      };

      const result = await server.tools['send-sms'].handler(params);
      
      expect(mockAligoApi.send).toHaveBeenCalled();
      expect(result.result).toEqual(mockSendResponse);
      expect(result.content[0].text).toContain('test-msg-id');
    });

    test('should handle LMS message with title', async () => {
      const params = {
        sender: '01012345678',
        receiver: '01087654321',
        message: 'Test long message',
        msg_type: 'LMS',
        title: 'Test Title'
      };

      const result = await server.tools['send-sms'].handler(params);
      
      expect(mockAligoApi.send).toHaveBeenCalled();
      expect(result.result).toEqual(mockSendResponse);
    });

    test('should fail when LMS has no title', async () => {
      const params = {
        sender: '01012345678',
        receiver: '01087654321',
        message: 'Test long message',
        msg_type: 'LMS'
      };

      const result = await server.tools['send-sms'].handler(params);
      
      expect(result.error).toBe('Missing title for LMS/MMS');
    });
  });

  describe('sms-remaining Tool', () => {
    test('should check remaining SMS count', async () => {
      const result = await server.tools['sms-remaining'].handler({});
      
      expect(mockAligoApi.remain).toHaveBeenCalled();
      expect(result.result).toEqual(mockRemainResponse);
      expect(result.content[0].text).toContain('100');
    });
  });

  describe('sms-history Tool', () => {
    test('should retrieve SMS history', async () => {
      const params = {
        page: 1,
        page_size: 30
      };

      const result = await server.tools['sms-history'].handler(params);
      
      expect(mockAligoApi.list).toHaveBeenCalled();
      expect(result.result).toEqual(mockHistoryResponse);
      expect(result.content[0].text).toContain('1');
    });

    test('should handle date filters', async () => {
      const params = {
        page: 1,
        page_size: 30,
        start_date: '20240301',
        limit_day: '20240320'
      };

      const result = await server.tools['sms-history'].handler(params);
      
      expect(mockAligoApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            start_date: '20240301',
            limit_day: '20240320'
          })
        }),
        expect.any(Object)
      );
    });
  });
}); 