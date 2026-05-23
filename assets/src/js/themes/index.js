import auto from './auto';
import dark from './dark';
import dim from './dim';
import light from './light';
import midnight from './midnight';
import mocha from './mocha';
import macchiato from './macchiato';
import frappe from './frappe';
import tokyonight from './tokyonight';
import gruvbox from './gruvbox';
import everforest from './everforest';
import rosepine from './rosepine';
import forest from './forest';
import ocean from './ocean';
import sage from './sage';
import nord from './nord';
import lavender from './lavender';
import crimson from './crimson';
import sunset from './sunset';
import lsd from './lsd';
import coal from './coal';
import paper from './paper';
import cyberpunk from './cyberpunk';
import sunsetGradient from './sunsetGradient';
import nightskyGradient from './nightskyGradient';
import glass from './glass';

const DEFAULT_IDS = new Set(['dark', 'dim', 'light', 'midnight', 'auto']);

export const THEMES = [
  dim, dark, midnight, light, auto,
  mocha, macchiato, frappe, tokyonight, gruvbox, everforest, rosepine,
  forest, ocean, sage, nord, lavender, crimson, sunset, lsd,
  coal, paper, cyberpunk, sunsetGradient, nightskyGradient, glass,
];

const themeMap = {};
for (const t of THEMES) themeMap[t.id] = t;

export function getThemeById(id) {
  return themeMap[id] || themeMap['dark'];
}

export function getAllThemes() {
  return THEMES;
}

export function getThemeCategory(themeId) {
  return DEFAULT_IDS.has(themeId) ? 'default' : 'color';
}

export function getDefaultThemes() {
  return THEMES.filter(t => DEFAULT_IDS.has(t.id));
}

export function getColorThemes() {
  return THEMES.filter(t => !DEFAULT_IDS.has(t.id));
}