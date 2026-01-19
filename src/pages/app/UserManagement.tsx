import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Settings, Users, Crown, AlertTriangle, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

type AppRole = "admin" | "scout" | "member" | "partner" | "editor" | "viewer";

interface UserWithPermissions {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  is_owner: boolean;
  status: string;
  last_login_at: string | null;
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
  scout: "Editor", // Map scout to Editor display
  viewer: "Viewer",
  member: "Viewer", // Map member to Viewer display
  partner: "Partner",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  editor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  scout: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  viewer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  member: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  partner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
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
        // Get all user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role, is_owner, status")
          .order("created_at", { ascending: true });

        if (rolesError) throw rolesError;

        // Get unique user IDs
        const userIds = [...new Set(rolesData?.map(r => r.user_id) || [])];

        if (userIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        // Get profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, last_login_at")
          .in("user_id", userIds);

        if (profilesError) throw profilesError;

        // Get permissions
        const { data: permsData, error: permsError } = await supabase
          .from("user_permissions")
          .select("*")
          .in("user_id", userIds);

        if (permsError) throw permsError;

        // Get auth users (emails) - we need to use admin functions for this
        // For now, we'll use the profiles data and role data
        const usersMap = new Map<string, UserWithPermissions>();

        rolesData?.forEach(role => {
          const profile = profilesData?.find(p => p.user_id === role.user_id);
          const perms = permsData?.find(p => p.user_id === role.user_id);
          
          // Only keep the highest role per user (admin > editor/scout > viewer)
          const existing = usersMap.get(role.user_id);
          const roleOrder: Record<AppRole, number> = { admin: 4, editor: 3, scout: 3, partner: 2, viewer: 1, member: 1 };
          
          if (!existing || roleOrder[role.role as AppRole] > roleOrder[existing.role]) {
            usersMap.set(role.user_id, {
              user_id: role.user_id,
              email: profile?.full_name || role.user_id.slice(0, 8) + "...",
              full_name: profile?.full_name,
              role: role.role as AppRole,
              is_owner: role.is_owner ?? false,
              status: role.status ?? "active",
              last_login_at: profile?.last_login_at,
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

  const openPermissions = (user: UserWithPermissions) => {
    setSelectedUser(user);
    setEditedRole(user.role);
    setEditedPermissions(user.permissions || {});
    setPermissionsOpen(true);
  };

  const handleRoleChange = (newRole: AppRole) => {
    setEditedRole(newRole);
    
    // Apply default permissions for the new role
    const isAdminRole = newRole === "admin";
    const isEditorRole = newRole === "editor" || newRole === "scout";
    
    const defaults: Record<string, boolean> = {};
    MODULES.forEach(module => {
      module.actions.forEach(action => {
        const key = `${module.key}_${action}`;
        if (action === "delete") {
          // DELETE is ADMIN-only
          defaults[key] = isAdminRole;
        } else if (action === "view") {
          defaults[key] = true; // Everyone can view
        } else if (["create", "edit", "export", "log", "publish"].includes(action)) {
          defaults[key] = isAdminRole || isEditorRole;
        }
      });
    });
    
    setEditedPermissions(prev => ({ ...prev, ...defaults }));
  };

  const handlePermissionChange = (key: string, checked: boolean) => {
    // Prevent enabling delete for non-admins
    if (key.endsWith("_delete") && editedRole !== "admin") {
      return;
    }
    setEditedPermissions(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    if (!selectedUser || !editedRole) return;

    // Prevent changing owner's role by non-owner
    if (selectedUser.is_owner && !currentUserIsOwner) {
      toast.error("Você não pode alterar o usuário owner");
      return;
    }

    setSaving(true);
    try {
      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: editedRole })
        .eq("user_id", selectedUser.user_id);

      if (roleError) throw roleError;

      // Prepare permissions update - FORCE delete=false for non-admins
      const permsToSave = { ...editedPermissions };
      if (editedRole !== "admin") {
        MODULES.forEach(module => {
          if (module.actions.includes("delete")) {
            permsToSave[`${module.key}_delete`] = false;
          }
        });
      }
      permsToSave.users_manage = editedRole === "admin";

      // Update permissions
      const { error: permsError } = await supabase
        .from("user_permissions")
        .update({
          ...permsToSave,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", selectedUser.user_id);

      if (permsError) throw permsError;

      toast.success("Permissões atualizadas com sucesso");
      setPermissionsOpen(false);

      // Refresh users list
      setUsers(prev => prev.map(u => 
        u.user_id === selectedUser.user_id 
          ? { ...u, role: editedRole, permissions: permsToSave as any }
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
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Usuários & Permissões</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários e suas permissões no sistema
          </p>
        </div>
      </div>

      <Card className="border-zinc-800/50 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Controle de Acesso (RBAC)
          </CardTitle>
          <CardDescription>
            Defina papéis e permissões granulares por módulo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/30">
                  <TableHead>Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id} className="border-zinc-800 hover:bg-zinc-800/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_owner && (
                          <Crown className="w-4 h-4 text-amber-400" />
                        )}
                        <div>
                          <p className="font-medium">{user.full_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role]} variant="outline">
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.status}
                        onValueChange={(value) => handleStatusChange(user.user_id, value)}
                        disabled={user.is_owner || user.user_id === currentUser?.id}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              Ativo
                            </span>
                          </SelectItem>
                          <SelectItem value="suspended">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              Suspenso
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.last_login_at 
                        ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "Nunca"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPermissions(user)}
                        disabled={user.is_owner && !currentUserIsOwner}
                      >
                        <Settings className="w-4 h-4 mr-1.5" />
                        Permissões
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Modal */}
      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Configurar Permissões
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.user_id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editedRole || undefined}
                onValueChange={(value) => handleRoleChange(value as AppRole)}
                disabled={selectedUser?.is_owner && !currentUserIsOwner}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (acesso total)</SelectItem>
                  <SelectItem value="editor">Editor (criar/editar, sem deletar)</SelectItem>
                  <SelectItem value="viewer">Viewer (somente leitura)</SelectItem>
                </SelectContent>
              </Select>
              {editedRole === "admin" && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Admin tem acesso total, incluindo exclusão
                </p>
              )}
            </div>

            <Separator />

            {/* Granular Permissions */}
            <div className="space-y-4">
              <Label>Permissões por Módulo</Label>
              
              {MODULES.map((module) => (
                <div key={module.key} className="space-y-2 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
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
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400 flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Exclusão bloqueada:</strong> Apenas usuários com role Admin podem excluir registros. 
                    Esta restrição é aplicada no servidor e não pode ser contornada.
                  </span>
                </p>
              </div>
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
    </div>
  );
}
