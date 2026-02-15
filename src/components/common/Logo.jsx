import React from 'react';
import { IoSchool } from 'react-icons/io5';

const Logo = ({ size = 32, className = '', textClass = '' }) => {
  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      <IoSchool size={size} className="text-primary" />
      <span className={`fw-bold text-dark ${textClass}`} style={{ fontSize: size * 0.8, letterSpacing: '-0.5px' }}>
        Thesis<span className="text-primary">Track</span>
      </span>
    </div>
  );
};

export default Logo;
