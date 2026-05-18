import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MarketScreen from '../screens/MarketScreen';
import InspectionScreen from '../screens/InspectionScreen';
import EncyclopediaScreen from '../screens/EncyclopediaScreen';
import MapScreen from '../screens/MapScreen';
import GuideScreen from '../screens/GuideScreen';
import UserScreen from '../screens/UserScreen';
import { colors } from '../theme';

export type RootTabParamList = {
  홈: undefined;
  시세: { selectedGradeCode?: string } | undefined;
  판독: undefined;
  백과: undefined;
  지도: undefined;
  가이드: undefined;
  사용자: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const iconMap: Record<keyof RootTabParamList, [string, string]> = {
  홈: ['home', 'home-outline'],
  시세: ['stats-chart', 'stats-chart-outline'],
  판독: ['camera', 'camera-outline'],
  백과: ['book', 'book-outline'],
  지도: ['map', 'map-outline'],
  가이드: ['ribbon', 'ribbon-outline'],
  사용자: ['person', 'person-outline'],
};

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary60,
        tabBarInactiveTintColor: colors.gray60,
        tabBarStyle: {
          backgroundColor: colors.gray0,
          borderTopColor: colors.line,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = iconMap[route.name];
          return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="시세" component={MarketScreen} />
      <Tab.Screen name="판독" component={InspectionScreen} />
      <Tab.Screen name="백과" component={EncyclopediaScreen} />
      <Tab.Screen name="지도" component={MapScreen} />
      <Tab.Screen name="가이드" component={GuideScreen} />
      <Tab.Screen name="사용자" component={UserScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
