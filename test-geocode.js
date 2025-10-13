// Script de test pour l'API geocode
async function testGeocodeAPI() {
  const testQueries = ['Paris', 'New York', 'Tokyo', 'Londres', 'Maroc', 'Rio de Janeiro', 'Reykjavik'];
  
  console.log('Test de l\'API geocode...\n');
  
  for (const query of testQueries) {
    try {
      console.log(`Test avec: "${query}"`);
      const response = await fetch(`http://localhost:3000/api/geocode?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        console.error(`  ❌ Erreur HTTP: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`  ✅ ${data.length} résultats trouvés`);
      
      if (data.length > 0) {
        console.log(`  Premier résultat:`);
        console.log(`    - Ville: ${data[0].city}`);
        console.log(`    - Code pays: ${data[0].countryCode}`);
        console.log(`    - Nom complet: ${data[0].displayName}`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`  ❌ Erreur: ${error.message}`);
    }
  }
  
  // Test de saisie partielle
  console.log('\nTest de saisie partielle:');
  const partialQueries = ['Par', 'New', 'Tok'];
  
  for (const query of partialQueries) {
    try {
      console.log(`Test avec: "${query}"`);
      const response = await fetch(`http://localhost:3000/api/geocode?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        console.error(`  ❌ Erreur HTTP: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`  ✅ ${data.length} résultats trouvés`);
      
      console.log('');
    } catch (error) {
      console.error(`  ❌ Erreur: ${error.message}`);
    }
  }
}

// Exécuter le test si le serveur est lancé
console.log('Assurez-vous que le serveur Next.js est lancé sur http://localhost:3000');
console.log('Appuyez sur Ctrl+C pour quitter\n');

setTimeout(testGeocodeAPI, 1000);
