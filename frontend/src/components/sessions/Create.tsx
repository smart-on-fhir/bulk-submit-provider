import { useState }   from "react";
import SubmissionForm from "./Form";


export default function CreateSession() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = (sub: Partial<App.Submission>) => {
        setLoading(true);
        fetch('/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sub)
        }).then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error('Network response was not ok');
            }
        }).then(data => {
            window.location.href = `/sessions/${data.id}`;
        }).catch(error => {
            console.error('Error creating session:', error);
            alert('Failed to create session. Please try again.');
        }).finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="card bg-body-tertiary mt-5 shadow-sm rounded-4" style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div className="card-body p-4">
                <h2>Create Bulk Submission</h2>
                <p className="text-secondary lh-sm">
                    Configure a new bulk data submission session by providing
                    the Recipient Base URL. This will allow you to add one or
                    more manifests and submit them to that destination server.
                </p>
                <br/>
                <SubmissionForm loading={loading} onSubmit={handleSubmit} />
            </div>
        </div>
    );
}