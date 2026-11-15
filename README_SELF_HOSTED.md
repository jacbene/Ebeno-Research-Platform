
---

# 📄 `README_SELF_HOSTED.md` — Pitch universités (30 lignes)

**À placer à la racine du repo.**

```markdown
# Ebeno Research Platform — Édition Self-Hosted

> 🔒 **Souveraineté totale sur vos données de recherche**

Ebeno Research est une plateforme CAQDAS (Computer-Assisted Qualitative Data Analysis) conçue pour les universités et centres de recherche. Cette édition **Self-Hosted** vous permet de déployer l'intégralité de la plateforme **sur vos propres serveurs**, sans dépendance à un service cloud tiers.

## ✨ Points clés

- 🦙 **IA locale** via Ollama : analyse thématique, résumés, traductions, chat — tout est traité sur votre serveur
- 🔐 **Aucune donnée de recherche envoyée à des tiers** (sauf fallback cloud explicitement activé)
- 🐳 **Déploiement Docker en 5 minutes** : `docker compose up -d`
- 💰 **Aucun coût récurrent** (pas d'abonnement IA)
- 🌍 **Interface multilingue** : FR, EN, ES, PT, AR
- 📊 **CAQDAS complet** : codage, analyse thématique, co-occurrence, mémos, nuages de mots
- 🤝 **Collaboration temps réel** (Socket.IO)
- 📱 **PWA installable** (mobile + desktop)

## 🚀 Installation en 5 commandes

```bash
git clone https://github.com/<votre-org>/Ebeno-Research-Platform.git
cd Ebeno-Research-Platform
cp backend/.env.example backend/.env
# Éditer JWT_SECRET et OLLAMA_URL dans backend/.env (voir INSTALL_SELF_HOSTED.md)
docker compose up -d
