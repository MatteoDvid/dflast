// Script de test pour l'IA
// Usage: node test-ai.js

const testCases = [
  {
    name: "Voyage à Paris en été avec enfants",
    data: {
      destinationCountry: "FR",
      destinationCity: "Paris",
      destinationDisplayName: "Paris, France",
      marketplaceCountry: "FR",
      dates: {
        start: "2024-07-15T00:00:00.000Z",
        end: "2024-07-22T00:00:00.000Z"
      },
      travelers: 4,
      ages: [35, 33, 10, 7],
      adults: 2,
      children: 2,
      animals: 0,
      activities: ["Parc d'attractions", "Randonnée"],
      budget: "300€ et +"
    }
  },
  {
    name: "Voyage en Islande en hiver",
    data: {
      destinationCountry: "IS",
      destinationCity: "Reykjavik",
      destinationDisplayName: "Reykjavik, Islande",
      marketplaceCountry: "FR",
      dates: {
        start: "2024-12-20T00:00:00.000Z",
        end: "2024-12-28T00:00:00.000Z"
      },
      travelers: 2,
      ages: [30, 28],
      adults: 2,
      children: 0,
      animals: 0,
      activities: ["Randonnée"],
      budget: "300€ et +"
    }
  },
  {
    name: "Voyage au Maroc avec animal",
    data: {
      destinationCountry: "MA",
      destinationCity: "Marrakech",
      destinationDisplayName: "Marrakech, Maroc",
      marketplaceCountry: "FR",
      dates: {
        start: "2024-05-10T00:00:00.000Z",
        end: "2024-05-17T00:00:00.000Z"
      },
      travelers: 1,
      ages: [45],
      adults: 1,
      children: 0,
      animals: 1,
      activities: [],
      budget: "100€ - 300€"
    }
  }
];

async function testAI() {
  console.log('🧪 Test du système d\'IA\n');
  console.log('⚠️  Assurez-vous que:');
  console.log('1. Le serveur Next.js est lancé (npm run dev)');
  console.log('2. AI_ENABLED=true dans .env.local');
  console.log('3. AI_DEBUG=true dans .env.local');
  console.log('4. OPENAI_API_KEY est définie dans .env.local\n');
  console.log('═'.repeat(80) + '\n');

  for (const testCase of testCases) {
    console.log(`📍 Test: ${testCase.name}`);
    console.log('-'.repeat(50));
    
    try {
      const response = await fetch('http://localhost:3000/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      console.log(`📊 Status: ${response.status}`);
      
      if (response.ok) {
        const products = await response.json();
        console.log(`✅ Succès: ${products.length} produits recommandés`);
        
        // Afficher les premiers produits
        console.log('\nPremiers produits:');
        products.slice(0, 5).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.label}`);
          const aiInfo = p.explain.find(e => e.startsWith('ai='));
          const aiReason = p.explain.find(e => e.startsWith('aiReason='));
          if (aiInfo) console.log(`     ${aiInfo}`);
          if (aiReason) console.log(`     ${aiReason}`);
        });
      } else {
        const error = await response.json();
        console.log('❌ Erreur:', error);
      }
    } catch (error) {
      console.log('❌ Erreur réseau:', error.message);
    }
    
    console.log('\n' + '═'.repeat(80) + '\n');
  }

  console.log('💡 Consultez les logs du serveur pour voir les détails de l\'IA');
  console.log('   (Les logs apparaissent dans le terminal où vous avez lancé npm run dev)');
}

// Lancer le test
testAI().catch(console.error);
