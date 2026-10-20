export default function SecurityInfo() {
  return (
    <div className="card space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">How encryption works here</h2>
      <p>
        Messages are encrypted on your device before they are sent. The server is designed to store ciphertext,
        not readable message text, when encrypted mode is active.
      </p>
      <p>
        Each message uses a one-time symmetric session key (AES-GCM via the Web Crypto API). That session key is
        wrapped with the recipient&apos;s public key (RSA-OAEP). Only a device that holds the matching private key
        can unwrap the session key and read the message.
      </p>
      <p>
        Private keys stay on this device in IndexedDB and are wrapped before persistence. They are not shown in the
        interface and are not sent to the API as part of normal operation.
      </p>
      <p>
        This architecture reduces exposure, but it is not a guarantee of absolute security. Device compromise, XSS,
        phishing, and backend integration mistakes can still put data at risk. Production deployments should keep
        using well-reviewed Web Crypto primitives (or audited libraries), HTTPS, and a carefully reviewed backend
        contract.
      </p>
    </div>
  );
}
