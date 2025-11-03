import { useEffect, useState } from "react";

export default function Collapse({ header, children, open = false }: { header: React.ReactNode, children: React.ReactNode, open?: boolean }) {

    const [isOpen, setIsOpen] = useState(open);

    useEffect(() => {
        setIsOpen(open);
    }, [open]);

    function toggle() {
        setIsOpen(!isOpen);
    }

    return (
        <div className={`vi-collapse ${isOpen ? 'show' : ''}`}>
            <div className="vi-collapse-header" onClick={toggle}>
                { !!children ?
                    <i className='bi bi-caret-right-fill me-2 small text-muted' /> :
                    <i className='bi bi-dash me-2 small text-muted' /> }
                {header}
            </div>
            <div className="vi-collapse-body">
                {children}
            </div>
        </div>
    )
}