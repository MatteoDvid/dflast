'use client';

import React, { useEffect, useState } from 'react';
import { generateChecklistPDF } from '@/lib/pdf-generator';
import { config } from '@/lib/config';

type ProductItem = {
  label: string;
  asin: string;
  marketplace: string;
  price?: string;
  originalPrice?: string;
  image?: string;
  description?: string;
  availability?: string;
  inStock?: boolean;
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
          destination: tripData.destinationDisplay || tripData.destinationCity || getDestinationName(tripData.destinationCountry || tripData.destination) || "Destination",
          startDate: formatDate(tripData.dateStart || tripData.startDate),
          endDate: formatDate(tripData.dateEnd || tripData.endDate),
          travelers: tripData.travelers || 1,
          adults: tripData.numAdults || tripData.adults || 1,
          children: tripData.numChildren || tripData.children || 0,
          animals: tripData.numAnimals || tripData.animals || 0,
          activities: (tripData.activities && tripData.activities.length > 0) ? tripData.activities : ["Voyage découverte"]
        });
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des données de voyage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch AI Image once destination is set
  useEffect(() => {
    // Fetch AI Image once destination is set
    useEffect(() => {
      const fetchImage = async () => {
        // Feature Flag check
        if (process.env.NEXT_PUBLIC_ENABLE_AI_IMAGES !== 'true') return;

        if (!tripSummary.destination || tripSummary.destination === "Marseille") return;
        if (destinationImage) return; // Already fetched

        setImageLoading(true);
        try {
          const res = await fetch('/api/destination-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: tripSummary.destination,
              // We can try to guess country code if needed, but for now sending just destination is usually enough for DALL-E
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              setDestinationImage(data.url);
            }
          }
        } catch (err) {
          console.error('Failed to load destination image:', err);
        } finally {
          setImageLoading(false);
        }
      };

      fetchImage();
    }, [tripSummary.destination]);

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

          // Formatter les âges en array de nombres
          const ages = Array.isArray(tripData.ages)
            ? tripData.ages.filter((age: number) => typeof age === 'number')
            : [30]; // Fallback

          // Formatter les dates en ISO
          const start = (tripData.dateStart || tripData.startDate) ? new Date(tripData.dateStart || tripData.startDate).toISOString() : new Date().toISOString();
          const end = (tripData.dateEnd || tripData.endDate) ? new Date(tripData.dateEnd || tripData.endDate).toISOString() : new Date().toISOString();

          // Préparer le payload pour l'API recommend
          const recommendPayload = {
            destinationCountry: tripData.destinationCountry || tripData.destination || 'FR',
            marketplaceCountry: 'FR',
            dates: { start, end },
            travelers: tripData.travelers || 1,
            ages: ages
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

          const apiProducts = await response.json();

          // Transformer les données API vers notre format
          const transformedProducts: ProductItem[] = apiProducts.map((product: any, index: number) => ({
            label: product.label || 'Produit sans nom',
            asin: product.asin || `unknown-${index}`,
            marketplace: product.marketplace || 'FR',
            price: undefined, // Sera géré par l'affichage (pas de prix dans l'API recommend)
            originalPrice: undefined,
            description: `Recommandé pour votre voyage.`,
            availability: "Voir sur Amazon",
            inStock: true // Disponible via Amazon
          }));

          setProducts(transformedProducts.slice(0, 10)); // Limiter à 10 produits

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
            price: product.price
          })),
          affiliateTag: config.amazonAffiliateTag
        };

        // Générer et télécharger le PDF
        await generateChecklistPDF(pdfData);

        setShowCopyMessage(true);
        setTimeout(() => setShowCopyMessage(false), 2000);
      } catch (err) {
        console.error('Erreur lors de la génération du PDF:', err);
        alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
      }
    };

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
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Hero Section AI Image */}
          <div className="mb-8 rounded-3xl overflow-hidden relative min-h-[300px] flex items-end">
            {destinationImage ? (
              <div
                className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-700"
                style={{ backgroundImage: `url('${destinationImage}')` }}
              />
            ) : (
              <div className={`absolute inset-0 w-full h-full bg-gradient-to-r from-gray-800 to-gray-900 ${imageLoading ? 'animate-pulse' : ''}`} />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="relative z-10 p-8 w-full">
              <div className="glass-card-dark inline-block px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 mb-4">
                <span className="text-orange-400 font-medium tracking-wider text-sm uppercase">Votre Voyage</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 font-airbnb drop-shadow-lg">
                {tripSummary.destination}
              </h1>
              <p className="text-xl text-gray-200 font-medium drop-shadow-md">
                Préparez-vous pour l'aventure
              </p>
              {imageLoading && (
                <div className="mt-4 flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Génération de votre image exclusive par l'IA...
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar - Récapitulatif du voyage */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl p-6 sticky top-8" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="mb-4">
                  <div className="text-sm text-gray-300 mb-1 flex items-center gap-2">
                    {tripSummary.destination} {tripSummary.startDate && new Date(tripSummary.startDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
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
                      {tripSummary.animals && tripSummary.animals > 0 && `, ${tripSummary.animals} animal${tripSummary.animals > 1 ? 'aux' : ''}`}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-300">Vos activités :</div>
                    <div className="font-medium">{tripSummary.activities?.join(', ').toLowerCase()}</div>
                  </div>
                </div>

                <div className="mt-8 flex gap-2">
                  <a
                    href="/wizard"
                    className="flex-1 bg-white hover:bg-gray-100 text-gray-900 text-xs font-medium transition-colors flex items-center justify-center whitespace-nowrap"
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
                    Modifier le voyage
                  </a>
                  <button
                    onClick={downloadChecklist}
                    className="flex-1 text-white text-xs font-medium transition-colors flex items-center justify-center hover:opacity-90 whitespace-nowrap"
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
                    Télécharger la checklist
                  </button>
                </div>
              </div>
            </div>

            {/* Résultats */}
            <div className="lg:col-span-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Votre checklist personnalisée</h2>
                <p className="text-gray-600">
                  Recommandations personnalisées pour votre voyage à {tripSummary.destination}.
                  Ces produits ont été sélectionnés selon vos activités et votre destination.
                </p>
              </div>

              <div className="mb-4 text-lg font-bold text-gray-900">
                Produits conseillés :
              </div>

              {apiLoading && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                  <p className="text-gray-600">Génération de vos recommandations personnalisées...</p>
                </div>
              )}

              {!apiLoading && products.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">Aucune recommandation trouvée pour ce voyage.</p>
                </div>
              )}

              <div className="space-y-4">
                {!apiLoading && products.map((product, index) => (
                  <div key={product.asin} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex gap-4">
                      {/* Image placeholder */}
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <div className="text-gray-400 text-xs text-center">
                            <div>📦</div>
                            <div className="text-[10px] mt-1">Image à venir</div>
                          </div>
                        </div>
                      </div>

                      {/* Contenu */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                            {product.label}
                          </h3>
                          {product.price && (
                            <div className="text-right ml-4">
                              <div className="font-bold text-gray-900">{product.price}</div>
                              {product.originalPrice && (
                                <div className="text-sm text-gray-500 line-through">{product.originalPrice}</div>
                              )}
                            </div>
                          )}
                        </div>

                        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                          {product.description}
                        </p>

                        <div className="flex items-center gap-4">
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Recommandation IA
                          </div>

                          <div className="flex gap-2 ml-auto">
                            <a
                              href={`/api/affiliate/${product.asin}?marketplace=${product.marketplace}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 flex items-center gap-1"
                              style={{ backgroundColor: '#1a1a1a' }}
                            >
                              Voir plus sur amazon
                              <span className="text-orange-400">a</span>
                            </a>

                            <button
                              onClick={() => toggleProductPlanned(product.asin)}
                              className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
                              style={{
                                backgroundColor: plannedProducts.has(product.asin) ? '#099142' : '#666666'
                              }}
                            >
                              {plannedProducts.has(product.asin) ? 'J\'ai déjà prévu ✓' : 'Je n\'ai pas prévu'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Badge IA pour les produits prioritaires */}
                    {product.description?.includes('mustHave=true') && (
                      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#E8F5E8', border: '1px solid #099142' }}>
                        <div className="font-medium text-sm" style={{ color: '#099142' }}>
                          ⭐ Produit essentiel identifié par l&apos;IA
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
