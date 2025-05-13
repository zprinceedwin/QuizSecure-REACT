import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import './ProtectedRoute.css';

/**
 * A component to protect routes that require authentication.
 * If the user is not authenticated, it redirects to the /login page.
 * While checking authentication status, it displays a loading message.
 *
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The child components to render if authenticated.
 * @param {string|string[]} [props.requiredRoles] - Role(s) required to access this route
 * @param {string} [props.redirectPath=/login] - Path to redirect to if not authenticated
 * @returns {React.ReactElement} The child components or a redirect.
 */
const ProtectedRoute = ({ children, requiredRoles, redirectPath = '/login' }) => {
  const { isAuthenticated, isLoading, hasRole, role } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} state={{ returnPath: location.pathname }} replace />;
  }

  const userHasRequiredRole = hasRole(requiredRoles);

  if (requiredRoles && !userHasRequiredRole) {
    if (role === 'teacher') return <Navigate to="/teacher" replace />;
    if (role === 'student') return <Navigate to="/student" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute; 