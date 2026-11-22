import type { GameType } from '../types';

export function GamePictogram({
  type,
  size = 52,
}: {
  type: GameType;
  size?: number;
}) {
  switch (type) {
    case 'memory':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect
            x="6"
            y="14"
            width="28"
            height="36"
            rx="7"
            transform="rotate(-8 6 14)"
            fill="#218A80"
            stroke="#FFFDF8"
            strokeWidth="2.5"
          />
          <circle cx="21" cy="30" r="5" fill="#9CE0D8" opacity="0.7" />
          <rect
            x="28"
            y="12"
            width="30"
            height="38"
            rx="7"
            transform="rotate(7 28 12)"
            fill="#FFFDF8"
            stroke="#D98A1F"
            strokeWidth="3"
          />
          <circle cx="42" cy="32" r="8" fill="#DD6B4D" />
          <circle cx="42" cy="32" r="3.5" fill="#FFFDF8" />
        </svg>
      );

    case 'classification':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="6" y="32" width="23" height="24" rx="6" fill="#E5F3E6" stroke="#4C8650" strokeWidth="2.8" />
          <rect x="35" y="32" width="23" height="24" rx="6" fill="#E6ECF7" stroke="#466094" strokeWidth="2.8" />
          <rect x="21" y="6" width="20" height="18" rx="5" fill="#FFFDF8" stroke="#D98A1F" strokeWidth="2.8" />
          <circle cx="31" cy="15" r="4" fill="#D98A1F" />
          <path d="M36 22 C43 22, 46 25, 46 31" stroke="#218A80" strokeWidth="3" strokeLinecap="round" />
          <path d="M42 28 L46 32 L50 28" stroke="#218A80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'matching':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="4" y="14" width="25" height="36" rx="7" fill="#FFFDF8" stroke="#218A80" strokeWidth="2.8" />
          <path d="M16.5 22 L23 38 L10 38 Z" fill="#DD6B4D" />
          <rect x="35" y="14" width="25" height="36" rx="7" fill="#F9F4E8" stroke="#9AA5B4" strokeWidth="2.8" />
          <path d="M47.5 22 L54 38 L41 38 Z" fill="#2B3648" />
          <path d="M29 32 L35 32" stroke="#D98A1F" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case 'what-changed':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="4" y="18" width="16" height="28" rx="5" fill="#FFFDF8" stroke="#CBB99B" strokeWidth="2.5" />
          <circle cx="12" cy="32" r="4.5" fill="#218A80" />
          <rect
            x="24"
            y="18"
            width="16"
            height="28"
            rx="5"
            fill="#FDF2DC"
            stroke="#D98A1F"
            strokeWidth="2.5"
            strokeDasharray="4 3"
          />
          <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="800" fill="#D98A1F">
            ?
          </text>
          <rect x="44" y="18" width="16" height="28" rx="5" fill="#FFFDF8" stroke="#CBB99B" strokeWidth="2.5" />
          <rect x="48" y="28" width="8" height="8" rx="2" fill="#DD6B4D" />
        </svg>
      );

    case 'sequence':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="4" y="18" width="16" height="28" rx="5" fill="#E6ECF7" stroke="#466094" strokeWidth="2.5" />
          <text x="12" y="37" textAnchor="middle" fontSize="14" fontWeight="800" fill="#466094">1</text>
          <rect x="24" y="18" width="16" height="28" rx="5" fill="#E2F4F1" stroke="#218A80" strokeWidth="2.5" />
          <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="800" fill="#218A80">2</text>
          <rect x="44" y="18" width="16" height="28" rx="5" fill="#FDEBE5" stroke="#DD6B4D" strokeWidth="2.5" />
          <text x="52" y="37" textAnchor="middle" fontSize="14" fontWeight="800" fill="#DD6B4D">3</text>
          <path d="M18 12 L46 12" stroke="#D98A1F" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M42 8 L47 12 L42 16" stroke="#D98A1F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'intruder':
      // 3 grouped green cards + 1 highlighted coral outsider card
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="5" y="6" width="24" height="24" rx="6" fill="#E5F3E6" stroke="#4C8650" strokeWidth="2.6" />
          <circle cx="17" cy="18" r="5.5" fill="#4C8650" />
          <rect x="35" y="6" width="24" height="24" rx="6" fill="#E5F3E6" stroke="#4C8650" strokeWidth="2.6" />
          <rect x="42" y="13" width="10" height="10" rx="2" fill="#4C8650" />
          <rect x="5" y="34" width="24" height="24" rx="6" fill="#E5F3E6" stroke="#4C8650" strokeWidth="2.6" />
          <polygon points="17,40 23,51 11,51" fill="#4C8650" />
          <rect x="35" y="34" width="24" height="24" rx="6" fill="#FDEBE5" stroke="#DD6B4D" strokeWidth="3" strokeDasharray="4 2" />
          <text x="47" y="51" textAnchor="middle" fontSize="16" fontWeight="800" fill="#DD6B4D">!</text>
        </svg>
      );

    case 'dobble':
      // Two circular cards sharing ONE glowing star symbol
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="21" cy="32" r="18" fill="#FFFDF8" stroke="#218A80" strokeWidth="3" />
          <circle cx="43" cy="32" r="18" fill="#FFFDF8" stroke="#D98A1F" strokeWidth="3" />
          <circle cx="15" cy="25" r="4" fill="#466094" />
          <rect x="12" y="35" width="7" height="7" rx="2" fill="#4C8650" />
          <circle cx="49" cy="25" r="4" fill="#C0567B" />
          <polygon points="49,35 54,43 44,43" fill="#457B9D" />
          <circle cx="26" cy="31" r="4.5" fill="#DD6B4D" />
          <circle cx="38" cy="31" r="4.5" fill="#DD6B4D" />
        </svg>
      );

    case 'pattern':
      // Alternating shapes A - B - A - ?
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="3" y="21" width="13" height="22" rx="4" fill="#FFFDF8" stroke="#218A80" strokeWidth="2.2" />
          <circle cx="9.5" cy="32" r="3.8" fill="#218A80" />
          <rect x="18" y="21" width="13" height="22" rx="4" fill="#FFFDF8" stroke="#DD6B4D" strokeWidth="2.2" />
          <polygon points="24.5,27 29,36 20,36" fill="#DD6B4D" />
          <rect x="33" y="21" width="13" height="22" rx="4" fill="#FFFDF8" stroke="#218A80" strokeWidth="2.2" />
          <circle cx="39.5" cy="32" r="3.8" fill="#218A80" />
          <rect x="48" y="21" width="13" height="22" rx="4" fill="#FDF2DC" stroke="#D98A1F" strokeWidth="2.2" strokeDasharray="3 2" />
          <text x="54.5" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fill="#D98A1F">?</text>
        </svg>
      );
  }
}

