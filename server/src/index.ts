/**
 * Basic entry point for the server.
 */

async function main() {
  console.log('--- NeuraMemory-AI Server Starting ---');
  console.log('Time:', new Date().toLocaleString());
  console.log('Status: Running in Development Mode');
  console.log('Auto-reload is working! 🎉');
  console.log('--------------------------------------');
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
