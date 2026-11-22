import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  Activity,
  DifficultyLevel,
  DifficultyProgression,
  ImageItem,
  PlayMode,
} from '../types';
import {
  COLLECTION_BASE_IDS,
  DEFAULT_DIFFICULTY_CONFIG,
  DIFFICULTY_ORDER,
  MASCOT,
} from '../data/catalog';
import { shuffleArray } from '../lib/activityValidation';
import { playSoundCue, speakSpanish } from '../lib/speech';
import { GameShell } from './GameShell';

interface DobbleSymbolSlot {
  item: ImageItem;
  xPct: number; // % center inside circular card
  yPct: number;
  sizePct: number;
  rotationDeg: number;
}

interface DobbleRound {
  leftSymbols: DobbleSymbolSlot[];
  rightSymbols: DobbleSymbolSlot[];
  matchItem: ImageItem;
  dimmedHintIds: Set<string>;
}

interface DobbleGameProps {
  activity: Activity;
  images: ImageItem[];
  mode: PlayMode;
  initialDifficulty: DifficultyLevel;
  progression: DifficultyProgression;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  showInitialDemo: boolean;
  onDemoSeen: () => void;
  onToggleSound: () => void;
  onExit: () => void;
}

// Guaranteed non-overlapping polar/geometric coordinates inside a circular Dobble card!
const CARD_LAYOUTS: Record<number, { x: number; y: number; size: number }[]> = {
  3: [
    { x: 50, y: 27, size: 34 },
    { x: 28, y: 66, size: 34 },
    { x: 72, y: 66, size: 34 },
  ],
  4: [
    { x: 31, y: 31, size: 30 },
    { x: 69, y: 31, size: 30 },
    { x: 31, y: 69, size: 30 },
    { x: 69, y: 69, size: 30 },
  ],
  6: [
    { x: 50, y: 21, size: 24 },
    { x: 76, y: 36, size: 24 },
    { x: 74, y: 67, size: 24 },
    { x: 50, y: 80, size: 24 },
    { x: 26, y: 67, size: 24 },
    { x: 24, y: 36, size: 24 },
  ],
  8: [
    { x: 50, y: 50, size: 22 },
    { x: 50, y: 18, size: 21 },
    { x: 75, y: 29, size: 20 },
    { x: 82, y: 55, size: 21 },
    { x: 67, y: 78, size: 20 },
    { x: 33, y: 78, size: 21 },
    { x: 18, y: 55, size: 20 },
    { x: 25, y: 29, size: 21 },
  ],
};

function layoutSymbols(
  items: ImageItem[],
  varySize: boolean,
  varyRotation: boolean
): DobbleSymbolSlot[] {
  const count = items.length;
  const template = CARD_LAYOUTS[count] || CARD_LAYOUTS[6];
  const shuffled = shuffleArray(items);
  return shuffled.map((item, idx) => {
    const pt = template[idx % template.length];
    const scaleJitter = varySize ? 0.84 + ((idx * 17) % 30) / 100 : 1;
    const rot = varyRotation ? Math.round((Math.random() - 0.5) * 240) : 0;
    return {
      item,
      xPct: pt.x,
      yPct: pt.y,
      sizePct: Math.min(36, Math.max(17, pt.size * scaleJitter)),
      rotationDeg: rot,
    };
  });
}

