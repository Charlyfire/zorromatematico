import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, RotateCcw, Search, Sparkles, TrendingUp } from 'lucide-react';
import type {
  Activity,
  DifficultyLevel,
  DifficultyProgression,
  ImageItem,
  ImagePair,
  PlayMode,
} from '../types';
import { DEFAULT_DIFFICULTY_CONFIG, DIFFICULTY_ORDER, MASCOT } from '../data/catalog';
import { shuffleArray } from '../lib/activityValidation';
import { extractImageFragmentDataUrl } from '../lib/imageProcessing';
import { playSoundCue, speakSpanish } from '../lib/speech';
import { GameShell } from './GameShell';

interface MatchEntry {
  id: string;
  targetSrc: string;
  targetName: string;
  optionSrc: string;
  optionName: string;
  similarityGroup?: string;
}

interface MatchingGameProps {
  activity: Activity;
  images: ImageItem[];
  pairs: ImagePair[];
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

function difficultyForMatching(
  optionsCount: number,
  preferSimilar: boolean,
  fragmentMode: boolean,
  variant: 'silhouette' | 'related' | 'fragment',
  cfg: Record<DifficultyLevel, { optionsCount: number; preferSimilar: boolean; useFragment?: boolean }>
): DifficultyLevel {
  if (fragmentMode) return 'avanzado';
  for (let i = DIFFICULTY_ORDER.length - 1; i >= 0; i--) {
    const lvl = DIFFICULTY_ORDER[i];
    const skipForFragmentOnly = variant !== 'related' && Boolean(cfg[lvl].useFragment);
    if (
      !skipForFragmentOnly &&
      optionsCount >= cfg[lvl].optionsCount &&
      (!cfg[lvl].preferSimilar || preferSimilar)
    ) {
      return lvl;
    }
  }
  return 'inicial';
}

export function MatchingGame({
  activity,
  images,
  pairs,
  mode,
  initialDifficulty,
  progression,
  soundEnabled,
  voiceEnabled,
  showInitialDemo,
  onDemoSeen,
  onToggleSound,
  onExit,
}: MatchingGameProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const pairMap = useMemo(() => new Map(pairs.map((p) => [p.id, p])), [pairs]);
  const matchConfig = activity.matchingConfig!;
  const diffTable = activity.difficultyConfig?.matching || DEFAULT_DIFFICULTY_CONFIG.matching;

  const startDiff = diffTable[initialDifficulty];
  const startsFragment =
    matchConfig.variant === 'fragment' ||
    (matchConfig.variant === 'silhouette' && Boolean(startDiff.useFragment));

  const [useFragment, setUseFragment] = useState(startsFragment);

  // Build pools independently of useFragment so upgrading to fragment mode never triggers duplicate effects!
  const getPoolForMode = useCallback(
    (fragmentMode: boolean): MatchEntry[] => {
      if (matchConfig.variant === 'related') {
        return matchConfig.pairIds
          .map((pid) => pairMap.get(pid))
          .filter((p): p is ImagePair => Boolean(p && imageMap.has(p.itemAId) && imageMap.has(p.itemBId)))
          .map((p) => {
            const a = imageMap.get(p.itemAId)!;
            const b = imageMap.get(p.itemBId)!;
            return {
              id: p.id,
              targetSrc: a.src,
              targetName: a.name,
              optionSrc: b.src,
              optionName: b.name,
              similarityGroup: a.similarityGroup,
            };
          });
      }
      if (fragmentMode) {
        return matchConfig.itemIds
          .map((id) => imageMap.get(id))
          .filter((img): img is ImageItem => Boolean(img))
          .map((img) => ({
            id: img.id,
            targetSrc: img.src,
            targetName: img.name,
            optionSrc: img.src,
            optionName: img.name,
            similarityGroup: img.similarityGroup,
          }));
      }
      return matchConfig.itemIds
        .map((id) => imageMap.get(id))
        .filter((img): img is ImageItem => Boolean(img && img.silhouetteSrc))
        .map((img) => ({
          id: img.id,
          targetSrc: img.src,
          targetName: img.name,
          optionSrc: img.silhouetteSrc!,
          optionName: `Silueta de ${img.name}`,
          similarityGroup: img.similarityGroup,
        }));
    },
    [matchConfig, imageMap, pairMap]
  );

  const activePoolSize = useMemo(
    () => getPoolForMode(useFragment).length,
    [getPoolForMode, useFragment]
  );
  const initialPoolSize = useMemo(
    () => getPoolForMode(startsFragment).length,
    [getPoolForMode, startsFragment]
  );
  const maxOptions = Math.max(2, activePoolSize);
  const startOptions = Math.min(Math.max(2, initialPoolSize), Math.max(2, startDiff.optionsCount));

  const [optionsCount, setOptionsCount] = useState(startOptions);
  const [preferSimilar, setPreferSimilar] = useState(startDiff.preferSimilar);
  const [roundNumber, setRoundNumber] = useState(1);
  const [solvedAtStep, setSolvedAtStep] = useState(0);

  const [target, setTarget] = useState<MatchEntry | null>(null);
  const [fragmentCrop, setFragmentCrop] = useState<{ targetId: string; src: string } | null>(null);
  const [options, setOptions] = useState<MatchEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  const lastTargetIdRef = useRef<string | null>(null);
  const lastCorrectIndexRef = useRef<number>(-1);
  const fragmentReqIdRef = useRef<number>(0);

  const buildRound = useCallback(
    (optCount: number, useSimilar: boolean, fragmentMode: boolean, isFirstRound: boolean) => {
      const entryPool = getPoolForMode(fragmentMode);
      if (entryPool.length === 0) return;
      const count = Math.min(entryPool.length, Math.max(2, optCount));

      let candidates = entryPool;
      if (
        isFirstRound &&
        !fragmentMode &&
        matchConfig.variant === 'silhouette' &&
        matchConfig.initialItemIds &&
        matchConfig.initialItemIds.length >= count
      ) {
        const preferred = matchConfig.initialItemIds
          .slice(0, count)
          .map((id) => entryPool.find((e) => e.id === id))
          .filter((x): x is MatchEntry => Boolean(x));
        if (preferred.length === count) candidates = preferred;
      }

      const targetCandidates =
        candidates.length > 1
          ? candidates.filter((e) => e.id !== lastTargetIdRef.current)
          : candidates;
      const chosenTarget = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
      lastTargetIdRef.current = chosenTarget.id;

      const others = candidates.filter((e) => e.id !== chosenTarget.id);
      let distractors: MatchEntry[] = [];
      if ((useSimilar || fragmentMode) && chosenTarget.similarityGroup) {
        const sameGroup = shuffleArray(
          others.filter((e) => e.similarityGroup === chosenTarget.similarityGroup)
        );
        const diffGroup = shuffleArray(
          others.filter((e) => e.similarityGroup !== chosenTarget.similarityGroup)
        );
        distractors = [...sameGroup, ...diffGroup].slice(0, count - 1);
      } else {
        distractors = shuffleArray(others).slice(0, count - 1);
      }

      let mixed = shuffleArray([chosenTarget, ...distractors]);
      if (
        mixed.length > 1 &&
        mixed.findIndex((e) => e.id === chosenTarget.id) === lastCorrectIndexRef.current
      ) {
        mixed = [...mixed.slice(1), mixed[0]];
      }
      lastCorrectIndexRef.current = mixed.findIndex((e) => e.id === chosenTarget.id);

      // Invalidate any in-flight fragment extraction from an earlier render/round!
      const reqId = ++fragmentReqIdRef.current;

      setTarget(chosenTarget);
      setFragmentCrop(null);
      setOptions(mixed);
      setSelectedId(null);
      setWrongIds(new Set());
      setShakeId(null);
      setSolved(false);

      if (fragmentMode) {
        extractImageFragmentDataUrl(chosenTarget.targetSrc)
          .then((cropUrl) => {
            if (fragmentReqIdRef.current === reqId) {
              setFragmentCrop({ targetId: chosenTarget.id, src: cropUrl });
            }
          })
          .catch(() => {
            if (fragmentReqIdRef.current === reqId) {
              setFragmentCrop({ targetId: chosenTarget.id, src: chosenTarget.targetSrc });
            }
          });
      }
    },
    [getPoolForMode, matchConfig]
  );

  useEffect(() => {
    buildRound(startOptions, startDiff.preferSimilar, startsFragment, true);
    return () => {
      // Cancel pending async fragment crop on StrictMode unmount/remount or activity switch
      fragmentReqIdRef.current += 1;
    };
  }, [buildRound, startOptions, startDiff.preferSimilar, startsFragment]);

  const activePrompt = useFragment
    ? '¿A qué imagen pertenece este fragmento?'
    : matchConfig.prompt;

  useEffect(() => {
    if (roundNumber === 1 && mode === 'individual') {
      speakSpanish(activePrompt, voiceEnabled);
    }
  }, [roundNumber, mode, activePrompt, voiceEnabled]);

  const handleOptionClick = (opt: MatchEntry) => {
    if (solved || !target) return;

    if (mode === 'asamblea') {
      playSoundCue('flip', soundEnabled);
      setSelectedId(opt.id);
      return;
    }

    if (opt.id === target.id) {
      playSoundCue('success', soundEnabled);
      setSelectedId(opt.id);
      setSolved(true);
      setSolvedAtStep((prev) => prev + 1);
      speakSpanish(`¡Muy bien! ${target.targetName}.`, voiceEnabled);
    } else {
      playSoundCue('retry', soundEnabled);
      setWrongIds((prev) => new Set(prev).add(opt.id));
      setShakeId(opt.id);
      window.setTimeout(() => setShakeId((cur) => (cur === opt.id ? null : cur)), 380);
    }
  };

  const handleAsambleaCheck = () => {
    if (!selectedId || !target || solved) return;
    if (selectedId === target.id) {
      playSoundCue('success', soundEnabled);
      setSolved(true);
      setSolvedAtStep((prev) => prev + 1);
    } else {
      playSoundCue('retry', soundEnabled);
      setWrongIds((prev) => new Set(prev).add(selectedId));
      setShakeId(selectedId);
      setSelectedId(null);
      window.setTimeout(() => setShakeId(null), 380);
    }
  };

  const hasMoreOptions = optionsCount < Math.min(5, maxOptions);
  const canUpgradeToFragment = !useFragment && matchConfig.variant === 'silhouette' && !hasMoreOptions;
  const canStepUp = progression === 'progressive' && (hasMoreOptions || canUpgradeToFragment);
  const readyToStepUp = canStepUp && solvedAtStep >= 2;

  const handleNextRound = (stepUp: boolean) => {
    let nextCount = optionsCount;
    let nextSim = preferSimilar;
    let nextFrag = useFragment;
    if (stepUp) {
      playSoundCue('levelUp', soundEnabled);
      if (hasMoreOptions) {
        nextCount = Math.min(maxOptions, optionsCount + 1);
        setOptionsCount(nextCount);
        if (nextCount >= 4) {
          nextSim = true;
          setPreferSimilar(true);
        }
      } else if (canUpgradeToFragment) {
        nextFrag = true;
        nextSim = true;
        nextCount = Math.min(maxOptions, 4);
        setUseFragment(true);
        setPreferSimilar(true);
        setOptionsCount(nextCount);
      }
      setSolvedAtStep(0);
    }
    setRoundNumber((r) => r + 1);
    buildRound(nextCount, nextSim, nextFrag, false);
  };

  const currentDifficulty = difficultyForMatching(
    optionsCount,
    preferSimilar,
    useFragment,
    matchConfig.variant,
    diffTable
  );

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {!solved && (
          <button type="button" className="btn btn-primary btn-xl" onClick={handleAsambleaCheck} disabled={!selectedId}>
            <CheckCircle2 size={22} /> Comprobar
          </button>
        )}
        {solved && readyToStepUp && (
          <>
            <button type="button" className="btn btn-sage btn-xl" onClick={() => handleNextRound(true)}>
              <TrendingUp size={22} />{' '}
              {hasMoreOptions
                ? `Subir dificultad (${optionsCount + 1} opciones)`
                : 'Subir a reto de fragmentos'}
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => handleNextRound(false)}>
              Seguir en este nivel
            </button>
          </>
        )}
        {solved && !readyToStepUp && (
          <button type="button" className="btn btn-primary btn-xl" onClick={() => handleNextRound(false)}>
            <ArrowRight size={22} /> Siguiente
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={() => buildRound(optionsCount, preferSimilar, useFragment, false)}
        >
          <RotateCcw size={20} /> Repetir ronda
        </button>
      </>
    ) : undefined;

  return (
    <GameShell
      title={activity.title}
      gameType="matching"
      mode={mode}
      difficulty={currentDifficulty}
      progression={progression}
      roundLabel={`Ronda ${roundNumber} · ${useFragment ? 'Fragmento' : `${options.length} opciones`}`}
      spokenPrompt={activePrompt}
      soundEnabled={soundEnabled}
      voiceEnabled={voiceEnabled}
      showInitialDemo={showInitialDemo}
      onDemoSeen={onDemoSeen}
      onToggleSound={onToggleSound}
      onRepeatRound={() => buildRound(optionsCount, preferSimilar, useFragment, false)}
      onExit={onExit}
      bottomDock={bottomDock}
    >
      <div className="matching-layout">
        <div className="game-prompt-bar" style={{ marginBottom: 0 }}>
          <h2 className="game-prompt-text">{activePrompt}</h2>
          {useFragment && (
            <span className="chip chip-coral">
              <Search size={14} /> Fragmento ampliado
            </span>
          )}
        </div>

        {target && (
          <div
            className="matching-target-card"
            data-testid="matching-target"
            data-target-id={target.id}
            style={
              useFragment
                ? {
                    borderColor: solved ? 'var(--accent-sage)' : 'var(--accent-coral)',
                    padding: 12,
                    overflow: 'hidden',
                  }
                : undefined
            }
          >
            {useFragment ? (
              fragmentCrop && fragmentCrop.targetId === target.id ? (
                <img
                  src={fragmentCrop.src}
                  alt="Fragmento misterioso"
                  data-fragment-target={fragmentCrop.targetId}
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '100%',
                    objectFit: 'cover',
                    borderRadius: 18,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-muted)',
                  }}
                >
                  <Search size={36} />
                </div>
              )
            ) : (
              <img src={target.targetSrc} alt={target.targetName} />
            )}
          </div>
        )}

        <div className="matching-options-grid">
          {options.map((opt, idx) => {
            const isCorrectShown = solved && target && opt.id === target.id;
            const isSelected = selectedId === opt.id && !solved;
            const isWrong = wrongIds.has(opt.id);
            const isShaking = shakeId === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`matching-option-${idx}`}
                data-correct={target && opt.id === target.id ? 'true' : 'false'}
                className={`matching-option-btn ${isCorrectShown ? 'correct' : ''} ${
                  isSelected ? 'selected' : ''
                } ${isWrong ? 'wrong' : ''} ${isShaking ? 'shake-once' : ''}`}
                onClick={() => handleOptionClick(opt)}
                aria-label={opt.optionName}
                aria-pressed={isSelected || Boolean(isCorrectShown)}
              >
                <img src={opt.optionSrc} alt={opt.optionName} />
                {isCorrectShown && (
                  <span className="matched-badge">
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {solved && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
              <img src={MASCOT.celebra} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
              <Sparkles size={20} /> ¡Correcto! {target?.targetName}.
            </div>
            {mode === 'individual' && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => handleNextRound(readyToStepUp)}
                >
                  {readyToStepUp ? (
                    <>
                      <TrendingUp size={20} />{' '}
                      {canUpgradeToFragment ? 'Probar fragmentos' : 'Siguiente (más reto)'}
                    </>
                  ) : (
                    <>
                      <ArrowRight size={20} /> Siguiente
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </GameShell>
  );
}
