# ── Build stage ────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Backend.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish

# ── Runtime stage ──────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# The app creates eventapp.db relative to its working directory (/app).
# Mount a volume at /app so the SQLite file survives container restarts:
#   docker run -v dinner_data:/app ...
EXPOSE 5000
ENV PORT=5000
ENV ASPNETCORE_ENVIRONMENT=Production

# Listens on $PORT (Render/Fly set it; defaults to 5000)
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT} exec dotnet Backend.dll"]
