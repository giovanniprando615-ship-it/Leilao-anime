'use client';

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type FormEvent,
  type ReactNode
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ANIME_SERIES, GAME_RULES, ROSTER } from '@leilao/shared';
import type {
  AnimeSeries,
  BattleScenario,
  BattleScenarioAnalysis,
  BattleScoreBreakdown,
  CharacterId,
  RoomPlayer,
  RoomState,
  RosterCharacter
} from '@leilao/shared';
import { useRoom } from '@/hooks/use-room';

const characterById = new Map(ROSTER.map((character) => [character.id, character]));
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentage = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const seriesTheme: Record<AnimeSeries, { accent: string; glow: string; name: string; label: string; mark: string }> = {
  ONE_PIECE: { accent: '#62d7ed', glow: '#087eaa', name: 'Grand Line', label: 'One Piece', mark: 'OP' },
  NARUTO: { accent: '#ff9a5f', glow: '#bd432f', name: 'Shinobi', label: 'Naruto', mark: 'N' },
  BLACK_CLOVER: { accent: '#bc9aff', glow: '#6944ca', name: 'Grimório', label: 'Black Clover', mark: 'BC' }
};
const seriesFolder: Record<AnimeSeries, string> = {
  ONE_PIECE: 'one-piece',
  NARUTO: 'naruto',
  BLACK_CLOVER: 'black-clover'
};

function characterImageUrl(character: Pick<RosterCharacter, 'id' | 'series'>): string {
  return `/images/anime/${seriesFolder[character.series]}/${character.id}.jpg`;
}

const MATCH_HISTORY_KEY = 'leilao.matchHistory';

interface MatchHistoryEntry {
  id: string;
  finishedAt: number;
  series: AnimeSeries;
  winner: string;
  players: { name: string; characters: string[] }[];
  scenario: string;
}

function isMatchHistoryEntry(value: unknown): value is MatchHistoryEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('id' in value) || typeof value.id !== 'string'
    || !('finishedAt' in value) || typeof value.finishedAt !== 'number' || !Number.isFinite(value.finishedAt)
    || !('series' in value) || !ANIME_SERIES.some((series) => series === value.series)
    || !('winner' in value) || typeof value.winner !== 'string'
    || !('scenario' in value) || typeof value.scenario !== 'string'
    || !('players' in value) || !Array.isArray(value.players)) {
    return false;
  }
  return value.players.every((player: unknown) => (
    typeof player === 'object'
    && player !== null
    && 'name' in player
    && typeof player.name === 'string'
    && 'characters' in player
    && Array.isArray(player.characters)
    && player.characters.every((name: unknown) => typeof name === 'string')
  ));
}

function MangaIllustration({
  series,
  characterId,
  className = ''
}: {
  series: AnimeSeries;
  characterId?: CharacterId;
  className?: string;
}) {
  const theme = seriesTheme[series];
  const id = (characterId ?? `hero-${series}`).toLowerCase().replaceAll('_', '-');
  const portraitSeed = characterId
    ? [...characterId].reduce((seed, letter) => (seed * 31 + letter.charCodeAt(0)) >>> 0, 7)
    : 1;
  const hairColors = ['#171521', '#6b3829', '#d1a454', '#aeb4c8', '#782e39', '#304b69', '#342a56', '#d9d0bc'];
  const skinTones = ['#f3d0bb', '#dcae91', '#f0bd9f', '#bd8269', '#e7bd8d'];
  const eyeColors = ['#57d7e6', '#ab8aff', '#ed7462', '#68d49b', '#f0c36a', '#8ba5ff'];
  const hairColor = hairColors[portraitSeed % hairColors.length];
  const skinTone = skinTones[Math.floor(portraitSeed / 3) % skinTones.length];
  const eyeColor = eyeColors[Math.floor(portraitSeed / 5) % eyeColors.length];
  const hairstyles = [
    'm203 157-25-32 36 7-18-43 43 20 3-42 31 31 25-34 8 48 40-20-16 42 35-5-30 40-20-18-7-37-25 15-12-25-24 33-29-23-2 43-29 22-5-36-20 12-10-28-18 8Z',
    'm204 158-15-43 34 21 1-47 34 36 23-42 15 48 42-13-26 42 37 7-38 30-9-38-25 28-15-26-21 34-29-10-12 31-22-27-20 9 14-47-20 4Z',
    'm204 159-29-28 38 2-12-40 43 25 11-47 24 43 35-31-4 48 43-8-31 35 30 20-43 18-11-32-20 27-19-27-22 31-21-24-20 20-19-23-17 7 17-44-27 3Z',
    'm205 156-21-37 36 17-8-46 38 31 20-43 19 47 39-23-19 44 41 0-36 28-13-30-20 32-20-22-20 32-19-17-19 26-22-19-17 15 9-53-21-2Z',
    'm204 158-32-19 44-8-5-42 40 33 15-48 17 48 38-25-16 43 40 4-34 24-12-34-20 28-19-25-20 30-21-19-18 31-20-25-18 18 8-47-21 3Z',
    'm204 158-19-31 32 5-11-47 43 27 4-42 30 37 29-32 1 48 42-16-24 39 34 11-34 21-15-27-18 32-21-21-16 32-24-14-14 30-24-22-18 12 10-48-23-2Z'
  ];
  const hairPath = hairstyles[portraitSeed % hairstyles.length];
  const eyeY = 164 + (portraitSeed % 3);
  const eyeShapes = [
    'M216 166q13-14 26 0-13 12-26 0Zm54 0q13-14 26 0-13 12-26 0Z',
    'M216 165q13-8 26 1-13 8-26-1Zm54 1q13-8 26 0-13 8-26 0Z',
    'M216 168q13-17 26-2-13 11-26 2Zm54-2q13-15 26 1-13 11-26-1Z'
  ];
  const expressions = [
    'm244 213q16 15 32 0',
    'm245 216q15-6 30 0',
    'm246 210q14 5 28 0',
    'm244 214q17 7 32-1'
  ];
  const eyebrows = [
    'm214 157 27 4m84-4-27 4',
    'm214 159 27-3m84 3-27-3',
    'm215 156 26 5m83-5-26 5',
    'm215 158 26 1m83-1-26-1'
  ];
  const scar = portraitSeed % 4 === 0;
  const headband = portraitSeed % 5 === 0;

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 520 330"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="50" x2="480" y1="35" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor={theme.glow} stopOpacity=".18" />
          <stop offset=".52" stopColor="#111322" stopOpacity=".12" />
          <stop offset="1" stopColor="#080811" stopOpacity=".92" />
        </linearGradient>
        <linearGradient id={`${id}-cloak`} x1="170" x2="370" y1="160" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor={theme.accent} stopOpacity=".9" />
          <stop offset="1" stopColor={theme.glow} />
        </linearGradient>
        <radialGradient id={`${id}-aura`} cx="0" cy="0" r="1" gradientTransform="matrix(0 160 -160 0 276 145)" gradientUnits="userSpaceOnUse">
          <stop stopColor={theme.accent} stopOpacity=".42" />
          <stop offset="1" stopColor={theme.accent} stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-dots`} width="7" height="7" patternTransform="rotate(18)" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={theme.accent} fillOpacity=".42" />
        </pattern>
      </defs>

      <path fill={`url(#${id}-sky)`} d="M0 0h520v330H0z" />
      <path fill={`url(#${id}-aura)`} d="M0 0h520v330H0z" />
      <path d="M0 17 220 148M4 72l170 95M28 0l211 135m277-101L304 158m212-49L344 177m176 4L371 204" stroke="#fff" strokeOpacity=".18" strokeWidth="2" />
      <path d="M26 278 208 153M79 328l165-143m250 91L315 166m204 155L328 180" stroke={theme.accent} strokeOpacity=".42" strokeWidth="3" />

      {series === 'ONE_PIECE' && (
        <>
          <path d="M0 223c73-33 130-33 200 0s130 33 200 0 75-33 120-11v118H0V223Z" fill="#113a4b" fillOpacity=".8" />
          <path d="M0 245c73-33 130-33 200 0s130 33 200 0 75-33 120-11" stroke={theme.accent} strokeOpacity=".6" strokeWidth="3" />
        </>
      )}
      {series === 'NARUTO' && (
        <>
          <path d="m0 40 187 118m-156-164 192 151M520 47 325 166m188-6L343 181" stroke={theme.accent} strokeOpacity=".46" strokeWidth="4" />
        </>
      )}
      {series === 'BLACK_CLOVER' && (
        <>
          <path d="m0 80 188 94m-123-159 154 161M519 29 324 175m187-73L343 188" stroke={theme.accent} strokeOpacity=".35" strokeWidth="3" />
        </>
      )}

      <path d="M111 330c13-66 42-105 107-124l42-13 48 11c65 15 91 60 105 126H111Z" fill={`url(#${id}-cloak)`} />
      <path d="m197 218 63 57 62-60 25 115H166l31-112Z" fill="#111322" fillOpacity=".92" />
      <path d="m229 212 31 31 31-32-13 79h-37l-12-78Z" fill={theme.accent} fillOpacity=".75" />
      <path d="M219 187v38c0 20 18 36 41 36s41-16 41-36v-38h-82Z" fill={skinTone} />
      <path d="M207 142c0-41 20-65 54-65s54 24 54 65v43c0 35-23 62-54 62s-54-27-54-62v-43Z" fill={skinTone} />
      {headband && <path d="M209 141c31 10 73 10 104 0v18c-34 9-70 9-104 0v-18Z" fill="#1c1b29" stroke={theme.accent} strokeWidth="3" />}
      <path d={hairPath} fill={hairColor} />
      <path d={eyebrows[portraitSeed % eyebrows.length]} stroke={hairColor} strokeLinecap="round" strokeWidth="5" />
      <path d={eyeShapes[portraitSeed % eyeShapes.length]} fill="#fff4e9" stroke="#171521" strokeWidth="3" />
      {portraitSeed % 3 !== 1 && (
        <>
          <ellipse cx="230" cy={eyeY} rx="4" ry="6" fill={eyeColor} />
          <ellipse cx="284" cy={eyeY} rx="4" ry="6" fill={eyeColor} />
          <circle cx="231" cy={eyeY - 2} r="1.5" fill="white" />
          <circle cx="285" cy={eyeY - 2} r="1.5" fill="white" />
        </>
      )}
      <path d="m260 171-5 26 12-2" stroke="#9f6259" strokeLinecap="round" strokeWidth="2" />
      <path d={expressions[portraitSeed % expressions.length]} stroke="#9f6259" strokeLinecap="round" strokeWidth="2.5" />
      {scar && <path d="m298 182 12 23m-16-17 12 23" stroke={theme.accent} strokeLinecap="round" strokeWidth="2.5" />}
      <path d="m161 241 47-20 52 60-72 49h-77l50-89Zm198 0-47-20-52 60 72 49h77l-50-89Z" fill="#10111e" />
      <path d="m191 241 29-18 40 45-50 35-38-13 19-49Zm138 0-29-18-40 45 50 35 38-13-19-49Z" fill="#fff" fillOpacity=".08" />
      <path d="M12 304h496v26H12z" fill={`url(#${id}-dots)`} opacity=".52" />
      <path d="M13 18h45M13 18v45m494-45h-45m45 0v45M13 312h45m-45 0v-45m494 45h-45m45 0v-45" stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
    </svg>
  );
}

