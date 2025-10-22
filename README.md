# 智能求职助手🚀

> 智能匹配简历与岗位JD，AI驱动的个性化打招呼生成工具

一款基于AI技术的Chrome浏览器扩展，帮助求职者快速分析岗位匹配度，生成个性化打招呼语句，提升求职效率。

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://www.google.com/chrome/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 功能特点

### 核心功能

1. **🎯 智能匹配分析** - AI深度分析简历与岗位的匹配度（0-100分）
2. **📄 多简历管理** - 支持上传5份简历，针对不同岗位灵活切换
3. **💬 自然打招呼** - 3种风格（轻松/正式/创意），口语化表达，去AI味
4. **⚡ 一键生成3风格** - 单次AI调用生成3种风格，节省66%成本
5. **📊 数据统计面板** - 分析历史、匹配度分布、使用统计一目了然
6. **🗑️ 历史记录管理** - 支持单条删除、批量清空，精确控制
7. **⚡ 智能缓存** - 相同岗位1小时内缓存，节省API成本
8. **🔒 隐私保护** - 自动过滤简历中的手机号、邮箱等6类敏感信息
9. **🔄 自动重试机制** - AI调用失败自动重试3次，提升成功率

### 技术亮点

- ✅ **AI驱动** - 支持OpenAI、Kimi、Claude、智谱AI、通义千问等
- ✅ **去AI味** - 口语化prompt，生成真人般自然的打招呼语句
- ✅ **成本优化** - 三风格一次生成，API调用减少66%
- ✅ **隐私安全** - CSP内容安全策略，敏感信息自动过滤
- ✅ **性能优化** - DocumentFragment渲染，智能防抖，缓存策略
- ✅ **用户体验** - 现代化UI，流畅动画，详细反馈，独立操作流程

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

## 📖 使用说明

### 首次使用

1. **配置AI服务**
   - 点击扩展图标右键 → 选项
   - 选择AI提供商（推荐Kimi）
   - 输入API Key和BaseURL
   - 点击"测试连接"确认配置

2. **上传简历**
   - 在设置页面点击"添加简历"
   - 支持最多5份简历
   - 可以为不同简历命名（如：技术岗简历、管理岗简历）

### 日常使用

1. 打开BOSS直聘网站，浏览岗位
2. 点击感兴趣的岗位卡片或进入详情页
3. 点击浏览器工具栏的扩展图标
4. 点击"开始分析匹配度"
5. 查看详细的匹配报告：
   - 匹配分数（0-100）
   - 匹配优势（3-5条）
   - 可提升点（2-4条）
6. 如果匹配度≥70分，点击"生成打招呼语句"按钮
7. 等待AI生成（一次生成3种风格，约3-5秒）
8. 切换风格预览（轻松/正式/创意），瞬间切换无需等待
9. 点击"复制"按钮，粘贴到聊天框发送

### 历史记录管理

- 设置页面查看使用统计
- 完整的分析历史记录
- 单条删除 - 精确控制
- 批量清空 - 快速清理
- 匹配度分布图
- 最高/最低匹配岗位

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

## 📁 项目结构

```
boss/
├── manifest.json              # 插件配置清单
├── content.js                # 内容脚本，提取页面JD信息
├── background.js             # 后台服务，处理匹配逻辑
├── popup.html/css/js        # 主弹窗界面
├── options.html/css/js      # 设置页面
├── ai-service.js            # AI服务统一接口
├── file-parser.js           # 文件解析服务
├── cache-manager.js         # 智能缓存管理
├── privacy-filter.js        # 隐私信息过滤
├── history-utils.js         # 历史记录工具
├── stats-manager.js         # 统计数据管理
├── resume-manager.js        # 多简历管理
├── icons/                   # 图标资源
├── logs/                    # 更新日志
│   └── update-2025-10-21.md
├── LICENSE                  # MIT许可证
└── README.md               # 项目文档
```

## 🛠️ 技术栈

### 核心技术
- **Manifest V3** - Chrome扩展最新标准
- **Vanilla JavaScript** - 原生JS，零依赖
- **Chrome Extension APIs** - 扩展程序API
- **CSS3** - 现代化UI设计

### AI服务支持
- **OpenAI GPT** - GPT-5/GPT-4
- **Kimi (Moonshot AI)** - 推荐，中文优化
- **Claude** - Anthropic Claude 4
- **智谱AI** - GLM-4
- **通义千问** - Qwen系列

### 性能优化
- **DocumentFragment** - 批量DOM操作
- **防抖节流** - 智能触发控制
- **缓存策略** - 1小时智能缓存
- **懒加载** - 按需加载资源

## 注意事项

1. 请确保在BOSS直聘岗位详情页使用本插件
2. 简历文件大小建议不超过5MB
3. **强烈建议配置Kimi API**以获得最佳PDF/DOC解析效果
4. TXT格式简历无需配置即可使用
5. 匹配分析结果仅供参考

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 👨‍💻 作者

**云淡风轻**

- GitHub: [@winkovo0818](https://github.com/winkovo0818)
- 项目地址: [boss-plugin](https://github.com/winkovo0818/boss-plugin)
- 联系方式: QQ 1026771081

致力于提升求职效率。

## ⚠️ 免责声明

1. 本工具仅供学习和个人使用
2. 匹配分析结果仅供参考，不构成任何投递建议
3. 请遵守BOSS直聘平台使用规则
4. 使用本工具产生的任何后果由使用者自行承担

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**
