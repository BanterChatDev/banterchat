import { request } from './client';
import { r } from './routes';

// Friendship lifecycle:
//   POST   /friends           — send request (apiSendFriendRequest)
//   PUT    /friends/:id       — accept pending request (apiAcceptFriend)
//   DELETE /friends/:id       — decline pending OR remove existing friend
//                               (apiDeclineFriend / apiRemoveFriend — same endpoint)
//
// The server collapses decline + remove into one DELETE handler
// (friendsSvc.DeclineOrRemove in main.go). We expose both verbs here
// because callers want the intent-matching name: a pending-requests
// tab uses apiDeclineFriend; a friend list's remove button uses
// apiRemoveFriend. Same underlying call.

export async function apiListFriends() {
  return request('GET', r.friends.list());
}

export async function apiSendFriendRequest(username) {
  return request('POST', r.friends.add(), { username });
}

export async function apiAcceptFriend(id) {
  return request('PUT', r.friends.one(id));
}

export async function apiDeclineFriend(id) {
  return request('DELETE', r.friends.one(id));
}

// Aliases for the existing callers / more-descriptive names.
// Same behaviour as apiAcceptFriend / apiDeclineFriend respectively.
export const apiAcceptFriendRequest = apiAcceptFriend;
export const apiRemoveFriend = apiDeclineFriend;