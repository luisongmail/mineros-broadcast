# Asset Storage Local

Esta carpeta contiene los assets del sistema (logos, fotos de jugadores, banners).
- En desarrollo: Express sirve desde aquí en /assets/*
- En producción: usar Azure Blob Storage (ASSETS_BASE_URL en .env)

Los archivos binarios están en .gitignore.
La estructura de carpetas SÍ se commitea para documentar los assetIds esperados.

