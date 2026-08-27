from plane.db.models import FileAsset

# Check ALL FileAssets
assets = FileAsset.objects.all().order_by('-created_at')
print(f"All FileAsset records ({assets.count()} total):")
for a in assets:
    print(f"  ID: {a.id}")
    print(f"    Asset: {a.asset}")
    print(f"    is_uploaded: {a.is_uploaded}")
    print(f"    is_deleted: {a.is_deleted}")
    print(f"    created_at: {a.created_at}")
    print(f"    entity_type: {a.entity_type}")
    print(f"    page_id: {a.page_id}")
    print()

# Search for asset with key containing e45c5b8c
matching = FileAsset.objects.filter(asset__contains="e45c5b8c1f6a420187529440227a1880")
print(f"Assets matching e45c5b8c: {matching.count()}")
for m in matching:
    print(f"  ID: {m.id}  Asset: {m.asset}  is_uploaded: {m.is_uploaded}")
