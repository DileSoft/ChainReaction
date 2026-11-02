import type { BuildingId, ResourceId } from './data';

/**
 * Векторные иконки зданий и ресурсов.
 * Один язык для canvas и DOM: чёткие силуэты, читаемые в 20 px.
 */

const wrap = (body: string, size: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">${body}</svg>`;

const ORE = '#c07a3a';
const INGOT = '#a9b7c6';
const PLATE = '#4fd1c5';
const GEAR = '#f0b429';
const FRAME = '#8b7dff';
const MODULE = '#ff5d8f';
const SPARK = '#ffd166';
const STEEL = '#8fa3b3';
const DARK = '#0d161e';

/* ---------------------------------------------------------------- */
/* ресурсы                                                           */
/* ---------------------------------------------------------------- */

const GEAR_TEETH = `
<g fill="${GEAR}">
  <rect x="10.7" y="1.4" width="2.6" height="4.6" rx="0.8"/>
  <rect x="10.7" y="1.4" width="2.6" height="4.6" rx="0.8" transform="rotate(45 12 12)"/>
  <rect x="10.7" y="1.4" width="2.6" height="4.6" rx="0.8" transform="rotate(90 12 12)"/>
  <rect x="10.7" y="1.4" width="2.6" height="4.6" rx="0.8" transform="rotate(135 12 12)"/>
  <rect x="10.7" y="1.4" width="2.6" height="4.6" rx="0.8" transform="rotate(180 12 12)"/>
  <rect x="10.7" y="1.4" width="2.6" height="4.6" rx="0.8" transform="rotate(225 12 12)"/>
  <rect x="10.7" y="1.4" width="2.6" height="4.6" rx="0.8" transform="rotate(270 12 12)"/>
  <rect x="10.7" y="1.4" width="2.6" height="4.6" rx="0.8" transform="rotate(315 12 12)"/>
</g>`;

const RESOURCE_BODY: Readonly<Record<ResourceId, string>> = {
  ore: `
    <path d="M3.6 14.4 L7.8 6.2 L14.6 4.4 L20.6 10.6 L18.4 19.4 L8.8 20.4 Z" fill="${ORE}"/>
    <path d="M7.8 6.2 L12 11.6 L18.4 19.4 M12 11.6 L8.8 20.4" stroke="#e0a066" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M12 11.6 L14.6 4.4" stroke="#e0a066" stroke-width="1.3" stroke-linejoin="round"/>`,
  ingot: `
    <path d="M4.4 14.6 h13.2 l2.4 6.2 H2 Z" fill="${INGOT}"/>
    <path d="M7 14.6 h9 l-1.2-3.6 H8.4 Z" fill="#cfd8e3"/>
    <path d="M2 20.8 h18.2" stroke="#6f8290" stroke-width="1.4" stroke-linecap="round"/>`,
  plate: `
    <rect x="2.6" y="7.4" width="18.8" height="9.2" rx="1.2" fill="${PLATE}"/>
    <rect x="2.6" y="7.4" width="18.8" height="3.2" rx="1.2" fill="#8de8de"/>
    <path d="M5.4 13.6 h6" stroke="#1c6f68" stroke-width="1.4" stroke-linecap="round"/>`,
  gear: `${GEAR_TEETH}
    <circle cx="12" cy="12" r="6.6" fill="${GEAR}"/>
    <circle cx="12" cy="12" r="2.9" fill="${DARK}"/>`,
  frame: `
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.2" stroke="${FRAME}" stroke-width="3.4"/>
    <rect x="7.6" y="7.6" width="8.8" height="8.8" rx="1.2" stroke="${FRAME}" stroke-width="1.6" opacity="0.55"/>`,
  module: `
    <path d="M9 1.4 v3.2 M12 1.4 v3.2 M15 1.4 v3.2 M9 19.4 v3.2 M12 19.4 v3.2 M15 19.4 v3.2" stroke="${MODULE}" stroke-width="2" stroke-linecap="round"/>
    <rect x="3.6" y="4" width="16.8" height="16" rx="2.6" fill="${MODULE}"/>
    <rect x="8.4" y="8.8" width="7.2" height="6.4" rx="1.2" fill="#2a0f1b"/>`,
};

/* ---------------------------------------------------------------- */
/* здания                                                            */
/* ---------------------------------------------------------------- */

/** «Приёмка»: монета с силуэтом ресурса внутри. */
const buyer = (accent: string, resource: ResourceId): string => `
  <circle cx="12" cy="12" r="10" fill="${DARK}"/>
  <circle cx="12" cy="12" r="9" stroke="${accent}" stroke-width="2.2"/>
  <g transform="translate(5.3 5.6) scale(0.56)">${RESOURCE_BODY[resource]}</g>`;

const BUILDING_BODY: Readonly<Record<BuildingId, string>> = {
  mine: `
    <path d="M4.4 19.6 L14.2 9.4" stroke="#e8f0f7" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M6.8 6.6 C 10.8 3.8, 16.6 4.4, 20.4 8.6 C 16.6 7.4, 12.6 7.9, 9.8 9.9"
      stroke="${ORE}" stroke-width="2.8" stroke-linecap="round"/>`,
  smelter: `
    <path d="M5.4 21 V11.8 l3.4 2.4 v-2.4 l3.4 2.4 v-2.4 l3.4 2.4 v-2.4 l3 2.1 V21 Z" fill="#e2603a"/>
    <path d="M12 3.2 c1.9 2.2 2.6 3.1 2.6 4.4 a2.6 2.6 0 0 1-5.2 0 c0-1.3.7-2.2 2.6-4.4z" fill="${SPARK}"/>
    <circle cx="12" cy="17.4" r="1.5" fill="${SPARK}"/>`,
  press: `
    <rect x="3.4" y="2.6" width="17.2" height="3.6" rx="1.2" fill="${STEEL}"/>
    <rect x="10.2" y="6.2" width="3.6" height="5.4" fill="${PLATE}"/>
    <rect x="6" y="11.6" width="12" height="4" rx="1.2" fill="${PLATE}"/>
    <rect x="7.4" y="16.2" width="9.2" height="2" rx="0.6" fill="#dfe9f1"/>
    <rect x="3.4" y="18.6" width="17.2" height="3" rx="1.2" fill="${STEEL}"/>`,
  cutter: `
    <path d="M2.4 14.8 h8.2 M13.4 14.8 h8.2" stroke="${PLATE}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M9.6 2.4 h5.2 L9.6 13.2 Z" fill="${GEAR}"/>
    <path d="M16.6 6.2 l1.4 3.4 M19.8 9.4 l-3.4 1.2 M17 11.8 l2 .6"
      stroke="${SPARK}" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="2.4" y="18.8" width="19.2" height="2.6" rx="1.3" fill="${STEEL}" opacity="0.45"/>`,
  welder: `
    <path d="M4 20.4 L10.6 13.8" stroke="${FRAME}" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="14.6" cy="9.4" r="2.7" fill="${SPARK}"/>
    <path d="M14.6 2.6 v3.2 M14.6 13 v3.2 M7.8 9.4 h3.2 M18.2 9.4 h3.2 M9.8 4.6l2.2 2.2 M19.4 14.2l-2.2-2.2 M19.4 4.6l-2.2 2.2 M9.8 14.2l2.2-2.2"
      stroke="${SPARK}" stroke-width="1.8" stroke-linecap="round"/>`,
  assembler: `
    <rect x="2.8" y="3.6" width="7.6" height="7.6" rx="1.6" fill="${MODULE}"/>
    <rect x="13.6" y="3.6" width="7.6" height="7.6" rx="1.6" fill="${MODULE}" opacity="0.75"/>
    <rect x="8.2" y="13.4" width="7.6" height="7.6" rx="1.6" fill="${MODULE}"/>
    <path d="M12 11.4 v1.6" stroke="#ffd0e0" stroke-width="1.8" stroke-linecap="round"/>`,
  crusher: `
    <path d="M4.4 10.2 A8.2 8.2 0 0 1 19.2 8.4" stroke="#48c9b0" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M19.8 4.4 L20.4 9.8 L15 9.2 Z" fill="#48c9b0"/>
    <path d="M19.6 13.8 A8.2 8.2 0 0 1 4.8 15.6" stroke="#48c9b0" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M4.2 19.6 L3.6 14.2 L9 14.8 Z" fill="#48c9b0"/>`,
  orebuyer: buyer('#e0b34a', 'ore'),
  scrapbuyer: buyer(INGOT, 'ingot'),
  gearbuyer: buyer(GEAR, 'gear'),
  framebuyer: buyer(FRAME, 'frame'),
  warehouse: `
    <rect x="2.8" y="12.8" width="8.4" height="8.4" rx="1.4" fill="#5aa9e6"/>
    <rect x="12.8" y="12.8" width="8.4" height="8.4" rx="1.4" fill="#5aa9e6"/>
    <rect x="7.8" y="3.4" width="8.4" height="8.4" rx="1.4" fill="#8cc7f2"/>
    <path d="M7.8 7.6 h8.4" stroke="#0d161e" stroke-width="1.4" opacity="0.25"/>`,
  port: `
    <rect x="9.6" y="4.6" width="5" height="9" rx="0.8" fill="#7fe0a8"/>
    <rect x="4.2" y="7.4" width="4.6" height="6.2" rx="0.8" fill="#7fe0a8" opacity="0.8"/>
    <path d="M2.4 14.4 h19.2 l-2.6 6.2 H5 Z" fill="#2ecc71"/>
    <path d="M2.6 12.4 c1.6 1.1 2.6 1.1 4.2 0 c1.6 1.1 2.6 1.1 4.2 0"
      stroke="#2ecc71" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>`,
};

/* ---------------------------------------------------------------- */
/* публичное API                                                     */
/* ---------------------------------------------------------------- */

export function resourceIcon(id: ResourceId, size = 16): string {
  return wrap(RESOURCE_BODY[id], size);
}

export function buildingIcon(id: BuildingId, size = 28): string {
  return wrap(BUILDING_BODY[id], size);
}

/** data-URL для отрисовки иконки на canvas. */
export function iconDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
