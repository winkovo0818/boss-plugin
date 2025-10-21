// 文件解析服务 - 支持PDF、DOC等文件的内容提取

/**
 * 使用Kimi API解析文件（支持PDF、DOC、图片等）
 */
async function parseFileWithKimi(file, apiKey) {
  try {
    // 1. 上传文件到Kimi
    const fileObject = await uploadFileToKimi(file, apiKey);
    
    // 2. 获取文件内容
    const fileContent = await getKimiFileContent(fileObject.id, apiKey);
    
    return {
      success: true,
      content: fileContent,
      filename: file.name,
      method: 'kimi'
    };
  } catch (error) {
    console.error('Kimi文件解析失败:', error);
    throw error;
  }
}

/**
 * 上传文件到Kimi API
 */
async function uploadFileToKimi(file, apiKey) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', 'file-extract');

  const response = await fetch('https://api.moonshot.cn/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`文件上传失败: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 获取Kimi文件内容
 */
async function getKimiFileContent(fileId, apiKey) {
  const response = await fetch(`https://api.moonshot.cn/v1/files/${fileId}/content`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`获取文件内容失败: ${response.statusText}`);
  }

  return await response.text();
}

/**
 * 使用OpenAI API解析文件（需要先转换为文本）
 */
async function parseFileWithOpenAI(file, apiKey, baseURL) {
  // OpenAI本身不直接支持文件提取，需要其他方式
  // 这里使用客户端解析
  return await parseFileLocally(file);
}

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
 * 读取PDF文件（简化版）
 */
async function readPDFFile(file) {
  // 浏览器环境中解析PDF需要PDF.js库
  // 这里提供简化版本，建议用户使用TXT格式或配置Kimi API
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // 尝试提取文本（这里只是示例，实际效果有限）
        const arrayBuffer = e.target.result;
        const text = await extractTextFromPDF(arrayBuffer);
        
        if (text && text.length > 50) {
          resolve({
            success: true,
            content: text,
            filename: file.name,
            method: 'local-pdf'
          });
        } else {
          // 如果提取效果不好，建议使用Kimi API
          resolve({
            success: false,
            content: '【PDF文件】建议在设置中配置Kimi API以获得更好的PDF解析效果，或将简历转换为TXT格式上传。',
            filename: file.name,
            method: 'local-pdf-limited',
            needsKimi: true
          });
        }
      } catch (error) {
        resolve({
          success: false,
          content: '【PDF文件】无法完整解析，建议配置Kimi API或使用TXT格式。',
          filename: file.name,
          method: 'local-pdf-failed',
          needsKimi: true
        });
      }
    };
    reader.onerror = () => reject(new Error('PDF文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 简单的PDF文本提取（非常基础）
 */
async function extractTextFromPDF(arrayBuffer) {
  try {
    // 这是一个极简的PDF文本提取
    // 实际项目应该使用PDF.js或Kimi API
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // 提取可读文本（这个方法很粗糙）
    const matches = text.match(/[\u4e00-\u9fa5a-zA-Z0-9\s\.,;:!?()，。；：！？（）]+/g);
    if (matches) {
      return matches.join(' ').substring(0, 5000); // 限制长度
    }
    return '';
  } catch (error) {
    console.error('PDF文本提取失败:', error);
    return '';
  }
}

/**
 * 读取DOC/DOCX文件（简化版）
 */
async function readDocFile(file) {
  // Word文档解析在浏览器中比较复杂
  // 建议使用Kimi API或转换为TXT
  return {
    success: false,
    content: '【Word文档】建议在设置中配置Kimi API以解析Word文档，或将简历转换为TXT/PDF格式上传。',
    filename: file.name,
    method: 'local-doc-unsupported',
    needsKimi: true
  };
}

/**
 * 智能文件解析 - 根据配置选择最佳方案
 */
async function parseResume(file, config = {}) {
  const { useKimi = false, kimiApiKey = '', aiProvider = 'none' } = config;

  try {
    // 优先使用Kimi API（如果配置了）
    if (useKimi && kimiApiKey) {
      console.log('使用Kimi API解析文件...');
      return await parseFileWithKimi(file, kimiApiKey);
    }

    // 或者使用其他AI服务（如果支持文件解析）
    if (aiProvider === 'kimi' && kimiApiKey) {
      console.log('使用Kimi API解析文件...');
      return await parseFileWithKimi(file, kimiApiKey);
    }

    // 否则使用本地解析
    console.log('使用本地方法解析文件...');
    return await parseFileLocally(file);

  } catch (error) {
    console.error('文件解析失败:', error);
    
    // 降级到本地解析
    try {
      return await parseFileLocally(file);
    } catch (localError) {
      return {
        success: false,
        content: `文件解析失败: ${error.message}`,
        filename: file.name,
        method: 'failed'
      };
    }
  }
}

/**
 * 获取文件解析配置
 */
async function getFileParseConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiConfig'], (result) => {
      const config = result.aiConfig || {};
      resolve({
        useKimi: config.provider === 'kimi',
        kimiApiKey: config.apiKey || '',
        aiProvider: config.provider || 'none'
      });
    });
  });
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseResume,
    parseFileWithKimi,
    parseFileLocally,
    getFileParseConfig
  };
}
