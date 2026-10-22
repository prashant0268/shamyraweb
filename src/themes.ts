/**
 * Storefront themes. Colors and type live in `src/index.css` under `[data-theme="…"]`;
 * this file is the catalogue the admin picker and the font loader read from.
 * Every theme redefines the same tokens (bg, surface, ink, pine = primary, honey = accent…),
 * so components never need to know which theme is active.
 */
export type ThemeId = 'hearth' | 'atelier' | 'noir' | 'sunroom' | 'apothecary';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  /** Who it borrows from, for the admin card. */
  inspiredBy: string;
  fonts: { display: string; body: string; href: string };
  /** Four swatches for the admin card: background, primary, accent, ink. */
  swatches: [string, string, string, string];
  /** Hero image key from `src/data/imagery.ts`; each theme leads with a photo that suits its mood. */
  heroImage: 'heroWarm' | 'heroMinimal' | 'heroDark' | 'heroBright' | 'heroBotanical';
}

const gf = (families: string[]) => `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;

export const THEMES: ThemeMeta[] = [
  {
    id: 'hearth', name: 'Hearth', tagline: 'Warm cream, pine and honey',
    description: 'The current Kind Flames look, refined: cream paper, deep pine, honey-gold accents, soft rounded corners.',
    inspiredBy: 'Brooklyn Candle Studio, Antique Candle Co.',
    fonts: { display: 'Fraunces', body: 'Karla', href: gf(['Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700', 'Karla:wght@400;500;700']) },
    swatches: ['#F3F1EC', '#214238', '#C68A1E', '#1E231D'], heroImage: 'heroWarm',
  },
  {
    id: 'atelier', name: 'Atelier', tagline: 'Gallery white, black type, sharp edges',
    description: 'Quiet and editorial. White space, a classical serif, uppercase tracked labels and square black buttons.',
    inspiredBy: 'Diptyque, Boy Smells',
    fonts: { display: 'Cormorant Garamond', body: 'Inter', href: gf(['Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500', 'Inter:wght@400;500;600']) },
    swatches: ['#FFFFFF', '#141414', '#141414', '#141414'], heroImage: 'heroMinimal',
  },
  {
    id: 'noir', name: 'Noir', tagline: 'Candlelit dark with gold',
    description: 'Evening mode. Near-black backgrounds, cream type, a high-contrast serif and brushed-gold accents.',
    inspiredBy: 'LAFCO, NEST New York',
    fonts: { display: 'Playfair Display', body: 'Jost', href: gf(['Playfair+Display:ital,wght@0,400;0,500;0,600;1,400', 'Jost:wght@400;500;600']) },
    swatches: ['#15130F', '#F3ECDD', '#C9A24E', '#F3ECDD'], heroImage: 'heroDark',
  },
  {
    id: 'sunroom', name: 'Sunroom', tagline: 'Bright, friendly, terracotta and teal',
    description: 'Playful and modern. Warm white, big rounded cards, terracotta buttons, a friendly serif for headlines.',
    inspiredBy: 'Otherland, Homesick, Paddywax',
    fonts: { display: 'DM Serif Display', body: 'DM Sans', href: gf(['DM+Serif+Display:ital@0;1', 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700']) },
    swatches: ['#FBF5EC', '#1F5F5B', '#C9643B', '#2B2320'], heroImage: 'heroBright',
  },
  {
    id: 'apothecary', name: 'Apothecary', tagline: 'Sage, olive and clay',
    description: 'Botanical and clean. Pale sage backgrounds, olive primaries, clay accents, a readable book serif.',
    inspiredBy: 'Brooklyn Candle Studio, Voluspa',
    fonts: { display: 'Lora', body: 'Nunito Sans', href: gf(['Lora:ital,wght@0,400;0,500;0,600;1,400', 'Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700']) },
    swatches: ['#EEF0EA', '#3D4F36', '#B5785A', '#22291F'], heroImage: 'heroBotanical',
  },
];

export const DEFAULT_THEME: ThemeId = 'hearth';
export const isThemeId = (x: unknown): x is ThemeId => typeof x === 'string' && THEMES.some((t) => t.id === x);
export const themeMeta = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0]!;
