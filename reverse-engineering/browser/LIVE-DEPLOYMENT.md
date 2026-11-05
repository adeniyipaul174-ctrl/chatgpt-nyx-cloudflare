# Live NyX binary and ZIP file upload fix — 2026-11-05

**Cloudflare Worker:** `chatgpt-nyx-v3-test`  
**New live version:** **181**, id `213cb331-85f0-45af-8e99-f5bb9f27b253`  
**Restorable previous version:** **171**, id `12c3cfab-88a6-4390-b643-c35c8805dc47`.

The uploaded source is built by applying a *minimal UI attachment patch* to the exact deployed version 171 source, fetched from Cloudflare's version API (`include=modules`). The live version 180 source was **not** used, because it is not the version deployed at the time of the fix.

### User-facing behavior

In ordinary NyX chat, select **+ > Upload file** and attach any of:

- ELF/shared libraries: `.so`, `.elf`, `.o`, `.ko`
- Executables: `.exe`, `.dll`, `.bin`, `.dat`, `.wasm`, `.dex`, `.class`
- Archives: `.zip`, `.apk`, `.jar`, `.aar`, `.a`
- Existing document formats remain supported.

`.so`/ELF inspection parses architecture, ELF type, sections, optional dynamic imports/exports and DT_NEEDED libraries, interesting embedded strings, and SHA-256. PE files expose architecture, sections, strings and hash. ZIP files are inspected using JSZip 3.10.1 from cdnjs; up to three embedded binaries of at most 6 MB each are parsed in-browser, plus listing of the first 85 archive entries.

The resulting *static analysis summary* is passed to the existing ordinary chat model as document context. No uploaded executable is run. No actual disassembly or native-code decompilation is performed by this browser-only reader.

**File-size constraints:** 32 MiB for binaries/ZIP/APK/JAR/AAR; 7.5 MB for other document types; 6 MB per unpacked archive binary. Encrypted ZIP members and large binaries cannot be analyzed in-browser.

### Safety / regression preservation

- Existing Web Chat, authentication routes, D1 user records, OpenRouter/Workers AI, image generation, search, and settings logic are unchanged.
- All 13 bindings from live v171 were preserved via strict binding inheritance (AI, browser, D1, ratelimits, existing secret bindings).
- This change is **not** represented by deploying the GitHub repository's outdated root Worker. Do not deploy that root: its README warns about overwriting the live application.
- Cloudflare accepted source code for version 181, and API verification shows version 181 at 100% traffic. Browser/UI end-to-end testing was **not** possible from the connected tool environment.

### Developer verification

```sh
node --check reverse-engineering/browser/binary-reader.js
```

Local focused tests verified synthetic ARM64 ELF parsing with `liblog.so` dependencies, x86-64 PE header recognition, SHA-256, and a simulated ZIP containing an ELF file.

The full native decompilation workflow requires the separate headless Ghidra/IDA runner (not part of this live upload change).
