#!/usr/bin/env python3
"""BelkaDR – zasoby Windows dla BelkaDR.exe (bez narzędzi zewnętrznych).

Z pliku host/winres/icon256.png tworzy:
  * host/winres/BelkaDR.ico          – ikona 16, 20, 24, 32, 40, 48, 64, 128 (DIB 32-bit) i 256 px (PNG),
  * host/rsrc_windows_amd64.syso     – obiekt COFF z zasobami RT_ICON, RT_GROUP_ICON (id 1) i RT_MANIFEST (id 1);
    linker Go dołącza go automatycznie przy budowaniu pakietu host (GOOS=windows GOARCH=amd64).
Wymaga: Python 3 + Pillow.  Uruchomienie: python3 tools/make_winres.py
"""
import io
import os
import struct
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'host', 'winres', 'icon256.png')
ICO = os.path.join(ROOT, 'host', 'winres', 'BelkaDR.ico')
SYSO = os.path.join(ROOT, 'host', 'rsrc_windows_amd64.syso')
SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256]

MANIFEST = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0" xmlns:asmv3="urn:schemas-microsoft-com:asm.v3">
  <assemblyIdentity type="win32" name="BelkaDR" version="1.1.0.0" processorArchitecture="amd64"/>
  <description>BelkaDR - obliczenia belek drewnianych wg EC5</description>
  <dependency>
    <dependentAssembly>
      <assemblyIdentity type="win32" name="Microsoft.Windows.Common-Controls" version="6.0.0.0" processorArchitecture="*" publicKeyToken="6595b64144ccf1df" language="*"/>
    </dependentAssembly>
  </dependency>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
      <supportedOS Id="{1f676c76-80e1-4239-95bb-83d0f6d0da78}"/>
      <supportedOS Id="{4a2f28e3-53b9-4441-ba9c-d69d4a4a6e38}"/>
      <supportedOS Id="{35138b9a-5d96-4fbd-8e2d-a2440225f93a}"/>
    </application>
  </compatibility>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security><requestedPrivileges><requestedExecutionLevel level="asInvoker" uiAccess="false"/></requestedPrivileges></security>
  </trustInfo>
  <asmv3:application>
    <asmv3:windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
      <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2, PerMonitor</dpiAwareness>
    </asmv3:windowsSettings>
  </asmv3:application>
