import { v4 as uuidV4 }                    from 'uuid';
import { Parameters, ParametersParameter } from 'fhir/r4';
import db                                  from './db';
import { Log }                             from './Log';
import { formatDuration, sendRequest }     from './utils';
import {
    BASE_URL,
    CODING_ABORTED,
    CODING_COMPLETE,
    CODING_IN_PROGRESS
} from './config';


export default class Submission
{
    /**
     * Unique identifier for the Submission. This ine is in fact editable by
     * the user (but then we have to make sure it's unique in the database).
     */
    public id!: string;

    /**
     * The ID of the user who owns this submission
     */
    public readonly owner_id?: string;

    /**
     * Name the submission (for user convenience)
     */
    public name: string = 'Unnamed Bulk Submission';

    /**
     * The base URL to which the submission is sent
     */
    public destinationBaseUrl!: string;

    /**
     * The time at which the submission was created
     */
    public readonly createdAt: Date = new Date();

    /**
     * The time at which the submission was started (the first manifest was sent)
     */
    public startedAt: Date | null = null;

    public completedAt: Date | null = null;

    /**
     * The identifier of the system. Note that we have a default value here
     * but users can edit this for convenience.
     */
    public submitter: App.Submitter = {
        system: 'http://example.org/fhir/submitter-codes',
        value : 'example-submitter'
    };

    public readonly manifests: App.SubmissionManifest[] = [];
    
    public readonly log: Log;

    /**
     * The location of the status endpoint for this submission is cached here
     */
    private statusLocation: Promise<string> | null = null;

    private poolTimer: NodeJS.Timeout | null = null;

    private resultManifest: App.ResultManifest | null = null;

    private progress: number = 0;

    private aborted = false;

    public constructor({
        destinationBaseUrl,
        name,
        submitter,
        owner_id,
        id
    } : {
        destinationBaseUrl: string
        name?: string
        submitter?: App.Submitter
        owner_id?: string
        id?: string
    }) {

        if (id) {
            this.setId(id);
        } else {
            this.setId(uuidV4());
        }

        this.setDestinationBaseUrl(destinationBaseUrl);
        if (name) {
            this.setName(name);
        }

        if (submitter) {
            this.setSubmitter(submitter);
        }

        if (owner_id) {
            this.owner_id = owner_id;
        }
        this.log = new Log();
    }
    // Setters -----------------------------------------------------------------
    setId(id: string) {
        if (db.sessions.has(id)) {
            throw new Error('Submission with the new ID already exists');
        }
        this.id = id;
    }

    setName(name: string) {
        if (typeof name !== 'string') {
            throw new Error('Submission name must be a string');
        }
        if (!name || name.trim().length === 0) {
            throw new Error('Submission name cannot be empty');
        }
        this.name = name;
    }

    setDestinationBaseUrl(url: string) {
        try {
            new URL(url);
        } catch (e) {
            throw new Error('Invalid destinationBaseUrl');
        }
        this.destinationBaseUrl = url;
    }

    setSubmitter(submitter: App.Submitter) {
        if (!submitter.system || !submitter.value) {
            throw new Error('Submitter must have both system and value');
        }
        this.submitter = submitter;
    }

    get status(): App.Submission['status'] {
        if (this.aborted) {
            return 'aborted';
        }
        if (this.resultManifest) {
            return 'complete';
        }
        if (this.manifests.length === 0) {
            return 'not-started';
        }
        if (this.manifests.some(manifest => manifest.status === 'submitting' || manifest.status === 'submitted')) {
            return 'in-progress';
        }
        if (this.manifests.some(manifest => manifest.status === 'failed')) {
            return 'failed';
        }
        return 'not-started';
    }

    get statusDetails(): any {
        if (this.status !== 'complete') {
            return null;
        }

        return {
            startedAt  : this.startedAt,
            completedAt: this.completedAt,
            duration   : formatDuration(this.completedAt!.getTime() - this.startedAt!.getTime()),
            totalErrors: this.resultManifest!.error.reduce((acc: number, entry: any) => acc + (entry.extension?.countSeverity?.error || 0), 0),
            manifest   : this.resultManifest
        };
    }

