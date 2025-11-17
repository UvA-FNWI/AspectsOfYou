# Aspects of You

Aspects of You is a multi-component application for creating surveys and visualizing results. This README explains the repository layout, how to run the app locally (via Docker and individually), and where to find each component.

**Quick Links**
- **Main services:** `admin/`, `forms/`, `aspectsofyou-endpoint/`
- **Top-level Docker Compose:** `docker-compose.yml`

**Requirements**
- Docker and Docker Compose
- For local development: Node.js (16+), npm or yarn, and .NET SDK for the `aspectsofyou-endpoint` service.

**Contents**
- **`admin/`**: Admin UI and admin backend code (React frontend + Node backend).
- **`forms/`**: Frontend and backend for the public forms/surveys.
- **`aspectsofyou-endpoint/`**: .NET API project, Entity Framework migrations, and Docker setup for the database-backed endpoint and API.

**Architecture**

The project uses containerized services to separate responsibilities:
- Frontends: React/Next.js projects that serve the UI for admin and form users.
- Backend: Node/Express services that serve as application backends for the frontends (in `admin/*`).
- `aspectsofyou-endpoint`: .NET API that manages the database and provides the canonical API for surveys, questions, answers, and responses.
- `postgres`: PostgreSQL database container used by the endpoint.

## Running the full stack (Docker)

From the repository root you can start the whole system with Docker Compose:

```bash
docker compose up --build
```

This will build the images and run the services defined in the top-level `docker-compose.yml` (and any included compose files). Use `-d` to run in detached mode.

To stop and remove containers and networks created by Compose:

```bash
docker compose down
```

If you only want to run the `aspectsofyou-endpoint` stack (it has its own compose file), you can run:

```bash
cd aspectsofyou-endpoint
docker compose up --build
```

## Running components individually (local development)

The repo contains multiple sub-projects. Typical development flow is to run the frontend and backend for the area you are working on.

- Admin frontend (`admin/frontend`)
  - Install: `cd admin/frontend && npm install`
  - Run (dev): `npm run dev`

- Admin backend (`admin/backend`)
  - Install: `cd admin/backend && npm install`
  - Run: `npm start` (or `node index.js`)

- Forms frontend (`forms/frontend` or top-level `frontend`)
  - Install: `cd forms/frontend && npm install`
  - Run (dev): `npm run dev`

- Forms backend (`forms/backend`)
  - Install: `cd forms/backend && npm install`
  - Run: `npm start` (or `node index.js`)

- API endpoint (`aspectsofyou-endpoint`)
  - The API is a .NET project. To run locally without Docker:
    - Restore and run: `cd aspectsofyou-endpoint && dotnet restore && dotnet run`
    - If you need to run EF migrations: `dotnet ef database update` (ensure `dotnet-ef` is installed and `appsettings.json` connection strings are set).

Note: exact `package.json` scripts may vary per frontend/backend — check the `package.json` files under each subfolder for the actual script names and required env vars.

## Migrations & Database

Entity Framework migrations are present in `aspectsofyou-endpoint/Migrations`. When running locally (not via Docker), you can apply migrations using the EF CLI:

```bash
cd aspectsofyou-endpoint
dotnet tool restore
dotnet ef database update
```
