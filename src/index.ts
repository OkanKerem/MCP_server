import express, { Request, Response } from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const CRUD_API_BASE = process.env.CRUD_API_URL || "http://localhost:3000";
const PORT = Number(process.env.HTTP_PORT) || 8080;

// Create MCP server instance
const getServer = () => {
  const server = new McpServer({
    name: 'user-crud-mcp',
    version: '1.0.0',
  }, { 
    capabilities: { 
      tools: {} 
    } 
  });

  // Tool 1: Setup Database
  server.tool(
    "setup_database",
    "Initialize the database table via basicCrud API",
    {},
    async () => {
      try {
        const response = await fetch(`${CRUD_API_BASE}/setup`);
        
        if (response.ok) {
          return {
            content: [{
              type: "text",
              text: "Database table created/reset successfully"
            }]
          };
        } else {
          const errorText = await response.text();
          return {
            content: [{
              type: "text",
              text: `Error setting up database: ${errorText}`
            }]
          };
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error setting up database: ${error.message}`
          }]
        };
      }
    }
  );

  // Tool 2: Create User (Insert)
  server.tool(
    "create_user",
    "Create a new user via basicCrud API",
    {
      isim: z.string().describe("User's name"),
      yas: z.number().min(0).max(150).describe("User's age"),
      tc: z.string().length(11).describe("Turkish ID number (11 digits)"),
    },
    async ({ isim, yas, tc }) => {
      try {
        const response = await fetch(`${CRUD_API_BASE}/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isim, yas, tc }),
        });

        if (response.ok) {
          return {
            content: [{
              type: "text",
              text: `User created successfully: ${isim}, Age: ${yas}, TC: ${tc}`
            }]
          };
        } else {
          const errorText = await response.text();
          return {
            content: [{
              type: "text",
              text: `Error creating user: ${errorText}`
            }]
          };
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error creating user: ${error.message}`
          }]
        };
      }
    }
  );

  // Tool 3: Get All Users (List)
  server.tool(
    "get_all_users",
    "Get all users from the database via basicCrud API",
    {},
    async () => {
      try {
        const response = await fetch(`${CRUD_API_BASE}/users`);
        
        if (response.ok) {
          const users = await response.json();
          
          if (Array.isArray(users) && users.length > 0) {
            const userList = users.map((user: any) => 
              `ID: ${user.id}, Name: ${user.isim?.trim() || 'N/A'}, Age: ${user.yas}, TC: ${user.tc?.trim() || 'N/A'}`
            ).join('\n');
            
            return {
              content: [{
                type: "text",
                text: `Found ${users.length} users:\n${userList}`
              }]
            };
          } else {
            return {
              content: [{
                type: "text",
                text: "No users found in the database"
              }]
            };
          }
        } else {
          const errorText = await response.text();
          return {
            content: [{
              type: "text",
              text: `Error getting users: ${errorText}`
            }]
          };
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error getting users: ${error.message}`
          }]
        };
      }
    }
  );

  // Tool 4: Update User
  server.tool(
    "update_user",
    "Update an existing user via basicCrud API",
    {
      id: z.number().min(1).describe("User ID to update"),
      isim: z.string().describe("New user's name"),
      yas: z.number().min(0).max(150).describe("New user's age"),
      tc: z.string().length(11).describe("New Turkish ID number (11 digits)"),
    },
    async ({ id, isim, yas, tc }) => {
      try {
        const response = await fetch(`${CRUD_API_BASE}/update/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isim, yas, tc }),
        });

        if (response.ok) {
          return {
            content: [{
              type: "text",
              text: `User updated successfully: ID: ${id}, Name: ${isim}, Age: ${yas}, TC: ${tc}`
            }]
          };
        } else {
          const errorText = await response.text();
          return {
            content: [{
              type: "text",
              text: `Error updating user: ${errorText}`
            }]
          };
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error updating user: ${error.message}`
          }]
        };
      }
    }
  );

  // Tool 5: Delete User
  server.tool(
    "delete_user",
    "Delete a user by ID via basicCrud API",
    {
      id: z.number().min(1).describe("User ID to delete"),
    },
    async ({ id }) => {
      try {
        const response = await fetch(`${CRUD_API_BASE}/delete/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          return {
            content: [{
              type: "text",
              text: `User with ID ${id} deleted successfully`
            }]
          };
        } else {
          const errorText = await response.text();
          return {
            content: [{
              type: "text",
              text: `Error deleting user: ${errorText}`
            }]
          };
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error deleting user: ${error.message}`
          }]
        };
      }
    }
  );

  return server;
};

