"use client";
import "@/lib/i18n";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "./firebase";
import axiosInstance from "../lib/axiosInstance";
import LoginOTPModal from "../components/LoginOTPModal";

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  email: string;
  phoneNumber?: string;
  website: string;
  location: string;
  notificationsEnabled: boolean;
  subscriptionPlan: string;
  preferredLanguage: string;
  loginHistory?: {
    timestamp: string;
    browser: string;
    os: string;
    device: string;
    ip: string;
  }[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;
  updateProfile: (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    notificationsEnabled?: boolean;
  }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  googlesignin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginOTP, setShowLoginOTP] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    // Check for existing session
    const unsubcribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        try {
          const res = await axiosInstance.get("/loggedinuser", {
            params: { email: firebaseUser.email },
          });

          if (res.data) {
            setUser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));
          }
        } catch (err) {
          console.log("Failed to fetch user:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("twitter-user");
      }
      setIsLoading(false);
    });
    return () => unsubcribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Perform Task 6 Security Checks
      const checkRes = await axiosInstance.post("/login-check", {
        email,
        userAgent: navigator.userAgent
      });

      if (checkRes.data.otpRequired) {
        setPendingEmail(email);
        setShowLoginOTP(true);
        setIsLoading(false);
        return; // Wait for OTP
      }

      const userData = checkRes.data.user;
      setUser(userData);
      localStorage.setItem("twitter-user", JSON.stringify(userData));
    } catch (error: any) {
      console.error("Login Error:", error);
      alert(error.response?.data?.error || error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    setIsLoading(true);
    // Mock authentication - in real app, this would call an API
    const usercred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = usercred.user;
    const newuser: any = {
      username,
      displayName,
      avatar: user.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
      email: user.email,
    };
    const res = await axiosInstance.post("/register", newuser);
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    // const mockUser: User = {
    //   id: '1',
    //   username,
    //   displayName,
    //   avatar: 'https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400',
    //   bio: '',
    //   joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    // };
    setIsLoading(false);
  };

  const logout = async () => {
    setUser(null);
    await signOut(auth);
    localStorage.removeItem("twitter-user");
  };

  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    notificationsEnabled?: boolean;
  }) => {
    if (!user) return;

    setIsLoading(true);
    // Mock API call - in real app, this would call an API
    // await new Promise((resolve) => setTimeout(resolve, 1000));

    const updatedUser: User = {
      ...user,
      ...profileData,
    };
    const res = await axiosInstance.patch(
      `/userupdate/${user.email}`,
      updatedUser
    );
    if (res.data) {
      setUser(updatedUser);
      localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
    }

    setIsLoading(false);
  };
  const googlesignin = async () => {
    setIsLoading(true);

    try {
      const googleauthprovider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleauthprovider);
      const firebaseuser = result.user;
      if (firebaseuser?.email) {
        let checkRes;
        try {
          checkRes = await axiosInstance.post("/login-check", {
            email: firebaseuser.email,
            userAgent: navigator.userAgent
          });
        } catch (err: any) {
          if (err.response?.status === 404) {
            const newuser: any = {
              username: firebaseuser.email!.split("@")[0],
              displayName: firebaseuser.displayName || "User",
              avatar: firebaseuser.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
              email: firebaseuser.email,
            };
            await axiosInstance.post("/register", newuser);
            checkRes = await axiosInstance.post("/login-check", {
              email: firebaseuser.email,
              userAgent: navigator.userAgent
            });
          } else {
            throw err;
          }
        }

        if (checkRes.data.otpRequired) {
          setPendingEmail(firebaseuser.email);
          setShowLoginOTP(true);
          setIsLoading(false);
          return;
        }

        const userData = checkRes.data.user;
        setUser(userData);
        localStorage.setItem("twitter-user", JSON.stringify(userData));
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      alert(error.response?.data?.error || error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        updateProfile,
        logout,
        isLoading,
        googlesignin,
      }}
    >
      {children}
      {showLoginOTP && (
        <LoginOTPModal
          email={pendingEmail}
          onSuccess={(userData) => {
            setUser(userData);
            localStorage.setItem("twitter-user", JSON.stringify(userData));
            setShowLoginOTP(false);
          }}
          onCancel={() => {
            setShowLoginOTP(false);
            signOut(auth);
          }}
        />
      )}
    </AuthContext.Provider>
  );
};
