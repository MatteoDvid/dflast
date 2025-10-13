import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=5&` +
      `addressdetails=1&` + // Pour avoir les détails de l'adresse
      `accept-language=fr`; // Résultats en français
    
    console.log('Fetching from Nominatim:', url);
    
    // Appel à l'API Nominatim
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DontForget/1.0' // Requis par Nominatim
      }
    });

    if (!response.ok) {
      console.error('Nominatim response not ok:', response.status, response.statusText);
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Nominatim response:', data.length, 'results');
    
    // Transformer les résultats Nominatim en notre format
    const suggestions = data.map((item: any) => {
      const city = extractCity(item);
      const countryName = extractCountryName(item);
      
      // Format simplifié : "Ville, Pays"
      const simplifiedDisplayName = city && countryName 
        ? `${city}, ${countryName}`
        : item.display_name;
      
      return {
        displayName: simplifiedDisplayName,
        city: city,
        countryCode: extractCountryCode(item),
        countryName: countryName,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }
      };
    }).filter((item: any) => item.countryCode); // Filtrer ceux sans code pays
    
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}

// Fonctions d'extraction des données Nominatim
function extractCity(item: any): string {
  return item.address?.city || 
         item.address?.town || 
         item.address?.village || 
         item.address?.municipality ||
         item.address?.hamlet ||
         item.name || 
         '';
}

function extractCountryCode(item: any): string {
  const code = item.address?.country_code;
  return code ? code.toUpperCase() : '';
}

function extractCountryName(item: any): string {
  return item.address?.country || '';
}
