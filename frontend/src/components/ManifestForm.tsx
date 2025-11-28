import { useState } from "react";


function parseFileRequestHeaders(headers: string): App.HeaderDescriptor[] {
    return headers
        .trim()
        .split(/\s*\n\s*/)
        .map(line => line.split(/\s*\:\s*/).map(s => s.trim()))
        .reduce((acc, [key, value]) => {
            acc.push({ headerName: key, headerValue: value });
            return acc;
        }, [] as App.HeaderDescriptor[]);
}

export default function ManifestForm({
    session,
    manifestIndex,
    loading,
    onSubmit,
    replaceManifestUrl,
    close
}: {
    session: App.Submission,
    manifestIndex?: number,
    loading?: boolean,
    replaceManifestUrl?: string,
    onSubmit(data: {
        manifestUrl: string,
        FHIRBaseUrl: string,
        outputFormat?: string,
        fileRequestHeaders: App.HeaderDescriptor[]
    }): void
    close(): void
}) {
    const job = manifestIndex !== undefined ? session.manifests[manifestIndex] : undefined;
    const [manifestUrl       , setManifestUrl       ] = useState(replaceManifestUrl ? '' : job ? job.manifestUrl  : '');
    const [FHIRBaseUrl       , setFHIRBaseUrl       ] = useState(replaceManifestUrl ? '' : job ? job.FHIRBaseUrl  : '');
    const [outputFormat      , setOutputFormat      ] = useState(replaceManifestUrl ? '' : job ? job.outputFormat : '');
    const [fileRequestHeaders, setFileRequestHeaders] = useState(replaceManifestUrl ? '' : job?.fileRequestHeaders?.length ?
        job.fileRequestHeaders.map(h => h.headerName && h.headerValue ? `${h.headerName}: ${h.headerValue}` : '').join('\n') : ''
    );

    const title = replaceManifestUrl ?
        <><i className='bi bi-pencil-square me-2' />Replace Manifest</> :
        job ?
            <><i className='bi bi-pencil-square me-2' />Edit Manifest</> :
            <><i className='bi bi-plus-circle-fill me-2' />Add Manifest</>;

    const submitBtn = <>
        { loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> }
        { replaceManifestUrl ? 'Replace' : job ? 'Save' : 'Add' }
    </>;

    const defaultBaseUrl = manifestUrl ? new URL(manifestUrl).origin : '';

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
                manifestUrl,
                FHIRBaseUrl: FHIRBaseUrl || defaultBaseUrl,
                outputFormat,
                fileRequestHeaders: parseFileRequestHeaders(fileRequestHeaders)
            });
        }}>
            <fieldset disabled={loading}>
                <div className="modal-header border-bottom-0">
                    <h4 className="modal-title">{ title }</h4>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => close()}></button>
                </div>
                <div className="modal-body">
                    { replaceManifestUrl && (
                        <div className="small text-muted mb-4">
                            The Data Recipient SHALL replace the data in the selected manifest with the one in found the
                            provided manifest URL. If the url is invalid or the Data Recipient is unable to replace the
                            data, it should respond to the request with an OperationOutcome describing the error.
                            <p className="mt-3">
                                <label className="text-danger-emphasis fw-semibold me-2">Manifest Being Replaced:</label>
                                <code>{replaceManifestUrl}</code>
                            </p>
                        </div>
                    )}
                    <div className="mb-4" style={{ columns: '2', columnGap: '2rem', columnWidth: '250px' }}>
                        <div className="mb-3" style={{ breakInside: 'avoid' }}>
                            <label className="form-label text-primary-emphasis fw-semibold">Manifest URL</label>
                            <datalist id="manifestUrls">
                                <option value={`${window.location.origin}/api/manifests/1`}>
                                    Should export successfully
                                </option>
                                <option value={`${window.location.origin}/api/manifests/2`}>
                                    Has invalid output entry linking to missing file
                                </option>
                                <option value={`${window.location.origin}/api/manifests/3`}>
                                    Has incorrect output entry count values
                                </option>
                                <option value={`${window.location.origin}/api/manifests/4`}>
                                    Contains one resource with unexpected resourceType
                                </option>
                                <option value={`${window.location.origin}/api/manifests/5`}>
                                    Contains one resource with invalid resourceType
                                </option>
                            </datalist>
                            <input
                                type="url"
                                className="form-control"
                                required
                                value={manifestUrl}
                                onChange={e=>setManifestUrl(e.target.value)}
                                // placeholder="https://example.com/manifest.json"
                                name='manifestUrl'
                                list="manifestUrls"
                                onInput={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    const value = input.value;
                                    if (session.manifests?.some(manifest => manifest.manifestUrl === value)) {
                                        input.setCustomValidity('This manifest URL has already been added to the session.');
                                        input.reportValidity();
                                    } else {
                                        input.setCustomValidity('');
                                    }
                                }}
                            />
                            <div className="small mt-1 text-muted lh-sm opacity-75">
                                Url pointing to a Bulk Export Manifest with a pre-coordinated FHIR data set.
                            </div>
                        </div>
                        <div className="mb-3" style={{ breakInside: 'avoid' }}>
                            <label className="form-label text-primary-emphasis fw-semibold">FHIR Base Url</label>
                            <input
                                type="url"
                                className="form-control"
                                placeholder={defaultBaseUrl}
                                value={FHIRBaseUrl}
                                onChange={e=>setFHIRBaseUrl(e.target.value)}
                                name='FHIRBaseUrl'
                            />
                            <div className="small mt-1 text-muted lh-sm opacity-75">
                                Base url to be used by the Data Recipient when resolving relative references in
                                the submitted resources. Leave this empty to use the base URL of the manifest.
                            </div>
                        </div>
                        <div className="mb-3" style={{ breakInside: 'avoid' }}>
                            <label className="form-label text-primary-emphasis fw-semibold">Output Format</label>
                            <input
                                type="text"
                                className="form-control"
                                value={outputFormat}
                                onChange={e=>setOutputFormat(e.target.value)}
                                placeholder="Default: application/fhir+ndjson"
                                name='outputFormat'
                            />
                            <div className="small mt-1 text-muted lh-sm opacity-75">
                                The format for the Bulk Data files in the manifest.
                            </div>
                        </div>
                        <div className="mb-3" style={{ breakInside: 'avoid' }}>
                            <label className="form-label text-primary-emphasis fw-semibold">File Request Headers</label>
                            <textarea
                                className="form-control lh-sm"
                                rows={3}
                                placeholder={'Key: Value\nKey: Value'}
                                value={fileRequestHeaders}
                                onChange={e=>setFileRequestHeaders(e.target.value)}
                                name='fileRequestHeaders'
                            />
                            <div className="small mt-1 text-muted lh-sm opacity-75">
                                HTTP headers that the Data Recipient should use when requesting a data file from the Data Sender
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer border-top-0">
                    <button
                        type="button"
                        className="btn btn-secondary opacity-75"
                        onClick={() => close()}
                        style={{ width: '8em' }}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary px-4" style={{ width: '8em' }}>
                        { submitBtn }
                    </button>
                </div>
            </fieldset>
        </form>
    );
}
