import { useState }   from "react";
import SubmissionForm from "./Form";


export default function CreateSession() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (sub: Partial<App.Submission>) => {
        setLoading(true);

        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sub)
            });

            const txt = await res.text();
            
            const data = JSON.parse(txt);

            if (!res.ok) {
                throw new Error(`Failed to create submission: ${txt}`);
            }

            if (data.error) {
                throw new Error(`Failed to create submission: ${data.error}`);
            }

            window.location.href = `/sessions/${data.id}`;
        } catch (error) {
            console.error('Error creating submission:', error);
            alert('Failed to create submission. Please try again.\n' + (error as Error).message);
        } finally {
            setLoading(false);
        }
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