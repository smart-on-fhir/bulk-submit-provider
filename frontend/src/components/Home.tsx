import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
        <h2>Welcome to the Bulk Submit Provider</h2>
        <p className="lead text-secondary">
            Use this UI to submit and monitor bulk data submission jobs. You can
            start by creating a new submission and configuring its submit destination.
        </p>
        <hr/>
        <div className='text-center my-5'>
            <Link to="/sessions/new" className="btn btn-lg btn-primary">
                Start New Submission
            </Link>
        </div>
    </div>
  );
}
