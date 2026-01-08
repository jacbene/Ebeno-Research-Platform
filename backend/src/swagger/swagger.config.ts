import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(`${__dirname}/../../package.json`, 'utf-8'));

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Ebeno Research Platform API',
    version: packageJson.version,
    description: 'API pour la plateforme de recherche collaborative Ebeno',
    contact: {
      name: 'Équipe Ebeno',
      email: 'contact@ebeno.com',
    },
    license: {
      name: 'Propriétaire',
      url: 'https://ebeno.com/license',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Serveur de développement',
    },
    {
      url: 'https://api.ebeno.com',
      description: 'Serveur de production',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
          },
          error: {
            type: 'string',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          email: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          role: {
            type: 'string',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts',
    './src/docs/*.yaml',
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Ebeno API Documentation',
  explorer: true,
};

export { swaggerSpec };
