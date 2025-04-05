// components/tabs/HelpTab.js
import React from 'react';
import { View } from 'react-native';
import EmptyState from '../common/EmptyState';
import commonStyles from '../../styles/commonStyles';

const HelpTab = () => {
  return (
    <View style={commonStyles.container}>
      <EmptyState 
        icon="question-circle"
        title="Trợ giúp"
        message="Tính năng đang được phát triển. Bạn sẽ có thể tìm kiếm câu trả lời cho các câu hỏi thường gặp và liên hệ hỗ trợ."
      />
    </View>
  );
};

export default HelpTab;