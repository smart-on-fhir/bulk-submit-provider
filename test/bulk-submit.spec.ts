import request    from 'supertest';
import { expect } from 'chai';
import createApp  from '../src/app';
import Submission from '../src/Submission';
import db         from '../src/db';
import nock       from 'nock';


describe('Bulk Submit Provider API Requests', () => {
    beforeEach(() => {
        // Mock all requests to 'http://localhost:3333'
        nock('http://localhost:3333')
        .persist() // Keep the mock active for all tests
        .get('/')
        .reply(200, { message: 'Mocked response' })
        .post('/')
        .reply(201, { message: 'Resource created' });
    });

    afterEach(() => {
        // Clean up all nock interceptors after each test
        nock.cleanAll();
    });

    // HackMD Docs -------------------------------------------------------------

    it ('GET /api/hack-md - works', async () => {
        const app = createApp();
        await request(app)
          .get('/api/hack-md')
          .expect(200)
          .expect(res => {
              expect(res.text).to.include('Bulk Submit');
          });
    });

    it ('GET /api/hack-md - catches errors', async () => {
        nock('https://hackmd.io')
            .get('/@argonaut/Sy7wjS81Wg.md')
            .replyWithError('Something went wrong');
        const app = createApp();
        await request(app)
          .get('/api/hack-md')
          .expect(500)
          .expect(res => {
              expect(res.text).to.include('Error fetching markdown');
          });
    });

    // Hosting the empty manifest ----------------------------------------------

    it ('GET /api/manifests/empty', async () => {
        const app = createApp();
        await request(app)
          .get('/api/manifests/empty')
          .expect(200)
          .expect('content-type', /application\/json/)
          .expect(res => {
              expect(res.body).to.have.property('transactionTime').that.is.a('string');
              expect(res.body).to.have.property('requiresAccessToken', false);
              expect(res.body).to.have.property('output').that.is.an('array').that.is.empty;
          });
    });

    // Hosting sample exports --------------------------------------------------

    ([1, 2, 3, 4, 5].forEach(id => {
        it (`GET /api/manifests/${id}`, async () => {
            const app = createApp();
            await request(app)
              .get(`/api/manifests/${id}`)
              .expect(200)
              .expect('content-type', /application\/json/)
              .expect(res => {
                  expect(res.body).to.have.property('transactionTime').that.is.a('string');
                  expect(res.body).to.have.property('requiresAccessToken', false);
                  expect(res.body).to.have.property('output').that.is.an('array').that.is.not.empty;
              });
        });
    }));

    it (`Rejects missing manifests with 404`, async () => {
        const app = createApp();
        await request(app)
            .get(`/api/manifests/missing`)
            .expect(404)
            .expect('content-type', /application\/json/)
            .expect(res => {
                expect(res.body).to.have.property('error', 'Manifest not found');
            });
    });

    // Submissions CRUD --------------------------------------------------------

    it('GET /api/sessions', async () => {
        const app = createApp();

        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Example Bulk Submission'
        });
        db.sessions.set(submission.id, submission);

        await request(app)
        .get('/api/sessions')
        .expect('content-type', /application\/json/)
        .expect(200)
        .expect(res => {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0]).to.have.property('id', submission.id);
        });

        // @ts-ignore
        submission.owner_id = '12345';

        await request(app)
        .get('/api/sessions')
        .set('Cookie', `bulkSubmitProviderSessionId=whatever`)
        .expect('content-type', /application\/json/)
        .expect(200)
        .expect(res => {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(0);
        });
    });

    it('Create new submission - requires destinationBaseUrl', async () => {
        const app = createApp();
        const newSubmission = {};
        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect(/Missing destinationBaseUrl/);
    });

    it('Create new submission - name must be a string', async () => {
        const app = createApp();
        const newSubmission = {
            destinationBaseUrl: 'http://localhost:3333',
            name: 2
        };
        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(500)
            .expect(/Submission name must be a string/);
    });

    it('Create new submission - name must not be empty', async () => {
        const app = createApp();
        const newSubmission = {
            destinationBaseUrl: 'http://localhost:3333',
            name: ' '
        };
        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(500)
            .expect(/Submission name cannot be empty/);
    });

    it('Create new submission - validates destinationBaseUrl', async () => {
        const app = createApp();
        const newSubmission = {
            destinationBaseUrl: 'invalid-url',
            name: 'Valid Name'
        };
        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(500)
            .expect(/Invalid destinationBaseUrl/);
    });

    it('Create new submission - validates submitter', async () => {
        const app = createApp();
        const newSubmission = {
            destinationBaseUrl: 'http://localhost:3333',
            submitter: {},
            name: 'Valid Name'
        };
        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(500)
            .expect(/Submitter must have both system and value/);
    });

    it('Create new submission - works', async () => {
        const app = createApp();
        const newSubmission = {
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Valid Name'
        };
        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(201);
    });

    it('Create new submission - works with owner', async () => {
        const app = createApp();
        const newSubmission = {
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Valid Name'
        };
        await request(app)
            .post('/api/sessions')
            .set('Cookie', `bulkSubmitProviderSessionId=whatever`)
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(201)
            .expect(res => {
                const submission = db.sessions.get(res.body.id);
                expect(submission).to.have.property('owner_id', 'whatever');
            });
    });

    it('Create new submission - works with custom id', async () => {
        const app = createApp();
        const newSubmission = {
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Valid Name',
            id: 'test-id'
        };
        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(201)
            .expect(res => {
                expect(res.body).to.have.property('id', 'test-id');
            });

        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(500)
            .expect(/Submission with the new ID already exists/);
    });

    it('Create new submission - works with custom submitter', async () => {
        const app = createApp();
        const newSubmission = {
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Valid Name',
            submitter: { system: 'http://example.org/system', value: 'submitter-id' }
        };
        await request(app)
            .post('/api/sessions')
            .send(newSubmission)
            .expect('content-type', /application\/json/)
            .expect(201)
            .expect(res => {
                expect(res.body.submitter).to.deep.equal(newSubmission.submitter);
            });
    });

    it('Get Submission by ID - returns 404 if not found', async () => {
        const app = createApp();
        await request(app)
          .get(`/api/sessions/x`)
          .expect('content-type', /application\/json/)
          .expect(404);
    });

    it('Get Submission by ID - respects ownership', async () => {
        const submission = new Submission({ destinationBaseUrl: 'http://localhost:3333', owner_id: 'owner1', name: 'Example Bulk Submission' });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
          .get(`/api/sessions/${submission.id}`)
          .expect('content-type', /application\/json/)
          .expect(403);
    });

    it('Get Submission by ID - works', async () => {
        const submission = new Submission({ destinationBaseUrl: 'http://localhost:3333', name: 'Example Bulk Submission' });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
          .get(`/api/sessions/${submission.id}`)
          .expect('content-type', /application\/json/)
          .expect(200)
          .expect(res => {
              expect(res.body).to.have.property('id', submission.id);
          });
    });

    it ('Update Submission - requires destinationBaseUrl', async () => {
        const submission = new Submission({ destinationBaseUrl: 'http://localhost:3333', name: 'Example Bulk Submission' });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
          .put(`/api/sessions/${submission.id}`)
          .send({ name: 'Updated Name' })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect(/Missing destinationBaseUrl/);
    });

    it ('Update Submission - 404 for missing submissions', async () => {
        const app = createApp();
        await request(app)
          .put(`/api/sessions/nonexistent-id`)
          .send({ destinationBaseUrl: 'http://localhost:3333', name: 'Updated Name' })
          .expect('content-type', /application\/json/)
          .expect(404)
          .expect(/Submission not found/);
    });

    it ('Update Submission - respects ownership', async () => {
        const submission = new Submission({ destinationBaseUrl: 'http://localhost:3333', owner_id: 'owner1', name: 'Example Bulk Submission' });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
          .put(`/api/sessions/${submission.id}`)
          .send({ destinationBaseUrl: 'http://localhost:3333', name: 'Updated Name' })
          .expect('content-type', /application\/json/)
          .expect(403);
    });

    it ('Update Submission - works', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Example Bulk Submission'
        });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
            .put(`/api/sessions/${submission.id}`)
            .send({
                destinationBaseUrl: 'http://localhost:4444',
                name: 'Updated Name',
                submitter: { system: 'http://example.org/system', value: 'submitter-id' },
                id: 'new-id-attempt'
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect(res => {
                expect(res.body).to.have.property('id', submission.id);
                expect(res.body).to.have.property('name', 'Updated Name');
                expect(res.body).to.have.property('destinationBaseUrl', 'http://localhost:4444');
                expect(res.body).to.have.property('id', 'new-id-attempt');
                expect(res.body.submitter).to.deep.equal({ system: 'http://example.org/system', value: 'submitter-id' });
            });
    });

    // Delete Submission -------------------------------------------------------

    it ('Delete Submission - 404 for missing submissions', async () => {
        const app = createApp();
        await request(app)
          .delete(`/api/sessions/nonexistent-id`)
          .expect('content-type', /application\/json/)
          .expect(404)
          .expect(/Submission not found/);
    });

    it ('Delete Submission - respects ownership', async () => {
        const submission = new Submission({ destinationBaseUrl: 'http://localhost:3333', owner_id: 'owner1', name: 'Example Bulk Submission' });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
          .delete(`/api/sessions/${submission.id}`)
          .expect('content-type', /application\/json/)
          .expect(403);
    });

    it ('Delete Submission - works', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Example Bulk Submission'
        });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
            .delete(`/api/sessions/${submission.id}`)
            .expect(204);
    });

    // Add Manifest ------------------------------------------------------------
    it ('Add Manifest - requires manifestUrl', async () => {
        const app = createApp();
        await request(app)
          .post(`/api/sessions/nonexistent-id/submit-manifest`)
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect(/Missing manifestUrl parameter/);
    });

    it ('Add Manifest - 404 for missing submissions', async () => {
        const app = createApp();
        await request(app)
          .post(`/api/sessions/nonexistent-id/submit-manifest`)
          .send({ manifestUrl: 'http://example.org/manifest.json' })
          .expect('content-type', /application\/json/)
          .expect(404)
          .expect(/Submission not found/);
    });

    it ('Add Manifest - respects ownership', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            owner_id: 'owner1',
            name: 'Example Bulk Submission'
        });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
          .post(`/api/sessions/${submission.id}/submit-manifest`)
          .send({ manifestUrl: 'http://example.org/manifest.json' })
          .expect('content-type', /application\/json/)
          .expect(403);
    });

    it ('Add Manifest - catches errors', async () => {
        nock('http://localhost:3333')
          .post('/$bulk-submit')
          .reply(500, "Internal Server Error");

        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Example Bulk Submission'
        });
        submission.addJob({ manifestUrl: 'http://localhost:3333/manifest.json', fhirBaseUrl: 'http://fhirserver' });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
            .post(`/api/sessions/${submission.id}/submit-manifest`)
            .send({ manifestUrl: 'http://localhost:3333/manifest.json' })
            .expect('content-type', /application\/json/)
            .expect(res => {
                const submission = res.body as App.Submission;
                expect(submission.log.some(entry => entry.message.includes('Bulk Submit request failed!'))).to.be.true;
            });
    });

    it ('Add Manifest - works', async () => {
        nock('http://localhost:3333').post('/$bulk-submit').reply(200, {});
        nock('http://localhost:3333').post('/$bulk-submit-status').reply(200, {
            // 'x-progress': '50%',
            'content-location': 'http://localhost:3333/status/123'
        });

        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Example Bulk Submission'
        });
        submission.addJob({ manifestUrl: 'http://localhost:3333/manifest.json', fhirBaseUrl: 'http://fhirserver' });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
          .post(`/api/sessions/${submission.id}/submit-manifest`)
          .send({ manifestUrl: 'http://localhost:3333/manifest.json' })
          .expect('content-type', /application\/json/)
          .expect(200);
    });

    // Complete Submission by ID -----------------------------------------------

    it ('Complete Submission - rejects for missing submissions', async () => {
        const app = createApp();
        await request(app)
            .post(`/api/sessions/nonexistent-id/complete`)
            .expect('content-type', /application\/json/)
            .expect(404)
            .expect(res => {
                expect(res.body).to.have.property('error', 'Submission not found');
            });
    });

    it ('respects ownership', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            owner_id: 'owner1',
            name: 'Example Bulk Submission'
        });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
            .post(`/api/sessions/${submission.id}/complete`)
            .expect('content-type', /application\/json/)
            .expect(403);
    });

    it ('Complete Submission - works', async () => {
        nock('http://localhost:3333')
            .post('/$bulk-submit')
            .reply(200, {});
        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Example Bulk Submission'
        });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
            .post(`/api/sessions/${submission.id}/complete`)
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect(res => {
                expect(res.body).to.have.property('id', submission.id);
            });
    });

    // Abort Manifest ----------------------------------------------------------
    it ('Abort Manifest - rejects for missing submissions', async () => {
        const app = createApp();
        await request(app)
            .post(`/api/sessions/nonexistent-id/manifests/1/abort`)
            .send()
            .expect('content-type', /application\/json/)
            .expect(404)
            .expect(res => {
                expect(res.body).to.have.property('error', 'Submission not found');
            });
    });

    it ('respects ownership', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            owner_id: 'owner1',
            name: 'Example Bulk Submission'
        });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
            .post(`/api/sessions/${submission.id}/manifests/1/abort`)
            .send()
            .expect(403);
    });

    it ('Abort Manifest - error on missing manifest', async () => {
        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Example Bulk Submission'
        });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
            .post(`/api/sessions/${submission.id}/manifests/1/abort`)
            .send()
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect(/Manifest at index 1 not found in this submission/);
    });

    it ('Abort Manifest - works', async () => {
        nock('http://localhost:3333')
            .post('/$bulk-submit')
            .reply(200, {});
        const submission = new Submission({
            destinationBaseUrl: 'http://localhost:3333',
            name: 'Example Bulk Submission'
        });
        submission.addJob({
            manifestUrl: 'http://example.org/manifest.json',
            fhirBaseUrl: 'http://fhirserver'
        });
        db.sessions.set(submission.id, submission);
        const app = createApp();
        await request(app)
            .post(`/api/sessions/${submission.id}/manifests/0/abort`)
            .send()
            .expect('content-type', /application\/json/)
            .expect(200);
    });
});
