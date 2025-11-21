import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const colors = {
  skyBlue: '#87ceeb',
  black: '#000000',
  white: '#ffffff',
};

function StudentSidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleDashboardClick = () => {
    if (location.pathname === '/student-account' || location.pathname === '/') {
      window.location.href = '/student-account';
    } else {
      navigate('/student-account');
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div style={styles.sidebar}>
      {/* Logo Section */}
      <div style={styles.logoSection}>
        <h2 style={styles.logoText}>PorikkhaKori</h2>
        <p style={styles.logoSubtext}>Student Portal</p>
      </div>

      {/* Menu Items */}
      <nav style={styles.navMenu}>
        <NavItem
          icon="📚"
          label="Dashboard"
          active={location.pathname === '/student-account' || location.pathname === '/'}
          onClick={handleDashboardClick}
        />
        <NavItem
          icon="👤"
          label="My Profile"
          active={location.pathname === '/student-profile'}
          onClick={() => navigate('/student-profile')}
        />
        <NavItem
          icon="📊"
          label="My Results"
          active={location.pathname === '/student-exams'}
          onClick={() => navigate('/student-exams')}
        />
      </nav>

      {/* Divider */}
      <div style={styles.divider}></div>

      {/* Bottom Menu */}
      <nav style={styles.bottomMenu}>
        <NavItem
          icon="🚪"
          label="Logout"
          active={false}
          onClick={handleLogout}
        />
      </nav>
    </div>
  );

  function NavItem({ icon, label, active, onClick }) {
    return (
      <div
        onClick={onClick}
        style={{
          ...styles.navItem,
          backgroundColor: active ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
          borderBottom: 'none',
          outline: 'none',
          boxShadow: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = active ? 'rgba(0, 0, 0, 0.2)' : 'transparent';
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span style={styles.navIcon}>{icon}</span>
        <span style={styles.navLabel}>{label}</span>
      </div>
    );
  }
}

const styles = {
  sidebar: {
    width: '280px',
    backgroundColor: colors.skyBlue,
    padding: '30px 20px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflowY: 'auto',
  },
  logoSection: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: colors.black,
    margin: '0 0 8px 0',
    fontFamily: 'Roboto, sans-serif',
  },
  logoSubtext: {
    fontSize: '12px',
    color: 'rgba(0, 0, 0, 0.6)',
    margin: 0,
    fontFamily: 'Roboto, sans-serif',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    padding: '12px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: colors.black,
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'Roboto, sans-serif',
    border: 'none',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden',
  },
  navIcon: {
    fontSize: '18px',
  },
  navLabel: {
    flex: 1,
  },
  divider: {
    borderTop: '2px solid rgba(0, 0, 0, 0.2)',
    margin: '20px 0',
  },
  bottomMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: 'auto',
  },
};

export default StudentSidebar;
