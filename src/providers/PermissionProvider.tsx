import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { 
  GlobalRole, 
  TournamentRole, 
  Capability, 
  getGlobalRole, 
  getTournamentRole, 
  hasCapability,
  UserRoleV2,
  ActionV2,
  hasPermission
} from "../foundation/permissions";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  PermissionEngineV3, 
  RoleV3, 
  ResourceV3, 
  ActionV3, 
  UserProfileV3, 
  PermissionCheckContext 
} from "../engines/permissionEngine";
import { TournamentWorkflowState } from "../types";

interface PermissionContextType {
  // Layer 1
  globalRole: GlobalRole;
  // Layer 2 helper
  getTournamentRole: (tournamentDoc: any) => TournamentRole;
  // Capability-based evaluator
  hasCapability: (capability: Capability, tournamentDoc?: any) => boolean;
  
  // Backward Compatibility (V2)
  role: UserRoleV2;
  hasPermission: (action: ActionV2, context?: { tournamentId?: string; laneNumber?: number; assignedLane?: number }) => boolean;
  setOverriddenRole: (role: UserRoleV2 | null) => void;
  overriddenRole: UserRoleV2 | null;

  // New VSC Permission Engine V3 (RBAC & State-Aware)
  userProfile: UserProfileV3 | null;
  getRoleV3: (tournamentDoc?: any) => RoleV3;
  hasPermissionV3: (
    resource: ResourceV3,
    action: ActionV3,
    tournamentDoc?: any,
    context?: PermissionCheckContext
  ) => boolean;
  
