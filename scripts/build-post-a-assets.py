"""Rebuild the compact post-A backgrounds and robot sprites from retained source art."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
background = Image.open(root / 'art-source/post-a-dungeons-v146.png')
background.save(root / 'dist/assets/post-a-dungeons-v146.webp', quality=82, method=6)
monsters = Image.open(root / 'art-source/post-a-monsters-v146.png')
for index, kind in enumerate(['melee', 'ranged']):
    sprite = monsters.crop((index * monsters.width // 2, 0, (index + 1) * monsters.width // 2, monsters.height))
    sprite = sprite.crop(sprite.getchannel('A').getbbox())
    sprite.thumbnail((448, 448), Image.Resampling.LANCZOS)
    sprite.save(root / f'dist/assets/post-a-{kind}-v146.webp', quality=88, method=6)
