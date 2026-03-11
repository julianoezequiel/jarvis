"use client"
import React from 'react'

export default function HexGrid() {
  return (
    <div className="absolute inset-0 -z-10 opacity-20">
      <svg width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <pattern id="hex" width="40" height="34" patternUnits="userSpaceOnUse">
            <rect width="40" height="34" fill="none"></rect>
            <path d="M20 0 L40 10 L40 24 L20 34 L0 24 L0 10 Z" stroke="#08303a" fill="none" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)" />
      </svg>
    </div>
  )
}
