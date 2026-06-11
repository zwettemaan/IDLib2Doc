# Lib2Doc / Doc2Lib

A pair of Adobe InDesign UXP scripts for round-tripping content between InDesign libraries (`.indl`) and InDesign documents (`.indd`).

## What the scripts do

### Doc2Lib.idjs

Converts an InDesign document into a library.

- Scans the document for all non-nested page items that have a **script label** set
- Stores each labeled item as an asset in a new `.indl` library
- Names each library asset after the item's script label
- Items are processed in page/position order (top-to-bottom, left-to-right, page by page)

### Lib2Doc.idjs

Converts an InDesign library into a document.

- Places every asset from an `.indl` library onto pages of a new `.indd` document
- Sets the script label of each placed item to match the library asset name
- Auto-arranges assets in rows across A4 pages, adding new pages as needed
- Default page setup: A4 (210 × 297 mm), 20 mm top margin, 15 mm side margins, 10 mm gutters

The two scripts are complementary: you can use Lib2Doc to produce a new document representing a library. Make some changes or additions. Then use Doc2Lib to produce a new library reflecting those changes.

To overwrite the original library make sure to close it first before running the script - you cannot overwrite a library that is open in InDesign.

## Requirements

- Adobe InDesign **CC 2022 (v17) or later** — UXP scripting support is required
- All three files (`Doc2Lib.idjs`, `Lib2Doc.idjs`, `helpers.js`) must be kept **in the same folder**

## Installation

### Step 1 — Download the scripts

**Option A: ZIP download (no Git required)**

1. Go to https://github.com/zwettemaan/IDLib2Doc
2. Click the green **Code** button, then **Download ZIP**
3. Unzip the downloaded file

**Option B: Git clone**

```bash
git clone https://github.com/zwettemaan/IDLib2Doc.git
```

### Step 2 — Copy to InDesign

#### Easy method

1. In InDesign, open the Scripts panel: **Window → Utilities → Scripts**
2. Right-click the **User** folder in the panel and choose **Reveal in Finder** (macOS) or **Reveal in Explorer** (Windows)
3. Open the **Scripts Panel** subfolder that appears
4. Copy `Doc2Lib.idjs`, `Lib2Doc.idjs`, and `helpers.js` into that folder
5. The scripts appear immediately under **User** in the Scripts panel — no restart needed

#### Manual path

If you prefer to copy the files without opening InDesign first:

**macOS**
```
~/Library/Application Support/Adobe/InDesign/<version>/<locale>/Scripts/Scripts Panel/
```

**Windows**
```
%APPDATA%\Adobe\InDesign\<version>\<locale>\Scripts\Scripts Panel\
```

Replace `<version>` with your InDesign version (e.g. `Version 19.0`) and `<locale>` with your language code (e.g. `en_US`).

## Running the scripts

1. Open InDesign.
2. Open the Scripts panel (**Window → Utilities → Scripts**).
3. Double-click **Doc2Lib** or **Lib2Doc**.
4. Use the file picker dialogs to select the source and destination files.

The default starting location for file pickers is `~/Documents`.

## File structure

```
Doc2Lib.idjs          — document → library script
Lib2Doc.idjs          — library → document script
helpers.js            — shared subroutines (must stay alongside the scripts)
LICENSE               — MIT License
```

## How labeled page items work

InDesign lets you attach a **script label** to any page item via **Window → Utilities → Scripts** or programmatically. Doc2Lib uses this label as the asset name when storing items in the library. Lib2Doc reads it back and restores it on the placed item after placing it from the library.

Page items without a script label are ignored by Doc2Lib.

## License

Copyright (c) 2026 Kris Coppieters  
MIT License — see [LICENSE](LICENSE) for full text.

---

## Developer notes

### Configuration

Each script has a configuration block at the top of the file, right after the `require('./helpers.js')` line.

**Doc2Lib.idjs**

```js
var SOURCE_DOCUMENT_PATH = '';         // absolute path to source .indd, or '' to use file picker
var TARGET_LIBRARY_PATH  = '';         // absolute path to output .indl, or '' to use file picker
var OVERWRITE_EXISTING_TARGET = false; // set true to silently overwrite an existing target file
```

**Lib2Doc.idjs**

```js
var SOURCE_LIBRARY_PATH   = '';        // absolute path to source .indl, or '' to use file picker
var TARGET_DOCUMENT_PATH  = '';        // absolute path to output .indd, or '' to use file picker
var OVERWRITE_EXISTING_TARGET = false; // set true to silently overwrite an existing target file

var PAGE_WIDTH_MM        = 210;  // output document page width
var PAGE_HEIGHT_MM       = 297;  // output document page height
var PAGE_MARGIN_TOP_MM   =  20;  // top and bottom margin
var PAGE_MARGIN_LEFT_MM  =  15;  // left and right margin
var GUTTER_X_MM          =  10;  // horizontal gap between placed assets
var GUTTER_Y_MM          =  10;  // vertical gap between rows
```

### Console output

On success, each script logs a JSON object to the InDesign console with the paths used and a count of items processed:

**Doc2Lib**
```json
{
  "sourceDocumentPath": "/path/to/source.indd",
  "targetLibraryPath": "/path/to/output.indl",
  "storedCount": 12
}
```

**Lib2Doc**
```json
{
  "sourceLibraryPath": "/path/to/source.indl",
  "targetDocumentPath": "/path/to/output.indd",
  "placementCount": 12
}
```

On failure the error message and stack trace are written to `console.error`.

### Script structure

The `.idjs` files have an unusual structure that may look like a syntax error at first glance. The very first line is a bare `});` with no matching opening — and the function at the bottom of the file is deliberately left unclosed.

This is an intentional workaround for how the InDesign UXPScript runtime wraps every script in an `async` function before executing it. That async wrapper causes problems: Promise resolution does not drain before the script exits, so async operations silently fail to complete.

The fix: the `});` at the top closes the runtime's async wrapper, the script then reinstalls a custom synchronous `Promise` class that tracks all pending promises, and re-opens a new synchronous wrapper function using the same signature. The runtime closes that wrapper when the script ends, leaving everything inside running synchronously with full promise-drain support.

For the full research and explanation behind this technique, see:  
https://coppieters.nz/injecting-uxpscript-wrapper/
