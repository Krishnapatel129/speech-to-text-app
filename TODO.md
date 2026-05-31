# TODO

- [ ] Inspect current Mongo connection logic and socket save/history logic.
- [ ] Implement Mongo URI validation + safer diagnostics in `backend/server.js` (mask credentials; detect mongodb+srv vs mongodb://; optional SRV DNS check).
- [ ] Add graceful socket error handling when DB save/history fails (emit error message; avoid unhandled promise rejections).
- [ ] Restart backend and verify logs.
- [ ] Run DNS test (`node backend/test-dns.js`) and verify behavior.

