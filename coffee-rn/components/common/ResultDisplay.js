
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import COLORS from '../../styles/colors';
import { getResultColor, getResultIcon } from '../../utils/helpers';

const ResultDisplay = ({ result, onNewScan, onSave, onShare, onPrint }) => {
  if (!result) return null;
  
  const resultColor = getResultColor(result);
  const resultIcon = getResultIcon(result);

  // Xử lý lỗi
  if (result.error) {
    return (
      <View style={[styles.container, { borderColor: COLORS.danger }]}>
        <View>
          <Text style={styles.errorText}>Lỗi: {result.error}</Text>
          <TouchableOpacity 
            style={[styles.button, styles.buttonSecondary, styles.retryButton]}
            onPress={onNewScan}
          >
            <Text style={styles.buttonText}>Thử lại với ảnh khác</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: resultColor }]}>
      <View>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { color: resultColor }]}>
            {resultIcon} {result.predicted_label}
          </Text>
          
          <TouchableOpacity 
            style={styles.newScanButton}
            onPress={onNewScan}
          >
            <FontAwesome5 name="sync-alt" size={14} color={COLORS.primary} />
            <Text style={styles.newScanButtonText}>Quét mới</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.confidenceText}>
          Độ tin cậy: {result.confidence}
        </Text>
        
        {result.warning && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>⚠️ {result.warning}</Text>
            <Text style={styles.warningSubtext}>
              Hãy thử chụp hình rõ nét hơn trong điều kiện ánh sáng tốt
            </Text>
            <TouchableOpacity 
              style={[styles.button, styles.buttonWarning, styles.retryButton]}
              onPress={onNewScan}
            >
              <Text style={styles.buttonText}>Thử lại với ảnh khác</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {result.predicted_label.includes("Bệnh") && !result.warning && (
          <View style={styles.diseaseAdviceContainer}>
            <Text style={styles.diseaseAdvice}>
              Hãy kiểm tra kỹ lá cây và có biện pháp xử lý phù hợp
            </Text>
            
            <View style={styles.treatmentContainer}>
              <Text style={styles.treatmentTitle}>
                Gợi ý điều trị:
              </Text>
              <Text style={styles.treatmentText}>
                • Kiểm tra và cô lập các cây bị bệnh
              </Text>
              <Text style={styles.treatmentText}>
                • Loại bỏ các lá bị nhiễm bệnh nặng
              </Text>
              <Text style={styles.treatmentText}>
                • Sử dụng thuốc trừ nấm phù hợp
              </Text>
              <Text style={styles.treatmentText}>
                • Theo dõi sự phát triển của bệnh
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.resultAction} onPress={onSave}>
            <FontAwesome5 name="save" size={16} color={COLORS.primary} />
            <Text style={styles.resultActionText}>Lưu</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resultAction} onPress={onShare}>
            <FontAwesome5 name="share-alt" size={16} color={COLORS.primary} />
            <Text style={styles.resultActionText}>Chia sẻ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resultAction} onPress={onPrint}>
            <FontAwesome5 name="print" size={16} color={COLORS.primary} />
            <Text style={styles.resultActionText}>In báo cáo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
    padding: 15,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderLeftWidth: 8,
    width: '100%',
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  newScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  newScanButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 5,
  },
  confidenceText: {
    fontSize: 15,
    marginBottom: 10,
    color: COLORS.textSecondary,
  },
  warningContainer: {
    backgroundColor: COLORS.warningLight,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 15,
    color: COLORS.warning,
    fontWeight: 'bold',
  },
  warningSubtext: {
    fontSize: 14,
    color: COLORS.warning,
    marginTop: 5,
  },
  diseaseAdviceContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  diseaseAdvice: {
    fontSize: 15,
    color: COLORS.danger,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  treatmentContainer: {
    backgroundColor: COLORS.infoLight,
    padding: 10,
    borderRadius: 5,
  },
  treatmentTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.info,
    marginBottom: 8,
  },
  treatmentText: {
    fontSize: 14,
    color: COLORS.info,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 10,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
  },
  resultAction: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  resultActionText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
  },
  buttonWarning: {
    backgroundColor: COLORS.warning,
    marginTop: 12,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  retryButton: {
    marginTop: 15,
    alignSelf: 'center',
  },
});

export default ResultDisplay;