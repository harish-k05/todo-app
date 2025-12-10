import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Alert,
  Appearance,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Task from "./components/Task";

const STORAGE_KEY = "@todo_tasks";

// Vesper Theme - Light and Dark themes with peppermint accents (no orange)
const lightTheme = {
  background: "#FFFFFF",
  cardBackground: "#F5F5F5",
  text: "#1E1E1E",
  textSecondary: "#2C2C2C",
  textTertiary: "#6B6B6B",
  border: "#E0E0E0",
  borderLight: "#D0D0D0",
  inputBackground: "#FFFFFF",
  backdrop: "rgba(0, 0, 0, 0.5)",
  emptyIcon: "#99FFE4",
  progressBar: "#E0E0E0",
  progressFill: "#99FFE4",
  deleteButtonBg: "#F5F5F5",
  cancelButtonBg: "#E8E8E8",
  accent: "#99FFE4",
  fabBackground: "#99FFE4",
  checkboxBorder: "#6B6B6B",
  checkboxCompleted: "#99FFE4",
  accentPeppermint: "#99FFE4",
};

const darkTheme = {
  background: "#1E1E1E",
  cardBackground: "#252526",
  text: "#D4D4D4",
  textSecondary: "#CCCCCC",
  textTertiary: "#858585",
  border: "#3E3E42",
  borderLight: "#2D2D30",
  inputBackground: "#252526",
  backdrop: "rgba(0, 0, 0, 0.8)",
  emptyIcon: "#99FFE4",
  progressBar: "#3E3E42",
  progressFill: "#99FFE4",
  deleteButtonBg: "#252526",
  cancelButtonBg: "#1E1E1E",
  accent: "#99FFE4",
  fabBackground: "#99FFE4",
  checkboxBorder: "#858585",
  checkboxCompleted: "#99FFE4",
  accentPeppermint: "#99FFE4",
};

