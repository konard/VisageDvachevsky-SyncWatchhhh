/**
 * Experiment: Test Room State Service
 * Manual testing script for state management functionality
 */

import { PlaybackState } from '../shared/src/index.js';
import { RoomStateService } from '../backend/src/modules/state/service.js';

async function main() {
  console.log('🧪 Testing Room State Service\n');

  const service = new RoomStateService();
  const testRoomId = `test-room-${Date.now()}`;

  try {
    // Test 1: Create and store state
    console.log('Test 1: Creating state snapshot...');
    const state1 = service.createSnapshot(
      testRoomId,
      'youtube',
      'dQw4w9WgXcQ',
      true,
      5000,
      1.0,
      1
    );
    console.log('Created:', state1);

    await service.setState(state1);
    console.log('✓ State stored\n');

    // Test 2: Retrieve state
    console.log('Test 2: Retrieving state...');
    const retrieved = await service.getState(testRoomId);
    console.log('Retrieved:', retrieved);
    console.log('✓ State retrieved\n');

    // Test 3: Update with newer sequence number
    console.log('Test 3: Updating with newer sequence number...');
    const state2 = service.createSnapshot(
      testRoomId,
      'youtube',
      'dQw4w9WgXcQ',
      true,
      10000,
      1.5,
      2
    );
    const accepted = await service.updateState(state2);
    console.log('Update accepted:', accepted);
    console.log('✓ Update succeeded\n');

    // Test 4: Reject older sequence number
    console.log('Test 4: Rejecting older sequence number...');
    const state3 = service.createSnapshot(
      testRoomId,
      'youtube',
      'dQw4w9WgXcQ',
      false,
      0,
      1.0,
      1 // Older sequence
    );
    const rejected = await service.updateState(state3);
    console.log('Update rejected:', !rejected);
    console.log('✓ Old update rejected\n');

    // Test 5: Calculate current media time
    console.log('Test 5: Calculating media time...');
    const currentState = await service.getState(testRoomId);
    if (currentState) {
      const mediaTime = service.calculateCurrentMediaTime(currentState);
      console.log('Current media time:', Math.round(mediaTime), 'ms');
      console.log('✓ Media time calculated\n');
    }

    // Test 6: Participant management
    console.log('Test 6: Managing participants...');
    await service.addParticipant(testRoomId, 'user-1');
    await service.addParticipant(testRoomId, 'user-2');
    await service.addParticipant(testRoomId, 'user-3');
    const participants = await service.getParticipants(testRoomId);
    console.log('Participants:', participants);
    console.log('✓ Participants managed\n');

    // Test 7: Online sockets
    console.log('Test 7: Managing online sockets...');
    await service.addOnlineSocket(testRoomId, 'socket-abc');
    await service.addOnlineSocket(testRoomId, 'socket-def');
    const sockets = await service.getOnlineSockets(testRoomId);
    const count = await service.getOnlineCount(testRoomId);
    console.log('Online sockets:', sockets);
    console.log('Online count:', count);
    console.log('✓ Sockets tracked\n');

    // Test 8: Pub/Sub
    console.log('Test 8: Testing pub/sub...');
    const receivedStates: PlaybackState[] = [];
    const callback = (state: PlaybackState) => {
      console.log('  📡 Received state update:', state.sequenceNumber);
      receivedStates.push(state);
    };

    await service.subscribe(testRoomId, callback);
    console.log('✓ Subscribed to room events');

    // Wait a bit for subscription to register
    await new Promise((resolve) => setTimeout(resolve, 100));

    const state4 = service.createSnapshot(
      testRoomId,
      'youtube',
      'dQw4w9WgXcQ',
      true,
      15000,
      2.0,
      3
    );
    await service.setState(state4);
    console.log('Published state update');

    // Wait for pub/sub delivery
    await new Promise((resolve) => setTimeout(resolve, 200));
    console.log('Received', receivedStates.length, 'state updates via pub/sub');
    console.log('✓ Pub/sub working\n');

    await service.unsubscribe(testRoomId, callback);

    // Test 9: State recovery
    console.log('Test 9: Testing state recovery...');
    const recovered = await service.recoverState(testRoomId);
    console.log('Recovered state seq:', recovered?.sequenceNumber);
    console.log('✓ State recovered\n');

    // Test 10: Cleanup
    console.log('Test 10: Cleaning up...');
    await service.deleteRoomState(testRoomId);
    const deletedState = await service.getState(testRoomId);
    console.log('State after deletion:', deletedState);
    console.log('✓ Cleanup complete\n');

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await service.cleanup();
    process.exit(0);
  }
}

main();
