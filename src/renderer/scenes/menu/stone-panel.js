export function stonePanelTexture(scene, width, height) {
    const key = `stone-panel-${width}x${height}`;
    if (scene.textures.exists(key)) { return key; }

    const sourceTexture = scene.textures.get('Panels2Atlas');
    const frame = scene.textures.getFrame('Panels2Atlas', 'stonePanel');
    const source = sourceTexture.getSourceImage();
    const texture = scene.textures.createCanvas(key, width, height);
    const ctx = texture.getContext();
    const sx = frame.cutX;
    const sy = frame.cutY;
    const sw = frame.cutWidth;
    const sh = frame.cutHeight;
    const border = 8;

    const draw = (srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH) => {
        ctx.drawImage(source, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
    };
    const tile = (srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH) => {
        for (let y = 0; y < dstH; y += srcH) {
            for (let x = 0; x < dstW; x += srcW) {
                const w = Math.min(srcW, dstW - x);
                const h = Math.min(srcH, dstH - y);
                const flipX = Math.floor(x / srcW) % 2 === 1;
                const flipY = Math.floor(y / srcH) % 2 === 1;
                ctx.save();
                ctx.translate(dstX + x + (flipX ? w : 0), dstY + y + (flipY ? h : 0));
                ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
                draw(srcX, srcY, w, h, 0, 0, w, h);
                ctx.restore();
            }
        }
    };

    const right = sx + sw - border;
    const bottom = sy + sh - border;
    const innerW = width - border * 2;
    const innerH = height - border * 2;

    tile(sx + 76, sy + 76, 64, 64, border, border, innerW, innerH);
    tile(sx + border, sy, sw - border * 2, border, border, 0, innerW, border);
    tile(sx + border, bottom, sw - border * 2, border, border, height - border, innerW, border);
    tile(sx, sy + border, border, sh - border * 2, 0, border, border, innerH);
    tile(right, sy + border, border, sh - border * 2, width - border, border, border, innerH);

    draw(sx, sy, border, border, 0, 0, border, border);
    draw(right, sy, border, border, width - border, 0, border, border);
    draw(sx, bottom, border, border, 0, height - border, border, border);
    draw(right, bottom, border, border, width - border, height - border, border, border);

    texture.refresh();
    return key;
}

export function addStonePanel(scene, x, y, width, height) {
    return scene.add.image(x, y, stonePanelTexture(scene, width, height)).setOrigin(0);
}
