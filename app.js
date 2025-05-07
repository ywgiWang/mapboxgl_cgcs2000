// app.js
const Fastify = require('fastify');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const fastify = Fastify({ logger: true });

// ============================================================

// 工具：WebMercator tile (x,y,z) → [minLon, minLat, maxLon, maxLat]
function tileBounds(x, y, z) {
    const n = 2 ** z;
    const lonMin = x / n * 360 - 180;
    const lonMax = (x + 1) / n * 360 - 180;
    const latMax = mercYToLat(Math.PI - 2 * Math.PI * y / n);
    const latMin = mercYToLat(Math.PI - 2 * Math.PI * (y + 1) / n);
    return [lonMin, latMin, lonMax, latMax];
}
function mercYToLat(mercY) {
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(mercY) - Math.exp(-mercY)));
}

//restful api 接口
fastify.get(
    "/arcgis/rest/services/:folder/:layer/MapServer/wmts",
    async (request, reply) => {
        const { token, LAYER, SERVICE, REQUEST, STYLE, TILEMATRIX, TILEROW, TILECOL, FORMAT, TILEMATRIXSET, VERSION } = request.query;
        const { folder, layer } = request.params;

        const TILE_SIZE = 256;
        const ORIGIN_X = -180;
        const ORIGIN_Y = 90;
        const target_wmts_url = "https://yourserver/arcgis/rest/services/${folder}/${layer}/MapServer/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=imgmap&STYLE=default&TILEMATRIXSET=default028mm&TILEMATRIX=${z}&TILEROW=${row}&TILECOL=${col}&FORMAT=image%2Fpng&token=${yourtoken}"


        // EPSG:4490 default028mm 分辨率（度/像素）
        const RESOLUTIONS = [
            1.40625,                   // Level 0
            0.703125,                  // Level 1
            0.3515625,                 // Level 2
            0.17578125,                // Level 3
            0.087890625,               // Level 4
            0.0439453125,              // Level 5
            0.02197265625,             // Level 6
            0.010986328125,            // Level 7
            0.0054931640625,           // Level 8
            0.00274658203125,          // Level 9
            0.001373291015625,         // Level 10
            0.0006866455078125,        // Level 11
            0.00034332275390625,       // Level 12
            0.000171661376953125,      // Level 13
            0.0000858306884765625,     // Level 14
            0.00004291534423828125,    // Level 15
            0.000021457672119140625,   // Level 16
            0.0000107288360595703125,  // Level 17
            0.00000536441802978515625, // Level 18
            0.000002682209014892578125 // Level 19

        ];
        const z = parseInt(TILEMATRIX), x = parseInt(TILECOL), y = parseInt(TILEROW);        
        const bounds = tileBounds(x, y, z);
        const resDeg = RESOLUTIONS[z];
        if (resDeg === undefined) {
            return reply.code(404).send('zoom level out of range');
        }

        // 计算需要请求的 WMTS 行列范围
        const colMin = Math.floor((bounds[0] - ORIGIN_X) / (resDeg * TILE_SIZE));
        const colMax = Math.floor((bounds[2] - ORIGIN_X) / (resDeg * TILE_SIZE));
        const rowMin = Math.floor((ORIGIN_Y - bounds[3]) / (resDeg * TILE_SIZE));
        const rowMax = Math.floor((ORIGIN_Y - bounds[1]) / (resDeg * TILE_SIZE));

        // 并发拉取所有命中的切片
        const canvas = createCanvas(TILE_SIZE, TILE_SIZE);
        const ctx = canvas.getContext('2d');
        const promises = [];

        for (let row = rowMin; row <= rowMax; row++) {
            for (let col = colMin; col <= colMax; col++) {
                const url = target_wmts_url.replace("${z}", z)
                    .replace("${row}", row)
                    .replace("${col}", col);
                promises.push(
                    fetch(url)
                        .then(res => {
                            return res.arrayBuffer();
                        })
                        .then(buf => {
                            const buffer = Buffer.from(buf);
                            return loadImage(buffer);
                        })
                        .then(img => {
                            // 求该瓦片在目标 canvas 上的像素位置
                            const tileLon = ORIGIN_X + col * resDeg * TILE_SIZE;
                            const tileLat = ORIGIN_Y - row * resDeg * TILE_SIZE;

                            const px = (tileLon - bounds[0]) / (bounds[2] - bounds[0]) * TILE_SIZE;
                            const py = (bounds[3] - tileLat) / (bounds[3] - bounds[1]) * TILE_SIZE;
                            const drawW = resDeg * TILE_SIZE / (bounds[2] - bounds[0]) * TILE_SIZE + 1;//+1 to eliminate the white line
                            const drawH = resDeg * TILE_SIZE / (bounds[3] - bounds[1]) * TILE_SIZE + 1;//+1 to eliminate the white line                            
                            ctx.drawImage(img, px, py, drawW, drawH);
                        })
                        .catch(err => {
                            request.log.warn(err.message);
                        })
                );
            }
        }

        await Promise.all(promises);
        // 返回合成图
        reply
            .header('Content-Type', 'image/png')
            .send(canvas.toBuffer('image/png'));
    })
// 启动
fastify.listen({ port: 3000 }, err => {
    if (err) throw err;
    fastify.log.info('server listening on http://localhost:3000');
});