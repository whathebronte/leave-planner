// Security rules tests. Run with: npm run test:rules
// They run against the local Firebase emulator, never the real database.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteField,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  FieldPath,
} from 'firebase/firestore';

let env;
const anon = (uid) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const google = (uid) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();
const nobody = () => env.unauthenticatedContext().firestore();

const linkPlanner = { schemaVersion: 2, ownerUid: null, totals: {}, leaves: {} };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-leave-planner',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'planners/link1'), { ...linkPlanner, leaves: { '2026-05-28': 1 } });
    await setDoc(doc(db, 'planners/owned1'), { ...linkPlanner, ownerUid: 'alice' });
    // A planner saved by the old app
    await setDoc(doc(db, 'planners/legacy1'), {
      total: 21,
      leaves: { '2026-01-02': 1 },
      updated: '2026-01-01T00:00:00Z',
    });
  });
});

test('signed-out visitors cannot read anything', async () => {
  await assertFails(getDoc(doc(nobody(), 'planners/link1')));
});

test('anyone with the link can open and edit a link-only planner', async () => {
  const db = anon('bob');
  await assertSucceeds(getDoc(doc(db, 'planners/link1')));
  await assertSucceeds(
    updateDoc(doc(db, 'planners/link1'), new FieldPath('leaves', '2026-05-29'), 0.5),
  );
  await assertSucceeds(
    updateDoc(doc(db, 'planners/link1'), new FieldPath('leaves', '2026-05-28'), deleteField()),
  );
});

test('planners saved by the old app still open and save', async () => {
  const db = anon('bob');
  await assertSucceeds(getDoc(doc(db, 'planners/legacy1')));
  await assertSucceeds(
    updateDoc(doc(db, 'planners/legacy1'), new FieldPath('leaves', '2026-02-16'), 1),
  );
  // The old app replaced the whole planner on every save; that must keep working until it is switched off.
  await assertSucceeds(
    setDoc(doc(db, 'planners/legacy1'), { total: 21, leaves: {}, updated: 'x' }),
  );
});

test('checking a planner that does not exist is allowed (so the app can say "not found")', async () => {
  await assertSucceeds(getDoc(doc(anon('bob'), 'planners/missing')));
});

test('nobody can list every planner or delete one', async () => {
  await assertFails(getDocs(collection(anon('bob'), 'planners')));
  await assertFails(deleteDoc(doc(google('alice'), 'planners/owned1')));
});

test('an owned planner is only visible to its owner', async () => {
  await assertSucceeds(getDoc(doc(google('alice'), 'planners/owned1')));
  await assertFails(getDoc(doc(google('mallory'), 'planners/owned1')));
  await assertFails(getDoc(doc(anon('bob'), 'planners/owned1')));
  await assertFails(
    updateDoc(doc(anon('bob'), 'planners/owned1'), new FieldPath('leaves', '2026-05-29'), 1),
  );
});

test('the owner cannot be changed or removed', async () => {
  await assertFails(updateDoc(doc(google('alice'), 'planners/owned1'), { ownerUid: 'mallory' }));
  await assertFails(updateDoc(doc(google('alice'), 'planners/owned1'), { ownerUid: null }));
});

test('only a Google account can claim a link-only planner, and only for itself', async () => {
  await assertFails(updateDoc(doc(anon('bob'), 'planners/link1'), { ownerUid: 'bob' }));
  await assertFails(
    updateDoc(doc(google('alice'), 'planners/link1'), { ownerUid: 'someone-else' }),
  );
  await assertSucceeds(updateDoc(doc(google('alice'), 'planners/link1'), { ownerUid: 'alice' }));
  await assertFails(getDoc(doc(anon('bob'), 'planners/link1')));
});

test('new planners must have a valid shape', async () => {
  await assertSucceeds(setDoc(doc(anon('bob'), 'planners/new1'), linkPlanner));
  await assertFails(setDoc(doc(anon('bob'), 'planners/new2'), { ...linkPlanner, ownerUid: 'bob' }));
  await assertFails(setDoc(doc(anon('bob'), 'planners/new3'), { ...linkPlanner, hacker: true }));
  await assertSucceeds(
    setDoc(doc(google('alice'), 'planners/new4'), { ...linkPlanner, ownerUid: 'alice' }),
  );
});

test('only you can read or write your own account note', async () => {
  await assertSucceeds(setDoc(doc(google('alice'), 'users/alice'), { plannerId: 'owned1' }));
  await assertSucceeds(getDoc(doc(google('alice'), 'users/alice')));
  await assertFails(getDoc(doc(google('mallory'), 'users/alice')));
  await assertFails(setDoc(doc(google('mallory'), 'users/alice'), { plannerId: 'x' }));
  await assertFails(setDoc(doc(anon('alice'), 'users/alice'), { plannerId: 'x' }));
});
