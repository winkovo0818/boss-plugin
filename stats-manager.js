/**
 * BOSS直聘招聘助手 - Statistics Manager
 * 
 * @description 统计数据管理，分析使用情况和匹配度分布
 * @author 云淡风轻 (winkovo0818)
 * @github https://github.com/winkovo0818/boss-plugin
 * @license MIT
 */

/**
 * 获取统计数据
 */
async function getStatistics() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['history'], (result) => {
      const history = result.history || [];
      
      if (history.length === 0) {
        resolve({
          totalAnalysis: 0,
          averageScore: 0,
          highestMatch: null,
          lowestMatch: null,
          scoreDistribution: { high: 0, medium: 0, low: 0 },
          recentActivity: []
        });
        return;
      }
      
      // 总分析次数
      const totalAnalysis = history.length;
      
      // 平均匹配度
      const totalScore = history.reduce((sum, record) => sum + (record.score || 0), 0);
      const averageScore = Math.round(totalScore / totalAnalysis);
      
      // 最高匹配岗位
      const highestMatch = history.reduce((max, record) => 
        (record.score > (max?.score || 0)) ? record : max
      , history[0]);
      
      // 最低匹配岗位
      const lowestMatch = history.reduce((min, record) => 
        (record.score < (min?.score || 100)) ? record : min
      , history[0]);
      
      // 分数分布
      const scoreDistribution = {
        high: history.filter(r => r.score >= 75).length,
        medium: history.filter(r => r.score >= 60 && r.score < 75).length,
        low: history.filter(r => r.score < 60).length
      };
      
      // 最近7天活动
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentActivity = history
        .filter(r => new Date(r.timestamp).getTime() > sevenDaysAgo)
        .map(r => ({
          date: new Date(r.timestamp).toLocaleDateString('zh-CN'),
          score: r.score
        }));
      
      // 按日期分组统计
      const activityByDate = {};
      recentActivity.forEach(item => {
        if (!activityByDate[item.date]) {
          activityByDate[item.date] = { count: 0, totalScore: 0 };
        }
        activityByDate[item.date].count++;
        activityByDate[item.date].totalScore += item.score;
      });
      
      const dailyStats = Object.entries(activityByDate).map(([date, data]) => ({
        date,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count)
      })).slice(-7);
      
      resolve({
        totalAnalysis,
        averageScore,
        highestMatch,
        lowestMatch,
        scoreDistribution,
        recentActivity: dailyStats
      });
    });
  });
}

/**
 * 获取公司统计（分析过哪些公司）
 */
async function getCompanyStatistics() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['history'], (result) => {
      const history = result.history || [];
      
      const companyStats = {};
      history.forEach(record => {
        const company = record.company || '未知公司';
        if (!companyStats[company]) {
          companyStats[company] = {
            count: 0,
            totalScore: 0,
            positions: []
          };
        }
        companyStats[company].count++;
        companyStats[company].totalScore += record.score;
        companyStats[company].positions.push({
          title: record.title,
          score: record.score
        });
      });
      
      const companies = Object.entries(companyStats).map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
        positions: data.positions
      })).sort((a, b) => b.count - a.count).slice(0, 10);
      
      resolve(companies);
    });
  });
}

/**
 * 导出统计数据
 */
async function exportStatistics() {
  const stats = await getStatistics();
  const companies = await getCompanyStatistics();
  
  return {
    exportTime: new Date().toISOString(),
    statistics: stats,
    companies: companies
  };
}
