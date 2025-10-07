# 🔗 Intégration Webflow → Don't Forget App

## 📋 Vue d'ensemble

Ce document explique comment pré-remplir le formulaire de l'app Don't Forget depuis le site Webflow via des **query parameters dans l'URL**.

## ✅ Avantages de cette méthode

- ✅ **Zéro dépendance** entre Webflow et Vercel
- ✅ **5-15 minutes de setup** côté Webflow
- ✅ **100% stable** (standard web depuis 1995)
- ✅ **Scalable** : l'app peut évoluer sans impacter Webflow
- ✅ **SEO friendly** : les URLs sont bookmarkables

---

## 🎯 Paramètres supportés

| Paramètre | Type | Valeurs acceptées | Exemple |
|-----------|------|-------------------|---------|
| `destination` | string | `FR`, `IS`, `TH`, `MA`, `BR`, `US` | `FR` |
| `dateStart` | date | Format `YYYY-MM-DD` | `2025-08-01` |
| `dateEnd` | date | Format `YYYY-MM-DD` | `2025-08-15` |
| `adults` | number | 1-10 | `2` |
| `children` | number | 0-10 | `1` |
| `animals` | number | 0-5 | `0` |
| `activities` | string | Liste séparée par virgules (voir ci-dessous) | `Tennis,Surf` |
| `budget` | string | `0-100`, `100-300`, `300+` | `100-300` |

### 🎾 Activités supportées

```
Surf, Parc d'attractions, Saut en parachute, Randonnée, Plongée sous-marine,
Ski, Tennis, Golf, Via ferrata, Kayak, Équitation, Cyclisme, Escalade,
Spéléologie, Canoë, Voile
```

---

## 🚀 Exemples d'URLs complètes

### Exemple 1 : Voyage simple (destination + voyageurs)
```
https://votre-app.vercel.app/wizard?destination=FR&adults=2&children=1
```

### Exemple 2 : Voyage complet avec dates
```
https://votre-app.vercel.app/wizard?destination=TH&dateStart=2025-12-20&dateEnd=2025-12-30&adults=2&children=0&budget=300+
```

### Exemple 3 : Avec activités
```
https://votre-app.vercel.app/wizard?destination=FR&adults=2&activities=Tennis,Surf,Via%20ferrata
```

---

## 💻 Intégration dans Webflow

### Option 1 : Lien statique simple (5 min) ⭐ RECOMMANDÉ SI PAS DE FORMULAIRE

Si vous avez juste un bouton CTA sans formulaire :

1. Sélectionnez le bouton dans Webflow
2. Dans les paramètres du bouton, changez l'URL vers :
   ```
   https://votre-app.vercel.app/wizard?destination=FR&adults=2
   ```
3. C'est tout ! ✅

---

### Option 2 : Formulaire dynamique (15 min)

Si vous avez un formulaire avec plusieurs champs sur Webflow :

#### Étape 1 : Identifier les IDs des champs

Dans Webflow, donnez des IDs à vos champs de formulaire :
- Select destination → ID: `destination-select`
- Input nombre d'adultes → ID: `adults-input`
- Input nombre d'enfants → ID: `children-input`
- etc.

#### Étape 2 : Ajouter le Custom Code

Dans Webflow, ajoutez un **Embed** (Custom Code) juste avant le bouton CTA :

