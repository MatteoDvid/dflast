// Script de test pour le système de tags dynamiques via HTTP
async function testTagsSystem() {
  console.log('Test du système de tags dynamiques via API...\n');

  try {
    // Test 1: Vérifier que l'endpoint recommend fonctionne
    console.log('1. Test de l\'endpoint /api/recommend:');
    
    const testPayload = {
      destinationCountry: 'FR',
      marketplaceCountry: 'FR',
      dates: { 
        start: new Date().toISOString(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      travelers: 1,
      ages: [30]
    };

    const response = await fetch('http://localhost:3000/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const products = await response.json();
      console.log(`   ✅ Réponse reçue: ${products.length} produits recommandés`);
      
      // Extraire les tags uniques des produits
      const uniqueTags = new Set();
      products.forEach(product => {
        if (product.explain) {
          product.explain.forEach(exp => {
            // Les tags pourraient être dans les explications
            if (exp.includes('tag=')) {
              const tag = exp.split('tag=')[1];
              if (tag) uniqueTags.add(tag);
            }
          });
        }
      });
      
      console.log(`   - Tags détectés dans les explications: ${uniqueTags.size}`);
    } else {
      console.error(`   ❌ Erreur HTTP: ${response.status}`);
    }

    // Test 2: Vérifier les données en cache
    console.log('\n2. Vérification du cache des produits:');
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const cachePath = path.join(__dirname, 'data', 'products-cache.json');
      const cacheData = await fs.readFile(cachePath, 'utf-8');
      const products = JSON.parse(cacheData);
      
      // Collecter tous les tags
      const allTags = new Set();
      products.forEach(product => {
        if (Array.isArray(product.tags)) {
          product.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      console.log(`   ✅ ${products.length} produits en cache`);
      console.log(`   ✅ ${allTags.size} tags uniques trouvés`);
      console.log(`   - Exemples de tags: ${Array.from(allTags).slice(0, 10).join(', ')}`);
      
      // Statistiques par catégorie
      const stats = {};
      products.forEach(product => {
        if (Array.isArray(product.tags)) {
          product.tags.forEach(tag => {
            stats[tag] = (stats[tag] || 0) + 1;
          });
        }
      });
      
      console.log('\n3. Top 10 des tags les plus utilisés:');
      Object.entries(stats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([tag, count], index) => {
          console.log(`   ${index + 1}. "${tag}" - ${count} produits`);
        });
        
    } catch (err) {
      console.log(`   ⚠️  Pas de cache trouvé ou erreur: ${err.message}`);
      console.log('   → Essayez de faire une requête dans l\'application pour générer le cache');
    }

    console.log('\n✅ Tests terminés!');
    console.log('\n📝 Note: Pour un test complet, assurez-vous que:');
    console.log('   1. Le serveur Next.js est lancé (npm run dev)');
    console.log('   2. Les variables d\'environnement sont configurées');
    console.log('   3. Le cache des produits est généré');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\nAssurez-vous que le serveur Next.js est lancé: npm run dev');
  }
}

// Vérifier si le serveur est accessible
fetch('http://localhost:3000/api/recommend')
  .then(() => {
    console.log('Serveur détecté sur http://localhost:3000\n');
    testTagsSystem();
  })
  .catch(() => {
    console.error('❌ Le serveur Next.js n\'est pas accessible.');
    console.log('Lancez d\'abord: npm run dev');
  });
