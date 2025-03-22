import { jest } from '@jest/globals';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import aligoapi from "aligoapi";

// Mock aligoapi
jest.mock('aligoapi');

describe('Aligo SMS MCP Server Tests', () => {
  let server;
  let mockSendResponse;
  let mockRemainResponse;
  let mockHistoryResponse;

  beforeEach(() => {
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
    aligoapi.send.mockResolvedValue(mockSendResponse);
    aligoapi.remain.mockResolvedValue(mockRemainResponse);
    aligoapi.list.mockResolvedValue(mockHistoryResponse);

    // Initialize server
    server = new McpServer({
      name: "Aligo-SMS-MCP-Server-Test",
      version: "1.0.0",
      description: "Test MCP Server for Aligo SMS API"
    });
  });

  describe('send-sms Tool', () => {
    test('should send SMS successfully', async () => {
      const params = {
        sender: '01012345678',
        receiver: '01087654321',
        message: 'Test message'
      };

      const result = await server.tools['send-sms'].handler(params);
      
      expect(aligoapi.send).toHaveBeenCalled();
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
      
      expect(aligoapi.send).toHaveBeenCalled();
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
      
      expect(aligoapi.remain).toHaveBeenCalled();
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
      
      expect(aligoapi.list).toHaveBeenCalled();
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
      
      expect(aligoapi.list).toHaveBeenCalledWith(
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