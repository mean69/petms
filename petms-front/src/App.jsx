import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/auth";
import Layout from "./components/Layout";
import { Feedback, Spinner } from "./components/UI";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Pets from "./pages/Pets";
import PetForm from "./pages/PetForm";
import PetDetails from "./pages/PetDetails";
import Profile, { AccountStatus } from "./pages/Profile";
import Owners from "./pages/Owners";
import Users from "./pages/Users";
import Corrections from "./pages/Corrections";
import Activity from "./pages/Activity";
import "./App.css";
function Protected() {
  const { user, loading, startupError, refresh } = useAuth();
  if (loading)
    return (
      <div className="full-screen">
        <Spinner label="Getting your workspace ready…" />
      </div>
    );
  if (startupError)
    return (
      <div className="full-screen">
        <Feedback error={startupError} />
        <button className="btn primary" onClick={refresh}>
          Try again
        </button>
        <Link to="/">Go to PetFave</Link>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (
    !user.enabled ||
    !user.profile_complete ||
    user.approval_status !== "approved"
  )
    return <AccountStatus />;
  return <Outlet />;
}
function RoleGuard({ roles }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? (
    <Outlet />
  ) : (
    <Navigate to="/app" replace />
  );
}
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth registration />} />
          <Route element={<Protected />}>
            <Route path="/app" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="pets" element={<Pets />} />
              <Route path="pets/new" element={<PetForm />} />
              <Route path="pets/:id" element={<PetDetails />} />
              <Route path="pets/:id/edit" element={<PetForm />} />
              <Route path="profile" element={<Profile />} />
              <Route element={<RoleGuard roles={["administrator", "staff"]} />}>
                <Route path="owners" element={<Owners />} />
              </Route>
              <Route
                element={<RoleGuard roles={["administrator", "client"]} />}
              >
                <Route path="corrections" element={<Corrections />} />
              </Route>
              <Route element={<RoleGuard roles={["administrator"]} />}>
                <Route path="users" element={<Users />} />
                <Route path="activity" element={<Activity />} />
              </Route>
            </Route>
          </Route>
          <Route
            path="*"
            element={
              <div className="full-screen">
                <h1>This page wandered off.</h1>
                <p>Let’s find your way back.</p>
                <Link className="btn primary" to="/">
                  Back to PetFave
                </Link>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
