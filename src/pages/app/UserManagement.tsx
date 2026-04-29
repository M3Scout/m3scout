import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Settings, 
  Users, 
  Crown, 
  AlertTriangle, 
  Lock, 
  Search, 
  MoreHorizontal,
  UserCheck,
  UserX,
  UserCog,
  Filter,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

type AppRole = "admin" | "scout" | "member" | "partner" | "editor" | "viewer" | "player";

interface UserWithPermissions {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  is_owner: boolean;
  status: string;
  last_login_at: string | null;
  linked_player_id: string | null;
  linked_player_name?: string | null;
  permissions: {
    players_view: boolean;
    players_create: boolean;
    players_edit: boolean;
    players_delete: boolean;
    players_export: boolean;
    compare_view: boolean;
    reports_view: boolean;
    reports_create: boolean;
    reports_edit: boolean;
    reports_delete: boolean;
    reports_export: boolean;
    live_match_view: boolean;
    live_match_log: boolean;
    competitions_view: boolean;
    competitions_create: boolean;
    competitions_edit: boolean;
    competitions_delete: boolean;
    news_view: boolean;
    news_create: boolean;
    news_edit: boolean;
    news_delete: boolean;
    news_publish: boolean;
    leads_view: boolean;
    leads_create: boolean;
    leads_edit: boolean;
    leads_delete: boolean;
    leads_export: boolean;
    users_manage: boolean;
  } | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  editor: "Editor",
  scout: "Editor",
  viewer: "Viewer",
  member: "Viewer",
  partner: "Partner",
  player: "Jogador",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  editor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  scout: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  viewer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  member: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  partner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  player: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const MODULES = [
  { key: "players", label: "Atletas", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "compare", label: "Comparar", actions: ["view"] },
  { key: "reports", label: "Relatórios", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "live_match", label: "Jogo Ao Vivo", actions: ["view", "log"] },
  { key: "competitions", label: "Competições", actions: ["view", "create", "edit", "delete"] },
  { key: "news", label: "Notícias", actions: ["view", "create", "edit", "delete", "publish"] },
  { key: "leads", label: "Leads", actions: ["view", "create", "edit", "delete", "export"] },
];

const ACTION_LABELS: Record<string, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  export: "Exportar",
  log: "Registrar",
  publish: "Publicar",
};

