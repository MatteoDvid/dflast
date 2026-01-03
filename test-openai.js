// Script de test pour vérifier la clé API OpenAI
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

async function testOpenAIKey() {
    loadEnvFile();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('❌ OPENAI_API_KEY n\'est pas définie dans .env.local');
        process.exit(1);
    }

    console.log('🔑 Clé API trouvée (premiers caractères):', apiKey.substring(0, 10) + '...');
    console.log('📡 Test de la connexion à l\'API OpenAI...\n');

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Erreur API:', response.status, error);
            process.exit(1);
        }

        const data = await response.json();
        console.log('✅ Connexion réussie!');
        console.log(`✅ ${data.data.length} modèles disponibles`);
        console.log('\n📋 Quelques modèles disponibles:');
        data.data.slice(0, 5).forEach(model => {
            console.log(`   - ${model.id}`);
        });

        // Test spécifique pour DALL-E (si utilisé dans l'app)
        const dalleModels = data.data.filter(m => m.id.includes('dall-e'));
        if (dalleModels.length > 0) {
            console.log('\n🎨 Modèles DALL-E disponibles:');
            dalleModels.forEach(model => {
                console.log(`   - ${model.id}`);
            });
        }

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        process.exit(1);
    }
}

testOpenAIKey();
