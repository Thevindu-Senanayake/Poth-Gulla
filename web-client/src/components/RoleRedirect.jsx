import { Navigate } from "react-router-dom";
import { useApp } from "../App";

const HOME_PATH = {
  admin: "/admin/dashboard",
  staff: "/staff/dashboard",
  lecturer: "/dashboard",
  student: "/dashboard",
};

/**
 * Redirects the root "/" path to the correct dashboard based on user role.
 */
export default function RoleRedirect() {
  const { user } = useApp();
  const dest = HOME_PATH[user?.role] || "/dashboard";
  return <Navigate to={dest} replace />;
}
