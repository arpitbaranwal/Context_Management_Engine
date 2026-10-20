# System requirements

| Requirement | Why it is needed | Installation |
| --- | --- | --- |
| Python 3.10–3.13 | Runs FastAPI and the RAG pipeline | [python.org/downloads](https://www.python.org/downloads/) |
| Node.js 20.19+ or 22.12+ | Builds and serves the Vite frontend | [nodejs.org](https://nodejs.org/) |
| Tesseract OCR | Required only for PNG/JPG/JPEG text extraction | Install from your OS package manager or the [Windows installer](https://github.com/UB-Mannheim/tesseract/wiki) |

After installing Tesseract, make sure `tesseract --version` works in a fresh terminal. If it is not on `PATH`, set `pytesseract.pytesseract.tesseract_cmd` to its executable path in the engine file.

PDF-only use does not require Tesseract.