export default function App() {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const [tasks, setTasks] = useState([]);
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const fadeAnim = new Animated.Value(0);
  const inputBarAnim = useRef(new Animated.Value(0)).current;
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    // Load tasks from storage (if AsyncStorage is available)
    loadTasks();
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Listen to system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === "dark");
    });

    // Keyboard listeners
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        const extraSpacing = 30; // Extra spacing above keyboard
        Animated.timing(keyboardHeight, {
          toValue: -(e.endCoordinates.height + extraSpacing),
          duration: Platform.OS === "ios" ? e.duration || 250 : 100,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === "ios" ? e.duration || 250 : 100,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      subscription.remove();
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        // Default tasks for first time users
        const defaultTasks = [
          { id: "1", text: "Buy new sweatshirt", completed: true },
          { id: "2", text: "Begin promotional phase", completed: true },
          { id: "3", text: "Read an article", completed: false },
          { id: "4", text: "Try not to fall asleep", completed: false },
          { id: "5", text: "Watch 'Sherlock'", completed: false },
          { id: "6", text: "Begin QA for the product", completed: false },
          { id: "7", text: "Go for a walk", completed: false },
        ];
        setTasks(defaultTasks);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTasks));
      }
    } catch (error) {
      console.log("Error loading tasks:", error);
    }
  };

  const saveTasks = async (tasksToSave) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave));
    } catch (error) {
      console.log("Error saving tasks:", error);
    }
  };

  const handleToggleTask = (taskId) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleDeleteTask = (taskId) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedTasks = tasks.filter((task) => task.id !== taskId);
            setTasks(updatedTasks);
            saveTasks(updatedTasks);
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    if (tasks.length === 0) {
      return;
    }
    Alert.alert(
      "Delete All Tasks",
      `Are you sure you want to delete all ${tasks.length} tasks? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            setTasks([]);
            saveTasks([]);
          },
        },
      ]
    );
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTaskText(task.text);
    setIsInputVisible(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSaveEdit = () => {
    if (newTaskText.trim() && editingTask) {
      const updatedTasks = tasks.map((task) =>
        task.id === editingTask.id ? { ...task, text: newTaskText.trim() } : task
      );
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      handleCloseInput();
    }
  };

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      const newTask = {
        id: Date.now().toString(),
        text: newTaskText.trim(),
        completed: false,
      };
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      handleCloseInput();
    }
  };

  const handleCloseInput = () => {
    Keyboard.dismiss();
    setNewTaskText("");
    setEditingTask(null);
    setIsInputVisible(false);
  };

  const handleOpenAddInput = () => {
    setEditingTask(null);
    setNewTaskText("");
    setIsInputVisible(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    if (isInputVisible) {
      Animated.spring(inputBarAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.spring(inputBarAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [isInputVisible]);

  const getCurrentDate = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = now.getFullYear();
    const dayName = now.toLocaleString("en-US", { weekday: "long" }).toUpperCase();
    return { day, month, year, dayName };
  };

  const { day, month, year, dayName } = getCurrentDate();
  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle" size={80} color={theme.emptyIcon} style={styles.emptyIcon} />
      <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>All done!</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>Add a new task to get started</Text>
    </View>
  );

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Backdrop */}
      {isInputVisible && (
        <TouchableOpacity
          style={[styles.backdrop, { backgroundColor: theme.backdrop }]}
          activeOpacity={1}
          onPress={handleCloseInput}
        />
      )}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <View style={styles.dateContainer}>
              <Text style={[styles.dateNumber, { color: theme.text }]}>{day}</Text>
              <Text style={[styles.dateRest, { color: theme.textSecondary }]}> {month} {year}</Text>
            </View>
            <Text style={[styles.dayName, { color: theme.textSecondary }]}>{dayName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: theme.cardBackground }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isDarkMode ? "sunny" : "moon"} 
                size={20} 
                color={theme.accent} 
              />
            </TouchableOpacity>
            {totalCount > 0 && (
            <TouchableOpacity
              style={[styles.deleteAllButton, { backgroundColor: theme.deleteButtonBg }]}
              onPress={handleDeleteAll}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="trash-outline" 
                size={22} 
                color={completedCount === totalCount && totalCount > 0 ? "#FFFFFF" : theme.textTertiary} 
              />
            </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.progressBar }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%`, backgroundColor: theme.progressFill },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textTertiary }]}>
              {completedCount} of {totalCount} tasks completed
            </Text>
          </View>
        )}

        {/* Task List */}
        {tasks.length === 0 ? (
          <EmptyState />
        ) : (
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Task
                  text={item.text}
                  completed={item.completed}
                  onToggle={() => handleToggleTask(item.id)}
                  onDelete={() => handleDeleteTask(item.id)}
                  onEdit={() => handleEditTask(item)}
                  theme={theme}
                  isDarkMode={isDarkMode}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.taskSeparator} />}
              contentContainerStyle={styles.taskList}
              showsVerticalScrollIndicator={false}
            />
        )}

        {/* Floating Action Button */}
        {!isInputVisible && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.fabBackground }]}
            onPress={handleOpenAddInput}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={36} color={isDarkMode ? "#1E1E1E" : "#1E1E1E"} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Bottom Input Bar */}
      <Animated.View
        style={[
          styles.inputBarContainer,
          {
            backgroundColor: theme.cardBackground,
            borderTopColor: theme.border,
            transform: [
              {
                translateY: Animated.add(
                  inputBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                  keyboardHeight
                ),
              },
            ],
            opacity: inputBarAnim,
          },
        ]}
        pointerEvents={isInputVisible ? "auto" : "none"}
      >
          <View style={styles.inputBar}>
            <View style={styles.inputBarHeader}>
              <Ionicons
                name={editingTask ? "create-outline" : "add-circle"}
                size={22}
                color={theme.accent}
              />
              <Text style={[styles.inputBarTitle, { color: theme.text }]}>
                {editingTask ? "Edit Task" : "New Task"}
              </Text>
            </View>
            <View style={styles.inputBarContent}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.inputBarInput,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.borderLight,
                    color: theme.text,
                  },
                ]}
                placeholder="Task name"
                placeholderTextColor={theme.textTertiary}
                value={newTaskText}
                onChangeText={setNewTaskText}
                onSubmitEditing={editingTask ? handleSaveEdit : handleAddTask}
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <View style={styles.inputBarButtons}>
                <TouchableOpacity
                  style={[styles.inputCancelButton, { backgroundColor: theme.cancelButtonBg }]}
                  onPress={handleCloseInput}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inputSaveButton,
                    { 
                      backgroundColor: theme.accent,
                      shadowColor: theme.accent,
                    },
                    !newTaskText.trim() && styles.inputSaveButtonDisabled,
                  ]}
                  onPress={editingTask ? handleSaveEdit : handleAddTask}
                  disabled={!newTaskText.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={20} color={isDarkMode ? "#1E1E1E" : "#1E1E1E"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  themeToggle: {
    padding: 10,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  dateNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333",
  },
  dateRest: {
    fontSize: 18,
    color: "#666",
    fontWeight: "400",
  },
  dayName: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  deleteAllButton: {
    padding: 10,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    marginBottom: 25,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
  taskList: {
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#99FFE4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  inputBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderTopWidth: 1,
    zIndex: 2,
  },
  inputBar: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 30,
    minHeight: 140,
  },
  inputBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  inputBarTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputBarContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputBarInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    maxHeight: 100,
  },
  inputBarButtons: {
    flexDirection: "row",
    gap: 8,
  },
  inputCancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  inputSaveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  inputSaveButtonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  taskSeparator: {
    height: 14,
  },
});