const app = express();
app.use(cors());
app.use(express.json());

// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

// Database initialization function
async function initializeDatabase() {
  try {
    const response = await fetch(`${CRUD_API_BASE}/setup`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log("Database table initialized via API");
  } catch (error) {
    console.error("Error initializing database via API:", error);
    throw error;
  }
}

// SSE endpoint for establishing the stream
app.get('/sse', async (req: Request, res: Response) => {
  console.log('Received GET request to /sse (establishing SSE stream)');

  try {
    // Create a new SSE transport for the client
    const transport = new SSEServerTransport('/messages', res);

    // Store the transport by session ID
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;

    // Set up onclose handler to clean up transport when closed
    transport.onclose = () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      delete transports[sessionId];
    };

    // Connect the transport to the MCP server
    const server = getServer();
    await server.connect(transport);

    console.log(`Established SSE stream with session ID: ${sessionId}`);
  } catch (error) {
    console.error('Error establishing SSE stream:', error);
    if (!res.headersSent) {
      res.status(500).send('Error establishing SSE stream');
    }
  }
});

// Messages endpoint for receiving client JSON-RPC requests
app.post('/messages', async (req: Request, res: Response) => {
  console.log('Received POST request to /messages');

  // Extract session ID from URL query parameter
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    console.error('No session ID provided in request URL');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  const transport = transports[sessionId];
  if (!transport) {
    console.error(`No active transport found for session ID: ${sessionId}`);
    res.status(404).send('Session not found');
    return;
  }

  try {
    // Handle the POST message with the transport
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Error handling request');
    }
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'User CRUD MCP Server is running',
    tools: ['setup_database', 'create_user', 'get_all_users', 'update_user', 'delete_user'],
    activeSessions: Object.keys(transports).length,
    endpoints: {
      sse: "/sse",
      messages: "/messages?sessionId=<session_id>",
      health: "/health"
    },
    basicCrudApiUrl: CRUD_API_BASE
  });
});

// Start server with database initialization
async function startServer() {
  console.log("Starting User CRUD MCP Server...");
  console.log("Available tools: setup_database, create_user, get_all_users, update_user, delete_user");
  
  // Retry database initialization
  let retryCount = 0;
  const maxRetries = 10;
  
  while (retryCount < maxRetries) {
    try {
      await initializeDatabase();
      console.log("Database initialized successfully");
      break;
    } catch (error) {
      retryCount++;
      console.log(`Database initialization attempt ${retryCount}/${maxRetries} failed, retrying in 3 seconds...`);
      if (retryCount === maxRetries) {
        console.log("Database initialization failed after maximum retries, continuing without initialization");
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  app.listen(PORT, (error?: Error) => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    console.log(`🚀 User CRUD MCP Server running on port ${PORT}`);
    console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
    console.log(`💬 Messages endpoint: http://localhost:${PORT}/messages?sessionId=<session_id>`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 BasicCrud API: ${CRUD_API_BASE}`);
    console.log(`🛠️ Available tools: setup_database, create_user, get_all_users, update_user, delete_user`);
  });
}

// Handle server shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down server...');

  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  console.log('Server shutdown complete');
  process.exit(0);
});

startServer().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});