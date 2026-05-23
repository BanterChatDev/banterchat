let dek = null;
let salt = null;
let state = null;

function set({ dek: d, salt: s, state: st }) {
  dek = d;
  salt = s;
  state = st;
}

function getDEK() { return dek; }
function getSalt() { return salt; }
function getState() { return state; }
function setStateField(key, value) {
  if (!state) return;
  state[key] = value;
}

function clear() {
  if (dek) dek.fill(0);
  if (salt) salt.fill(0);
  dek = null;
  salt = null;
  state = null;
}

function isUnlocked() { return dek !== null; }

module.exports = { set, getDEK, getSalt, getState, setStateField, clear, isUnlocked };