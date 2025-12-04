import { randomBytes } from "crypto";
import jwt             from "jsonwebtoken";
import jose            from "node-jose"


export const createAuthenticator = function({
    tokenUrl,
    clientId,
    privateKey,
    tokenLifetimeSec = 300
}: {
    tokenUrl        ?: string,
    clientId        ?: string,
    privateKey      ?: object,
    tokenLifetimeSec?: number
}) {
    let _accessToken: string | null = null;
    let _accessTokenExpiresAt = 0;

    return async function getAccessToken(): Promise<string | null> {

        // If we don't have the required configuration, return null to skip
        // authentication.
        if (!tokenUrl || !clientId || !privateKey) {
            return null;
        }

        // If we already have a token, and it's not expired or going to expire
        // soon, return it.
        if (_accessToken && _accessTokenExpiresAt - 10 > Date.now() / 1000) {
            return _accessToken;
        }

        const claims = {
            iss: clientId,
            sub: clientId,
            aud: tokenUrl,
            exp: Math.round(Date.now() / 1000) + tokenLifetimeSec,
            jti: randomBytes(10).toString("hex")
        };

        const privateJWK = await jose.JWK.asKey(privateKey, "json");
        const privatePEM = privateJWK.toPEM(true);

        const token = jwt.sign(claims, privatePEM, {
            algorithm: privateJWK.alg as jwt.Algorithm,
            keyid: privateJWK.kid
        });

        const authResponse = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                scope: "system/bulk-submit",
                grant_type: "client_credentials",
                client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                client_assertion: token
            })
        });

        const txt = await authResponse.text();

        let json = null;
        try { json = JSON.parse(txt); } catch {}
        
        if (!authResponse.ok) {
            throw new Error(
                `Failed to obtain access token: ${authResponse.status} ${
                authResponse.statusText}: ${json && json.error && json.error_description ? json.error_description || json.error : txt}`
            );
        }
        
        const authResponseJson = json;

        if (!authResponseJson.access_token || !authResponseJson.expires_in) {
            throw new Error(`Invalid access token response: ${JSON.stringify(authResponseJson)}`);
        }

        _accessToken = authResponseJson.access_token;
        _accessTokenExpiresAt = Math.floor(Date.now() / 1000) + authResponseJson.expires_in;

        return _accessToken;
    };
};

// Usage example:
// const getAccessToken = createAuthenticator({
//     tokenUrl: "https://example.com/token",
//     clientId: "client-id",
//     privateKey: "private-key"
// });
export default createAuthenticator;
