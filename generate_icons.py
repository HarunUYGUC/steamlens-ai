import os
import zlib
import struct
import math

def create_png(width, height, get_pixel_func, output_path):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y, width, height)
            raw_data.extend([int(r), int(g), int(b), int(a)])
    
    # PNG Signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR Chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png += struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # IDAT Chunk
    compressed_data = zlib.compress(bytes(raw_data), 9)
    idat_crc = zlib.crc32(b'IDAT' + compressed_data)
    png += struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)
    
    # IEND Chunk
    iend_crc = zlib.crc32(b'IEND')
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    with open(output_path, 'wb') as f:
        f.write(png)
    print(f"Generated {output_path} ({width}x{height})")

def render_steamlens_icon(x, y, w, h):
    nx = (x / (w - 1)) * 2 - 1 if w > 1 else 0
    ny = (y / (h - 1)) * 2 - 1 if h > 1 else 0
    
    corner_radius = 0.28
    ax = abs(nx)
    ay = abs(ny)
    
    dx = max(0, ax - (1.0 - corner_radius))
    dy = max(0, ay - (1.0 - corner_radius))
    dist_corner = math.sqrt(dx * dx + dy * dy)
    
    in_box = (ax <= 1.0 and ay <= 1.0 - corner_radius) or \
             (ay <= 1.0 and ax <= 1.0 - corner_radius) or \
             (dist_corner <= corner_radius)
             
    if not in_box:
        return 0, 0, 0, 0
    
    t = (ny + 1) / 2.0
    bg_r = int(13 + (27 - 13) * t)
    bg_g = int(25 + (45 - 25) * t)
    bg_b = int(38 + (66 - 38) * t)
    
    r, g, b, a = bg_r, bg_g, bg_b, 255
    
    if dist_corner > corner_radius - 0.08 or (max(ax, ay) > 0.92 and dist_corner == 0):
        return 102, 192, 244, 255

    rad = math.sqrt(nx * nx + ny * ny)
    
    if 0.58 <= rad <= 0.76:
        angle = math.atan2(ny, nx)
        ring_t = (math.sin(angle * 2) + 1) / 2.0
        cr = int(30 + ring_t * 72)
        cg = int(200 + ring_t * 55)
        cb = int(255 - ring_t * 50)
        return cr, cg, cb, 255
        
    if rad < 0.58:
        r, g, b = 10, 20, 32
        
    if rad <= 0.28:
        spark = max(0, 1.0 - rad / 0.28)
        axis_flare = max(0, 1.0 - abs(nx) * 3.5) * max(0, 1.0 - abs(ny) * 1.5) + \
                     max(0, 1.0 - abs(ny) * 3.5) * max(0, 1.0 - abs(nx) * 1.5)
        spark = min(1.0, spark + axis_flare * 0.4)
        
        cr = int(102 + (255 - 102) * spark)
        cg = int(192 + (255 - 192) * spark)
        cb = 255
        return cr, cg, cb, 255

    if 0.36 <= rad <= 0.50:
        angle = math.atan2(ny, nx)
        petal = math.cos(3 * angle)
        if petal > 0.3:
            return 102, 192, 244, 230

    return r, g, b, a

def main():
    os.makedirs("icons", exist_ok=True)
    for size in [16, 48, 128]:
        create_png(size, size, render_steamlens_icon, f"icons/icon-{size}.png")
    print("All icons created successfully.")

if __name__ == "__main__":
    main()
