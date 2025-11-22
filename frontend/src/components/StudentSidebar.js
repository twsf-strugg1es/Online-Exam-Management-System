import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ModernSidebar.css';

function StudentSidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { path: '/student-account', icon: '📊', label: 'Dashboard' },
    { path: '/student-profile', icon: '👤', label: 'My Profile' },
    { path: '/student-exams', icon: '📝', label: 'My Results' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`modern-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header */}
      <div className="modern-sidebar__header">
        <div className="modern-sidebar__logo">
          <span className="modern-sidebar__logo-icon">🎓</span>
          {isExpanded && (
            <div className="modern-sidebar__logo-text">
              <h2>{user?.full_name || 'Student'}</h2>
              <p>Student Portal</p>
            </div>
          )}
        </div>
      </div>

      <div className="modern-sidebar__divider"></div>

      {/* Navigation */}
      <nav className="modern-sidebar__nav">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`modern-sidebar__item ${isActive(item.path) ? 'active' : ''}`}
            title={!isExpanded ? item.label : ''}
          >
            <span className="modern-sidebar__icon">{item.icon}</span>
            {isExpanded && <span className="modern-sidebar__label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="modern-sidebar__divider"></div>

      {/* Logout */}
      <div className="modern-sidebar__footer">
        <button
          onClick={onLogout}
          className="modern-sidebar__item modern-sidebar__logout"
          title={!isExpanded ? 'Logout' : ''}
        >
          <span className="modern-sidebar__icon">🚪</span>
          {isExpanded && <span className="modern-sidebar__label">Logout</span>}
        </button>
      </div>
    </div>
  );
}

export default StudentSidebar;
