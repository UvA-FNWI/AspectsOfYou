# Aspects of You

Aspects of You is an application for creating surveys, collecting responses, and visualizing results. The admin and public survey UI is a **Next.js** app; the **.NET** API owns the database and API.

## Repository layout

| Path | Role |
|------|------|
| `admin/frontend/` | Next.js UI (admin, survey taking, displays, charts) |
| `aspectsofyou-endpoint/` | ASP.NET Core API, EF Core migrations, PostgreSQL access |
| `charts/aspectsofyou/` | Helm chart for Kubernetes deployment |
| `docker-compose.yml` | Local stack: Postgres, API, frontend |
| `.github/workflows/` | CI: build, test, and release to container registry / Helm |

## Requirements

- **Docker** and **Docker Compose** for the full local stack
- **Node.js 26+** and npm for frontend development (`admin/frontend`)
- **.NET 10 SDK** for API development (`aspectsofyou-endpoint`)

## Run the full stack (Docker)

From the repository root:

```bash
docker compose up --build -d
```

- Frontend: [https://localhost:3003](https://localhost:3003) (TLS via Caddy in Compose)
- API: [https://localhost:5059](https://localhost:5059)
- Postgres: `localhost:5432` (user/database `strawberry` / `aspects` per `docker-compose.yml`)

The first visit may show a certificate warning (Caddy local CA). Accept it for `localhost`, or register **`https://localhost:3003`** as a SURFconext redirect URI if admin sign-in is required locally.

Stop and remove containers:

```bash
docker compose down
```

For SurfConext and other secrets locally, use a root `.env` file as referenced in `docker-compose.yml` (do not commit secrets).

## Local development (individual components)

### Admin frontend

```bash
cd admin/frontend
npm install
export NEXT_PUBLIC_DOTNET_API_URL=http://localhost:5059   # or your API URL
npm run dev
```

Default dev URL is [http://localhost:3000](http://localhost:3000) unless configured otherwise.

### API endpoint

```bash
cd aspectsofyou-endpoint
dotnet restore UvA.AspectsOfYou.Endpoint.csproj
dotnet run --project UvA.AspectsOfYou.Endpoint.csproj
```

Set connection strings and SurfConext settings via `appsettings.json`, user secrets, or environment variables (see `appsettings.json` and Helm `values.yaml` for production-oriented keys).

### Database migrations

Migrations live in `aspectsofyou-endpoint/Migrations`. Apply them with the EF CLI:

```bash
cd aspectsofyou-endpoint
dotnet tool restore
dotnet ef database update --project UvA.AspectsOfYou.Endpoint.csproj
```

API schema and DTO notes: `aspectsofyou-endpoint/README.md`.

## Production deployment (overview)

Pushes to `main` build container images and a versioned Helm chart; GitOps (Argo CD) deploys from the chart in Azure Container Registry. The workflow notifies **gitops-updater**, which updates `test/aspectsofyou.yaml` in the `k8s-gitops` repository.

## CI

Pull requests and pushes to `main` run lint/build checks on GitHub-hosted runners; merges to `main` trigger the self-hosted workflow that builds images, publishes the Helm chart, and calls gitops-updater.
