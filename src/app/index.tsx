import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import { Colors } from "../constants/Colors";
import { Images } from "../assets/images";
import Svg, { Circle } from "react-native-svg";
import { SCREEN_WIDTH } from "../constants/fonts";

const AUDIO_DATA = [
  {
    title: "30 Mins Binaural Beats",
    usersCount: "10K men taken action",
    duration: 273.6, // in sec
    fileUrl:
      "https://mentoochallengeapp.blob.core.windows.net/app/assets/de8fcf9a-8ff0-4826-a8d2-14fbd6e4e90c.mp3",
  },
];

const AudioPlayerScreen = () => {
  const [audioData, setAudioData] = useState(AUDIO_DATA);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const soundRef = useRef<Audio.Sound | any>(null);

  const RADIUS = 35; // Adjust radius for the circle
  const CIRCLE_LENGTH = 2 * Math.PI * RADIUS; // Circumference of the circle

  const animationRefs = useRef<Animated.Value[]>([]);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const setupAudioMode = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: 0, // DO_NOT_MIX
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1, // DO_NOT_MIX
        playThroughEarpieceAndroid: false,
      });
    };

    setupAudioMode();
  }, []);

  // Initialize waveform animations
  useEffect(() => {
    animationRefs.current = Array(50)
      .fill(null)
      .map(() => new Animated.Value(0));
  }, []);

  const startWaveformAnimation = () => {
    animationRefs.current.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 500 + Math.random() * 500,
            easing: Easing.ease,
            useNativeDriver: false, // 👈 required to animate height
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 500 + Math.random() * 500,
            easing: Easing.ease,
            useNativeDriver: false, // 👈 required to animate height
          }),
        ])
      ).start();
    });
  };

  const stopWaveformAnimation = () => {
    animationRefs.current.forEach((anim) => anim.stopAnimation());
  };

  const loadAudio = async (audioUrl: string) => {
    setLoading(true);
    if (soundRef.current) {
      await soundRef.current.unloadAsync(); // Unload the previous audio only if it's loaded
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: false },
      onPlaybackStatusUpdate
    );

    soundRef.current = sound;
  };

  const onPlaybackStatusUpdate = async (status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis / 1000);
      setPosition(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
      setLoading(false);
      // Update progress animation
      progressAnim.setValue(status.positionMillis / status.durationMillis);

      if (status.didJustFinish && !status.isLooping) {
        setIsPlaying(false);
        stopWaveformAnimation();

        if (soundRef.current) {
          await soundRef.current.setPositionAsync(0);
        }
      }
    }
  };

  const togglePlayPause = async () => {
    try {
      const status = await soundRef.current?.getStatusAsync();
      if (!status?.isLoaded) return;

      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        stopWaveformAnimation();
      } else {
        await soundRef.current.playAsync();
        startWaveformAnimation();
      }
    } catch (err) {
      console.error("Error toggling play/pause", err);
    }
  };

  const rewind10s = async () => {
    const status = await soundRef.current?.getStatusAsync();
    if (status) {
      await soundRef.current.setPositionAsync(
        Math.max(status.positionMillis - 10000, 0)
      );
    }
  };

  const forward10s = async () => {
    const status: any = await soundRef.current?.getStatusAsync();
    if (status) {
      await soundRef.current.setPositionAsync(
        Math.min(status.positionMillis + 10000, status.durationMillis)
      );
    }
  };

  const restart = async () => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
    }
  };

  const toggleMute = async () => {
    try {
      const status = await soundRef.current?.getStatusAsync();
      if (status?.isLoaded) {
        await soundRef.current.setIsMutedAsync(!isMuted);
        setIsMuted((prev) => !prev);
      }
    } catch (err) {
      console.error("Error toggling mute:", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const onViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentAudioIndex(newIndex);
      loadAudio(audioData[newIndex].fileUrl);
      soundRef.current?.playAsync();
    }
  };

  useEffect(() => {
    if (audioData.length > 0) {
      loadAudio(audioData[currentAudioIndex].fileUrl);
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        stopWaveformAnimation();
        setPosition(0);
        setDuration(0);
        setIsPlaying(false);
      }
    };
  }, [currentAudioIndex, audioData]);

  const renderWaveform = () => {
    // const translateX = progressAnim.interpolate({
    //   inputRange: [0, 1],
    //   outputRange: [0, -SCREEN_WIDTH], // Move left as progress increases
    //   extrapolate: "clamp",
    // });

    return (
      <View style={styles.waveformContainer}>
        <Animated.View
          style={[
            styles.waveformBarsContainer,
            // { transform: [{ translateX }] },
          ]}
        >
          {animationRefs.current.map((anim, index) => {
            const height = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [4 + Math.random() * 120, 10 + Math.random() * 40],
            });

            return (
              <Animated.View
                key={index}
                style={[styles.waveformBar, { height }]}
              />
            );
          })}
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={audioData}
        horizontal
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.mainContainer}>
            <Text style={styles.headingText}>{item.title}</Text>
            <View style={styles.row}>
              <Image
                source={Images.people}
                style={styles.imageStyle}
                tintColor={Colors.white}
              />
              <Text style={styles.headingText2}>{item.usersCount}</Text>
            </View>

            {renderWaveform()}

            <View style={styles.controlRow}>
              <TouchableOpacity onPress={rewind10s}>
                <Image source={Images.left_10} style={styles.controlIcon} />
              </TouchableOpacity>

              <Text style={styles.timerText}>
                {formatTime(duration - position)}
              </Text>

              <TouchableOpacity onPress={forward10s}>
                <Image source={Images.right_10} style={styles.controlIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity onPress={restart}>
                <Image
                  source={Images.refresh}
                  style={styles.smallControlIcon}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlayPause}
                style={{ alignItems: "center", justifyContent: "center" }}
              >
                {/* Circular progress */}
                <Svg width={80} height={80} style={{ position: "absolute" }}>
                  <Circle
                    cx="40"
                    cy="40"
                    r={RADIUS}
                    stroke="#363636"
                    strokeWidth={4}
                    fill="none"
                  />
                  <Circle
                    cx="40"
                    cy="40"
                    r={RADIUS}
                    stroke="#FFFF"
                    strokeWidth={4}
                    strokeDasharray={CIRCLE_LENGTH}
                    strokeDashoffset={
                      CIRCLE_LENGTH - (position / duration) * CIRCLE_LENGTH
                    }
                    strokeLinecap="round"
                    fill="none"
                    rotation="-90"
                    origin="40,40"
                  />
                </Svg>

                {/* Play/Pause button */}
                {loading ? (
                  <ActivityIndicator size={"small"} color={Colors.white} />
                ) : (
                  <Image
                    source={isPlaying ? Images.pause : Images.play}
                    style={styles.playIcon}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleMute}>
                <Image
                  source={isMuted ? Images.volume_mute : Images.volume}
                  style={styles.smallControlIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        pagingEnabled
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onEndReachedThreshold={0.1} // Trigger when the user is 10% away from the end
      />
    </SafeAreaView>
  );
};

