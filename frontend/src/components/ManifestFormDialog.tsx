import { useState } from "react";


export default function ManifestFormDialog({
    session,
    manifestIndex,
    close
}: {
    session: App.Submission,
    manifestIndex?: number,
    close: (s?: App.Submission) => void
}) {
    const job = manifestIndex !== undefined ? session.manifests[manifestIndex] : undefined;
    const [manifestUrl , setManifestUrl ] = useState(job ? job.manifestUrl : '');
    const [FHIRBaseUrl , setFHIRBaseUrl ] = useState(job ? job.FHIRBaseUrl : '');
    const [outputFormat, setOutputFormat] = useState('');
    const [loading     , setLoading     ] = useState(false);

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        const method = job ? 'PUT' : 'POST';
        const uri = job ? `/api/sessions/${session.id}/manifests/${manifestIndex}` : `/api/sessions/${session.id}/manifests`;
        const body = JSON.stringify({
            manifestUrl,
            outputFormat,
            FHIRBaseUrl
        });

        setLoading(true);

        fetch(uri, {
            headers: { 'Content-Type': 'application/json' },
            method,
            body
        }).then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error('Network response was not ok');
            }
        }).then(data => {
            close(data);
        }).catch(error => {
            console.error('Error adding manifest:', error);
            alert('Failed to add manifest. Please try again.');
        }).finally(() => {
            setLoading(false);
        });
    }

    return (
        <div>
            <div className="modal fade show" style={{display: 'block'}} tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-md modal-dialog-centered" role="document">
                    <div className="modal-content bg-body-tertiary p-3">
                        <form onSubmit={onSubmit}>
                            <fieldset disabled={loading}>
                                <div className="modal-header border-bottom-0">
                                    <h4 className="modal-title">
                                        { job ?
                                            <><i className='bi bi-pencil-square me-2' />Edit Manifest</> :
                                            <><i className='bi bi-plus-circle-fill me-2' />Add Manifest</>}
                                        </h4>
                                    <button type="button" className="btn-close" aria-label="Close" onClick={() => close()}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label text-primary-emphasis fw-semibold">Manifest URL</label>
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
                                            placeholder="https://example.com/manifest.json"
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
                                    <div className="mb-3">
                                        <label className="form-label text-primary-emphasis fw-semibold">FHIR Base Url</label>
                                        <input
                                            type="url"
                                            className="form-control"
                                            required
                                            placeholder="https://fhirserver.com/fhir"
                                            value={FHIRBaseUrl}
                                            onChange={e=>setFHIRBaseUrl(e.target.value)}
                                            name='FHIRBaseUrl'
                                        />
                                        <div className="small mt-1 text-muted lh-sm opacity-75">
                                            Base url to be used by the Data Recipient when resolving relative references in
                                            the submitted resources.
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary-emphasis fw-semibold">Output Format</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={outputFormat}
                                            onChange={e=>setOutputFormat(e.target.value)}
                                            placeholder="e.g. application/fhir+ndjson"
                                            name='outputFormat'
                                        />
                                        <div className="small mt-1 text-muted lh-sm opacity-75">
                                            The format for the Bulk Data files in the manifest.
                                        </div>
                                    </div>
                                    {/* <div className="mb-3">
                                        <label className="form-label text-primary">fileRequestHeaders</label>
                                        TODO
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary">oauthMetadataUrl</label>
                                        TODO
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary">fileEncryptionKey</label>
                                        TODO
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary">metadata</label>
                                        TODO
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-primary">import</label>
                                        TODO
                                    </div> */}
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
                                        { loading && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> }
                                        { job ? 'Save' : 'Add'}
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
