# BOSS直聘招聘助手

智能匹配简历与岗位JD，生成个性化打招呼语句的Chrome浏览器插件。

## 功能特点

1. **自动提取岗位JD** - 自动识别并提取BOSS直聘岗位详情页的职位描述信息
2. **简历智能解析** - 支持PDF、DOC、DOCX、TXT格式，集成Kimi API实现高精度文件解析
3. **AI匹配分析** - 使用AI技术分析简历与岗位的匹配度，给出详细的匹配报告
4. **智能打招呼** - 根据匹配结果和选择的风格（轻松/正式/专业），自动生成个性化的打招呼语句
5. **匹配度评估** - 如果匹配度低于70分，会建议用户不要投递，节省时间

## 安装方法

### Chrome浏览器

1. 下载本项目代码到本地
2. 打开Chrome浏览器，进入扩展程序页面（chrome://extensions/）
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目的文件夹
6. 安装完成

### Edge浏览器

1. 下载本项目代码到本地
2. 打开Edge浏览器，进入扩展页面（edge://extensions/）
3. 开启左下角的"开发人员模式"
4. 点击"加载解压缩的扩展"
5. 选择本项目的文件夹
6. 安装完成

## 使用说明

1. 打开BOSS直聘网站，进入任意岗位详情页
2. 点击浏览器工具栏中的插件图标
3. 上传你的简历文件（支持PDF、DOC、DOCX、TXT）
4. 点击"开始分析匹配度"按钮
5. 查看匹配结果和建议
6. 如果匹配度>=70分，可以选择风格生成打招呼语句
7. 点击"复制"按钮，直接粘贴到BOSS直聘的聊天框

## AI配置（推荐）

### 文件解析（Kimi API） - 强烈推荐

为了更好地解析PDF和Word文档简历，强烈建议配置Kimi API：

1. 访问 https://platform.moonshot.cn/console/api-keys
2. 注册并创建API Key
3. 在插件设置中选择"Kimi (Moonshot AI)"
4. 输入API Key并保存

**Kimi API优势**：
- 支持PDF、DOC、DOCX、图片等多种格式
- 强大的OCR能力，可识别扫描件
- 对中文简历优化，解析准确率高95%+
- 支持复杂排版和表格

### AI匹配分析（可选）

支持多种AI服务提供更智能的匹配分析：

- **Kimi (Moonshot AI)** - 推荐，同时支持文件解析
- OpenAI GPT
- Anthropic Claude
- 智谱AI
- 通义千问

配置方法：右键插件图标 → 选项 → 选择AI服务提供商 → 输入API Key

## 项目结构

```
boss/
├── manifest.json          # 插件配置文件
├── content.js            # 内容脚本，提取页面JD信息
├── background.js         # 后台服务，处理匹配逻辑
├── popup.html/css/js    # 主界面
├── options.html/css/js  # 设置页面
├── file-parser.js       # 文件解析服务（支持Kimi API）
├── ai-service.js        # AI服务模块
├── icons/               # 图标文件夹
├── logs/                # 更新日志
└── README.md            # 说明文档
```

## 技术栈

- Manifest V3 - 最新浏览器插件标准
- Vanilla JavaScript - 原生JS，无额外依赖
- Chrome Extension APIs - 浏览器插件API
- Kimi API - 文件解析服务
- 本地CSS - 现代化UI设计

## 注意事项

1. 请确保在BOSS直聘岗位详情页使用本插件
2. 简历文件大小建议不超过5MB
3. **强烈建议配置Kimi API**以获得最佳PDF/DOC解析效果
4. TXT格式简历无需配置即可使用
5. 匹配分析结果仅供参考

## 更新日志

### v1.0.0 (2025-10-21)
- 初始版本发布
- 支持岗位JD自动提取
- 集成Kimi API实现PDF/DOC高精度解析
- 智能匹配度分析（本地+AI双模式）
- 多风格打招呼语句生成
- 现代化UI设计，符合插件CSP规范
- 完整的文档和使用指南

## 许可证

MIT License
