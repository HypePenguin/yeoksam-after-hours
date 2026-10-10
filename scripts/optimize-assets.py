"""Build browser WebP files from the retained PNG source artwork (requires Pillow)."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1]
source = root / 'art-source'
output = root / 'dist/assets'

def convert(path):
    image = Image.open(path).convert('RGBA')
    original_size = image.size
    compact = path.stem.startswith('item-') or '-skill-' in path.stem or path.stem.endswith('-portrait')
    if compact:
        image.thumbnail((256, 256), Image.Resampling.LANCZOS)
    target = output / (path.stem + '.webp')
    image.save(target, 'WEBP', quality=92, method=6, exact=True)
    return {'name': path.stem, 'source_bytes': path.stat().st_size, 'bytes': target.stat().st_size,
            'source_size': original_size, 'size': image.size, 'compact': compact}

with ThreadPoolExecutor(max_workers=4) as pool:
    results = sorted(pool.map(convert, source.glob('*.png')), key=lambda entry: entry['name'])
report = {'source_bytes': sum(entry['source_bytes'] for entry in results),
          'bytes': sum(entry['bytes'] for entry in results), 'assets': results}
(root / 'asset-sizes.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: value for key, value in report.items() if key != 'assets'}))
