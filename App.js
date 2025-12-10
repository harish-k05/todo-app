import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Prefer Appearance.getColorScheme for initial mount, fallback to hook
    const appearanceScheme = Appearance.getColorScheme();
    if (appearanceScheme === "dark" || appearanceScheme === "light") {
      return appearanceScheme === "dark";
    }
    return systemColorScheme === "dark";
  });
  const [tasks, setTasks] = useState([]);
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  // null = undated task
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputBarAnim = useRef(new Animated.Value(0)).current;
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Helper: get local date string as YYYY-MM-DD (no timezone shift)
  const getLocalISODate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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
    const themeSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === "dark" || colorScheme === "light") {
        setIsDarkMode(colorScheme === "dark");
      }
    });

    // Keyboard listeners
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        const extraSpacing = 10;
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
      themeSubscription.remove();
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks);
        if (Array.isArray(parsedTasks)) {
          // Migrate older shapes to: { id, text, completed, dueDate, pinned }
          const migratedTasks = parsedTasks.map((task) => {
            const legacyDate = task.date ?? null;
            return {
              id: String(task.id),
              text: String(task.text ?? ""),
              completed: !!task.completed,
              dueDate:
                typeof task.dueDate === "string"
                  ? task.dueDate
                  : typeof legacyDate === "string"
                  ? legacyDate
                  : null,
              pinned: !!task.pinned,
            };
          });
          setTasks(migratedTasks);
        } else {
          console.warn("Invalid tasks format in storage");
          setTasks([]);
        }
      } else {
        // Default tasks for first time users with dates
        const today = getLocalISODate(new Date());
        const tomorrow = getLocalISODate(new Date(Date.now() + 86400000));
        const defaultTasks = [
          { id: "1", text: "Buy new sweatshirt", completed: true,  dueDate: today,    pinned: false },
          { id: "2", text: "Begin promotional phase", completed: true,  dueDate: today,    pinned: false },
          { id: "3", text: "Read an article",          completed: false, dueDate: today,    pinned: false },
          { id: "4", text: "Try not to fall asleep",   completed: false, dueDate: tomorrow, pinned: false },
          { id: "5", text: "Watch 'Sherlock'",         completed: false, dueDate: tomorrow, pinned: false },
          { id: "6", text: "Begin QA for the product", completed: false, dueDate: tomorrow, pinned: false },
          { id: "7", text: "Go for a walk",            completed: false, dueDate: null,     pinned: true  },
        ];
        setTasks(defaultTasks);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTasks));
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]); // Fallback to empty array
    }
  };

  const saveTasks = useCallback(async (tasksToSave) => {
    try {
      if (Array.isArray(tasksToSave)) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave));
      } else {
        console.error("Invalid tasks data format");
      }
    } catch (error) {
      console.error("Error saving tasks:", error);
      // Optionally show user feedback
      Alert.alert("Error", "Failed to save tasks. Please try again.");
    }
  }, []);

  const handleTogglePin = useCallback(
    (taskId) => {
      setTasks((prev) => {
        const updated = prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                // keep dueDate unchanged so unpin restores original date
                pinned: !task.pinned,
              }
            : task
        );
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const handleToggleTask = useCallback(
    (taskId) => {
      setTasks((prev) => {
        const updated = prev.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

  const handleDeleteTask = useCallback(
    (taskId) => {
      setTasks((prev) => {
        const updated = prev.filter((task) => task.id !== taskId);
        saveTasks(updated);
        return updated;
      });
    },
    [saveTasks]
  );

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
    setSelectedDate(task.dueDate ?? null);
    setIsInputVisible(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSaveEdit = () => {
    if (newTaskText.trim() && editingTask) {
      const updatedTasks = tasks.map((task) =>
        task.id === editingTask.id
          ? {
              ...task,
              text: newTaskText.trim(),
              dueDate: task.pinned ? null : selectedDate ?? null,
            }
          : task
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
        dueDate: selectedDate ?? null,
        pinned: false,
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
    setSelectedDate(null);
    setShowDatePicker(false);
    setIsInputVisible(false);
  };

  const handleOpenAddInput = () => {
    setEditingTask(null);
    setNewTaskText("");
    setSelectedDate(null);
    setShowDatePicker(false);
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
  }, [isInputVisible, inputBarAnim]);

  const getCurrentDate = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = now.getFullYear();
    const dayName = now.toLocaleString("en-US", { weekday: "long" }).toUpperCase();
    return { day, month, year, dayName };
  };

  // Group tasks by dueDate and separate pinned / undated tasks
  const { groupedTasks, sortedDates } = useMemo(() => {
    const grouped = tasks.reduce(
      (acc, task) => {
        if (task.pinned) {
          acc.pinned.push(task);
        } else if (task.dueDate) {
          if (!acc.byDate[task.dueDate]) {
            acc.byDate[task.dueDate] = [];
          }
          acc.byDate[task.dueDate].push(task);
        } else {
          acc.undated.push(task);
        }
        return acc;
      },
      { pinned: [], byDate: {}, undated: [] }
    );

    const dates = Object.keys(grouped.byDate).sort();
    return { groupedTasks: grouped, sortedDates: dates };
  }, [tasks]);

  // Friendly date labels (timezone-safe, based on YYYY-MM-DD string)
  const formatDateLabel = (dateString) => {
    const today = new Date();

    const shiftDays = (baseDate, days) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + days);
      return d;
    };

    const todayStr = getLocalISODate(today);
    const tomorrowStr = getLocalISODate(shiftDays(today, 1));
    const yesterdayStr = getLocalISODate(shiftDays(today, -1));

    if (dateString === todayStr) return "TODAY";
    if (dateString === tomorrowStr) return "TOMORROW";
    if (dateString === yesterdayStr) return "Yesterday";

    const d = new Date(dateString + "T00:00:00");
    return d
      .toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  };

  const { day, month, year, dayName } = getCurrentDate();

  const { completedCount, totalCount, progressPercentage } = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    const total = tasks.length;
    return {
      completedCount: completed,
      totalCount: total,
      progressPercentage: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [tasks]);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle" size={80} color={theme.emptyIcon} style={styles.emptyIcon} />
      <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>All done!</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>Add a new task to get started</Text>
    </View>
  );

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
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
              style={[
                styles.deleteAllButton, 
                { 
                  backgroundColor: completedCount === totalCount && totalCount > 0 ? theme.accent : theme.deleteButtonBg
                }
              ]}
              onPress={handleDeleteAll}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="trash-outline" 
                size={22} 
                color={completedCount === totalCount && totalCount > 0 ? "#1E1E1E" : theme.textTertiary} 
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
          <View style={styles.taskContainer}>
            <FlatList
              data={[
                // Pinned section
                ...(groupedTasks.pinned.length > 0
                  ? [
                      {
                        type: "pinned",
                        title: "PINNED",
                        items: groupedTasks.pinned,
                      },
                    ]
                  : []),
                // Dated groups
                ...sortedDates.map((date) => ({
                  type: "date",
                  title: formatDateLabel(date),
                  date,
                  items: groupedTasks.byDate[date],
                })),
                // Undated section (after all dated tasks)
                ...(groupedTasks.undated.length > 0
                  ? [
                      {
                        type: "undated",
                        title: "NO DATE",
                        items: groupedTasks.undated,
                      },
                    ]
                  : []),
              ]}
              keyExtractor={(item, index) => item.type + "-" + item.title + "-" + index}
              renderItem={({ item }) => {
                if (item.type === "pinned" || item.type === "date" || item.type === "undated") {
                  return (
                    <View>
                      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
                        {item.title}
                      </Text>
                      {item.items.map((task) => (
                        <Task
                          key={task.id}
                          text={task.text}
                          completed={task.completed}
                          pinned={task.pinned}
                          dueDate={task.dueDate}
                          onToggle={() => handleToggleTask(task.id)}
                          onDelete={() => handleDeleteTask(task.id)}
                          onEdit={() => handleEditTask(task)}
                          onPin={() => handleTogglePin(task.id)}
                          theme={theme}
                          isDarkMode={isDarkMode}
                        />
                      ))}
                    </View>
                  );
                }
                return null;
              }}
              ItemSeparatorComponent={() => <View style={styles.taskSeparator} />}
              contentContainerStyle={styles.taskList}
              showsVerticalScrollIndicator={false}
            />
          </View>
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
                translateY: inputBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1000, 0],
                }),
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
              {/* First row: text input */}
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

              {/* Second row: date + buttons */}
              <View style={styles.inputBarRow}>
                <TouchableOpacity
                  style={[
                    styles.datePickerButton,
                    {
                      backgroundColor: theme.accent,
                    },
                  ]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.datePickerButtonText}>
                    {selectedDate === null
                      ? "No date"
                      : selectedDate === getLocalISODate(new Date())
                      ? "TODAY"
                      : selectedDate === getLocalISODate(new Date(Date.now() + 86400000))
                      ? "TOMORROW"
                      : formatDateLabel(selectedDate)}
                  </Text>
                </TouchableOpacity>

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
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={isDarkMode ? "#1E1E1E" : "#1E1E1E"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
        
        {/* Date Picker Modal */}
        {showDatePicker && (
          <View style={[styles.datePickerModal, { backgroundColor: theme.backdrop }]}>
            <View style={[styles.datePickerContent, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.datePickerTitle, { color: theme.text }]}>Select Date</Text>

              <DateTimePicker
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                value={
                  selectedDate
                    ? new Date(selectedDate + "T00:00:00")
                    : new Date()
                }
                onChange={(event, date) => {
                  if (event.type === "dismissed") {
                    if (Platform.OS !== "ios") {
                      setShowDatePicker(false);
                    }
                    return;
                  }
                  if (date) {
                    const iso = getLocalISODate(date);
                    setSelectedDate(iso);
                  }
                  if (Platform.OS !== "ios") {
                    setShowDatePicker(false);
                  }
                }}
              />

              <View style={styles.dateOptions}>
                <TouchableOpacity
                  style={[
                    styles.dateOption,
                    selectedDate === null && styles.dateOptionSelected,
                  ]}
                  onPress={() => setSelectedDate(null)}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      { color: selectedDate === null ? theme.accent : theme.text },
                    ]}
                  >
                    No date
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.datePickerClose, { backgroundColor: theme.accent }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
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
  taskContainer: {
    flex: 1,
  },
  taskList: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  emptyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
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
    paddingTop: 22,
    paddingBottom: Platform.OS === "ios" ? 36 : 32,
    minHeight: 150,
  },
  inputBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  inputBarTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputBarContent: {
    flexDirection: "column",
    gap: 14,
  },
  inputBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  inputBarInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    maxHeight: 120,
  },
  datePickerButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  datePickerButtonText: {
    color: "#1E1E1E",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  datePickerModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  datePickerContent: {
    borderRadius: 20,
    padding: 24,
    width: "80%",
    maxWidth: 320,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  dateOptions: {
    gap: 12,
    marginBottom: 20,
  },
  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dateOptionSelected: {
    borderColor: "#99FFE4",
    backgroundColor: "#F5FFF9",
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  datePickerClose: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  datePickerCloseText: {
    color: "#1E1E1E",
    fontSize: 16,
    fontWeight: "600",
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  taskSeparator: {
    height: 10,
  },
});
