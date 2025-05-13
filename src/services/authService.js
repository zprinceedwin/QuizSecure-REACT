// src/services/authService.js
// import { ipcRenderer } from "electron"; // REMOVED THIS LINE
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Supabase Client Initialization
const SUPABASE_URL = "https://nkkvsmrjffhzhcfobopm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra3ZzbXJqZmZoemhjZm9ib3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDgzNDMsImV4cCI6MjA2MjcyNDM0M30.GwilH-iUS-9HFUMS57pJJFRM_nzEWTj-5VLzWAQf4dQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("authService.js: Supabase client initialized.");

// Constants for storage keys - IMPORTANT: Ensure these match actual usage if different
const USER_SESSION_KEY = "quizSecureUserSession"; 
// const OFFLINE_USERS_KEY = "quizSecureOfflineUsers"; // Commented out if not immediately used with Supabase

// Helper function to manage user session in localStorage
const setUserSession = (session) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
      console.log("[AuthService] setUserSession: Session saved.", session);
    } catch (error) {
      console.error("[AuthService] setUserSession: Error saving session to localStorage:", error);
    }
  }
};

const getUserSession = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const sessionStr = localStorage.getItem(USER_SESSION_KEY);
      if (sessionStr) {
        return JSON.parse(sessionStr);
      }
    } catch (error) {
      console.error("[AuthService] getUserSession: Error reading session from localStorage:", error);
    }
  }
  return null;
};

const clearUserSession = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(USER_SESSION_KEY);
      console.log("[AuthService] clearUserSession: Session cleared from localStorage.");
    } catch (error) {
      console.error("[AuthService] clearUserSession: Error removing session from localStorage:", error);
    }
  }
};