</assembly>
""".encode('utf-8')


def dib(im):
    """Obraz ikony w formacie DIB: BITMAPINFOHEADER, piksele BGRA od dołu, maska AND (zera – przezroczystość z kanału alfa)."""
    w, h = im.size
    hdr = struct.pack('<IiiHHIIiiII', 40, w, 2 * h, 1, 32, 0, 0, 0, 0, 0, 0)
    px = im.load()
    rows = []
    for y in range(h - 1, -1, -1):
        rows.append(b''.join(struct.pack('BBBB', px[x, y][2], px[x, y][1], px[x, y][0], px[x, y][3]) for x in range(w)))
    mask_row = ((w + 31) // 32) * 4
    return hdr + b''.join(rows) + b'\0' * (mask_row * h)


def images():
    src = Image.open(SRC).convert('RGBA')
    out = []
    for s in SIZES:
        im = src if s == src.size[0] else src.resize((s, s), Image.LANCZOS)
        if s >= 256:
            b = io.BytesIO(); im.save(b, 'PNG', optimize=True); data = b.getvalue()
        else:
            data = dib(im)
        out.append((s, data))
    return out


def write_ico(imgs):
    head = struct.pack('<HHH', 0, 1, len(imgs))
    off = 6 + 16 * len(imgs)
    ents, blobs = b'', b''
    for s, data in imgs:
        ents += struct.pack('<BBBBHHII', s % 256, s % 256, 0, 0, 1, 32, len(data), off + len(blobs))
        blobs += data
    with open(ICO, 'wb') as f:
        f.write(head + ents + blobs)


def write_syso(imgs):
    """COFF (AMD64) z sekcją .rsrc: katalog zasobów (typ → id → język → dane) i relokacjami ADDR32NB pól OffsetToData."""
    grp = struct.pack('<HHH', 0, 1, len(imgs)) + b''.join(
        struct.pack('<BBBBHHIH', s % 256, s % 256, 0, 0, 1, 32, len(d), i + 1) for i, (s, d) in enumerate(imgs))
    LANG = 0x0409
    res = {3: [(i + 1, d) for i, (s, d) in enumerate(imgs)], 14: [(1, grp)], 24: [(1, MANIFEST)]}
    types = sorted(res)
    # układ: katalog główny, katalogi typów, katalogi nazw (po 1 języku), wpisy danych, dane
    n_names = sum(len(res[t]) for t in types)
    sz_dir = lambda n: 16 + 8 * n
    off_root = 0
    off_types = sz_dir(len(types))
    type_offs, o = {}, off_types
    for t in types:
        type_offs[t] = o; o += sz_dir(len(res[t]))
    name_offs, k = {}, 0
    for t in types:
        for (rid, _) in res[t]:
            name_offs[(t, rid)] = o; o += sz_dir(1)
    data_entry_offs = {}
    for t in types:
        for (rid, _) in res[t]:
            data_entry_offs[(t, rid)] = o; o += 16
    data_offs = {}
    for t in types:
        for (rid, d) in res[t]:
            o = (o + 7) & ~7
            data_offs[(t, rid)] = o; o += len(d)
    total = (o + 7) & ~7
    buf = bytearray(total)

    def put_dir(at, entries):
        struct.pack_into('<IIHHHH', buf, at, 0, 0, 0, 0, 0, len(entries))
        for j, (ident, target, is_dir) in enumerate(entries):
            struct.pack_into('<II', buf, at + 16 + 8 * j, ident, target | (0x80000000 if is_dir else 0))

    put_dir(off_root, [(t, type_offs[t], True) for t in types])
    for t in types:
        put_dir(type_offs[t], [(rid, name_offs[(t, rid)], True) for (rid, _) in res[t]])
    relocs = []
    for t in types:
        for (rid, d) in res[t]:
            put_dir(name_offs[(t, rid)], [(LANG, data_entry_offs[(t, rid)], False)])
            de = data_entry_offs[(t, rid)]
            struct.pack_into('<IIII', buf, de, data_offs[(t, rid)], len(d), 0, 0)
            relocs.append(de)
            buf[data_offs[(t, rid)]:data_offs[(t, rid)] + len(d)] = d
    raw = bytes(buf)
    p_raw = 20 + 40
    p_rel = p_raw + len(raw)
    p_sym = p_rel + 10 * len(relocs)
    coff = struct.pack('<HHIIIHH', 0x8664, 1, 0, p_sym, 1, 0, 0)
    sect = struct.pack('<8sIIIIIIHHI', b'.rsrc', 0, 0, len(raw), p_raw, p_rel, 0, len(relocs), 0, 0x40000040)
    rel = b''.join(struct.pack('<IIH', r, 0, 3) for r in relocs)          # IMAGE_REL_AMD64_ADDR32NB względem symbolu sekcji
    sym = struct.pack('<8sIhHBB', b'.rsrc', 0, 1, 0, 3, 0)                   # IMAGE_SYM_CLASS_STATIC
    strtab = struct.pack('<I', 4)
    with open(SYSO, 'wb') as f:
        f.write(coff + sect + raw + rel + sym + strtab)


if __name__ == '__main__':
    imgs = images()
    write_ico(imgs)
    write_syso(imgs)
    print('ikona:', os.path.relpath(ICO, ROOT), os.path.getsize(ICO), 'B; zasoby:', os.path.relpath(SYSO, ROOT), os.path.getsize(SYSO), 'B')
