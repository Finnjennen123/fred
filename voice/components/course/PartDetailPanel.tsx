import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import dynamic from 'next/dynamic';
import type { Part, Phase } from '../../lib/course-types';
import type { RendererConfig } from '../../lib/pipeline/types';

const GamePlayer = dynamic(
  () => import('../GamePlayer'),
  { ssr: false }
);

interface PartDetailPanelProps {
  part: Part | null;
  phase: Phase | null;
  isOpen: boolean;
  onClose: () => void;
  onStartLesson: () => void;
  onMarkMastered: () => void;
  gameResult?: { config: RendererConfig; customCode?: string };
  gameLoading?: boolean;
  gameProgress?: string;
  gameError?: boolean;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  locked: { label: 'Locked', color: '#a3a3a3', bg: '#f0eeea' },
  not_started: { label: 'Not Started', color: '#666', bg: '#ece9e4' },
  in_progress: { label: 'In Progress', color: '#ff6b00', bg: '#fff5eb' },
  mastered: { label: 'Mastered', color: '#00c864', bg: '#ecfdf5' },
};

type PanelView = 'article' | 'loading' | 'game';

const LOADING_STEPS = [
  'Analyzing the lesson content',
  'Identifying key concepts to test',
  'Designing your challenge',
  'Selecting the best game format',
  'Building interactive elements',
  'Crafting questions and scenarios',
  'Evaluating game quality',
  'Polishing the experience',
  'Almost ready',
];

