'use client';

import React from 'react';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo à gauche */}
        <div className="flex-shrink: 0">
          <div className="w-90 h-90 rounded-full bg-transparent backdrop-blur-sm flex items-center justify-center overflow-hidden">
            <Image
              src="/images/logodf.avif"
              alt="Don't Forget Logo"
              width={80}
              height={80}
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>

        {/* Navigation centrée */}
        <nav className="flex-1 flex justify-center">
          <div className="glass-card-dark border border-white/15 rounded-3xl px-12 py-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-center space-x-10">
              <a
                href="#fonctionnement"
                className="text-white font-medium hover:text-white/80 transition-colors text-sm"
              >
                Fonctionnement
              </a>
              <a
                href="#avantages"
                className="text-white font-medium hover:text-white/80 transition-colors text-sm"
              >
                Avantages
              </a>
              <a
                href="#donnees"
                className="text-white font-medium hover:text-white/80 transition-colors text-sm"
              >
                Vos données
              </a>
              <a
                href="#faq"
                className="text-white font-medium hover:text-white/80 transition-colors text-sm"
              >
                FAQ
              </a>
              <a
                href="#avis"
                className="text-white font-medium hover:text-white/80 transition-colors text-sm"
              >
                Avis
              </a>
            </div>
          </div>
        </nav>

        {/* Espaceur à droite pour équilibrer */}
        <div className="flex-shrink-0 w-10">
        </div>
      </div>
    </header>
  );
}