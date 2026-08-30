import { Router, Request, Response } from 'express';

const router = Router();

// Base de connaissances pour la recherche qualitative
const knowledgeBase: Record<string, string> = {
  'analyse qualitative': `L'analyse qualitative est une méthode de recherche qui vise à comprendre en profondeur des phénomènes sociaux, culturels ou humains. Elle repose sur l'interprétation de données non numériques (entretiens, observations, documents) pour en dégager des thèmes, des patterns et des significations. Contrairement à l'approche quantitative, elle privilégie la compréhension contextuelle et subjective.

📌 **Méthodes principales** :
- Entretiens semi-directifs
- Observations participantes
- Analyse de contenu
- Études de cas
- Recherche-action

🔧 **Outils utiles** : NVivo, ATLAS.ti, ou la plateforme Ebeno pour coder et analyser vos données.`,

  'entretien': `L'entretien est une technique de collecte de données qualitative très utilisée en sciences humaines et sociales. Il permet d'accéder aux représentations, aux expériences et aux perspectives des participants.

📌 **Types d'entretiens** :
- **Directif** : questions fermées, peu de liberté
- **Semi-directif** : guide de thèmes, liberté d'expression
- **Non-directif** : liberté totale, peu d'intervention

💡 **Conseils pratiques** :
- Préparez un guide d'entretien
- Enregistrez et transcrivez (utilisez la fonction transcription d'Ebeno)
- Analysez les verbatims par thèmes`,

  'codage': `Le codage est une étape clé de l'analyse qualitative. Il consiste à attribuer des étiquettes (codes) à des segments de données (textes, images, sons) pour les regrouper par thèmes ou concepts.

📌 **Types de codage** :
- **Codage ouvert** : identification des thèmes émergents
- **Codage axial** : mise en relation des catégories
- **Codage sélectif** : intégration autour d'un thème central

🔧 **Bonnes pratiques** :
- Commencez par un codage ouvert
- Utilisez des codes courts et significatifs
- Créez un dictionnaire des codes pour la cohérence
- La plateforme Ebeno vous permet de coder facilement vos transcriptions.`,

  'méthodologie': `La méthodologie est le cadre qui guide votre recherche. Elle définit comment vous allez collecter et analyser vos données.

📌 **Éléments clés d'une méthodologie qualitative** :
1. **Question de recherche** : claire et précise
2. **Terrain** : où et avec qui ?
3. **Méthodes de collecte** : entretiens, observations, documents
4. **Méthodes d'analyse** : codage, analyse thématique, analyse de discours
5. **Considérations éthiques** : consentement, anonymat

📚 **Références utiles** : Miles & Huberman (1994), Paillé & Mucchielli (2012).`,

  'transcription': `La transcription est la conversion d'un enregistrement audio ou vidéo en texte écrit. C'est une étape fondamentale pour l'analyse qualitative.

📌 **Conseils pour une bonne transcription** :
- Utilisez un logiciel de transcription (comme celui d'Ebeno)
- Indiquez les pauses, les rires, les hésitations si pertinent
- Respectez l'anonymat des participants

🔧 **La plateforme Ebeno propose un outil de transcription automatique pour vous faciliter cette étape.`,

  'default': `Merci pour votre question. Je suis votre assistant de recherche sur la plateforme Ebeno.

📌 **Voici quelques conseils généraux** :
1. **Définissez clairement votre question de recherche**
2. **Choisissez une méthodologie adaptée** (qualitative, quantitative, mixte)
3. **Collectez vos données** avec rigueur (entretiens, observations, documents)
4. **Analysez en profondeur** (codage, analyse thématique)
5. **Structurez vos résultats** pour répondre à votre question

💡 **N'hésitez pas à me poser des questions spécifiques sur** :
- L'analyse qualitative
- Les entretiens
- Le codage
- La méthodologie
- La transcription

Je suis là pour vous aider dans votre recherche !`
};

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Messages requis' });
    }

    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    
    // Recherche d'un mot-clé dans la question
    let response = knowledgeBase.default;
    for (const [key, value] of Object.entries(knowledgeBase)) {
      if (lastMessage.includes(key) && key !== 'default') {
        response = value;
        break;
      }
    }

    // Ajouter une introduction personnalisée
    const intro = `🤖 **Assistant de recherche Ebeno**\n\n`;
    
    // Ajouter une conclusion interactive
    const outro = `\n\n❓ **Avez-vous besoin de précisions ?** Je peux approfondir sur :\n- Les méthodes qualitatives\n- Les entretiens\n- Le codage\n- La méthodologie\n- La transcription\n\n💡 **Conseil** : Utilisez la plateforme Ebeno pour gérer vos projets, transcrire vos entretiens et analyser vos données en collaboration.`;

    return res.json({
      success: true,
      data: {
        content: intro + response + outro
      }
    });

  } catch (error: any) {
    console.error('Erreur DeepSeek:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

export default router;
