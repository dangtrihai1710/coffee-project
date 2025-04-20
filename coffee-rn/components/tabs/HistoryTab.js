// components/tabs/HistoryTab.js
import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  FlatList
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

// Components
import EmptyState from '../common/EmptyState';

// Styles
import COLORS from '../../styles/colors';
import commonStyles from '../../styles/commonStyles';

const HistoryTab = ({ 
  scanHistory = [], 
  historyStats = {}, 
  onDeleteItem, 
  onDeleteAll, 
  onViewScan 
}) => {
  // Nếu không có dữ liệu lịch sử
  if (!scanHistory || scanHistory.length === 0) {
    return (
      <EmptyState 
        icon="history"
        title="Chưa có lịch sử quét"
        message="Các lần quét của bạn sẽ được hiển thị ở đây để giúp bạn theo dõi tiến triển của cây trồng theo thời gian."
        buttonText="Bắt đầu quét"
        onButtonPress={() => Alert.alert('Thông báo', 'Chức năng này sẽ chuyển về tab Quét')}
      />
    );
  }

  // Xử lý xóa mục lịch sử
  const handleDeleteItem = (id) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa mục này khỏi lịch sử?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: () => onDeleteItem(id)
        }
      ]
    );
  };

  // Xử lý xóa toàn bộ lịch sử
  const handleDeleteAll = () => {
    Alert.alert(
      'Xóa toàn bộ lịch sử',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử quét? Hành động này không thể hoàn tác.',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: () => {
            const success = onDeleteAll();
            if (success) {
              Alert.alert('Thành công', 'Đã xóa toàn bộ lịch sử quét.');
            } else {
              Alert.alert('Lỗi', 'Không thể xóa lịch sử. Vui lòng thử lại sau.');
            }
          }
        }
      ]
    );
  };

  // Render mỗi mục trong lịch sử
  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.historyItem, 
        { 
          borderLeftColor: item.result.includes('khoẻ') ? COLORS.success : COLORS.danger,
          backgroundColor: item.result.includes('khoẻ') ? COLORS.successLight : COLORS.dangerLight
        }
      ]}
      onPress={() => onViewScan(item)}
    >
      {item.image && (
        <Image 
          source={{ uri: item.image }} 
          style={styles.historyItemImage} 
        />
      )}
      
      <View style={styles.historyItemContent}>
        <View style={styles.historyItemHeader}>
          <Text style={styles.historyItemTitle}>{item.result}</Text>
          <Text style={styles.historyItemDate}>{item.date} {item.time}</Text>
        </View>
        
        <View style={styles.historyItemDetails}>
          <Text style={styles.historyItemDetail}>Độ tin cậy: {item.confidence}</Text>
          <Text style={styles.historyItemDetail}>Vị trí: {item.location}</Text>
        </View>
        
        {item.warning && (
          <Text style={styles.historyItemWarning}>⚠️ {item.warning}</Text>
        )}
        
        <View style={styles.historyItemActions}>
          <TouchableOpacity 
            style={styles.historyItemAction}
            onPress={() => onViewScan(item)}
          >
            <FontAwesome5 name="eye" size={12} color={COLORS.primary} />
            <Text style={styles.historyItemActionText}>Xem</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.historyItemAction}
            onPress={() => {
              Alert.alert('Thông báo', 'Tính năng chia sẻ sẽ được phát triển trong phiên bản tiếp theo.');
            }}
          >
            <FontAwesome5 name="share-alt" size={12} color={COLORS.primary} />
            <Text style={styles.historyItemActionText}>Chia sẻ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.historyItemAction}
            onPress={() => handleDeleteItem(item.id)}
          >
            <FontAwesome5 name="trash-alt" size={12} color={COLORS.danger} />
            <Text style={[styles.historyItemActionText, {color: COLORS.danger}]}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Header cho FlatList hiển thị thống kê
  const renderHeader = () => (
    <>
      <View style={styles.statsSummaryContainer}>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{historyStats.totalScans || 0}</Text>
          <Text style={styles.statsLabel}>Tổng số quét</Text>
        </View>
        
        <View style={styles.statsCard}>
          <Text style={[styles.statsNumber, {color: COLORS.success}]}>
            {historyStats.healthyTrees || 0}
          </Text>
          <Text style={styles.statsLabel}>Cây khỏe</Text>
        </View>
        
        <View style={styles.statsCard}>
          <Text style={[styles.statsNumber, {color: COLORS.danger}]}>
            {historyStats.diseasedTrees || 0}
          </Text>
          <Text style={styles.statsLabel}>Cây bệnh</Text>
        </View>
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <FontAwesome5 name="filter" size={14} color={COLORS.primary} />
          <Text style={styles.filterButtonText}>Lọc</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.filterButton}>
          <FontAwesome5 name="sort" size={14} color={COLORS.primary} />
          <Text style={styles.filterButtonText}>Sắp xếp</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.filterButton}>
          <FontAwesome5 name="calendar-alt" size={14} color={COLORS.primary} />
          <Text style={styles.filterButtonText}>Ngày</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.filterButton}>
          <FontAwesome5 name="search" size={14} color={COLORS.primary} />
          <Text style={styles.filterButtonText}>Tìm kiếm</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.sectionTitle}>Lịch sử quét</Text>
    </>
  );

  // Footer cho FlatList hiển thị các nút hành động
  const renderFooter = () => (
    <View style={styles.exportContainer}>
      <TouchableOpacity 
        style={styles.exportButton}
        onPress={() => {
          Alert.alert('Thông báo', 'Tính năng xuất báo cáo sẽ được phát triển trong phiên bản tiếp theo.');
        }}
      >
        <FontAwesome5 name="file-export" size={14} color={COLORS.white} />
        <Text style={styles.exportButtonText}>Xuất báo cáo</Text>
      </TouchableOpacity>
      
      {scanHistory.length > 0 && (
        <TouchableOpacity 
          style={[styles.exportButton, { backgroundColor: COLORS.danger, marginTop: 10 }]}
          onPress={handleDeleteAll}
        >
          <FontAwesome5 name="trash" size={14} color={COLORS.white} />
          <Text style={styles.exportButtonText}>Xóa toàn bộ lịch sử</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={scanHistory}
        renderItem={renderHistoryItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    padding: 15,
  },
  listContentContainer: {
    paddingBottom: 20, // Thêm padding dưới cùng cho FlatList
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
  },
  statsSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 10,
    margin: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  filterButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  historyItem: {
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  historyItemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 10,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  historyItemTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  historyItemDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  historyItemDetails: {
    marginBottom: 8,
  },
  historyItemDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  historyItemWarning: {
    fontSize: 12,
    color: COLORS.warning,
    marginBottom: 8,
  },
  historyItemActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
    paddingTop: 8,
  },
  historyItemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  historyItemActionText: {
    fontSize: 11,
    color: COLORS.primary,
    marginLeft: 4,
  },
  exportContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default HistoryTab;