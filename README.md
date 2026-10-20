# Secure SMS Frontend

Production-style React frontend for an end-to-end encrypted messaging product. Messages are encrypted in the browser before they are sent. Private keys stay on the device.

This client talks to an external backend. Endpoint paths are centralized and documented as a **contract to adapt**, not as a guarantee that a specific API already exists.

## Install and run

```bash
cd secure-sms-frontend
npm install
cp .env.example .env
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Axios base URL, e.g. `http://localhost:5000/api` |

Do not hardcode API URLs in components. Do not commit secrets. `.env` is gitignored.

Use HTTPS in production.

## Project structure

```
secure-sms-frontend/
├── public/logo.svg          # replace with public/logo.png if you have a raster logo
├── src/
│   ├── components/          # UI building blocks
│   ├── pages/               # Route screens
│   ├── crypto/              # Isolated cryptography (no UI logging of secrets)
│   ├── services/            # Axios API layer
│   ├── context/             # Auth + chat state
│   ├── routes/AppRoutes.jsx
│   └── utils/validation.js
├── .env.example
└── package.json
```

## Authentication flow

1. User signs in or registers through `authService.js`.
2. JWT is stored in **sessionStorage** (not localStorage).
3. Axios attaches `Authorization: Bearer <token>`.
4. `AuthContext` restores the session on load (`GET /auth/me`, optional `POST /auth/refresh`).
5. After register/login, the client generates a key pair if this device has none.
6. **Only the public key** is sent to the backend (`keyService.js`).
7. Logout clears the token and in-memory chat/auth state.

Protected routes: `/dashboard`, `/chat`, `/chat/:conversationId`, `/contacts`, `/security`, `/profile`.

## Encryption architecture

UI code should call `src/crypto/encryptionManager.js` only.

| Module | Role |
| --- | --- |
| `des.js` | Symmetric encrypt/decrypt. **Not DES.** Uses Web Crypto **AES-GCM-256**. |
| `elgamal.js` | Asymmetric API. **Not classic ElGamal.** Uses Web Crypto **RSA-OAEP-2048**. |
| `keyGenerator.js` | Key pair + session key helpers |
| `keyStorage.js` | IndexedDB persistence; private JWK wrapped with AES-GCM |
| `encryptionManager.js` | `encryptForRecipient` / `decryptReceivedMessage` |

Flow:

1. User writes plaintext in the chat composer.
2. Frontend loads the recipient public key.
3. A random AES-GCM session key encrypts the message.
4. The session key is wrapped with the recipient’s public key.
5. The backend receives `{ payload }` (ciphertext envelope), not plaintext, in encrypted mode.
6. The recipient unwraps the session key locally and decrypts.

The UI shows **End-to-end encrypted**. That is a mode indicator, not a claim of absolute security.

**Development vs production**

- Custom cipher code is easy to get wrong. This app uses browser Web Crypto, not a from-scratch DES/ElGamal implementation.
- IndexedDB is origin-scoped, not a hardware keystore. XSS can still be catastrophic.
- Production should keep Web Crypto (or audited libraries), CSP, HTTPS, and a reviewed backend.
- Do not log passwords or private keys. Do not render private keys in the normal UI.

## Expected backend API contract

Paths are defined in `src/services/api.js` (`ENDPOINTS`). Change them in one place.

### Auth

- `POST /auth/login` body `{ identifier, password }` → `{ token, user }`
- `POST /auth/register` body `{ fullName, username, email, password }` → `{ token, user }`
- `POST /auth/logout`
- `GET /auth/me` → `{ user }`
- `POST /auth/refresh` → `{ token }`
- `PUT /users/me` profile update
- `PUT /users/me/password` `{ currentPassword, newPassword }`

`user` is expected to include `id`, `fullName`, `username`, `email`, `createdAt` when available.

### Keys (public only)

- `POST /keys` `{ publicKey, algorithm, createdAt }`
- `PUT /keys` same shape for rotation
- `GET /keys/:userId` `{ publicKey, algorithm, userId }`
- `GET /keys/status`

Never require the raw private key unless you later add an explicit, wrapped backup design.

### Contacts

- `GET /contacts` → `{ contacts: [...] }`
- `POST /contacts` `{ identifier }`
- `DELETE /contacts/:id`
- `GET /contacts/:id`

### Messages

- `GET /conversations`
- `POST /conversations` `{ participantId }`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages` `{ payload }` where `payload` is the encrypted envelope
- `POST /messages/:id/read`
- `DELETE /messages/:id`

Encrypted envelope:

```json
{
  "version": 1,
  "algorithm": "RSA-OAEP+AES-GCM",
  "wrappedKey": "<base64>",
  "iv": "<base64>",
  "ciphertext": "<base64>",
  "senderPublicKey": "<spki-base64>"
}
```

If the API is down, the UI still loads and shows loading, empty, and error states.

## Logo

`public/logo.svg` is the current mark. You can replace it with `public/logo.png` and point `index.html` / the navbar at that file.
