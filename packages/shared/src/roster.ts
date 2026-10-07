export const ANIME_SERIES = ['ONE_PIECE', 'NARUTO', 'BLACK_CLOVER'] as const;

export type AnimeSeries = (typeof ANIME_SERIES)[number];

export type CharacterTag =
  | 'devil'
  | 'devil-bane'
  | 'antimagic'
  | 'time'
  | 'space'
  | 'regen'
  | 'costly'
  | 'mage'
  | 'fast'
  | 'ranged';

export type CharacterId =
  | 'luffy'
  | 'zoro'
  | 'sanji'
  | 'nami'
  | 'robin'
  | 'law'
  | 'shanks'
  | 'kaido'
  | 'blackbeard'
  | 'mihawk'
  | 'doflamingo'
  | 'chopper'
  | 'usopp'
  | 'franky'
  | 'brook'
  | 'jinbe'
  | 'ace'
  | 'sabo'
  | 'boa-hancock'
  | 'crocodile'
  | 'katakuri'
  | 'marco'
  | 'yamato'
  | 'eustass-kid'
  | 'killer'
  | 'king'
  | 'queen'
  | 'whitebeard'
  | 'naruto'
  | 'sasuke'
  | 'sakura'
  | 'kakashi'
  | 'itachi'
  | 'madara'
  | 'hinata'
  | 'gaara'
  | 'shikamaru'
  | 'jiraiya'
  | 'tsunade'
  | 'obito'
  | 'pain'
  | 'minato'
  | 'hashirama'
  | 'might-guy'
  | 'deidara'
  | 'killer-bee'
  | 'asta'
  | 'yuno'
  | 'julius'
  | 'zenon'
  | 'dante'
  | 'lucifero'
  | 'noelle'
  | 'yami'
  | 'nacht'
  | 'mereoleona'
  | 'fuegoleon'
  | 'william'
  | 'luck'
  | 'magna'
  | 'vanessa'
  | 'gauche'
  | 'charmy'
  | 'liebe';

export type BattleScenario = 'STANDARD' | 'DEATHMATCH';

export interface RosterCharacter {
  id: CharacterId;
  name: string;
  series: AnimeSeries;
  power: number;
  speed: number;
  resistance: number;
  tags: CharacterTag[];
  groups: string[];
}