export default function UserManagement() {
  const { user: currentUser, isAdmin } = useAuth();
  const { can, isOwner: currentUserIsOwner } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<Record<string, boolean>>({});
  const [editedRole, setEditedRole] = useState<AppRole | null>(null);
  const [editedLinkedPlayerId, setEditedLinkedPlayerId] = useState<string | null>(null);
  
  // Available players for linking
  const [availablePlayers, setAvailablePlayers] = useState<{id: string; full_name: string}[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: "activate" | "suspend" | "reject";
    user: UserWithPermissions;
  } | null>(null);
  
  // Approval modal state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalUser, setApprovalUser] = useState<UserWithPermissions | null>(null);
  const [approvalRole, setApprovalRole] = useState<AppRole>("scout");
  const [approvalLinkedPlayerId, setApprovalLinkedPlayerId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  // Reset password modal state
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithPermissions | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let result = "";
    const arr = new Uint32Array(8);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 8; i++) result += chars[arr[i] % chars.length];
    setNewPassword(result);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    if (!isAdmin) {
      toast.error("Apenas administradores podem redefinir senhas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres");
      return;
    }
    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-user-password", {
        body: { user_id: resetPasswordUser.user_id, new_password: newPassword },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Senha alterada com sucesso!");
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (err) {
      console.error("[reset-password] error:", err);
      toast.error(`Erro ao redefinir senha: ${(err as Error).message}`);
    } finally {
      setResettingPassword(false);
    }
  };

  // Check access
  useEffect(() => {
    if (!can("users", "manage")) {
      toast.error("Acesso negado");
      navigate("/app");
    }
  }, [can, navigate]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role, is_owner, status, linked_player_id")
          .order("created_at", { ascending: true });

        if (rolesError) throw rolesError;

        const userIds = [...new Set(rolesData?.map(r => r.user_id) || [])];
        const playerIds = [...new Set(rolesData?.map(r => r.linked_player_id).filter(Boolean) || [])];

        if (userIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, last_login_at")
          .in("user_id", userIds);

        if (profilesError) throw profilesError;

        const { data: permsData, error: permsError } = await supabase
          .from("user_permissions")
          .select("*")
          .in("user_id", userIds);

        if (permsError) throw permsError;

        // Fetch linked player names
        let playersMap = new Map<string, string>();
        if (playerIds.length > 0) {
          const { data: playersData } = await supabase
            .from("players")
            .select("id, full_name")
            .in("id", playerIds);
          
          playersData?.forEach(p => playersMap.set(p.id, p.full_name));
        }

        const usersMap = new Map<string, UserWithPermissions>();

        rolesData?.forEach(role => {
          const profile = profilesData?.find(p => p.user_id === role.user_id);
          const perms = permsData?.find(p => p.user_id === role.user_id);
          
          const existing = usersMap.get(role.user_id);
          const roleOrder: Record<AppRole, number> = { admin: 4, editor: 3, scout: 3, partner: 2, player: 1, viewer: 1, member: 1 };
          
          if (!existing || roleOrder[role.role as AppRole] > roleOrder[existing.role]) {
            usersMap.set(role.user_id, {
              user_id: role.user_id,
              email: profile?.full_name || role.user_id.slice(0, 8) + "...",
              full_name: profile?.full_name,
              role: role.role as AppRole,
              is_owner: role.is_owner ?? false,
              status: role.status ?? "active",
              last_login_at: profile?.last_login_at,
              linked_player_id: role.linked_player_id ?? null,
              linked_player_name: role.linked_player_id ? playersMap.get(role.linked_player_id) : null,
              permissions: perms ? {
                players_view: perms.players_view,
                players_create: perms.players_create,
                players_edit: perms.players_edit,
                players_delete: perms.players_delete,
                players_export: perms.players_export,
                compare_view: perms.compare_view,
                reports_view: perms.reports_view,
                reports_create: perms.reports_create,
                reports_edit: perms.reports_edit,
                reports_delete: perms.reports_delete,
                reports_export: perms.reports_export,
                live_match_view: perms.live_match_view,
                live_match_log: perms.live_match_log,
                competitions_view: perms.competitions_view,
                competitions_create: perms.competitions_create,
                competitions_edit: perms.competitions_edit,
                competitions_delete: perms.competitions_delete,
                news_view: perms.news_view,
                news_create: perms.news_create,
                news_edit: perms.news_edit,
                news_delete: perms.news_delete,
                news_publish: perms.news_publish,
                leads_view: perms.leads_view,
                leads_create: perms.leads_create,
                leads_edit: perms.leads_edit,
                leads_delete: perms.leads_delete,
                leads_export: perms.leads_export,
                users_manage: perms.users_manage,
              } : null,
            });
          }
        });

        setUsers(Array.from(usersMap.values()));
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Erro ao carregar usuários");
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const searchMatch = !searchQuery || 
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        user.user_id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === "all" || user.status === statusFilter;
      
      // Role filter
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      
      return searchMatch && statusMatch && roleMatch;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // Fetch available players for linking
  const fetchAvailablePlayers = async () => {
    setLoadingPlayers(true);
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name")
        .or("is_archived.eq.false,is_archived.is.null")
        .order("full_name");
      
      if (!error && data) {
        setAvailablePlayers(data);
      }
    } catch (e) {
      console.error("Error fetching players:", e);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const openPermissions = (user: UserWithPermissions) => {
    setSelectedUser(user);
    setEditedRole(user.role);
    setEditedPermissions(user.permissions || {});
    setEditedLinkedPlayerId(user.linked_player_id);
    setPermissionsOpen(true);
    
    // Fetch players for the dropdown if this is or could become a player role
    fetchAvailablePlayers();
  };

  const handleRoleChange = (newRole: AppRole) => {
    setEditedRole(newRole);
    
    const isAdminRole = newRole === "admin";
    const isEditorRole = newRole === "editor" || newRole === "scout";
    
    const defaults: Record<string, boolean> = {};
    MODULES.forEach(module => {
      module.actions.forEach(action => {
        const key = `${module.key}_${action}`;
        if (action === "delete") {
          defaults[key] = isAdminRole;
        } else if (action === "view") {
          defaults[key] = true;
        } else if (["create", "edit", "export", "log", "publish"].includes(action)) {
          defaults[key] = isAdminRole || isEditorRole;
        }
      });
    });
    
    setEditedPermissions(prev => ({ ...prev, ...defaults }));
  };

  const handlePermissionChange = (key: string, checked: boolean) => {
    if (key.endsWith("_delete") && editedRole !== "admin") {
      return;
    }
    setEditedPermissions(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    if (!selectedUser || !editedRole) return;

    if (selectedUser.is_owner && !currentUserIsOwner) {
      toast.error("Você não pode alterar o usuário owner");
      return;
    }

    // Validate: player role needs a linked player
    if (editedRole === "player" && !editedLinkedPlayerId) {
      toast.error("Selecione um atleta para vincular ao usuário jogador");
      return;
    }

    setSaving(true);
    try {
      // Update role and linked_player_id
      const roleUpdateData: any = { role: editedRole };
      
      // Only set linked_player_id for player role
      if (editedRole === "player") {
        roleUpdateData.linked_player_id = editedLinkedPlayerId;
      } else {
        roleUpdateData.linked_player_id = null;
      }
      
      const { error: roleError } = await supabase
        .from("user_roles")
        .update(roleUpdateData)
        .eq("user_id", selectedUser.user_id);

      if (roleError) throw roleError;

      // Skip permission updates for player role (they have fixed read-only permissions)
      if (editedRole !== "player") {
        const permsToSave = { ...editedPermissions };
        if (editedRole !== "admin") {
          MODULES.forEach(module => {
            if (module.actions.includes("delete")) {
              permsToSave[`${module.key}_delete`] = false;
            }
          });
        }
        permsToSave.users_manage = editedRole === "admin";

        const { error: permsError } = await supabase
          .from("user_permissions")
          .update({
            ...permsToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", selectedUser.user_id);

        if (permsError) throw permsError;
      }

      toast.success("Permissões atualizadas com sucesso");
      setPermissionsOpen(false);

      // Get linked player name
      const linkedPlayerName = availablePlayers.find(p => p.id === editedLinkedPlayerId)?.full_name || null;

      setUsers(prev => prev.map(u => 
        u.user_id === selectedUser.user_id 
          ? { 
              ...u, 
              role: editedRole, 
              linked_player_id: editedRole === "player" ? editedLinkedPlayerId : null,
              linked_player_name: editedRole === "player" ? linkedPlayerName : null,
              permissions: editedRole === "player" ? u.permissions : editedPermissions as any 
            }
          : u
      ));
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ status: newStatus })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(newStatus === "active" ? "Usuário ativado" : "Usuário suspenso");
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, status: newStatus } : u
      ));
      setConfirmAction(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  // Counts
  const activeCount = users.filter(u => u.status === "active").length;
  const suspendedCount = users.filter(u => u.status === "suspended").length;
  const pendingCount = users.filter(u => u.status === "pending").length;
  
  // Open approval modal
  const openApprovalModal = (user: UserWithPermissions) => {
    setApprovalUser(user);
    setApprovalRole("scout"); // Default to scout
    setApprovalLinkedPlayerId(null);
    setApprovalModalOpen(true);
    fetchAvailablePlayers();
  };
  
  // Handle approval
  const handleApprove = async () => {
    if (!approvalUser) return;
    
    // Validate: player role needs a linked player
    if (approvalRole === "player" && !approvalLinkedPlayerId) {
      toast.error("Selecione um atleta para vincular ao usuário jogador");
      return;
    }
    
    setApproving(true);
    try {
      // Update role and status to active
      const updateData: any = { 
        role: approvalRole,
        status: "active"
      };
      
      if (approvalRole === "player") {
        updateData.linked_player_id = approvalLinkedPlayerId;
      } else {
        updateData.linked_player_id = null;
      }
      
      const { error: roleError } = await supabase
        .from("user_roles")
        .update(updateData)
        .eq("user_id", approvalUser.user_id);
      
      if (roleError) throw roleError;
      
      // Create default permissions for non-player roles
      if (approvalRole !== "player") {
        const isEditorRole = approvalRole === "editor" || approvalRole === "scout";
        const isAdminRole = approvalRole === "admin";
        
        // Build permissions object
        const permsToSave = {
          user_id: approvalUser.user_id,
          app_view: true,
          players_view: true,
          players_create: isAdminRole || isEditorRole,
          players_edit: isAdminRole || isEditorRole,
          players_delete: isAdminRole,
          players_export: isAdminRole || isEditorRole,
          compare_view: true,
          reports_view: true,
          reports_create: isAdminRole || isEditorRole,
          reports_edit: isAdminRole || isEditorRole,
          reports_delete: isAdminRole,
          reports_export: isAdminRole || isEditorRole,
          live_match_view: true,
          live_match_log: isAdminRole || isEditorRole,
          competitions_view: true,
          competitions_create: isAdminRole || isEditorRole,
          competitions_edit: isAdminRole || isEditorRole,
          competitions_delete: isAdminRole,
          news_view: true,
          news_create: isAdminRole || isEditorRole,
          news_edit: isAdminRole || isEditorRole,
          news_delete: isAdminRole,
          news_publish: isAdminRole || isEditorRole,
          leads_view: true,
          leads_create: isAdminRole || isEditorRole,
          leads_edit: isAdminRole || isEditorRole,
          leads_delete: isAdminRole,
          leads_export: isAdminRole || isEditorRole,
          users_manage: isAdminRole,
        };
        
        // Upsert permissions - use insert with on conflict ignore approach
        const { error: checkError, data: existingPermsArr } = await supabase
          .from("user_permissions")
          .select("id")
          .eq("user_id", approvalUser.user_id)
          .limit(1);
        
        const existingPerms = Array.isArray(existingPermsArr) ? existingPermsArr[0] ?? null : null;
        if (existingPerms) {
          // Update existing
          const { error: updateError } = await supabase
            .from("user_permissions")
            .update(permsToSave)
            .eq("user_id", approvalUser.user_id);
          if (updateError) throw updateError;
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from("user_permissions")
            .insert([permsToSave]);
          if (insertError) throw insertError;
        }
      }
      
      // Get linked player name
      const linkedPlayerName = availablePlayers.find(p => p.id === approvalLinkedPlayerId)?.full_name || null;
      
      toast.success(`Usuário ${approvalUser.full_name || ""}aprovado com sucesso!`);
      setApprovalModalOpen(false);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === approvalUser.user_id 
          ? { 
              ...u, 
              role: approvalRole, 
              status: "active",
              linked_player_id: approvalRole === "player" ? approvalLinkedPlayerId : null,
              linked_player_name: approvalRole === "player" ? linkedPlayerName : null,
            }
          : u
      ));
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Erro ao aprovar usuário");
    } finally {
      setApproving(false);
    }
  };
  
  // Handle rejection
  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ status: "rejected" })
        .eq("user_id", userId);
      
      if (error) throw error;
      
      toast.success("Usuário rejeitado");
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, status: "rejected" } : u
      ));
      setConfirmAction(null);
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Erro ao rejeitar usuário");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-sm text-muted-foreground">
              {users.length} usuário{users.length !== 1 ? "s" : ""} • {activeCount} ativo{activeCount !== 1 ? "s" : ""}
              {pendingCount > 0 && (
                <span className="text-amber-400 font-medium"> • {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}</span>
              )}
            </p>
          </div>
        </div>
        {pendingCount > 0 && (
          <Button 
            variant="outline" 
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={() => setStatusFilter("pending")}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Ver Pendentes ({pendingCount})
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="bg-zinc-900/50 border border-zinc-800/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-2">
                    Pendentes {pendingCount > 0 && <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] h-4">{pendingCount}</Badge>}
                  </span>
                </SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="player">Jogador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <Card className="hidden md:block bg-zinc-900/50 border border-zinc-800/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/50 hover:bg-transparent">
                <TableHead className="pl-6">Usuário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.user_id} className="border-zinc-800/50 hover:bg-zinc-800/20">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.full_name || "Sem nome"}</p>
                          {user.is_owner && (
                            <Crown className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={ROLE_COLORS[user.role]} variant="outline">
                        {ROLE_LABELS[user.role]}
                      </Badge>
                      {user.role === "player" && (
                        <span className="text-xs text-muted-foreground">
                          {user.linked_player_name ? `→ ${user.linked_player_name}` : "⚠️ Não vinculado"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        user.status === "active" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                          : user.status === "pending"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      }
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        user.status === "active" ? "bg-emerald-400" : 
                        user.status === "pending" ? "bg-amber-400" : "bg-red-400"
                      }`} />
                      {user.status === "active" ? "Ativo" : user.status === "pending" ? "Pendente" : "Suspenso"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.last_login_at 
                      ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "Nunca"
                    }
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {user.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => openApprovalModal(user)}
                          className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Aprovar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setConfirmAction({ type: "reject", user })}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
                        >
                          <UserX className="w-3.5 h-3.5 mr-1" />
                          Recusar
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => openPermissions(user)}
                            disabled={user.is_owner && !currentUserIsOwner}
                          >
                            <UserCog className="w-4 h-4 mr-2" />
                            Editar Permissões
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => { setNewPassword(""); setResetPasswordUser(user); }}
                              disabled={user.is_owner && !currentUserIsOwner}
                            >
                              <KeyRound className="w-4 h-4 mr-2" />
                              Redefinir Senha Temporária
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {user.status === "active" ? (
                            <DropdownMenuItem 
                              onClick={() => setConfirmAction({ type: "suspend", user })}
                              disabled={user.is_owner || user.user_id === currentUser?.id}
                              className="text-red-400 focus:text-red-400"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => setConfirmAction({ type: "activate", user })}
                              disabled={user.is_owner}
                              className="text-emerald-400 focus:text-emerald-400"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Ativar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum usuário encontrado</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <Card className="bg-zinc-900/50 border border-zinc-800/50">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.user_id} className="bg-zinc-900/50 border border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium shrink-0">
                      {user.full_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{user.full_name || "Sem nome"}</p>
                        {user.is_owner && (
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => openPermissions(user)}
                        disabled={user.is_owner && !currentUserIsOwner}
                      >
                        <UserCog className="w-4 h-4 mr-2" />
                        Editar Permissões
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => { setNewPassword(""); setResetPasswordUser(user); }}
                          disabled={user.is_owner && !currentUserIsOwner}
                        >
                          <KeyRound className="w-4 h-4 mr-2" />
                          Redefinir Senha Temporária
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {user.status === "active" ? (
                        <DropdownMenuItem 
                          onClick={() => setConfirmAction({ type: "suspend", user })}
                          disabled={user.is_owner || user.user_id === currentUser?.id}
                          className="text-red-400 focus:text-red-400"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Suspender
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => setConfirmAction({ type: "activate", user })}
                          disabled={user.is_owner}
                          className="text-emerald-400 focus:text-emerald-400"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Ativar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge className={ROLE_COLORS[user.role]} variant="outline">
                    {ROLE_LABELS[user.role]}
                  </Badge>
                  {user.role === "player" && (
                    <span className="text-xs text-muted-foreground">
                      {user.linked_player_name ? `→ ${user.linked_player_name}` : "⚠️ Não vinculado"}
                    </span>
                  )}
                  <Badge 
                    variant="outline" 
                    className={
                      user.status === "active" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                        : user.status === "pending"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      user.status === "active" ? "bg-emerald-400" : 
                      user.status === "pending" ? "bg-amber-400" : "bg-red-400"
                    }`} />
                    {user.status === "active" ? "Ativo" : user.status === "pending" ? "Pendente" : "Suspenso"}
                  </Badge>
                </div>
                
                {/* Actions for pending users on mobile */}
                {user.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      onClick={() => openApprovalModal(user)}
                      className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setConfirmAction({ type: "reject", user })}
                      className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-3">
                  Último login: {user.last_login_at 
                    ? format(new Date(user.last_login_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "Nunca"
                  }
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {confirmAction?.type === "suspend" 
                ? "Suspender usuário" 
                : confirmAction?.type === "reject"
                ? "Recusar usuário"
                : "Ativar usuário"
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "suspend" 
                ? `Tem certeza que deseja suspender "${confirmAction?.user.full_name || "este usuário"}"? Ele não poderá mais acessar o sistema.`
                : confirmAction?.type === "reject"
                ? `Tem certeza que deseja recusar "${confirmAction?.user.full_name || "este usuário"}"? A solicitação de acesso será rejeitada.`
                : `Tem certeza que deseja ativar "${confirmAction?.user.full_name || "este usuário"}"? Ele poderá acessar o sistema novamente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === "reject") {
                  handleReject(confirmAction.user.user_id);
                } else {
                  handleStatusChange(
                    confirmAction.user.user_id, 
                    confirmAction.type === "suspend" ? "suspended" : "active"
                  );
                }
              }}
              className={
                confirmAction?.type === "suspend" || confirmAction?.type === "reject"
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-emerald-600 hover:bg-emerald-700"
              }
            >
              {confirmAction?.type === "suspend" 
                ? "Suspender" 
                : confirmAction?.type === "reject"
                ? "Recusar"
                : "Ativar"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Modal */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Aprovar Usuário
            </DialogTitle>
            <DialogDescription>
              {approvalUser?.full_name || approvalUser?.user_id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Função a atribuir</Label>
              <Select
                value={approvalRole}
                onValueChange={(value) => setApprovalRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scout">Editor (criar/editar, sem deletar)</SelectItem>
                  <SelectItem value="viewer">Viewer (somente leitura)</SelectItem>
                  <SelectItem value="player">Jogador (acesso ao próprio perfil)</SelectItem>
                  <SelectItem value="admin">Admin (acesso total)</SelectItem>
                </SelectContent>
              </Select>
              {approvalRole === "admin" && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Admin tem acesso total, incluindo exclusão
                </p>
              )}
            </div>

            {/* Player Linking - Only shown for player role */}
            {approvalRole === "player" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Vincular a Atleta
                </Label>
                <Select
                  value={approvalLinkedPlayerId || ""}
                  onValueChange={(value) => setApprovalLinkedPlayerId(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPlayers ? "Carregando..." : "Selecione o atleta"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!approvalLinkedPlayerId && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    É obrigatório vincular um atleta
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={approving || (approvalRole === "player" && !approvalLinkedPlayerId)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {approving ? "Aprovando..." : "Aprovar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Configurar Permissões
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.user_id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={editedRole || undefined}
                onValueChange={(value) => handleRoleChange(value as AppRole)}
                disabled={selectedUser?.is_owner && !currentUserIsOwner}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (acesso total)</SelectItem>
                  <SelectItem value="editor">Editor (criar/editar, sem deletar)</SelectItem>
                  <SelectItem value="viewer">Viewer (somente leitura)</SelectItem>
                  <SelectItem value="player">Jogador (acesso ao próprio perfil)</SelectItem>
                </SelectContent>
              </Select>
              {editedRole === "admin" && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Admin tem acesso total, incluindo exclusão
                </p>
              )}
              {editedRole === "player" && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Jogador vê apenas seu próprio perfil, relatórios e jogos
                </p>
              )}
            </div>

            {/* Player Linking - Only shown for player role */}
            {editedRole === "player" && (
              <>
                <Separator className="bg-zinc-800/50" />
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Vincular a Atleta
                  </Label>
                  <Select
                    value={editedLinkedPlayerId || ""}
                    onValueChange={(value) => setEditedLinkedPlayerId(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingPlayers ? "Carregando atletas..." : "Selecione o atleta"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O usuário só poderá ver dados do atleta vinculado.
                  </p>
                  {!editedLinkedPlayerId && (
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      É obrigatório vincular um atleta para salvar
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Granular Permissions - Not shown for player role */}
            {editedRole !== "player" && (
              <>
                <Separator className="bg-zinc-800/50" />

                <div className="space-y-4">
                  <Label>Permissões por Módulo</Label>
                  
                  {MODULES.map((module) => (
                    <div key={module.key} className="space-y-2 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                      <p className="font-medium text-sm">{module.label}</p>
                      <div className="flex flex-wrap gap-4">
                        {module.actions.map((action) => {
                          const key = `${module.key}_${action}`;
                          const isDeleteAction = action === "delete";
                          const isDisabled = isDeleteAction && editedRole !== "admin";
                          const isChecked = editedPermissions[key] ?? false;

                          return (
                            <div key={key} className="flex items-center gap-2">
                              <Checkbox
                                id={key}
                                checked={isChecked}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(key, checked as boolean)
                                }
                                disabled={isDisabled}
                              />
                              <Label 
                                htmlFor={key} 
                                className={`text-sm cursor-pointer ${isDisabled ? "text-muted-foreground" : ""}`}
                              >
                                {ACTION_LABELS[action]}
                                {isDeleteAction && editedRole !== "admin" && (
                                  <Lock className="w-3 h-3 inline ml-1 text-muted-foreground" />
                                )}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {editedRole !== "admin" && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>Exclusão bloqueada:</strong> Apenas usuários com função Admin podem excluir registros.
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => { if (!open) { setResetPasswordUser(null); setNewPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Redefinir Senha Temporária
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para <strong>{resetPasswordUser?.full_name || resetPasswordUser?.email}</strong>. O usuário poderá entrar imediatamente com ela.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="flex gap-2">
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite ou gere uma senha"
                autoComplete="new-password"
              />
              <Button type="button" variant="outline" onClick={generateRandomPassword} title="Gerar senha aleatória">
                <RefreshCw className="w-4 h-4 mr-1" />
                Gerar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. Compartilhe com o usuário por canal seguro.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(""); }} disabled={resettingPassword}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword || newPassword.length < 6}>
              {resettingPassword ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
