// utils/helpers.js
// Các hàm tiện ích dùng trong ứng dụng

// Hàm định dạng ngày giờ
export const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN') + ' ' + 
           d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Hàm tạo ID duy nhất
  export const generateUniqueId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
  };
  
  // Lấy màu dựa trên kết quả quét
  export const getResultColor = (result) => {
    if (!result) return '#000';
    
    if (result.error) return '#d9534f'; // Đỏ cho lỗi
    
    if (result.predicted_label.includes("Không phải lá")) {
      return '#d9534f'; // Đỏ cho không phải lá cà phê
    }
    
    if (result.warning) {
      return '#f0ad4e'; // Vàng cho cảnh báo
    }
    
    if (result.predicted_label.includes("khoẻ")) {
      return '#5cb85c'; // Xanh lá cho cây khỏe
    }
    
    return '#d9534f'; // Đỏ cho cây bệnh
  };
  
  // Lấy biểu tượng dựa trên kết quả quét
  export const getResultIcon = (result) => {
    if (!result || result.error) return null;
    
    if (result.predicted_label.includes("Không phải lá")) {
      return "❌";
    }
    
    if (result.warning) {
      return "⚠️";
    }
    
    if (result.predicted_label.includes("khoẻ")) {
      return "✅";
    }
    
    return "🩺";
  };
  
  // Tính toán thống kê từ lịch sử quét
  export const calculateStats = (scanHistory) => {
    if (!scanHistory || scanHistory.length === 0) {
      return {
        totalScans: 0,
        healthyTrees: 0,
        diseasedTrees: 0,
        diseases: {}
      };
    }
  
    const totalScans = scanHistory.length;
    const healthyTrees = scanHistory.filter(scan => scan.result.includes('khoẻ')).length;
    const diseasedTrees = totalScans - healthyTrees;
  
    // Thống kê các loại bệnh
    const diseases = scanHistory.reduce((acc, scan) => {
      if(!scan.result.includes('khoẻ') && !scan.result.includes('Không phải lá')) {
        // Lấy tên bệnh từ kết quả
        const diseaseName = scan.result.includes('gỉ sắt') ? 'Gỉ sắt' :
                            scan.result.includes('phoma') ? 'Phoma' :
                            scan.result.includes('miner') ? 'Miner' :
                            scan.result.includes('cercospora') ? 'Cerco' : 'Khác';
        acc[diseaseName] = (acc[diseaseName] || 0) + 1;
      }
      return acc;
    }, {});
  
    return {
      totalScans,
      healthyTrees,
      diseasedTrees,
      diseases
    };
  };