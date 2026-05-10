import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authAPI, usersAPI, normalizeUser } from "../api";

const TOKEN_KEY = "cgoe_token";
const USER_KEY  = "cgoe_user";

const AuthContext = createContext(null);

function loadCached() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch { return null; }
}

/** Only restore cached user when a token exists — avoids "logged in" UI with no session. */
function initialUser() {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    try {
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
    return null;
  }
  return loadCached();
}

export function AuthProvider({ children }) {
  // Seed from cache so the UI renders immediately, then verify against server.
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [ready, setReady] = useState(false); // true once server verify completes

  // Verify token on mount (skip if no token)
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      try {
        localStorage.removeItem(USER_KEY);
      } catch { /* ignore */ }
      setCurrentUser(null);
      setReady(true);
      return;
    }
    authAPI.me()
      .then(({ user }) => {
        const normalized = normalizeUser(user);
        setCurrentUser(normalized);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
      .catch(() => {
        // Token invalid — clear everything
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setCurrentUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await authAPI.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setCurrentUser(normalizeUser(user));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setCurrentUser(null);
  }, []);

  const setAgreedToGuidelines = useCallback(async (value) => {
    if (!currentUser) return;
    const { user } = await usersAPI.update(currentUser.id, { agreed_to_guidelines: value });
    const normalized = normalizeUser(user);
    setCurrentUser(normalized);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, [currentUser]);

  const updateProfile = useCallback(async (partial) => {
    if (!currentUser) return;
    const payload = {
      name:          partial.displayName ?? partial.name,
      bio:           partial.bio,
      profile_pic:   partial.profilePic,
      student_status:partial.studentStatus,
      modality_tags: partial.modalityTags,
      identity_tags: partial.identityTags,
    };
    const { user } = await usersAPI.update(currentUser.id, payload);
    const normalized = normalizeUser(user);
    setCurrentUser(normalized);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, [currentUser]);

  // Called after the register form — updates profile fields + enrolls classes
  const saveRegistration = useCallback(async (payload) => {
    if (!currentUser) return;
    const { displayName, email, identityTags, studentStatus, modalityTags, selectedClassIds } = payload;
    const { user } = await usersAPI.update(currentUser.id, {
      name:           displayName,
      identity_tags:  identityTags,
      student_status: studentStatus,
      modality_tags:  modalityTags,
      agreed_to_guidelines: true,
    });
    // Enroll in selected classes
    const catalogIds = (selectedClassIds ?? []).filter((id) => !id.startsWith('custom-'));
    await Promise.all(catalogIds.map((cid) => usersAPI.enroll(currentUser.id, cid).catch(() => {})));
    // Refresh user from server to get updated classes list
    const { user: fresh } = await authAPI.me();
    const normalized = normalizeUser(fresh);
    setCurrentUser(normalized);
    localStorage.setItem(USER_KEY, JSON.stringify(fresh));
  }, [currentUser]);

  // Toggle enrollment in a class
  const setSelectedClassIds = useCallback(async (ids) => {
    if (!currentUser) return;
    const current = new Set(currentUser.classes);
    const next = new Set(ids.filter((id) => !id.startsWith('custom-')));
    const toAdd = [...next].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !next.has(id));
    await Promise.all([
      ...toAdd.map((id) => usersAPI.enroll(currentUser.id, id).catch(() => {})),
      ...toRemove.map((id) => usersAPI.unenroll(currentUser.id, id).catch(() => {})),
    ]);
    const { user } = await authAPI.me();
    const normalized = normalizeUser(user);
    setCurrentUser(normalized);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, [currentUser]);

  const selectedClassIds = currentUser?.classes ?? [];

  const value = useMemo(() => ({
    ready,
    isAuthenticated:     Boolean(currentUser),
    currentUser,
    login,
    logout,
    agreedToGuidelines:  Boolean(currentUser?.agreedToGuidelines),
    setAgreedToGuidelines,
    updateProfile,
    saveRegistration,
    selectedClassIds,
    setSelectedClassIds,
  }), [
    ready, currentUser, login, logout,
    setAgreedToGuidelines, updateProfile, saveRegistration,
    selectedClassIds, setSelectedClassIds,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
