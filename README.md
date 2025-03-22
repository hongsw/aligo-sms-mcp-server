# Aligo SMS MCP Server

A Model Context Protocol (MCP) server for integrating with the Aligo SMS API. This MCP server allows AI assistants to send SMS messages, check remaining message balances, and retrieve message history through a standardized interface.

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