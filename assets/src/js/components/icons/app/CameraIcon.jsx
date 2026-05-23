import React from 'react';

export const CameraIcon = (props) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M4 6.5h11a2 2 0 012 2v.5l3.4-2.27a.5.5 0 01.78.42v9.7a.5.5 0 01-.78.42L17 15v.5a2 2 0 01-2 2H4a2 2 0 01-2-2v-7a2 2 0 012-2z" />
  </svg>
);

export const CameraOffIcon = (props) => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M2 8.5v7a2 2 0 002 2h11M8 6h7a2 2 0 012 2v5l3.4-2.27a.5.5 0 01.78.42v3.05" />
  </svg>
);