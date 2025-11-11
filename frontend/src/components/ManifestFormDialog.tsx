import { useState } from "react";
import ManifestForm from "./ManifestForm";


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
    const [loading, setLoading] = useState(false);

    return (
        <div>
            <div className="modal fade show" style={{display: 'block'}} tabIndex={-1} role="dialog" aria-modal="true">
                <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                    <div className="modal-content bg-body-tertiary p-3">
                        <ManifestForm
                            onSubmit={(data) => {
                                const method = job ? 'PUT' : 'POST';
                                const uri = job ? `/api/sessions/${session.id}/manifests/${manifestIndex}` : `/api/sessions/${session.id}/manifests`;
                                const body = JSON.stringify(data);
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
                            }}
                            session={session}
                            loading={loading}
                            manifestIndex={manifestIndex}
                            close={close}
                        />
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </div>
    );
}
