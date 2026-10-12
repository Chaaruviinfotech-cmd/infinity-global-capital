import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

/**
 * ====================================================================
 * THEME TOGGLE BUTTON (Dark / White Theme Switcher)
 * ====================================================================
 * Allows user to toggle between Dark mode and White (Light) mode with
 * instant CSS variable switching and persistent localStorage sync.
 */
const ThemeToggle = ({ className = '', showLabel = true }) => {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.igc_data?.theme) || 'dark';
  const isLight = theme === 'light';

  const handleToggle = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  return (
    <button
      type="button"
      className={`btn-theme-toggle ${className}`}
      onClick={handleToggle}
      title={isLight ? 'Switch to Dark Theme' : 'Switch to White (Light) Theme'}
      aria-label="Toggle Theme"
    >
      {isLight ? (
        <>
          <i className="bi bi-moon-stars-fill text-primary"></i>
          {showLabel && <span className="theme-toggle-label d-none d-md-inline ms-1">Dark Mode</span>}
        </>
      ) : (
        <>
          <i className="bi bi-sun-fill text-warning"></i>
          {showLabel && <span className="theme-toggle-label d-none d-md-inline ms-1">White Theme</span>}
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
