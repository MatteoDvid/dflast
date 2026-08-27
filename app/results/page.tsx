'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { generateChecklistPDF } from '@/lib/pdf-generator';
import { config } from '@/lib/config';
import {
  INDISPENSABLES,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '@/lib/constants';

type ProductItem = {
  label: string;
  asin: string;
  marketplace: string;
  price?: string;
  originalPrice?: string;
  image?: string;
  imageUrl?: string;
  description?: string;
  availability?: string;
  inStock?: boolean;
  category?: string;
  mustHave?: boolean;
};

type TripSummary = {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  adults: number;
  children: number;
  animals?: number;
  activities?: string[];
};

function groupByCategory(products: ProductItem[]): { category: string; items: ProductItem[] }[] {
  const map = new Map<string, ProductItem[]>();
  for (const p of products) {
    const cat = p.category || 'autre';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  const ordered: { category: string; items: ProductItem[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) ordered.push({ category: cat, items: map.get(cat)! });
  }
  for (const [cat, items] of map) {
    if (!(CATEGORY_ORDER as readonly string[]).includes(cat)) {
      ordered.push({ category: cat, items });
    }
  }
  return ordered;
}

function ProductCard({
  product,
  isPlanned,
  onTogglePlanned,
}: {
  product: ProductItem;
  isPlanned: boolean;
  onTogglePlanned: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex gap-4">
      <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.label}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
            {CATEGORY_ICONS[product.category ?? ''] ?? '📦'}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
            {product.label}
          </h3>
          {product.mustHave ? (
            <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
              Essentiel
            </span>
          ) : (
            <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              Recommandé IA
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href={`/api/affiliate/${product.asin}?marketplace=${product.marketplace}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full shadow-sm hover:shadow-md hover:brightness-105 active:scale-95 transition-all"
            style={{ backgroundColor: '#FF9900', color: '#1a1a1a' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Voir sur Amazon
          </a>
          <button
            onClick={onTogglePlanned}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: isPlanned ? '#099142' : '#e5e7eb',
              color: isPlanned ? '#fff' : '#374151',
            }}
          >
            {isPlanned ? 'Prévu ✓' : 'Pas prévu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// tripSummary.startDate est déjà formaté "JJ/MM/AAAA" : new Date() dessus
// renvoie "Invalid Date", d'où le parsing explicite.
function formatMonthYear(ddmmyyyy: string): string {
  const [d, m, y] = String(ddmmyyyy || '').split('/').map(Number);
  if (!d || !m || !y) return '';
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function ResultsPage() {
  const [tripSummary, setTripSummary] = useState<TripSummary>({
    destination: "Marseille",
    startDate: "04/08/2025",
    endDate: "18/08/2025",
    travelers: 3,
    adults: 2,
    children: 1,
    activities: ["Tennis", "Surf", "Via ferrata"]
  });

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [plannedProducts, setPlannedProducts] = useState<Set<string>>(new Set());
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [destinationImage, setDestinationImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [tripRegion, setTripRegion] = useState('');
  const [tripCityRaw, setTripCityRaw] = useState('');
  const [tripCountryCode, setTripCountryCode] = useState('');
  const [checkedIndispensables, setCheckedIndispensables] = useState<Set<string>>(new Set());

  // Charger les données du voyage depuis sessionStorage
  useEffect(() => {
    try {
      const tripDataRaw = sessionStorage.getItem('tripData');
      if (tripDataRaw) {
        const tripData = JSON.parse(tripDataRaw);

        // Formatter les dates
        const formatDate = (dateStr: string) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        };

        setTripSummary({
          destination: (() => {
            const display = tripData.destinationDisplay || '';
            // Évite "Maroc, Maroc" quand ville = pays
            const parts = display.split(',').map((s: string) => s.trim());
            if (parts.length >= 2 && parts[0].toLowerCase() === parts[parts.length - 1].toLowerCase()) {
              return parts[0];
            }
            return display || tripData.destinationCity || getDestinationName(tripData.destinationCountry || tripData.destination) || "Destination";
          })(),
          startDate: formatDate(tripData.dateStart || tripData.startDate),
          endDate: formatDate(tripData.dateEnd || tripData.endDate),
          travelers: tripData.travelers || 1,
          adults: tripData.numAdults || tripData.adults || 1,
          children: tripData.numChildren || tripData.children || 0,
          animals: tripData.numAnimals || tripData.animals || 0,
          activities: (tripData.activities && tripData.activities.length > 0) ? tripData.activities : ["Voyage découverte"]
        });

        // Populate banner state
        setTripRegion(tripData.region || '');
        setTripCityRaw(tripData.destinationCity || '');
        setTripCountryCode(tripData.destinationCountry || tripData.destination || '');
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des données de voyage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tripCountryCode) return;
    if (destinationImage) return;

    setImageLoading(true);
    fetch('/api/destination-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: tripCityRaw || undefined,
        region: tripRegion || undefined,
        countryCode: tripCountryCode,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.url) {
          setImageLoading(false);
          return;
        }
        // Précharge l'image avant de l'afficher pour un fondu propre
        // (évite l'apparition progressive du background).
        const img = new window.Image();
        img.onload = () => {
          setDestinationImage(data.url);
          setImageLoading(false);
        };
        img.onerror = () => setImageLoading(false);
        img.src = data.url;
      })
      .catch((err) => {
        console.error('[results] Failed to load banner:', err);
        setImageLoading(false);
      });
  }, [tripCountryCode, tripCityRaw, tripRegion, destinationImage]);

  // Charger les recommandations depuis l'API
  useEffect(() => {
    const loadRecommendations = async () => {
      if (isLoading) return; // Attendre que les données du voyage soient chargées

      setApiLoading(true);
      try {
        const tripDataRaw = sessionStorage.getItem('tripData');
        if (!tripDataRaw) {
          console.warn('Aucune donnée de voyage trouvée');
          return;
        }

        const tripData = JSON.parse(tripDataRaw);

        let apiProducts: any[];

        // Le wizard a déjà appelé /api/recommend avec le contexte complet
        // (ville, activités, budget) : réutiliser ces résultats au lieu de
        // refaire un appel avec un payload appauvri.
        if (Array.isArray(tripData.products) && tripData.products.length > 0) {
          apiProducts = tripData.products;
        } else {
          // Formatter les âges en array de nombres
          const ages = Array.isArray(tripData.ages)
            ? tripData.ages.filter((age: number) => typeof age === 'number')
            : [30]; // Fallback

          // Formatter les dates en ISO
          const start = (tripData.dateStart || tripData.startDate) ? new Date(tripData.dateStart || tripData.startDate).toISOString() : new Date().toISOString();
          const end = (tripData.dateEnd || tripData.endDate) ? new Date(tripData.dateEnd || tripData.endDate).toISOString() : new Date().toISOString();

          // Payload complet : la ville, les activités et le budget influencent
          // la sélection IA (sinon tous les voyages d'un même pays donnent les
          // mêmes produits).
          const recommendPayload = {
            destinationCountry: tripData.destinationCountry || tripData.destination || 'FR',
            destinationCity: tripData.destinationCity || undefined,
            destinationDisplayName: tripData.destinationDisplayName || tripData.destinationDisplay || undefined,
            marketplaceCountry: 'FR',
            dates: { start, end },
            travelers: tripData.travelers || 1,
            ages: ages.length > 0 ? ages : [30],
            adults: tripData.adults ?? tripData.numAdults ?? undefined,
            children: tripData.children ?? tripData.numChildren ?? undefined,
            animals: tripData.animals ?? tripData.numAnimals ?? 0,
            activities: (Array.isArray(tripData.activities) && tripData.activities.length > 0) ? tripData.activities : undefined,
            budget: tripData.budget || undefined,
          };

          console.log('Envoi de la requête:', recommendPayload);

          // Appel à l'API de recommandation
          const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recommendPayload)
          });

          if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
          }

          apiProducts = await response.json();
        }

        // Transformer les données API vers notre format
        const transformedProducts: ProductItem[] = apiProducts.map((product: any, index: number) => ({
          label: product.label || 'Produit sans nom',
          asin: product.asin || `unknown-${index}`,
          marketplace: product.marketplace || 'FR',
          imageUrl: product.imageUrl,
          price: undefined,
          originalPrice: undefined,
          description: `Recommandé pour votre voyage.`,
          availability: "Voir sur Amazon",
          inStock: true,
          category: product.category,
          mustHave: product.mustHave,
        }));

        setProducts(transformedProducts.slice(0, 24));

      } catch (error) {
        console.error('Erreur lors du chargement des recommandations:', error);
        // En cas d'erreur, garder des produits mock
        setProducts([
          {
            label: "Produit de voyage recommandé",
            asin: "B000000001",
            marketplace: "FR",
            price: "24,99€",
            originalPrice: "29,99€",
            description: "Erreur lors du chargement des données. Veuillez réessayer.",
            availability: "Livré en 48h ⚡",
            inStock: true
          }
        ]);
      } finally {
        setApiLoading(false);
      }
    };

    loadRecommendations();
  }, [isLoading, tripSummary.destination]);

  // Convertir code pays en nom
  function getDestinationName(countryCode: string): string {
    const countries: Record<string, string> = {
      'FR': 'France',
      'IS': 'Islande',
      'TH': 'Thaïlande',
      'MA': 'Maroc',
      'BR': 'Brésil',
      'US': 'États-Unis'
    };
    return countries[countryCode] || countryCode;
  }

  // Basculer l'état "prévu" d'un produit
  const toggleProductPlanned = (asin: string) => {
    setPlannedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(asin)) {
        newSet.delete(asin);
      } else {
        newSet.add(asin);
      }
      return newSet;
    });
  };

  // Télécharger la checklist en PDF
  const downloadChecklist = async () => {
    try {
      // Préparer les données pour le PDF
      const pdfData = {
        destination: tripSummary.destination,
        startDate: tripSummary.startDate,
        endDate: tripSummary.endDate,
        adults: tripSummary.adults,
        children: tripSummary.children,
        animals: tripSummary.animals,
        activities: tripSummary.activities,
        products: products.map(product => ({
          label: product.label,
          asin: product.asin,
          isPlanned: plannedProducts.has(product.asin),
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          mustHave: product.mustHave,
        })),
        affiliateTag: config.amazonAffiliateTag,
        bannerImageUrl: destinationImage ?? undefined,
        checkedIndispensables: Array.from(checkedIndispensables),
      };

      // Générer et télécharger le PDF
      await generateChecklistPDF(pdfData);

      // Feedback UI (from HEAD)
      setShowCopyMessage(true);
      setTimeout(() => setShowCopyMessage(false), 2000);

    } catch (err) {
      console.error('Erreur lors de la génération du PDF:', err);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    }
  };

  // Spinner de chargement global
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Chargement de vos résultats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">

        {/* AI Destination Banner */}
        <style>{`
          @keyframes df-banner-fade {
            from { opacity: 0; transform: scale(1.03); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes df-banner-sheen {
            from { transform: translateX(-100%) skewX(-12deg); }
            to { transform: translateX(250%) skewX(-12deg); }
          }
        `}</style>
        <div className="mb-6 sm:mb-10 rounded-3xl overflow-hidden relative flex items-end min-h-[280px] sm:min-h-[380px]">
          {/* Placeholder : gradient animé pendant (et avant) la génération */}
          {!destinationImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 overflow-hidden">
              {imageLoading && (
                <div
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  style={{ animation: 'df-banner-sheen 2.2s ease-in-out infinite' }}
                />
              )}
            </div>
          )}

          {/* Image générée (préchargée, apparition en fondu) */}
          {destinationImage && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url('${destinationImage}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                animation: 'df-banner-fade 0.8s ease both',
              }}
            />
          )}

          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Indicateur de génération */}
          {imageLoading && !destinationImage && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1.5">
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span className="text-white/90 text-xs font-medium">
                ✨ Création de votre visuel de voyage…
              </span>
            </div>
          )}

          {/* Text */}
          <div className="relative z-10 p-6 sm:p-10 w-full">
            <p className="text-white/70 text-xs sm:text-sm uppercase tracking-widest font-medium mb-2">
              Votre voyage
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-white drop-shadow-lg leading-tight">
              {tripSummary.destination}
            </h1>
            <p className="text-white/80 text-base sm:text-lg mt-2 font-medium">
              {tripSummary.startDate && tripSummary.endDate
                ? `${tripSummary.startDate} → ${tripSummary.endDate}`
                : 'Préparez votre aventure'}
            </p>
          </div>
        </div>
        {/* END AI Destination Banner */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
          {/* Sidebar - Récapitulatif du voyage (From Upstream) */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl p-4 sm:p-6 lg:sticky lg:top-8" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="mb-4">
                <div className="text-sm text-gray-300 mb-1 flex items-center gap-2">
                  {tripSummary.destination} {formatMonthYear(tripSummary.startDate)}
                  <span>✏️</span>
                </div>
                <h2 className="text-xl font-bold text-white">Récapitulatif de votre voyage</h2>
              </div>

              <div className="space-y-4 text-white">
                <div>
                  <span className="text-sm text-gray-300">Destination : </span>
                  <span className="font-medium">{tripSummary.destination}</span>
                </div>

                <div>
                  <span className="text-sm text-gray-300">Dates : </span>
                  <span className="font-medium">{tripSummary.startDate} - {tripSummary.endDate}</span>
                </div>

                <div>
                  <div className="text-sm text-gray-300">Voyageurs :</div>
                  <div className="font-medium">
                    {tripSummary.adults} adulte{tripSummary.adults > 1 ? 's' : ''}
                    {tripSummary.children > 0 && `, ${tripSummary.children} enfant${tripSummary.children > 1 ? 's' : ''}`}
                    {(tripSummary.animals ?? 0) > 0 && `, ${tripSummary.animals} animal${(tripSummary.animals ?? 0) > 1 ? 'aux' : ''}`}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-300">Vos activités :</div>
                  <div className="font-medium">{tripSummary.activities?.join(', ').toLowerCase()}</div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2">
                <a
                  href="/voyage"
                  className="flex-1 bg-white hover:bg-gray-100 text-gray-900 text-xs font-medium transition-colors flex items-center justify-center"
                  style={{
                    height: '39.41px',
                    borderRadius: '35.29px',
                    border: '0.82px solid transparent',
                    paddingTop: '8.21px',
                    paddingBottom: '8.21px',
                    paddingLeft: '18.88px',
                    paddingRight: '20.52px'
                  }}
                >
                  <span className="hidden sm:inline">Modifier le voyage</span>
                  <span className="sm:hidden">Modifier</span>
                </a>
                <button
                  onClick={downloadChecklist}
                  className="flex-1 text-white text-xs font-medium transition-colors flex items-center justify-center hover:opacity-90"
                  style={{
                    backgroundColor: '#1a1a1a',
                    height: '39.41px',
                    borderRadius: '35.29px',
                    border: '0.82px solid transparent',
                    paddingTop: '8.21px',
                    paddingBottom: '8.21px',
                    paddingLeft: '18.88px',
                    paddingRight: '20.52px'
                  }}
                >
                  <span className="hidden sm:inline">Télécharger la checklist</span>
                  <span className="sm:hidden">Télécharger PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Résultats */}
          <div className="lg:col-span-8">

            {/* Section Indispensables */}
            <div className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
              <h2 className="font-bold text-gray-900 text-base mb-4">
                ✈️ Indispensables pour tout voyage
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INDISPENSABLES.map((item) => {
                  const checked = checkedIndispensables.has(item.label);
                  return (
                    <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setCheckedIndispensables((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.label)) next.delete(item.label);
                            else next.add(item.label);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded accent-green-600 cursor-pointer"
                      />
                      <span
                        className={`text-sm transition-colors ${
                          checked ? 'line-through text-gray-400' : 'text-gray-700 group-hover:text-gray-900'
                        }`}
                      >
                        {item.icon} {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Loading */}
            {apiLoading && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
                <p className="text-gray-600">Génération de vos recommandations personnalisées...</p>
              </div>
            )}

            {/* Vide */}
            {!apiLoading && products.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">Aucune recommandation trouvée pour ce voyage.</p>
              </div>
            )}

            {/* Produits groupés par catégorie */}
            {!apiLoading && groupByCategory(products).map(({ category, items }) => (
              <div key={category} className="mb-6">
                <h2 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                  <span>{CATEGORY_ICONS[category] ?? '📦'}</span>
                  <span>{CATEGORY_LABELS[category] ?? category}</span>
                  <span className="text-gray-400 text-sm font-normal">({items.length})</span>
                </h2>
                <div className="space-y-3">
                  {items.map((product) => (
                    <ProductCard
                      key={product.asin}
                      product={product}
                      isPlanned={plannedProducts.has(product.asin)}
                      onTogglePlanned={() => toggleProductPlanned(product.asin)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Message de confirmation téléchargement */}
      {showCopyMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>✅</span>
          <span>Checklist PDF téléchargée avec succès !</span>
        </div>
      )}
    </div>
  );
}
