# 🚀 Next Steps : Déployer la génération d'images AI

La fonctionnalité est **prête** mais **dormante** (désactivée par défaut) pour ne pas impacter tes clients actuels.

Voici la procédure pour l'activer quand tu seras prêt.

## 1. Configuration Vercel (Production)

Pour allumer la fonctionnalité, il faut ajouter les "clés" dans l'armoire électrique de Vercel.

1.  Va sur ton dashboard **Vercel** > Ton Projet > **Settings**.
2.  Dans le menu gauche, clique sur **Environment Variables**.
3.  Ajoute les variables suivantes :

| Nom de la variable | Valeur | Environnements à cocher |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_ENABLE_AI_IMAGES` | `true` | ✅ Production, ✅ Preview, ✅ Development |
| `ENABLE_AI_IMAGES` | `true` | ✅ Production, ✅ Preview, ✅ Development |
| `OPENAI_API_KEY` | `sk-proj-...` *(Ta clé OpenAI)* | ✅ Production, ✅ Preview, ✅ Development |

> **Astuce Staging :** Si tu veux tester en "Preview" sans toucher à la "Production", décoche la case "Production" pour les deux variables `ENABLE_...`.

## 2. Redéploiement

Une fois les variables ajoutées, elles ne s'appliquent qu'au **prochain déploiement**.
-   Soit tu fais un nouveau `git push`.
-   Soit tu vas dans l'onglet **Deployments** de Vercel, tu cliques sur les trois petits points du dernier déploiement > **Redeploy**.

## 3. Monitoring & Coûts 💸

Chaque image générée coûte de l'argent sur ton compte OpenAI.
-   **Coût** : ~$0.04 par image (DALL-E 3 Standard).
-   **Risque** : Si le site a beaucoup de trafic, la facture peut monter.
-   **Conseil** : Surveille ton dashboard OpenAI (**Usage**) les premiers jours.

## 4. Rollback (Désactivation d'urgence) 🚨

Si quelque chose ne va pas ou si ça coûte trop cher :
1.  Retourne dans Vercel > **Environment Variables**.
2.  Supprime (ou change en `false`) les variables `NEXT_PUBLIC_ENABLE_AI_IMAGES` et `ENABLE_AI_IMAGES`.
3.  Redéploie.
👉 L'interface reviendra instantanément à la version classique (sans image).