function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

function formatPoints(points: number): string {
  return `${points >= 0 ? '+' : ''}${points.toFixed(1)}`;
}

function formatProbabilityImpact(value: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    .format(Math.abs(value) * 100);
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatted} p.p.`;
}

function phaseLabel(phase: RoomState['phase']): string {
  switch (phase) {
    case 'LOBBY': return 'Lobby';
    case 'AUCTION': return 'Leilão ao vivo';
    case 'TEAM_REVIEW': return 'Revisão dos times';
    case 'RESULT': return 'Resultado';
  }
}

function characterTagLabel(tag: string): string {
  const labels: Record<string, string> = {
    devil: 'Demônio',
    'devil-bane': 'Caça-demônios',
    antimagic: 'Antimagia',
    time: 'Tempo',
    space: 'Espaço',
    regen: 'Regeneração',
    costly: 'Alto custo',
    mage: 'Mago',
    fast: 'Ágil',
    ranged: 'À distância'
  };
  return labels[tag] ?? tag;
}

function runeId(id: string): string {
  return id
    .replace(/^pair:/, '')
    .replace(/^group:/, 'grupo ')
    .replaceAll('+', ' + ')
    .replaceAll('-', ' ');
}

function Button({
  children,
  className = '',
  variant = 'gold',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'gold' | 'muted' | 'danger';
}) {
  const variants = {
    gold: 'border-gold/60 bg-gold text-ink hover:bg-[#ecd08d]',
    muted: 'border-white/10 bg-white/[0.04] text-white hover:border-white/25 hover:bg-white/[0.08]',
    danger: 'border-ember/50 bg-ember/10 text-ember hover:bg-ember/20'
  };
  return (
    <button
      className={`anime-button focus-ring inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-extrabold tracking-wide transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Panel({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`anime-panel rounded-2xl border border-white/[0.09] bg-panel/90 p-5 shadow-glow backdrop-blur-sm sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

function AppHeader({
  connected,
  roomCode,
  onLeave,
  anime
}: {
  connected: boolean;
  roomCode?: string;
  onLeave?: () => void;
  anime: AnimeSeries;
}) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const savedTheme = document.documentElement.dataset.theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme;
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('leilao.theme', nextTheme);
    setTheme(nextTheme);
  }

  return (
    <header className="anime-header sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-3 sm:px-8" data-anime={anime}>
      <div className="flex items-center gap-3">
        <div className="anime-mark grid h-10 w-10 place-items-center rounded-xl border border-gold/40 text-lg text-gold">
          LT
        </div>
        <div>
          <p className="anime-kicker text-[11px] font-black uppercase text-gold">GRIMÓRIO DE COMBATE</p>
          <p className="font-extrabold tracking-[0.12em] text-white">LEILÃO TÁTICO</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          aria-label={`Trocar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
          className="focus-ring min-h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/75 transition hover:bg-white/[0.08]"
          onClick={toggleTheme}
          type="button"
        >
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button
          aria-haspopup="dialog"
          className="focus-ring min-h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/75 transition hover:bg-white/[0.08]"
          onClick={() => setShowHelp(true)}
          type="button"
        >
          Regras
        </button>
        {roomCode && (
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm tracking-[0.18em] text-white/85">
            {roomCode}
          </span>
        )}
        <span
          aria-label={connected ? 'Conectado' : 'Reconectando'}
          className={`connection-indicator grid h-9 w-9 place-items-center rounded-full border ${connected ? 'is-connected border-emerald-400/30' : 'is-reconnecting border-ember/35'}`}
          role="status"
          title={connected ? 'Conectado' : 'Reconectando'}
        ><span aria-hidden="true" /></span>
        {roomCode && onLeave && (
          <button
            className="focus-ring min-h-11 rounded-lg border border-ember/30 bg-ember/[0.08] px-3 text-xs font-bold text-ember transition hover:bg-ember/[0.16]"
            onClick={() => {
              if (window.confirm('Sair agora conta como desistência?')) {
                onLeave();
              }
            }}
            type="button"
          >
            Sair da sala
          </button>
        )}
      </div>
      {showHelp && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4" onClick={() => setShowHelp(false)}>
          <section
            aria-labelledby="game-help-title"
            aria-modal="true"
            className="anime-panel max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-panel p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="anime-kicker text-xs font-bold uppercase text-gold">Manual da arena</p>
                <h2 className="mt-1 text-2xl font-black text-white" id="game-help-title">Como jogar</h2>
              </div>
              <button aria-label="Fechar regras" className="focus-ring min-h-11 min-w-11 rounded-lg text-xl text-white/60 hover:text-white" onClick={() => setShowHelp(false)} type="button">×</button>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-white/65">
              <li><strong className="text-white">Lobby:</strong> o criador escolhe o anime e pode alterá-lo até iniciar. Os dois jogadores precisam marcar “Estou pronto”.</li>
              <li><strong className="text-white">Leilão:</strong> cada pessoa começa com R$ 60,00. Cada time precisa de 7 personagens do anime escolhido.</li>
              <li><strong className="text-white">Lances:</strong> abertura mínima de R$ 1,00, incrementos de R$ 0,50 e reserva obrigatória para as vagas restantes.</li>
              <li><strong className="text-white">Relógio:</strong> cada lote abre com 15 segundos; novos lances mantêm pelo menos 10 segundos.</li>
              <li><strong className="text-white">Passar:</strong> quem passa não pode voltar ao lote. Personagens sem lance podem voltar numa segunda rodada.</li>
              <li><strong className="text-white">Batalha:</strong> após o draft, o criador escolhe o cenário. O servidor calcula pontuação, probabilidade e vencedor.</li>
              <li><strong className="text-white">Desistência:</strong> sair após o início conta como W.O. para o adversário.</li>
            </ul>
          </section>
        </div>
      )}
    </header>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-ember/35 bg-ember/10 px-4 py-3 text-sm text-orange-100">
      <p>{message}</p>
      <button className="focus-ring rounded px-1 text-lg leading-none text-orange-100/70 hover:text-white" onClick={onDismiss} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

function CharacterGallery() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<AnimeSeries | 'ALL'>('ALL');
  const characters = selectedSeries === 'ALL'
    ? ROSTER
    : ROSTER.filter((character) => character.series === selectedSeries);
  const filters: { id: AnimeSeries | 'ALL'; label: string }[] = [
    { id: 'ALL', label: `Todos · ${ROSTER.length}` },
    { id: 'ONE_PIECE', label: `One Piece · ${ROSTER.filter((character) => character.series === 'ONE_PIECE').length}` },
    { id: 'NARUTO', label: `Naruto · ${ROSTER.filter((character) => character.series === 'NARUTO').length}` },
    { id: 'BLACK_CLOVER', label: `Black Clover · ${ROSTER.filter((character) => character.series === 'BLACK_CLOVER').length}` }
  ];

  return (
    <section aria-labelledby="roster-heading" className="relative mx-auto mt-14 w-full max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div>
            <p className="anime-kicker text-xs font-bold uppercase text-gold">O elenco da temporada</p>
            <h2 className="mt-1 text-3xl font-bold text-white sm:text-4xl" id="roster-heading">Rostos conhecidos. Novas batalhas.</h2>
          </div>
          <button
            aria-expanded={isOpen}
            aria-controls="character-gallery"
            className="anime-button focus-ring inline-flex min-h-11 items-center gap-3 border border-gold/50 bg-gold px-4 py-2 text-sm font-extrabold text-ink transition hover:bg-[#f8d879]"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
            {isOpen ? 'Fechar elenco' : `Ver ${ROSTER.length} personagens`}
          </button>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/70">
            Explore os personagens do elenco e seus retratos locais, organizados por universo.
        </p>
      </div>
      {isOpen && (
        <div className="mt-5" id="character-gallery">
          <div aria-label="Filtrar elenco por anime" className="mb-5 flex flex-wrap gap-2" role="group">
            {filters.map((filter) => (
              <button
                aria-pressed={selectedSeries === filter.id}
                className={`focus-ring rounded-full border px-3 py-2 text-sm font-semibold transition ${selectedSeries === filter.id ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/20 bg-white/[0.03] text-white/75 hover:border-white/40 hover:text-white'}`}
                key={filter.id}
                onClick={() => setSelectedSeries(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {characters.map((character, index) => (
              <article
                className="portrait-card manga-burst"
                data-rarity={character.power >= 95 ? 'legendary' : character.power >= 85 ? 'elite' : 'standard'}
                key={character.id}
                style={{
                  '--portrait-accent': seriesTheme[character.series].accent,
                  animationDelay: `${Math.min(index % 12, 8) * 24}ms`
                } as CSSProperties}
              >
                <div className="portrait-art">
                  <img
                    alt={character.name}
                    className="portrait-photo"
                    decoding="async"
                    loading="lazy"
                    src={characterImageUrl(character)}
                  />
                  <span aria-hidden="true" className="portrait-mark">{seriesTheme[character.series].mark}</span>
                  <span className="portrait-series">{seriesTheme[character.series].name}</span>
                </div>
                <div className="portrait-caption">
                  <p className="truncate text-sm font-extrabold text-white">{character.name}</p>
                  <p className="mt-1 font-mono text-xs text-white/75">
                    POD {character.power} <span className="px-1 text-white/20">/</span> VEL {character.speed}
                  </p>
                  <div className="mt-2 flex min-h-5 flex-wrap gap-1">
                    {character.tags.slice(0, 2).map((tag) => (
                      <span className="rounded border border-white/20 bg-white/[0.06] px-1.5 py-0.5 text-xs font-semibold text-white/85" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RecentMatches() {
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MATCH_HISTORY_KEY);
      if (!saved) {
        return;
      }
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        throw new Error('O histórico salvo tem um formato inválido.');
      }
      setMatches(parsed.filter(isMatchHistoryEntry).slice(0, 10));
    } catch (cause) {
      console.error('Could not read local match history:', cause);
      setHistoryError('Não foi possível ler o histórico local deste navegador.');
    }
  }, []);

  return (
    <section aria-labelledby="history-heading" className="relative mx-auto mt-12 w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="anime-kicker text-[10px] font-black uppercase text-gold/70">Memória da arena</p>
          <h2 className="mt-1 text-2xl font-black text-white" id="history-heading">Partidas recentes</h2>
        </div>
        <p className="text-xs text-white/40">Salvas somente neste navegador</p>
      </div>
      {historyError ? (
        <p className="mt-4 text-sm text-ember">{historyError}</p>
      ) : matches.length === 0 ? (
        <p className="mt-4 text-sm text-white/40">Suas batalhas concluídas aparecerão aqui.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <article className="rounded-xl border border-white/10 bg-white/[0.025] p-4" key={match.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">{seriesTheme[match.series].label}</p>
                <time className="text-[10px] text-white/35" dateTime={new Date(match.finishedAt).toISOString()}>
                  {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(match.finishedAt)}
                </time>
              </div>
              <p className="mt-2 text-sm font-extrabold text-white">{match.winner} venceu</p>
              <p className="mt-1 text-xs text-white/45">{match.scenario}</p>
              <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-white/40">
                {match.players.map((player) => `${player.name}: ${player.characters.join(', ')}`).join(' · ')}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function HomeScreen({
  connected,
  busy,
  error,
  onCreate,
  onJoin,
  onDismissError,
  initialRoomCode,
  recoveryIssue,
  restoring,
  onRetryRestore,
  onReturnToHome
}: {
  connected: boolean;
  busy: boolean;
  error: string | null;
  onCreate: (name: string, series: AnimeSeries) => void;
  onJoin: (code: string, name: string) => void;
  onDismissError: () => void;
  initialRoomCode?: string;
  recoveryIssue: boolean;
  restoring: boolean;
  onRetryRestore: () => void;
  onReturnToHome: () => void;
}) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode ?? '');
  const [selectedSeries, setSelectedSeries] = useState<AnimeSeries | null>(null);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedSeries) {
      onCreate(playerName, selectedSeries);
    }
  }

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onJoin(roomCode, playerName);
  }

  return (
    <main className="anime-home relative mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col px-4 py-8 sm:px-8 sm:py-10">
      <div className="anime-home-art" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-start">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="anime-kicker text-xs font-bold uppercase text-gold">Monte seu esquadrão. Escreva a lenda.</span>
          </div>
          <h1 className="text-5xl font-bold leading-[0.98] tracking-tight text-white sm:text-6xl">
            O próximo grande
            <span className="block pb-1 text-gold">capitão é você.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/80">
            Dois jogadores. Sete vagas. Um leilão tático que decide quem chega mais forte à batalha.
          </p>
          <div aria-label="Personagens do elenco" className="hero-character-stage mt-7" role="group">
            {([
              { id: 'luffy', series: 'ONE_PIECE', name: 'Luffy' },
              { id: 'naruto', series: 'NARUTO', name: 'Naruto' },
              { id: 'asta', series: 'BLACK_CLOVER', name: 'Asta' }
            ] as const).map(({ id, series, name }) => (
              <div className="hero-character-card" key={id} style={{ '--series-accent': seriesTheme[series].accent } as CSSProperties}>
                <img alt="" className="hero-character-photo" src={characterImageUrl({ id, series })} />
                <span className="hero-character-name">{name}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-white/75">{ROSTER.length} personagens · 3 universos · 1 só campeão</p>
          <p className="mt-4 max-w-xl border-l-2 border-gold pl-3 text-sm leading-6 text-white/75">
            Cada jogador começa com {formatMoney(GAME_RULES.startingBalanceCents)}. Lances, tempo e saldos são validados no servidor.
          </p>
        </div>

        <Panel className="relative">
          <div className="mb-5">
            <div>
              <p className="anime-kicker text-xs font-bold uppercase text-gold">Entrar na arena</p>
              <h2 className="mt-1 text-3xl font-bold text-white">Prepare sua partida</h2>
            </div>
          </div>

          <label className="mb-2 block text-sm font-semibold text-white/85" htmlFor="player-name">
            Seu nome
          </label>
          <input
            id="player-name"
            className="focus-ring mb-5 min-h-12 w-full rounded-xl border border-white/25 bg-ink/80 px-4 text-base text-white placeholder:text-white/60"
            maxLength={24}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Como devemos chamar você?"
            value={playerName}
          />

          <fieldset className="mb-5">
            <legend className="mb-3 text-sm font-semibold text-white/85">
              Escolha o anime desta partida
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {ANIME_SERIES.map((series) => {
                const theme = seriesTheme[series];
                const isSelected = selectedSeries === series;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`anime-choice-card focus-ring ${isSelected ? 'is-selected' : ''}`}
                    key={series}
                    onClick={() => setSelectedSeries(series)}
                    style={{ '--series-accent': theme.accent } as CSSProperties}
                    type="button"
                  >
                    <img alt="" className="anime-choice-photo" loading="lazy" src={characterImageUrl({
                      id: series === 'ONE_PIECE' ? 'luffy' : series === 'NARUTO' ? 'naruto' : 'asta',
                      series
                    })} />
                    <span className="anime-choice-shade" />
                    <span className="anime-choice-content">
                      <span className="anime-choice-universe">{theme.name}</span>
                      <span className="anime-choice-title">{theme.label}</span>
                    </span>
                    <span aria-hidden="true" className="anime-choice-check">{isSelected ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <form onSubmit={create}>
              <Button className="primary-cta w-full" disabled={!connected || busy || playerName.trim().length === 0 || !selectedSeries} type="submit">
                {busy ? 'Preparando...' : 'Criar sala'}
              </Button>
            </form>
            <form className="flex gap-2" onSubmit={join}>
              <input
                aria-label="Código da sala"
                className="focus-ring min-h-12 min-w-0 flex-1 rounded-xl border border-white/25 bg-ink/80 px-3 font-mono text-base uppercase tracking-[0.12em] text-white placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-white/60"
                maxLength={5}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                value={roomCode}
              />
              <Button className="secondary-cta" disabled={!connected || busy || playerName.trim().length === 0 || roomCode.trim().length !== 5} type="submit" variant="muted">
                Entrar
              </Button>
            </form>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/70">
            Compartilhe o código de 5 caracteres com seu oponente. A sala reconecta automaticamente se a página recarregar.
          </p>
          {error && <div className="mt-5"><ErrorBanner message={error} onDismiss={onDismissError} /></div>}
          {restoring && (
            <p aria-live="polite" className="mt-3 text-sm text-gold">
              Recuperando sua sala com segurança...
            </p>
          )}
          {recoveryIssue && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={!connected || busy} onClick={onRetryRestore} type="button" variant="muted">
                Tentar novamente
              </Button>
              <Button disabled={busy} onClick={onReturnToHome} type="button" variant="muted">
                Voltar ao início
              </Button>
            </div>
          )}
          {initialRoomCode && !recoveryIssue && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-white/70">
                Você recebeu um link de sala. Informe seu nome e toque em Entrar para participar.
              </p>
              <button className="focus-ring min-h-11 px-2 text-xs font-bold text-white/60 underline underline-offset-4" onClick={onReturnToHome} type="button">
                Voltar ao início
              </button>
            </div>
          )}
        </Panel>
      </div>
      <CharacterGallery />
      <RecentMatches />
      <p className="relative mx-auto mt-10 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
        As decisões do leilão e da batalha pertencem ao servidor
      </p>
    </main>
  );
}

function PlayerBadge({ player }: { player?: RoomPlayer }) {
  if (!player) {
    return (
      <div className="flex min-h-16 items-center gap-3 rounded-xl border border-dashed border-white/10 px-4 text-sm text-white/30">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.04]">?</span>
        Aguardando o segundo jogador
      </div>
    );
  }
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-ink/50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-black ${player.connected ? 'border-gold/25 bg-gold/10 text-gold' : 'border-white/10 bg-white/[0.04] text-white/35'}`}>
          {player.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{player.name}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${player.connected && player.ready ? 'text-emerald-300' : player.connected ? 'text-gold' : 'text-white/35'}`}>
            {!player.connected ? 'Desconectado' : player.ready ? 'Pronto' : 'Conectado · aguardando'}
          </p>
        </div>
      </div>
      <span className="shrink-0 text-xs text-white/40">{formatMoney(player.balanceCents)}</span>
    </div>
  );
}

function TeamPanel({ room, playerId }: { room: RoomState; playerId: string | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {room.players.map((player) => {
        const isYou = player.playerId === playerId;
        const teamCharacters = player.team
          .map(({ characterId }) => characterById.get(characterId))
          .filter((character): character is RosterCharacter => Boolean(character));
        const groupCounts = teamCharacters.flatMap((character) => character.groups)
          .reduce<Map<string, number>>((counts, group) => {
            counts.set(group, (counts.get(group) ?? 0) + 1);
            return counts;
          }, new Map());
        const activeGroups = [...groupCounts.entries()].filter(([, count]) => count >= 3);
        const average = (attribute: 'power' | 'speed' | 'resistance') => teamCharacters.length
          ? Math.round(teamCharacters.reduce((total, character) => total + character[attribute], 0) / teamCharacters.length)
          : null;
        return (
          <Panel className={isYou ? 'border-gold/20' : ''} key={player.playerId}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                  {isYou ? 'Seu time' : 'Oponente'}
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-white">{player.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Saldo</p>
                <p className="font-mono text-sm font-bold text-gold">{formatMoney(player.balanceCents)}</p>
              </div>
            </div>
            <div className="mb-3 flex items-center justify-between text-xs text-white/45">
              <span>Esquadrão</span>
              <span>{player.team.length} / {GAME_RULES.teamSize}</span>
            </div>
            <div className="mb-3 rounded-lg border border-white/[0.07] bg-ink/35 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-white/35">Leitura tática</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {([
                  ['Poder', average('power')],
                  ['Velocidade', average('speed')],
                  ['Resistência', average('resistance')]
                ] as const).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[9px] uppercase text-white/35">{label}</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-gold">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-white/40">
                {activeGroups.length
                  ? `Coesão: ${activeGroups.map(([group, count]) => `${group.replaceAll('-', ' ')} (${count})`).join(' · ')}`
                  : 'Nenhuma sinergia de grupo ativa.'}
              </p>
            </div>
            <div className="space-y-2">
              {Array.from({ length: GAME_RULES.teamSize }, (_, index) => {
                const owned = player.team[index];
                const character = owned ? characterById.get(owned.characterId) : undefined;
                return (
                  <div className={`team-slot flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 ${owned ? 'team-slot-owned bg-white/[0.045]' : 'border border-dashed border-white/[0.07]'}`} key={`${player.playerId}-${index}`}>
                    {character ? (
                      <>
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="team-character-photo-wrap"
                            style={{ borderColor: `${seriesTheme[character.series].accent}55` }}
                          >
                            <img alt="" className="team-character-photo" loading="lazy" src={characterImageUrl(character)} />
                          </span>
                          <span className="min-w-0 truncate text-sm font-semibold text-white/85">{character.name}</span>
                        </span>
                        <span className={`shrink-0 font-mono text-xs ${owned.priceCents === 0 ? 'text-emerald-300' : 'text-gold'}`}>
                          {formatMoney(owned.priceCents)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-white/25">Vaga {index + 1} · livre</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function Countdown({
  deadline,
  serverOffsetMs,
  durationMs
}: {
  deadline: number | null;
  serverOffsetMs: number;
  durationMs: number;
}) {
  const [now, setNow] = useState(Date.now());
  const [announcedMilestone, setAnnouncedMilestone] = useState<number | null>(null);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);
  const remainingMs = deadline === null ? null : Math.max(0, deadline - (now + serverOffsetMs));
  const seconds = remainingMs === null ? null : Math.ceil(remainingMs / 1000);
  const milestone = seconds === null
    ? null
    : seconds <= 5
      ? 5
      : seconds <= 10
        ? 10
        : durationMs >= 30_000 && seconds <= 30
          ? 30
          : null;
  useEffect(() => {
    setAnnouncedMilestone(milestone);
  }, [milestone]);
  const progress = remainingMs === null ? 0 : Math.min(1, remainingMs / durationMs);
  const formattedTime = seconds === null
    ? '—'
    : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <div aria-label={seconds === null ? 'Aguardando próximo lote' : `${seconds} segundos restantes`} className={`auction-clock ${seconds !== null && seconds <= 10 ? 'is-alert' : ''} ${seconds !== null && seconds <= 5 ? 'is-urgent' : ''}`} role="timer">
      <div aria-hidden="true" className="auction-clock-track">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <p className="auction-clock-time">
        {formattedTime}
      </p>
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {announcedMilestone === null ? '' : `${announcedMilestone} segundos restantes`}
      </span>
    </div>
  );
}

function AuctionView({
  room,
  playerId,
  serverOffsetMs,
  busy,
  sendAction
}: {
  room: RoomState;
  playerId: string | null;
  serverOffsetMs: number;
  busy: boolean;
  sendAction: (action: 'auction:bid' | 'auction:pass', options?: { amountCents?: number }) => void;
}) {
  const [customBid, setCustomBid] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [showCustomBid, setShowCustomBid] = useState(false);
  const auction = room.auction;
  const character = auction?.currentCharacterId
    ? characterById.get(auction.currentCharacterId)
    : undefined;
  const me = room.players.find((player) => player.playerId === playerId);
  const opponent = room.players.find((player) => player.playerId !== playerId);
  const leader = room.players.find((player) => player.playerId === auction?.leadingPlayerId);
  const passed = auction?.passedPlayerIds.includes(playerId ?? '') ?? false;
  const isLeader = auction?.leadingPlayerId === playerId;
  const minimumBid = auction && auction.currentBidCents > 0
    ? auction.currentBidCents + GAME_RULES.bidIncrementCents
    : GAME_RULES.minimumBidCents;
  const quickBase = auction && auction.currentBidCents > 0
    ? auction.currentBidCents
    : GAME_RULES.minimumBidCents;
  const reservedBalance = me
    ? Math.max(0, (GAME_RULES.teamSize - me.team.length - 1) * GAME_RULES.minimumBidCents)
    : 0;
  const allInBid = me
    ? Math.floor((me.balanceCents - reservedBalance) / GAME_RULES.bidIncrementCents) * GAME_RULES.bidIncrementCents
    : 0;
  const canBid = Boolean(character && me)
    && !busy
    && !isLeader
    && !passed
    && (me?.team.length ?? GAME_RULES.teamSize) < GAME_RULES.teamSize;
  const quickBids = [
    { label: '+ R$ 0,50', amount: quickBase + 50, allIn: false },
    { label: '+ R$ 1,00', amount: quickBase + 100, allIn: false },
    { label: '+ R$ 2,00', amount: quickBase + 200, allIn: false },
    { label: `Tudo · ${formatMoney(allInBid)}`, amount: allInBid, allIn: true }
  ];

  function bidFromCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const match = customBid.trim().match(/^(\d+)(?:[,.](\d{1,2}))?$/);
    if (!match) {
      setCustomError('Informe um valor em reais, como 12,50.');
      return;
    }
    const amountCents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
    setCustomError(null);
    sendAction('auction:bid', { amountCents });
  }

  return (
    <div className="auction-screen" data-anime={room.series}>
      <div className="auction-topline">
        <span>Rodada {auction?.round ?? 1}</span>
        <span className="auction-lots-left">
          {(auction?.queueCharacterIds.length ?? 0) + (auction?.unsoldCharacterIds.length ?? 0) + (character ? 1 : 0)} personagens restantes
        </span>
        <Countdown
          deadline={auction?.endsAt ?? null}
          durationMs={GAME_RULES.characterOpeningDurationMs}
          serverOffsetMs={serverOffsetMs}
        />
      </div>
      <div className="auction-main">
        <section aria-label={character ? `Carta de ${character.name}` : 'Próximo lote'} className="auction-character">

        {character ? (
          <>
            <img alt={character.name} className="auction-character-photo" decoding="async" key={character.id} src={characterImageUrl(character)} />
            <div className="auction-character-overlay" />
            <span className="auction-series-mark">{seriesTheme[character.series].label}</span>
            <div className="auction-character-caption">
              <span className="auction-round-stamp">Lote · rodada {auction?.round ?? 1}</span>
              <h2>{character.name}</h2>
            </div>
            <div className="auction-character-stats" aria-label="Atributos">
              {([
                ['Poder', character.power],
                ['Velocidade', character.speed],
                ['Resistência', character.resistance]
              ] as const).map(([label, value]) => (
                <div className="auction-stat" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            {character.tags.length > 0 && (
              <div className="auction-character-tags" aria-label="Habilidades">
                {character.tags.map((tag) => <span key={tag}>{characterTagLabel(tag)}</span>)}
              </div>
            )}
          </>
        ) : (
          <div className="auction-waiting">
            <p>Próximo personagem em instantes</p>
            <span>A rodada continua em breve.</span>
          </div>
        )}
        </section>
        <section aria-label="Lances do personagem" className="auction-bidding">
          <div className="auction-current-bid">
            <p>{leader ? `${leader.name} está na frente` : 'Lance atual'}</p>
            <strong>{auction?.currentBidCents ? formatMoney(auction.currentBidCents) : formatMoney(GAME_RULES.minimumBidCents)}</strong>
            <span>{leader ? 'Quem cobrir assume a liderança' : 'Lance de abertura'}</span>
          </div>
          <div className="auction-wallet">
            <span>Seu saldo</span>
            <strong>{formatMoney(me?.balanceCents ?? 0)}</strong>
            <span className="auction-minimum">Mínimo agora: {formatMoney(minimumBid)}</span>
          </div>
          <div className="auction-quick-bids">
            {quickBids.map((quickBid) => (
              <Button
                className={quickBid.allIn ? 'auction-all-in' : 'auction-increment'}
                disabled={!canBid || quickBid.amount < minimumBid || quickBid.amount > (me?.balanceCents ?? 0) - reservedBalance}
                key={quickBid.label}
                onClick={() => sendAction('auction:bid', { amountCents: quickBid.amount })}
                variant={quickBid.allIn ? 'muted' : 'gold'}
              >
                {quickBid.label}
              </Button>
            ))}
          </div>
          <button
            aria-expanded={showCustomBid}
            className="auction-custom-toggle"
            onClick={() => {
              setShowCustomBid((visible) => !visible);
              setCustomError(null);
            }}
            type="button"
          >
            {showCustomBid ? 'Fechar lance personalizado' : 'Outro valor'}
          </button>
          {showCustomBid && (
            <form className="auction-custom-form" onSubmit={bidFromCustom}>
              <label className="sr-only" htmlFor="custom-bid">Lance personalizado em reais</label>
              <input
                className="focus-ring"
                id="custom-bid"
                inputMode="decimal"
                onChange={(event) => {
                  setCustomBid(event.target.value);
                  setCustomError(null);
                }}
                placeholder="Ex.: 12,50"
                value={customBid}
              />
              <Button disabled={!canBid} type="submit">Confirmar</Button>
              {customError && <p role="alert">{customError}</p>}
            </form>
          )}
          <button className="auction-pass" disabled={!canBid} onClick={() => sendAction('auction:pass')} type="button">
            {isLeader ? 'Você está liderando este lote' : passed ? 'Você passou este lote' : 'Passar este personagem'}
          </button>
        </section>
      </div>
      <section aria-label="Times e saldos" className="auction-teams">
        {[me, opponent].filter((player): player is RoomPlayer => Boolean(player)).map((player) => {
          const isMine = player.playerId === playerId;
          return (
            <div className={`auction-team-row ${isMine ? 'is-mine' : 'is-opponent'}`} key={player.playerId}>
              <div className="auction-team-heading">
                <span>{isMine ? 'Meu time' : 'Rival'}</span>
                <strong>{player.name}</strong>
                <span className="auction-team-count">{player.team.length}/{GAME_RULES.teamSize}</span>
                <span className="auction-team-balance">{formatMoney(player.balanceCents)}</span>
              </div>
              <div className="auction-team-slots">
                {Array.from({ length: GAME_RULES.teamSize }, (_, index) => {
                  const owned = player.team[index];
                  const ownedCharacter = owned ? characterById.get(owned.characterId) : undefined;
                  return (
                    <div
                      className={`auction-team-slot ${ownedCharacter ? 'is-filled' : ''}`}
                      key={`${player.playerId}-${index}`}
                      title={ownedCharacter ? `${ownedCharacter.name} · ${formatMoney(owned?.priceCents ?? 0)}` : `Vaga ${index + 1}`}
                    >
                      {ownedCharacter ? (
                        <>
                          <img alt={ownedCharacter.name} loading="lazy" src={characterImageUrl(ownedCharacter)} />
                          <span>{ownedCharacter.name}</span>
                          <small>{formatMoney(owned?.priceCents ?? 0)}</small>
                        </>
                      ) : (
                        <span aria-label={`Vaga ${index + 1} livre`} className="auction-slot-number">{index + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
      {(isLeader || passed) && (
        <p className="auction-feedback" aria-live="polite">
          {isLeader ? 'Seu lance está na frente. Acompanhe o relógio para confirmar a vitória.' : 'Você passou este lote; pode disputar o próximo personagem.'}
        </p>
      )}
    </div>
  );
}

function LobbyView({
  room,
  playerId,
  busy,
  sendAction,
  error,
  onDismissError
}: {
  room: RoomState;
  playerId: string | null;
  busy: boolean;
  sendAction: (
    action: 'auction:start' | 'room:set-series' | 'lobby:set-ready',
    options?: { series?: AnimeSeries; ready?: boolean }
  ) => void;
  error: string | null;
  onDismissError: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const isHost = playerId === room.hostPlayerId;
  const ready = room.players.length === 2 && room.players.every((player) => player.connected && player.ready);
  const me = room.players.find((player) => player.playerId === playerId);
  const inviteUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/sala/${room.roomCode}`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (cause) {
      console.error('Could not copy room invite link:', cause);
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_0.8fr]">
      <Panel>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mystic">Convide seu rival</p>
        <h2 className="mt-2 text-2xl font-black text-white">A arena está quase pronta</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
          Envie este código para o outro jogador. Quando os dois estiverem conectados, o criador inicia o leilão.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Anime desta partida</p>
            <p className="mt-1 font-extrabold text-white">{seriesTheme[room.series].label}</p>
          </div>
          {isHost ? (
            <label className="text-xs text-white/45">
              Alterar antes do leilão
              <select
                aria-label="Anime da partida"
                className="focus-ring ml-2 min-h-11 rounded-lg border border-white/10 bg-ink px-3 text-sm text-white"
                disabled={busy}
                onChange={(event) => sendAction('room:set-series', { series: event.target.value as AnimeSeries })}
                value={room.series}
              >
                {ANIME_SERIES.map((series) => (
                  <option key={series} value={series}>{seriesTheme[series].label}</option>
                ))}
              </select>
            </label>
          ) : (
            <span className="text-xs text-white/40">O criador pode trocar até iniciar o leilão</span>
          )}
        </div>
        <button
          className="focus-ring mt-6 flex min-h-20 w-full items-center justify-between rounded-xl border border-gold/25 bg-gold/[0.06] px-5 text-left"
          onClick={copyCode}
          type="button"
        >
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gold/60">Código da sala · toque para copiar</span>
            <span className="mt-1 block font-mono text-3xl font-black tracking-[0.28em] text-gold">{room.roomCode}</span>
          </span>
          <span className="text-sm font-bold text-gold">{copied ? 'Link copiado' : 'Copiar link'}</span>
        </button>
        <button
          className="focus-ring mt-3 min-h-11 rounded-lg border border-white/10 px-4 text-xs font-bold text-white/65 transition hover:border-white/25 hover:text-white"
          onClick={() => setShowQr((visible) => !visible)}
          type="button"
        >
          {showQr ? 'Ocultar QR' : 'Entrar com QR code'}
        </button>
        {showQr && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white p-4">
            <QRCodeSVG aria-label="QR code para abrir o convite da sala" level="M" size={180} value={inviteUrl} />
            <p className="break-all text-center text-xs text-slate-700">{inviteUrl}</p>
          </div>
        )}
      </Panel>
      <Panel>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Jogadores</p>
        <div className="mt-4 space-y-3">
          <PlayerBadge player={room.players[0]} />
          <PlayerBadge player={room.players[1]} />
        </div>
        <div className="mt-5 grid gap-2">
          <Button
            className="w-full"
            disabled={!me || !me.connected || busy}
            onClick={() => sendAction('lobby:set-ready', { ready: !me?.ready })}
            variant="muted"
          >
            {me?.ready ? 'Cancelar confirmação' : 'Estou pronto'}
          </Button>
          {isHost ? (
            <Button disabled={!ready || busy} onClick={() => sendAction('auction:start')}>
              {ready ? 'Iniciar leilão' : 'Aguardando os dois jogadores'}
            </Button>
          ) : (
            <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-center text-sm text-white/50">
              O criador inicia quando os dois estiverem prontos
            </p>
          )}
        </div>
        {error && <div className="mt-4"><ErrorBanner message={error} onDismiss={onDismissError} /></div>}
      </Panel>
    </div>
  );
}

function TeamReviewView({
  room,
  playerId,
  busy,
  sendAction,
  error,
  onDismissError
}: {
  room: RoomState;
  playerId: string | null;
  busy: boolean;
  sendAction: (action: 'battle:start' | 'auction:restart', options?: { scenario?: BattleScenario }) => void;
  error: string | null;
  onDismissError: () => void;
}) {
  const [scenario, setScenario] = useState<BattleScenario>('STANDARD');
  const isHost = playerId === room.hostPlayerId;
  return (
    <div className="space-y-5">
      <Panel className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mystic">Draft encerrado</p>
          <h2 className="mt-1 text-2xl font-black text-white">Revise os esquadrões</h2>
          <p className="mt-2 text-sm text-white/50">O servidor calcula as sinergias e sorteia o vencedor conforme o cenário escolhido.</p>
        </div>
        {isHost ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="battle-scenario">Cenário da batalha</label>
            <select
              className="focus-ring min-h-11 rounded-xl border border-white/10 bg-ink px-3 text-sm text-white"
              id="battle-scenario"
              onChange={(event) => setScenario(event.target.value as BattleScenario)}
              value={scenario}
            >
              <option value="STANDARD">Batalha padrão</option>
              <option value="DEATHMATCH">Luta até a morte</option>
            </select>
            <Button disabled={busy} onClick={() => sendAction('battle:start', { scenario })}>
              Simular batalha
            </Button>
          </div>
        ) : (
          <span className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/50">Aguardando o criador</span>
        )}
      </Panel>
      {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
      {isHost && (
        <div className="flex justify-end">
          <Button disabled={busy} onClick={() => sendAction('auction:restart')} variant="muted">
            Refazer leilão
          </Button>
        </div>
      )}
    </div>
  );
}

function ModifierList({ title, modifiers }: { title: string; modifiers: BattleScoreBreakdown['synergyBreakdown'] }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{title}</span>
        <span className="font-mono font-bold text-white/80">
          {formatPoints(modifiers.reduce((sum, modifier) => sum + modifier.points, 0))}
        </span>
      </div>
      {modifiers.length > 0 && (
        <ul className="mt-1 space-y-1 pl-3 text-[11px] text-white/35">
          {[...modifiers]
            .sort((left, right) => Math.abs(right.probabilityChange) - Math.abs(left.probabilityChange))
            .map((modifier) => (
              <li className="flex justify-between gap-3" key={modifier.id}>
                <span className="capitalize">{runeId(modifier.id)}</span>
                <span className={modifier.probabilityChange >= 0 ? 'text-emerald-200/80' : 'text-ember'}>
                  {formatPoints(modifier.points)} · {formatProbabilityImpact(modifier.probabilityChange)}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function ScoreCard({
  score,
  player
}: {
  score: BattleScoreBreakdown;
  player: RoomPlayer;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Chance de vitória</p>
          <h3 className="mt-1 text-lg font-black text-white">{player.name}</h3>
        </div>
        <span className="font-mono text-2xl font-black text-gold">
          {percentage.format(score.winProbability)}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-gradient-to-r from-mystic to-gold" style={{
          width: `${Math.min(100, Math.max(0, score.winProbability * 100))}%`
        }} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
        <ScoreValue label="Base" value={score.base} />
        <ScoreValue label="Total" value={score.total} highlight />
      </div>
      <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
        <ModifierList title="Sinergias" modifiers={score.synergyBreakdown} />
        <ModifierList title="Counters" modifiers={score.counterBreakdown} />
        <ModifierList title="Cenário" modifiers={score.scenarioBreakdown} />
      </div>
    </Panel>
  );
}

function ScoreValue({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <p className="text-white/40">{label}</p>
      <p className={`mt-1 font-mono font-bold ${highlight ? 'text-gold' : 'text-white/80'}`}>{value.toFixed(1)}</p>
    </div>
  );
}

function ScenarioProbabilityCard({
  analysis,
  players
}: {
  analysis: BattleScenarioAnalysis;
  players: RoomPlayer[];
}) {
  return (
    <Panel>
      <h3 className="text-base font-bold text-white">
        {analysis.scenario === 'DEATHMATCH' ? 'Luta até a morte' : 'Batalha padrão'}
      </h3>
      <div className="mt-3 space-y-2">
        {analysis.scores.map((score) => {
          const player = players.find((candidate) => candidate.playerId === score.playerId);
          return player ? (
            <div className="flex items-center justify-between gap-3" key={score.playerId}>
              <span className="truncate text-sm text-white/75">{player.name}</span>
              <strong className="font-mono text-base text-gold">{percentage.format(score.winProbability)}</strong>
            </div>
          ) : null;
        })}
        {analysis.drawProbability > 0 && (
          <div className="flex justify-between border-t border-white/10 pt-2 text-sm text-white/65">
            <span>Empate</span>
            <strong className="font-mono">{percentage.format(analysis.drawProbability)}</strong>
          </div>
        )}
      </div>
    </Panel>
  );
}

function ResultView({
  room,
  playerId,
  busy,
  sendAction,
  error,
  onDismissError
}: {
  room: RoomState;
  playerId: string | null;
  busy: boolean;
  sendAction: (action: 'battle:start' | 'auction:restart', options?: { scenario?: BattleScenario }) => void;
  error: string | null;
  onDismissError: () => void;
}) {
  const result = room.battleResult;
  const selectedAnalysis = result?.scenarioAnalyses.find((analysis) => analysis.scenario === result.scenario);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<BattleScenario>(result?.scenario ?? 'STANDARD');
  useEffect(() => {
    if (result) {
      setScenario(result.scenario);
    }
  }, [result?.scenario]);
  const winnerPlayerId = result?.winnerPlayerId ?? room.forfeitWinnerPlayerId;
  const winner = room.players.find((player) => player.playerId === winnerPlayerId);
  const isHost = playerId === room.hostPlayerId;
  const endedByForfeit = room.forfeitWinnerPlayerId !== null;

  useEffect(() => {
    if (room.phase !== 'RESULT' || !winner) {
      return;
    }

    const finishedAt = result?.calculatedAt ?? room.forfeitAt ?? Date.now();
    const entry: MatchHistoryEntry = {
      id: `${room.roomCode}:${finishedAt}`,
      finishedAt,
      series: room.series,
      winner: winner.name,
      scenario: result
        ? result.scenario === 'DEATHMATCH' ? 'Luta até a morte' : 'Batalha padrão'
        : 'Vitória por W.O.',
      players: room.players.map((player) => ({
        name: player.name,
        characters: player.team.map(({ characterId }) => characterById.get(characterId)?.name ?? characterId)
      }))
    };

    try {
      const saved = window.localStorage.getItem(MATCH_HISTORY_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) {
        throw new Error('O histórico salvo tem um formato inválido.');
      }
      const next = [entry, ...parsed.filter(isMatchHistoryEntry).filter((match) => match.id !== entry.id)].slice(0, 10);
      window.localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(next));
      setHistoryError(null);
    } catch (cause) {
      console.error('Could not save local match history:', cause);
      setHistoryError('A partida foi concluída, mas não foi possível salvá-la no histórico deste navegador.');
    }
  }, [
    result?.calculatedAt,
    room.forfeitAt,
    room.phase,
    room.players,
    room.roomCode,
    room.series,
    winner
  ]);

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden text-center">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-gold">Resultado da simulação</p>
        <h2 className="anime-title-glow mt-3 text-4xl font-black text-white sm:text-6xl">
          {winner ? `${winner.name} venceu` : 'Batalha concluída'}
        </h2>
        <p className="mt-3 text-sm text-white/50">
          {result
            ? `${result.scenario === 'DEATHMATCH' ? 'Luta até a morte' : 'Batalha padrão'} · sorteio reproduzível pela seed ${result.seed}`
            : room.forfeitMessage ?? 'Vitória por W.O.'}
        </p>
        <div className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/40" />
          <span className="rounded border border-gold/30 px-2 py-1 text-xs font-black tracking-widest text-gold">VS</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/40" />
        </div>
      </Panel>

      {result && (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            <Panel>
              <h3 className="text-base font-bold text-white">Chance geral</h3>
              <p className="mt-1 text-xs text-white/60">
                Média simples dos cenários (50% para cada um).
              </p>
              <div className="mt-4 space-y-3">
                {result.overallProbabilities.map((entry) => {
                  const player = room.players.find((candidate) => candidate.playerId === entry.playerId);
                  return player ? (
                    <div className="flex items-center justify-between gap-3" key={entry.playerId}>
                      <span className="truncate text-sm text-white/80">{player.name}</span>
                      <strong className="font-mono text-lg text-gold">{percentage.format(entry.probability)}</strong>
                    </div>
                  ) : null;
                })}
              </div>
              <p className="mt-4 text-xs text-white/50">
                O vencedor foi sorteado usando as chances do cenário escolhido.
              </p>
            </Panel>
            {result.scenarioAnalyses.map((analysis) => (
              <ScenarioProbabilityCard analysis={analysis} key={analysis.scenario} players={room.players} />
            ))}
          </div>
          {selectedAnalysis && (
            <>
              <h3 className="text-lg font-bold text-white">
                Fatores da {selectedAnalysis.scenario === 'DEATHMATCH' ? 'Luta até a morte' : 'Batalha padrão'}
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {selectedAnalysis.scores.map((score) => {
                  const player = room.players.find((candidate) => candidate.playerId === score.playerId);
                  return player ? <ScoreCard key={score.playerId} player={player} score={score} /> : null;
                })}
              </div>
            </>
          )}
        </>
      )}

      {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
      {historyError && <ErrorBanner message={historyError} onDismiss={() => setHistoryError(null)} />}
      {isHost ? (
        <Panel className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-white">{endedByForfeit ? 'Partida encerrada por desistência' : 'Outra batalha?'}</p>
            <p className="mt-1 text-xs text-white/45">
              {endedByForfeit ? 'Você pode abrir um novo leilão para esta sala.' : 'Mude o cenário ou sorteie novamente com os mesmos times.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!endedByForfeit && (
              <>
                <label className="sr-only" htmlFor="rematch-scenario">Cenário da revanche</label>
                <select
                  className="focus-ring min-h-11 rounded-xl border border-white/10 bg-ink px-3 text-sm text-white"
                  id="rematch-scenario"
                  onChange={(event) => setScenario(event.target.value as BattleScenario)}
                  value={scenario}
                >
                  <option value="STANDARD">Batalha padrão</option>
                  <option value="DEATHMATCH">Luta até a morte</option>
                </select>
                <Button disabled={busy} onClick={() => sendAction('battle:start', { scenario })}>
                  Refazer batalha
                </Button>
              </>
            )}
            <Button disabled={busy} onClick={() => sendAction('auction:restart')} variant="muted">
              Refazer leilão
            </Button>
          </div>
        </Panel>
      ) : (
        <p className="text-center text-sm text-white/40">O criador da sala pode iniciar uma revanche ou refazer o leilão.</p>
      )}
    </div>
  );
}

function RoomScreen({
  room,
  playerId,
  connected,
  serverOffsetMs,
  busy,
  error,
  sendAction,
  onDismissError
}: {
  room: RoomState;
  playerId: string | null;
  connected: boolean;
  serverOffsetMs: number;
  busy: boolean;
  error: string | null;
  sendAction: ReturnType<typeof useRoom>['sendAction'];
  onDismissError: () => void;
}) {
  const me = room.players.find((player) => player.playerId === playerId);
  const opponent = room.players.find((player) => player.playerId !== playerId);
  const subtitle = useMemo(() => (
    `${me?.name ?? 'Jogador'}${opponent ? ` vs ${opponent.name}` : ''}`
  ), [me?.name, opponent?.name]);

  return (
    <main className="room-screen mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8" data-phase={room.phase}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{subtitle} · {seriesTheme[room.series].label}</p>
          <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">{phaseLabel(room.phase)}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-300' : 'bg-ember'}`} />
          {connected ? 'Estado sincronizado' : 'Tentando reconectar'}
        </div>
      </div>

      {room.phase === 'LOBBY' && (
        <LobbyView
          busy={busy}
          error={error}
          onDismissError={onDismissError}
          playerId={playerId}
          room={room}
          sendAction={(action, options) => sendAction(action, options)}
        />
      )}
      {room.phase === 'AUCTION' && (
        <div className="space-y-4">
          <AuctionView
            busy={busy}
            playerId={playerId}
            room={room}
            sendAction={(action, options) => sendAction(action, options)}
            serverOffsetMs={serverOffsetMs}
          />
          {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
        </div>
      )}
      {room.phase === 'TEAM_REVIEW' && (
        <div className="space-y-5">
          <TeamPanel playerId={playerId} room={room} />
          <TeamReviewView
            busy={busy}
            error={error}
            onDismissError={onDismissError}
            playerId={playerId}
            room={room}
            sendAction={(action, options) => sendAction(action, options)}
          />
        </div>
      )}
      {room.phase === 'RESULT' && (
        <div className="space-y-5">
          <TeamPanel playerId={playerId} room={room} />
          <ResultView
            busy={busy}
            error={error}
            onDismissError={onDismissError}
            playerId={playerId}
            room={room}
            sendAction={(action, options) => sendAction(action, options)}
          />
        </div>
      )}
    </main>
  );
}

export default function GameApp({ initialRoomCode }: { initialRoomCode?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    room,
    playerId,
    connected,
    serverOffsetMs,
    busy,
    error,
    notice,
    dismissNotice,
    restoring,
    recoveryIssue,
    shouldReturnHome,
    createRoom,
    joinRoom,
    leaveRoom,
    returnToHome,
    retryRestore,
    sendAction,
    dismissError
  } = useRoom();

  useEffect(() => {
    if (shouldReturnHome && pathname.startsWith('/sala/')) {
      router.replace('/');
      return;
    }
    if (room) {
      const roomPath = `/sala/${room.roomCode}`;
      if (pathname !== roomPath) {
        router.replace(roomPath);
      }
      return;
    }
    if (!room && pathname.startsWith('/sala/') && playerId === null) {
      return;
    }
  }, [initialRoomCode, pathname, playerId, room, router, shouldReturnHome]);

  return (
    <div className="min-h-screen" data-anime={room?.series ?? 'ONE_PIECE'}>
      <AppHeader
        connected={connected}
        anime={room?.series ?? 'ONE_PIECE'}
        onLeave={room ? () => {
          void leaveRoom().then((left) => {
            if (left) {
              router.push('/');
            }
          });
        } : undefined}
        roomCode={room?.roomCode}
      />
      {notice && (
        <div
          aria-live="polite"
          className="fixed right-4 top-20 z-50 flex min-h-12 max-w-sm items-center gap-4 rounded-xl border border-gold/30 bg-panel px-4 py-3 text-sm font-semibold text-white shadow-2xl"
          role="status"
        >
          <span>{notice}</span>
          <button aria-label="Fechar notificação" className="focus-ring min-h-8 min-w-8 text-lg text-white/55" onClick={dismissNotice} type="button">×</button>
        </div>
      )}
      {room ? (
        <RoomScreen
          busy={busy}
          connected={connected}
          error={error}
          onDismissError={dismissError}
          playerId={playerId}
          room={room}
          sendAction={sendAction}
          serverOffsetMs={serverOffsetMs}
        />
      ) : (
        <HomeScreen
          busy={busy}
          connected={connected}
          error={error}
          onCreate={createRoom}
          onDismissError={dismissError}
          initialRoomCode={initialRoomCode}
          recoveryIssue={recoveryIssue}
          restoring={restoring}
          onRetryRestore={retryRestore}
          onReturnToHome={() => {
            returnToHome();
            router.push('/');
          }}
          onJoin={joinRoom}
        />
      )}
      <footer className="anime-footer border-t px-4 py-4 text-center text-[10px] leading-5 text-white/40">
        <p className="font-bold uppercase tracking-[0.2em]">Leilão Tático · Multiplayer em tempo real</p>
        <p className="mx-auto mt-1 max-w-4xl normal-case tracking-normal">
          Projeto de fã independente, não oficial e sem afiliação. Personagens, nomes, marcas e imagens pertencem exclusivamente aos respectivos titulares de direitos.
        </p>
      </footer>
    </div>
  );
}
