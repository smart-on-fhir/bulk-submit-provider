import { FormEvent, useReducer } from "react"


export const BACKEND_BASE_URL = process.env.NODE_ENV === "production" ?
    window.location.origin :
    "http://127.0.0.1:3456"

interface State {
    jwksUrl      : string
    jwks         : string
    jwksError    : string
    err          : string
    dur          : number
    loading      : boolean
    error        : Error | string | null
    assertion    : string
    matchServer  : string
    keyType      : "url" | "inline" | "sample" | "none"
    sampleAlg    : "ES384" | "RS384"
    mode         : "normal" | "fake" | "remote"
    proxyClientId: string
    proxyScope   : string
    proxyJWK     : string
}

type setJwksUrlAction       = { type: "setJwksUrl"      , payload: State["jwksUrl"] }
type setJwksAction          = { type: "setJwks"         , payload: State["jwks"] }
type setErrAction           = { type: "setErr"          , payload: State["err"] }
type setDurAction           = { type: "setDur"          , payload: State["dur"] }
type setLoadingAction       = { type: "setLoading"      , payload: State["loading"] }
type setErrorAction         = { type: "setError"        , payload: State["error"] }
type setAssertionAction     = { type: "setAssertion"    , payload: State["assertion"] }
type setMatchServerAction   = { type: "setMatchServer"  , payload: State["matchServer"] }
type setKeyTypeAction       = { type: "setKeyType"      , payload: State["keyType"] }
type setSampleAlgAction     = { type: "setSampleAlg"    , payload: State["sampleAlg"] }
type setModeAction          = { type: "setMode"         , payload: State["mode"] }
type setProxyClientIdAction = { type: "setProxyClientId", payload: State["proxyClientId"] }
type setProxyScopeAction    = { type: "setProxyScope"   , payload: State["proxyScope"] }
type setProxyJWKAction      = { type: "setProxyJWK"     , payload: State["proxyJWK"] }
type mergeAction            = { type: "merge"           , payload: Partial<State> }

type Action = setJwksUrlAction | setJwksAction | mergeAction | setErrAction |
    setDurAction | setLoadingAction | setErrorAction | setAssertionAction |
    setMatchServerAction | setKeyTypeAction | setSampleAlgAction | 
    setModeAction | setProxyClientIdAction | setProxyScopeAction | setProxyJWKAction

const initialState: State = {
    jwksUrl      : "",
    jwks         : "",
    jwksError    : "",
    err          : "",
    dur          : 0,
    loading      : false,
    error        : null,
    assertion    : "",
    matchServer  : "",
    keyType      : "url",
    sampleAlg    : "ES384",
    mode         : "normal",
    proxyClientId: "",
    proxyJWK     : "",
    proxyScope   : ""
}

function reducer(state: State, action: Action): State {
    const { type, payload } = action
    switch (type) {
        case "setJwksUrl"      : return { ...state, jwksUrl      : payload }
        case "setErr"          : return { ...state, err          : payload }
        case "setDur"          : return { ...state, dur          : payload }
        case "setLoading"      : return { ...state, loading      : payload }
        case "setAssertion"    : return { ...state, assertion    : payload }
        case "setMatchServer"  : return { ...state, matchServer  : payload }
        case "setKeyType"      : return { ...state, keyType      : payload }
        case "setSampleAlg"    : return { ...state, sampleAlg    : payload }
        case "setMode"         : return { ...state, mode         : payload }
        case "setProxyClientId": return { ...state, proxyClientId: payload }
        case "setProxyJWK"     : return { ...state, proxyJWK     : payload }
        case "setProxyScope"   : return { ...state, proxyScope   : payload }
        
        case "setJwks": {
            const out = { ...state, jwks: payload, jwksError: "" }
            try {
                const json = JSON.parse(payload)
                if (!json || typeof json !== "object") {
                    out.jwksError = "Not a JSON object"
                }
            } catch {
                out.jwksError = "Not a valid JSON"
            }
            return out
        }

        

        case "merge": return { ...state, ...payload }
    }
    return state
}

