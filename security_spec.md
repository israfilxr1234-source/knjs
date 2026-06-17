# Firebase Security Specification - OrgSync

## 1. Data Invariants
- A `Notice`, `Event`, or `FundRecord` must have a valid non-empty title/description and timestamp.
- `Member` documents must be keyed by the user's Auth UID.
- Only users with `role == 'admin'` can create/update `notices`, `events`, and `funds`.
- All members can read `members`, `notices`, `events`, and `funds`.
- A member can only update their own profile (except for their role).

## 2. The "Dirty Dozen" (Attack Payloads)

1. **Identity Spoofing**: A user tries to create a `Member` document with `userId` of another person.
2. **Privilege Escalation**: A member tries to update their own document to set `role: 'admin'`.
3. **Ghost Notice**: A non-admin user tries to post a notice.
4. **Fund Poisoning**: A user tries to delete a `FundRecord` (admins only).
5. **ID Poisoning**: Creating a notice with a 2KB string as ID.
6. **Denial of Wallet**: Sending a massive array of tags in a notice.
7. **Temporal Fraud**: Setting `createdAt` of a notice to the future or past (must be `request.time`).
8. **Shadow Field**: Adding `isVerified: true` to a notice payload.
9. **Relational Sync Break**: Posting a `FundRecord` linked to a non-existent `memberId`.
10. **State Shortcut**: Updating a fund record's type from `donation` to something else (immutability).
11. **PII Leak**: A non-signed-in user trying to list all member phone numbers.
12. **Blanket Query**: Requesting all funds without being signed in.

## 3. Test Runner
(I'll implement the rules first, then valid them)
