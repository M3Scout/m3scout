import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadData {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  subject: string;
  message: string;
  playerSlug?: string;
}

export async function submitLead(data: LeadData): Promise<boolean> {
  try {
    const { error } = await supabase.from("leads").insert({
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || null,
      organization: data.organization?.trim() || null,
      subject: data.subject.trim(),
      message: data.message.trim(),
      player_slug: data.playerSlug || null,
      status: "new",
    });

    if (error) {
      console.error("Error submitting lead:", error);
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error("Failed to submit lead:", error);
    throw new Error("Não foi possível enviar sua mensagem. Tente novamente.");
  }
}
