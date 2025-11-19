import { useMemo, useRef, useCallback } from "react";
import { Animated, Dimensions, Easing, PanResponder } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { consumeTabInitialOffset, setTabInitialOffset } from "../utils/tabSwipeTransition";

const SWIPE_DISTANCE_THRESHOLD = 60;
const VERTICAL_SENSITIVITY = 18;
const HORIZONTAL_SENSITIVITY = 25;
const MAX_TRANSLATE = 80;
const TRANSLATE_DAMPING = 0.35;
const SCREEN_WIDTH = Dimensions.get("window").width;
const ENTER_DURATION = 220;

const useTabSwipeNavigation = (tabOrder = []) => {
  const navigation = useNavigation();
  const route = useRoute();
  const translateX = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const offset = consumeTabInitialOffset(route.name);
      if (!offset) {
        translateX.setValue(0);
        return undefined;
      }

      translateX.setValue(offset);
      const animation = Animated.timing(translateX, {
        toValue: 0,
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }, [route.name, translateX])
  );

  const resetPosition = useCallback(() => {
    if (isAnimating.current) return;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [translateX]);

  const animateAndNavigate = useCallback(
    (direction, targetRoute) => {
      if (!targetRoute) return;
      isAnimating.current = true;
      const enterFrom = direction === "next" ? SCREEN_WIDTH : -SCREEN_WIDTH;
      const momentum = direction === "next" ? -MAX_TRANSLATE : MAX_TRANSLATE;

      Animated.timing(translateX, {
        toValue: momentum,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        translateX.setValue(0);
      });

      setTabInitialOffset(targetRoute, enterFrom);
      navigation.navigate(targetRoute);
      setTimeout(() => {
        translateX.setValue(0);
        isAnimating.current = false;
      }, ENTER_DURATION + 40);
    },
    [navigation, translateX]
  );

  const panResponder = useMemo(() => {
    if (tabOrder.length === 0) return null;

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > HORIZONTAL_SENSITIVITY && Math.abs(gestureState.dy) < VERTICAL_SENSITIVITY,
      onPanResponderMove: (_, gestureState) => {
        if (isAnimating.current || Math.abs(gestureState.dy) >= VERTICAL_SENSITIVITY) return;
        const limitedDx = Math.max(-MAX_TRANSLATE, Math.min(MAX_TRANSLATE, gestureState.dx));
        translateX.setValue(limitedDx * TRANSLATE_DAMPING);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating.current) return;
        if (Math.abs(gestureState.dx) < SWIPE_DISTANCE_THRESHOLD) {
          resetPosition();
          return;
        }

        const currentIndex = tabOrder.indexOf(route.name);
        if (currentIndex === -1) return;
        let didNavigate = false;

        if (gestureState.dx < 0) {
          const nextIndex = currentIndex + 1;
          if (nextIndex < tabOrder.length) {
            animateAndNavigate("next", tabOrder[nextIndex]);
            didNavigate = true;
          }
        } else {
          const previousIndex = currentIndex - 1;
          if (previousIndex >= 0) {
            animateAndNavigate("previous", tabOrder[previousIndex]);
            didNavigate = true;
          }
        }

        if (!didNavigate) resetPosition();
      },
      onPanResponderTerminate: resetPosition,
    });
  }, [animateAndNavigate, resetPosition, route.name, tabOrder, translateX]);

  const panHandlers = panResponder ? panResponder.panHandlers : {};

  return {
    panHandlers,
    animatedStyle: {
      transform: [{ translateX }],
    },
  };
};

export default useTabSwipeNavigation;
