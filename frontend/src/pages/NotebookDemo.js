import React from 'react';
import { useTheme } from '../context/ThemeContext';
import NotebookPattern from '../components/NotebookPattern';
import ModernCard from '../components/ModernCard';
import ModernButton from '../components/ModernButton';

/**
 * Demo page showing the NotebookPattern component
 */
const NotebookDemo = () => {
    const { themeName } = useTheme();

    return (
        <NotebookPattern>
            <div style={{ padding: '80px 70px', maxWidth: '1200px', margin: '0 auto' }}>
                <h1 className="page-title">Notebook Pattern Demo</h1>
                <p style={{ fontSize: '18px', marginBottom: '40px', color: 'var(--color-text-secondary)' }}>
                    This page demonstrates the beautiful notebook paper pattern that adapts to {themeName} mode.
                </p>

                <div className="grid grid-3" style={{ marginTop: '40px' }}>
                    <ModernCard>
                        <h3>Feature 1</h3>
                        <p>The pattern includes horizontal lines like real notebook paper.</p>
                    </ModernCard>

                    <ModernCard>
                        <h3>Feature 2</h3>
                        <p>A red (light mode) or blue (dark mode) margin line on the left.</p>
                    </ModernCard>

                    <ModernCard>
                        <h3>Feature 3</h3>
                        <p>Decorative hole punches for that authentic notebook feel.</p>
                    </ModernCard>
                </div>

                <div style={{ marginTop: '60px' }}>
                    <h2 className="section-title">Sample Content</h2>
                    <p style={{ lineHeight: '30px', fontSize: '16px' }}>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                        incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                        exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                    <p style={{ lineHeight: '30px', fontSize: '16px', marginTop: '30px' }}>
                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                        fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                        culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                </div>

                <div style={{ marginTop: '60px' }}>
                    <ModernButton variant="primary" size="lg">
                        Try It Out!
                    </ModernButton>
                </div>
            </div>
        </NotebookPattern>
    );
};

export default NotebookDemo;
