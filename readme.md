# MapboxGL CGCS2000 Coordinate Transformation Service
# MapboxGL CGCS2000 坐标转换服务

## Project Introduction
## 项目介绍

This is a Fastify-based web service that transforms WMTS tile requests from MapboxGL (Mercator projection) to CGCS2000 coordinate system, redraws PNG tiles and returns them to the MapboxGL frontend. Main features include:

这是一个基于Fastify的Web服务，用于将mapboxgl对墨卡托坐标系下wmts瓦片请求转化为对cgcs2000坐标系下的瓦片请求，重新绘制png瓦片后返回给mapboxgl前端。项目主要功能包括：
- 接收前端mapboxgl Mercator投影的瓦片请求
  Receive tile requests from MapboxGL frontend in Mercator projection
- 将请求行列号转换为CGCS2000坐标系并计算瓦片四至坐标
  Convert tile row/column numbers to CGCS2000 coordinate system and calculate tile bounds
- 从cgcs2000 的WMTS服务获取对应区域的瓦片
  Fetch corresponding tiles from CGCS2000 WMTS service
- 合并多个瓦片并返回合成图像
  Merge multiple tiles and return the composite image

## Installation Steps
## 安装步骤

1. Ensure Node.js (recommended version 16+) and npm are installed
   确保已安装Node.js (建议版本16+)和npm
2. Clone this repository
   克隆本项目
3. Install dependencies:
   安装依赖：
```bash
npm install
```

## Usage
## 使用方法

   
1. Start the service 启动服务：
```bash
npm start
```
2. 服务默认运行在：http://localhost:3000
3. 请求格式：
```
/arcgis/rest/services/{folder}/{layer}/MapServer/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=imgmap&STYLE=default&TILEMATRIXSET=default028mm&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png
```
前端mapboxgl示例代码：
```js
        map.addLayer({
          id: "cgcs2000-img-layer",
          type: "raster",
          source: {
            type: "raster",
            tiles: [
              "http://localhost:3000/arcgis/rest/services/zj_tdt/services/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=imgmap&STYLE=default&TILEMATRIXSET=default028mm&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fpng"
            ],
            tileSize: 256
          },
          paint: {},
          layout: { visibility: "visible" },
        });
```

## Configuration
## 配置说明

- Modify the `target_wmts_url` variable in `app.js` to configure your WMTS service URL
- 修改`app.js`中的`target_wmts_url`变量配置您的WMTS服务地址
- Adjust the resolution parameters in the `RESOLUTIONS` array as needed
- 可根据需要调整`RESOLUTIONS`数组中的分辨率参数

## 开源协议

MIT License