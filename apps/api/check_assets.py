from plane.db.models import FileAsset

# Check all FileAssets with their upload status
assets = FileAsset.objects.all().order_by('-created_at')[:15]
print("Recent FileAsset records:")
for a in assets:
    print(f"  ID: {a.id}  is_uploaded: {a.is_uploaded}  is_deleted: {a.is_deleted}  Asset: {a.asset}  entity_type: {a.entity_type}")

# Count uploaded vs not
total = FileAsset.objects.count()
uploaded = FileAsset.objects.filter(is_uploaded=True).count()
not_uploaded = FileAsset.objects.filter(is_uploaded=False).count()
print(f"\nTotal: {total}, Uploaded: {uploaded}, Not uploaded: {not_uploaded}")
