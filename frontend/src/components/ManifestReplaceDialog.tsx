import { useState } from "react";


export default function ManifestReplaceDialog({
    session,
    manifestIndex,
    close
}: {
    session: App.Submission,
    manifestIndex: number,
    close: (s?: App.Submission) => void
}) {
    const job = session.manifests[manifestIndex]!;
    const [manifestUrl       , setManifestUrl       ] = useState('');
    const [FHIRBaseUrl       , setFHIRBaseUrl       ] = useState('');
    const [outputFormat      , setOutputFormat      ] = useState('');
    const [fileRequestHeaders, setFileRequestHeaders] = useState('');
    const [loading           , setLoading           ] = useState(false);

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        fetch(`/api/sessions/${session.id}/manifests/${manifestIndex}/replace`, {
            headers: { 'Content-Type': 'application/json' },
            method : 'POST',
            body   : JSON.stringify({
                newManifestUrl: manifestUrl,
                FHIRBaseUrl,
                outputFormat
            })
        }).then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error('Network response was not ok');
            }
        }).then(data => {
            close(data);
        }).catch(error => {
            console.error('Error replacing manifest:', error);
            alert('Failed to replace manifest. Please try again.');
        }).finally(() => {
            setLoading(false);
        });
    }

    return (
        <div>
            <div className="modal fade show" style={{display: 'block'}} tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                    <div className="modal-content bg-body-tertiary p-3 shadow">
                        <form onSubmit={onSubmit}>
                            <fieldset disabled={loading}>
                                <div className="modal-header border-bottom-0">
                                    <h4 className="modal-title">
                                        <i className='bi bi-pencil-square me-2' />Replace Manifest
                                    </h4>
                                    <button type="button" className="btn-close" aria-label="Close" onClick={() => close()}></button>
                                </div>
                                <div className="modal-body">
                                    <p className="small text-muted mb-5">
                                        The Data Recipient SHALL replace the data in the selected manifest with the one in found the provided manifest URL.
                                        If the url is invalid or the Data Recipient is unable to replace the data, it should respond to the request with an
                                        OperationOutcome describing the error.
                                    </p>
                                    <div className="m-0 p-0" style={{ columns: '2', columnGap: '2rem', columnWidth: '250px' }}>
                                        <div className="mb-3" style={{ breakInside: 'avoid' }}>
                                            <label className="form-label text-primary-emphasis fw-semibold">Manifest Being Replaced</label>
                                            <input type="url" value={job.manifestUrl} disabled className="form-control" />
                                        </div>
                                        <div className="mb-3" style={{ breakInside: 'avoid' }}>
                                            <label className="form-label text-primary-emphasis fw-semibold">New Manifest URL</label>
                                            <datalist id="manifestUrls">
                                                <option value={`${window.location.origin}/api/manifests/1`}>Should export successfully</option>
                                                <option value={`${window.location.origin}/api/manifests/2`}>Has invalid output entry linking to missing file</option>
                                                <option value={`${window.location.origin}/api/manifests/3`}>Has incorrect output entry count values</option>
                                            </datalist>
                                            <input
                                                type="url"
                                                className="form-control"
                                                required
                                                value={manifestUrl}
                                                onChange={e=>setManifestUrl(e.target.value)}
                                                name='manifestUrl'
                                                list="manifestUrls"
                                                autoFocus
                                                onInput={(e) => {
                                                    const input = e.target as HTMLInputElement;
                                                    const value = input.value;
                                                    console.log('Checking manifest URL uniqueness:', value, session.manifests);
                                                    if (session.manifests?.some(manifest => manifest.manifestUrl === value)) {
                                                        input.setCustomValidity('This manifest URL has already been added to the session.');
                                                        input.reportValidity();
                                                    } else {
                                                        input.setCustomValidity('');
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="mb-3" style={{ breakInside: 'avoid' }}>
                                            <label className="form-label text-primary-emphasis fw-semibold">New Manifest FHIR Base Url</label>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={FHIRBaseUrl}
                                                onChange={e=>setFHIRBaseUrl(e.target.value)}
                                                name='FHIRBaseUrl'
                                            />
                                            <div className="small mt-1 text-muted lh-sm opacity-75">
                                                Base url to be used by the Data Recipient when resolving relative references in
                                                the submitted resources.
                                            </div>
                                        </div>
                                        <div className="mb-3" style={{ breakInside: 'avoid' }}>
                                            <label className="form-label text-primary-emphasis fw-semibold">New Manifest Output Format</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder={'Default: application/fhir+ndjson'}
                                                value={outputFormat}
                                                onChange={e=>setOutputFormat(e.target.value)}
                                                name='outputFormat'
                                            />
                                            <div className="small mt-1 text-muted lh-sm opacity-75">
                                                The format for the Bulk Data files in the manifest
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
                                        style={{ width: '9em' }}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary px-4" style={{ width: '9em' }}>
                                        { loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> }
                                        Replace
                                    </button>
                                </div>
                            </fieldset>
                        </form>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </div>
    );
}
