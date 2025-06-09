// utils/advisorUtils.js

// Hàm tạo phân tích dữ liệu quét
export const createScanAnalysis = (scanHistory, historyStats) => {
  if (!scanHistory || scanHistory.length === 0) {
    return {
      message:
        "Tôi không tìm thấy dữ liệu quét nào. Vui lòng quét một số lá cà phê trước khi yêu cầu phân tích.",
      type: "analysis",
    };
  }

  // Tạo phân tích dữ liệu quét
  let analysisText = "**Phân tích dữ liệu quét lá cà phê của bạn**\n\n";

  analysisText += `Tôi đã phân tích ${scanHistory.length} mẫu lá cà phê từ dữ liệu quét của bạn.\n\n`;
  analysisText += `📊 **Tổng quan sức khỏe vườn cây:**\n`;

  analysisText += `• Cây khỏe mạnh: ${
    historyStats.healthyTrees
  } mẫu (${Math.round(
    (historyStats.healthyTrees / scanHistory.length) * 100
  )}%)\n`;
  analysisText += `• Cây có bệnh: ${
    historyStats.diseasedTrees
  } mẫu (${Math.round(
    (historyStats.diseasedTrees / scanHistory.length) * 100
  )}%)\n\n`;

  // Chi tiết các loại bệnh nếu có
  if (
    historyStats.diseasedTrees > 0 &&
    Object.keys(historyStats.diseases || {}).length > 0
  ) {
    analysisText += `🔍 **Chi tiết các loại bệnh phát hiện:**\n`;
    Object.entries(historyStats.diseases).forEach(([disease, count]) => {
      const percentage = Math.round((count / scanHistory.length) * 100);
      analysisText += `• ${disease}: ${count} mẫu (${percentage}%)\n`;
    });
    analysisText += `\n`;

    // Đề xuất xử lý cho bệnh phổ biến nhất
    const mostCommonDisease = Object.entries(historyStats.diseases).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    analysisText += `⚠️ **Cảnh báo và đề xuất:**\n`;

    if (mostCommonDisease === "Gỉ sắt") {
      analysisText += `Bệnh gỉ sắt đang là vấn đề chính trong vườn cây của bạn. Đây là loại bệnh nấm phổ biến trên cây cà phê và có thể lây lan nhanh chóng trong điều kiện ẩm ướt.\n\n`;
      analysisText += `**Đề xuất xử lý:**\n`;
      analysisText += `1. Phun thuốc fungicide chứa đồng (copper) hoặc mancozeb theo hướng dẫn\n`;
      analysisText += `2. Cắt tỉa các cành bị bệnh nặng và tiêu hủy\n`;
      analysisText += `3. Cải thiện thông gió trong vườn bằng cách cắt tỉa thích hợp\n`;
      analysisText += `4. Kiểm soát độ ẩm, tránh tưới quá nhiều và tưới vào gốc thay vì lá\n`;
    } else if (mostCommonDisease === "Phoma") {
      analysisText += `Bệnh phoma đang là vấn đề chính trong vườn cây của bạn. Bệnh này thường xuất hiện trong điều kiện nhiệt độ thấp và ẩm ướt.\n\n`;
      analysisText += `**Đề xuất xử lý:**\n`;
      analysisText += `1. Phun thuốc fungicide chứa azoxystrobin hoặc copper oxychloride\n`;
      analysisText += `2. Cắt tỉa và loại bỏ các bộ phận bị nhiễm bệnh\n`;
      analysisText += `3. Cải thiện thoát nước trong vườn\n`;
      analysisText += `4. Bón phân cân đối để tăng sức đề kháng cho cây\n`;
    } else if (mostCommonDisease === "Miner") {
      analysisText += `Bệnh miner (sâu đục lá) đang là vấn đề chính trong vườn cây của bạn. Đây là loài côn trùng tấn công lá cà phê và tạo các đường hầm bên trong lá.\n\n`;
      analysisText += `**Đề xuất xử lý:**\n`;
      analysisText += `1. Sử dụng thuốc trừ sâu hệ thống chứa imidacloprid hoặc thiamethoxam\n`;
      analysisText += `2. Thả các thiên địch như ong ký sinh để kiểm soát tự nhiên\n`;
      analysisText += `3. Loại bỏ và tiêu hủy lá bị nhiễm nặng\n`;
      analysisText += `4. Giám sát thường xuyên để phát hiện sớm\n`;
    } else if (mostCommonDisease === "Cerco") {
      analysisText += `Bệnh đốm lá Cercospora đang là vấn đề chính trong vườn cây của bạn. Bệnh này thường liên quan đến tình trạng thiếu dinh dưỡng của cây.\n\n`;
      analysisText += `**Đề xuất xử lý:**\n`;
      analysisText += `1. Phun thuốc trừ nấm chứa copper hoặc mancozeb\n`;
      analysisText += `2. Cải thiện dinh dưỡng cây trồng, đặc biệt là bổ sung đạm và kali\n`;
      analysisText += `3. Tăng cường thoát nước để giảm độ ẩm\n`;
      analysisText += `4. Cắt tỉa để cải thiện thông gió\n`;
    } else {
      analysisText += `Có nhiều loại bệnh khác nhau trong vườn cây của bạn. Nên kiểm tra kỹ từng khu vực và có biện pháp xử lý phù hợp.\n\n`;
      analysisText += `**Đề xuất xử lý:**\n`;
      analysisText += `1. Phun thuốc trừ nấm phổ rộng định kỳ\n`;
      analysisText += `2. Cải thiện điều kiện canh tác: thoát nước, ánh sáng, thông gió\n`;
      analysisText += `3. Cắt tỉa và loại bỏ các bộ phận bị nhiễm bệnh\n`;
      analysisText += `4. Bón phân cân đối để tăng sức đề kháng cho cây\n`;
    }
  } else if (historyStats.healthyTrees === scanHistory.length) {
    analysisText += `✅ **Nhận xét:**\n`;
    analysisText += `Tất cả các mẫu lá đều khỏe mạnh! Vườn cây của bạn đang trong tình trạng tốt.\n\n`;
    analysisText += `**Đề xuất chăm sóc:**\n`;
    analysisText += `1. Tiếp tục duy trì chế độ chăm sóc hiện tại\n`;
    analysisText += `2. Thực hiện phun thuốc phòng bệnh định kỳ trước mùa mưa\n`;
    analysisText += `3. Bón phân cân đối theo đúng lịch\n`;
    analysisText += `4. Thực hiện cắt tỉa định kỳ để thông thoáng vườn cây\n`;
  }

  analysisText += `\nBạn có thể hỏi tôi thêm để biết chi tiết về cách xử lý cụ thể cho từng loại bệnh.`;

  return {
    message: analysisText,
    type: "analysis",
    recommendationId: "scan_analysis",
  };
};
