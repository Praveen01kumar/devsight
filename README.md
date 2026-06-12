# DevSight Developer Toolbox

[cite_start]DevSight is a modern, high-performance, developer toolbox with 100% offline, privacy-focused utilities including JSON formatters, JWT decoders, security tools, and state generators[cite: 1]. [cite_start]All application logic and data processing execute completely client-side within your local browser sandbox, ensuring that sensitive variables, configurations, or credentials are never transmitted to external servers[cite: 25, 26, 45, 78].

---

## 📂 Feature Categories

The toolbox organizes its specialized utilities into distinct domain modules:

* [cite_start]**Text & Document Utilities (`text-utilities`):** Format, convert, clean, analyze, compare, and compile text, markdown, and code logs 100% locally[cite: 2].
* [cite_start]**JSON Utilities (`json-tools`):** Format, beautify, validate, minify, and inspect your JSON data with instant verification[cite: 3].
* [cite_start]**Angular Utilities (`angular-tools`):** Speed up frontend workflows by generating standardized, type-safe Angular standalone components, signals base models, and services[cite: 4].
* [cite_start]**Security & Cryptography (`security-tools`):** Generate high-entropy passwords, multi-word passphrases, system UUIDs, encode/decode Base64 variants, and decode JSON Web Tokens safely[cite: 5].
* [cite_start]**CSS & Visual UI (`css-ui-tools`):** Fine-tune responsive viewport layouts, gradients, flexboxes, box-shadows, and borders using interactive visual sandboxes[cite: 7, 8].
* [cite_start]**Date, Time, & Scheduling (`date-time-tools`):** Convert Unix Epoch timestamps, evaluate chronological age/differences, and track time zones or deadlines while filtering out weekends[cite: 8, 114, 126].
* [cite_start]**TypeScript Workspace (`typescript-tools`):** Perform static complexity analyses, convert models, and generate Zod schemas or interfaces within an offline-first workspace[cite: 9].
* [cite_start]**RxJS Stream Center (`rxjs-tools`):** Trace reactive pipelines, visualize streams using marble timelines, and diagnose stream memory leaks[cite: 10, 11].
* [cite_start]**Regex Studio (`regex-tools`):** Compose, test, and debug regular expressions with token explanations, subfield extractions, and performance boundary safety checks[cite: 12].
* [cite_start]**Enterprise SEO Toolkit (`seo-tools`):** Professional metadata management tools including Meta Tag generators, Open Graph previews, Schema JSON-LD injectors, and robots.txt/sitemap builders[cite: 13].

---

## 🛠️ Key Core Implementation Details

### 1. JSON Data Suite
* [cite_start]**Advanced JSON Editor:** Features a multi-mode workspace combining a Text Code Editor (with exact line numbering and code folding), an Interactive Tree View (supporting inline key/value additions, deletions, and explicit type manipulation), and a Table Grid specifically designed to edit arrays of objects like spreadsheets[cite: 333, 334, 339]. [cite_start]Includes draft JSON Schema validation with descriptive real-time warnings[cite: 337, 338].
* [cite_start]**JSON Formatter & Minifier:** Deconstructs minified payload logs, parses them to standard RFC 8259 syntax specifications, and isolates invalid properties or missing trailing commas row-by-row[cite: 32, 343, 349].
* [cite_start]**JSON Compare & Semantic Merge System:** Unlike text engines that run fragile line-by-line matches, it maps variables into structured trees to execute *semantic property matching* (optionally ignoring object ordering, case, and spacing anomalies)[cite: 355, 356]. [cite_start]Includes live conflict resolution toggles (`USE A` / `USE B`) and exports compliant RFC 6902 JSON Patch mutation arrays[cite: 37, 38].
* [cite_start]**Interactive JSON Diff:** Provides Visual Git-style line alignments, displaying colorized color-coded changes side-by-side with synchronized chronological line maps and auto-spacers[cite: 42, 43, 46].

### 2. Security, Integrity & Identity Suite
* [cite_start]**Secure Password Generator:** Drives high-entropy strings using robust pseudo-random values compiled via the browser's native `window.crypto.getRandomValues` Web Cryptography API[cite: 47, 48].
* [cite_start]**Cryptographic Passphrase Generator:** Employs audited child-safe English dictionary diceware sequences to compile multi-word passphrases with custom capitalization and custom string separator adjustments[cite: 50, 53, 55].
* [cite_start]**Password Strength & Breach Audit:** Computes credential entropy bits alongside complex structural enterprise policy validators[cite: 64]. [cite_start]Integrates a **k-Anonymity protocol look-up** targeting HaveIBeenPwned range servers—encrypting hashes locally, transmitting *only the first 5 hexadecimal characters* of the SHA-1 hash to the API, and resolving matching records entirely client-side to keep master files completely private[cite: 57, 58, 59].
* [cite_start]**UUID & GUID Generator:** Batch compiles high-performance RFC 4122 version 4 (random entropy) or version 1 (time-based) universal keys safely without blocking browser thread operations[cite: 65, 67].
* [cite_start]**JWT Decoder:** Safely parses encoded JSON Web Tokens into isolated Header parameters, Claim keys, and Signature markers while auditing expiration markers (`exp`) against current localized timestamps[cite: 70, 71, 75].
* [cite_start]**Advanced Base64 Toolkit Suite:** Features intelligent workspace auto-detection (plain text, hex streams, URL-safe variants, or document types)[cite: 77]. [cite_start]Integrates an isolated sandboxed preview `iframe` that renders images, triggers audio buffers, or reviews PDFs without exposing the container browser to malicious embedded script hooks or cross-site scripting (XSS) attacks[cite: 82, 90]. [cite_start]Supports URL-safe swaps (replacing symbols like `+` or `/` and cutting `=` pads)[cite: 85].
* [cite_start]**Image & Canvas Converter:** Transpiles PNG, JPG, WebP, or SVG assets up to 25MB directly into optimized Data URIs, clean CSS background properties, and HTML inline element attributes[cite: 98, 100, 101].

### 3. Frontend & Temporal Utilities
* [cite_start]**Angular Code Generator:** Yields modern standalone frontend boilerplate layouts matching strict Angular architecture paradigms—delivering reactive input signals (`input()`), `output()` triggers, constructor-less dependency injections, and modern control flow syntax[cite: 106, 107].
* [cite_start]**Unix Epoch Timestamp Converter:** Decodes seconds, milliseconds, or nanoseconds into precise localized human calendar calendars and standard ISO-8601 text layout formats[cite: 110].
* [cite_start]**Date Difference Calculator:** Computes exact elapsed durations (Years, Months, Days, Hours, Minutes, Seconds)[cite: 114]. [cite_start]Features a working day index counter that iterates bounds while cleanly ignoring weekends (Saturdays and Sundays) to accurately project standard business timelines[cite: 114].
* [cite_start]**Chronological Age Calculator:** Tracks precise chronological age down to the minute, supports leap year birth dates (February 29th), and projects a real-time ticking countdown tracking future birthday milestones[cite: 118, 119, 121].