// backend/tests/unit/languageDetectionService.test.ts
import {
  detectLanguage,
  detectLanguageOrFallback,
} from '../../src/services/languageDetectionService';

describe('languageDetectionService', () => {
  describe('detectLanguage', () => {
    it('détecte le français', () => {
      const result = detectLanguage(
        'Bonjour, ceci est un texte en français qui devrait être détecté correctement. ' +
        'Nous sommes en train de tester la détection automatique de la langue.'
      );

      expect(result.language).toBe('fr');
      expect(result.isSupported).toBe(true);
      expect(['high', 'medium']).toContain(result.confidence);
    });

    it('détecte l\'anglais', () => {
      const result = detectLanguage(
        'Hello, this is a test text in English that should be detected correctly. ' +
        'We are testing the automatic language detection feature.'
      );

      expect(result.language).toBe('en');
      expect(result.isSupported).toBe(true);
    });

    it('détecte l\'espagnol', () => {
      const result = detectLanguage(
        'Hola, este es un texto en español que debería detectarse correctamente. ' +
        'Estamos probando la detección automática de idioma.'
      );

      expect(result.language).toBe('es');
      expect(result.isSupported).toBe(true);
    });

    it('détecte le portugais', () => {
      const result = detectLanguage(
        'Olá, este é um texto em português que deve ser detectado corretamente. ' +
        'Estamos testando a detecção automática de idioma.'
      );

      expect(result.language).toBe('pt');
      expect(result.isSupported).toBe(true);
    });

    it('retourne null pour un texte vide', () => {
      const result = detectLanguage('');
      expect(result.language).toBeNull();
      expect(result.confidence).toBe('none');
    });

    it('retourne null pour un texte trop court', () => {
      const result = detectLanguage('Bonjour');
      expect(result.language).toBeNull();
      expect(result.confidence).toBe('none');
    });

    it('marque comme non supporté une langue inconnue d\'Ebeno', () => {
      // Russe (supporté par tinyld mais pas par Ebeno)
      const result = detectLanguage(
        'Привет, это текст на русском языке, который должен быть определён правильно. ' +
        'Мы тестируем автоматическое определение языка.'
      );

      expect(result.language).toBe('ru');
      expect(result.isSupported).toBe(false);
    });
  });

  describe('detectLanguageOrFallback', () => {
    it('retourne la langue détectée si supportée', () => {
      const result = detectLanguageOrFallback(
        'Hello, this is a test text in English that should be detected correctly.',
        'fr'
      );
      expect(result).toBe('en');
    });

    it('retourne le fallback si détection échoue', () => {
      const result = detectLanguageOrFallback('Bonjour', 'fr');
      expect(result).toBe('fr');
    });

    it('retourne le fallback si langue non supportée', () => {
      const result = detectLanguageOrFallback(
        'Привет, это текст на русском языке, который должен быть определён.',
        'fr'
      );
      expect(result).toBe('fr');
    });
  });
});
