"use client";
import { useAuth } from "@/context/AuthContext";
import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Image, Smile, Calendar, MapPin, BarChart3, Globe, Mic, X, Square, FileAudio } from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import OTPModal from "./OTPModal";
const TweetComposer = ({ onTweetPosted }: any) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");

  // Audio State
  const [isOTPModalOpen, setIsOTPModalOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("audioVerified") === "true";
    }
    return false;
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioError, setAudioError] = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const checkTimeRestriction = () => {
    const now = new Date();
    // Calculate IST time (UTC + 5:30)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utc + istOffset);
    const hours = istTime.getHours();

    // 2:00 PM is 14, 7:00 PM is 19. (14 <= hours < 19)
    if (hours < 14 || hours >= 19) {
      alert(t("audio_time_restriction"));
      return false;
    }
    return true;
  };

  const handleAudioClick = () => {
    if (checkTimeRestriction()) {
      if (isVerified) {
        // Toggle recording if already verified, or give choice
        // For simplicity, we'll start recording here if not already, 
        // and have a separate upload button if needed, but the user said "record or upload".
        // Let's provide an upload option via the file input and recording via the mic button.
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      } else {
        setIsOTPModalOpen(true);
      }
    }
  };

  const handleOTPVerified = () => {
    setIsVerified(true);
    sessionStorage.setItem("audioVerified", "true");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });

        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        audio.onloadedmetadata = () => {
          if (audio.duration > 300) {
            setAudioError(t("audio_duration_error"));
          } else {
            setAudioFile(file);
            setAudioUrl(objectUrl);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 300) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setAudioError(t("mic_access_error"));
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleAudioUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioError("");
    if (file.size > 100 * 1024 * 1024) {
      setAudioError(t("audio_size_error"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);
    audio.onloadedmetadata = () => {
      if (audio.duration > 300) {
        setAudioError(t("audio_duration_error"));
        URL.revokeObjectURL(objectUrl);
      } else {
        setAudioFile(file);
        setAudioUrl(objectUrl);
      }
    };
    audio.onerror = () => setAudioError(t("invalid_audio_error"));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioUrl("");
    setAudioError("");
    setRecordingTime(0);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };
  const maxLength = 200;
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if ((!content.trim() && !audioFile) || !user) return; // Allow empty content if audio exists? usually yes. But tweet schema might require content. Checking schema: content is required. So we need content or make it optional. 
    // Tweet model: content: { type: String, required: true }. So user MUST write text too.

    if (!content.trim()) return;

    setIsLoading(true);
    try {
      let finalAudioUrl = null;

      if (audioFile) {
        // Upload Audio to Backend
        const formData = new FormData();
        formData.append("file", audioFile);
        const uploadRes = await axiosInstance.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        finalAudioUrl = uploadRes.data.url;
      }

      const tweetdata = {
        author: user?._id,
        content,
        image: imageurl,
        audio: finalAudioUrl
      }
      const res = await axiosInstance.post('/post', tweetdata)
      onTweetPosted(res.data)
      setContent("")
      setimageurl("")
      removeAudio();
    } catch (error: any) {
      console.log(error);
      if (error.response?.status === 403 && error.response.data.error.includes("limit reached")) {
        if (confirm(`${error.response.data.error}\n\n${t("upgrade_prompt")}`)) {
          window.location.href = "/subscription";
        }
      } else {
        alert(error.response?.data?.error || t("failed_post_tweet"));
      }
    } finally {
      setIsLoading(false)
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isNearLimit = characterCount > maxLength * 0.8;
  if (!user) return null;
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsLoading(true);
    const image = e.target.files[0];
    const formdataimg = new FormData();
    formdataimg.set("image", image);
    try {
      const res = await axios.post(
        "https://api.imgbb.com/1/upload?key=97f3fb960c3520d6a88d7e29679cf96f",
        formdataimg
      );
      const url = res.data.data.display_url;
      if (url) {
        setimageurl(url);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              <Textarea
                placeholder={t("whats_happening")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-none text-xl text-white placeholder-gray-500 resize-none min-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-4 gap-4">
                <div className="flex flex-wrap items-center space-x-1 sm:space-x-4 text-blue-400">
                  <label
                    htmlFor="tweetImage"
                    className="p-2 rounded-full hover:bg-blue-900/20 cursor-pointer"
                  >
                    <Image className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      id="tweetImage"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isLoading}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <BarChart3 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <MapPin className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-2 rounded-full hover:bg-blue-900/20 ${isRecording ? "text-red-500 animate-pulse" : "text-blue-400"}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleAudioClick();
                    }}
                    disabled={isLoading}
                  >
                    {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  {isRecording && (
                    <span className="text-red-500 font-mono text-sm">
                      {formatTime(recordingTime)}
                    </span>
                  )}
                  <label
                    htmlFor="audioUpload"
                    className="p-2 rounded-full hover:bg-blue-900/20 cursor-pointer text-blue-400"
                  >
                    <FileAudio className="h-5 w-5" />
                    <input
                      type="file"
                      accept="audio/*"
                      id="audioUpload"
                      className="hidden"
                      onChange={(e) => {
                        if (checkTimeRestriction()) {
                          if (isVerified) {
                            handleAudioUploadSelect(e);
                          } else {
                            setIsOTPModalOpen(true);
                          }
                        }
                      }}
                      disabled={isLoading || isRecording}
                    />
                  </label>
                </div>

                {/* Audio Preview */}
                {(audioUrl || audioError) && (
                  <div className="w-full mt-2 mb-2">
                    {audioError ? (
                      <div className="text-red-500 text-sm flex items-center justify-between">
                        <span>{audioError}</span>
                        <Button variant="ghost" size="sm" onClick={() => setAudioError("")}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-gray-900 p-2 rounded-lg border border-gray-800">
                        <audio controls src={audioUrl} className="h-8 w-full" />
                        <Button variant="ghost" size="icon" onClick={removeAudio} className="text-gray-400 hover:text-white">
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <OTPModal
                  isOpen={isOTPModalOpen}
                  onClose={() => setIsOTPModalOpen(false)}
                  email={user.email}
                  onVerified={handleOTPVerified}
                />
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-semibold">
                      {t("everyone_reply")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {characterCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="relative w-8 h-8">
                          <svg className="w-8 h-8 transform -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-gray-700"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 14}`}
                              strokeDashoffset={`${2 *
                                Math.PI *
                                14 *
                                (1 - characterCount / maxLength)
                                }`}
                              className={
                                isOverLimit
                                  ? "text-red-500"
                                  : isNearLimit
                                    ? "text-yellow-500"
                                    : "text-blue-500"
                              }
                            />
                          </svg>
                        </div>
                        {isNearLimit && (
                          <span
                            className={`text-sm ${isOverLimit ? "text-red-500" : "text-yellow-500"
                              }`}
                          >
                            {maxLength - characterCount}
                          </span>
                        )}
                      </div>
                    )}
                    <Separator
                      orientation="vertical"
                      className="h-6 bg-gray-700"
                    />

                    <Button
                      type="submit"
                      disabled={!content.trim() || isOverLimit || isLoading || isRecording}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full px-6"
                    >
                      {t("tweet")}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </CardContent >
    </Card >
  );
};

export default TweetComposer;
