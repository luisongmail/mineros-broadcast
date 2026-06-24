insert into public.assets (
  asset_id,
  name,
  type,
  owner,
  brand,
  status,
  usage,
  file,
  format,
  protected,
  checksum,
  metadata
)
values
  (
    'AM-LOGO-001',
    'Logo oficial Mineros',
    'logo',
    'Club Mineros de Santiago',
    'Mineros',
    'approved',
    array['scorebug', 'lineup', 'summary', 'fullscreen'],
    '03-asset-manager-assets/AM-LOGO-001-mineros-oficial.png',
    'png',
    true,
    'seed-am-logo-001',
    jsonb_build_object(
      'source', '03-asset-manager.md',
      'protectedReason', 'logo oficial del club',
      'createdAt', '2026-06-23T00:00:00Z',
      'updatedAt', '2026-06-23T00:00:00Z'
    )
  ),
  (
    'AM-LOGO-002',
    'Logo oficial Merchise',
    'logo',
    'Club Mineros de Santiago',
    'Merchise',
    'approved',
    array['scorebug', 'lineup', 'summary', 'fullscreen', 'sponsor_break'],
    '03-asset-manager-assets/AM-LOGO-002-merchise-oficial.png',
    'png',
    true,
    'seed-am-logo-002',
    jsonb_build_object(
      'source', '03-asset-manager.md',
      'protectedReason', 'marca desarrolladora / soporte comercial',
      'createdAt', '2026-06-23T00:00:00Z',
      'updatedAt', '2026-06-23T00:00:00Z'
    )
  )
on conflict (asset_id) do update
set
  name = excluded.name,
  type = excluded.type,
  owner = excluded.owner,
  brand = excluded.brand,
  status = excluded.status,
  usage = excluded.usage,
  file = excluded.file,
  format = excluded.format,
  protected = excluded.protected,
  checksum = excluded.checksum,
  metadata = excluded.metadata,
  updated_at = now();
