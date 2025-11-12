'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '#fonctionnement', label: 'Fonctionnement' },
    { href: '#avantages', label: 'Avantages' },
    { href: '#donnees', label: 'Vos données' },
    { href: '#faq', label: 'FAQ' },
    { href: '#avis', label: 'Avis' },
  ];

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo à gauche */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-transparent backdrop-blur-sm flex items-center justify-center overflow-hidden">
              <Image
                src="/images/logodf.avif"
                alt="Don't Forget Logo"
                width={80}
                height={80}
                className="w-14 h-14 md:w-16 md:h-16 object-contain"
              />
            </div>
          </div>

          {/* Navigation centrée - cachée sur mobile */}
          <nav className="hidden sm:flex flex-1 justify-center px-2">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl px-3 sm:px-6 md:px-12 py-3 md:py-4 shadow-lg">
              <div className="flex items-center justify-center space-x-3 sm:space-x-4 md:space-x-6 lg:space-x-10">
                <a
                  href="#fonctionnement"
                  className="text-white font-medium hover:text-white/80 transition-colors text-xs sm:text-sm whitespace-nowrap"
                >
                  Fonctionnement
                </a>
                <a
                  href="#avantages"
                  className="text-white font-medium hover:text-white/80 transition-colors text-xs sm:text-sm whitespace-nowrap"
                >
                  Avantages
                </a>
                <a
                  href="#donnees"
                  className="text-white font-medium hover:text-white/80 transition-colors text-xs sm:text-sm whitespace-nowrap hidden md:block"
                >
                  Vos données
                </a>
                <a
                  href="#faq"
                  className="text-white font-medium hover:text-white/80 transition-colors text-xs sm:text-sm"
                >
                  FAQ
                </a>
                <a
                  href="#avis"
                  className="text-white font-medium hover:text-white/80 transition-colors text-xs sm:text-sm hidden lg:block"
                >
                  Avis
                </a>
              </div>
            </div>
          </nav>

          {/* Bouton burger - visible sur mobile uniquement */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden flex-shrink-0 w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center hover:bg-white/15 transition-all"
            aria-label="Menu"
          >
            <div className="flex flex-col items-center justify-center w-6 h-6 space-y-1.5">
              <span
                className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
                  mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              />
            </div>
          </button>

          {/* Espaceur à droite pour équilibrer sur desktop */}
          <div className="flex-shrink-0 w-10 hidden sm:block"></div>
        </div>
      </header>

      {/* Menu mobile overlay */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 sm:hidden ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Menu panel */}
        <div
          className={`absolute top-24 right-4 left-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl transition-all duration-300 ${
            mobileMenuOpen ? 'translate-y-0' : '-translate-y-4'
          }`}
        >
          <nav className="flex flex-col p-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="text-white text-lg font-medium hover:text-white/80 transition-colors py-3 px-4 rounded-2xl hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}