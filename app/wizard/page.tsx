'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROMPT_VERSION } from '@/lib/constants';
import { PREDEFINED_ACTIVITIES, getActivitySuggestions } from '@/lib/activities';
import Header from '@/components/Header';
import NoSSRWrapper from '@/components/NoSSRWrapper';

type ProductItem = { label: string; asin: string; marketplace: string; explain: string[] };
type ApiResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; items: Array<ProductItem> }
  | { status: 'empty' }
  | { status: 'validation-error'; issues: unknown }
  | { status: 'network-error' };

type TagItem = { id: string; score: number };
type AiMeta = { promptVersion: string; source?: 'openai' | 'fallback' | 'disabled' | 'error'; reason?: string };
type AiResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; tags: TagItem[]; meta?: AiMeta }
  | { status: 'network-error' };

interface GeocodeSuggestion {
  displayName: string;
  city: string;
  countryCode: string;
  countryName: string;
  coordinates: { lat: number; lng: number };
}

// Liste des destinations d'origine avec recherche
const DESTINATIONS = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IS', name: 'Islande', flag: '🇮🇸' },
  { code: 'TH', name: 'Thaïlande', flag: '🇹🇭' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'BR', name: 'Brésil', flag: '🇧🇷' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
];

export default function WizardPage() {
  const router = useRouter();
  const [destinationCountry, setDestinationCountry] = useState('FR');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
  const [destinationInput, setDestinationInput] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeSuggestion | null>(null);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [agesText, setAgesText] = useState('30');
  const [agesInputs, setAgesInputs] = useState<string[]>(['30']);
  const [result, setResult] = useState<ApiResult>({ status: 'idle' });
  const [ai, setAi] = useState<AiResult>({ status: 'idle' });
  const [showAll, setShowAll] = useState(false);
  const [isDatePopupOpen, setIsDatePopupOpen] = useState(false);
  const [tmpStart, setTmpStart] = useState('');
  const [tmpEnd, setTmpEnd] = useState('');
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [numAnimals, setNumAnimals] = useState(0);
  const [isTravelersPopupOpen, setIsTravelersPopupOpen] = useState(false);
  const [isActivitiesPopupOpen, setIsActivitiesPopupOpen] = useState(false);
  const [activitiesData, setActivitiesData] = useState<string[]>([]);
  const [childDefaultAge, setChildDefaultAge] = useState(10);
  const [wantsMoreIdeas, setWantsMoreIdeas] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(false);
  const [selectedDates, setSelectedDates] = useState(false);
  const [selectedTravelers, setSelectedTravelers] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(false);
  const [isBudgetPopupOpen, setIsBudgetPopupOpen] = useState(false);
  const [selectedBudgetRange, setSelectedBudgetRange] = useState('');
  const [currentActivityInput, setCurrentActivityInput] = useState('');
  const [manualActivities, setManualActivities] = useState<string[]>([]);
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false);
  const [filteredActivitySuggestions, setFilteredActivitySuggestions] = useState<string[]>([]);

  // Options de budget
  const budgetOptions = [
    { value: '0-100', label: '0€ - 100€' },
    { value: '100-300', label: '100€ - 300€' },
    { value: '300+', label: '300€ et +' }
  ];

  // Utiliser les activités prédéfinies depuis le fichier externe
  // Note: Dans le popup, on utilise une version échappée pour l'affichage HTML
  const predefinedActivitiesForPopup = PREDEFINED_ACTIVITIES.slice(0, 16).map(activity => 
    activity.replace(/'/g, '&apos;')
  );

  // Fonctions pour gérer les activités
  const toggleActivity = (activity: string) => {
    setActivitiesData(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  // Filtrage des destinations pour l'autocomplétion
  const filteredDestinations = useMemo(() => {
    if (!destinationSearch.trim()) {
      return DESTINATIONS;
    }
    const search = destinationSearch.toLowerCase().trim();
    return DESTINATIONS.filter(dest =>
      dest.name.toLowerCase().includes(search) ||
      dest.code.toLowerCase().includes(search)
    );
  }, [destinationSearch]);

  // Obtenir le nom de la destination sélectionnée
  const getSelectedDestinationName = useCallback(() => {
    const dest = DESTINATIONS.find(d => d.code === destinationCountry);
    return dest ? `${dest.flag} ${dest.name}` : 'Sélectionner une destination';
  }, [destinationCountry]);

  // Hook pour l'autocomplétion avec debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (destinationInput.length >= 2 && !selectedLocation) {
        console.log('Recherche pour:', destinationInput);
        setIsLoadingSuggestions(true);
        try {
          const response = await fetch(`/api/geocode?q=${encodeURIComponent(destinationInput)}`);
          console.log('Response status:', response.status);
          if (response.ok) {
            const data = await response.json();
            console.log('Suggestions reçues:', data.length);
            setSuggestions(data);
          } else {
            console.error('Response not ok:', response.status);
            setSuggestions([]);
          }
        } catch (error) {
          console.error('Erreur geocoding:', error);
          setSuggestions([]);
        }
        setIsLoadingSuggestions(false);
      } else {
        setSuggestions([]);
      }
    }, 300); // Délai de 300ms

    return () => clearTimeout(delayDebounceFn);
  }, [destinationInput, selectedLocation]);

  function extractPriority(explain: string[]): number {
    try {
      const token = (explain || []).find((s) => s.startsWith('priority='));
      if (!token) return Number.POSITIVE_INFINITY;
      const v = Number(token.split('=')[1]);
      return Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }

  function colorForDisplayPriority(dp: number): string {
    if (dp === 1) return 'bg-red-500';
    if (dp === 2) return 'bg-orange-400';
    return 'bg-yellow-300 text-gray-900';
  }

  function computeSeason(countryIso2: string, isoDate?: string): 'winter' | 'spring' | 'summer' | 'autumn' {
    const d = isoDate ? new Date(isoDate) : new Date();
    const month = d.getUTCMonth() + 1; // 1..12
    const south = new Set(['AU', 'NZ', 'ZA', 'AR', 'CL', 'UY', 'PY', 'BO', 'PE', 'BR']);
    const isSouth = south.has((countryIso2 || '').toUpperCase());
    // Northern hemisphere seasons (meteorological)
    let season: 'winter' | 'spring' | 'summer' | 'autumn';
    if ([12, 1, 2].includes(month)) season = 'winter';
    else if ([3, 4, 5].includes(month)) season = 'spring';
    else if ([6, 7, 8].includes(month)) season = 'summer';
    else season = 'autumn';
    if (isSouth) {
      // Invert for southern hemisphere
      if (season === 'winter') season = 'summer';
      else if (season === 'summer') season = 'winter';
      else if (season === 'spring') season = 'autumn';
      else season = 'spring';
    }
    return season;
  }

  const ages = useMemo(
    () =>
      agesInputs
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 120),
    [agesInputs],
  );

  // Garder agesText en phase pour la persistance existante
  useEffect(() => {
    try {
      setAgesText(agesInputs.map((s) => s.trim()).join(','));
    } catch {}
  }, [agesInputs]);

  const onSubmit = useCallback(async () => {
    setResult({ status: 'loading' });
    
    // Préparer toutes les données pour l'API
    const apiData = {
      destinationCountry: destinationCountry,
      destinationCity: selectedLocation?.city || '',
      destinationDisplayName: selectedLocation?.displayName || getSelectedDestinationName(),
      marketplaceCountry: 'FR', // ou détecter automatiquement
      dates: dateStart && dateEnd ? {
        start: new Date(dateStart).toISOString(),
        end: new Date(dateEnd).toISOString()
      } : undefined,
      travelers,
      ages,
      adults: numAdults,
      children: numChildren,
      animals: numAnimals,
      activities: [...manualActivities, ...activitiesData].length > 0 ? [...manualActivities, ...activitiesData] : undefined,
      budget: selectedBudgetRange || undefined
    };

    try {
      // Appeler l'API de recommandation
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      if (response.ok) {
        const products = await response.json();
        
        // Sauvegarder les données pour la page résultats
        const tripData = {
          ...apiData,
          products,
          destination: destinationCountry,
          destinationDisplay: selectedLocation?.displayName || getSelectedDestinationName(),
          startDate: dateStart,
          endDate: dateEnd
        };
        
        sessionStorage.setItem('tripData', JSON.stringify(tripData));
        
        // Rediriger vers la page résultats
        router.push('/results');
      } else {
        console.error('Erreur API:', response.status);
        setResult({ status: 'network-error' });
      }
    } catch (error) {
      console.error('Erreur:', error);
      setResult({ status: 'network-error' });
    }
  }, [router, destinationCountry, selectedLocation, dateStart, dateEnd, travelers, numAdults, numChildren, numAnimals, ages, activitiesData, selectedBudgetRange, getSelectedDestinationName, manualActivities]);

  // Deriver travelers et agesInputs depuis compteurs Adultes/Enfants
  useEffect(() => {
    const total = Math.max(1, Math.min(20, numAdults + numChildren));
    setTravelers(total);
    const adultsAges = Array.from({ length: Math.max(0, Math.min(20, numAdults)) }).map(() => '30');
    const safeChildAge = Math.max(0, Math.min(17, childDefaultAge));
    const childrenAges = Array.from({ length: Math.max(0, Math.min(20, numChildren)) }).map(() => String(safeChildAge));
    const combined = adultsAges.concat(childrenAges).slice(0, 20);
    setAgesInputs(combined.length > 0 ? combined : ['30']);
  }, [numAdults, numChildren, childDefaultAge]);

  // Persist wizardState in localStorage
  useEffect(() => {
    try {
      const state = {
        destinationCountry,
        selectedLocation,
        destinationInput,
        travelers,
        agesText,
        dateStart,
        dateEnd,
        numAdults,
        numChildren,
        childDefaultAge,
      };
      localStorage.setItem('wizardStateV1', JSON.stringify(state));
    } catch {}
  }, [destinationCountry, selectedLocation, destinationInput, travelers, agesText, dateStart, dateEnd, numAdults, numChildren, childDefaultAge]);

  // Load wizardState from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wizardStateV1');
      if (raw) {
        const state = JSON.parse(raw) as Partial<{
          destinationCountry: string;
          selectedLocation: GeocodeSuggestion;
          destinationInput: string;
          travelers: number;
          agesText: string;
          dateStart: string;
          dateEnd: string;
          numAdults: number;
          numChildren: number;
          childDefaultAge: number;
        }>;
        if (state.destinationCountry) setDestinationCountry(state.destinationCountry);
        if (state.selectedLocation && state.destinationInput) {
          setSelectedLocation(state.selectedLocation);
          setDestinationInput(state.destinationInput);
          setSelectedDestination(true);
        }
        if (typeof state.numAdults === 'number') setNumAdults(state.numAdults);
        if (typeof state.numChildren === 'number') setNumChildren(state.numChildren);
        if (typeof state.childDefaultAge === 'number') setChildDefaultAge(state.childDefaultAge);
        if (typeof state.travelers === 'number' && (state.numAdults === undefined || state.numChildren === undefined)) setTravelers(state.travelers);
        if (state.agesText) {
          setAgesText(state.agesText);
          const parsed = state.agesText
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          setAgesInputs(parsed.length > 0 ? parsed : ['30']);
          // Dériver les compteurs si non présents
          if (state.numAdults === undefined || state.numChildren === undefined) {
            try {
              const agesNum = parsed.map((s) => Number(s)).filter((n) => Number.isFinite(n));
              const childCount = agesNum.filter((n) => n < 18).length;
              const adultCount = Math.max(0, agesNum.length - childCount);
              setNumAdults(adultCount > 0 ? adultCount : 1);
              setNumChildren(childCount);
            } catch {}
          }
        }
        if (state.dateStart) setDateStart(state.dateStart);
        if (state.dateEnd) setDateEnd(state.dateEnd);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load query parameters from URL (Webflow integration)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      // Destination
      const destination = params.get('destination');
      if (destination) {
        const destCode = destination.toUpperCase();
        // Vérifier si la destination existe dans notre liste
        const validDest = DESTINATIONS.find(d => d.code === destCode);
        if (validDest) {
          setDestinationCountry(destCode);
          setDestinationInput(`${validDest.name}`);
          setSelectedDestination(true);
          // Créer un objet selectedLocation minimal pour la compatibilité
          setSelectedLocation({
            displayName: validDest.name,
            city: '',
            countryCode: destCode,
            countryName: validDest.name,
            coordinates: { lat: 0, lng: 0 }
          });
        }
      }

      // Dates
      const startDate = params.get('dateStart');
      const endDate = params.get('dateEnd');
      if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        setDateStart(startDate);
        setSelectedDates(true);
      }
      if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        setDateEnd(endDate);
        setSelectedDates(true);
      }

      // Adults
      const adults = params.get('adults');
      if (adults && !isNaN(Number(adults))) {
        const numAdultsValue = Math.max(1, Math.min(10, Number(adults)));
        setNumAdults(numAdultsValue);
        setSelectedTravelers(true);
      }

      // Children
      const children = params.get('children');
      if (children && !isNaN(Number(children))) {
        const numChildrenValue = Math.max(0, Math.min(10, Number(children)));
        setNumChildren(numChildrenValue);
        setSelectedTravelers(true);
      }

      // Animals
      const animals = params.get('animals');
      if (animals && !isNaN(Number(animals))) {
        const numAnimalsValue = Math.max(0, Math.min(5, Number(animals)));
        setNumAnimals(numAnimalsValue);
      }

      // Activities
      const activities = params.get('activities');
      if (activities) {
        const activitiesList = activities.split(',').map(a => a.trim()).filter(Boolean);
        // Valider que les activités sont dans la liste prédéfinie
        const validActivities = activitiesList.filter(act =>
          PREDEFINED_ACTIVITIES.some(predef => predef.toLowerCase() === act.toLowerCase())
        );
        if (validActivities.length > 0) {
          setActivitiesData(validActivities);
          setWantsMoreIdeas(true);
          setSelectedActivities(true);
        }
      }

      // Budget
      const budget = params.get('budget');
      if (budget) {
        // Mapper les codes budget vers les labels
        const budgetMap: Record<string, string> = {
          '0-100': '0€ - 100€',
          '100-300': '100€ - 300€',
          '300+': '300€ et +'
        };
        const budgetLabel = budgetMap[budget];
        if (budgetLabel) {
          setSelectedBudgetRange(budgetLabel);
          setSelectedBudget(true);
        }
      }
    } catch (err) {
      console.warn('Error parsing query parameters:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Popup Dates helpers
  function openDatePopup() {
    setTmpStart(dateStart);
    setTmpEnd(dateEnd);
    setIsDatePopupOpen(true);
  }
  function closeDatePopup() {
    setIsDatePopupOpen(false);
  }
  function confirmDatePopup() {
    // Validation: retour ≥ départ
    let s = tmpStart;
    let e = tmpEnd || tmpStart;
    if (s && e && e < s) {
      const t = s;
      s = e;
      e = t;
    }
    setDateStart(s);
    setDateEnd(e);
    setIsDatePopupOpen(false);
  }

  function formatDateLabel(s: string): string {
    try {
      if (!s) return '';
      const [y, m, d] = s.split('-').map((n) => Number(n));
      if (!y || !m || !d) return '';
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    } catch {
      return s;
    }
  }

  // Nouveau DatePicker moderne avec liquid glass
  function ModernDatePicker(props: { start: string; end: string; onChange: (s: string, e: string) => void; onClose: () => void; }) {
    const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const parse = (s: string) => {
      if (!s) return null as Date | null;
      const [y, m, d] = s.split('-').map((n) => Number(n));
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };

    const [view, setView] = useState(() => {
      const base = parse(props.start) || new Date();
      return { year: base.getFullYear(), month: base.getMonth() + 1 };
    });
    const [selStart, setSelStart] = useState<string>(props.start || '');
    const [selEnd, setSelEnd] = useState<string>(props.end || '');
    const [mode, setMode] = useState<'start' | 'end'>('start');

    function buildMonth(y: number, m: number) {
      const first = new Date(y, m - 1, 1);
      const daysInMonth = new Date(y, m, 0).getDate();
      const firstDow = (first.getDay() + 6) % 7; // 0=Mon
      const list: Array<{ key: string } | null> = [];
      for (let i = 0; i < firstDow; i++) list.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(y, m - 1, d);
        list.push({ key: toKey(dt) });
      }
      while (list.length % 7 !== 0) list.push(null);
      return list;
    }

    function isInRange(k: string) {
      if (!selStart || !selEnd) return false;
      return k >= selStart && k <= selEnd;
    }

    function onSelect(k: string) {
      if (mode === 'start') {
        setSelStart(k);
        if (selEnd && k > selEnd) {
          setSelEnd('');
        }
        setMode('end');
      } else {
        if (k >= selStart) {
          setSelEnd(k);
        } else {
          setSelStart(k);
          setSelEnd('');
        }
      }
    }

    function shiftMonth(delta: number) {
      const m0 = view.month + delta;
      const y = view.year + Math.floor((m0 - 1) / 12);
      const m = ((m0 - 1) % 12 + 12) % 12 + 1;
      setView({ year: y, month: m });
    }

    const todayKey = toKey(new Date());
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    function renderMonth() {
      const days = buildMonth(view.year, view.month);

      return (
        <div className="glass-card-dark border border-white/15 rounded-2xl p-6 w-full max-w-md mx-auto shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <div className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">
                {mode === 'start' ? 'Départ' : 'Retour'}
              </div>
              <h2 className="text-xl font-semibold text-white">
                {monthNames[view.month - 1]} {view.year}
              </h2>
            </div>
            <button
              onClick={props.onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => shiftMonth(-1)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm text-white/80">
              {mode === 'start' ? 'Sélectionnez la date de départ' : 'Sélectionnez la date de retour'}
            </div>
            <button
              onClick={() => shiftMonth(1)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day) => (
              <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-white/50">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {days.map((cell, idx) => (
              cell ? (
                <button
                  key={cell.key}
                  onClick={() => onSelect(cell.key)}
                  disabled={cell.key < todayKey}
                  className={`h-10 w-10 rounded-xl text-sm font-medium transition-all ${
                    cell.key < todayKey
                      ? 'text-white/30 cursor-not-allowed'
                      : isInRange(cell.key)
                      ? 'text-white border border-white/13'
                      : selStart === cell.key || selEnd === cell.key
                      ? 'bg-white text-gray-900 shadow-lg scale-105'
                      : 'text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  style={isInRange(cell.key) ? {
                    background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                  } : undefined}
                >
                  {Number(cell.key.split('-')[2])}
                </button>
              ) : (
                <div key={idx} />
              )
            ))}
          </div>

          {/* Bouton OK */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (selStart && selEnd) {
                  props.onChange(selStart, selEnd);
                  props.onClose();
                }
              }}
              disabled={!selStart || !selEnd}
              className="px-8 py-3 bg-white text-gray-900 rounded-full font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              OK
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {renderMonth()}
      </div>
    );
  }

  const onUpdateAdvices = useCallback(async () => {
    setAi({ status: 'loading' });
    const groupMin = Math.min(...ages);
    const groupMax = Math.max(...ages);
    const season = computeSeason(destinationCountry, dateStart || undefined);
    const payload = {
      destinationCountry: destinationCountry.toUpperCase(),
      marketplaceCountry: 'FR',
      groupAge: { min: groupMin, max: groupMax },
      dates: (dateStart && dateEnd) ? { start: new Date(dateStart).toISOString(), end: new Date(dateEnd).toISOString() } : undefined,
      season,
      tripType: 'general',
      constraints: { maxTags: 6, promptVersion: PROMPT_VERSION },
    };

    try {
      const cacheKey = `explain:${JSON.stringify(payload)}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached) as { tags: TagItem[]; meta?: AiMeta };
        setAi({ status: 'success', tags: data.tags, meta: data.meta });
        return;
      }

      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setAi({ status: 'network-error' });
        return;
      }
      const data = (await res.json()) as { tags: TagItem[]; meta?: AiMeta };
      const tags = Array.isArray(data.tags) ? data.tags.slice(0, 6) : [];
      const meta = data.meta;
      sessionStorage.setItem(cacheKey, JSON.stringify({ tags, meta }));
      setAi({ status: 'success', tags, meta });
    } catch {
      setAi({ status: 'network-error' });
    }
  }, [ages, destinationCountry, dateStart, dateEnd]);

  return (
    <NoSSRWrapper>
    <main className="relative w-full text-white min-h-screen">
      {/* Header */}
      <Header />

      {/* Background fixe qui ne bouge jamais */}
      <div 
        className="fixed inset-0 w-full h-screen -z-10"
        style={{
          backgroundImage: "url('/images/hero.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="fixed inset-0 bg-black/0 -z-10" />

      {/* Layout initial - avant recherche */}
      {result.status === 'idle' && (
        <div className="relative flex min-h-screen flex-col items-center justify-start px-6">
          {/* Header */}
          <div className="text-center mt-32 mb-10">
            <h1 className="text-4xl md:text-5xl font-semibold mb-6 font-airbnb leading-relaxed">
              Personnalisez votre checklist<br />avec Don&apos;t Forget
            </h1>
            <p className="text-base md:text-lg text-gray-300 font-airbnb leading-relaxed">
              Votre checklist sur mesure prête en 30s<br />sans stress ni oubli
            </p>
          </div>

          {/* Form Container optimisé */}
          <div className="hero-form">
            {/* Grille 3x2 compacte */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {/* Destination avec autocomplétion */}
              <div className="relative">
                <div className="hero-label">Où partez-vous ?</div>
                <div className="relative">
                  <input
                    type="text"
                    className={`hero-input w-full ${selectedLocation ? 'border-white/13' : ''}`}
                    style={selectedLocation ? {
                      background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                    } : undefined}
                    placeholder="Rechercher une ville ou un pays..."
                    value={destinationInput}
                    onChange={(e) => {
                      setDestinationInput(e.target.value);
                      setSelectedLocation(null);
                      setSelectedDestination(false); // Réinitialiser pour permettre une nouvelle sélection
                      setIsDestinationDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsDestinationDropdownOpen(true);
                      if (destinationInput && !selectedLocation) {
                        setSuggestions([]); // Forcer le rechargement des suggestions
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsDestinationDropdownOpen(false), 200);
                    }}
                  />

                  {/* Dropdown avec suggestions */}
                  {isDestinationDropdownOpen && (destinationInput.length >= 2 || suggestions.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-2 suggestions-dropdown rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-50 modern-scroll">
                      {isLoadingSuggestions ? (
                        <div className="px-4 py-3 text-white/60 text-center">
                          <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span className="ml-2">Recherche en cours...</span>
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full px-4 py-3 text-left transition-all text-white hover:border-white/13 border border-transparent rounded-xl"
                            style={{
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                            onClick={() => {
                              setSelectedLocation(suggestion);
                              setDestinationCountry(suggestion.countryCode);
                              setDestinationInput(suggestion.displayName);
                              setSelectedDestination(true);
                              setIsDestinationDropdownOpen(false);
                              setSuggestions([]);
                            }}
                          >
                            <span className="font-medium">{suggestion.displayName}</span>
                          </button>
                        ))
                      ) : destinationInput.length >= 2 ? (
                        <div className="px-4 py-3 text-white/60 text-center">
                          Aucune destination trouvée
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div>
                <div className="hero-label">Quand partez-vous ?</div>
                <div className="date-row">
                  <button
                    onClick={() => {
                      openDatePopup();
                      setSelectedDates(true);
                    }}
                    className={`hero-input flex flex-col justify-center text-left ${selectedDates ? 'border-white/13' : ''}`}
                    style={selectedDates ? {
                      background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                    } : undefined}
                  >
                    <div className="text-xs opacity-70 mb-1">Départ</div>
                    <div className="text-sm">
                      {dateStart ? formatDateLabel(dateStart) : '--/--/----'}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      openDatePopup();
                      setSelectedDates(true);
                    }}
                    className={`hero-input flex flex-col justify-center text-left ${selectedDates ? 'border-white/13' : ''}`}
                    style={selectedDates ? {
                      background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                    } : undefined}
                  >
                    <div className="text-xs opacity-70 mb-1">Retour</div>
                    <div className="text-sm">
                      {dateEnd ? formatDateLabel(dateEnd) : '--/--/----'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Voyageurs */}
              <div>
                <div className="hero-label">Avec qui ?</div>
                <button
                  type="button"
                  className={`hero-input w-full flex items-center justify-between text-left hover:bg-black/35 transition-all ${selectedTravelers ? 'border-white/13' : ''}`}
                  style={selectedTravelers ? {
                    background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                  } : undefined}
                  onClick={() => {
                    setIsTravelersPopupOpen(true);
                    setSelectedTravelers(true);
                  }}
                >
                  <span>{travelers} voyageur{travelers > 1 ? 's' : ''}</span>
                  <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              </div>

              {/* Activités */}
              <div className="relative">
                <div className="hero-label">Vos activités</div>
                <input
                  type="text"
                  placeholder="Ex : tennis"
                  className={`hero-input w-full ${selectedActivities ? 'border-white/13' : ''}`}
                  style={selectedActivities ? {
                    background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                  } : undefined}
                  value={currentActivityInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentActivityInput(value);
                    
                    if (value.trim()) {
                      // Obtenir les suggestions en excluant les activités déjà ajoutées
                      const allAddedActivities = [...manualActivities, ...activitiesData];
                      const suggestions = getActivitySuggestions(value, allAddedActivities);
                      setFilteredActivitySuggestions(suggestions);
                      setShowActivitySuggestions(suggestions.length > 0);
                    } else {
                      setShowActivitySuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    setSelectedActivities(true);
                    if (currentActivityInput.trim() && filteredActivitySuggestions.length > 0) {
                      setShowActivitySuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Délai pour permettre le clic sur les suggestions
                    setTimeout(() => setShowActivitySuggestions(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentActivityInput.trim()) {
                      e.preventDefault();
                      const newActivity = currentActivityInput.trim();
                      if (!manualActivities.includes(newActivity) && !activitiesData.includes(newActivity)) {
                        setManualActivities([...manualActivities, newActivity]);
                        setSelectedActivities(true);
                      }
                      setCurrentActivityInput('');
                      setShowActivitySuggestions(false);
                    }
                  }}
                />
                
                {/* Suggestions dropdown */}
                {showActivitySuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 suggestions-dropdown rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-40 modern-scroll">
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-2 text-white/60 text-sm">Suggestions d&apos;activités</div>
                      {filteredActivitySuggestions.map((activity, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full px-4 py-3 text-left transition-all text-white hover:border-white/13 border border-transparent rounded-xl flex items-center justify-between group"
                          style={{
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                          onClick={() => {
                            if (!manualActivities.includes(activity) && !activitiesData.includes(activity)) {
                              setManualActivities([...manualActivities, activity]);
                              setSelectedActivities(true);
                            }
                            setCurrentActivityInput('');
                            setShowActivitySuggestions(false);
                          }}
                        >
                          <span className="font-medium">{activity}</span>
                          <div className="w-5 h-5 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Affichage des activités ajoutées */}
                {(manualActivities.length > 0 || activitiesData.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Activités manuelles */}
                    {manualActivities.map((activity, index) => (
                      <div
                        key={`manual-${index}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white border border-white/20"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
                        }}
                      >
                        <span>{activity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setManualActivities(manualActivities.filter((_, i) => i !== index));
                            if (manualActivities.length <= 1 && activitiesData.length === 0) {
                              setSelectedActivities(false);
                            }
                          }}
                          className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {/* Activités du popup */}
                    {activitiesData.map((activity, index) => (
                      <div
                        key={`popup-${index}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white border border-white/20"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))'
                        }}
                      >
                        <span>{activity}</span>
                        <button
                          type="button"
                          onClick={() => toggleActivity(activity)}
                          className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plus d'activités */}
              <div>
                <div className="hero-label">Plus d&apos;activités&nbsp;?</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setWantsMoreIdeas(true);
                      setIsActivitiesPopupOpen(true);
                    }}
                    className={`col-span-2 hero-input h-12 text-xs font-medium transition-all text-center border ${
                      wantsMoreIdeas
                        ? 'border-white/13'
                        : 'bg-black/25 hover:bg-black/35 border-white/20'
                    }`}
                    style={wantsMoreIdeas ? {
                      background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                    } : undefined}
                  >
                    Je veux d&apos;autres idées
                  </button>
                  <button
                    onClick={() => setWantsMoreIdeas(false)}
                    className={`hero-input h-12 text-xs font-medium transition-all text-center border ${
                      !wantsMoreIdeas
                        ? 'border-white/13'
                        : 'bg-black/25 hover:bg-black/35 border-white/20'
                    }`}
                    style={!wantsMoreIdeas ? {
                      background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                    } : undefined}
                  >
                    Non
                  </button>
                </div>
              </div>

              {/* Budget */}
              <div>
                <div className="hero-label">Budget pour les activités ?</div>
                <button
                  type="button"
                  className={`hero-input w-full flex items-center justify-between text-left hover:bg-black/35 transition-all ${selectedBudget ? 'border-white/13' : ''}`}
                  style={selectedBudget ? {
                    background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                  } : undefined}
                  onClick={() => {
                    setIsBudgetPopupOpen(true);
                    setSelectedBudget(true);
                  }}
                >
                  <span>{selectedBudgetRange || 'Sélectionner un budget'}</span>
                  <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onSubmit}
              className="hero-cta"
            >
              <span>Débuter la recherche</span>
              <svg className="hero-cta-icon" width="19" height="21" viewBox="0 0 19 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.17781 16.8556C3.73068 16.8556 2.50606 16.3543 1.50395 15.3517C0.50185 14.349 0.000531479 13.1244 4.21474e-07 11.6778C-0.000530636 10.2312 0.500787 9.00659 1.50395 8.00395C2.50712 7.00132 3.73174 6.5 5.17781 6.5C6.62388 6.5 7.84876 7.00132 8.85246 8.00395C9.85616 9.00659 10.3572 10.2312 10.3556 11.6778C10.3556 12.262 10.2627 12.8129 10.0768 13.3307C9.89094 13.8485 9.63869 14.3065 9.32006 14.7048L13.7809 19.1657C13.927 19.3118 14 19.4976 14 19.7233C14 19.949 13.927 20.1349 13.7809 20.2809C13.6349 20.427 13.449 20.5 13.2233 20.5C12.9976 20.5 12.8118 20.427 12.6657 20.2809L8.20484 15.8201C7.80654 16.1387 7.34851 16.3909 6.83073 16.5768C6.31294 16.7627 5.76197 16.8556 5.17781 16.8556ZM5.17781 15.2624C6.17354 15.2624 7.02005 14.9141 7.71733 14.2173C8.4146 13.5206 8.76298 12.6741 8.76245 11.6778C8.76192 10.6815 8.41354 9.83531 7.71733 9.13909C7.02111 8.44287 6.1746 8.09423 5.17781 8.09317C4.18102 8.09211 3.33478 8.44075 2.63909 9.13909C1.9434 9.83743 1.59477 10.6837 1.59317 11.6778C1.59158 12.6719 1.94022 13.5185 2.63909 14.2173C3.33796 14.9162 4.1842 15.2646 5.17781 15.2624Z" fill="currentColor"/>
                <path d="M11.85 4.35L14.05 3.525L11.85 2.69917L11.025 0.5L10.1992 2.69917L8 3.525L10.1992 4.35L11.025 6.54999L11.85 4.35ZM16.25 8.75001L19 7.65L16.25 6.54999L15.15 3.8L14.05 6.54999L11.3 7.65L14.05 8.75001L15.15 11.5L16.25 8.75001Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* État de chargement pendant redirection */}
      {result.status === 'loading' && (
        <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-6"></div>
            <p className="text-white/90 text-lg text-center">Génération de votre checklist personnalisée...</p>
            <p className="text-white/70 text-sm mt-2 text-center">Analyse de vos critères en cours</p>
          </div>
        </div>
      )}
      
      {isDatePopupOpen && (
        <ModernDatePicker
          start={tmpStart}
          end={tmpEnd}
          onChange={(s, e) => {
            setDateStart(s);
            setDateEnd(e);
            setSelectedDates(true);
            setIsDatePopupOpen(false);
          }}
          onClose={() => setIsDatePopupOpen(false)}
        />
      )}

      {/* Modal popup voyageurs */}
      {isTravelersPopupOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-dark border border-white/15 rounded-3xl p-8 w-full max-w-md mx-auto shadow-2xl">
            {/* Header avec bouton fermeture */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-white">Voyageurs</h3>
              <button
                onClick={() => setIsTravelersPopupOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Adultes */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Nombres d&apos;adultes</div>
                  <div className="text-white/60 text-sm">16 ans et plus</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                    onClick={() => setNumAdults((n) => Math.max(1, n - 1))}
                  >
                    −
                  </button>
                  <span className="min-w-[2ch] text-center text-white font-medium">{numAdults}</span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                    onClick={() => setNumAdults((n) => Math.min(10, n + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Enfants */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Enfants</div>
                  <div className="text-white/60 text-sm">15 ans et moins</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                    onClick={() => setNumChildren((n) => Math.max(0, n - 1))}
                  >
                    −
                  </button>
                  <span className="min-w-[2ch] text-center text-white font-medium">{numChildren}</span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                    onClick={() => setNumChildren((n) => Math.min(10, n + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Animaux */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Animaux</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                    onClick={() => setNumAnimals((n) => Math.max(0, n - 1))}
                  >
                    −
                  </button>
                  <span className="min-w-[2ch] text-center text-white font-medium">{numAnimals}</span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                    onClick={() => setNumAnimals((n) => Math.min(5, n + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Bouton confirmation */}
            <button
              onClick={() => setIsTravelersPopupOpen(false)}
              className="w-full mt-8 bg-white hover:bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl font-semibold transition-all"
            >
              Confirmer les voyageurs
            </button>
          </div>
        </div>
      )}

      {/* Modal popup budget */}
      {isBudgetPopupOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-dark border border-white/15 rounded-3xl p-8 w-full max-w-md mx-auto shadow-2xl">
            {/* Header avec bouton fermeture */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-white text-center flex-1">Budget total des activités</h3>
              <button
                onClick={() => setIsBudgetPopupOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all ml-4"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Liste des options de budget */}
            <div className="space-y-4 mb-8">
              {budgetOptions.map((budget) => {
                const isSelected = selectedBudgetRange === budget.label;
                return (
                  <button
                    key={budget.value}
                    type="button"
                    onClick={() => setSelectedBudgetRange(budget.label)}
                    className={`w-full p-4 rounded-2xl transition-all border ${
                      isSelected
                        ? 'border-white/13'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                    style={isSelected ? {
                      background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                    } : undefined}
                  >
                    <span className="text-white font-medium text-center block">{budget.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bouton confirmation */}
            <button
              onClick={() => setIsBudgetPopupOpen(false)}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl font-semibold transition-all"
            >
              Confirmer le budget
            </button>
          </div>
        </div>
      )}

      {/* Modal popup activités */}
      {isActivitiesPopupOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-dark border border-white/15 rounded-3xl p-8 w-full max-w-lg mx-auto shadow-2xl max-h-[80vh] overflow-y-auto">
            {/* Header avec bouton fermeture */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-white text-center flex-1">Suggestion d&apos;activités</h3>
              <button
                onClick={() => setIsActivitiesPopupOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all ml-4"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Liste des activités */}
            <div className="space-y-3 mb-8">
              {predefinedActivitiesForPopup.map((activity) => {
                const activityRaw = activity.replace(/&apos;/g, "'");
                const isSelected = activitiesData.includes(activityRaw);
                return (
                  <button
                    key={activity}
                    type="button"
                    onClick={() => toggleActivity(activityRaw)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
                      isSelected
                        ? 'border-white/13'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                    style={isSelected ? {
                      background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.13)), linear-gradient(0deg, rgba(51, 235, 145, 0.31), rgba(51, 235, 145, 0.31))'
                    } : undefined}
                  >
                    <span className="text-white font-medium" dangerouslySetInnerHTML={{ __html: activity }} />
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-white text-gray-900' : 'bg-white/20'
                    }`}>
                      {isSelected ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bouton confirmation */}
            <button
              onClick={() => setIsActivitiesPopupOpen(false)}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl font-semibold transition-all"
            >
              Confirmer l&apos;activité
            </button>
          </div>
        </div>
      )}
    </main>
    </NoSSRWrapper>
  );
}
