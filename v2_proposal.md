# Proposition v2 : Devis & Planning de Développement

Voici l'estimation pour la création de la v2 de "Don't Forget", adaptée à ton rythme de **2h de code par jour**.

## 💰 Résumé du Devis (Estimations)

| Pack Fonctionnalités | Charge de Travail | Durée Calendaire (2h/j) | Prix suggéré (Client) |
| :--- | :--- | :--- | :--- |
| **1. Socle Technique (Auth + DB)** | ~16h | 1.5 semaines | 1 200 € |
| **2. Itinéraire Intelligent (IA)** | ~30h | 3 semaines | 2 500 € |
| **3. Mode Collaboratif** | ~24h | 2.5 semaines | 1 800 € |
| **4. Wallet & Météo** | ~14h | 1.5 semaines | 1 000 € |
| **5. Moteur Newsletter & Scraping** | ~20h | 2 semaines | 1 500 € |
| **6. Pack "Micro-Features" (UX)** | ~4h | 3 jours | 1 000 € |
| **TOTAL PROJET v2** | **~108h** | **~3 mois** | **~9 000 €** |

> *Note : Prix basés sur un TJM moyen de ~550€ (soit ~70-75€/h). Tu peux ajuster selon ton tarif réel.*

---

## 🛠 Détail des Lots de Développement

### Lot 1 : Socle Technique & Authentification
**Fondation indispensable pour la v2.**
*   **Fonctions** :
    *   Comptes utilisateurs (Email, Google) sécurisés.
    *   Base de données (PostgreSQL) pour sauvegarder les voyages (vs localStorage actuel).
    *   Gestion des proﬁls (Préférences voyageur).
*   **Charge** : 16h
*   **Planning** : Semaines 1-2

### Lot 2 : Planificateur d'Itinéraire IA (Smart Itinerary)
**La "Killer Feature" qui apporte le plus de valeur métier.**
*   **Fonctions** :
    *   Génération de plannings jour par jour via GPT-4o.
    *   Interface visuelle de timeline (Drag & drop).
    *   Export PDF du planning.
*   **Charge** : 30h
*   **Planning** : Semaines 2-5

### Lot 3 : Mode Collaboratif (Team Travel)
**Fonctionnalité complexe mais très demandée.**
*   **Fonctions** :
    *   Système d'invitation par lien.
    *   Synchronisation temps réel (voir qui coche quoi).
    *   Gestion des permissions (Admin/Invité).
*   **Charge** : 24h
*   **Planning** : Semaines 5-7

### Lot 4 : Extensions (Wallet & Météo)
**Fonctionnalités "Premium" rapides à implémenter.**
*   **Fonctions** :
    *   Connecteur API Météo (Alerte pluie/froid).
    *   Upload et chiffrement de documents (Passeports, Billets).
    *   Mode Offline (PWA).
*   **Charge** : 14h
*   **Planning** : Semaines 7-8

### Lot 5 : Marketing Automation & Scraping Deals
**Machine à cash et rétention.**
*   **Fonctions** :
    *   **Scraper de Vols/Hôtels** : Bot simple qui surveille 3-4 sources (ex: Skyscanner, VoyagesPirates).
    *   **Newsletter Intelligente** : Envoi hebdo personnalisé selon la destination ("Vols pas chers pour votre voyage au Japon").
    *   **Setup CRM** : Intégration Brevo/Mailchimp.
*   **Charge** : 20h
*   **Planning** : Semaines 9-10

---

## 💸 Stratégie de Monétisation (Au-delà d'Amazon)
Pour maximiser les revenus de ton client, l'affiliation Amazon (3-4%) ne suffit pas. Voici les leviers à activer avec la v2 :

### 1. Activités & Tours (Le "Gold Mine")
*   **Partenaires** : GetYourGuide, Viator, Civitatis.
*   **Mécatnique** : L'**Itinéraire IA** suggère des activités précises. Ex: *"Jour 2 : Visite du Colisée"* -> Bouton "Réserver (Coupe-file)".
*   **Commission** : **8% à 12%** (Paniers moyens élevés ~100€).

### 2. Connectivité (eSIM)
*   **Partenaires** : Airalo, Holafly.
*   **Mécanique** : Dans la checklist "Indispensables", proposer une eSIM locale pour éviter le hors-forfait.
*   **Commission** : **10% à 20%**.

### 3. Assurance Voyage
*   **Partenaires** : Chapka, Heymondo.
*   **Mécanique** : Cibler les destinations hors-UE (USA, Asie) où l'assurance est critique.
*   **Commission** : **15% à 30%** (Souvent 30€+ de com par vente).

### 4. Smart Upsell (Abonnement)
*   Proposer le **Pack Premium** (Itinéraire illimité + Wallet + Offline) en achat intégré One-Shot (ex: 4.99€ par voyage).

### 5. Club Privé "Travel Deals" (Newsletter)
*   **Concept** : Accès aux meilleures offres de vols/hôtels repérées par ton scraper.
*   **Modèle** : Abonnement mensuel (ex: 3€/mois) ou Lead Gen (vendre les leads qualifiés aux agences).
*   **Bonus Facturation** : Tu peux facturer à ton client un **Retainer Mensuel (ex: 500€/mois)** pour la gestion technique et l'optimisation des campagnes d'emailing.

---

### Lot 6 : Pack Micro-Features ("Quick Wins")
**Petits détails à haute valeur perçue (Whaou Effect).**
*   **Fonctions** :
    *   **⚡️ "Magic Share"** : Bouton de partage WhatsApp formaté (Texte + Émojis) pour la viralité.
    *   **🚑 Fiche Urgence** : Affichage 112/Ambassades selon le pays.
    *   **🎵 Widget Spotify** : Playlist ambiance locale durant le packing.
*   **Charge** : 4h
*   **Planning** : Fil rouge (entre les lots)

---

## 📅 Roadmap Conseillée

1.  **Mois 1** : Focus sur **Socle Technique** + **Itinéraire IA**.
    *   *Livrable fin de mois 1 :* Une app où l'on peut se connecter et générer un voyage complet sauvegardé en base.
2.  **Mois 2** : Focus sur **Collaboratif** + **Finitions**.
    *   *Livrable fin de mois 2 :* Version complète v2 testable par le client.

## 💡 Argumentaire pour ton client
Pour vendre ce budget, appuie sur le ROI (Retour sur Investissement) :
*   L'**Itinéraire IA** permet de vendre de l'affiliation sur les activités (GetYourGuide, Viator), pas juste des produits Amazon.
*   Le **Mode Collaboratif** crée de la viralité (1 utilisateur invite 3 amis).
*   L'**Auth** permet de relancer les utilisateurs par email (Rétention).
