import request   from 'supertest';
import createApp from '../src/app';


describe('Bulk Submit Provider', () => {
    it('GET /api/sessions', async () => {
        const app = createApp();
        await request(app)
          .get('/api/sessions')
          .expect('content-type', /application\/json/)
          .expect(200);
    });
});
