/**
 * BOSS直聘招聘助手 - Error Handler
 * 
 * @description 统一错误处理系统，提供友好的错误提示和解决方案
 * @author 云淡风轻 (winkovo0818)
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 * @version 1.1.0
 */

/**
 * 错误类型映射表
 */
const ERROR_MESSAGES = {
  // PDF解析相关
  'PDF.js库未加载': {
    title: 'PDF解析库加载失败',
    message: '无法加载PDF.js库，PDF文件可能无法解析',
    solution: '请刷新页面重试，或检查网络连接是否正常',
    action: { text: '重新加载', handler: () => window.location.reload() }
  },
  'PDF解析失败': {
    title: 'PDF文件解析失败',
    message: '无法从PDF中提取文本内容',
    solution: '1. 检查PDF是否损坏<br>2. 如果是扫描版PDF，请转换为TXT格式<br>3. 尝试使用其他格式（TXT推荐）',
    action: null
  },
  'PDF文件读取失败': {
    title: 'PDF文件读取出错',
    message: '读取PDF文件时发生错误',
    solution: '请确认文件没有损坏，可以尝试重新上传',
    action: null
  },
  
  // AI配置相关
  '未配置AI服务': {
    title: '还未配置AI服务',
    message: '需要配置API Key才能使用智能匹配分析功能',
    solution: '请前往设置页面配置AI服务（API Key、Base URL和模型名称）',
    action: { text: '前往设置', handler: () => chrome.runtime.openOptionsPage() }
  },
  '未配置AI': {
    title: '还未配置AI服务',
    message: '需要配置API Key才能生成打招呼语句',
    solution: '请前往设置页面配置AI服务（API Key、Base URL和模型名称）',
    action: { text: '前往设置', handler: () => chrome.runtime.openOptionsPage() }
  },
  
  // API调用相关
  'AI API调用失败': {
    title: 'AI服务调用失败',
    message: 'API请求未成功',
    solution: '1. 检查API Key是否正确<br>2. 检查Base URL是否正确<br>3. 检查网络连接<br>4. 确认API额度是否充足',
    action: { text: '检查设置', handler: () => chrome.runtime.openOptionsPage() }
  },
  '请求超时': {
    title: 'API请求超时',
    message: 'AI服务响应时间过长',
    solution: '1. 检查网络连接<br>2. 稍后重试<br>3. 如果多次失败，可能是服务器问题',
    action: { text: '重试', handler: null } // handler由调用方提供
  },
  '重试 3 次后仍然失败': {
    title: 'AI服务多次调用失败',
    message: '已自动重试3次但仍然失败',
    solution: '1. 检查API配置是否正确<br>2. 检查网络连接<br>3. 查看控制台了解详细错误<br>4. 联系API服务商确认服务状态',
    action: { text: '检查设置', handler: () => chrome.runtime.openOptionsPage() }
  },
  
  // 文件上传相关
  '不支持的文件格式': {
    title: '文件格式不支持',
    message: '只支持PDF、TXT格式的简历文件',
    solution: '请将简历转换为PDF或TXT格式后重新上传<br>（推荐TXT格式，解析准确率最高）',
    action: null
  },
  '文件大小不能超过 5MB': {
    title: '文件太大',
    message: '简历文件不能超过5MB',
    solution: '1. 压缩PDF文件<br>2. 或转换为TXT格式<br>3. 删除简历中的大图片',
    action: null
  },
  '文件读取失败': {
    title: '文件读取出错',
    message: '无法读取上传的文件',
    solution: '1. 检查文件是否损坏<br>2. 重新选择文件上传<br>3. 尝试其他格式',
    action: null
  },
  '简历内容太短': {
    title: '简历内容不足',
    message: '提取到的简历内容少于50字符',
    solution: '1. 确认上传了正确的简历文件<br>2. 检查简历格式是否正确<br>3. 建议使用TXT格式',
    action: null
  },
  '最多只能上传5份简历': {
    title: '简历数量已达上限',
    message: '最多支持5份简历',
    solution: '请先删除不需要的简历，再上传新的简历',
    action: null
  },
  
  // 页面提取相关
  '未检测到岗位信息': {
    title: '无法识别岗位信息',
    message: '当前页面未检测到岗位详情',
    solution: '1. 确保在BOSS直聘的岗位详情页使用<br>2. 刷新页面重试<br>3. 或点击岗位卡片后使用',
    action: { text: '刷新页面', handler: () => window.location.reload() }
  },
  '请先上传简历': {
    title: '还没有上传简历',
    message: '需要先上传简历才能进行匹配分析',
    solution: '请前往设置页面上传你的简历（支持PDF和TXT格式）',
    action: { text: '前往设置', handler: () => chrome.runtime.openOptionsPage() }
  },
  
  // 通用错误
  '网络错误': {
    title: '网络连接失败',
    message: '无法连接到服务器',
    solution: '1. 检查网络连接<br>2. 检查是否需要代理<br>3. 稍后重试',
    action: { text: '重试', handler: null }
  },
  '未知错误': {
    title: '发生未知错误',
    message: '抱歉，发生了意外错误',
    solution: '请查看浏览器控制台了解详细信息，或联系开发者反馈问题',
    action: null
  }
};

