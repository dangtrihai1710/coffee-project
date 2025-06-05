// utils/diseaseData.js
// Dữ liệu về các loại bệnh và phương pháp điều trị

const diseaseData = [
    {
      id: 1,
      name: 'Bệnh gỉ sắt (Coffee Rust)',
      scientificName: 'Hemileia vastatrix',
      symptoms: [
        'Các đốm màu vàng cam xuất hiện ở mặt dưới lá',
        'Lá bị nhiễm bệnh sẽ rụng sớm',
        'Cành và cây bị yếu đi do mất lá',
        'Năng suất giảm đáng kể'
      ],
      treatments: [
        'Phun thuốc fungicide chứa copper (đồng)',
        'Sử dụng thuốc trừ nấm hệ thống',
        'Kiểm soát độ ẩm trong vườn',
        'Cắt tỉa để tăng sự thông thoáng'
      ],
      prevention: [
        'Trồng giống kháng bệnh',
        'Duy trì khoảng cách thích hợp giữa các cây',
        'Loại bỏ và tiêu hủy lá bị nhiễm bệnh',
        'Phun thuốc phòng ngừa định kỳ trong mùa mưa'
      ],
      image: require('../assets/images/coffee-rust.jpg')
    },
    {
      id: 2,
      name: 'Bệnh đốm lá (Brown Eye Spot)',
      scientificName: 'Cercospora coffeicola',
      symptoms: [
        'Đốm tròn màu nâu trên lá với viền màu vàng',
        'Trung tâm đốm có màu xám hoặc trắng',
        'Quả có thể bị nhiễm với đốm tối',
        'Lá bị nhiễm nặng sẽ rụng'
      ],
      treatments: [
        'Phun thuốc trừ nấm có chứa copper hoặc mancozeb',
        'Cải thiện dinh dưỡng cây trồng, đặc biệt là bón phân cân đối',
        'Tăng cường thoát nước để giảm độ ẩm'
      ],
      prevention: [
        'Kiểm soát cỏ dại để tăng lưu thông không khí',
        'Tránh tưới nước quá nhiều',
        'Bón phân đầy đủ để cây khỏe mạnh',
        'Loại bỏ lá bị nhiễm bệnh'
      ],
      image: require('../assets/images/brown-eye-spot.jpg')
    },
    {
      id: 3,
      name: 'Bệnh miner (Coffee Leaf Miner)',
      scientificName: 'Leucoptera coffeella',
      symptoms: [
        'Đường hầm mỏng và không đều trên lá',
        'Các vết loét màu nâu trên lá',
        'Lá bị cong và rụng sớm',
        'Sinh trưởng cây bị chậm lại'
      ],
      treatments: [
        'Sử dụng thuốc trừ sâu hệ thống',
        'Áp dụng thuốc trừ sâu sinh học',
        'Thả thiên địch như ong ký sinh',
        'Loại bỏ và tiêu hủy lá bị nhiễm nặng'
      ],
      prevention: [
        'Giám sát thường xuyên để phát hiện sớm',
        'Duy trì khoảng cách hợp lý giữa các cây',
        'Khuyến khích sự hiện diện của thiên địch',
        'Trồng cây bóng mát hợp lý'
      ],
      image: require('../assets/images/leaf-miner.jpg')
    },
    {
      id: 4,
      name: 'Bệnh phoma (Phoma Leaf Spot)',
      scientificName: 'Phoma costarricensis',
      symptoms: [
        'Đốm không đều màu nâu đến xám trên lá',
        'Các đốm có thể xuất hiện ở mép lá trước',
        'Lá bị nhiễm nặng sẽ rụng',
        'Có thể ảnh hưởng đến cành non'
      ],
      treatments: [
        'Phun thuốc trừ nấm chứa copper hoặc azoxystrobin',
        'Cắt tỉa cành bị nhiễm bệnh',
        'Cải thiện thoát nước trong vườn',
        'Bón phân cân đối để tăng sức đề kháng'
      ],
      prevention: [
        'Kiểm soát độ ẩm trong vườn',
        'Tránh trồng quá dày',
        'Loại bỏ lá và cành bị nhiễm bệnh',
        'Tránh để lá ướt quá lâu'
      ],
      image: require('../assets/images/phoma-leaf-spot.jpg')
    }
  ];
  
  export default diseaseData;