    toJSON(): App.Submission {
        return {
            id                : this.id,
            name              : this.name,
            createdAt         : this.createdAt.toISOString(),
            destinationBaseUrl: this.destinationBaseUrl,
            submitter         : this.submitter,
            status            : this.status,
            progress          : this.progress,
            manifests         : this.manifests,
            log               : this.log.toJSON(),
            result            : this.statusDetails
        };
    }

    save() {
        db.sessions.set(this.id, this);
        return this;
    }



    // -------------------------------------------------------------------------
    // Methods to manage manifests within this submission
    // -------------------------------------------------------------------------

    addJob({
        manifestUrl,
        FHIRBaseUrl,
        outputFormat,
        fileRequestHeaders
    }: {
        manifestUrl: string
        FHIRBaseUrl: string
        outputFormat?: string
        fileRequestHeaders?: App.HeaderDescriptor[]
    }) {

        if (this.manifests.find(m => m.manifestUrl === manifestUrl)) {
            throw new Error('Manifest already exists in this submission');
        }

        this.manifests.push({
            manifestUrl,
            FHIRBaseUrl,
            status: 'not-started',
            startedAt: null,
            completedAt: null,
            outputFormat,
            fileRequestHeaders
        });
    }

    /**
     * Remove a manifest from the submission by its manifestUrl
     * @param manifestUrl The URL of the manifest to remove
     */
    removeManifest(manifestUrl: string) {
        const index = this.manifests.findIndex(m => m.manifestUrl === manifestUrl);
        return this.removeManifestAt(index);
    }

    /**
     * Remove a manifest from the submission by its index
     * @param index The index of the manifest to remove
     */
    removeManifestAt(index: number) {
        if (index < 0 || index >= this.manifests.length) {
            throw new Error('Invalid manifest index');
        }

        const removable = ['not-started', 'aborted', 'failed'];
        if (!removable.includes(this.manifests[index].status)) {
            throw new Error('Only manifests with status not-started, aborted or failed can be removed');
        }

        this.manifests.splice(index, 1);
    }

    /**
     * Replace a manifest in the submission with a new one
     */
    async replaceManifest(manifest: App.SubmissionManifest, newManifest: {
        manifestUrl: string,
        FHIRBaseUrl: string,
        outputFormat?: string,
        fileRequestHeaders?: App.HeaderDescriptor[]
    }) {
        this.log.add(
            `Replacing manifest ${JSON.stringify(manifest.manifestUrl)} with ${
            JSON.stringify(newManifest.manifestUrl)}...`
        );

        const parameters: ParametersParameter[] = [
            { name: 'submissionStatus', valueCoding: CODING_IN_PROGRESS },
            { name: 'manifestUrl', valueString: newManifest.manifestUrl },
            { name: 'FHIRBaseUrl', valueString: newManifest.FHIRBaseUrl },
            { name: 'replacesManifestUrl', valueString: manifest.manifestUrl }
        ];

        if (newManifest.outputFormat) {
            parameters.push({ name: 'outputFormat', valueString: newManifest.outputFormat });
        }

        if (newManifest.fileRequestHeaders && newManifest.fileRequestHeaders.length > 0) {
            parameters.push({
                name: 'fileRequestHeaders',
                part: newManifest.fileRequestHeaders.map(header => ({
                    name: 'headerName',
                    valueString: header.headerName
                })).concat(newManifest.fileRequestHeaders.map(header => ({
                    name: 'headerValue',
                    valueString: header.headerValue
                })))
            });
        }

        const { error } = await this.bulkSubmitRequest(parameters);

        if (!error) {
            manifest.status = 'replaced';
            await this.kickoffStatusPolling();
        }

        this.addJob({
            manifestUrl: newManifest.manifestUrl,
            FHIRBaseUrl: newManifest.FHIRBaseUrl
        });

        this.save();

        return this;
    }

