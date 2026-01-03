// Test de l'API pour un voyage en Thaïlande
const fs = require('fs');
const path = require('path');

// Lire le fichier .env.local
function loadEnvFile() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');

        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    } catch (error) {
        console.error('❌ Erreur lors de la lecture de .env.local:', error.message);
    }
}

async function testThailandTrip() {
    loadEnvFile();

    const apiKey = process.env.OPENAI_API_KEY;
    const aiEnabled = process.env.AI_ENABLED === 'true';

    console.log('🌴 Test voyage en Thaïlande');
    console.log('📅 Dates: 3-31 janvier 2026');
    console.log('👤 Voyageurs: 1 adulte');
    console.log('💰 Budget: Grand\n');
    console.log('🤖 IA activée:', aiEnabled);
    console.log('🔑 Clé API:', apiKey ? '✓ Présente' : '✗ Absente');
    console.log('─'.repeat(60));

    // Préparer la requête
    const wizardState = {
        destinationCountry: 'TH',
        destinationCity: 'Bangkok',
        destinationDisplayName: 'Thaïlande',
        marketplaceCountry: 'FR',
        travelers: 1,
        adults: 1,
        children: 0,
        animals: 0,
        ages: [30],
        dates: {
            start: '2026-01-03T00:00:00.000Z',
            end: '2026-01-31T23:59:59.000Z'
        },
        activities: [],
        budget: 'grand',
        tags: []
    };

    console.log('\n📤 Envoi de la requête à l\'API...\n');

    try {
        const response = await fetch('http://localhost:3000/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(wizardState)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Erreur API:', response.status, error);
            return;
        }

        const products = await response.json();

        console.log('✅ Recommandations reçues!');
        console.log('📦 Nombre de produits:', products.length);
        console.log('─'.repeat(60));

        if (products.length === 0) {
            console.log('⚠️  Aucun produit recommandé');
            return;
        }

        // Analyser les métadonnées
        const firstProduct = products[0];
        const aiInfo = firstProduct.explain.find(e => e.startsWith('ai='));
        const aiReason = firstProduct.explain.find(e => e.startsWith('aiReason='));

        if (aiInfo) {
            console.log('\n🤖 Source IA:', aiInfo.replace('ai=', ''));
            if (aiReason) {
                console.log('📝 Raison:', aiReason.replace('aiReason=', ''));
            }
        }

        console.log('\n📋 Top 10 recommandations:\n');
        products.slice(0, 10).forEach((product, index) => {
            console.log(`${index + 1}. ${product.label}`);

            // Extraire les informations pertinentes
            const mustHave = product.explain.find(e => e.includes('mustHave'));
            const priority = product.explain.find(e => e.startsWith('priority='));

            const metadata = [];
            if (mustHave) metadata.push('⭐ Essentiel');
            if (priority) metadata.push(priority.replace('priority=', 'Priorité: '));
            if (metadata.length > 0) {
                console.log(`   ${metadata.join(' • ')}`);
            }

            console.log(`   ASIN: ${product.asin}`);
            console.log('');
        });

        // Statistiques
        const mustHaveCount = products.filter(p =>
            p.explain.some(e => e.includes('mustHave=true'))
        ).length;

        console.log('─'.repeat(60));
        console.log('\n📊 Statistiques:');
        console.log(`   Total: ${products.length} produits`);
        console.log(`   Essentiels: ${mustHaveCount} produits`);

        // Grouper par priorité
        const priorities = {};
        products.forEach(p => {
            const priorityExplain = p.explain.find(e => e.startsWith('priority='));
            if (priorityExplain) {
                const priority = priorityExplain.replace('priority=', '');
                priorities[priority] = (priorities[priority] || 0) + 1;
            }
        });

        console.log('\n   Par priorité:');
        Object.entries(priorities)
            .sort(([a], [b]) => Number(a) - Number(b))
            .forEach(([priority, count]) => {
                console.log(`   - Priorité ${priority}: ${count} produits`);
            });

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);

        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Le serveur Next.js ne semble pas démarré.');
            console.log('   Lancez d\'abord: npm run dev');
        }
    }
}

testThailandTrip();
