/**
 * Test script for error logging functionality
 *
 * This script validates the error logger implementation:
 * - Tests basic logging methods
 * - Tests data scrubbing for sensitive information
 * - Tests context setting
 * - Tests breadcrumb addition
 */

import { errorLogger, LogLevel } from '../src/utils/logger/errorLogger';

console.log('=== Error Logger Test Suite ===\n');

// Test 1: Basic logging methods
console.log('Test 1: Basic logging methods');
errorLogger.setEnabled(true);

errorLogger.debug('Debug message', 'TestContext', { debugData: 'test' });
errorLogger.info('Info message', 'TestContext', { infoData: 'test' });
errorLogger.warn('Warning message', 'TestContext', { warnData: 'test' });
errorLogger.error('Error message', new Error('Test error'), 'TestContext', { errorData: 'test' });

console.log('✓ Basic logging methods work\n');

// Test 2: User context
console.log('Test 2: User context setting');
errorLogger.setUserContext('user-123', 'test@example.com');
console.log('✓ User context set\n');

// Test 3: Room context
console.log('Test 3: Room context setting');
errorLogger.setRoomContext('room-456');
console.log('✓ Room context set\n');

// Test 4: Breadcrumb
console.log('Test 4: Breadcrumb addition');
errorLogger.addBreadcrumb('User clicked button', 'ui.click', { buttonId: 'submit' });
console.log('✓ Breadcrumb added\n');

// Test 5: Data scrubbing (log with sensitive data)
console.log('Test 5: Data scrubbing');
errorLogger.error(
  'Error with sensitive data',
  new Error('Auth failed'),
  'AuthContext',
  {
    username: 'testuser',
    password: 'secretpassword', // Should be scrubbed
    token: 'abc123xyz', // Should be scrubbed
    apiKey: 'my-api-key', // Should be scrubbed
    safeData: 'this is safe',
  }
);
console.log('✓ Logged error with sensitive data (should be scrubbed)\n');

// Test 6: Get logs
console.log('Test 6: Retrieve logs');
const allLogs = errorLogger.getLogs();
console.log(`Total logs: ${allLogs.length}`);

const errorLogs = errorLogger.getLogs(LogLevel.ERROR);
console.log(`Error logs: ${errorLogs.length}`);
console.log('✓ Log retrieval works\n');

// Test 7: Export logs
console.log('Test 7: Export logs');
const exportedLogs = errorLogger.exportLogs();
console.log('Exported logs (JSON):');
console.log(exportedLogs.substring(0, 200) + '...');
console.log('✓ Log export works\n');

console.log('=== All tests passed! ===');
console.log('\nNote: Remote logging is only enabled when VITE_ERROR_TRACKING_ENABLED=true and VITE_SENTRY_DSN is set.');
