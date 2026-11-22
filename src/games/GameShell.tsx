import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  DifficultyLevel,
  DifficultyProgression,
  GameType,
  PlayMode,
} from '../types';
import { DIFFICULTY_LABELS } from '../data/catalog';
import { canSpeakSpanish, speakSpanish, stopSpeaking } from '../lib/speech';
import { useGameThemeContext } from '../components/GameThemeContext';
import { DemoOverlay } from './DemoOverlay';

interface GameShellProps {
  title: string;
  gameType: GameType;
  mode: PlayMode;
  difficulty: DifficultyLevel;
  progression: DifficultyProgression;
  roundLabel: string;
  spokenPrompt?: string;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  showInitialDemo: boolean;
  onDemoSeen: () => void;
  onToggleSound: () => void;
  onRepeatRound: () => void;
  onExit: () => void;
  bottomDock?: ReactNode;
  children: ReactNode;
}

export function GameShell({
  title,
  gameType,
  mode,
  difficulty,
  progression,
  roundLabel,
  spokenPrompt,
  soundEnabled,
  voiceEnabled,
  showInitialDemo,
  onDemoSeen,
  onToggleSound,
  onRepeatRound,
  onExit,
  bottomDock,
  children,
}: GameShellProps) {
  const [showDemo, setShowDemo] = useState(showInitialDemo && mode === 'individual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const themeCtx = useGameThemeContext();

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      stopSpeaking();
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen might be blocked in iframe/certain browsers
    }
  };

  const handleCloseDemo = () => {
    setShowDemo(false);
    onDemoSeen();
  };

  const handleReplayVoice = () => {
    if (spokenPrompt) {
      speakSpanish(spokenPrompt, true);
    }
  };

  const fullscreenSupported =
    typeof document !== 'undefined' && Boolean(document.documentElement?.requestFullscreen);

  return (
    <div className={`game-shell mode-${mode}`}>
      <header className="game-topbar">
        <div className="game-topbar-left">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              stopSpeaking();
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              onExit();
            }}
          >
            <ArrowLeft size={18} /> Salir
          </button>
          <h1 className="game-title-inline">{title}</h1>
          <span className="chip chip-teal">
            {DIFFICULTY_LABELS[difficulty]}
            {progression === 'progressive' ? ' · Progresivo' : ' · Fijo'}
          </span>
          <span className="chip">{roundLabel}</span>
          {mode === 'asamblea' && <span className="chip chip-indigo">Asamblea / PDI</span>}
        </div>

        <div className="game-topbar-right">
          {themeCtx && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={themeCtx.onOpenPicker}
              title={`Cambiar temáticas (${themeCtx.label})`}
              aria-label="Cambiar temáticas"
              data-testid="game-theme-picker-btn"
            >
              <Layers size={16} /> Temáticas
            </button>
          )}
          {spokenPrompt && canSpeakSpanish() && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReplayVoice}
              title="Escuchar consigna"
              aria-label="Escuchar consigna"
            >
              <Volume2 size={18} /> Escuchar
            </button>
          )}
          <button
            type="button"
            className="btn-icon"
            onClick={onRepeatRound}
            title="Repetir ronda con nueva distribución"
            aria-label="Repetir ronda"
          >
            <RotateCcw size={19} />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowDemo(true)}
            title="Ver cómo se juega"
            aria-label="Ver cómo se juega"
          >
            <HelpCircle size={20} />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={onToggleSound}
            title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
            aria-label={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
          >
            {soundEnabled || voiceEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          {fullscreenSupported && (
            <button
              type="button"
              className="btn-icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>
      </header>

      <main className="game-stage">{children}</main>

      {bottomDock && <footer className="asamblea-dock">{bottomDock}</footer>}

      {showDemo && <DemoOverlay gameType={gameType} onClose={handleCloseDemo} />}
    </div>
  );
}
