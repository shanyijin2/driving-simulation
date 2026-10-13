# 极限刹车挑战

参考 <https://brake.tp0k.us/> 独立实现的纯前端 3D 刹车小游戏。Three.js + Vite，无后端、无外部模型或纹理请求。

## 本地运行

```sh
npm install
npm run dev
```

打开终端显示的本地地址。按住屏幕、公路区域、右下角刹车按钮，或键盘空格 / 下方向键制动。长按加力，松开卸力；首次制动后动力永久切断，达到 1612 N 踏板断裂。车速上限 260 km/h，路障在 2600 m 处。

个人最高分保存在浏览器本地，不提供联网排行榜。场景与翻滚动画为独立建模实现，并非原站模型或刚体引擎。支持手机竖屏、横屏与桌面，需要 WebGL 2。

## 车辆、路况与极限制动

首页可选重型 SUV、轻型跑车、老旧面包车，以及晴天、雨天、冰雪，共九种组合。车辆的加速、最高车速、制动力、踏板加力速度和卸力速度不同；雨天、冰雪降低抓地力并延长制动距离，场景同步显示雨雪。

所有车辆在 100 km/h 解锁制动，踏板断裂极限均为 1612 N。行驶中踏板力达到极限的 85%（约 1370 N）时积累极限制动时间，每秒奖励 350 分，只有成功刹停才能兑现。总分为基础分（刹车初速度² / 刹停用时）加临界奖励。各车辆和路况组合分别保存最佳纪录。

断裂后播放踏板断裂特写、慢动作翻滚、玻璃及零件飞散，并在结算给出趣味评价。车辆与天气参数用于游戏体验，不代表真实车辆性能。开启系统减少动态效果设置可降低闪烁并关闭镜头震动。

## 检查与构建

```sh
npm test
npm run build
npm run preview
```

构建产物位于 `dist/`，可部署到任何静态托管平台。

## Cloudflare Workers 部署（当前控制台的 Git 创建入口）

仓库已包含 `wrangler.jsonc`，将 Vite 构建的 `dist/` 作为静态资源发布，不需要 Worker 服务端代码。

连接本仓库后填写：

| 设置 | 值 |
| --- | --- |
| 项目名称 | `driving-simulation` |
| 生产分支 | `main` |
| 构建命令 | `npm run build` |
| 部署命令 | `npx wrangler deploy`（默认） |
| 根目录 | 留空 |

代码推送到 GitHub 后再点击部署。部署成功后使用控制台提供的 `workers.dev` 地址访问，后续推送可自动部署。

官方说明：[Workers 构建设置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)。

## Cloudflare Pages 部署（另一个可选入口）

### 连接 Git 仓库（推荐）

1. 将项目推送到 GitHub 或 GitLab。
2. 在 Cloudflare 控制台进入 **Workers & Pages**，创建 **Pages** 项目并连接仓库。
3. 选择以下构建设置：

| 设置 | 值 |
| --- | --- |
| 框架预设 | None |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| 根目录 | 留空 |
| 环境变量 | `NODE_VERSION=22` |

4. 保存并部署。之后推送到生产分支即可自动更新。

### 直接上传

先运行 `npm run build`，在 Pages 的 **Direct Upload** 流程上传 `dist` 文件夹。不要上传源码目录或 `node_modules`。

也可以使用 Cloudflare 官方 CLI：

```sh
npx wrangler pages deploy dist --project-name=driving-simulation
```

首次使用需按提示登录 Cloudflare。项目不需要数据库、API 密钥或运行时环境变量。

官方说明：[构建设置](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[直接上传](https://developers.cloudflare.com/pages/get-started/direct-upload/)。
