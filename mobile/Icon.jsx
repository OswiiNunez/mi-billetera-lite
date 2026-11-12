import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

// Mismos trazos SVG que usa la versión web.
const PATHS = {
  wallet: 'M4 7V6a2 2 0 0 1 2-2h12v3M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V7Zm16 4h-5v5h5m-3-2.5h.01',
  today: 'M7 3v4m10-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 9h3m-3 3h6',
  receipt: 'M7 4h10v17l-2-1-3 1-3-1-2 1V4Zm3 5h4m-4 4h4M5 4h14',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  search: 'm16 16 4 4',
  empty: 'M5 6h14v14H5V6Zm3-3h8v5H8V3Zm1 9h6m-6 4h4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6',
  chevron: 'm6 9 6 6 6-6',
  Comida: 'M5 3v6m3-6v6M3 6h7M6.5 9v12M17 3c-4 4-4 9 0 9h2V3h-2Zm2 9v9',
  Transporte: 'm5 8 2-5h10l2 5M4 8h16v10H4V8Zm0 6h16M7 18v3m10-3v3M7 11h.01M17 11h.01',
  Servicios: 'm13 2-9 12h7l-1 8 10-13h-7l0-7Z',
  Ocio: 'M7 7h10c3 0 5 9 3 11-1 1-4-2-5-3H9c-1 1-4 4-5 3C2 16 4 7 7 7Zm0 3v4m-2-2h4m6-1h.01m3 2h.01',
  Otros: 'M5 5h4v4H5V5Zm10 0h4v4h-4V5ZM5 15h4v4H5v-4Zm10 0h4v4h-4v-4Z'
};

export function Icon({ name, size = 22, color = '#1c302f' }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {name === 'search' ? <Circle cx="10.5" cy="10.5" r="6.5" /> : null}
    <Path d={PATHS[name]} />
  </Svg>;
}
