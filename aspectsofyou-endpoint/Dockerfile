FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-env
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out UvA.AspectsOfYou.Endpoint.csproj

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
# Npgsql may dlopen libgssapi_krb5 for optional GSS/Kerberos; slim images omit it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build-env /app/out .

ENTRYPOINT [ "dotnet", "UvA.AspectsOfYou.Endpoint.dll" ]
