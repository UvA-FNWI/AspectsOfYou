# Admin Frontend README

Next.js admin UI for creating surveys and viewing survey results.

## Project Structure

- **`src/app/`**: Next.js app folder (App Router).
  - **`layout.js`**: global layout and providers.
  - **`page.js`**: admin index page (entry for the admin UI).
  - **`globals.css`**: global styles.
  - **`createform/`**: UI for creating new surveys.
    - `page.js`: create survey page.
    - `index.css`: styles for create form.
  - **`survey/[id]/page.js`**: survey detail page (view results for a single survey by id).
  - **`components/`**: reusable UI components used across pages:
    - `ImageRow.jsx` — helper to render rows of images or thumbnails.
    - `MultiChoiceQuestion.jsx` — render multiple-choice questions with UI for multiple answers.
    - `SingleChoiceQuestion.jsx` — render single-choice questions.
    - `OpenQuestion.jsx` — render open-ended question UI.
    - `ShowAnswers.jsx` — list answers for a question.
    - `ShowBarplot.jsx` — bar chart visualization (uses `@mui/x-charts` / `d3`).
    - `ShowCircle.jsx` — circle visualization.
    - `ShowWordCloudQuestion.jsx` — word cloud rendering (uses `d3-cloud`).
    - `theme.jsx` — Material UI / theme helpers.

- **`public/`**: static assets and icons.
- **`Dockerfile`**: container image build for the frontend.
- **`next.config.mjs`, `jsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`**: Next.js and tooling configuration.

## Scripts

- **`dev`**: `next dev --turbopack` — run development server.
- **`build`**: `next build` — build production artifacts.
- **`start`**: `next start` — run production server.
- **`lint`**: `next lint` — run ESLint.

## Dependencies

- `next` / `react` — App Router based Next.js 15.
- `@mui/material`, `@emotion/*` — UI components and styling.
- `@mui/x-charts`, `d3`, `d3-cloud` — charts and word cloud visualizations.
- `html2canvas`, `jspdf` — client-side export / screenshot to PDF features.
