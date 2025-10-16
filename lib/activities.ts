// Liste complète des activités disponibles
export const PREDEFINED_ACTIVITIES = [
  'Surf',
  'Parc d\'attractions',
  'Saut en parachute',
  'Randonnée',
  'Plongée sous-marine',
  'Ski',
  'Tennis',
  'Golf',
  'Via ferrata',
  'Kayak',
  'Équitation',
  'Cyclisme',
  'Escalade',
  'Spéléologie',
  'Canoë',
  'Voile',
  'Paddle',
  'Jet ski',
  'Planche à voile',
  'Kitesurf',
  'Parapente',
  'Basketball',
  'Football',
  'Volleyball',
  'Natation',
  'Yoga',
  'Fitness',
  'Course à pied',
  'VTT',
  'Pêche',
  'Chasse',
  'Safari',
  'Observation des baleines',
  'Snorkeling',
  'Accrobranche',
  'Plongée avec tuba',
  'Wakeboard',
  'Ski nautique',
  'Rafting',
  'Canyoning',
  'Alpinisme',
  'Deltaplane',
  'ULM',
  'Montgolfière',
  'Hélicoptère',
  'Char à voile',
  'Buggy',
  'Quad',
  'Moto cross',
  'Karting',
  'Paintball',
  'Laser game',
  'Bowling',
  'Billard',
  'Mini golf',
  'Escape game',
  'Visite guidée',
  'Musée',
  'Théâtre',
  'Concert',
  'Festival',
  'Spa',
  'Massage',
  'Sauna',
  'Hammam',
  'Jacuzzi',
  'Thalasso',
  'Croisière',
  'Bateau',
  'Catamaran',
  'Voilier',
  'Pêche en mer',
  'Observation dauphins',
  'Plongée bouteille',
  'Chasse sous-marine',
  'Stand up paddle',
  'Bodyboard',
  'Skimboard',
  'Windsurf',
  'Wing foil',
  'Foil électrique',
  'Jet pack',
  'Flyboard',
  'Parachute ascensionnel',
  'Bouée tractée',
  'Banana boat',
  'Tyrolienne',
  'Pont suspendu',
  'Luge d\'été',
  'Bobsleigh',
  'Skeleton',
  'Biathlon',
  'Raquettes',
  'Chiens de traîneau',
  'Motoneige',
  'Patin à glace',
  'Hockey sur glace',
  'Curling',
  'Snowboard',
  'Ski de fond',
  'Télémark',
  'Héliski',
  'Freeride',
  'Freestyle',
  'Snowpark',
  'Halfpipe'
];

// Catégories d'activités pour un filtrage futur
export const ACTIVITY_CATEGORIES = {
  'Sports nautiques': [
    'Surf', 'Paddle', 'Jet ski', 'Planche à voile', 'Kitesurf', 
    'Wakeboard', 'Ski nautique', 'Canoë', 'Kayak', 'Voile',
    'Plongée sous-marine', 'Snorkeling', 'Plongée avec tuba',
    'Stand up paddle', 'Bodyboard', 'Skimboard', 'Windsurf',
    'Wing foil', 'Foil électrique'
  ],
  'Sports aériens': [
    'Saut en parachute', 'Parapente', 'Deltaplane', 'ULM',
    'Montgolfière', 'Hélicoptère', 'Jet pack', 'Flyboard',
    'Parachute ascensionnel'
  ],
  'Sports d\'hiver': [
    'Ski', 'Snowboard', 'Ski de fond', 'Raquettes', 'Chiens de traîneau',
    'Motoneige', 'Patin à glace', 'Hockey sur glace', 'Curling',
    'Télémark', 'Héliski', 'Freeride', 'Freestyle', 'Snowpark',
    'Luge d\'été', 'Bobsleigh', 'Skeleton', 'Biathlon'
  ],
  'Sports terrestres': [
    'Randonnée', 'Cyclisme', 'VTT', 'Course à pied', 'Escalade',
    'Via ferrata', 'Spéléologie', 'Équitation', 'Tennis', 'Golf',
    'Basketball', 'Football', 'Volleyball', 'Alpinisme'
  ],
  'Activités motorisées': [
    'Char à voile', 'Buggy', 'Quad', 'Moto cross', 'Karting',
    'Jet ski', 'Motoneige'
  ],
  'Bien-être': [
    'Yoga', 'Fitness', 'Spa', 'Massage', 'Sauna', 'Hammam',
    'Jacuzzi', 'Thalasso', 'Natation'
  ],
  'Loisirs': [
    'Parc d\'attractions', 'Paintball', 'Laser game', 'Bowling',
    'Billard', 'Mini golf', 'Escape game', 'Pêche', 'Chasse'
  ],
  'Culture': [
    'Visite guidée', 'Musée', 'Théâtre', 'Concert', 'Festival'
  ],
  'Aventure': [
    'Rafting', 'Canyoning', 'Accrobranche', 'Tyrolienne',
    'Pont suspendu', 'Safari', 'Observation des baleines',
    'Observation dauphins'
  ],
  'Navigation': [
    'Croisière', 'Bateau', 'Catamaran', 'Voilier', 'Pêche en mer',
    'Chasse sous-marine'
  ],
  'Fun nautique': [
    'Bouée tractée', 'Banana boat'
  ]
};

// Fonction pour obtenir des suggestions d'activités
export function getActivitySuggestions(
  input: string, 
  excludeActivities: string[] = [],
  maxSuggestions: number = 10
): string[] {
  if (!input.trim()) return [];
  
  const inputLower = input.toLowerCase().replace(/['\s]/g, '');
  
  return PREDEFINED_ACTIVITIES
    .filter(activity => {
      const activityLower = activity.toLowerCase().replace(/['\s]/g, '');
      return activityLower.includes(inputLower) && 
             !excludeActivities.includes(activity);
    })
    .slice(0, maxSuggestions);
}

// Fonction pour obtenir des activités par catégorie
export function getActivitiesByCategory(category: keyof typeof ACTIVITY_CATEGORIES): string[] {
  return ACTIVITY_CATEGORIES[category] || [];
}

// Fonction pour obtenir toutes les catégories
export function getActivityCategories(): string[] {
  return Object.keys(ACTIVITY_CATEGORIES);
}
