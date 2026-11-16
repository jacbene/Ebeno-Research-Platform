
---

# 🎯 Séquence commit

```bash
cd ~/Ebeno-Research-Platform

# ─── 1. Créer les 2 fichiers (copier-coller ci-dessus) ───
nano INSTALL_SELF_HOSTED.md
nano README_SELF_HOSTED.md

# ─── 2. Stage + commit + push + tag ───
git add INSTALL_SELF_HOSTED.md README_SELF_HOSTED.md
git status

git commit -m "docs(self-hosted): add comprehensive installation guide and README

- INSTALL_SELF_HOSTED.md: 13-section step-by-step guide for university deployment
  * Hardware/software prerequisites (with GPU recommendations)
  * Quick 5-command install
  * Detailed .env configuration with sovereignty notes
  * Ollama model download and verification
  * Admin account creation (UI + CLI)
  * Post-install health checks
  * HTTPS/Nginx reverse proxy setup
  * Backup/restore automation (cron)
  * Update and rollback procedures
  * Troubleshooting (10+ common issues)
  * Disabling Ollama (fallback to cloud mode)
- README_SELF_HOSTED.md: 30-line pitch for academic institutions
  * Sovereignty emphasis
  * Quick install preview
  * Use cases and prerequisites"

git push origin main

git tag -a v2.4.0-selfhosted-docs -m "Documentation: complete self-hosted installation guide for universities"
git push origin v2.4.0-selfhosted-docs
