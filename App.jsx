// App.jsx — Top-level routing skeleton for CGOE Connect
// Built with React Router v6

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// ── Person A: Auth & Class Hub ──────────────────────────────
import Login          from "./pages/auth/Login";
import Register       from "./pages/auth/Register";
import Profile        from "./pages/auth/Profile";
import Guidelines     from "./pages/auth/Guidelines";

import ClassHub       from "./pages/classhub/ClassHub";
import Announcements  from "./pages/classhub/Announcements";
import Subchat        from "./pages/classhub/Subchat";
import Resources      from "./pages/classhub/Resources";

// ── Person B: Chat UI & Interactions ───────────────────────
import GeneralChat    from "./pages/chat/GeneralChat";
import NewChat        from "./pages/chat/NewChat";

// ── Person C: Feed, Reviews & Moderation ───────────────────
import Feed           from "./pages/feed/Feed";
import SavedPosts     from "./pages/feed/SavedPosts";
import ClassReviews   from "./pages/reviews/ClassReviews";
import ModDashboard   from "./pages/moderation/ModDashboard";
import ManageClasses  from "./pages/admin/ManageClasses";
import MySubchats     from "./pages/subchats/MySubchats";

// ── Auth guard (uses fake auth state from localStorage) ────
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FlagsProvider } from "./context/FlagsContext";

function AuthBootLoader() {
  const { ready } = useAuth();
  if (!ready) {
    return (
      <div
        className="min-h-screen bg-stone-50 flex items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#8C1515]" />
      </div>
    );
  }
  return (
    <Routes>

        {/* ── Public ── */}
        <Route path="/login"      element={<Login />} />
        <Route path="/register"   element={<Register />} />
        <Route
          path="/guidelines"
          element={
            <PrivateRoute>
              <Guidelines />
            </PrivateRoute>
          }
        />

        {/* ── Onboarding (post-register) ── */}
        <Route path="/profile-setup" element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* ── Feed (Home) ── */}
        <Route path="/"            element={<PrivateRoute><Feed /></PrivateRoute>} />
        <Route path="/saved"       element={<PrivateRoute><SavedPosts /></PrivateRoute>} />

        {/* ── Class Hub ── */}
        <Route path="/class/:classId"              element={<PrivateRoute><ClassHub /></PrivateRoute>} />
        <Route path="/class/:classId/announcements" element={<PrivateRoute><Announcements /></PrivateRoute>} />
        <Route path="/class/:classId/subchat/:chatId" element={<PrivateRoute><Subchat /></PrivateRoute>} />
        <Route path="/class/:classId/resources"    element={<PrivateRoute><Resources /></PrivateRoute>} />

        {/* ── Chat ── */}
        <Route path="/chat/general"  element={<PrivateRoute><GeneralChat /></PrivateRoute>} />
        <Route path="/chat/new"      element={<PrivateRoute><NewChat /></PrivateRoute>} />

        {/* ── Reviews ── */}
        <Route path="/reviews/:classId" element={<PrivateRoute><ClassReviews /></PrivateRoute>} />

        {/* ── Moderation ── */}
        <Route path="/mod" element={<PrivateRoute><ModDashboard /></PrivateRoute>} />

        {/* ── Admin ── */}
        <Route path="/admin/classes" element={<PrivateRoute><ManageClasses /></PrivateRoute>} />

        {/* ── My Subchats ── */}
        <Route path="/my-subchats" element={<PrivateRoute><MySubchats /></PrivateRoute>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated, agreedToGuidelines } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!agreedToGuidelines && location.pathname !== "/guidelines") {
    return <Navigate to="/guidelines" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <FlagsProvider>
      <BrowserRouter>
        <AuthBootLoader />
      </BrowserRouter>
      </FlagsProvider>
    </AuthProvider>
  );
}