export default AudioPlayerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg_color,
    paddingTop: 20,
  },
  mainContainer: {
    backgroundColor: Colors._1e1e1e,
    borderRadius: 20,
    marginHorizontal: 10,
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 40,
    width: SCREEN_WIDTH - 20, // Adjust the width to your desired size for horizontal scroll
  },
  headingText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 40,
    color: Colors.white,
    textAlign: "center",
  },
  headingText2: {
    fontSize: 14,
    fontWeight: "400",
    color: Colors.white,
    textAlign: "center",
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    gap: 5,
  },
  imageStyle: {
    width: 20,
    height: 20,
  },

  fakeWaveform: {
    width: "100%",
    height: 100,
    backgroundColor: "#ff7e29",
    opacity: 0.3,
    borderRadius: 10,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 20,
  },
  controlIcon: {
    width: 36,
    height: 36,
    tintColor: Colors.white,
  },
  timerText: {
    fontSize: 28,
    color: Colors.white,
    fontWeight: "600",
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginTop: 40,
  },
  smallControlIcon: {
    width: 28,
    height: 28,
    tintColor: Colors.white,
  },
  playButton: {
    backgroundColor: "#2c2c2c",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff22",
  },
  playIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.white,
  },

  waveformContainer: {
    marginTop: 30,
    justifyContent: "center",
    overflow: "hidden",
    flex: 0.8,
  },
  waveformBarsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: "100%",
    paddingHorizontal: 10,
  },
  waveformBar: {
    width: 2,
    backgroundColor: "#974908",
    borderRadius: 10,
    marginHorizontal: 1,
  },
});