export default function ClientRegistration() {

    const [state, dispatch] = useReducer(reducer, initialState)

    const {
        jwksUrl, jwks, jwksError, err, dur, loading, error, assertion,
        matchServer, keyType, sampleAlg, mode,
        proxyClientId, proxyJWK, proxyScope
    } = state

    function onSubmit(e: FormEvent) {
        e.preventDefault()
        dispatch({ type: "merge", payload: { loading: true, err: "" }})

        let body = new URLSearchParams({ err, accessTokensExpireIn: dur + "" })

        if (keyType === "url") {
            body.set("jwks_url", jwksUrl)
        }
        else if (keyType === "inline") {
            body.set("jwks", JSON.stringify({keys:[JSON.parse(jwks)]}))
        }
        else if (keyType === "sample") {
            body.set("jwks_url", `${BACKEND_BASE_URL}/keys/${sampleAlg}.jwks.json`)
        }

        if (mode === "fake") {

        } else if (mode === "remote") {
            body.set("matchServer"  , matchServer  )
            body.set("proxyClientId", proxyClientId)
            body.set("proxyJWK"     , proxyJWK     )
            body.set("proxyScope"   , proxyScope   )
        }

        fetch("/auth/register", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body
        })
        .then(res => {
            return res.text().then(txt => {
                if (!res.ok) {
                    throw txt
                }
                return txt
            })
        })
        .then(result => dispatch({ type: "setAssertion", payload: result }))
        .catch(e => dispatch({ type: "setError", payload: e }))
        .finally(() => dispatch({ type: "setLoading", payload: false }))
    }

    return (
        <form onSubmit={onSubmit} className="mb-5">
            { error && <div className="alert alert-danger">{ error + "" }</div> }
            
            <h5 className="text-primary-emphasis"><i className="bi bi-shield-lock" /> Public Key</h5>
            <div className="my-2 bg-primary-subtle" style={{ height: 2 }} />
            <div className="row mt-3">
                <div className="col-lg-6 mb-5">
                    <div className="form-check mb-3">
                        <label className="form-check-label">
                            <input className="form-check-input" type="radio" name="keyType" checked={ keyType === "url" } onChange={() => dispatch({ type: "setKeyType", payload: "url" })} />
                            Fetch the key from JWKS URL (<b>recommended</b>)
                            <div className="form-text mt-0 lh-sm"><small>Provide an URL to your JWKS containing your public key(s)</small></div>
                        </label>
                    </div>
                    <div className="form-check mb-3">
                        <label className="form-check-label">
                            <input className="form-check-input" type="radio" name="keyType" checked={ keyType === "inline" } onChange={() => dispatch({ type: "setKeyType", payload: "inline" })} />
                            Provide the key now
                            <div className="form-text mt-0 lh-sm"><small>Register your public key as JWK</small></div>
                        </label>
                    </div>
                    <div className="form-check mb-3">
                        <label className="form-check-label">
                            <input className="form-check-input" type="radio" name="keyType" checked={ keyType === "sample" } onChange={() => dispatch({ type: "setKeyType", payload: "sample" })} />
                            Use our example keys
                            <div className="form-text mt-0 lh-sm"><small>Use our sample pair of keys (<span className="text-danger">for testing only</span>)</small></div>
                        </label>
                    </div>
                    <div className="form-check">
                        <label className="form-check-label">
                            <input className="form-check-input" type="radio" name="keyType" checked={ keyType === "none" } onChange={() => {
                                dispatch({ type: "setKeyType", payload: "none" });
                                if (mode === "remote") {
                                    dispatch({ type: "merge", payload: { mode: "normal" }})
                                }
                            }} />
                            None
                            <div className="form-text mt-0 lh-sm"><small>Use the server without authentication</small></div>
                        </label>
                    </div>
                </div>
                <div className="col-lg-6 mb-5">
                    { keyType === "url" && <>
                        <label htmlFor="jwks-url" className="form-label text-primary-emphasis">JWKS URL</label>
                        <input type="url" className="form-control" id="jwks-url" value={jwksUrl} onChange={e => dispatch({ type: "setJwksUrl", payload: e.target.value })} placeholder="https://yourdomain.com/your-public-jwks.json" />
                        <div className="form-text lh-sm">
                            <small>
                            This URL communicates the TLS-protected endpoint where the client's public JWK Set can
                            be found. This endpoint SHALL be accessible without client authentication or authorization.
                            Allows a client to rotate its own keys by updating the hosted content at the JWK Set URL and
                            avoids the need for the FHIR authorization server to maintain and protect the JWK Set.
                            </small>
                        </div>
                    </> }
                    { keyType === "inline" && <>
                        <div className="d-flex justify-content-between">
                            <label className="form-label text-primary-emphasis">Public Key JWK</label>
                            <div className="form-label text-danger"><small>{ jwks ? jwksError : "" }</small></div>
                        </div>
                        <textarea className="form-control form-control-sm font-monospace" rows={13} placeholder="{ Public Key as JWK }" style={{
                            whiteSpace: "pre",
                            lineHeight: 1.2,
                            fontSize: "13px"
                        }} value={jwks} onChange={e => dispatch({ type: "setJwks", payload: e.target.value })} />
                    </> }
                    { keyType === "sample" && <>
                        <div className="input-group">
                            <span className="input-group-text">Key Type:</span>
                            <select className="form-select" value={sampleAlg} onChange={e => dispatch({ type: "setSampleAlg", payload: e.target.value as any })}>
                                <option value="ES384">ES384</option>
                                <option value="RS384">RS384</option>
                            </select>
                        </div>
                        <div className="form-text mt-3">
                            <i className="bi bi-info-circle-fill text-primary me-2" />
                            The server will verify your token signature using the public key found at:
                            <ul>
                                <li><a href={`${BACKEND_BASE_URL}/keys/${sampleAlg}.jwks.json`} target="_blank" rel="noreferrer">{BACKEND_BASE_URL}/keys/{sampleAlg}.jwks.json</a></li>
                            </ul>
                            <i className="bi bi-info-circle-fill text-primary me-2" />
                            A client must sign tokens with the private key found at:
                            <ul className="mb-0">
                                <li><a href={`${BACKEND_BASE_URL}/keys/${sampleAlg}.private.json`} target="_blank" rel="noreferrer">{BACKEND_BASE_URL}/keys/{sampleAlg}.private.json</a></li>
                                <li><a href={`${BACKEND_BASE_URL}/keys/${sampleAlg}.private.pem`} target="_blank" rel="noreferrer">{BACKEND_BASE_URL}/keys/{sampleAlg}.private.pem</a></li>
                            </ul>
                        </div>
                    </> }
                </div>
            </div>
            
            <div className="my-4 mt-5 bg-primary-subtle" style={{ height: 2 }} />

            { keyType !== "none" && !!assertion && <>
                <div className="d-flex justify-content-between mb-1">
                    <b className="text-primary-emphasis">Your Client ID:</b>
                    <span
                        className="copy-btn"
                        onClick={() => copy(assertion)}
                    >Copy <i className="bi bi-clipboard-check" /></span>
                </div>
                <textarea className="form-control text-primary-emphasis form-control-sm bg-light" rows={4} value={assertion} readOnly/>
            </> }
        </form>
    )
}

async function copy(txt: string) {
    try {
        await navigator.clipboard.writeText(txt);
    } catch (err) {
        console.error('Failed to copy text to clipboard:', err);
        alert('Failed to copy text to clipboard.');
    }
}
