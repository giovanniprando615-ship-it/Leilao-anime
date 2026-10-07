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
import { ANIME_SERIES, GAME_RULES, ROSTER } from '@leilao/shared';
import type {
  AnimeSeries,
  BattleScenario,
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

function phaseLabel(phase: RoomState['phase']): string {
  switch (phase) {
    case 'LOBBY': return 'Lobby';
    case 'AUCTION': return 'Leilão ao vivo';
    case 'TEAM_REVIEW': return 'Revisão dos times';
    case 'RESULT': return 'Resultado';
  }
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
  roomCode
}: {
  connected: boolean;
  roomCode?: string;
}) {
  return (
    <header className="anime-header flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-8">
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
        {roomCode && (
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm tracking-[0.18em] text-white/85">
            {roomCode}
          </span>
        )}
        <span className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${connected ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-ember/25 bg-ember/10 text-ember'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-300' : 'bg-ember'}`} />
          {connected ? 'Conectado' : 'Reconectando'}
        </span>
      </div>
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
    <section aria-labelledby="roster-heading" className="relative mx-auto mt-20 w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="anime-kicker text-[10px] font-black uppercase text-ember">O elenco da temporada</p>
          <h2 className="mt-1 text-4xl font-black text-white sm:text-5xl" id="roster-heading">Rostos conhecidos. Novas batalhas.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
            Explore os personagens do elenco e seus retratos locais, organizados por universo.
          </p>
        </div>
        <button
          aria-expanded={isOpen}
          className="anime-button focus-ring inline-flex min-h-11 items-center gap-3 border border-gold/35 bg-gold/[0.08] px-4 py-2 text-sm font-extrabold text-gold transition hover:bg-gold/[0.14]"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
          {isOpen ? 'Fechar elenco' : `Ver ${ROSTER.length} personagens`}
        </button>
      </div>
      {isOpen && (
        <div className="mt-5">
          <div aria-label="Filtrar elenco por anime" className="mb-5 flex flex-wrap gap-2" role="group">
            {filters.map((filter) => (
              <button
                aria-pressed={selectedSeries === filter.id}
                className={`focus-ring rounded-full border px-3 py-2 text-xs font-bold transition ${selectedSeries === filter.id ? 'border-gold/50 bg-gold/10 text-gold' : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white'}`}
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
                  <p className="mt-1 font-mono text-[10px] text-white/45">POD {character.power} <span className="px-1 text-white/20">/</span> VEL {character.speed}</p>
                </div>
              </article>
            ))}
          </div>
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
  onDismissError
}: {
  connected: boolean;
  busy: boolean;
  error: string | null;
  onCreate: (name: string, series: AnimeSeries) => void;
  onJoin: (code: string, name: string) => void;
  onDismissError: () => void;
}) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
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
    <main className="anime-home rune-grid relative mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col justify-center px-4 py-10 sm:px-8">
      <div className="anime-home-art" aria-hidden="true" />
      <div aria-hidden="true" className="hero-illustration manga-burst">
        <MangaIllustration series="BLACK_CLOVER" />
        <span className="hero-wordmark">BATTLE<br />MANGA</span>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/[0.06] sm:h-[46rem] sm:w-[46rem]" />
      <div className="relative mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-2xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="anime-kicker border border-ember/40 bg-ember/10 px-2 py-1 text-[10px] font-black uppercase text-ember">Capítulo 01</span>
            <span className="h-px w-12 bg-gradient-to-r from-gold/80 to-transparent" />
            <p className="anime-kicker text-xs font-black uppercase text-gold">Monte seu esquadrão. Escreva a lenda.</p>
          </div>
          <h1 className="anime-title-glow text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-7xl">
            O próximo grande
            <span className="block bg-gradient-to-r from-gold via-amber-100 to-[#ff8a77] bg-clip-text pb-1 text-transparent">capitão é você.</span>
          </h1>
          <div className="manga-cutline my-5 h-2 w-44" />
          <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
            Dois jogadores. Sete vagas. Um leilão tático que decide quem chega mais forte à batalha.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-2">
            {(['ONE_PIECE', 'NARUTO', 'BLACK_CLOVER'] as const).map((series) => (
              <div
                className="manga-title-card rounded-lg px-3 py-2"
                key={series}
                style={{ '--series-accent': seriesTheme[series].accent } as CSSProperties}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/45">{seriesTheme[series].name}</p>
                <p className="mt-0.5 text-[11px] font-extrabold tracking-[0.06em] text-white">
                  {series.replaceAll('_', ' ')}
                </p>
                <span aria-hidden="true" className="absolute right-2 top-1 text-sm font-black tracking-wider" style={{ color: seriesTheme[series].accent }}>
                  {seriesTheme[series].mark}
                </span>
              </div>
            ))}
          </div>
          <p className="anime-kicker mt-3 text-[10px] font-bold uppercase text-gold/80">{ROSTER.length} guerreiros · 3 universos · 1 só campeão</p>
          <p className="mt-8 max-w-xl border-l-2 border-ember/70 pl-3 text-xs leading-5 text-white/50">
            Cada jogador começa com {formatMoney(GAME_RULES.startingBalanceCents)}. Lances, tempo e saldos são validados no servidor.
          </p>
        </div>

        <Panel className="relative">
          <div className="mb-5">
            <div>
              <p className="anime-kicker text-xs font-bold uppercase text-mystic">Entrar na arena</p>
              <h2 className="mt-1 text-2xl font-extrabold text-white">Prepare sua partida</h2>
            </div>
          </div>

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50" htmlFor="player-name">
            Seu nome
          </label>
          <input
            id="player-name"
            className="focus-ring mb-5 min-h-12 w-full rounded-xl border border-white/10 bg-ink/80 px-4 text-white placeholder:text-white/25"
            maxLength={24}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Como devemos chamar você?"
            value={playerName}
          />

          <fieldset className="mb-5">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">
              Escolha o anime desta partida
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {ANIME_SERIES.map((series) => {
                const theme = seriesTheme[series];
                const isSelected = selectedSeries === series;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`focus-ring min-h-14 rounded-lg border px-2 py-2 text-left transition ${isSelected ? 'bg-white/[0.07] shadow-glow' : 'border-white/10 bg-ink/50 hover:border-white/25'}`}
                    key={series}
                    onClick={() => setSelectedSeries(series)}
                    style={{
                      borderColor: isSelected ? `${theme.accent}a0` : undefined,
                      boxShadow: isSelected ? `inset 0 -2px ${theme.accent}, 0 0 18px ${theme.glow}35` : undefined
                    }}
                    type="button"
                  >
                    <span className="block text-[9px] font-black uppercase tracking-wider text-white/45">{theme.name}</span>
                    <span className="mt-1 block truncate text-[11px] font-extrabold text-white">{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <form onSubmit={create}>
              <Button className="w-full" disabled={!connected || busy || playerName.trim().length === 0 || !selectedSeries} type="submit">
                {busy ? 'Preparando...' : 'Criar sala'}
              </Button>
            </form>
            <form className="flex gap-2" onSubmit={join}>
              <input
                aria-label="Código da sala"
                className="focus-ring min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-ink/80 px-3 font-mono uppercase tracking-[0.12em] text-white placeholder:font-sans placeholder:text-xs placeholder:tracking-normal placeholder:text-white/25"
                maxLength={5}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                value={roomCode}
              />
              <Button disabled={!connected || busy || playerName.trim().length === 0 || roomCode.trim().length !== 5} type="submit" variant="muted">
                Entrar
              </Button>
            </form>
          </div>

          <p className="mt-4 text-xs leading-5 text-white/40">
            Compartilhe o código de 5 caracteres com seu oponente. A sala reconecta automaticamente se a página recarregar.
          </p>
          {error && <div className="mt-5"><ErrorBanner message={error} onDismiss={onDismissError} /></div>}
        </Panel>
      </div>
      <CharacterGallery />
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
          <p className={`text-[10px] font-bold uppercase tracking-wider ${player.connected ? 'text-emerald-300' : 'text-white/35'}`}>
            {player.connected ? 'Conectado' : 'Reconectando'}
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
  serverOffsetMs
}: {
  deadline: number | null;
  serverOffsetMs: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);
  const seconds = deadline === null
    ? null
    : Math.max(0, Math.ceil((deadline - (now + serverOffsetMs)) / 1000));
  return (
    <div className="min-w-24 rounded-xl border border-gold/20 bg-gold/[0.07] px-4 py-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/65">Tempo</p>
      <p aria-live="off" className={`font-mono text-3xl font-black tabular-nums ${seconds !== null && seconds <= 5 ? 'text-ember' : 'text-gold'}`}>
        {seconds === null ? '—' : `00:${String(seconds).padStart(2, '0')}`}
      </p>
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
  const auction = room.auction;
  const character = auction?.currentCharacterId
    ? characterById.get(auction.currentCharacterId)
    : undefined;
  const me = room.players.find((player) => player.playerId === playerId);
  const leader = room.players.find((player) => player.playerId === auction?.leadingPlayerId);
  const passed = auction?.passedPlayerIds.includes(playerId ?? '') ?? false;
  const isLeader = auction?.leadingPlayerId === playerId;
  const minimumBid = auction && auction.currentBidCents > 0
    ? auction.currentBidCents + GAME_RULES.bidIncrementCents
    : GAME_RULES.minimumBidCents;
  const quickBase = auction && auction.currentBidCents > 0
    ? auction.currentBidCents
    : GAME_RULES.minimumBidCents;
  const quickBidLabel = (increment: number) => auction?.currentBidCents
    ? `+ ${formatMoney(increment)}`
    : `Lance ${formatMoney(quickBase + increment)}`;

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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Panel className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-gold/[0.08]" />
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mystic">Rodada {auction?.round ?? 1}</p>
            <h2 className="mt-1 text-2xl font-black text-white">Personagem em disputa</h2>
          </div>
          <Countdown deadline={auction?.endsAt ?? auction?.nextCharacterAt ?? null} serverOffsetMs={serverOffsetMs} />
        </div>

        {character ? (
          <div className="grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
            <div
              className={`character-art character-art-${character.series === 'ONE_PIECE' ? 'op' : character.series === 'NARUTO' ? 'naruto' : 'clover'} flex min-h-60 flex-col justify-between rounded-xl border p-5`}
            >
              <img
                alt={character.name}
                className="character-photo"
                decoding="async"
                src={characterImageUrl(character)}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-8 right-4 text-3xl font-black tracking-widest text-white/70"
              >
                {seriesTheme[character.series].mark}
              </span>
              <div className="flex items-center justify-between">
                <span
                  className="rounded-sm border bg-ink/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur"
                  style={{ borderColor: `${seriesTheme[character.series].accent}80`, color: seriesTheme[character.series].accent }}
                >
                  {character.series.replaceAll('_', ' ')}
                </span>
                <span aria-hidden="true" className="rounded border border-white/25 bg-ink/60 px-2 py-1 text-xs font-black tracking-widest text-white">{seriesTheme[character.series].mark}</span>
              </div>
              <div>
                <p className="anime-kicker text-xs font-bold uppercase text-gold/80">Personagem em disputa</p>
                <h3 className="mt-2 text-4xl font-black leading-[0.95] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">{character.name}</h3>
                <p className="mt-2 text-xs text-white/40">Custo sugerido {formatMoney(character.suggestedCostCents)}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Atributos</p>
                <div className="space-y-3">
                  <StatBar label="Poder" value={character.power} />
                  <StatBar label="Velocidade" value={character.speed} />
                  <StatBar label="Resistência" value={character.resistance} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {character.tags.map((tag) => (
                    <span className="rounded-md border border-mystic/20 bg-mystic/[0.08] px-2 py-1 text-[10px] font-semibold text-violet-200/75" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-white/[0.07] bg-ink/50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Lance atual</p>
                  <p className="mt-1 font-mono text-2xl font-black text-gold">
                    {auction?.currentBidCents ? formatMoney(auction.currentBidCents) : 'Sem lances'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Liderando</p>
                  <p className="mt-1 text-sm font-bold text-white">{leader?.name ?? 'Ninguém ainda'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-white/10 text-center">
            <div>
              <p className="font-bold text-white/70">Próximo personagem em breve</p>
              <p className="mt-1 text-sm text-white/40">Intervalo tático entre lotes</p>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-white/[0.07] pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Seu lance <span className="font-normal normal-case tracking-normal">· saldo {formatMoney(me?.balanceCents ?? 0)}</span>
            </p>
            <p className="text-xs text-white/45">Mínimo {formatMoney(minimumBid)} · passos de R$ 0,50</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { label: quickBidLabel(50), cents: quickBase + 50 },
              { label: quickBidLabel(100), cents: quickBase + 100 },
              { label: quickBidLabel(200), cents: quickBase + 200 },
              { label: `Mínimo ${formatMoney(minimumBid)}`, cents: minimumBid }
            ].map((quickBid) => (
              <Button
                className="w-full"
                disabled={busy || !character || !me || isLeader || passed || me.team.length >= GAME_RULES.teamSize}
                key={quickBid.label}
                onClick={() => sendAction('auction:bid', { amountCents: quickBid.cents })}
                variant="muted"
              >
                {quickBid.label}
              </Button>
            ))}
          </div>
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={bidFromCustom}>
            <label className="sr-only" htmlFor="custom-bid">Lance personalizado em reais</label>
            <input
              className="focus-ring min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-ink/75 px-4 text-white placeholder:text-white/25"
              id="custom-bid"
              inputMode="decimal"
              onChange={(event) => {
                setCustomBid(event.target.value);
                setCustomError(null);
              }}
              placeholder="Outro valor (ex.: 12,50)"
              value={customBid}
            />
            <Button
              disabled={busy || !character || !me || isLeader || passed || me.team.length >= GAME_RULES.teamSize}
              type="submit"
            >
              Confirmar lance
            </Button>
            <Button
              disabled={busy || !character || !me || isLeader || passed || me.team.length >= GAME_RULES.teamSize}
              onClick={() => sendAction('auction:pass')}
              type="button"
              variant="danger"
            >
              Passar
            </Button>
          </form>
          {customError && <p className="mt-2 text-xs text-ember" role="alert">{customError}</p>}
          {(isLeader || passed) && (
            <p className="mt-3 text-xs text-white/45">
              {isLeader ? 'Você está liderando; aguarde o fim do lote.' : 'Você passou este personagem e não pode voltar ao leilão.'}
            </p>
          )}
        </div>

        {auction?.lastSale && (
          <div className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-4 py-3 text-sm">
            <span className="font-bold text-emerald-200">
              {characterById.get(auction.lastSale.characterId)?.name}
            </span>
            {auction.lastSale.playerId
              ? <span className="text-white/65"> comprado por {room.players.find((player) => player.playerId === auction.lastSale?.playerId)?.name} por {formatMoney(auction.lastSale.priceCents ?? 0)}</span>
              : <span className="text-white/50"> não vendido nesta rodada</span>}
          </div>
        )}
      </Panel>

      <div className="space-y-4">
        <Panel>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Participantes</p>
          <div className="mt-3 space-y-2">
            {room.players.map((player) => <PlayerBadge key={player.playerId} player={player} />)}
          </div>
        </Panel>
        <Panel>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Personagens restantes</p>
          <p className="mt-2 font-mono text-3xl font-black text-white">
            {auction?.queueCharacterIds.length ?? 0}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/40">
            Não vendidos nesta rodada: {auction?.unsoldCharacterIds.length ?? 0}. Eles voltam na segunda rodada.
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-gold to-mystic transition-all" style={{
              width: `${Math.min(100, (
                (ROSTER.length
                  - (auction?.queueCharacterIds.length ?? 0)
                  - (auction?.unsoldCharacterIds.length ?? 0)
                  - (auction?.currentCharacterId ? 1 : 0))
                / ROSTER.length
              ) * 100)}%`
            }} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/55">{label}</span>
        <span className="font-mono font-bold text-white/80">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-gradient-to-r from-mystic to-gold" style={{ width: `${value}%` }} />
      </div>
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
  sendAction: (action: 'auction:start') => void;
  error: string | null;
  onDismissError: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isHost = playerId === room.hostPlayerId;
  const ready = room.players.length === 2 && room.players.every((player) => player.connected);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
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
        <button
          className="focus-ring mt-6 flex min-h-20 w-full items-center justify-between rounded-xl border border-gold/25 bg-gold/[0.06] px-5 text-left"
          onClick={copyCode}
          type="button"
        >
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gold/60">Código da sala · toque para copiar</span>
            <span className="mt-1 block font-mono text-3xl font-black tracking-[0.28em] text-gold">{room.roomCode}</span>
          </span>
          <span className="text-sm font-bold text-gold">{copied ? 'Copiado ✓' : 'Copiar'}</span>
        </button>
      </Panel>
      <Panel>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Jogadores</p>
        <div className="mt-4 space-y-3">
          <PlayerBadge player={room.players[0]} />
          <PlayerBadge player={room.players[1]} />
        </div>
        {isHost ? (
          <Button className="mt-5 w-full" disabled={!ready || busy} onClick={() => sendAction('auction:start')}>
            {ready ? 'Iniciar leilão' : 'Aguardando o oponente'}
          </Button>
        ) : (
          <p className="mt-5 rounded-xl bg-white/[0.04] px-4 py-3 text-center text-sm text-white/50">
            Só o criador da sala pode iniciar
          </p>
        )}
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
          {modifiers.map((modifier) => (
            <li className="flex justify-between gap-3" key={modifier.id}>
              <span className="capitalize">{runeId(modifier.id)}</span>
              <span className={modifier.points >= 0 ? 'text-emerald-200/60' : 'text-ember/80'}>
                {formatPoints(modifier.points)}
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
  const [scenario, setScenario] = useState<BattleScenario>(result?.scenario ?? 'STANDARD');
  useEffect(() => {
    if (result) {
      setScenario(result.scenario);
    }
  }, [result?.scenario]);
  const winner = room.players.find((player) => player.playerId === result?.winnerPlayerId);
  const isHost = playerId === room.hostPlayerId;

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden text-center">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-gold">Resultado da simulação</p>
        <h2 className="anime-title-glow mt-3 text-4xl font-black text-white sm:text-6xl">
          {winner ? `${winner.name} venceu` : 'Batalha concluída'}
        </h2>
        <p className="mt-3 text-sm text-white/50">
          {result?.scenario === 'DEATHMATCH' ? 'Luta até a morte' : 'Batalha padrão'}
          {' · '}probabilidade e vencedor calculados no servidor
        </p>
        <div className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/40" />
          <span className="rounded border border-gold/30 px-2 py-1 text-xs font-black tracking-widest text-gold">VS</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/40" />
        </div>
      </Panel>

      {result && (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.scores.map((score) => {
            const player = room.players.find((candidate) => candidate.playerId === score.playerId);
            return player ? <ScoreCard key={score.playerId} player={player} score={score} /> : null;
          })}
        </div>
      )}

      {error && <ErrorBanner message={error} onDismiss={onDismissError} />}
      {isHost ? (
        <Panel className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-white">Outra batalha?</p>
            <p className="mt-1 text-xs text-white/45">Mude o cenário ou sorteie novamente com os mesmos times.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
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
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{subtitle} · {seriesTheme[room.series].label}</p>
          <h1 className="anime-title-glow mt-1 text-3xl font-black text-white sm:text-4xl">{phaseLabel(room.phase)}</h1>
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
          sendAction={(action) => sendAction(action)}
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
          <TeamPanel playerId={playerId} room={room} />
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

export default function HomePage() {
  const {
    room,
    playerId,
    connected,
    serverOffsetMs,
    busy,
    error,
    createRoom,
    joinRoom,
    sendAction,
    dismissError
  } = useRoom();

  return (
    <div className="min-h-screen">
      <AppHeader connected={connected} roomCode={room?.roomCode} />
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
