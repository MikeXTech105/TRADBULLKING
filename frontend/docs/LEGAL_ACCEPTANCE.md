# Legal acceptance implementation

The frontend requires explicit acceptance of the displayed Terms & Conditions and Privacy Policy before user registration. The checkbox is unchecked by default and validation is enforced before any registration request is sent.

The published `POST /auth/register` contract currently accepts only `name`, `email`, `phone`, and `password`. It does not document an acceptance boolean, timestamp, or terms version. The frontend therefore does not send an unsupported field and does not alter the working registration contract.

## Backend enhancement required before production

The backend should persist evidence of legal acceptance against the created account, ideally including:

- `acceptedTerms: boolean`
- `termsAcceptedAt: timestamp`
- `termsVersion: string`
- the user/account reference

The API contract should define the exact request fields, server-generated timestamp behavior, version validation, re-acceptance requirements, and audit retention. Once published, the frontend metadata in `src/config/platform.js` is ready to supply/display the accepted version.

## Legal-review status

The static documents in `src/content/legalContent.js` are clearly marked draft templates. Operator identity, contacts, refund policy, liability language, privacy practices, governing law, jurisdiction, and any promotional rules require qualified legal review and approval before production launch.

The signup draft stored in session storage contains only `name`, `email`, `phone`, and the checkbox state. Password and confirmation password are deliberately never stored.
