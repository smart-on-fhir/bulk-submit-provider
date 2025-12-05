import { Fragment } from 'react/jsx-runtime';
import './HeadersGrid.css';


export default function HeadersGrid({
    headers = [],
    onChange
}: {
    headers?: App.HeaderDescriptor[]
    onChange: (headers: App.HeaderDescriptor[]) => void
}) {



    return (
        <div className="header-grid border rounded mb-2">
            {headers.map((header, index) => (
                <Fragment key={index}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Header Name"
                        value={header.headerName}
                        onChange={e => onChange(headers.map((h, i) => i === index ? {...h, headerName: e.target.value} : h))}
                    />
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Header Value"
                        value={header.headerValue}
                        onChange={e => onChange(headers.map((h, i) => i === index ? {...h, headerValue: e.target.value} : h))}
                    />
                    <i
                        className="bi bi-trash3 header-grid-delete-icon"
                        onClick={() => onChange(headers.filter((_, i) => i !== index))}
                        title="Delete Header"
                    />
                </Fragment>
            ))}
            <div className="header-grid-add-row" onClick={() => onChange([...headers, { headerName: '', headerValue: '' }])}>
                + Add Header
            </div>
        </div>
    );
}
