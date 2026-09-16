# AI 全能学习导师

一个面向 Markdown 学习资料的 AI 学习平台。系统将个人笔记构建为可检索的知识库，并提供连续问答、学习计划、练习与复习、知识管理和任务工作区。

把 Markdown 笔记变成一个可以提问、整理知识、安排学习和持续复习的工作台。适合整理课程资料、学习技术文档，以及围绕个人知识库进行问答。

![学习工作台：会话列表、知识问答与学习助手](docs/assets/product-overview.png)

> 以下均为本机部署后的实际界面截图，使用独立演示账号和示例资料。首页对话是项目内置示例，用于展示交互布局；侧栏“128 万条”为现有界面的固定展示文案，并非本次部署的实际索引数量。实际知识量以已导入文件和检索统计为准。

## 主要功能

- **AI 知识问答**：结合已上传的 Markdown 资料进行检索增强问答。
- **连续对话**：按会话保留上下文，支持多轮学习交流。
- **知识库管理**：上传、查看和移除个人知识文件。
- **学习闭环**：学习计划、笔记、AI 练习、错题、复习提醒和每周总结。
- **任务工作区**：管理 Markdown 文件，并通过 AI 生成或整理内容。
- **用户与管理**：支持注册、登录、统计和管理后台。
- **模型切换**：支持 OpenAI 兼容云端 API，也可连接本机 Ollama。

## 功能演示

### 从对话到学习路线

围绕当前会话生成分天学习任务，逐项记录完成状态。学习管理将路线、笔记、练习、错题和复习安排集中在一起，方便继续上一次的学习。

![学习路线：五天任务与完成状态](docs/assets/learning-plan.png)

### 用练习检验理解

根据当前会话的回答生成练习，结合提示用自己的话作答。提交后可查看反馈，并在学习管理中继续跟踪练习记录与错题。

![练习页面：围绕 RAG 与 Agent 的三道练习题](docs/assets/practice-quiz.png)

### 管理自己的 Markdown 知识库

上传学习笔记后，系统将文档切分并加入检索。知识库页面展示文件名称、大小和知识片段数量，也可以移除不再需要的资料。

![知识库管理：三个示例文件及其检索片段](docs/assets/knowledge-library.png)

### 在工作区沉淀学习成果

通过文件目录管理 Markdown 资料，在编辑与预览之间切换，将当前会话保存为文件。工作区还提供 AI 生成入口，便于围绕已有内容继续整理。

![Markdown 工作区：文件目录与 RAG 基础笔记预览](docs/assets/markdown-workspace.png)

## 推荐体验流程

1. 注册并登录账号，上传一份自己的 Markdown 学习笔记。
2. 配置可用的模型服务，围绕笔记提问并继续追问。
3. 将当前会话整理为学习路线或笔记，再生成练习检验理解。
4. 在学习管理中跟踪进度，并将成果保存到 Markdown 工作区。

## 一键启动（推荐）

### 1. 准备环境

安装并启动 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。Windows 环境需要启用 WSL 2，Docker Desktop 安装程序会提供引导。

### 2. 下载项目

在 GitHub 页面选择 **Code → Download ZIP** 并解压，或者执行：

```powershell
git clone https://github.com/shuangye231/md-rag-tutor.git
cd md-rag-tutor
```

### 3. 配置并启动

双击 `setup-and-start.bat`。首次启动时脚本会询问 OpenAI 兼容 API Key 和 API 服务地址，直接回车可使用默认地址。

配置仅写入本机 `.env`，不会上传 GitHub。构建完成后浏览器会自动打开 `http://localhost:8899`。

首次运行需要下载 Docker 镜像、Python 依赖和 Embedding 模型，耗时取决于网络速度。以后再次双击脚本会复用已有配置与缓存。

## 修改 API 配置

使用文本编辑器打开项目根目录的 `.env`：

```dotenv
PRO_API_KEY=填写甲方自己的APIKey
CLOUD_BASE_URL=https://api.ccode.vip/v1
```

更换 OpenAI、DeepSeek 或其他 OpenAI 兼容供应商时，应同时填写该供应商的 Key 和 Base URL。保存后执行 `docker compose up -d`。

项目不会上传 `.env`、用户数据库、上传资料或模型缓存。请勿把真实 API Key 写入源码或提交到 Git。

### 可选：使用本机 Ollama

先在宿主机启动 Ollama，并在 `.env` 中保留：

```dotenv
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

进入系统后切换到本地模型。仅使用 Ollama 时，`PRO_API_KEY` 可以留空。

## 常用操作

停止服务：双击 `stop.bat`，或执行 `docker compose down`。

重新启动：

```powershell
docker compose up -d
```

查看日志：

```powershell
docker compose logs -f tutor
```

检查运行状态：

```powershell
Invoke-RestMethod http://localhost:8899/api/health
```

运行数据保存在项目根目录的 `data/`，模型缓存保存在 `.hf-cache/`。停止或重建容器不会清除这两个目录。

## API 调用

FastAPI 自动接口文档位于 `http://localhost:8899/docs`。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 服务健康检查 |
| `POST` | `/api/register` | 注册用户 |
| `POST` | `/api/login` | 用户登录 |
| `POST` | `/api/upload` | 上传 Markdown 知识文件 |
| `POST` | `/api/ask` | 发起 RAG 问答 |
| `GET` | `/api/models` | 查看可用模型 |
| `POST` | `/api/models/switch` | 切换模型 |
| `GET` | `/api/stats` | 查看知识库统计 |

健康检查示例：

```powershell
Invoke-RestMethod http://localhost:8899/api/health
```

需要登录的接口会使用登录返回的会话令牌。完整请求结构以 `/docs` 中的在线接口定义为准。

## 项目结构

```text
├─ app.py                 # FastAPI 后端与业务接口
├─ rag_engine.py          # RAG、Embedding、检索与模型调用
├─ learning_insights.py   # 学习复习与统计辅助逻辑
├─ web/                   # React 前端源码
├─ templates/             # 传统页面与管理页面
├─ static/                # 传统页面的 CSS 和 JavaScript
├─ builtin_knowledge/     # 产品内置初始知识
├─ docs/assets/           # 文档图片
├─ Dockerfile
└─ docker-compose.yml
```

## 常见问题

### 提示 Docker 未找到或未运行

确认 Docker Desktop 已安装并完成启动，再重新运行 `setup-and-start.bat`。

### 8899 端口被占用

修改 `docker-compose.yml` 中的端口映射，例如将 `8899:8899` 改为 `8900:8899`，之后访问 `http://localhost:8900`。

### AI 请求提示 Key 无效

检查 `.env` 中的 `PRO_API_KEY` 和 `CLOUD_BASE_URL` 是否来自同一个服务商，保存后执行 `docker compose up -d`。

### 首次启动很慢

首次构建会下载 PyTorch、前端依赖和多语言 Embedding 模型。下载完成后会缓存在本机，后续启动会明显加快。

## 许可

本项目采用 [MIT License](LICENSE)。
