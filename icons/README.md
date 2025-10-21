# 图标说明

## 图标要求

浏览器插件需要以下尺寸的PNG格式图标：
- icon16.png (16x16像素)
- icon48.png (48x48像素)  
- icon128.png (128x128像素)

## 生成图标

### 方法1：在线转换

1. 访问 https://cloudconvert.com/svg-to-png
2. 上传本文件夹中的 `icon.svg` 文件
3. 设置输出尺寸为 16x16、48x48、128x128
4. 下载转换后的PNG文件
5. 重命名为对应的文件名并放置在本文件夹

### 方法2：使用设计工具

使用Photoshop、GIMP、Figma等设计工具：
1. 打开 `icon.svg`
2. 导出为PNG格式
3. 分别导出三种尺寸
4. 保存到本文件夹

### 方法3：使用命令行工具

如果安装了ImageMagick：

```bash
# Windows PowerShell
magick icon.svg -resize 16x16 icon16.png
magick icon.svg -resize 48x48 icon48.png
magick icon.svg -resize 128x128 icon128.png
```

## 临时方案

如果暂时没有PNG图标，浏览器会使用默认的扩展程序图标，不影响插件功能使用。