/**
 * 错误处理类
 */
class ErrorHandler {
  /**
   * 处理错误并返回友好的提示信息
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} context - 错误发生的上下文（可选）
   * @returns {Object} 包含标题、消息、解决方案和操作的对象
   */
  static handle(error, context = '') {
    console.error(`[ErrorHandler] ${context}:`, error);
    
    // 提取错误消息
    let errorMessage = '';
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && error.message) {
      errorMessage = error.message;
    }
    
    // 尝试匹配错误类型
    let errorInfo = null;
    
    // 精确匹配
    if (ERROR_MESSAGES[errorMessage]) {
      errorInfo = ERROR_MESSAGES[errorMessage];
    } else {
      // 模糊匹配
      for (const key in ERROR_MESSAGES) {
        if (errorMessage.includes(key)) {
          errorInfo = ERROR_MESSAGES[key];
          break;
        }
      }
    }
    
    // 如果没有匹配到，使用通用错误
    if (!errorInfo) {
      errorInfo = {
        title: '操作失败',
        message: errorMessage || '发生未知错误',
        solution: '请查看控制台了解详细信息，或重试操作',
        action: null
      };
    }
    
    return {
      ...errorInfo,
      originalError: error,
      context: context
    };
  }
  
  /**
   * 显示错误消息（在popup或options页面中使用）
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} context - 错误发生的上下文
   * @param {Function} showMessageFn - 显示消息的函数
   */
  static showError(error, context, showMessageFn) {
    const errorInfo = this.handle(error, context);
    
    // 构建完整的错误消息
    let fullMessage = `<strong>${errorInfo.title}</strong><br>`;
    fullMessage += `${errorInfo.message}<br><br>`;
    fullMessage += `<small>💡 解决方案：<br>${errorInfo.solution}</small>`;
    
    showMessageFn(fullMessage, 'error');
    
    return errorInfo;
  }
  
  /**
   * 获取错误的简短描述
   * @param {Error|string} error - 错误对象或错误消息
   * @returns {string} 简短的错误描述
   */
  static getShortMessage(error) {
    const errorInfo = this.handle(error);
    return errorInfo.message;
  }
  
  /**
   * 判断错误是否可重试
   * @param {Error|string} error - 错误对象或错误消息
   * @returns {boolean} 是否可重试
   */
  static isRetryable(error) {
    const retryableErrors = [
      '网络错误',
      '请求超时',
      'API请求超时',
      'AI API调用失败'
    ];
    
    const errorMessage = typeof error === 'string' ? error : error.message;
    return retryableErrors.some(key => errorMessage.includes(key));
  }
}

/**
 * 导出错误处理器
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler, ERROR_MESSAGES };
}
