import React from 'react';

const PasswordStrengthMeter = ({ strength }) => {
  // Get strength label based on the strength level (0-5)
  const getStrengthLabel = (strength) => {
    if (strength === 0) return '';
    if (strength <= 1) return 'Very Weak';
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Medium';
    if (strength <= 4) return 'Strong';
    return 'Very Strong';
  };

  // Get color class based on the strength level
  const getColorClass = (strength) => {
    if (strength === 0) return '';
    if (strength <= 1) return 'very-weak';
    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    if (strength <= 4) return 'strong';
    return 'very-strong';
  };

  // Skip rendering if no password entered
  if (strength === 0) return null;

  return (
    <div className="password-strength">
      <div className="strength-meter">
        <div className="strength-meter-fill" 
             style={{ width: `${strength * 20}%` }}
             data-strength={getColorClass(strength)}>
        </div>
      </div>
      <div className={`strength-text ${getColorClass(strength)}`}>
        {getStrengthLabel(strength)}
      </div>
    </div>
  );
};

export default PasswordStrengthMeter; 