import { useState } from "react";
import ManifestForm from "./ManifestForm";


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
    const [loading, setLoading] = useState(false);

    return (
        <div>
            <div className="modal fade show" style={{display: 'block'}} tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                    <div className="modal-content bg-body-tertiary p-3 shadow">
                        <ManifestForm
                            onSubmit={(data) => {
                                setLoading(true);
                                fetch(`/api/sessions/${session.id}/manifests/${manifestIndex}/replace`, {
                                    headers: { 'Content-Type': 'application/json' },
                                    method : 'POST',
                                    body   : JSON.stringify(data)
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
                            }}
                            session={session}
                            loading={loading}
                            manifestIndex={manifestIndex}
                            replaceManifestUrl={job.manifestUrl}
                            close={close}
                        />
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </div>
    );
}
