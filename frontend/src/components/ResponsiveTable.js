import React from 'react';

const ResponsiveTable = ({ children, className = '' }) => {
  return (
    <div className={`table-responsive ${className}`}>
      <div className="table-container">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveTable; 