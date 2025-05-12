import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import './Registration.css';

const RegistrationForm = ({ onLoginClick }) => {
  const { register, isLoading, error, clearError } = useAuth();
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    confirmEmail: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
    termsAccepted: false
  });
  
  // Form validation errors state
  const [formErrors, setFormErrors] = useState({});
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    
    setFormData({
      ...formData,
      [name]: inputValue
    });
    
    // Clear the specific error when field is updated
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }

    // Live validation for password match
    if (name === 'confirmPassword' || (name === 'password' && formData.confirmPassword)) {
      if (name === 'password' && value !== formData.confirmPassword) {
        setFormErrors({
          ...formErrors,
          confirmPassword: 'Passwords do not match'
        });
      } else if (name === 'confirmPassword' && value !== formData.password) {
        setFormErrors({
          ...formErrors,
          confirmPassword: 'Passwords do not match'
        });
      } else {
        setFormErrors({
          ...formErrors,
          confirmPassword: ''
        });
      }
    }
    
    // Live validation for email match
    if (name === 'confirmEmail' || (name === 'email' && formData.confirmEmail)) {
      if (name === 'email' && value !== formData.confirmEmail) {
        setFormErrors({
          ...formErrors,
          confirmEmail: 'Emails do not match'
        });
      } else if (name === 'confirmEmail' && value !== formData.email) {
        setFormErrors({
          ...formErrors,
          confirmEmail: 'Emails do not match'
        });
      } else {
        setFormErrors({
          ...formErrors,
          confirmEmail: ''
        });
      }
    }
  };

  // Validate a single step in the form
  const validateStep = (step) => {
    const errors = {};
    
    if (step === 1) {
      if (!formData.fullName.trim()) {
        errors.fullName = 'Full name is required';
      }
      
      if (!formData.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = 'Email is invalid';
      }
      
      if (!formData.confirmEmail.trim()) {
        errors.confirmEmail = 'Please confirm your email';
      } else if (formData.email !== formData.confirmEmail) {
        errors.confirmEmail = 'Emails do not match';
      }
      
      if (!formData.username.trim()) {
        errors.username = 'Username is required';
      } else if (formData.username.length < 4) {
        errors.username = 'Username must be at least 4 characters';
      }
    }
    
    if (step === 2) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[A-Z])/.test(formData.password)) {
        errors.password = 'Password must contain at least one uppercase letter';
      } else if (!/(?=.*[0-9])/.test(formData.password)) {
        errors.password = 'Password must contain at least one number';
      } else if (!/(?=.*[!@#$%^&*])/.test(formData.password)) {
        errors.password = 'Password must contain at least one special character';
      }
      
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    if (step === 3) {
      if (!formData.role) {
        errors.role = 'Please select a role';
      }
      
      if (!formData.termsAccepted) {
        errors.termsAccepted = 'You must accept the terms and conditions';
      }
    }
    
    return errors;
  };

  // Handle moving to the next step
  const handleNextStep = () => {
    const errors = validateStep(currentStep);
    
    if (Object.keys(errors).length === 0) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0); // Scroll to top for new step
    } else {
      setFormErrors(errors);
    }
  };

  // Handle moving to the previous step
  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0); // Scroll to top for new step
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate final step
    const errors = validateStep(currentStep);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setFormSubmitted(true);
      
      // Extract registration data
      const registrationData = {
        fullName: formData.fullName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role
      };
      
      // Call register function from auth context
      const result = await register(registrationData);
      
      if (result && result.success) {
        setRegistrationSuccess(true);
        // Reset form after successful registration
        setFormData({
          fullName: '',
          email: '',
          confirmEmail: '',
          username: '',
          password: '',
          confirmPassword: '',
          role: '',
          termsAccepted: false
        });
        // Keep success message visible for a moment before redirecting
        setTimeout(() => {
          onLoginClick(); // Redirect to login page
        }, 3000);
      } else {
        setFormSubmitted(false);
        // Handle registration failure
        setFormErrors({
          general: result.error || 'Registration failed, please try again'
        });
      }
    } catch (err) {
      setFormSubmitted(false);
      console.error('Registration error:', err);
      setFormErrors({
        general: err.message || 'An unexpected error occurred'
      });
    }
  };

  // Get password strength level
  const getPasswordStrength = (password) => {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character type checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[!@#$%^&*]/.test(password)) strength += 1;
    
    // Return strength level (0-5)
    return strength;
  };

  // Render step 1: Personal Information
  const renderStep1 = () => (
    <div className="form-step">
      <h3>Step 1: Account Information</h3>
      
      <div className="form-group">
        <label htmlFor="fullName">Full Name</label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          disabled={isLoading || formSubmitted}
          className={formErrors.fullName ? 'error' : ''}
          placeholder="Enter your full name"
        />
        {formErrors.fullName && <div className="field-error">{formErrors.fullName}</div>}
      </div>
      
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading || formSubmitted}
          className={formErrors.email ? 'error' : ''}
          placeholder="Enter your email"
        />
        {formErrors.email && <div className="field-error">{formErrors.email}</div>}
      </div>
      
      <div className="form-group">
        <label htmlFor="confirmEmail">Confirm Email</label>
        <input
          type="email"
          id="confirmEmail"
          name="confirmEmail"
          value={formData.confirmEmail}
          onChange={handleChange}
          disabled={isLoading || formSubmitted}
          className={formErrors.confirmEmail ? 'error' : ''}
          placeholder="Confirm your email"
        />
        {formErrors.confirmEmail && <div className="field-error">{formErrors.confirmEmail}</div>}
      </div>
      
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading || formSubmitted}
          className={formErrors.username ? 'error' : ''}
          placeholder="Choose a username"
        />
        {formErrors.username && <div className="field-error">{formErrors.username}</div>}
      </div>
      
      <div className="form-actions">
        <button 
          type="button" 
          className="secondary-button" 
          onClick={onLoginClick}
          disabled={isLoading || formSubmitted}
        >
          Back to Login
        </button>
        <button 
          type="button" 
          className="primary-button" 
          onClick={handleNextStep}
          disabled={isLoading || formSubmitted}
        >
          Next Step
        </button>
      </div>
    </div>
  );

  // Render step 2: Password
  const renderStep2 = () => (
    <div className="form-step">
      <h3>Step 2: Create Password</h3>
      
      <div className="form-group password-field">
        <label htmlFor="password">Password</label>
        <input
          type={showPassword ? "text" : "password"}
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading || formSubmitted}
          className={formErrors.password ? 'error' : ''}
          placeholder="Create a password"
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
      
      <PasswordStrengthMeter strength={getPasswordStrength(formData.password)} />
      
      <div className="password-requirements">
        <p>Password requirements:</p>
        <ul>
          <li className={formData.password.length >= 8 ? 'met' : ''}>
            At least 8 characters long
          </li>
          <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
            Contains at least one uppercase letter
          </li>
          <li className={/[0-9]/.test(formData.password) ? 'met' : ''}>
            Contains at least one number
          </li>
          <li className={/[!@#$%^&*]/.test(formData.password) ? 'met' : ''}>
            Contains at least one special character (!@#$%^&*)
          </li>
        </ul>
      </div>
      
      <div className="form-group password-field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          type={showConfirmPassword ? "text" : "password"}
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={isLoading || formSubmitted}
          className={formErrors.confirmPassword ? 'error' : ''}
          placeholder="Confirm your password"
        />
        <button 
          type="button" 
          className="password-toggle" 
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          tabIndex="-1"
        >
          {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
        </button>
        {formErrors.confirmPassword && <div className="field-error">{formErrors.confirmPassword}</div>}
      </div>
      
      <div className="form-actions">
        <button 
          type="button" 
          className="secondary-button" 
          onClick={handlePreviousStep}
          disabled={isLoading || formSubmitted}
        >
          Previous Step
        </button>
        <button 
          type="button" 
          className="primary-button" 
          onClick={handleNextStep}
          disabled={isLoading || formSubmitted}
        >
          Next Step
        </button>
      </div>
    </div>
  );

  // Render step 3: Account Type and Terms
  const renderStep3 = () => (
    <div className="form-step">
      <h3>Step 3: Account Type</h3>
      
      <div className="form-group">
        <label htmlFor="role">Select Role</label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          disabled={isLoading || formSubmitted}
          className={formErrors.role ? 'error' : ''}
        >
          <option value="">Select a role</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        {formErrors.role && <div className="field-error">{formErrors.role}</div>}
      </div>
      
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="termsAccepted"
          name="termsAccepted"
          checked={formData.termsAccepted}
          onChange={handleChange}
          disabled={isLoading || formSubmitted}
        />
        <label htmlFor="termsAccepted">
          I agree to the <a href="#terms" onClick={(e) => e.preventDefault()}>Terms and Conditions</a> and <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
        </label>
        {formErrors.termsAccepted && <div className="field-error">{formErrors.termsAccepted}</div>}
      </div>
      
      <div className="form-actions">
        <button 
          type="button" 
          className="secondary-button" 
          onClick={handlePreviousStep}
          disabled={isLoading || formSubmitted}
        >
          Previous Step
        </button>
        <button 
          type="submit" 
          className={`primary-button ${isLoading || formSubmitted ? 'loading' : ''}`}
          disabled={isLoading || formSubmitted}
        >
          {isLoading || formSubmitted ? 'Creating Account...' : 'Create Account'}
          {(isLoading || formSubmitted) && <span className="loading-spinner"></span>}
        </button>
      </div>
    </div>
  );

  // Render success message
  const renderSuccessMessage = () => (
    <div className="success-message">
      <div className="success-icon">✓</div>
      <h3>Registration Successful!</h3>
      <p>Your account has been created successfully.</p>
      <p>You will be redirected to the login page shortly...</p>
    </div>
  );

  return (
    <div className="registration-container">
      <h2>Create an Account</h2>
      
      {/* Registration progress indicator */}
      <div className="progress-indicator">
        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Account</div>
        </div>
        <div className="progress-line"></div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Password</div>
        </div>
        <div className="progress-line"></div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Confirmation</div>
        </div>
      </div>
      
      {/* Error message */}
      {(error || formErrors.general) && (
        <div className="error-message">
          {error || formErrors.general}
        </div>
      )}
      
      {/* Registration success message */}
      {registrationSuccess ? renderSuccessMessage() : (
        <form onSubmit={handleSubmit} className="registration-form">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </form>
      )}
    </div>
  );
};

export default RegistrationForm; 