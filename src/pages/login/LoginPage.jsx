// src/pages/login/LoginPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import RegistrationForm from '../../components/registration/RegistrationForm';
import './login.css';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError, role } = useAuth();

  // Get return path from location state (for redirecting after login)
  const returnPath = location.state?.returnPath || '/';
  
  // Redirect if *already* authenticated (on initial load)
  useEffect(() => {
    // Log initial state check
    console.log('[LoginPage Effect - Initial Load Check]', { isAuthenticated, role });
    if (isAuthenticated) {
      if (role === 'teacher') {
        navigate('/teacher');
      } else if (role === 'student') {
        navigate('/student');
      } else {
        navigate(returnPath);
      }
    }
    // Depend only on isAuthenticated for initial load check, 
    // subsequent navigations are handled by handleLogin
  }, [isAuthenticated]); // Removed role, navigate, returnPath dependencies

  // View state (login or register)
  const [isSignup, setIsSignup] = useState(false);

  // 🔐 Form input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [rememberMe, setRememberMe] = useState(false); // Remember me functionality
  const [formErrors, setFormErrors] = useState({}); // Form validation errors
  
  // Refs for focus management
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  
  // Clear error when component mounts or isSignup changes
  useEffect(() => {
    clearError();
    setFormErrors({});
  }, [isSignup, clearError]);

  // Focus first field on form toggle
  useEffect(() => {
    if (!isSignup && usernameRef.current) {
      usernameRef.current.focus();
    }
  }, [isSignup]);

  // Form validation
  const validateForm = (data) => {
    const errors = {};
    
    if (!data.username) {
      errors.username = 'Username is required';
    }
    
    if (!data.password) {
      errors.password = 'Password is required';
    }
    
    if (!data.role) {
      errors.role = 'Please select a role';
    }
    
    return errors;
  };

  // ✅ Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();

    // Form validation
    const loginData = { username, password, role: selectedRole };
    const errors = validateForm(loginData);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      
      // Focus first field with error
      if (errors.username && usernameRef.current) {
        usernameRef.current.focus();
      } else if (errors.password && passwordRef.current) {
        passwordRef.current.focus();
      }
      
      return;
    }

    try {
      // Use the auth context login function which now returns the role
      const result = await login(username, password, selectedRole, rememberMe);
      
      console.log('[LoginPage handleLogin] After await login:', { result });

      // Navigate *immediately* using the role returned from the login function
      if (result.success && result.role) {
        console.log(`Login Success! Role: ${result.role}, Navigating...`);
        if (result.role === 'student') {
          navigate('/student');
        } else if (result.role === 'teacher') {
          navigate('/teacher');
        } else {
          navigate(returnPath); // Fallback
        }
      } else if (!result.success) {
        console.log('Login attempt failed in component:', result.error);
        // Error state is set in context and displayed
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  // Toggle between login and registration views
  const toggleSignup = () => {
    setIsSignup(!isSignup);
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <h1 className="logo">QUIZSECURE</h1>
        
        {!isSignup ? (
          // ✅ LOGIN FORM
          <>
            <p className="subtitle">Secure Exam Access</p>
            
            {/* Show error message if any */}
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  ref={usernameRef}
                  className={formErrors.username ? 'error' : ''}
                />
                {formErrors.username && <div className="field-error">{formErrors.username}</div>}
              </div>
              
              <div className="form-group password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  ref={passwordRef}
                  className={formErrors.password ? 'error' : ''}
                />
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
                {formErrors.password && <div className="field-error">{formErrors.password}</div>}
              </div>
              
              <div className="form-group">
                <select 
                  value={selectedRole} 
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={isLoading}
                  className={formErrors.role ? 'error' : ''}
                >
                  <option value="">Select Role</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
                {formErrors.role && <div className="field-error">{formErrors.role}</div>}
              </div>
              
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me">Remember me</label>
              </div>
              
              <button type="submit" disabled={isLoading} className={isLoading ? 'loading' : ''}>
                {isLoading ? 'Logging in...' : 'Login'}
                {isLoading && <span className="loading-spinner"></span>}
              </button>
            </form>
            
            <div className="divider"><span>OR</span></div>
            
            <p className="signup">
              Don't have an account? <a onClick={toggleSignup} href="#">Sign up</a>
            </p>
          </>
        ) : (
          // 🔐 REGISTRATION FORM (Using our new component)
          <RegistrationForm onLoginClick={toggleSignup} />
        )}
      </div>
    </div>
  );
}

export default LoginPage;