    /**
     * Replace a manifest in the submission by its index with a new one
     */
    async replaceManifestAt(index: number, newManifest: {
        manifestUrl: string,
        FHIRBaseUrl: string,
        outputFormat?: string,
        fileRequestHeaders?: App.HeaderDescriptor[]
    }) {
        const manifest = this.manifests[index];
        if (!manifest) {
            throw new Error(`Manifest at index ${index} not found in this submission`);
        }
        console.log(`replacing manifest at index ${index} in submission ${this.id} with new URL: ${newManifest.manifestUrl}`);
        return this.replaceManifest(manifest, newManifest);
    }

    /**
     * Abort a manifest in the submission by its index
     * @param index The index of the manifest to abort
     */
    async abortManifestAt(index: number) {
        const manifest = this.manifests[index];
        if (!manifest) {
            throw new Error(`Manifest at index ${index} not found in this submission`);
        }
        return this.abortManifest(manifest);
    }

    /**
     * Abort a manifest in the submission
     * @param job The manifest to abort
     */
    async abortManifest(job: App.SubmissionManifest) {
        this.log.add(`Aborting manifest ${JSON.stringify(job.manifestUrl)}...`, { level: 'warn' });
        const { error } = await this.bulkSubmitRequest([
            { name: 'submissionStatus', valueCoding: CODING_IN_PROGRESS },
            { name: 'manifestUrl', valueString: `${BASE_URL}/api/manifests/empty` },
            { name: 'FHIRBaseUrl', valueString: job.FHIRBaseUrl },
            { name: 'replacesManifestUrl', valueString: job.manifestUrl }
        ]);
        if (!error) {
            job.status = 'aborted';
        }
        return this;
    }

    ////////////////////////////////////////////////////////////////////////////

