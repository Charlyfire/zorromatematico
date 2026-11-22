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
import { DEFAULT_DIFFICULTY_CONFIG, DIFFICULTY_ORDER, MASCOT } from '../data/catalog';
import { shuffleArray } from '../lib/activityValidation';
import { playSoundCue, speakSpanish } from '../lib/speech';
import { GameShell } from './GameShell';

interface PatternToken {
  uid: string;
  image: ImageItem;
  scale?: number;
  rotationDeg?: number;
  signature: string;
}

interface PatternRound {
  sequence: PatternToken[];
  gapIndex: number;
  answer: PatternToken;
  options: PatternToken[];
  ruleHint: string;
  ruleSummary: string;
}

interface PatternGameProps {
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

export function PatternGame({
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
}: PatternGameProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const cfg = activity.patternConfig!;
  const diffTable = activity.difficultyConfig?.pattern || DEFAULT_DIFFICULTY_CONFIG.pattern;

  const itemPool = useMemo(
    () => cfg.itemIds.map((id) => imageMap.get(id)).filter((i): i is ImageItem => Boolean(i)),
    [cfg.itemIds, imageMap]
  );

  const [levelIdx, setLevelIdx] = useState(
    Math.max(0, DIFFICULTY_ORDER.indexOf(initialDifficulty))
  );
  const [roundNumber, setRoundNumber] = useState(1);
  const [solvedAtLevel, setSolvedAtLevel] = useState(0);

  const [round, setRound] = useState<PatternRound | null>(null);
  const [selectedSig, setSelectedSig] = useState<string | null>(null);
  const [wrongSigs, setWrongSigs] = useState<Set<string>>(new Set());
  const [shakeSig, setShakeSig] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(false);

  const currentLevel = DIFFICULTY_ORDER[Math.min(levelIdx, DIFFICULTY_ORDER.length - 1)];

  const buildRound = useCallback(
    (lvl: DifficultyLevel) => {
      if (itemPool.length < 2) return;
      const spec = diffTable[lvl];
      const shuffled = shuffleArray(itemPool);

      const makeTok = (
        image: ImageItem,
        idx: number,
        scale = 1,
        rotationDeg = 0
      ): PatternToken => ({
        uid: `pt-${image.id}-${idx}-${scale}-${rotationDeg}`,
        image,
        scale,
        rotationDeg,
        signature: `${image.id}::${scale}::${rotationDeg}`,
      });

      if (spec.patternType === 'AB') {
        // Inicial: A · B · A · ? (4 slots, 2 options)
        const [a, b] = shuffled;
        const seq = [makeTok(a, 0), makeTok(b, 1), makeTok(a, 2), makeTok(b, 3)];
        const gapIndex = 3;
        const answer = seq[gapIndex];
        const options = shuffleArray([makeTok(a, 10), makeTok(b, 11)]);
        setRound({
          sequence: seq,
          gapIndex,
          answer,
          options,
          ruleHint: 'Los dibujos se van turnando de dos en dos (uno y otro, uno y otro).',
          ruleSummary: `Serie alterna: ${a.name} y ${b.name}.`,
        });
      } else if (spec.patternType === 'ABC') {
        // Sencillo: A · B · C · A · B · ? or A · A · B · A · A · ?
        const useAAB = shuffled.length < 3 || Math.random() < 0.4;
        if (useAAB) {
          const [a, b, c] = shuffled;
          const seq = [
            makeTok(a, 0),
            makeTok(a, 1),
            makeTok(b, 2),
            makeTok(a, 3),
            makeTok(a, 4),
            makeTok(b, 5),
          ];
          const answer = seq[5];
          const optList = [makeTok(a, 10), makeTok(b, 11)];
          if (c) optList.push(makeTok(c, 12));
          setRound({
            sequence: seq,
            gapIndex: 5,
            answer,
            options: shuffleArray(optList),
            ruleHint: 'Mira el ritmo: dos iguales y uno distinto, dos iguales y…',
            ruleSummary: `Serie de ritmo 2 + 1: dos ${a.name} y un ${b.name}.`,
          });
        } else {
          const [a, b, c] = shuffled;
          const seq = [
            makeTok(a, 0),
            makeTok(b, 1),
            makeTok(c, 2),
            makeTok(a, 3),
            makeTok(b, 4),
            makeTok(c, 5),
          ];
          const answer = seq[5];
          setRound({
            sequence: seq,
            gapIndex: 5,
            answer,
            options: shuffleArray([makeTok(a, 10), makeTok(b, 11), makeTok(c, 12)]),
            ruleHint: 'El grupo de 3 dibujos se repite en el mismo orden.',
            ruleSummary: `Serie de 3 elementos: ${a.name}, ${b.name} y ${c.name}.`,
          });
        }
      } else if (spec.patternType === 'mid-gap') {
        // Intermedio: hueco en medio O patrón de tamaños (pequeño, mediano, grande)!
        const useSizePattern = Math.random() < 0.5;
        if (useSizePattern) {
          const a = shuffled[0];
          const sizes = [0.58, 0.78, 1.0];
          const seq = [
            makeTok(a, 0, sizes[0]),
            makeTok(a, 1, sizes[1]),
            makeTok(a, 2, sizes[2]),
            makeTok(a, 3, sizes[0]),
            makeTok(a, 4, sizes[1]),
            makeTok(a, 5, sizes[2]),
          ];
          const gapIndex = Math.random() < 0.5 ? 4 : 5;
          const answer = seq[gapIndex];
          const options = shuffleArray([
            makeTok(a, 10, sizes[0]),
            makeTok(a, 11, sizes[1]),
            makeTok(a, 12, sizes[2]),
          ]);
          setRound({
            sequence: seq,
            gapIndex,
            answer,
            options,
            ruleHint: 'Fíjate en el tamaño: pequeño, mediano, grande… y vuelve a empezar.',
            ruleSummary: `Serie de tamaños con ${a.name}: pequeño, mediano y grande.`,
          });
        } else {
          const [a, b, c, d] = shuffled;
          const base = c ? [a, b, c] : [a, b];
          const seq = Array.from({ length: 6 }, (_, i) => makeTok(base[i % base.length], i));
          const gapIndex = base.length === 3 ? 4 : 2;
          const answer = seq[gapIndex];
          const optItems = base.concat(d ? [d] : []).slice(0, Math.min(4, shuffled.length));
          setRound({
            sequence: seq,
            gapIndex,
            answer,
            options: shuffleArray(optItems.map((img, i) => makeTok(img, 20 + i))),
            ruleHint: `Fíjate en los dibujos de antes y después del hueco: se repite cada ${base.length}.`,
            ruleSummary: `Has deducido el hueco intermedio de la serie.`,
          });
        }
      } else {
        // Avanzado: Doble regla (dibujo + giro progresivo 0° -> 90° -> 180° -> 270° OR 2 dibujos × giro/tamaño)!
        const useQuarterTurn = Math.random() < 0.55;
        if (useQuarterTurn) {
          const a = shuffled[0];
          const rots = [0, 90, 180, 270];
          const seq = [
            makeTok(a, 0, 1, rots[0]),
            makeTok(a, 1, 1, rots[1]),
            makeTok(a, 2, 1, rots[2]),
            makeTok(a, 3, 1, rots[3]),
            makeTok(a, 4, 1, rots[0]),
            makeTok(a, 5, 1, rots[1]),
          ];
          const gapIndex = Math.random() < 0.5 ? 3 : 5;
          const answer = seq[gapIndex];
          const options = shuffleArray(rots.map((r, i) => makeTok(a, 30 + i, 1, r)));
          setRound({
            sequence: seq,
            gapIndex,
            answer,
            options,
            ruleHint: 'En cada paso el dibujo gira un cuarto de vuelta hacia la derecha.',
            ruleSummary: `Serie de giros sucesivos (cuarto de vuelta en cada paso).`,
          });
        } else {
          // Double rule: A-pequeño, B-grande, A-grande, B-pequeño -> alternating image AND alternating size!
          const [a, b] = shuffled;
          const seq = [
            makeTok(a, 0, 0.62, 0),
            makeTok(b, 1, 1.0, 0),
            makeTok(a, 2, 1.0, 0),
            makeTok(b, 3, 0.62, 0),
            makeTok(a, 4, 0.62, 0),
            makeTok(b, 5, 1.0, 0),
          ];
          const gapIndex = 5;
          const answer = seq[gapIndex];
          const options = shuffleArray([
            makeTok(a, 40, 0.62, 0),
            makeTok(a, 41, 1.0, 0),
            makeTok(b, 42, 0.62, 0),
            makeTok(b, 43, 1.0, 0),
          ]);
          setRound({
            sequence: seq,
            gapIndex,
            answer,
            options,
            ruleHint: 'Atiende a dos reglas a la vez: qué dibujo toca y qué tamaño le corresponde.',
            ruleSummary: `Serie de doble regla (dibujo y tamaño alternos).`,
          });
        }
      }

      setSelectedSig(null);
      setWrongSigs(new Set());
      setShakeSig(null);
      setShowHint(false);
      setSolved(false);
    },
    [itemPool, diffTable]
  );

  useEffect(() => {
    buildRound(currentLevel);
  }, [buildRound, currentLevel]);

  const promptText = 'Observa el ritmo de la serie: ¿qué ficha va en el hueco?';

  useEffect(() => {
    if (roundNumber === 1 && mode === 'individual') {
      speakSpanish('Observa la serie y toca el dibujo que completa el hueco.', voiceEnabled);
    }
  }, [roundNumber, mode, voiceEnabled]);

  const handleOptionClick = (opt: PatternToken) => {
    if (!round || solved) return;

    if (mode === 'asamblea') {
      playSoundCue('flip', soundEnabled);
      setSelectedSig(opt.signature);
      return;
    }

    if (opt.signature === round.answer.signature) {
      playSoundCue('success', soundEnabled);
      setSelectedSig(opt.signature);
      setSolved(true);
      setSolvedAtLevel((c) => c + 1);
      speakSpanish(`¡Muy bien! ${opt.image.name} completa la serie.`, voiceEnabled);
    } else {
      playSoundCue('retry', soundEnabled);
      setWrongSigs((prev) => new Set(prev).add(opt.signature));
      setShakeSig(opt.signature);
      window.setTimeout(() => setShakeSig((cur) => (cur === opt.signature ? null : cur)), 380);
    }
  };

  const handleAsambleaCheck = () => {
    if (!round || !selectedSig || solved) return;
    if (selectedSig === round.answer.signature) {
      playSoundCue('success', soundEnabled);
      setSolved(true);
      setSolvedAtLevel((c) => c + 1);
    } else {
      playSoundCue('retry', soundEnabled);
      setWrongSigs((prev) => new Set(prev).add(selectedSig));
      setShakeSig(selectedSig);
      setSelectedSig(null);
      window.setTimeout(() => setShakeSig(null), 380);
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

  const previewedToken =
    round && selectedSig ? round.options.find((o) => o.signature === selectedSig) || null : null;

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {!solved && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-xl"
              disabled={!selectedSig}
              onClick={handleAsambleaCheck}
            >
              <CheckCircle2 size={22} /> Comprobar
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => setShowHint(true)}>
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
            <ArrowRight size={22} /> Siguiente serie
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => buildRound(currentLevel)}>
          <RotateCcw size={20} /> Repetir ronda
        </button>
      </>
    ) : undefined;

  const seqLen = round?.sequence.length || 4;

  return (
    <GameShell
      title={activity.title}
      gameType="pattern"
      mode={mode}
      difficulty={currentLevel}
      progression={progression}
      roundLabel={`Ronda ${roundNumber} · Serie de ${seqLen}`}
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
      <div className="wc-layout" style={{ marginBottom: 0, gap: 16 }}>
        <div className="wc-prompt-wrap">
          <h2 className="game-prompt-text" data-testid="pattern-prompt">
            {promptText}
          </h2>
        </div>

        {/* Pattern Sequence Strip */}
        <div className="wc-board-frame" style={{ maxWidth: 980, padding: '16px 18px' }}>
          <div
            className="seq-slots-row"
            style={{
              gridTemplateColumns: `repeat(${seqLen}, minmax(0, 1fr))`,
            }}
          >
            {round?.sequence.map((tok, idx) => {
              const isGap = idx === round.gapIndex;
              const shownTok = isGap ? (solved ? round.answer : previewedToken) : tok;

              return (
                <div
                  key={tok.uid}
                  data-testid={`pattern-slot-${idx}`}
                  className={`wc-slot ${isGap && !shownTok ? 'empty-slot' : ''} ${
                    isGap && solved ? 'correct' : ''
                  } ${isGap && !solved && previewedToken ? 'selected' : ''}`}
                  style={{
                    width: 'min(100%, 19vh)',
                    height: 'min(148px, 19vh)',
                    borderColor: isGap && !solved ? 'var(--accent-coral)' : undefined,
                  }}
                >
                  {shownTok ? (
                    <img
                      src={shownTok.image.src}
                      alt={shownTok.image.name}
                      style={{
                        transform: `${shownTok.scale ? `scale(${shownTok.scale})` : ''} ${
                          shownTok.rotationDeg ? `rotate(${shownTok.rotationDeg}deg)` : ''
                        }`.trim() || undefined,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: 'var(--accent-coral)',
                        fontFamily: 'var(--font-display)',
                        fontSize: '2.2rem',
                        fontWeight: 700,
                      }}
                    >
                      ?
                    </span>
                  )}
                  {isGap && solved && (
                    <span className="matched-badge">
                      <Check size={16} strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Options Row */}
        {!solved && round && (
          <div className="matching-options-grid">
            {round.options.map((opt, idx) => {
              const isSelected = selectedSig === opt.signature;
              const isWrong = wrongSigs.has(opt.signature);
              const isShaking = shakeSig === opt.signature;

              return (
                <button
                  key={opt.uid}
                  type="button"
                  data-testid={`pattern-opt-${idx}`}
                  data-correct={opt.signature === round.answer.signature ? 'true' : 'false'}
                  className={`matching-option-btn ${isSelected ? 'selected' : ''} ${
                    isWrong ? 'wrong' : ''
                  } ${isShaking ? 'shake-once' : ''}`}
                  style={{ width: 'min(138px, 18.5vh)', height: 'min(138px, 18.5vh)' }}
                  onClick={() => handleOptionClick(opt)}
                  aria-label={opt.image.name}
                >
                  <img
                    src={opt.image.src}
                    alt={opt.image.name}
                    style={{
                      transform: `${opt.scale ? `scale(${opt.scale})` : ''} ${
                        opt.rotationDeg ? `rotate(${opt.rotationDeg}deg)` : ''
                      }`.trim() || undefined,
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Hint / Solved Zone */}
        <div className="wc-lower-zone" style={{ height: 'auto', minHeight: 74 }}>
          {!solved && mode === 'individual' && !showHint && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowHint(true)}>
              <Lightbulb size={16} /> Ver pista
            </button>
          )}

          {showHint && !solved && round && (
            <div className="feedback-banner warn" role="status" style={{ padding: '6px 16px' }}>
              <img src={MASCOT.lupa} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <Lightbulb size={18} /> {round.ruleHint}
            </div>
          )}

          {solved && round && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
                <img src={MASCOT.celebra} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                <Sparkles size={20} /> ¡Genial! {round.ruleSummary}
              </div>
              {mode === 'individual' && (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => handleNextRound(readyToStepUp)}
                >
                  {readyToStepUp ? (
                    <>
                      <TrendingUp size={20} /> Siguiente serie (subir dificultad)
                    </>
                  ) : (
                    <>
                      <ArrowRight size={20} /> Siguiente serie
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
