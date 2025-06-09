
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Alert 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

// Utils & Styles
import diseaseData from '../../utils/diseaseData';
import COLORS from '../../styles/colors';
import commonStyles from '../../styles/commonStyles';

const TreatmentTab = () => {
  const [selectedDisease, setSelectedDisease] = useState(null);

  // Chọn bệnh đầu tiên mặc định
  useEffect(() => {
    if (diseaseData.length > 0 && !selectedDisease) {
      setSelectedDisease(diseaseData[0]);
    }
  }, []);

  // Hàm xử lý khi chọn bệnh
  const handleSelectDisease = (disease) => {
    setSelectedDisease(disease);
  };

  return (
    <View style={styles.container}>
      {/* Danh sách các loại bệnh */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.diseaseTabsContainer}
      >
        {diseaseData.map(disease => (
          <TouchableOpacity 
            key={disease.id}
            style={[
              styles.diseaseTab,
              selectedDisease && selectedDisease.id === disease.id && styles.diseaseTabActive
            ]}
            onPress={() => handleSelectDisease(disease)}
          >
            <Text 
              style={[
                styles.diseaseTabText,
                selectedDisease && selectedDisease.id === disease.id && styles.diseaseTabTextActive
              ]}
            >
              {disease.name.split('(')[0].trim()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Chi tiết về bệnh được chọn */}
      {selectedDisease && (
        <ScrollView style={styles.diseaseDetailContainer}>
          <View style={styles.diseaseHeaderCard}>
            {/* Sử dụng source trực tiếp cho ảnh local */}
            <Image 
              source={selectedDisease.image} 
              style={styles.diseaseImage} 
              resizeMode="cover"
            />
            
            <View style={styles.diseaseHeaderContent}>
              <Text style={styles.diseaseName}>{selectedDisease.name}</Text>
              <Text style={styles.diseaseScientificName}>{selectedDisease.scientificName}</Text>
            </View>
          </View>
          
          {/* Triệu chứng */}
          <View style={styles.diseaseInfoSection}>
            <View style={styles.sectionHeaderRow}>
              <FontAwesome5 name="virus" size={18} color={COLORS.danger} />
              <Text style={styles.sectionTitle}>Triệu chứng</Text>
            </View>
            
            <View style={styles.symptomsList}>
              {selectedDisease.symptoms.map((symptom, index) => (
                <View key={index} style={styles.symptomItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Phương pháp điều trị */}
          <View style={styles.diseaseInfoSection}>
            <View style={styles.sectionHeaderRow}>
              <FontAwesome5 name="prescription-bottle-alt" size={18} color={COLORS.info} />
              <Text style={styles.sectionTitle}>Phương pháp điều trị</Text>
            </View>
            
            <View style={styles.treatmentsList}>
              {selectedDisease.treatments.map((treatment, index) => (
                <View key={index} style={styles.treatmentItem}>
                  <View style={styles.numberPoint}>
                    <Text style={styles.numberPointText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.treatmentText}>{treatment}</Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Phòng ngừa */}
          <View style={styles.diseaseInfoSection}>
            <View style={styles.sectionHeaderRow}>
              <FontAwesome5 name="shield-alt" size={18} color={COLORS.success} />
              <Text style={styles.sectionTitle}>Phòng ngừa</Text>
            </View>
            
            <View style={styles.preventionList}>
              {selectedDisease.prevention.map((prevention, index) => (
                <View key={index} style={styles.preventionItem}>
                  <FontAwesome5 name="check-circle" size={16} color={COLORS.success} style={styles.checkIcon} />
                  <Text style={styles.preventionText}>{prevention}</Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Lưu ý */}
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <FontAwesome5 name="exclamation-circle" size={18} color={COLORS.warning} />
              <Text style={styles.noteTitle}>Lưu ý quan trọng</Text>
            </View>
            
            <Text style={styles.noteText}>
              Luôn đọc kỹ hướng dẫn sử dụng thuốc trước khi áp dụng. Phun thuốc trong điều 
              kiện thời tiết phù hợp và tuân thủ liều lượng khuyến cáo. Liên hệ với chuyên gia 
              nông nghiệp địa phương để được tư vấn cụ thể cho điều kiện vùng trồng của bạn.
            </Text>
          </View>
          
          {/* Nút tư vấn thêm */}
          <TouchableOpacity 
            style={styles.consultButton}
            onPress={() => {
              Alert.alert('Thông báo', 'Tính năng tư vấn với chuyên gia sẽ được phát triển trong phiên bản tiếp theo.');
            }}
          >
            <FontAwesome5 name="headset" size={16} color={COLORS.white} />
            <Text style={styles.consultButtonText}>Tư vấn với chuyên gia</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    padding: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  diseaseTabsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    maxHeight: 50,
  },
  diseaseTab: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  diseaseTabActive: {
    backgroundColor: COLORS.primary,
  },
  diseaseTabText: {
    fontSize: 13,
    color: COLORS.text,
  },
  diseaseTabTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  diseaseDetailContainer: {
    flex: 1,
  },
  diseaseHeaderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  diseaseImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  diseaseHeaderContent: {
    padding: 15,
  },
  diseaseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  diseaseScientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  diseaseInfoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  symptomsList: {
    marginTop: 5,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginTop: 5,
    marginRight: 8,
  },
  symptomText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  treatmentsList: {
    marginTop: 5,
  },
  treatmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  numberPoint: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.info,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  numberPointText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  treatmentText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  preventionList: {
    marginTop: 5,
  },
  preventionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  preventionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  noteCard: {
    backgroundColor: COLORS.warningLight,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.warning,
    marginLeft: 8,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 30,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  consultButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default TreatmentTab;