export function DobbleGame({
  activity,
  images,
  mode,
  initialDifficulty,
  progression,
  soundEnabled,
  voiceEnabled,
  showInitialDemo,
  onDemoSeen,
  onToggleSound,
  onExit,
}: DobbleGameProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const cfg = activity.dobbleConfig!;
  const diffTable = activity.difficultyConfig?.dobble || DEFAULT_DIFFICULTY_CONFIG.dobble;

  // Primary pool from active theme + clean fallback from all base collections when needing up to 15 unique images (8 per card!)
  const primaryPool = useMemo(
    () => cfg.itemIds.map((id) => imageMap.get(id)).filter((i): i is ImageItem => Boolean(i)),
    [cfg.itemIds, imageMap]
  );

  const extendedPool = useMemo(() => {
    const seen = new Set(primaryPool.map((i) => i.id));
    const extras: ImageItem[] = [];
    const allBaseIds = Object.values(COLLECTION_BASE_IDS).flat();
    for (const id of allBaseIds) {
      if (!seen.has(id) && imageMap.has(id)) {
        seen.add(id);
        extras.push(imageMap.get(id)!);
      }
    }
    return [...primaryPool, ...shuffleArray(extras)];
  }, [primaryPool, imageMap]);

  const [levelIdx, setLevelIdx] = useState(
    Math.max(0, DIFFICULTY_ORDER.indexOf(initialDifficulty))
  );
  const [roundNumber, setRoundNumber] = useState(1);
  const [solvedAtLevel, setSolvedAtLevel] = useState(0);

  const [round, setRound] = useState<DobbleRound | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [solved, setSolved] = useState(false);

  const currentLevel = DIFFICULTY_ORDER[Math.min(levelIdx, DIFFICULTY_ORDER.length - 1)];

  const buildRound = useCallback(
    (lvl: DifficultyLevel) => {
      const spec = diffTable[lvl];
      const perCard = spec.symbolsPerCard;
      const neededUnique = perCard * 2 - 1;

      // Prioritize items from the chosen theme so the match is always from the active theme!
      const themeShuffled = shuffleArray(primaryPool);
      const matchItem = themeShuffled[0] || extendedPool[0];
      if (!matchItem) return;

      const othersFromTheme = themeShuffled.slice(1);
      const othersOutside = shuffleArray(
        extendedPool.filter((i) => i.id !== matchItem.id && !primaryPool.some((p) => p.id === i.id))
      );
      const fillers = [...othersFromTheme, ...othersOutside].slice(0, neededUnique - 1);

      const leftItems = [matchItem, ...fillers.slice(0, perCard - 1)];
      const rightItems = [matchItem, ...fillers.slice(perCard - 1, (perCard - 1) * 2)];

      const dimmedHintIds = new Set(
        shuffleArray(fillers)
          .slice(0, Math.min(fillers.length, Math.max(2, Math.floor(fillers.length / 2))))
          .map((i) => i.id)
      );

      setRound({
        leftSymbols: layoutSymbols(leftItems, spec.varySize, spec.varyRotation),
        rightSymbols: layoutSymbols(rightItems, spec.varySize, spec.varyRotation),
        matchItem,
        dimmedHintIds,
      });
      setSelectedItemId(null);
      setWrongIds(new Set());
      setShakeId(null);
      setUsedHint(false);
      setSolved(false);
    },
    [diffTable, primaryPool, extendedPool]
  );

  useEffect(() => {
    buildRound(currentLevel);
  }, [buildRound, currentLevel]);

  const promptText = '¡Ojo de lince! Encuentra el único dibujo que está en las dos cartas';

  useEffect(() => {
    if (roundNumber === 1 && mode === 'individual') {
      speakSpanish('Encuentra el único dibujo que se repite en las dos cartas.', voiceEnabled);
    }
  }, [roundNumber, mode, voiceEnabled]);

  const handleSymbolClick = (item: ImageItem) => {
    if (!round || solved) return;

    if (mode === 'asamblea') {
      playSoundCue('flip', soundEnabled);
      setSelectedItemId(item.id);
      return;
    }

    if (item.id === round.matchItem.id) {
      playSoundCue('success', soundEnabled);
      setSelectedItemId(item.id);
      setSolved(true);
      setSolvedAtLevel((c) => c + 1);
      speakSpanish(`¡Ojo de lince! ${item.name} está en las dos cartas.`, voiceEnabled);
    } else {
      playSoundCue('retry', soundEnabled);
      setWrongIds((prev) => new Set(prev).add(item.id));
      setShakeId(item.id);
      window.setTimeout(() => setShakeId((cur) => (cur === item.id ? null : cur)), 380);
    }
  };

  const handleAsambleaCheck = () => {
    if (!round || !selectedItemId || solved) return;
    if (selectedItemId === round.matchItem.id) {
      playSoundCue('success', soundEnabled);
      setSolved(true);
      setSolvedAtLevel((c) => c + 1);
    } else {
      playSoundCue('retry', soundEnabled);
      setWrongIds((prev) => new Set(prev).add(selectedItemId));
      setShakeId(selectedItemId);
      setSelectedItemId(null);
      window.setTimeout(() => setShakeId(null), 380);
    }
  };

  const canStepUp = progression === 'progressive' && levelIdx < DIFFICULTY_ORDER.length - 1;
  const readyToStepUp = canStepUp && solvedAtLevel >= 2;

  const handleNextRound = (stepUp: boolean) => {
    const nextIdx = stepUp ? Math.min(DIFFICULTY_ORDER.length - 1, levelIdx + 1) : levelIdx;
    if (stepUp) {
      playSoundCue('levelUp', soundEnabled);
      setLevelIdx(nextIdx);
      setSolvedAtLevel(0);
    }
    setRoundNumber((r) => r + 1);
    buildRound(DIFFICULTY_ORDER[nextIdx]);
  };

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {!solved && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-xl"
              disabled={!selectedItemId}
              onClick={handleAsambleaCheck}
            >
              <CheckCircle2 size={22} /> Comprobar
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setUsedHint(true)}>
              <Lightbulb size={20} /> Pista
            </button>
          </>
        )}
        {solved && readyToStepUp && (
          <>
            <button type="button" className="btn btn-sage btn-xl" onClick={() => handleNextRound(true)}>
              <TrendingUp size={22} /> Subir dificultad
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => handleNextRound(false)}>
              Seguir en este nivel
            </button>
          </>
        )}
        {solved && !readyToStepUp && (
          <button type="button" className="btn btn-primary btn-xl" onClick={() => handleNextRound(false)}>
            <ArrowRight size={22} /> Siguiente pareja de cartas
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => buildRound(currentLevel)}>
          <RotateCcw size={20} /> Repetir ronda
        </button>
      </>
    ) : undefined;

  const renderCard = (symbols: DobbleSymbolSlot[], side: 'left' | 'right') => (
    <div className="dobble-card" data-testid={`dobble-card-${side}`}>
      {symbols.map((sym, idx) => {
        const isMatch = round?.matchItem.id === sym.item.id;
        const isCorrectShown = solved && isMatch;
        const isSelected = selectedItemId === sym.item.id && !solved;
        const isWrong = wrongIds.has(sym.item.id);
        const isDimmed = usedHint && !solved && round?.dimmedHintIds.has(sym.item.id);
        const isShaking = shakeId === sym.item.id;

        return (
          <button
            key={`${side}-${sym.item.id}-${idx}`}
            type="button"
            data-testid={`dobble-${side}-${idx}`}
            data-match={isMatch ? 'true' : 'false'}
            className={`dobble-symbol-btn ${isCorrectShown ? 'correct' : ''} ${
              isSelected ? 'selected' : ''
            } ${isWrong ? 'wrong' : ''} ${isShaking ? 'shake-once' : ''}`}
            style={{
              left: `${sym.xPct}%`,
              top: `${sym.yPct}%`,
              width: `${sym.sizePct}%`,
              height: `${sym.sizePct}%`,
              opacity: isDimmed ? 0.22 : 1,
            }}
            onClick={() => handleSymbolClick(sym.item)}
            aria-label={sym.item.name}
          >
            <img
              src={sym.item.src}
              alt={sym.item.name}
              style={{
                transform: sym.rotationDeg ? `rotate(${sym.rotationDeg}deg)` : undefined,
              }}
            />
            {isCorrectShown && (
              <span className="matched-badge" style={{ width: 24, height: 24, top: -4, right: -4 }}>
                <Check size={14} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <GameShell
      title={activity.title}
      gameType="dobble"
      mode={mode}
      difficulty={currentLevel}
      progression={progression}
      roundLabel={`Ronda ${roundNumber} · ${diffTable[currentLevel].symbolsPerCard} por carta`}
      spokenPrompt={promptText}
      soundEnabled={soundEnabled}
      voiceEnabled={voiceEnabled}
      showInitialDemo={showInitialDemo}
      onDemoSeen={onDemoSeen}
      onToggleSound={onToggleSound}
      onRepeatRound={() => buildRound(currentLevel)}
      onExit={onExit}
      bottomDock={bottomDock}
    >
      <div className="wc-layout" style={{ marginBottom: 0, gap: 10 }}>
        <div className="wc-prompt-wrap">
          <h2 className="game-prompt-text" data-testid="dobble-prompt">
            {promptText}
          </h2>
        </div>

        <div className="dobble-arena">
          {round && renderCard(round.leftSymbols, 'left')}
          {round && renderCard(round.rightSymbols, 'right')}
        </div>

        <div className="wc-lower-zone" style={{ height: 'auto', minHeight: 74 }}>
          {!solved && mode === 'individual' && !usedHint && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUsedHint(true)}>
              <Lightbulb size={16} /> Ver pista
            </button>
          )}

          {usedHint && !solved && (
            <div className="feedback-banner warn" role="status" style={{ padding: '5px 14px' }}>
              <img src={MASCOT.lupa} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
              Hemos atenuado algunos dibujos para ayudarte a encontrar el repetido.
            </div>
          )}

          {solved && round && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
                <img src={MASCOT.celebra} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                <Sparkles size={19} /> ¡Ojo de lince! «{round.matchItem.name}» se repite en las dos cartas.
              </div>
              {mode === 'individual' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleNextRound(readyToStepUp)}
                >
                  {readyToStepUp ? (
                    <>
                      <TrendingUp size={18} /> Siguiente ronda (más dibujos)
                    </>
                  ) : (
                    <>
                      <ArrowRight size={18} /> Siguiente pareja de cartas
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