export default function PartDetailPanel({
  part,
  phase,
  isOpen,
  onClose,
  onStartLesson,
  onMarkMastered,
  gameResult,
  gameLoading,
  gameProgress,
  gameError,
}: PartDetailPanelProps) {
  const [loadingStep, setLoadingStep] = useState(0);
  // User-controlled: whether to show the game/loading view vs article
  const [showGameView, setShowGameView] = useState(false);

  // Reset game view when switching to a different part
  useEffect(() => {
    setShowGameView(false);
  }, [part?.id]);

  // Advance loading step on a timer when in loading view
  useEffect(() => {
    if (!gameLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 10000);
    return () => clearInterval(interval);
  }, [gameLoading]);

  const panelView: PanelView = (() => {
    if (!part) return 'article';
    // Only show loading/game when user explicitly chose to (via "Test Me" or "View Game")
    if (showGameView && part.status === 'mastered' && gameResult) return 'game';
    if (showGameView && part.status === 'mastered' && (gameLoading || gameError)) return 'loading';
    return 'article';
  })();

  const handleTestMe = () => {
    onMarkMastered();
    setShowGameView(true);
  };

  return (
    <AnimatePresence>
      {isOpen && part && phase && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.08)',
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: panelView === 'game' ? 640 : 480,
              maxWidth: '90vw',
              height: '100vh',
              background: '#faf9f7',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 40px rgba(0,0,0,0.06)',
              transition: 'width 0.3s ease',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid #ece9e4',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {panelView === 'game' ? 'Knowledge Check' : phase.title}
                </span>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#999',
                    fontSize: 18,
                    padding: '4px 8px',
                    borderRadius: 8,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0eeea';
                    e.currentTarget.style.color = '#1a1a1a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#999';
                  }}
                >
                  ✕
                </button>
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', margin: 0 }}>
                {part.title}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 20,
                    color: statusLabels[part.status].color,
                    background: statusLabels[part.status].bg,
                  }}
                >
                  {statusLabels[part.status].label}
                </span>
              </div>
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
              }}
            >
              {panelView === 'article' && (
                <>
                  {/* Game ready banner (when viewing article but game is done) */}
                  {part.status === 'mastered' && gameResult && (
                    <div
                      onClick={() => setShowGameView(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#ecfdf5',
                        border: '1px solid #bbf7d0',
                        borderRadius: 10,
                        marginBottom: 20,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#15803d' }}>
                        Knowledge check ready
                      </span>
                      <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Play &rarr;</span>
                    </div>
                  )}

                  {/* Game loading banner (when viewing article but game is still generating) */}
                  {part.status === 'mastered' && !gameResult && gameLoading && (
                    <div
                      onClick={() => setShowGameView(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#fff5eb',
                        border: '1px solid #fed7aa',
                        borderRadius: 10,
                        marginBottom: 20,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#9a3412' }}>
                        Generating knowledge check...
                      </span>
                      <span style={{ fontSize: 12, color: '#c2410c' }}>View &rarr;</span>
                    </div>
                  )}

                  {/* Mastery criteria */}
                  <div
                    style={{
                      padding: '14px 16px',
                      background: '#f5f3f0',
                      borderRadius: 12,
                      marginBottom: 24,
                      border: '1px solid #ece9e4',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#999', marginBottom: 6 }}>
                      Mastery Criteria
                    </div>
                    <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5, margin: 0 }}>
                      {part.mastery_criteria}
                    </p>
                  </div>

                  {/* Lesson content */}
                  <div className="lesson-content">
                    {part.isLoading ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        color: '#666',
                        textAlign: 'center'
                      }}>
                        <div className="loading-orb" style={{ marginBottom: 16 }}></div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>Generating your personalized lesson...</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                          Consulting the oracle &middot; Reading the stars &middot; Searching the web
                        </div>
                      </div>
                    ) : (
                      <ReactMarkdown>{part.content}</ReactMarkdown>
                    )}
                  </div>
                </>
              )}

              {panelView === 'loading' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 360,
                  gap: 32,
                  padding: '40px 20px',
                }}>
                  {/* Spinner */}
                  <div style={{ position: 'relative', width: 48, height: 48 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      border: '3px solid #ece9e4',
                      borderTop: '3px solid #ff6b00',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                  </div>

                  {/* Sequential step list */}
                  <div style={{ width: '100%', maxWidth: 280 }}>
                    {LOADING_STEPS.map((step, i) => {
                      const isDone = i < loadingStep;
                      const isCurrent = i === loadingStep;
                      const isFuture = i > loadingStep;

                      return (
                        <div
                          key={step}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '6px 0',
                            opacity: isFuture ? 0.25 : 1,
                            transition: 'opacity 0.5s ease',
                          }}
                        >
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isDone ? '#00c864' : isCurrent ? '#fff5eb' : '#f5f3f0',
                            border: isCurrent ? '2px solid #ff6b00' : isDone ? '2px solid #00c864' : '2px solid #e0ddd8',
                            transition: 'all 0.4s ease',
                          }}>
                            {isDone && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {isCurrent && (
                              <div style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#ff6b00',
                                animation: 'pulse 1.5s ease-in-out infinite',
                              }} />
                            )}
                          </div>

                          <span style={{
                            fontSize: 13,
                            color: isDone ? '#00c864' : isCurrent ? '#1a1a1a' : '#b0ada8',
                            fontWeight: isCurrent ? 600 : 400,
                            transition: 'all 0.4s ease',
                          }}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Real SSE progress as subtitle */}
                  {gameProgress && (
                    <p style={{
                      fontSize: 11,
                      color: '#999',
                      margin: 0,
                      textAlign: 'center',
                      fontStyle: 'italic',
                    }}>
                      {gameProgress}
                    </p>
                  )}

                  {/* Error state */}
                  {gameError && !gameLoading && (
                    <p style={{ fontSize: 13, color: '#dc2626', margin: 0, textAlign: 'center' }}>
                      Game generation failed. Your mastery has been recorded.
                    </p>
                  )}
                </div>
              )}

              {panelView === 'game' && gameResult && (
                <GamePlayer config={gameResult.config} customCode={gameResult.customCode} />
              )}
            </div>

            {/* Footer actions */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #ece9e4',
                flexShrink: 0,
                display: 'flex',
                gap: 10,
              }}
            >
              {part.status === 'not_started' && (
                <button onClick={onStartLesson} style={primaryBtnStyle}>
                  Start Lesson
                </button>
              )}
              {part.status === 'in_progress' && (
                <>
                  <button onClick={handleTestMe} style={primaryBtnStyle}>
                    I've Read This — Test Me
                  </button>
                  <button onClick={onClose} style={secondaryBtnStyle}>
                    Continue Later
                  </button>
                </>
              )}
              {part.status === 'mastered' && panelView === 'loading' && (
                <>
                  <button onClick={() => setShowGameView(false)} style={secondaryBtnStyle}>
                    Back to Lesson
                  </button>
                </>
              )}
              {part.status === 'mastered' && panelView === 'game' && (
                <>
                  <button onClick={() => setShowGameView(false)} style={secondaryBtnStyle}>
                    Back to Lesson
                  </button>
                  <button onClick={onClose} style={primaryBtnStyle}>
                    Done
                  </button>
                </>
              )}
              {part.status === 'mastered' && panelView === 'article' && (
                <>
                  {gameResult ? (
                    <button onClick={() => setShowGameView(true)} style={primaryBtnStyle}>
                      Play Knowledge Check
                    </button>
                  ) : gameLoading ? (
                    <button onClick={() => setShowGameView(true)} style={secondaryBtnStyle}>
                      View Game Progress
                    </button>
                  ) : (
                    <button onClick={onClose} style={secondaryBtnStyle}>
                      {gameError ? 'Close' : 'Review Complete'}
                    </button>
                  )}
                </>
              )}
              {part.status === 'locked' && (
                <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
                  Complete the previous lesson to unlock this one.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 20px',
  background: '#1a1a1a',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
  letterSpacing: '-0.01em',
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 20px',
  background: '#f0eeea',
  color: '#1a1a1a',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
};