```html
<script>
// Fonction pour construire l'URL avec les paramètres du formulaire
function buildAppUrl() {
  const baseUrl = 'https://votre-app.vercel.app/wizard';
  const params = new URLSearchParams();

  // Destination (select)
  const destination = document.getElementById('destination-select')?.value;
  if (destination) params.append('destination', destination);

  // Dates (inputs de type date)
  const dateStart = document.getElementById('date-start-input')?.value;
  if (dateStart) params.append('dateStart', dateStart);

  const dateEnd = document.getElementById('date-end-input')?.value;
  if (dateEnd) params.append('dateEnd', dateEnd);

  // Voyageurs (inputs number)
  const adults = document.getElementById('adults-input')?.value;
  if (adults) params.append('adults', adults);

  const children = document.getElementById('children-input')?.value;
  if (children) params.append('children', children);

  const animals = document.getElementById('animals-input')?.value;
  if (animals) params.append('animals', animals);

  // Activités (checkboxes ou input text)
  const activities = [];
  document.querySelectorAll('input[name="activity"]:checked').forEach(cb => {
    activities.push(cb.value);
  });
  if (activities.length > 0) params.append('activities', activities.join(','));

  // Budget (select ou radio)
  const budget = document.querySelector('input[name="budget"]:checked')?.value;
  if (budget) params.append('budget', budget);

  // Construire l'URL finale
  const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  return url;
}

// Attacher l'événement au bouton CTA
document.addEventListener('DOMContentLoaded', function() {
  const ctaButton = document.getElementById('cta-button'); // Donnez cet ID au bouton

  if (ctaButton) {
    ctaButton.addEventListener('click', function(e) {
      e.preventDefault();
      const url = buildAppUrl();
      window.location.href = url;
    });
  }
});
</script>
```

#### Étape 3 : Donner un ID au bouton CTA

Dans Webflow, sélectionnez le bouton et donnez-lui l'ID : `cta-button`

✅ **C'est terminé !**

---

## 🧪 Comment tester

### Test 1 : URL directe
Ouvrez dans votre navigateur :
```
https://votre-app.vercel.app/wizard?destination=FR&adults=2&children=1&dateStart=2025-08-01&dateEnd=2025-08-15
```

➡️ Le formulaire devrait être **pré-rempli automatiquement** avec un style vert sur les champs.

### Test 2 : Depuis Webflow
1. Publiez votre site Webflow
2. Cliquez sur le bouton CTA
3. Vérifiez que vous arrivez sur l'app avec les champs pré-remplis

---

## 🐛 Debugging

### Les champs ne se remplissent pas ?

1. **Vérifiez l'URL** : Ouvrez la console navigateur (F12) et tapez :
   ```javascript
   console.log(window.location.search)
   ```
   Vous devriez voir : `?destination=FR&adults=2...`

2. **Vérifiez les noms de paramètres** : Ils sont sensibles à la casse !
   - ✅ `destination=FR`
   - ❌ `Destination=FR`

3. **Vérifiez les valeurs** :
   - Destination doit être : `FR`, `IS`, `TH`, `MA`, `BR`, ou `US`
   - Dates au format : `YYYY-MM-DD`
   - Nombres valides

### Les activités ne s'affichent pas ?

Vérifiez que les noms correspondent EXACTEMENT à la liste (voir ci-dessus).

Exemple :
- ✅ `activities=Tennis,Surf`
- ❌ `activities=tennis,surf` (minuscules ne marchent pas)

---

## 📞 Support

Si vous avez des questions ou problèmes :
1. Vérifiez que l'URL est bien formée
2. Testez avec une URL simple d'abord : `?destination=FR&adults=2`
3. Ajoutez progressivement les autres paramètres

---

## 🔐 Sécurité

- ✅ Tous les paramètres sont **validés** côté app
- ✅ Les valeurs invalides sont **ignorées** (pas d'erreur)
- ✅ Aucune donnée sensible ne transite

---

## 🎯 Checklist finale

Avant de déployer :

- [ ] J'ai testé une URL simple avec `?destination=FR`
- [ ] Les champs se remplissent correctement
- [ ] Le style vert apparaît sur les champs pré-remplis
- [ ] Le bouton Webflow redirige vers la bonne URL
- [ ] J'ai testé sur mobile

---

## 📝 Notes techniques

- La lecture des query params se fait dans `app/wizard/page.tsx` (lignes 245-326)
- Les paramètres **overrident** le localStorage (valeurs précédentes de l'utilisateur)
- Si un paramètre est invalide, il est simplement ignoré (pas d'erreur)
- Compatible avec tous les navigateurs modernes (IE11+)

---

**Dernière mise à jour** : 2025-01-07
