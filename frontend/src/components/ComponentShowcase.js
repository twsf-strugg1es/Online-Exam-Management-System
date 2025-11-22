import React, { useState } from 'react';
import ModernCard from './ModernCard';
import ModernButton from './ModernButton';
import ModernInput from './ModernInput';
import ModernModal, { ModernConfirmModal } from './ModernModal';
import './ComponentShowcase.css';

/**
 * Component Showcase
 * Demonstrates all modern UI components with examples
 */
const ComponentShowcase = () => {
    const [showModal, setShowModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    return (
        <div className="showcase">
            <div className="showcase__hero">
                <div className="showcase__hero-content">
                    <h1 className="showcase__title gradient-text">
                        Modern UI Component Library
                    </h1>
                    <p className="showcase__subtitle">
                        Premium, animation-rich components for your Exam Management System
                    </p>
                </div>
            </div>

            <div className="showcase__container">
                {/* Cards Section */}
                <section className="showcase__section">
                    <h2 className="showcase__section-title">Modern Cards</h2>
                    <div className="grid grid-3">
                        <ModernCard variant="default">
                            <div className="modern-card__header">
                                <h3 className="modern-card__title">Default Card</h3>
                            </div>
                            <div className="modern-card__body">
                                <p>Clean, minimal card with subtle shadow and hover effect.</p>
                            </div>
                        </ModernCard>

                        <ModernCard variant="gradient">
                            <div className="modern-card__header">
                                <h3 className="modern-card__title">Gradient Card</h3>
                            </div>
                            <div className="modern-card__body">
                                <p>Eye-catching gradient background perfect for highlights.</p>
                            </div>
                        </ModernCard>

                        <ModernCard variant="glass">
                            <div className="modern-card__header">
                                <h3 className="modern-card__title">Glass Card</h3>
                            </div>
                            <div className="modern-card__body">
                                <p>Glassmorphism effect with blur and transparency.</p>
                            </div>
                        </ModernCard>
                    </div>
                </section>

                {/* Metric Cards */}
                <section className="showcase__section">
                    <h2 className="showcase__section-title">Metric Cards</h2>
                    <div className="grid grid-4">
                        <ModernCard>
                            <div className="metric-card">
                                <div className="metric-card__value">1,234</div>
                                <div className="metric-card__label">Total Students</div>
                                <div className="metric-card__change metric-card__change--positive">
                                    ↑ 12% from last month
                                </div>
                            </div>
                        </ModernCard>

                        <ModernCard>
                            <div className="metric-card">
                                <div className="metric-card__value">89</div>
                                <div className="metric-card__label">Active Exams</div>
                                <div className="metric-card__change metric-card__change--positive">
                                    ↑ 5% from last week
                                </div>
                            </div>
                        </ModernCard>

                        <ModernCard>
                            <div className="metric-card">
                                <div className="metric-card__value">95%</div>
                                <div className="metric-card__label">Pass Rate</div>
                                <div className="metric-card__change metric-card__change--positive">
                                    ↑ 3% improvement
                                </div>
                            </div>
                        </ModernCard>

                        <ModernCard>
                            <div className="metric-card">
                                <div className="metric-card__value">4.8</div>
                                <div className="metric-card__label">Avg Score</div>
                                <div className="metric-card__change metric-card__change--negative">
                                    ↓ 0.2 from last term
                                </div>
                            </div>
                        </ModernCard>
                    </div>
                </section>

                {/* Buttons Section */}
                <section className="showcase__section">
                    <h2 className="showcase__section-title">Modern Buttons</h2>
                    <div className="showcase__button-grid">
                        <div>
                            <h4>Primary</h4>
                            <div className="modern-btn-group">
                                <ModernButton variant="primary" size="sm">Small</ModernButton>
                                <ModernButton variant="primary" size="md">Medium</ModernButton>
                                <ModernButton variant="primary" size="lg">Large</ModernButton>
                            </div>
                        </div>

                        <div>
                            <h4>Secondary</h4>
                            <div className="modern-btn-group">
                                <ModernButton variant="secondary" size="sm">Small</ModernButton>
                                <ModernButton variant="secondary" size="md">Medium</ModernButton>
                                <ModernButton variant="secondary" size="lg">Large</ModernButton>
                            </div>
                        </div>

                        <div>
                            <h4>Outline</h4>
                            <div className="modern-btn-group">
                                <ModernButton variant="outline" size="md">Outline</ModernButton>
                                <ModernButton variant="ghost" size="md">Ghost</ModernButton>
                                <ModernButton variant="danger" size="md">Danger</ModernButton>
                            </div>
                        </div>

                        <div>
                            <h4>With Icons & Loading</h4>
                            <div className="modern-btn-group">
                                <ModernButton variant="primary" icon={<span>📊</span>}>
                                    View Stats
                                </ModernButton>
                                <ModernButton variant="secondary" loading>
                                    Loading...
                                </ModernButton>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Inputs Section */}
                <section className="showcase__section">
                    <h2 className="showcase__section-title">Modern Inputs</h2>
                    <div className="grid grid-2">
                        <ModernInput
                            label="Email Address"
                            type="email"
                            placeholder="Enter your email"
                            icon={<span>📧</span>}
                            required
                        />
                        <ModernInput
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            icon={<span>🔒</span>}
                            required
                        />
                        <ModernInput
                            label="Search"
                            type="text"
                            placeholder="Search exams..."
                            icon={<span>🔍</span>}
                            className="modern-input--search"
                        />
                        <ModernInput
                            label="Full Name"
                            type="text"
                            error="This field is required"
                            required
                        />
                    </div>
                </section>

                {/* Status Badges */}
                <section className="showcase__section">
                    <h2 className="showcase__section-title">Status Badges</h2>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <span className="badge badge-success">Active</span>
                        <span className="badge badge-warning">Pending</span>
                        <span className="badge badge-error">Failed</span>
                        <span className="badge badge-info">In Progress</span>
                    </div>
                </section>

                {/* Animation Examples */}
                <section className="showcase__section">
                    <h2 className="showcase__section-title">Animations</h2>
                    <div className="grid grid-3">
                        <ModernCard className="animate-fade-in-up">
                            <h4>Fade In Up</h4>
                            <p>Smooth entrance animation</p>
                        </ModernCard>
                        <ModernCard className="animate-slide-in-right">
                            <h4>Slide In Right</h4>
                            <p>Horizontal slide effect</p>
                        </ModernCard>
                        <ModernCard className="animate-scale-in">
                            <h4>Scale In</h4>
                            <p>Zoom entrance effect</p>
                        </ModernCard>
                    </div>
                </section>

                {/* Modals Section */}
                <section className="showcase__section">
                    <h2 className="showcase__section-title">Modals</h2>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <ModernButton
                            variant="primary"
                            onClick={() => setShowModal(true)}
                        >
                            Open Modal
                        </ModernButton>
                        <ModernButton
                            variant="danger"
                            onClick={() => setShowConfirmModal(true)}
                        >
                            Open Confirm Modal
                        </ModernButton>
                    </div>
                </section>
            </div>

            {/* Modal Examples */}
            <ModernModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Example Modal"
                size="md"
                footer={
                    <div className="modern-modal__actions">
                        <ModernButton variant="outline" onClick={() => setShowModal(false)}>
                            Cancel
                        </ModernButton>
                        <ModernButton variant="primary" onClick={() => setShowModal(false)}>
                            Save Changes
                        </ModernButton>
                    </div>
                }
            >
                <p>This is a modern modal with glassmorphism effects and smooth animations.</p>
                <ModernInput
                    label="Example Input"
                    placeholder="Type something..."
                    style={{ marginTop: 'var(--space-4)' }}
                />
            </ModernModal>

            <ModernConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={() => {
                    alert('Confirmed!');
                    setShowConfirmModal(false);
                }}
                title="Delete Item"
                message="Are you sure you want to delete this item? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

export default ComponentShowcase;
