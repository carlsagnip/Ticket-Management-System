import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, session }) {
  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
