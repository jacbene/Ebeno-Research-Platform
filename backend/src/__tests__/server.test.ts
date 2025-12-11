import request from 'supertest';
import app from '../server';

describe('Server API', () => {
  it('should return API information on the root endpoint', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Ebeno Research Platform API');
  });

  it('should return health status on the /api/health endpoint', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });

  it('should return a 404 error for a non-existent route', async () => {
    const response = await request(app).get('/api/non-existent-route');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Route non trouvée');
  });
});