export const ROSTER: readonly RosterCharacter[] = [
  { id: 'luffy', name: 'Monkey D. Luffy', series: 'ONE_PIECE', power: 94, speed: 92, resistance: 95, tags: ['fast', 'costly'], groups: ['straw-hats', 'worst-generation'] },
  { id: 'zoro', name: 'Roronoa Zoro', series: 'ONE_PIECE', power: 91, speed: 82, resistance: 90, tags: ['costly'], groups: ['straw-hats'] },
  { id: 'sanji', name: 'Vinsmoke Sanji', series: 'ONE_PIECE', power: 84, speed: 96, resistance: 82, tags: ['fast'], groups: ['straw-hats'] },
  { id: 'nami', name: 'Nami', series: 'ONE_PIECE', power: 58, speed: 72, resistance: 55, tags: ['ranged'], groups: ['straw-hats'] },
  { id: 'robin', name: 'Nico Robin', series: 'ONE_PIECE', power: 76, speed: 67, resistance: 70, tags: ['mage', 'ranged'], groups: ['straw-hats'] },
  { id: 'law', name: 'Trafalgar D. Water Law', series: 'ONE_PIECE', power: 88, speed: 85, resistance: 78, tags: ['space', 'mage', 'costly'], groups: ['heart-pirates', 'worst-generation'] },
  { id: 'shanks', name: 'Red-Haired Shanks', series: 'ONE_PIECE', power: 96, speed: 90, resistance: 91, tags: ['costly'], groups: ['red-hair-pirates', 'four-emperors'] },
  { id: 'kaido', name: 'Kaido', series: 'ONE_PIECE', power: 99, speed: 77, resistance: 100, tags: ['costly'], groups: ['beasts-pirates', 'four-emperors'] },
  { id: 'blackbeard', name: 'Marshall D. Teach', series: 'ONE_PIECE', power: 95, speed: 66, resistance: 89, tags: ['space', 'costly'], groups: ['blackbeard-pirates', 'four-emperors'] },
  { id: 'mihawk', name: 'Dracule Mihawk', series: 'ONE_PIECE', power: 97, speed: 87, resistance: 86, tags: ['ranged', 'costly'], groups: ['cross-guild'] },
  { id: 'doflamingo', name: 'Donquixote Doflamingo', series: 'ONE_PIECE', power: 82, speed: 84, resistance: 77, tags: ['ranged', 'mage'], groups: ['donquixote-pirates'] },
  { id: 'chopper', name: 'Tony Tony Chopper', series: 'ONE_PIECE', power: 66, speed: 70, resistance: 73, tags: ['regen'], groups: ['straw-hats'] },
  { id: 'usopp', name: 'Usopp', series: 'ONE_PIECE', power: 64, speed: 78, resistance: 62, tags: ['ranged', 'fast'], groups: ['straw-hats'] },
  { id: 'franky', name: 'Franky', series: 'ONE_PIECE', power: 80, speed: 66, resistance: 91, tags: ['ranged'], groups: ['straw-hats'] },
  { id: 'brook', name: 'Brook', series: 'ONE_PIECE', power: 76, speed: 93, resistance: 69, tags: ['fast'], groups: ['straw-hats'] },
  { id: 'jinbe', name: 'Jinbe', series: 'ONE_PIECE', power: 88, speed: 70, resistance: 95, tags: [], groups: ['straw-hats', 'fish-men'] },
  { id: 'ace', name: 'Portgas D. Ace', series: 'ONE_PIECE', power: 90, speed: 88, resistance: 82, tags: ['mage', 'ranged'], groups: ['whitebeard-pirates'] },
  { id: 'sabo', name: 'Sabo', series: 'ONE_PIECE', power: 89, speed: 91, resistance: 84, tags: ['fast', 'mage'], groups: ['revolutionary-army'] },
  { id: 'boa-hancock', name: 'Boa Hancock', series: 'ONE_PIECE', power: 88, speed: 86, resistance: 79, tags: ['mage', 'fast'], groups: ['kuja-pirates'] },
  { id: 'crocodile', name: 'Crocodile', series: 'ONE_PIECE', power: 85, speed: 76, resistance: 87, tags: ['ranged', 'mage'], groups: ['cross-guild'] },
  { id: 'katakuri', name: 'Charlotte Katakuri', series: 'ONE_PIECE', power: 93, speed: 90, resistance: 91, tags: ['fast', 'ranged', 'costly'], groups: ['big-mom-pirates'] },
  { id: 'marco', name: 'Marco', series: 'ONE_PIECE', power: 87, speed: 88, resistance: 94, tags: ['regen', 'fast'], groups: ['whitebeard-pirates'] },
  { id: 'yamato', name: 'Yamato', series: 'ONE_PIECE', power: 91, speed: 89, resistance: 92, tags: ['fast', 'costly'], groups: ['kozuki-clan'] },
  { id: 'eustass-kid', name: 'Eustass Kid', series: 'ONE_PIECE', power: 89, speed: 73, resistance: 88, tags: ['ranged', 'costly'], groups: ['worst-generation', 'kid-pirates'] },
  { id: 'killer', name: 'Killer', series: 'ONE_PIECE', power: 81, speed: 90, resistance: 77, tags: ['fast'], groups: ['worst-generation', 'kid-pirates'] },
  { id: 'king', name: 'King', series: 'ONE_PIECE', power: 92, speed: 89, resistance: 96, tags: ['fast', 'ranged', 'costly'], groups: ['beasts-pirates'] },
  { id: 'queen', name: 'Queen', series: 'ONE_PIECE', power: 84, speed: 62, resistance: 95, tags: ['regen', 'ranged'], groups: ['beasts-pirates'] },
  { id: 'whitebeard', name: 'Edward Newgate', series: 'ONE_PIECE', power: 100, speed: 68, resistance: 100, tags: ['costly'], groups: ['whitebeard-pirates', 'four-emperors'] },
  { id: 'naruto', name: 'Naruto Uzumaki', series: 'NARUTO', power: 94, speed: 91, resistance: 93, tags: ['fast', 'regen', 'costly'], groups: ['team-7', 'uzumaki'] },
  { id: 'sasuke', name: 'Sasuke Uchiha', series: 'NARUTO', power: 93, speed: 94, resistance: 82, tags: ['fast', 'space', 'costly'], groups: ['team-7', 'uchiha'] },
  { id: 'sakura', name: 'Sakura Haruno', series: 'NARUTO', power: 80, speed: 75, resistance: 85, tags: ['regen'], groups: ['team-7'] },
  { id: 'kakashi', name: 'Kakashi Hatake', series: 'NARUTO', power: 86, speed: 88, resistance: 78, tags: ['fast', 'mage'], groups: ['team-7'] },
  { id: 'itachi', name: 'Itachi Uchiha', series: 'NARUTO', power: 90, speed: 89, resistance: 76, tags: ['mage', 'ranged'], groups: ['uchiha'] },
  { id: 'madara', name: 'Madara Uchiha', series: 'NARUTO', power: 98, speed: 89, resistance: 96, tags: ['mage', 'ranged', 'costly'], groups: ['uchiha'] },
  { id: 'hinata', name: 'Hinata Hyuga', series: 'NARUTO', power: 74, speed: 82, resistance: 73, tags: ['fast'], groups: ['hyuga'] },
  { id: 'gaara', name: 'Gaara', series: 'NARUTO', power: 88, speed: 69, resistance: 94, tags: ['ranged', 'mage'], groups: ['sand-siblings'] },
  { id: 'shikamaru', name: 'Shikamaru Nara', series: 'NARUTO', power: 72, speed: 74, resistance: 68, tags: ['mage', 'ranged'], groups: ['team-asuma'] },
  { id: 'jiraiya', name: 'Jiraiya', series: 'NARUTO', power: 87, speed: 78, resistance: 89, tags: ['mage', 'regen'], groups: ['legendary-sannin'] },
  { id: 'tsunade', name: 'Tsunade', series: 'NARUTO', power: 91, speed: 70, resistance: 96, tags: ['regen'], groups: ['legendary-sannin'] },
  { id: 'obito', name: 'Obito Uchiha', series: 'NARUTO', power: 94, speed: 91, resistance: 89, tags: ['space', 'fast', 'costly'], groups: ['uchiha', 'akatsuki'] },
  { id: 'pain', name: 'Pain', series: 'NARUTO', power: 96, speed: 80, resistance: 91, tags: ['ranged', 'mage', 'costly'], groups: ['akatsuki'] },
  { id: 'minato', name: 'Minato Namikaze', series: 'NARUTO', power: 92, speed: 100, resistance: 82, tags: ['fast', 'space', 'costly'], groups: ['hokage', 'uzumaki'] },
  { id: 'hashirama', name: 'Hashirama Senju', series: 'NARUTO', power: 97, speed: 78, resistance: 98, tags: ['regen', 'mage', 'costly'], groups: ['hokage'] },
  { id: 'might-guy', name: 'Might Guy', series: 'NARUTO', power: 96, speed: 100, resistance: 75, tags: ['fast', 'costly'], groups: ['team-guy'] },
  { id: 'deidara', name: 'Deidara', series: 'NARUTO', power: 83, speed: 82, resistance: 72, tags: ['ranged', 'mage'], groups: ['akatsuki'] },
  { id: 'killer-bee', name: 'Killer B', series: 'NARUTO', power: 89, speed: 87, resistance: 91, tags: ['fast', 'regen'], groups: ['jinchuriki'] },
  { id: 'asta', name: 'Asta', series: 'BLACK_CLOVER', power: 89, speed: 91, resistance: 92, tags: ['antimagic', 'devil-bane', 'fast', 'costly'], groups: ['black-bulls'] },
  { id: 'yuno', name: 'Yuno', series: 'BLACK_CLOVER', power: 91, speed: 95, resistance: 80, tags: ['devil-bane', 'mage', 'fast', 'ranged'], groups: ['golden-dawn'] },
  { id: 'julius', name: 'Julius Novachrono', series: 'BLACK_CLOVER', power: 93, speed: 88, resistance: 79, tags: ['time', 'mage', 'costly'], groups: ['magic-knights'] },
  { id: 'zenon', name: 'Zenon Zogratis', series: 'BLACK_CLOVER', power: 90, speed: 83, resistance: 88, tags: ['space', 'devil', 'mage'], groups: ['dark-triad'] },
  { id: 'dante', name: 'Dante Zogratis', series: 'BLACK_CLOVER', power: 92, speed: 78, resistance: 94, tags: ['regen', 'devil', 'mage'], groups: ['dark-triad'] },
  { id: 'lucifero', name: 'Lucifero', series: 'BLACK_CLOVER', power: 100, speed: 86, resistance: 100, tags: ['devil', 'costly'], groups: ['devils'] },
  { id: 'noelle', name: 'Noelle Silva', series: 'BLACK_CLOVER', power: 88, speed: 84, resistance: 85, tags: ['mage', 'ranged'], groups: ['black-bulls', 'silva-family'] },
  { id: 'yami', name: 'Yami Sukehiro', series: 'BLACK_CLOVER', power: 94, speed: 82, resistance: 97, tags: ['mage', 'costly'], groups: ['black-bulls', 'captains'] },
  { id: 'nacht', name: 'Nacht Faust', series: 'BLACK_CLOVER', power: 88, speed: 95, resistance: 78, tags: ['devil', 'fast', 'mage'], groups: ['black-bulls'] },
  { id: 'mereoleona', name: 'Mereoleona Vermillion', series: 'BLACK_CLOVER', power: 96, speed: 91, resistance: 93, tags: ['fast', 'mage', 'costly'], groups: ['captains', 'vermillion-family'] },
  { id: 'fuegoleon', name: 'Fuegoleon Vermillion', series: 'BLACK_CLOVER', power: 91, speed: 80, resistance: 89, tags: ['mage', 'ranged'], groups: ['captains', 'vermillion-family'] },
  { id: 'william', name: 'William Vangeance', series: 'BLACK_CLOVER', power: 89, speed: 75, resistance: 87, tags: ['mage', 'regen'], groups: ['captains', 'golden-dawn'] },
  { id: 'luck', name: 'Luck Voltia', series: 'BLACK_CLOVER', power: 81, speed: 97, resistance: 78, tags: ['fast', 'mage'], groups: ['black-bulls'] },
  { id: 'magna', name: 'Magna Swing', series: 'BLACK_CLOVER', power: 76, speed: 74, resistance: 79, tags: ['ranged'], groups: ['black-bulls'] },
  { id: 'vanessa', name: 'Vanessa Enoteca', series: 'BLACK_CLOVER', power: 78, speed: 78, resistance: 73, tags: ['mage', 'regen'], groups: ['black-bulls'] },
  { id: 'gauche', name: 'Gauche Adlai', series: 'BLACK_CLOVER', power: 79, speed: 77, resistance: 75, tags: ['mage', 'ranged'], groups: ['black-bulls'] },
  { id: 'charmy', name: 'Charmy Pappitson', series: 'BLACK_CLOVER', power: 83, speed: 72, resistance: 91, tags: ['regen', 'mage'], groups: ['black-bulls'] },
  { id: 'liebe', name: 'Liebe', series: 'BLACK_CLOVER', power: 86, speed: 89, resistance: 87, tags: ['antimagic', 'devil-bane', 'devil'], groups: ['devils'] }
] as const;
