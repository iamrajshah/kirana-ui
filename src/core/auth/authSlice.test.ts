import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../constants';
import authReducer, { beginCurrentUserProfileUpdate, updateCurrentUser } from './authSlice';

const currentUser = {
  id: 'owner-1',
  name: 'Old Owner',
  email: 'owner@example.com',
  phone: '9999999999',
  roles: ['OWNER'],
  tenant: { id: 'tenant-1', name: 'Rajesh Kirana', status: 'ACTIVE' },
};

describe('authSlice profile synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'access-token');
  });

  it('merges an updated profile into the signed-in user and persists it', () => {
    const startedState = authReducer(
      {
        user: currentUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionVersion: 1,
        profileUpdateSequence: 0,
        lastAppliedProfileUpdateSequence: 0,
        profileUpdateRequests: {},
      },
      beginCurrentUserProfileUpdate({
        requestId: 'request-1',
        userId: 'owner-1',
        sessionVersion: 1,
      })
    );
    const nextState = authReducer(
      startedState,
      updateCurrentUser({
        id: 'owner-1',
        name: 'Updated Owner',
        phone: '8888888888',
        sessionVersion: 1,
        requestId: 'request-1',
      })
    );

    expect(nextState.user).toEqual({
      ...currentUser,
      name: 'Updated Owner',
      phone: '8888888888',
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null')).toEqual(nextState.user);
  });

  it('ignores a delayed profile response for a different signed-in user', () => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));

    const nextState = authReducer(
      {
        user: currentUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionVersion: 1,
        profileUpdateSequence: 1,
        lastAppliedProfileUpdateSequence: 0,
        profileUpdateRequests: { 'request-1': 1 },
      },
      updateCurrentUser({
        id: 'previous-user',
        name: 'Previous User',
        sessionVersion: 1,
        requestId: 'request-1',
      })
    );

    expect(nextState.user).toEqual(currentUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null')).toEqual(currentUser);
  });

  it('ignores a response from an older login session for the same user', () => {
    const nextState = authReducer(
      {
        user: currentUser,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        sessionVersion: 3,
        profileUpdateSequence: 1,
        lastAppliedProfileUpdateSequence: 0,
        profileUpdateRequests: { 'request-1': 1 },
      },
      updateCurrentUser({
        id: 'owner-1',
        name: 'Stale Owner',
        sessionVersion: 1,
        requestId: 'request-1',
      })
    );

    expect(nextState.user).toEqual(currentUser);
  });

  it('does not overwrite shared storage after another tab changes the login', () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'other-tab-access-token');
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ ...currentUser, id: 'owner-2' }));

    const nextState = authReducer(
      {
        user: currentUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionVersion: 1,
        profileUpdateSequence: 1,
        lastAppliedProfileUpdateSequence: 0,
        profileUpdateRequests: { 'request-1': 1 },
      },
      updateCurrentUser({
        id: 'owner-1',
        name: 'Stale Owner',
        sessionVersion: 1,
        requestId: 'request-1',
      })
    );

    expect(nextState.user).toEqual(currentUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null').id).toBe('owner-2');
  });
});
