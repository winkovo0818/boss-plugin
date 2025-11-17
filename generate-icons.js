const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, 'icons', 'icon.svg');
  const iconsDir = path.join(__dirname, 'icons');
  
  // 读取SVG文件
  const svgBuffer = fs.readFileSync(svgPath);
  
  // 生成不同尺寸的PNG图标
  const sizes = [16, 48, 128];
  
  console.log('开始生成图标...');
  
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ 已生成 icon${size}.png`);
  }
  
  console.log('\n所有图标生成完成!');
}

generateIcons().catch(err => {
  console.error('生成图标时出错:', err);
  process.exit(1);
});