    async bulkSubmitRequest(parameters: ParametersParameter[] = []) {
        const result = await sendRequest(
            `${this.destinationBaseUrl}/$bulk-submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                resourceType: 'Parameters',
                parameter: [
                    { name: 'submitter', valueIdentifier: this.submitter },
                    { name: 'submissionId', valueString: this.id },
                    ...parameters
                ]
            } satisfies Parameters)
        });

        this.log.add(`Bulk Submit request${result.error ? ' failed!' : ''}`, {
            request : result.request as App.JobRequest,
            response: result.response as App.JobResponse,
            level   : result.error ? 'error' : 'info',
            details : result.error ? `${result.error}. Look at the response for more information.` : ''
        });

        return result;
    }

    async complete() {
        this.log.add(`Marking bulk submission as complete...`);
        return await this.bulkSubmitRequest([
            { name: 'submissionStatus', valueCoding: CODING_COMPLETE }
        ]);
    }

    async abort() {
        this.log.add(`Marking bulk submission as aborted...`);
        const result = await this.bulkSubmitRequest([
            { name: 'submissionStatus', valueCoding: CODING_ABORTED }
        ]);
        this.aborted = true;
        this.manifests.forEach(m => m.status = 'not-started');
        this.save();
        return result;
    }

    async submitManifest(manifestUrl: string) {
        this.log.add(`Submitting manifest ${JSON.stringify(manifestUrl)}...`);

        const manifest = this.manifests.find(m => m.manifestUrl === manifestUrl);
        if (!manifest) {
            throw new Error(`Manifest with URL ${JSON.stringify(manifestUrl)} not found in this submission`);
        }

        const parameters: ParametersParameter[] = [
            { name: 'submissionStatus', valueCoding: CODING_IN_PROGRESS   },
            { name: 'manifestUrl'     , valueString: manifestUrl          },
            { name: 'FHIRBaseUrl'     , valueString: manifest.FHIRBaseUrl },
        ];

        if (manifest.outputFormat) {
            parameters.push({ name: 'outputFormat', valueString: manifest.outputFormat });
        }

        if (manifest.fileRequestHeaders && manifest.fileRequestHeaders.length > 0) {
            manifest.fileRequestHeaders.forEach(header => {
               parameters.push({
                   name: 'fileRequestHeader',
                   part: [{
                       name: 'headerName',
                       valueString: header.headerName
                   },{
                       name: 'headerValue',
                       valueString: header.headerValue
                   }]
               });
           });
        }

        const { error } = await this.bulkSubmitRequest(parameters);

        if (error) {
            throw error;
        }

        manifest.status = 'submitted';
        if (!this.startedAt) {
            this.startedAt = new Date();
        }

        if (process.env.NODE_ENV !== 'test') {
            await this.kickoffStatusPolling();
        }

        return this;
    }

    

    

    // ==========================================================================

    /**
     * Returns the status location URL provided by the Data Recipient after the
     * submission is initiated.
     */
    async getStatusLocation(): Promise<string> {
        const { error, request, response } = await sendRequest(`${this.destinationBaseUrl}/$bulk-submit-status`, {
            method : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept'      : 'application/fhir+json',
                'Prefer'      : 'respond-async',
            },
            body: JSON.stringify({
                resourceType: 'Parameters',
                parameter: [
                    { name: 'submitter'    , valueIdentifier: this.submitter },
                    { name: 'submissionId' , valueString    : this.id },
                    { name: '_outputFormat', valueString    : 'application/fhir+ndjson' }
                ]
            })
        });

        this.log.add(`Bulk status kick-off request${error ? ' failed' : ''}`, {
            request : request as App.JobRequest,
            response: response as App.JobResponse,
            level   : error ? 'error' : 'info',
            details : error ? `${error}. Look at the response for more information.` : ''
        })

        if (error) {
            throw new Error(error);
        }
                
        const contentLocation = response?.headers['content-location'];
                
        if (!contentLocation) {
            throw new Error('No content-location header in response');
        }

        return contentLocation;
    }

    /**
     * Returns the status location URL provided by the Data Recipient after the
     * submission is initiated. Note that the result is cached on the instance
     * so subsequent calls do not make additional requests.
     * In case of error, null is returned so that the method can try again on
     * the next call instead of caching the failed attempt.
     */
    async getStatusLocationCached(): Promise<string | null> {
        if (!this.statusLocation) {
            this.statusLocation = new Promise(resolve => {
                this.getStatusLocation().then(resolve, (err) => {
                    console.error(`Failed to get status location: ${err.message}`);
                    this.statusLocation = null;
                });
            });
        }
        return this.statusLocation;
    }

    async kickoffStatusPolling() {
        if (!this.poolTimer) {
            const statusUrl = await this.getStatusLocationCached();
            if (!statusUrl) {
                console.error('No status URL available for polling');
                return;
            }

            this.poolTimer = setTimeout(() => this.checkStatus(statusUrl), 1_000);
        }
    }

    async checkStatus(statusUrl: string) {
        if (this.status !== 'in-progress') {
            this.log.add(`Warning: Trying to check status of submissions with status ${this.status}`);
            return this;
        }

        const { res, response, request, error } = await sendRequest(statusUrl)

        const msg = res?.status === 200 ?
            `Status: got ${res?.status} ${res?.statusText}. Submission is now complete!` :
            res?.status === 202 ?
                `Status: ${response?.headers['x-progress'] || this.status}. Next status check in 5 seconds...` :
                res ?
                    `Status: got unexpected response ${res?.status} ${res?.statusText}. Pooling will stop.` :
                    `Status: got no response. Pooling will stop.`;

        this.log.add(msg, {
            request : request as App.JobRequest,
            response: response as App.JobResponse,
            level   : error ? 'error' : 'info',
            details : error || undefined
        })

        if (res?.status === 202) {
            const progress = String(response?.headers['x-progress']).match(/(\d+(\.\d+)?)%/);
            if (progress && progress[1]) {
                this.progress = Math.round(parseFloat(progress[1]));
            }
            this.poolTimer = setTimeout(() => this.checkStatus(statusUrl), 5_000);
        }

        if (res?.status === 200) {
            this.resultManifest = response?.body as App.ResultManifest;
            this.completedAt = new Date();
        }

        return this;
    }
}
