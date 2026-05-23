import React from 'react';

const SIZES = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-3.5 h-3.5 border-2',
  md: 'w-4 h-4 border-2',
  lg: 'w-5 h-5 border-2',
};

export default function Spinner({ size = 'lg' }) {
  return <div className={`${SIZES[size] || SIZES.lg} border-white/20 border-t-white/80 rounded-full animate-spin`} />;
}