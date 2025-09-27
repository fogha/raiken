#!/usr/bin/env node

// Simple relay server for Raiken bridge connections
// This allows CLI clients to connect through WebSocket when direct HTTP isn't possible

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = process.env.RELAY_PORT || 3001;

// Store active sessions: sessionId -> { web?: WebSocket, cli?: WebSocket }
const sessions = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      sessions: sessions.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // CORS headers for web clients
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'text/plain'
  });
  
  res.end('Raiken Relay Server\nActive sessions: ' + sessions.size);
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/bridge'
});

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const role = query.role; // 'web' or 'cli'
  const sessionId = query.session;

  console.log(`[${new Date().toISOString()}] New ${role} connection for session: ${sessionId}`);

  if (!sessionId || !role || !['web', 'cli'].includes(role)) {
    console.log('Invalid connection parameters, closing');
    ws.close(1008, 'Invalid parameters');
    return;
  }

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = {};
    sessions.set(sessionId, session);
  }

  // Store connection in session
  session[role] = ws;
  
  console.log(`Session ${sessionId} now has: ${Object.keys(session).join(', ')}`);

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[${role}] ${message.type} message in session ${sessionId}`);

      // Forward message to the other party
      const targetRole = role === 'web' ? 'cli' : 'web';
      const targetWs = session[targetRole];

      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(data);
        console.log(`Forwarded ${message.type} from ${role} to ${targetRole}`);
      } else {
        console.log(`No ${targetRole} connection available for session ${sessionId}`);
        
        // Send error back to sender for RPC calls
        if (message.type === 'rpc' && message.id) {
          ws.send(JSON.stringify({
            id: message.id,
            type: 'rpc',
            error: `No ${targetRole} connection available`
          }));
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] ${role} disconnected from session: ${sessionId}`);
    
    if (session && session[role] === ws) {
      delete session[role];
      
      // Clean up empty sessions
      if (Object.keys(session).length === 0) {
        sessions.delete(sessionId);
        console.log(`Cleaned up empty session: ${sessionId}`);
      }
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${role} in session ${sessionId}:`, error);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    role,
    sessionId,
    timestamp: Date.now()
  }));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Raiken Relay Server running on port ${PORT}`);
  console.log(`   WebSocket endpoint: ws://localhost:${PORT}/bridge`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Usage:');
  console.log('  CLI: raiken relay --session <session-id>');
  console.log('  Web: Connect to relay mode with same session ID');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Shutting down relay server...');
  
  // Close all WebSocket connections
  wss.clients.forEach(ws => {
    ws.close(1001, 'Server shutting down');
  });
  
  server.close(() => {
    console.log('✓ Relay server stopped');
    process.exit(0);
  });
});

// Log session stats periodically
setInterval(() => {
  if (sessions.size > 0) {
    console.log(`[Stats] Active sessions: ${sessions.size}`);
    for (const [sessionId, session] of sessions.entries()) {
      const roles = Object.keys(session);
      console.log(`  ${sessionId}: ${roles.join(', ')}`);
    }
  }
}, 60000); // Every minute
