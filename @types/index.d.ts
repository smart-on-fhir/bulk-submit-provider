import { Identifier } from "fhir/r4";

declare global {
    namespace App {

        type SubmissionStatusCode = "in-progress" | "completed" | "stopped";

        /**
         * System of http://hl7.org/fhir/event-status, code of in-progress
         * (default if parameter is omitted), completed or stopped. Values are
         * drawn from the Submission Status Value Set, which constrains the
         * http://hl7.org/fhir/event-status code system. Once a request has been
         * submitted with a submissionStatus of stopped or completed, no
         * additional requests may be submitted for that submitter and
         * submissionId combination.
         */
        interface SubmissionStatusCoding {
            system: "http://hl7.org/fhir/event-status",
            code  : SubmissionStatusCode
        }

        /**
         * The submitter must match a system and code specified by the Data
         * Recipient (coordinated out-of-band or in an implementation guide
         * specific to a use case).
         */
        interface Submitter extends Identifier {
            system: 'http://example.org/fhir/submitter-codes',
            value : 'example-submitter'
        }

        interface Submission {
            id: string;
            owner_id?: string;
            name: string;
            destinationBaseUrl: string;
            createdAt: string;
            status: 'not-started' | 'complete' | 'in-progress' | 'failed' | 'aborted';
            submitter: Submitter;
            progress: number;
            log: JobLogEntry[];
            manifests: SubmissionManifest[];
            authType: 'none' | 'basic' | 'bearer';
            clientId?: string;
            tokenUrl?: string;
            result: null | {
                startedAt  : string
                completedAt: string
                duration   : string
                totalErrors: number
                manifest   : ResultManifest
            }
        }

        interface SubmissionManifest {
            manifestUrl: string;
            fhirBaseUrl: string;
            status: 'not-started' | 'submitting' | 'submitted' | 'aborted' | 'failed' | 'replaced';
            startedAt: string | null;
            completedAt: string | null;
            outputFormat?: string;
            fileRequestHeaders?: HeaderDescriptor[];
        }

        type JobLogEntryLevel = 'info' | 'warn' | 'error';

        interface JobLogEntryJson {
            timestamp: string;
            message: string;
            level: JobLogEntryLevel;
            details?: string;
            request?: JobRequest;
            response?: JobResponse;
            count: number;
        }

        interface JobRequest {
            method : string;
            url    : string;
            headers: object;
            body   : object | null
        }

        interface JobResponse {
            headers   : object;
            body      : object | string;
            status    : number;
            statusText: string;
        }

        interface OutcomeEntry {
            type?: string
            url ?: string
            extension?: {
                manifestUrl?: string
                countSeverity?: {
                    success?: number
                    error?: number
                }
            }
        }

        interface ResultManifest {
            // Servers on the current spec emit `submissionId` at the top level;
            // earlier drafts nested it under `extension`.
            submissionId?: string
            extension?: {
                submissionId: string
            },
            transactionTime: string
            /** Not part of the status manifest in the current spec. */
            request?: string
            requiresAccessToken: boolean
            /** Canonical URL of the logical model. */
            manifestType?: string
            outputFormat?: string
            outputOrganizedBy?: string
            outputOrganizedByDetail?: string
            output?: any[]
            deleted?: any[]
            link?: any[]
            /** OperationOutcome entries. Current spec name. */
            outcome?: OutcomeEntry[]
            /** Pre-rename name for `outcome`, kept for older servers. */
            error?: OutcomeEntry[]
            [key: string]: any;
        }

        interface HeaderDescriptor {
            headerName : string;
            headerValue: string;
        }
    }
}

export {};