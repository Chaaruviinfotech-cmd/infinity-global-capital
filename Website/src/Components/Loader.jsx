import React from 'react';

/**
 * Beginner-friendly Loading Spinner component
 * Used as fallback for lazy routing Suspense and during API requests.
 */
const Loader = ({ text = 'Loading Infinity Capital System...' }) => {
  return (
    <div
      className="d-flex flex-column justify-content-center align-items-center"
      style={{
        minHeight: '60vh',
        width: '100%',
        color: '#FFFFFF',
      }}
    >
      <div
        className="spinner-border text-info mb-3"
        role="status"
        style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-white small fw-bold mb-0" style={{ letterSpacing: '0.5px' }}>
        {text}
      </p>
    </div>
  );
};

export default Loader;
