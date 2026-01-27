/**
 * useTargets Hook
 * 
 * React hook to manage TARGET players (external athletes being monitored).
 * Provides CRUD operations and filtering.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, TargetStatus, TargetPriority, TargetObservation } from '@/types/marketScore';

interface UseTargetsOptions {
  status?: TargetStatus | TargetStatus[];
  priority?: TargetPriority | TargetPriority[];
  search?: string;
  enabled?: boolean;
}

interface CreateTargetInput {
  name: string;
  position: string;
  birth_date?: string;
  age_estimate?: number;
  current_club?: string;
  league_competition?: string;
  city?: string;
  state?: string;
  country?: string;
  dominant_foot?: string;
  height?: number;
  weight?: number;
  source?: string;
  status?: TargetStatus;
  priority?: TargetPriority;
  tags?: string[];
  notes_internal?: string;
  photo_url?: string;
  highlight_video_url?: string;
}

interface CreateObservationInput {
  target_id: string;
  observation_date?: string;
  match_context?: string;
  opponent?: string;
  competition?: string;
  result?: string;
  minutes_observed?: number;
  qualitative_notes?: string;
  performance_rating?: number;
}

export function useTargets({
  status,
  priority,
  search,
  enabled = true,
}: UseTargetsOptions = {}) {
  const queryClient = useQueryClient();
  
  // Fetch targets with filters
  const {
    data: targets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['targets', status, priority, search],
    queryFn: async () => {
      let query = supabase
        .from('targets')
        .select('*')
        .order('priority', { ascending: true })
        .order('updated_at', { ascending: false });
      
      // Status filter
      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        query = query.in('status', statuses);
      }
      
      // Priority filter
      if (priority) {
        const priorities = Array.isArray(priority) ? priority : [priority];
        query = query.in('priority', priorities);
      }
      
      // Search filter
      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search}%,current_club.ilike.%${search}%,position.ilike.%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Target[];
    },
    enabled,
    staleTime: 60 * 1000,
  });
  
  // Create target mutation
  const createTarget = useMutation({
    mutationFn: async (input: CreateTargetInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('targets')
        .insert({
          ...input,
          created_by: userData?.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as Target;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });
  
  // Update target mutation
  const updateTarget = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Target> & { id: string }) => {
      const { data, error } = await supabase
        .from('targets')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as Target;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });
  
  // Delete target mutation
  const deleteTarget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('targets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });
  
  // Create observation mutation
  const createObservation = useMutation({
    mutationFn: async (input: CreateObservationInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('target_observations')
        .insert({
          ...input,
          observation_date: input.observation_date ?? new Date().toISOString().split('T')[0],
          created_by: userData?.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate target to refresh observation count
      queryClient.invalidateQueries({ queryKey: ['target-observations', input.target_id] });
      queryClient.invalidateQueries({ queryKey: ['market-score-target', input.target_id] });
      
      return data as unknown as TargetObservation;
    },
  });
  
  // Fetch single target with observations
  const fetchTargetWithObservations = async (targetId: string) => {
    const [targetResult, observationsResult] = await Promise.all([
      supabase
        .from('targets')
        .select('*')
        .eq('id', targetId)
        .limit(1),
      supabase
        .from('target_observations')
        .select('*')
        .eq('target_id', targetId)
        .order('observation_date', { ascending: false }),
    ]);
    
    if (targetResult.error) throw targetResult.error;
    if (observationsResult.error) throw observationsResult.error;
    
    const target = targetResult.data?.[0] as unknown as Target | null;
    const observations = (observationsResult.data ?? []) as unknown as TargetObservation[];
    
    return { target, observations };
  };
  
  return {
    targets,
    isLoading,
    error,
    refetch,
    
    // Mutations
    createTarget: createTarget.mutateAsync,
    isCreating: createTarget.isPending,
    
    updateTarget: updateTarget.mutateAsync,
    isUpdating: updateTarget.isPending,
    
    deleteTarget: deleteTarget.mutateAsync,
    isDeleting: deleteTarget.isPending,
    
    createObservation: createObservation.mutateAsync,
    isCreatingObservation: createObservation.isPending,
    
    // Utility
    fetchTargetWithObservations,
  };
}
