# User CRUD MCP Server

A Model Context Protocol (MCP) server that provides CRUD operations for user management via HTTP/SSE transport. This server connects to a BasicCrud API to perform database operations and exposes them as MCP tools for use with n8n and other MCP clients.

## Features

- **Complete CRUD Operations**: Create, Read, Update, Delete users
- **MCP Protocol Support**: HTTP/SSE transport for MCP communication
- **Session Management**: Multi-client support with automatic cleanup
- **Docker Integration**: Works with containerized BasicCrud API and PostgreSQL
- **Turkish ID Validation**: 11-digit TC number validation for users

## Available Tools

1. **setup_database** - Initialize/reset the database table
2. **create_user** - Create a new user (requires: name, age, TC number)
3. **get_all_users** - Retrieve all users from the database
4. **update_user** - Update existing user information (requires: ID, name, age, TC number)
5. **delete_user** - Delete a user by ID

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- BasicCrud API (included in docker-compose)
- PostgreSQL database (included in docker-compose)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd user-crud-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Start the database and BasicCrud API:
```bash
docker-compose up -d
```

4. Build the TypeScript code:
```bash
npm run build
```

5. Start the MCP server:

**Option A: Standard MCP Server (for n8n/programmatic use):**
```bash
npm start
```

**Option B: MCP Server with Web Interface (for easy testing):**
```bash
npm run start:web
```

## Configuration

Environment variables:
- `CRUD_API_URL`: BasicCrud API URL (default: http://localhost:3000)
- `HTTP_PORT`: MCP server port (default: 8080)

## Docker Services

The `docker-compose.yaml` includes:
- **PostgreSQL Database** (port 5433)
- **BasicCrud API** (port 3000)

The MCP server runs locally and connects to these services.

## API Endpoints

- **GET /sse** - Establish SSE connection for MCP
- **POST /messages?sessionId=<id>** - Send MCP JSON-RPC messages
- **GET /health** - Health check and server status

## Usage Options

### Option 1: Web Interface (Easy Testing)

When using `npm run start:web`, you can access a beautiful web interface at `http://localhost:8080` that provides:

- **Visual forms** for each CRUD operation
- **Real-time results** display
- **Input validation** for TC numbers and age ranges
- **Color-coded success/error messages**
- **Responsive design** that works on desktop and mobile

This is perfect for testing the MCP tools and demonstrating functionality.

### Option 2: Programmatic Access (n8n Integration)

When using `npm start`, you get the standard MCP server for programmatic use:

1. Connect to the SSE endpoint: `http://localhost:8080/sse`
2. Send JSON-RPC messages to: `http://localhost:8080/messages?sessionId=<session_id>`
3. Use the available tools for user management operations

## Example Tool Usage

### Create User
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_user",
    "arguments": {
      "isim": "John Doe",
      "yas": 30,
      "tc": "12345678901"
    }
  }
}
```

### Get All Users
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_all_users",
    "arguments": {}
  }
}
```

## Development

### Scripts
- `npm run build` - Compile TypeScript
- `npm start` - Start standard MCP server (for n8n)
- `npm run start:web` - Start MCP server with web interface
- `npm test` - Run tests (not implemented)

### Project Structure
```
├── src/
│   ├── index.ts          # Standard MCP server (for n8n)
│   └── indexNew.ts       # MCP server with web interface
├── public/
│   └── index.html        # Web interface for testing tools
├── basicCrud/            # BasicCrud API source
├── docker-compose.yaml   # Docker services
├── Dockerfile           # MCP server container (unused in current setup)
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Troubleshooting

1. **Port conflicts**: Change the `HTTP_PORT` environment variable
2. **Database connection issues**: Ensure Docker services are running
3. **API errors**: Check BasicCrud API logs with `docker-compose logs basiccrud`

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request 