export function CardBackEmblem({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="rgba(255,253,248,0.16)" stroke="#FFFDF8" strokeWidth="2.2" />
      <path
        d="M24 11 L27.3 19.6 L36.5 20.2 L29.4 26 L31.7 35 L24 30 L16.3 35 L18.6 26 L11.5 20.2 L20.7 19.6 Z"
        fill="#FFFDF8"
        opacity="0.92"
      />
    </svg>
  );
}

export const GAME_TYPE_META: Record<
  GameType,
  { name: string; shortDesc: string; chipClass: string }
> = {
  memory: {
    name: 'Memory de parejas',
    shortDesc: 'Encuentra parejas idénticas, relacionadas o con detalles sutiles',
    chipClass: 'chip-teal',
  },
  'what-changed': {
    name: '¿Qué ha cambiado?',
    shortDesc: 'Descubre qué desaparece, se mueve, gira o se intercambia',
    chipClass: 'chip-amber',
  },
  sequence: {
    name: 'Recuerda el orden',
    shortDesc: 'Memoriza la serie y colócala en el mismo orden',
    chipClass: 'chip-indigo',
  },
  matching: {
    name: 'Correspondencias',
    shortDesc: 'Siluetas, parejas relacionadas y fragmentos',
    chipClass: 'chip-coral',
  },
  classification: {
    name: 'Clasificación',
    shortDesc: 'Por paisajes, por forma o en cuadrícula de doble entrada',
    chipClass: 'chip-sage',
  },
  intruder: {
    name: 'El intruso',
    shortDesc: 'Todos son distintos: descubre cuál no pertenece al grupo',
    chipClass: 'chip-coral',
  },
  dobble: {
    name: 'Ojo de lince',
    shortDesc: 'Encuentra el único dibujo repetido entre las dos cartas',
    chipClass: 'chip-amber',
  },
  pattern: {
    name: 'Completa la serie',
    shortDesc: 'Descubre el ritmo lógico y rellena el hueco',
    chipClass: 'chip-indigo',
  },
};
