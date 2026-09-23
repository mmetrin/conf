"""Generate lossless WOFF2 versions: pip install fonttools brotli."""
from pathlib import Path
from fontTools.ttLib import TTFont

assets = Path(__file__).resolve().parent.parent / "public" / "assets"
for source in sorted(assets.glob("MTS*.otf")):
    font = TTFont(source)
    font.flavor = "woff2"
    target = source.with_suffix(".woff2")
    font.save(target)
    font.close()
    print(f"{source.name}: {source.stat().st_size} -> {target.stat().st_size} bytes")
