// 文件解析服务 - 支持PDF、DOC、TXT等文件的内容提取
// 使用本地PDF.js库进行解析，无需调用外部API

/**
 * 本地解析文件（浏览器环境）
 */
async function parseFileLocally(file) {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // TXT文件 - 直接读取
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await readTextFile(file);
  }

  // PDF文件 - 使用PDF.js或提示用户
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await readPDFFile(file);
  }

  // DOC/DOCX文件 - 基础解析
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx') || 
      fileType === 'application/msword' || 
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await readDocFile(file);
  }

  throw new Error('不支持的文件格式');
}

/**
 * 读取文本文件
 */
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        success: true,
        content: e.target.result,
        filename: file.name,
        method: 'local-text'
      });
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 使用PDF.js读取PDF文件
 */
async function readPDFFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const text = await extractTextFromPDFWithPDFJS(arrayBuffer);
        
        if (text && text.length > 50) {
          console.log('PDF解析成功，内容长度:', text.length);
          resolve({
            success: true,
            content: text,
            filename: file.name,
            method: 'local-pdf-js'
          });
        } else {
          resolve({
            success: false,
            content: '【PDF文件解析失败】文件可能损坏或为扫描件，建议转换为TXT格式上传。',
            filename: file.name,
            method: 'local-pdf-failed'
          });
        }
      } catch (error) {
        console.error('PDF解析错误:', error);
        resolve({
          success: false,
          content: `【PDF文件解析失败】${error.message}，建议转换为TXT格式上传。`,
          filename: file.name,
          method: 'local-pdf-error'
        });
      }
    };
    reader.onerror = () => reject(new Error('PDF文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 使用PDF.js提取PDF文本内容
 */
async function extractTextFromPDFWithPDFJS(arrayBuffer) {
  try {
    // 检查PDF.js是否已加载
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js库未加载');
    }
    
    // 设置worker路径（使用本地文件）
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    
    // 加载PDF文档
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF页数:', pdf.numPages);
    
    let fullText = '';
    
    // 遍历所有页面提取文本
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // 提取文本项
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    // 清理文本
    fullText = fullText
      .replace(/\s+/g, ' ')  // 合并多余空格
      .replace(/\n{3,}/g, '\n\n')  // 合并多余换行
      .trim();
    
    console.log('PDF文本提取完成，长度:', fullText.length);
    return fullText;
    
  } catch (error) {
    console.error('PDF.js解析失败:', error);
    throw new Error('PDF解析失败: ' + error.message);
  }
}

/**
 * 读取DOC/DOCX文件（简化版）
 */
async function readDocFile(file) {
  // Word文档解析在浏览器中比较复杂，建议转换格式
  return {
    success: false,
    content: '【Word文档】暂不支持直接解析Word文档，请将简历转换为TXT或PDF格式上传。',
    filename: file.name,
    method: 'local-doc-unsupported'
  };
}

/**
 * 智能文件解析 - 使用本地方法解析文件
 */
async function parseResume(file, config = {}) {
  console.log('=== 开始本地文件解析 ===');
  console.log('文件名:', file.name);
  console.log('文件类型:', file.type);
  console.log('文件大小:', file.size);
  
  try {
    // 直接使用本地解析
    console.log('使用本地方法解析文件（PDF.js + FileReader）...');
    return await parseFileLocally(file);
  } catch (error) {
    console.error('文件解析失败:', error);
    return {
      success: false,
      content: `文件解析失败: ${error.message}`,
      filename: file.name,
      method: 'failed'
    };
  }
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseResume,
    parseFileLocally
  };
}
