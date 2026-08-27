from plane.db.models import FileAsset

# Check all FileAssets with is_uploaded=True
assets = FileAsset.objects.filter(is_uploaded=True, is_deleted=False).order_by('-created_at')
print("Uploaded FileAsset records:")
for a in assets:
    print(f"  ID: {a.id}  Asset: {a.asset}  entity_type: {a.entity_type}  page_id: {a.page_id}  project_id: {a.project_id}")

# Check the newest one specifically
newest = assets.first()
if newest:
    print(f"\nNewest asset:")
    print(f"  ID: {newest.id}")
    print(f"  Asset key: {newest.asset}")
    print(f"  Attributes: {newest.attributes}")
    print(f"  is_uploaded: {newest.is_uploaded}")
    print(f"  page_id: {newest.page_id}")
