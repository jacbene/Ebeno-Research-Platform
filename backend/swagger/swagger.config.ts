// backend/swagger/swagger.config.ts
// Configuration Swagger/OpenAPI 3.0
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ebeno Research Platform API',
      version: '1.0.0',
      description: `
# Ebeno Research Platform - API Documentation

Bienvenue sur la documentation de l'API publique d'Ebeno, une plateforme complète de recherche qualitative assistée par IA.

## 🚀 Accès rapide
- **URL de production**: https://api.ebeno-research.com
- **URL de développement**: https://api.dev.ebeno-research.com
- **Documentation interactive**: https://api.ebeno-research.com/docs

## 🔑 Authentification
L'API utilise OAuth 2.0 et JWT pour l'authentification.

## 📚 Ressources principales
- **Projets**: Gestion des projets de recherche
- **Documents**: Stockage et analyse de documents
- **Transcriptions**: Traitement et analyse de transcriptions
- **Codage**: Système de codage CAQDAS
- **Bibliographie**: Gestion des références
- **Enquêtes**: Création et analyse d'enquêtes
- **Collaboration**: Édition collaborative en temps réel
- **IA**: Services d'intelligence artificielle

## 🎯 Codes de statut HTTP
- 200: Succès
- 201: Créé
- 400: Mauvaise requête
- 401: Non authentifié
- 403: Non autorisé
- 404: Non trouvé
- 429: Trop de requêtes
- 500: Erreur serveur

## 📦 Format des réponses
Toutes les réponses sont au format JSON avec la structure suivante:
\`\`\`json
{
  "success": true,
  "data": {...},
  "meta": {...},
  "error": null
}
\`\`\`
      `,
      contact: {
        name: 'Support Ebeno',
        email: 'support@ebeno-research.com',
        url: 'https://ebeno-research.com/contact'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      termsOfService: 'https://ebeno-research.com/terms'
    },
    servers: [
      {
        url: 'https://api.ebeno-research.com/v1',
        description: 'Serveur de production'
      },
      {
        url: 'https://api.dev.ebeno-research.com/v1',
        description: 'Serveur de développement'
      },
      {
        url: 'http://localhost:3000/v1',
        description: 'Serveur local'
      }
    ],
    components: {
      securitySchemes: {
        OAuth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://ebeno-research.com/oauth/authorize',
              tokenUrl: 'https://ebeno-research.com/oauth/token',
              scopes: {
                'read': 'Accès en lecture',
                'write': 'Accès en écriture',
                'admin': 'Accès administrateur'
              }
            },
            clientCredentials: {
              tokenUrl: 'https://ebeno-research.com/oauth/token',
              scopes: {
                'read': 'Accès en lecture',
                'write': 'Accès en écriture'
              }
            }
          }
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Code d\'erreur'
            },
            message: {
              type: 'string',
              description: 'Message d\'erreur'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Nombre total d\'éléments'
            },
            page: {
              type: 'integer',
              description: 'Page actuelle'
            },
            limit: {
              type: 'integer',
              description: 'Nombre d\'éléments par page'
            },
            pages: {
              type: 'integer',
              description: 'Nombre total de pages'
            },
            hasMore: {
              type: 'boolean',
              description: 'Y a-t-il plus de pages?'
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Non authentifié',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                code: 'UNAUTHORIZED',
                message: 'Token d\'authentification invalide ou manquant'
              }
            }
          }
        },
        Forbidden: {
          description: 'Non autorisé',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                code: 'FORBIDDEN',
                message: 'Vous n\'avez pas les permissions nécessaires'
              }
            }
          }
        },
        NotFound: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                code: 'NOT_FOUND',
                message: 'La ressource demandée n\'existe pas'
              }
            }
          }
        },
        ValidationError: {
          description: 'Erreur de validation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                code: 'VALIDATION_ERROR',
                message: 'Les données fournies sont invalides',
                details: [
                  {
                    field: 'email',
                    message: 'L\'email doit être valide'
                  }
                ]
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Trop de requêtes',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Vous avez dépassé la limite de requêtes'
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentification',
        description: 'Endpoints pour l\'authentification et la gestion des comptes'
      },
      {
        name: 'Projets',
        description: 'Gestion des projets de recherche'
      },
      {
        name: 'Documents',
        description: 'Gestion et analyse des documents'
      },
      {
        name: 'Transcriptions',
        description: 'Traitement des transcriptions audio/vidéo'
      },
      {
        name: 'Codage',
        description: 'Système de codage CAQDAS'
      },
      {
        name: 'Bibliographie',
        description: 'Gestion des références bibliographiques'
      },
      {
        name: 'Enquêtes',
        description: 'Création et analyse d\'enquêtes'
      },
      {
        name: 'Collaboration',
        description: 'Édition collaborative en temps réel'
      },
      {
        name: 'IA',
        description: 'Services d\'intelligence artificielle'
      },
      {
        name: 'Analytics',
        description: 'Statistiques et analytics'
      },
      {
        name: 'Utilisateurs',
        description: 'Gestion des utilisateurs'
      }
    ]
  },
  apis: [
    './backend/controllers/*.ts',
    './backend/routes/*.ts',
    './backend/validators/*.ts'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Ebeno API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3
  }
};

export { swaggerSpec, swaggerUiOptions };