  // Quick Switchers/Simulators for development & override
  overriddenRoleV3: RoleV3 | null;
  setOverriddenRoleV3: (role: RoleV3 | null) => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalRole, setGlobalRoleState] = useState<GlobalRole>("guest");
  const [overriddenRole, setOverriddenRole] = useState<UserRoleV2 | null>(null);
  
  // V3 states
  const [userProfile, setUserProfile] = useState<UserProfileV3 | null>(null);
  const [overriddenRoleV3, setOverriddenRoleV3] = useState<RoleV3 | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setGlobalRoleState("guest");
        setUserProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        return;
      }

      // Determine standard global role
      const gRole = getGlobalRole(user.email);
      setGlobalRoleState(gRole);

      // Real-time listener for User Profile to get real-time role & permissions updates
      const userRef = doc(db, "users", user.uid);
      unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserProfile({
            uid: user.uid,
            email: user.email || "",
            displayName: data.displayName || "",
            role: data.role || (gRole === "system_owner" ? "system_owner" : gRole === "admin" ? "admin" : "viewer"),
            permissions: data.permissions || [],
            organization: data.organization || "",
            clubId: data.clubId || "",
            provinceId: data.provinceId || "",
            systemScopes: data.systemScopes || []
          });
        } else {
          // Default profile if document doesn't exist yet
          setUserProfile({
            uid: user.uid,
            email: user.email || "",
            role: gRole === "system_owner" ? "system_owner" : gRole === "admin" ? "admin" : "viewer",
            permissions: [],
            organization: "",
            clubId: "",
            provinceId: "",
            systemScopes: []
          });
        }
      }, (err) => {
        console.error("Error watching user profile:", err);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const evaluateTournamentRole = useCallback((tournamentDoc: any): TournamentRole => {
    const user = auth.currentUser;
    return getTournamentRole(user?.email, user?.uid, tournamentDoc);
  }, []);

  const evaluateCapability = useCallback((capability: Capability, tournamentDoc?: any): boolean => {
    const user = auth.currentUser;
    const gRole = getGlobalRole(user?.email);
    
    if (!tournamentDoc) {
      if (gRole === "system_owner") return true;
      if (gRole === "admin" && (capability === "tournament.create" || capability === "global.manage_users")) {
        return true;
      }
      return false;
    }

    const tRole = getTournamentRole(user?.email, user?.uid, tournamentDoc);
    
    let customSubAdminCaps: Capability[] | undefined = undefined;
    if (tRole === "sub_admin" && user?.email && tournamentDoc.subAdminCapabilities) {
      const emailKey = user.email.toLowerCase().trim();
      customSubAdminCaps = tournamentDoc.subAdminCapabilities[emailKey];
    }

    return hasCapability(gRole, tRole, capability, customSubAdminCaps);
  }, []);

  // V3 Role Resolution Helper
  const getRoleV3 = useCallback((tournamentDoc?: any): RoleV3 => {
    if (overriddenRoleV3) {
      return overriddenRoleV3;
    }

    const user = auth.currentUser;
    if (!user) return "guest";

    const gRole = getGlobalRole(user.email);
    
    // Check if userProfile from Firestore contains a specific role override
    const profileRole = userProfile?.role;
    const effectiveGlobalRole = profileRole || gRole;

    if (!tournamentDoc) {
      return PermissionEngineV3.mapToRoleV3(effectiveGlobalRole);
    }

    const tRole = getTournamentRole(user.email, user.uid, tournamentDoc);
    return PermissionEngineV3.mapToRoleV3(effectiveGlobalRole, tRole);
  }, [overriddenRoleV3, userProfile]);

  // V3 State-Aware Permission Checker
  const hasPermissionV3 = useCallback((
    resource: ResourceV3,
    action: ActionV3,
    tournamentDoc?: any,
    context?: PermissionCheckContext
  ): boolean => {
    const activeRole = getRoleV3(tournamentDoc);
    const workflowState: TournamentWorkflowState = tournamentDoc?.workflowState || "draft";
    
    const contextWithUser: PermissionCheckContext = {
      userId: auth.currentUser?.uid,
      userEmail: auth.currentUser?.email || undefined,
      clubId: userProfile?.clubId || undefined,
      provinceId: userProfile?.provinceId || undefined,
      ...context
    };

    const isGranted = PermissionEngineV3.hasPermission(
      activeRole,
      workflowState,
      resource,
      action,
      contextWithUser
    );

    // Audit Log Permission Checks
    if (auth.currentUser) {
      PermissionEngineV3.logPermissionAudit(
        auth.currentUser.uid,
        auth.currentUser.email || "unknown@vscs.asia",
        activeRole,
        resource,
        action,
        workflowState,
        isGranted,
        tournamentDoc ? `Tournament ID: ${tournamentDoc.id || "unknown"}` : "Global context"
      );
    }

    return isGranted;
  }, [getRoleV3, userProfile]);

  // Backward Compatibility (V2)
  const roleV2: UserRoleV2 = overriddenRole || (globalRole === "system_owner" ? "system_owner" : globalRole === "admin" ? "admin" : "viewer");

  const checkPermission = useCallback((action: ActionV2, context?: { tournamentId?: string; laneNumber?: number; assignedLane?: number }) => {
    return hasPermission(roleV2, action, context);
  }, [roleV2]);

  const contextValue = useMemo(() => ({
    globalRole,
    getTournamentRole: evaluateTournamentRole,
    hasCapability: evaluateCapability,
    role: roleV2,
    hasPermission: checkPermission,
    setOverriddenRole,
    overriddenRole,
    
    // V3 integrations
    userProfile,
    getRoleV3,
    hasPermissionV3,
    overriddenRoleV3,
    setOverriddenRoleV3
  }), [
    globalRole,
    evaluateTournamentRole,
    evaluateCapability,
    roleV2,
    checkPermission,
    setOverriddenRole,
    overriddenRole,
    userProfile,
    getRoleV3,
    hasPermissionV3,
    overriddenRoleV3,
    setOverriddenRoleV3
  ]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return context;
};

interface PermissionGateProps {
  capability?: Capability;
  resource?: ResourceV3;
  action?: ActionV3;
  tournamentDoc?: any;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  capability,
  resource,
  action,
  tournamentDoc,
  fallback = null,
  children,
}) => {
  const { hasCapability: check, hasPermissionV3 } = usePermission();

  if (resource && action) {
    if (hasPermissionV3(resource, action, tournamentDoc)) {
      return <>{children}</>;
    }
  } else if (capability) {
    if (check(capability, tournamentDoc)) {
      return <>{children}</>;
    }
  }

  return <>{fallback}</>;
};
