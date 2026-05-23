import React from 'react';

export default function Logo({ className = 'w-8 h-8', alt = 'Banter' }) {
  return <img src="/media/landing/logo.webp" alt={alt} className={className} draggable={false} />;
}