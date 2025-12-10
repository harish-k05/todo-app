import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Task = (props) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleLongPress = () => {
    if (props.onEdit) {
      props.onEdit();
    }
  };

  const theme = props.theme || {};
  const isDarkMode = props.isDarkMode || false;

  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: props.pinned 
            ? (theme.accent || "#99FFE4") 
            : (theme.cardBackground || (isDarkMode ? "#252526" : "#F5F5F5")),
          borderLeftColor: props.pinned 
            ? "#1E1E1E" 
            : (theme.accent || "#99FFE4"),
        },
        isPressed && {
          backgroundColor: isDarkMode ? "#2D2D30" : "#E8E8E8",
        },
      ]}
      onPress={props.onToggle}
      onLongPress={handleLongPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={0.85}
      delayLongPress={500}
    >
      {/* Pin Button */}
      <TouchableOpacity
        style={styles.pinButton}
        onPress={(e) => {
          e.stopPropagation();
          if (props.onPin) {
            props.onPin();
          }
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.6}
      >
        <Ionicons
          name={props.pinned ? "pushpin" : "pushpin-outline"}
          size={20}
          color={props.pinned 
            ? "#1E1E1E" 
            : (theme.textTertiary || (isDarkMode ? "#858585" : "#6B6B6B"))
          }
        />
      </TouchableOpacity>

      {/* Checkbox */}
      <View style={styles.checkboxContainer}>
        {props.completed ? (
          <View
            style={[
              styles.checkboxCompleted,
              {
                backgroundColor: theme.checkboxCompleted || "#99FFE4",
                shadowColor: theme.checkboxCompleted || "#99FFE4",
              },
            ]}
          >
            <Ionicons name="checkmark" size={18} color={isDarkMode ? "#1E1E1E" : "#1E1E1E"} />
          </View>
        ) : (
          <View style={styles.checkbox}>
            <Ionicons
              name="ellipse-outline"
              size={24}
              color={theme.checkboxBorder || (isDarkMode ? "#858585" : "#6B6B6B")}
            />
          </View>
        )}
      </View>

      {/* Task Text */}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.itemText,
            {
              color: props.completed
                ? theme.textTertiary || (isDarkMode ? "#858585" : "#6B6B6B")
                : props.pinned
                  ? "#1E1E1E"
                  : theme.text || (isDarkMode ? "#D4D4D4" : "#1E1E1E"),
            },
            props.completed && styles.itemTextCompleted,
          ]}
        >
          {props.text}
        </Text>
      </View>

      {/* Delete Button */}
      {props.onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            if (props.onDelete) {
              props.onDelete();
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.6}
        >
          <View
            style={[
              styles.deleteButtonBg,
              {
                backgroundColor:
                  props.completed
                    ? theme.accent || "#99FFE4"
                    : theme.deleteButtonBg || (isDarkMode ? "#252526" : "#F5F5F5"),
              },
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={
                props.completed
                  ? isDarkMode
                    ? "#1E1E1E"
                    : "#1E1E1E"
                  : theme.textTertiary || (isDarkMode ? "#858585" : "#6B6B6B")
              }
            />
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginHorizontal: 0,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    minHeight: 50,
  },
  pinButton: {
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxContainer: {
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCompleted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
  },
  itemTextCompleted: {
    textDecorationLine: "line-through",
    fontWeight: "400",
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default React.memo(Task);
