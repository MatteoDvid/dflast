// Helper pour les logs conditionnels
export class AILogger {
  private static enabled = String(process.env.AI_DEBUG ?? 'false').toLowerCase() === 'true';
  private static mode = process.env.AI_LOG_MODE || 'detailed';
  private static currentRequest: RequestLog | null = null;
  private static requestCounter = 0;

  static log(...args: any[]) {
    if (this.enabled && this.mode === 'detailed') {
      console.log('[AI]', ...args);
    }
  }

  static error(...args: any[]) {
    if (this.enabled) {
      console.error('[AI ERROR]', ...args);
    }
  }

  static warn(...args: any[]) {
    if (this.enabled && this.mode === 'detailed') {
      console.warn('[AI WARN]', ...args);
    }
  }

  static info(...args: any[]) {
    if (this.enabled && this.mode === 'detailed') {
      console.info('[AI INFO]', ...args);
    }
  }

  static debug(...args: any[]) {
    if (this.enabled && this.mode === 'detailed') {
      console.debug('[AI DEBUG]', ...args);
    }
  }

  static table(data: any) {
    if (this.enabled && this.mode === 'detailed' && console.table) {
      console.table(data);
    }
  }

  static group(label: string) {
    if (this.enabled && this.mode === 'detailed' && console.group) {
      console.group(`[AI] ${label}`);
    }
  }

  static groupEnd() {
    if (this.enabled && this.mode === 'detailed' && console.groupEnd) {
      console.groupEnd();
    }
  }

  // Nouveau système de logging synthétique
  static startRequest(data: any) {
    if (!this.enabled || this.mode === 'none') return;
    
    this.requestCounter++;
    this.currentRequest = {
      id: this.requestCounter,
      formData: data,
      aiPrompt: null,
      aiResponse: null,
      selectedProducts: []
    };

    if (this.mode === 'summary') {
      console.log(`\n[AI] === REQUÊTE #${this.requestCounter} ===`);
      const { destinationDisplayName, destinationCity, destinationCountry, dates, adults, children, animals, activities, budget } = data;
      
      let location = destinationDisplayName || destinationCity || destinationCountry || 'Non définie';
      let dateStr = 'Non définies';
      if (dates?.start && dates?.end) {
        const start = new Date(dates.start);
        const end = new Date(dates.end);
        dateStr = `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`;
      }
      
      let travelers = [];
      if (adults > 0) travelers.push(`${adults} adulte${adults > 1 ? 's' : ''}`);
      if (children > 0) travelers.push(`${children} enfant${children > 1 ? 's' : ''}`);
      if (animals > 0) travelers.push(`${animals} animal${animals > 1 ? 'aux' : ''}`);
      
      console.log(`📍 ${location} | ${dateStr} | ${travelers.join(', ') || 'Non défini'}`);
      console.log(`🎯 Activités: ${activities?.join(', ') || 'Aucune'} | Budget: ${budget || 'Non défini'}`);
    }
  }

  static setAIPrompt(prompt: string, tagsCount: number) {
    if (!this.enabled || this.mode === 'none' || !this.currentRequest) return;
    
    this.currentRequest.aiPrompt = prompt;
    this.currentRequest.tagsCount = tagsCount;

    if (this.mode === 'summary') {
      console.log(`\n📤 PROMPT IA:`);
      // Extraire seulement le contexte du voyage
      const contextMatch = prompt.match(/CONTEXTE DU VOYAGE:\n([\s\S]*?)\n\nINSTRUCTIONS:/);
      if (contextMatch) {
        console.log(contextMatch[1]);
      }
      console.log(`- Tags disponibles: ${tagsCount}`);
    }
  }

  static setAIResponse(response: any) {
    if (!this.enabled || this.mode === 'none' || !this.currentRequest) return;
    
    this.currentRequest.aiResponse = response;

    if (this.mode === 'summary') {
      console.log(`\n📥 RÉPONSE IA:`);
      console.log(`- Source: ${response.meta?.source || 'unknown'}`);
      if (response.meta?.reason) {
        console.log(`- Raison: ${response.meta.reason}`);
      }
      console.log(`- Tags sélectionnés: ${response.tags?.length || 0}`);
      if (response.tags && response.tags.length > 0) {
        response.tags.forEach((tag: any) => {
          console.log(`  ✓ ${tag.id} (${tag.score})`);
        });
      }
    }
  }

  static setSelectedProducts(products: any[]) {
    if (!this.enabled || this.mode === 'none' || !this.currentRequest) return;
    
    this.currentRequest.selectedProducts = products;

    if (this.mode === 'summary') {
      console.log(`\n📦 RÉSULTAT: ${products.length} produits recommandés`);
      console.log('\n' + '='.repeat(50));
    }
  }
}

interface RequestLog {
  id: number;
  formData: any;
  aiPrompt: string | null;
  aiResponse: any;
  selectedProducts: any[];
  tagsCount?: number;
}