// Simulating a delay for network requests (optional, can be removed for production)
const simulateNetworkDelay = (ms = 200) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const authService = {
  login: async (email, password) => {
    console.log("[AuthService] login: Attempting Supabase login for", email);
    await simulateNetworkDelay();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error("[AuthService] login: Supabase login error:", error.message);
        if (error.message.includes("Invalid login credentials")) {
          return { success: false, message: "Invalid email or password." };
        }
        return { success: false, message: error.message || "Login failed. Please try again." };
      }

      if (data && data.user && data.session) {
        console.log("[AuthService] login: Supabase login successful for user:", data.user.id);
        // Fetch user profile from your 'users' table based on data.user.id
        // This assumes you have a 'users' table with 'role' and 'full_name'
        let userProfileData = {};
        try {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.error('[AuthService] login: Error fetching user profile:', profileError.message);
            // Proceed with basic info if profile fetch fails, or handle as critical error
            userProfileData = {
              id: data.user.id,
              email: data.user.email,
              role: 'student', // Default role
              name: data.user.email, // Default name
            };
          } else if (profile) {
            userProfileData = {
              id: profile.id,
              email: profile.email,
              role: profile.role || 'student',
              name: profile.full_name || data.user.email,
            };
          }
        } catch (profileFetchError) {
            console.error('[AuthService] login: Exception fetching user profile:', profileFetchError);
             userProfileData = {
              id: data.user.id,
              email: data.user.email,
              role: 'student',
              name: data.user.email,
            };
        }
        
        setUserSession({ user: userProfileData, token: data.session.access_token, refreshToken: data.session.refresh_token });
        return { success: true, user: userProfileData };
      }
      return { success: false, message: "Login failed. No user data or session received." };
    } catch (e) {
      console.error("[AuthService] login: Unexpected error during Supabase login:", e);
      return { success: false, message: "An unexpected error occurred during login." };
    }
  },

  register: async (userData) => {
    const { email, password, fullName, role = 'student' } = userData;
    console.log("[AuthService] register: Attempting Supabase registration for", email);
    await simulateNetworkDelay();

    try {
      // Step 1: Sign up the user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        // options: { data: { full_name: fullName, role: role } } // user_metadata set here might be overwritten by trigger or not used directly
      });

      if (signUpError) {
        console.error("[AuthService] register: Supabase signUp error:", signUpError.message);
        if (signUpError.message.includes("User already registered")) {
          return { success: false, message: "This email is already registered." };
        }
        return { success: false, message: signUpError.message || "Registration failed. Please try again." };
      }

      if (authData && authData.user) {
        console.log("[AuthService] register: Supabase auth.signUp successful for user:", authData.user.id);
        
        console.log("[AuthService] register: Inspecting authData.session right after signUp:", authData.session);

        // Attempt to explicitly set the session for the client
        if (authData.session && authData.session.access_token && authData.session.refresh_token) {
          console.log("[AuthService] register: Attempting to explicitly set session before inserting profile.");
          try {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: authData.session.access_token,
              refresh_token: authData.session.refresh_token,
            });
            if (setSessionError) {
              console.error("[AuthService] register: Error explicitly setting session:", setSessionError.message);
              // Potentially return an error here if setting session is critical and fails
            } else {
              console.log("[AuthService] register: Session explicitly set successfully.");
            }
          } catch (e) {
            console.error("[AuthService] register: Exception during explicit setSession call:", e);
          }
        } else {
          console.warn("[AuthService] register: authData.session or its tokens are missing. Cannot explicitly set session. This is unexpected if email confirmation is off.");
          // This scenario is highly problematic for the subsequent insert if it occurs.
        }

        // Step 2: Insert user profile data into your public 'users' table
        // This is crucial because Supabase auth.users is separate from your public tables.
        const { data: profileData, error: insertError } = await supabase
          .from('users') 
          .insert([
            {
              id: authData.user.id, // Use the ID from the auth user
              email: email,
              full_name: fullName,
              role: role,
              // hashed_password should NOT be stored here, Supabase auth handles it.
            },
          ])
          .select() // Optionally select to confirm insert
          .single(); // Assuming one user is inserted

        if (insertError) {
          console.error("[AuthService] register: Error inserting user profile into 'users' table:", insertError.message);
          // Potentially roll back Supabase auth user or mark as unprofiled if critical
          return { success: false, message: `Registration created auth user, but profile setup failed: ${insertError.message}` };
        }
        
        console.log("[AuthService] register: User profile created in 'users' table:", profileData);

        // For Supabase, signUp often requires email confirmation by default.
        // authData.session will be null if confirmation is pending.
        if (authData.session) {
          const userProfile = {
            id: authData.user.id,
            email: authData.user.email,
            role: profileData?.role || role, // Use role from profile table
            name: profileData?.full_name || fullName, // Use name from profile table
          };
          setUserSession({ user: userProfile, token: authData.session.access_token, refreshToken: authData.session.refresh_token });
          return { success: true, user: userProfile, message: "Registration successful!" };
        } else {
          console.warn("[AuthService] register: Supabase user auth created, email confirmation may be pending. Profile created.");
          return { success: true, user: { id: authData.user.id, email: authData.user.email, fullName, role }, message: "Registration successful! Please check your email to confirm your account if required, then log in." };
        }
      }
      return { success: false, message: "Registration failed. No auth user data received." };
    } catch (e) {
      console.error("[AuthService] register: Unexpected error during Supabase registration:", e);
      return { success: false, message: "An unexpected error occurred during registration." };
    }
  },

  logout: async () => {
    console.log("[AuthService] logout: Attempting Supabase logout");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthService] logout: Supabase logout error:", error.message);
      }
    } catch (e) {
      console.error("[AuthService] logout: Unexpected error during Supabase signOut:", e);
    } finally {
      clearUserSession();
      // Use the exposed ipcRenderer from the preload script
      if (window.electron && window.electron.ipc && typeof window.electron.ipc.send === 'function') {
        window.electron.ipc.send("user-logout");
        console.log("[AuthService] logout: Electron IPC user-logout sent via window.electron.ipc.send.");
      } else {
        // Fallback or log if window.electron.ipc.send is not available, though it should be via preload
        console.warn("[AuthService] logout: window.electron.ipc.send not available.");
      }
      console.log("[AuthService] logout: Local session cleared.");
    }
    return { success: true, message: "Logged out successfully." };
  },

  checkAuth: async () => {
    console.log("[AuthService] checkAuth: Checking Supabase session.");
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error("[AuthService] checkAuth: Error fetching session:", error.message);
      clearUserSession();
      return { isAuthenticated: false, user: null };
    }

    if (session && session.user) {
      console.log("[AuthService] checkAuth: Active Supabase session found for user:", session.user.id);
      // Optionally, you might want to refresh or re-fetch profile data here too
      // For simplicity, we'll try to use existing localStorage session if valid, then Supabase session
      let localSession = getUserSession();
      if (localSession && localSession.token === session.access_token && localSession.user?.id === session.user.id) {
         console.log("[AuthService] checkAuth: Using valid local session data.");
        return { isAuthenticated: true, user: localSession.user };
      }
      
      // If local session is stale or missing, reconstruct it
      console.log("[AuthService] checkAuth: Local session stale or missing, reconstructing from Supabase session.");
      let userProfileData = {};
        try {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('[AuthService] checkAuth: Error fetching user profile:', profileError.message);
            userProfileData = { id: session.user.id, email: session.user.email, role: 'student', name: session.user.email };
          } else if (profile) {
            userProfileData = { id: profile.id, email: profile.email, role: profile.role || 'student', name: profile.full_name || session.user.email };
          }
        } catch (profileFetchError) {
            console.error('[AuthService] checkAuth: Exception fetching user profile:', profileFetchError);
            userProfileData = { id: session.user.id, email: session.user.email, role: 'student', name: session.user.email };
        }

      setUserSession({ user: userProfileData, token: session.access_token, refreshToken: session.refresh_token });
      return { isAuthenticated: true, user: userProfileData };
    }
    
    console.log("[AuthService] checkAuth: No active Supabase session.");
    clearUserSession();
    return { isAuthenticated: false, user: null };
  },

  isAuthenticated: () => {
    const session = getUserSession();
    // Basic check, consider token expiry if your token has an easily parsable expiry time
    // For Supabase, the robust check is async via checkAuth/validateToken
    return !!(session && session.user && session.token);
  },

  getUserRole: () => {
    const session = getUserSession();
    return session && session.user ? session.user.role : null;
  },

  validateToken: async () => {
    console.log("[AuthService] validateToken: Validating token via checkAuth.");
    const authState = await authService.checkAuth(); // Use authService.checkAuth to avoid recursion if checkAuth itself is moved/renamed
    return authState.isAuthenticated;
  },

  refreshToken: async () => {
    console.log("[AuthService] refreshToken: Attempting to refresh Supabase session.");
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession(); // Tries to refresh using existing refresh token
      // supabase.auth.getSession() also refreshes if needed and a valid session exists
      // const { data: { session }, error } = await supabase.auth.getSession();


      if (error) {
        console.error("[AuthService] refreshToken: Error refreshing session:", error.message);
        clearUserSession(); // If refresh fails, clear session
        return false; // Indicate failure
      }

      if (session && session.user) {
        console.log("[AuthService] refreshToken: Session refreshed successfully for user:", session.user.id);
        // Re-fetch profile and update local session, similar to checkAuth
        let userProfileData = {};
        try {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('[AuthService] refreshToken: Error fetching user profile after refresh:', profileError.message);
            userProfileData = { id: session.user.id, email: session.user.email, role: 'student', name: session.user.email };
          } else if (profile) {
            userProfileData = { id: profile.id, email: profile.email, role: profile.role || 'student', name: profile.full_name || session.user.email };
          }
        } catch (profileFetchError) {
            console.error('[AuthService] refreshToken: Exception fetching user profile after refresh:', profileFetchError);
            userProfileData = { id: session.user.id, email: session.user.email, role: 'student', name: session.user.email };
        }
        setUserSession({ user: userProfileData, token: session.access_token, refreshToken: session.refresh_token });
        return true; // Indicate success
      }
      
      console.log("[AuthService] refreshToken: No session returned after refresh attempt.");
      clearUserSession(); // If no session, clear local
      return false; // Indicate failure
    } catch (e) {
      console.error("[AuthService] refreshToken: Unexpected error during session refresh:", e);
      clearUserSession();
      return false; // Indicate failure
    }
  },

  getCurrentUser: () => {
    const session = getUserSession();
    return session ? session.user : null;
  },

  isElectron: () => {
    return typeof window !== "undefined" && window.electron;
  },
  
  // Potentially add other methods if needed, e.g., password reset, email update
  // For now, focusing on core login, register, logout, checkAuth, getCurrentUser
};

export default authService;