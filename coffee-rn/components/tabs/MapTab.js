
import React from 'react';
import { View } from 'react-native';
import EmptyState from '../common/EmptyState';
import commonStyles from '../../styles/commonStyles';

const MapTab = () => {
  return (
    <View style={commonStyles.container}>
      <EmptyState 
        icon="map-marked-alt"
        title="Bản đồ trang trại"
        message="Tính năng đang được phát triển. Bạn sẽ có thể đánh dấu vị trí cây bị bệnh và xem phân bố bệnh trên bản đồ."
      />
    </View>
  );
};

export default MapTab;